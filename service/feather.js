var _ = require('../lib/util.js'), path = require('path'), Task = require('../lib/task.js'), Q = require('q'), Log = require('../lib/log.js');
var RepoService = require('./repo.js');
var RepoModel = require('../model/repo.js');
var SH_CWD = __dirname + '/../sh';

var releasing = false, autoMode_ = false, autoReleasing = false, waits = [];

exports.autoMode = function(state){
    autoMode_ = state;
    waits = [];
};

exports.addTask = function(repo, branch, normal){
    if(!autoMode_) return;

    var task = {
        repos: repo,
        branch: branch,
        isAuto: !normal
    };

    Log.notice('add feather build task: ' + JSON.stringify(task));

    waits.push(task);
    autoRelease();
};

function autoRelease(){
    if(autoReleasing) return;

    var info;

    if(info = waits.shift()){
        autoReleasing = true;

        release(info.repos, info.branch, function(){
            if(!info.isAuto){
                releasing = false;
            }

            autoReleasing = false;
            autoRelease();
        });
    }
}

exports.release = function(repos, branch, next){
    repos = _.toArray(repos);

    if(!repos.length){
        return {
            code: -1,
            msg: '需要编译的仓库不能为空'
        };
    }
    
    if(releasing){
        return {
            code: -1,
            msg: '当前有编译任务调度中，请其他编译任务调度完成后再进行操作'
        }
    }

    releasing = true;
    
    if(autoMode_){
        exports.addTask(repos, branch, true);
        return {
            code: -1,
            msg: '当前系统处于自动运行阶段，该任务会被安排至最近的时间点上进行编译'
        }
    }

    var result = release(repos, branch, function(){
        releasing = false;
        next();
    });

    if(result && result.code == -1){
        return result;
    }else{
        return {code: 0}
    }
}

function release(repos, branch, next){
    var releases = handleReleases(_.toArray(repos));

    if(releases.code == -1){
        next && next();
        return releases;
    }

    var deps = releases.deps, needs = releases.needs, dists = releases.dists;

    function stop(info){
        if(!info) return;

        var json = JSON.stringify(info);

        if(info.errorMsg){
            Log.error(json);
        }else{
            Log.notice(json);
        }

        RepoService.unlock(deps);
        RepoService.unlock(needs);
        RepoService.unlock(dists);
        next && next();
    }

    RepoService.lock(deps);
    RepoService.lock(needs);
    RepoService.lock(dists);

    var promise = checkoutTask(branch, dists);

    if(deps.length){
        promise = promise.then(function(info){
            if(info && !info.errorMsg){
                return releaseTask('master', deps, true);
            }
        }, stop);
    }

    promise
        .then(function(info){
            if(info && !info.errorMsg){
                return releaseTask(branch, needs);
            }
        }, stop)
        .then(function(info){
            if(info && !info.errorMsg){
                return getCommitLogsTask(needs);
            }
        }, stop)
        .then(function(info){
            if(info && !info.errorMsg){
                return commitTask(branch, JSON.stringify(info.msg), dists);
            }
        }, stop)
        .then(stop, stop);
}

function handleReleases(repos){
    var groups = {};
    var depReleases = [], finalReleases = [], distRepos = [];

    for(var i = 0; i < repos.length; i++){
        var repo = RepoModel.get(repos[i]);
        var config = repo.config;
        var name = config.name, mName = config.modulename;

        if(!groups[name]){
            groups[name] = [];
        }

        groups[name].push(mName);

        if(mName == 'common' || !mName){
            finalReleases.unshift(repo.id);
        }else{
            finalReleases.push(repo.id);
        }

        var dists = _.toArray(repo.config.build);

        for(var j = 0; j < dists.length; j++){
            var dist = dists[j];

            if(!dist.to){
                return {
                    code: -1,
                    msg: 'feather仓库[' + repo.id + ']的deploy.build配置不正确'
                }
            }

            var to = path.resolve(repo.dir, dist.to);
            var toId = to.substring(RepoService.PATH.length).split(path.sep).slice(0, 2).join('/');
            var toRepo = RepoModel.get(toId);

            if(!toRepo){
                return {
                    code: -1,
                    msg: 'feather仓库[' + repo.id + ']的产出仓库[' + toId + ']不存在，请确保对应仓库已成功添加进系统'
                } 
            }

            distRepos.push(toRepo.id);
        }
    }

    for(var name in groups){
        if(groups[name].indexOf('common') == -1){
            var repo = RepoModel.getByFeatherConfig({
                name: name,
                modulename: 'common'
            });

            if(!repo){
                return {
                    code: -1,
                    msg: 'feather项目[' + name + ']的[common]模块不存在，请确保对应仓库已成功添加进系统'
                };
            }

            depReleases.push(repo.id);
        }
    }

    return {
        deps: depReleases,
        needs: finalReleases,
        dists: _.unique(distRepos)
    };
}

function checkoutTask(branch, repos){
    return Task.sh({
        desc: '准备编译前环境，仓库 [' + repos.join(', ') + '] 切换分支 [' + branch + ']',
        cwd: SH_CWD,
        args: ['checkout.sh', branch, RepoService.PATH].concat(repos)
    });
}

function releaseTask(branch, repos, isDeps){
    var desc, sh = isDeps ? 'depRelease.sh' : 'release.sh';

    if(isDeps){
        desc = '编译依赖仓库[' + repos.join(', ') + '] 的 [' + branch + '] 分支，不产出'
    }else{
        desc = '编译仓库[' + repos.join(', ') + '] 的 [' + branch + '] 分支'
    }

    return Task.sh({
        desc: desc,
        cwd: SH_CWD,
        args: [sh, branch, RepoService.PATH].concat(repos)
    });
}

function getCommitLogsTask(repos){
    return Task.sh({
        cwd: SH_CWD,
        args: ['log.sh', RepoService.PATH].concat(repos)
    }, true);
}

function commitTask(branch, msg, repos){
    return Task.sh({
        desc: '编译完成，提交仓库 [' + repos.join(', ') + '] 的 [' + branch + '] 分支',
        cwd: SH_CWD,
        args: ['commit.sh', branch, RepoService.PATH, '"' + msg + '"'].concat(repos)
    });
}

autoRelease();
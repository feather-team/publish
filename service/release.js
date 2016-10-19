var _ = require('../lib/util.js'), Path = require('path'), Task = require('../lib/task.js'), Q = require('q'), Log = require('../lib/log.js');
var RepoService = require('./repo.js');
var RepoModel = require('../model/repo.js');
var SH_CWD = __dirname + '/../sh';

var releasing = false, autoMode_ = false, autoReleasing = false, waits = [];

function getFeatherDeployConfig(info, branch){
    var type = info.config.type || 'feather';
    var deploy = getDeployTypeByBranch(type, branch);

    if(!deploy){
        return false;
    }

    var file;

    if(type == 'feather'){
        file = info.dir + '/feather_conf.js';
    }else{
        file = info.dir + '/conf/conf.js';
    }

    var content = _.read(file);
    var config = content.match(new RegExp('deploy\\b[^;$]+?' + deploy + '[\'"]?\\s*[,:]\\s*(\\[[^\\]]+\\]|\\{[^\\}]+\\})'));

    if(config){
        try{
            return (new Function('return ' + config[1]))();
        }catch(e){
            return false;
        }
    }else if(type != 'feather'){
        file = Path.normalize(info.dir + '/conf/deploy/' + deploy + '.js');

        try{
            if(_.exists(file)){
                delete require.cache[file];
                return require(file);
            }
        }catch(e){
            return false;
        }
    }

    return false;
}

function getDeployTypeByBranch(type, branch){
    var config = Application.get('config').deploy[type || 'feather'];
    return config[branch] || config['*'];
}

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
        var check = handleReleases(_.toArray(repos), branch);
        
        if(check.code == -1){
            releasing = false;
            return check;
        }

        exports.addTask(repos, branch, true);
        return {
            code: -1,
            msg: '当前系统处于自动运行阶段，该任务会被安排至最近的时间点上进行编译'
        }
    }

    var result = release(repos, branch, function(){
        releasing = false;
        next && next();
    });

    if(result && result.code == -1){
        return result;
    }else{
        return {code: 0}
    }
}

function release(repos, branch, next){
    var releases = handleReleases(_.toArray(repos), branch);

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

function handleReleases(repos, branch){
    var groups = {};
    var depReleases = [], finalReleases = [], distRepos = [];

    for(var i = 0; i < repos.length; i++){
        var repo = RepoModel.get(repos[i]);
        var configs = _.toArray(repo.config);

        // var name = config.name, mName = config.modulename;

        // if(!groups[name]){
        //     groups[name] = [];
        // }

        // groups[name].push(mName);

        // if(mName == 'common' || !mName){
        //     finalReleases.unshift(repo.id);
        // }else{
        //     finalReleases.push(repo.id);
        // }

        var deploy = getFeatherDeployConfig(repo, branch);
        var deployName = getDeployTypeByBranch(repo.config.type, branch);

        if(!deploy){
            return {
                code: -1,
                msg: '仓库[' + repo.id + ']的deploy.' + deployName + '配置不存在'
            }
        }

        // var dists = _.toArray(deploy);

        // for(var j = 0; j < dists.length; j++){
        //     var dist = dists[j];

        //     if(!dist.to){
        //         return {
        //             code: -1,
        //             msg: '仓库[' + repo.id + ']的deploy.' + deployName + '配置不正确'
        //         }
        //     }

        //     var to = Path.resolve(repo.dir, dist.to);
        //     var toId = to.substring(RepoService.PATH.length).split(Path.sep).slice(0, 2).join('/');
        //     var toRepo = RepoModel.get(toId);

        //     if(!toRepo){
        //         return {
        //             code: -1,
        //             msg: '仓库[' + repo.id + ']的产出仓库[' + toId + ']不存在，请确保对应仓库已成功添加进系统'
        //         } 
        //     }

        //     distRepos.push(toRepo.id);
        // }
    }

    return ;

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

    repos = repos.map(function(repo){
        var info = RepoModel.get(repo);
        var type = info.config.type || 'feather';
        var deploy = getDeployTypeByBranch(type, branch);
        return repo + ':' + type + ':' + deploy;
    });

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
        args: ['commit.sh', branch, RepoService.PATH, msg].concat(repos)
    });
}

autoRelease();
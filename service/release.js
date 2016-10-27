var _ = require('../lib/util.js'), Path = require('path'), Task = require('../lib/task.js'), Q = require('q'), Log = require('../lib/log.js');
var RepoService = require('./repo.js'), ProjectService = require('./project.js');
var RepoModel = require('../model/repo.js');
var SH_CWD = __dirname + '/../sh';

var autoMode = false, releasing = false, autoTasks = [], manualTasks = [];

_.extend(exports, require('./common.js'));

Object.defineProperty(exports, 'autoMode', {
    get: function(){ 
        return autoMode; 
    },
    set: function(val){
        autoMode = val;
        tasks = [];
    }
});

exports.addTask = function(repos, branch, auto){
    var opt = {
        repos: _.toArray(repos),
        branch: branch,
        isAuto: auto || false
    };

    if(!opt.repos.length){
        return exports.error('需要编译的仓库不能为空');
    }

    if(!auto && (autoTasks.length || manualTasks.length)){
        var temp = autoTasks.concat(manualTasks);
        var exists = temp.some(function(task){
            return task.branch == branch && opt.repos.some(function(repo){
                return task.repos.indexOf(repo) > -1;
            });
        });

        if(exists){
            return exports.error('当前仓库分支任务已经存在队列中，请在编译完成后再次进行操作');
        }
    }

    auto ? autoTasks.push(opt) : manualTasks.push(opt);
    Log.notice('add feather build task: ' + JSON.stringify(opt));
    process.nextTick(release);
    return exports.success('添加任务成功，任务会被安排在最近的任务点上执行');
};

function analyseReleaseInfo(task){
    var deps = [], releases = [], dists = [], commons = {};

    for(var id of task.repos){
        var repo = RepoModel.get(id);
        var data = ProjectService.analyse(repo, task.branch == 'master');

        if(data.code == -1){
            return exports.error(data.msg);
        }else if(!data.data.feather){
            return exports.error('仓库[' + repo.id + ']中不存在feather/feather2/lothar项目');
        }

        repo.configs = data.data.configs;

        data = ProjectService.analyseDeployConfig(repo, task.branch);

        if(data.code == -1){
            return exports.error(data.msg);
        }

        dists = dists.concat(data.data);

        commons[repo.configs[0].name] = false;

        //analyse common module
        repo.configs.forEach(function(config){
            var dir = config.dir.substring(RepoService.PATH.length);
            var o = {
                dir: dir,
                type: config.type,
                dest: ProjectService.getDeployName(config.type, task.branch)
            };

            if(config.modulename == 'common'){
                releases.unshift(o);
                commons[config.name] = true;
            }else{
                releases.push(o);
            }
        });
    }

    dists = _.unique(dists);

    for(var name in commons){
        var exists = commons[name];

        if(!exists){
            var commonRepo = RepoModel.getByFeatherConfig({
                name: name,
                modulename: 'common'
            });

            if(!commonRepo){
                return exports.error('项目[' + name + ']的common模块没有找到，请添加仓库后再进行操作！');
            }

            if(commonRepo.status == RepoModel.STATUS.ERROR){
                return exports.error('项目[' + name + ']的common模块配置错误已被冻结，请处理后再次执行！');
            }

            if(task.repos.indexOf(commonRepo.id) == -1){
                var config = commonRepo.configs.filter(function(config){
                    return config.modulename == 'common';
                });

                deps.push({
                    dir: config[0].dir.substring(RepoService.PATH.length),
                    type: config[0].type
                });
            }
        }
    }

    return exports.success({
        deps: deps,
        releases: releases,
        dists: dists
    });
}

function release(){
    if(releasing || !autoTasks.length && !manualTasks.length) return;

    releasing = true;

    var task, rs, isAuto;

    if(manualTasks.length){
        task = manualTasks[0];
        isAuto = false;
    }else{
        task = autoTasks[0];
        isAuto = true;
    }

    //lock factory
    RepoService.lock();
    
    //switch branch
    taskPreprocess(task.repos, task.branch)
        .then(function(info){
            if(info && !info.errorMsg){
                rs = analyseReleaseInfo(task);

                if(rs.code == -1){
                    info.status = 'error';
                    info.errorMsg = rs.msg;
                    return false;
                }

                return tasking(rs.data, task.repos, task.branch);
            }
        }, stop)
        .then(stop, stop)
        .fail(function(e){
            Log.error(e.stack);
        });

    function stop(){
        RepoService.unlock();
        isAuto ? autoTasks.shift() : manualTasks.shift();
        releasing = false;
        release();
    }
}

function taskPreprocess(repos, branch){
    return Task.sh({
        desc: '仓库[' + repos.join(', ') + ']的[' + branch + ']分支进行编译环境准备',
        cwd: SH_CWD,
        args: ['checkout.sh', branch, RepoService.PATH].concat(repos)
    });
}

function tasking(info, repos, branch){
    var args = [];

    _.map(info, function(vs, key){
        if(key != 'dists'){
            vs = vs.map(function(v){
                return v.dir + '~' + v.type + (v.dest ? '~' + v.dest : '')
            });
        }

        args.push(key + ':' + vs.join(','));
    });

    return Task.sh({
        desc: '仓库[' + repos.join(', ') + ']的[' + branch + ']分支开始编译',
        cwd: SH_CWD,
        args: ['release.sh', branch, RepoService.PATH].concat(args)
    });
}
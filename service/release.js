var _ = require('../lib/util.js'), Path = require('path'), Task = require('../lib/task.js'), Q = require('q'), Log = require('../lib/log.js');
var RepoService = require('./repo.js'), ProjectService = require('./project.js'), StatusService = require('./status.js');
var RepoModel = require('../model/repo.js'), StatusModel = require('../model/status.js');
var SH_CWD = __dirname + '/../sh';
var TasksModel = require('../model/tasks.js');
var autoMode = false, releasing = false, Tasks = [];

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

function saveTasks(){
    TasksModel.save(Tasks);
}

try{
    Tasks = TasksModel.get();

    if(_.empty(Tasks)){
        Tasks = [];
    }
    release();
}catch(e){};

var listens = Application.get('config').listen || [];
var ignores = Application.get('config').ignore || [];
var listenBranches = listens.map(function(branch){
    return new RegExp('^' + branch.replace(/\*/g, '.*') + '$', 'i');
});
var ignoreBranches = ignores.map(function(branch){
    return new RegExp('^' + branch.replace(/\*/g, '.*') + '$', 'i');
});

function isListenBranch(branch){
    var match;

    if(listens.length){
        match = listenBranches.some(function(reg){
            return reg.test(branch);
        });
    }

    if(ignores.length){
        match = ignoreBranches.every(function(reg){
            return !reg.test(branch);
        });
    }

    return typeof match == 'undefined' ? true : match;
}

exports.addTask = function(repos, branch, auto){
    console.log(repos);
    var opt = {
        repos: _.toArray(repos),
        branch: branch,
        time: Date.now(),
        status: StatusModel.STATUS.PENDING
    };


    if(!isListenBranch(branch)){
        return exports.error('分支[' + branch + ']不在监听列表内，当前平台只监听分支[' + listens.join(',') + ']，同时会忽略[' + ignores.join(',') + ']分支');
    }

    if(!opt.repos.length){
        return exports.error('需要编译的仓库不能为空');
    }

    if(!auto){
        for(var i = 1; i < Tasks.length; i++){
            var task = Tasks[i];
            var exists = opt.repos.some(function(repo){
                return task.repos.indexOf(repo) > -1;
            });

            if(exists && task.branch == branch){
                Tasks.splice(i, 1);
                var repos = _.unique(opt.repos.concat(task.repos));
                return exports.addTask(repos, branch);
            }
        }
    }

    if(auto || !Tasks.length){
        Tasks.push(opt);
    }else{
        Tasks.splice(1, 0, opt);
    }

    saveTasks();
    StatusService.save(opt);
    Log.notice('add feather build task: ' + JSON.stringify(opt));
    process.nextTick(release);
    return exports.success('添加任务成功，任务会被安排在最近的任务点上执行');
};

exports.noTasks = function(){
    return !Tasks.length;
};

function analyseReleaseInfo(task, diffs){
    var deps = [], releases = [], dists = [], commons = {};

    for(var i = 0; i < task.repos.length; i++){
        var id = task.repos[i];
        var diff = diffs[id];

        if(diff && !diff.length){
            continue;
        }

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

        var configs = repo.configs;

        if(diff && configs.length){
            configs = configs.filter(function(config){
                return diff.indexOf(config.modulename) > -1;
            });
        }
        
        //analyse common module
        configs.forEach(function(config){
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

            var config = commonRepo.configs.filter(function(config){
                var isCommon = config.modulename == 'common';

                if(isCommon){
                    var dir = config.dir.substring(RepoService.PATH.length);

                    return releases.filter(function(info){
                        return info.dir == dir;
                    });
                }

                return false;
            });

            if(config.length){
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
    if(releasing || !Tasks.length) return;

    releasing = true;

    var task, rs, log = {};

    task = Tasks[0];

    task.status = StatusModel.STATUS.RUNING;
    StatusService.save(task);

    //lock factory
    RepoService.lock();
    
    var desc = '', versions = {};

    //switch branch
    taskPreprocess(task.repos, task.branch)
        .then(function(info){
            desc = info.desc;

            if(info && !info.errorMsg){
                log = info.msg.match(/git log: ([^\r\n]+)/);

                if(log){
                    log = log[1].slice(1, -1);
                    var s = log.split(' ');
                    log = {
                        msg: '描述[' + log.substring(s.slice(0, 3).join(' ').length + 1) + ']，提交者[' + s[1] + ']，版本号[' + s[0] + ']，仓库[' + task.repos.join(',') + ']',
                        mail: s[2]
                    };
                }

                var diffs = {}, x, reg = /current version:([^\r\n]+)|diff --git a\/([^\/\r\n\t]+)/g;
                var factory;

                info.msg.replace(reg, function(all, fv, diff){
                    if(fv){
                        var arr = fv.split('|'), version = arr[1];
                        factory = arr[0];

                        if(version){
                            diffs[factory] = [];
                        }

                        versions[factory] = version;
                    }else if(diff){
                        diffs[factory].push(diff);
                    }
                });

                for(var i in diffs){
                    diffs[i] = _.unique(diffs[i]);
                }

                rs = analyseReleaseInfo(task, diffs);

                if(rs.code == -1){
                    info.status = 'error';
                    info.errorMsg = rs.msg;
                    stop(info);
                    return false;
                }

                return tasking(rs.data, task.repos, task.branch, JSON.stringify(log.msg)).then(stop, stop);
            }
        }, stop)
        .fail(function(e){
            Log.error(e.stack);
            stop({
                status: 'error',
                desc: desc,
                errorMsg: e.stack,
                msg: e.stack
            });
        });

    function mail(info){
        if(info && log.mail && log.mail.indexOf('@') > -1){
            var html = _.read(__dirname + '/../mail-tpl/release.html').toString();
            var o = {
                desc: info.desc,
                msg: info.status == 'success' ? info.msg : info.errorMsg,
                startTime: (new Date(info.startTime)).toString(),
                closeTime: (new Date(info.closeTime)).toString(),
                status: info.status,
                text: info.status == 'success' ? '成功' : '失败'
            };

            _.map(o, function(v, k){
                html = html.replace('{{' + k + '}}', v);
            });

            Log.notice('发送邮件：' + JSON.stringify(info));

            require('../lib/mail.js').send({
                to: log.mail,
                subject: 'feather自动编译平台任务反馈',
                html: html
            }, function(error, res){
                if(error){
                    return Log.error(error);
                }

                Log.notice('发送邮件：' + JSON.stringify({
                    to: log.mail,
                    subject: 'feather自动编译平台任务反馈',
                    status: res.response
                }));
            });
        }
    }

    function stop(info){
        function complete(){
            mail(info);
            RepoService.unlock();

            var taskInfo = Tasks.shift();
            Log.notice('保存状态：' + JSON.stringify(info));

            if(!info || info.status != 'success'){
                taskInfo.status = StatusModel.STATUS.ERROR;
            }else{
                taskInfo.status = StatusModel.STATUS.SUCCESS;
            }

            StatusService.save(taskInfo);
            saveTasks();
            Log.notice('释放任务：' + JSON.stringify(taskInfo));
            releasing = false;
            release();
        }

        var isFail = !info || info.status != 'success';
        var reverts = [];

        task.repos.forEach(function(id){
            if(isFail){
                reverts.push(id + ':' + (versions[id] || ''));
            }else{
                reverts.push(id + ':' + task.branch);
            }
        });

        revert(task.repos, task.branch, reverts).then(complete, complete);
    }
}

function taskPreprocess(repos, branch){
    return Task.sh({
        desc: '仓库[' + repos.join(', ') + ']的[' + branch + ']分支进行编译环境准备',
        cwd: SH_CWD,
        args: ['checkout.sh', branch, RepoService.PATH].concat(repos)
    });
}

function tasking(info, repos, branch, msg){
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
        desc: '仓库[' + repos.join(', ') + ']的[' + branch + ']分支进行编译',
        cwd: SH_CWD,
        args: ['release.sh', branch, msg, RepoService.PATH].concat(args)
    });
}

function revert(repos, branch, reverts){
    return Task.sh({
        desc: '仓库[' + repos.join(', ') + ']的[' + branch + ']分支进行恢复',
        cwd: SH_CWD,
        args: ['revert.sh', branch, RepoService.PATH].concat(reverts)
    });
}
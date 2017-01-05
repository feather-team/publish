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

function analyseReleaseInfo(task, diffs){
    var deps = [], releases = [], dists = [], commons = {};

    for(var i = 0; i < task.repos.length; i++){
        var id = task.repos[i];
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

        if(configs.length > 1){
            configs = configs.filter(function(config){
                return diffs.indexOf(config.modulename) > -1;
            });

            if(!configs.length){
                configs = repo.configs;
            }
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

    var task, rs, isAuto, log = {};

    if(manualTasks.length){
        task = manualTasks[0];
        isAuto = false;
    }else{
        task = autoTasks[0];
        isAuto = true;
    }

    //lock factory
    RepoService.lock();
    
    var desc = '';

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

                var diffs = [], x, reg = /diff --git a\/([^\/\r\n]+)/g;

                while(x = reg.exec(info.msg)){
                    diffs.push(x[1]);
                }

                rs = analyseReleaseInfo(task, _.unique(diffs));

                if(rs.code == -1){
                    info.status = 'error';
                    info.errorMsg = rs.msg;
                    mail(info);
                    return false;
                }

                return tasking(rs.data, task.repos, task.branch, JSON.stringify(log.msg));
            }
        }, stop)
        .then(stop, stop)
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
        mail(info);
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

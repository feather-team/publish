var _ = require('../lib/util.js'), path = require('path');
var TaskService = require('./task.js'), RepoService = require('./repo.js');
var RepoModel = require('../model/repo.js');

var releasing = false;

exports.release = function(repos, branch){
    if(releasing){
        return {
            code: -1,
            msg: '当前有编译任务调度中，请其他编译任务调度完成后再进行操作'
        }
    }

    repos = _.toArray(repos);

    if(!repos.length){
        return {
            code: -1,
            msg: '需要编译的仓库不能为空'
        };
    }

    var groups = {};
    var firstExecs = [], secondExecs = [];
    var distRepos = [];

    for(var i = 0; i < repos.length; i++){
        var repo = RepoModel.get(repos[i]);
        var config = repo.config;
        var build = _.toArray(repo.config.build);

        // for(var j = 0; j < build.length; j++){
        //     var dist = build[j];

        //     if(!dist.to){
        //         return {
        //             code: -1,
        //             msg: 'feather仓库[' + repo.factory + ']的deploy.build配置不正确'
        //         }
        //     }

        //     var to = path.resolve(repo.dir, dist.to);
        //     var sp = to.substring(RepoService.PATH.length);
        //     var toRepo = RepoModel.get(sp.split('/').slice(0, 2).join('/'));

        //     if(!toRepo){
        //         return {
        //             code: -1,
        //             msg: 'feather仓库[' + repo.factory + ']的产出目录不存在，请确保对应仓库已成功添加进系统'
        //         } 
        //     }

        //     distRepos.push(toRepo.factory);
        // }

        var name = config.name, mName = config.modulename;

        if(!groups[name]){
            groups[name] = [];
        }

        groups[name].push(mName);

        if(mName == 'common' || !mName){
            firstExecs.push(repo.factory);
        }else{
            secondExecs.push(repo.factory);
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

            firstExecs.push(repo.factory);
        }
    }

    releasing = true;

    release('master', firstExecs, function(isSuccess){
        if(isSuccess && !_.empty(secondExecs)){
            release(branch, secondExecs, function(){
                releasing = false;
            });
        }else{
            releasing = false;
        }
    });

    return {
        code: 0
    }
}

function release(branch, repos, complete){
    repos = _.toArray(repos);

    var count = repos.length, successCount = 0, completeCount = 0;

    repos.forEach(function(repo){
        RepoModel.update(repo, {
            status: RepoModel.STATUS.PROCESSING
        });

        var args = ['release.sh', branch, RepoService.PATH, repo];

        TaskService.add({
            desc: '编译仓库[' + repo + '] 的 [' + branch + '] 分支',
            cmd: 'sh',
            cwd: __dirname + '/../sh',
            args: args,
            success: function(){
                ++successCount;
            },
            complete: function(){
                RepoModel.update(repo, {
                    status: RepoModel.STATUS.NORMAL
                });
                ++completeCount && completeCount == count && complete && complete(successCount == count);
            }
        }, true);
    });
}
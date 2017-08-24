var path = require('path'), _ = require('../lib/util.js'), Task = require('../lib/task.js'), Log = require('../lib/log.js');
var RepoModel = require('../model/repo.js'), BranchModel = require('../model/branch.js');
var ReleaseService = require('./release.js');

exports.updateBranch = function(repo, success, error){
    if(repo.feather){
        Task.git({
            args: 'fetch --all -p',
            cwd: repo.dir
        }, false, 5000)
        .then(function(info){
            success && success(info);

            if(ReleaseService.autoMode && !info.errorMsg){
                info.msg.split(/[\r\n]/g).forEach(function(line){
                    if(line.indexOf('[deleted]') > -1){
                        return;
                    }

                    line = line.split(' -> ');

                    if(line.length > 1){
                        ReleaseService.addTask(repo.id, line[1].split('/')[1].replace(/ \S+/g, ''), ReleaseService.autoMode);
                    }
                });
            }

            return Task.git({
                args: 'branch -r',
                cwd: repo.dir
            }, true);
        }, function(info){
            error && error(info);
        })
        .then(function(info){
            var branches = [];

            info.msg.match(/origin\/\S+/g).forEach(function(item){
                item = item.substring(7);

                if(item != 'HEAD'){
                    branches.push(item);
                }
            });

            BranchModel.save(repo.id, _.unique(branches));
        });
    }
};

exports.updateBranches = function(callback){
    var repos = RepoModel.get(), i = 0, arr = [];
    
    for(var key in repos){
        repos[key].feather && arr.push(repos[key]);
    }

    var len = arr.length;

    function f(){
        if(i < len){
            setTimeout(function(){
                exports.updateBranch(arr[i++], f, f);
            }, ReleaseService.noTasks() ? 200 : 60 * 1.5 * 1000);
        }else{
            callback && callback();
        }
    }

    f();
};

exports.clear = function(){
    BranchModel.truncate();
};
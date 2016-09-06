var path = require('path'), _ = require('../lib/util.js'), Task = require('../lib/task.js'), Log = require('../lib/log.js');
var RepoModel = require('../model/repo.js'), BranchModel = require('../model/branch.js');
var FeatherService = require('./feather.js');

exports.updateBranch = function(repo){
    if(repo.feather && repo.status == RepoModel.STATUS.NORMAL){
        Task.git({
            args: 'fetch --all -p',
            cwd: repo.dir
        }, true)
        .then(function(info){
            if(!info.errorMsg){
                info.msg.split(/[\r\n]/g).forEach(function(line){
                    if(line.indexOf('[deleted]') > -1){
                        return;
                    }

                    line = line.split(' -> ');

                    if(line.length > 1){
                        FeatherService.addTask(repo.id, line[1].split('/')[1]);
                    }
                });
            }

            return Task.git({
                args: 'branch -r',
                cwd: repo.dir
            }, true);
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

exports.updateBranches = function(){
    _.map(RepoModel.get(), exports.updateBranch);
};
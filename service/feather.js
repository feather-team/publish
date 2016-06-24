var _ = require('../lib/util.js');
var TaskService = require('./task.js');
var RepoModel = require('../model/repo.js');

function release(repo, branch){

}

exports.release = function(repos, branch){
    if(!Array.isArray(repos)){
        repos = [repos];
    }

    var list = {};

    repos.forEach(function(repo){
        var info = RepoModel.get(repo);
        var name = info.fConf.name, mName = info.fConf.modulename;

        if(!list[name]){
            list[name] = [];
        }

        if(mName == 'common' || !mName){
            list[name].unshift(info);
        }else{
            list[name].push(info);
        }
    });

    var args = [branch], txt = [];

    _.map(list, function(repos){
        repos.forEach(function(repo){
            args.push(repo.dir);
            txt.push(repo.factory);
        });
    });

    TaskService.add({
        desc: '编译 [' + txt.join(', ') + '] 仓库的 [' + branch + '] 分支',
        cmd: './release.sh',
        cwd: __dirname + 
        args: args,
        error: function(){
            console.log('err', this.errorMsg);
        },
        success: function(){
            console.log('suc', this.msg);
        }
    });
}
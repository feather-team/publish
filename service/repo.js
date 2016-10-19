var Path = require('path'), _ = require('../lib/util.js'), Task = require('../lib/task.js');
var GIT_PATH = exports.PATH = Path.normalize(__dirname + '/../data/git/');

var RepoModel = require('../model/repo.js'), BranchModel = require('../model/branch.js');
var BranchService = require('./branch.js'), ProjectService = require('./project.js');
var waitCloneRepo = {};

function analyseAddress(url){
    //获取组名和仓库名
    var REG = /^(?:https?:\/\/[^\/]+\/|git@[^:]+:)(([\w-\.]+)\/([\w-\.]+))\.git$/;
    var matches = url.match(REG);

    if(matches){
        return {
            id: matches[1],
            group: matches[2],
            name: matches[3],
            url: url
        }
    }

    return false;
}

var Repo = module.exports = _.extend({}, require('./common.js'));

Repo.add = function(address){
    var repo = analyseAddress(address);

    if(!repo){
        return this.error('仓库路径不对，请填写正确的仓库路径！');
    }

    var id = repo.id;

    if(waitCloneRepo[id]){
        return this.error('仓库等待任务调度或调度ing');
    }

    if(RepoModel.get(id)){
        return this.error('仓库已存在！');
    }

    repo.dir = GIT_PATH + id;
    waitCloneRepo[id] = true;

    //do clone
    Task.git({
        desc: '克隆仓库[' + id + ']',
        args: ['clone', address],
        cwd: GIT_PATH + repo.group
    }).then(function(info){
        repo.status = RepoModel.STATUS.NORMAL;
        RepoModel.save(repo.id, repo);
        Repo.analyseAndSave(repo);
        BranchService.updateBranch(repo);
        delete waitCloneRepo[id];
    }, function(){
        exports.del(id);
        delete waitCloneRepo[id];
    });

    return this.success(repo);
};

Repo.analyseAndSave = function(repo){
    var result = ProjectService.analyse(repo.dir);

    if(result.code == 0){
        var info = {
            feather: result.data.feather
        };

        if(!info.feather){
            info.configs = null;
        }else{
            info.configs = result.data.configs;
        }

        RepoModel.update(repo.id, info);
        
        return this.success();
    }else{
        RepoModel.update(repo.id, {
            status: RepoModel.STATUS.ERROR
        });

        return this.error(result.msg);
    }
};

Repo.del = function(id){
    var repo;

    if(repo = RepoModel.get(id)){
        if(repo.status == RepoModel.STATUS.PROCESSING){
            return this.error('仓库使用中，操作失败');  
        }

        RepoModel.del(id);
        BranchModel.del(id);
    }

    var dir = GIT_PATH + id;
    var newName = dir + '' + Date.now();

    require('fs').rename(dir, newName, function(){
        Task({
            cmd: 'rm',
            args: ['-rf', newName]
        }, true);
    });

    return this.success();
};

Repo.getReposByBranch = function(branch){
    return RepoModel.getReposByBranch(branch);
};

Repo.getRepos = function(branch){
    return this.success(branch ? RepoModel.getByBranch(branch) : RepoModel.get())
};

Repo.lock = function(repos){
    repos.forEach(function(repo){
        RepoModel.update(repo, {
            status: RepoModel.STATUS.PROCESSING
        });
    });
}

Repo.unlock = function(repos){
    if(!repos){
        repos = Object.keys(RepoModel.get());
    }

    repos.forEach(function(repo){
        RepoModel.update(repo, {
            status: RepoModel.STATUS.NORMAL
        });
    });
};
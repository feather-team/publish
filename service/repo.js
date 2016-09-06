var path = require('path'), _ = require('../lib/util.js'), Task = require('../lib/task.js');
var GIT_PATH = exports.PATH = path.normalize(__dirname + '/../data/git/');

var RepoModel = require('../model/repo.js'), BranchModel = require('../model/branch.js');
var BranchService = require('./branch.js');

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

function analyseFeatherConfig(content){
    var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);
    var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);
    var config = {
        name: name ? name[1] : '_default',
        modulename: module ? module[1] : 'common'
    };

    var build = content.match(/deploy\b[^;$]+?build['"]?\s*[,:]\s*(\[[^\]]+\]|\{[^\}]+\})/);

    if(build){
        try{
            build = (new Function('return ' + build[1]))();
        }catch(e){
            return false;
        }

        config.build = build;
    }

    return config;
}

exports.add = function(address){
    var repo = analyseAddress(address);

    if(!repo){
        return {
            code: -1, 
            msg: '仓库路径不对，请填写正确的仓库路径！'
        }
    }

    var id = repo.id;

    if(waitCloneRepo[id]){
        return {
            code: -1,
            msg: '仓库等待任务调度或调度ing'
        }
    }

    if(RepoModel.get(id)){
        return {
            code: -1,
            msg: '仓库已存在！'
        }
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

        var config = repo.dir + '/feather_conf.js';
        var sameNameRepo;

        do{
            if(_.exists(config)){
                repo.feather = true;
                config = analyseFeatherConfig(_.read(config));

                if(!config){
                    info.status = 'error';
                    info.errorMsg = '无法解析feather仓库[' + id + ']的conf文件';
                    exports.del(id);
                    break;
                }else if(sameNameRepo = RepoModel.getByFeatherConfig({name: config.name, modulename: config.modulename})){
                    info.status = 'error';
                    info.errorMsg = 'feather仓库[' + id + ']的[' + config.modulename + ']模块已经存在，已存在仓库名 [' + sameNameRepo.id + ']';
                    exports.del(id);
                    break;
                }else if(!config.build){
                    info.status = 'error';
                    info.errorMsg = 'feather仓库[' + id + ']的conf文件中没有配置deploy.build属性';
                    exports.del(id);
                    break;
                }

                repo.config = config;
                BranchService.updateBranch(repo);
            }

            RepoModel.save(id, repo);
        }while(0);

        delete waitCloneRepo[id];
    }, function(){
        exports.del(id);
        delete waitCloneRepo[id];
    });
         
    return {
        code: 0,
        data: repo
    };
};

exports.del = function(id){
    var repo;

    if(repo = RepoModel.get(id)){
        if(repo.status == RepoModel.STATUS.PROCESSING){
            return {
                code: -1,
                msg: '仓库使用中，操作失败'
            }
            
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

    return {
        code: 0
    }
};

exports.getReposByBranch = function(branch){
    return RepoModel.getReposByBranch(branch);
};

exports.getRepos = function(branch){
    return {
        code: 0,
        data: branch ? RepoModel.getByBranch(branch) : RepoModel.get()
    };
};

exports.lock = function(repos){
    repos.forEach(function(repo){
        RepoModel.update(repo, {
            status: RepoModel.STATUS.PROCESSING
        });
    });
}

exports.unlock = function(repos){
    if(!repos){
        repos = Object.keys(RepoModel.get());
    }

    repos.forEach(function(repo){
        RepoModel.update(repo, {
            status: RepoModel.STATUS.NORMAL
        });
    });
}
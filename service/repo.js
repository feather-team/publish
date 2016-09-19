var Path = require('path'), _ = require('../lib/util.js'), Task = require('../lib/task.js');
var GIT_PATH = exports.PATH = Path.normalize(__dirname + '/../data/git/');

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

function analyseProjectConfig(content, _1x){
    var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);
    var type = content.match(/project\b[^\}]+?type['"]?\s*[,:]\s*['"]([^'"]+)/);
    var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);
    
    return config = {
        type: type ? type[1] : (_1x ? 'feather' : 'feather2'),
        name: name ? name[1] : '_default',
        modulename: module ? module[1] : 'common'
    };
}

function analyse1xConfig(file){
    var content = _.read(file);
    var config = analyseProjectConfig(content, true);
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

function analyse2xConfig(file){
    var content = _.read(file);
    var config = analyseProjectConfig(content);

    var deployFile = Path.join(Path.dirname(file), 'deploy/build.js');

    if(_.exists(deployFile)){
        config.build = require(deployFile);
    }

    return config;
};

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

        var config1x = repo.dir + '/feather_conf.js', config2x = repo.dir + '/conf/conf.js';
        var sameNameRepo, config;

        do{
            var isFeatherX = true;

            if(_.exists(config1x)){
                repo.feather = true;
                config = analyse1xConfig(config1x);
            }else if(_.exists(config2x)){
                repo.feather = true;
                config = analyse2xConfig(config2x);
            }else{
                isFeatherX = false;
            }

            if(isFeatherX){
                if(!config){
                    info.status = 'error';
                    info.errorMsg = '无法解析仓库[' + id + ']的conf文件';
                    exports.del(id);
                    break;
                }else if(sameNameRepo = RepoModel.getByFeatherConfig({name: config.name, modulename: config.modulename})){
                    info.status = 'error';
                    info.errorMsg = '项目[' + config.name + ']已存在[' + config.modulename + ']模块，仓库名[' + sameNameRepo.id + ']';
                    exports.del(id);
                    break;
                }else if(!config.build){
                    info.status = 'error';
                    info.errorMsg = '仓库[' + id + ']的conf文件中没有配置deploy.build属性';
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
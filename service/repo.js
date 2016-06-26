var path = require('path'), _ = require('../lib/util.js'), Process = require('../lib/process.js');
var TaskService = require('./task.js');

var GIT_PATH = exports.PATH = path.normalize(__dirname + '/../data/git/');
var RepoModel = require('../model/repo.js'), BranchModel = require('../model/branch.js');

var waitCloneRepo = {};

function analyseAddress(url){
    //获取组名和仓库名
    var REG = /^(?:https?:\/\/[^\/]+\/|git@[^:]+:)([\w-\.]+)\/([\w-\.]+)\.git$/;
    var matches = url.match(REG);

    if(matches){
        return {
            group: matches[1],
            name: matches[2],
            url: url
        }
    }

    return false;
}

function analyseFeatherConfig(content){
    var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);
    var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);
    var info = {
        name: name[1] || '_default',
        modulename: module[1] || 'common'
    };

    var build = content.match(/deploy\b[^\}]+?build['"]?\s*[,:]\s*(\[[^\]]+\]|\{[^\}]+\})/);

    if(build){
        try{
            build = (new Function('return ' + build[1]))();
        }catch(e){
            return false;
        }

        info.build = build;
    }

    return info;
}

exports.getAllRepos = function(){
    return {
        code: 0,
        data: RepoModel.get()
    };
};

exports.add = function(address){
    var result = analyseAddress(address), info;

    if(!result){
        return {
            code: -1, 
            msg: '仓库路径不对，请填写正确的仓库路径！'
        }
    }

    var factory = result.group + '/' + result.name;

    if(waitCloneRepo[factory]){
        return {
            code: -1,
            msg: '仓库等待任务调度或调度ing'
        }
    }

    if(info = RepoModel.get(factory)){
        return {
            code: -1,
            msg: '仓库已存在！'
        }
    }

    result.factory = factory;
    result.dir = GIT_PATH + factory;
    waitCloneRepo[factory] = true;

    //do clone
    TaskService.add({
        desc: '克隆仓库[' + factory + ']',
        cmd: 'git',
        args: ['clone', address],
        cwd: GIT_PATH + result.group,
        success: function(){
            result.status = RepoModel.STATUS.NORMAL;

            var config = result.dir + '/feather_conf.js';

            do{
                if(_.exists(config)){
                    result.feather = true;
                    config = analyseFeatherConfig(_.read(config));

                    if(!config){
                        this.status = 'error';
                        this.errorMsg = '无法解析feather仓库[' + factory + ']的conf文件';
                        exports.del(factory);
                        break;
                    }else if(RepoModel.getByFeatherConfig({name: config.name, modulename: config.modulename})){
                        this.status = 'error';
                        this.errorMsg = 'feather仓库[' + factory + ']的[' + config.modulename + ']模块已经存在';
                        exports.del(factory);
                        break;
                    }else if(!config.build){
                        this.status = 'error';
                        this.errorMsg = 'feather仓库[' + factory + ']的conf文件中没有配置deploy.build属性';
                        exports.del(factory);
                        break;
                    }

                    result.config = config;
                    updateBranch(result);
                }

                RepoModel.save(factory, result);
            }while(0);
        },
        complete: function(){
            delete waitCloneRepo[factory];
        }
    }, true);
         
    return {
        code: 0,
        data: result
    };
};

function updateBranch(repo){
    if(repo.feather && repo.status == RepoModel.STATUS.NORMAL){
        Process({
            cmd: 'git',
            args: ['branch', '-r'],
            cwd: repo.dir,
            success: function(){
                var branches = [];

                this.msg.match(/origin\/\S+/g).forEach(function(item){
                    item = item.substring(7);

                    if(item != 'HEAD'){
                        branches.push(item);
                    }
                });

                BranchModel.save(repo.factory, branches);
            } 
        });
    }
};

exports.updateBranches = function(){
    _.map(RepoModel.get(), updateBranch);
};

exports.getReposByBranch = function(branch){
    var repos = [];

    _.map(BranchModel.get(), function(branches, repo){
        branches.indexOf(branch) > -1 && repos.push(repo);
    });

    return {
        code: 0,
        data: repos
    }
};

exports.del = function(repo){
    var info;

    if(info = RepoModel.get(repo)){
        if(info.status == RepoModel.STATUS.PROCESSING){
            return {
                code: -1,
                msg: '仓库使用中，操作失败'
            }
        }

        RepoModel.del(repo);
        BranchModel.del(repo);
    }
    
    Process({
        cmd: 'rm',
        args: ['-rf', GIT_PATH + repo]
    });

    return {
        code: 0
    }
};
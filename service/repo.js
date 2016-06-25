var path = require('path'), _ = require('../lib/util.js'), Process = require('../lib/process.js');
var TaskService = require('./task.js');

var GIT_PATH = exports.PATH = path.normalize(__dirname + '/../data/git/');
var RepoModel = require('../model/repo.js'), BranchModel = require('../model/branch.js');

function analyseFeatherConfig(file){
    var content = _.read(file), info = {};
    var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);

    if(name){
        info.name = name[1];
    }

    var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);

    if(module){
        info.modulename = module[1];
    }

    return info;
}

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

    var key = result.group + '/' + result.name;

    if(info = RepoModel.get(key)){
        if(info.status == 'initializing'){
            return {
                code: -1,
                msg: '仓库等待任务调度或调度ing'
            }
        }else{
            return {
                code: -1,
                msg: '仓库已存在！'
            }
        }
    }

    result.factory = key;
    result.status = 'initializing';
    result.dir = GIT_PATH + key;
    RepoModel.save(key, result);

    //do clone
    TaskService.add({
        cmd: 'git',
        args: ['clone', address],
        cwd: GIT_PATH + result.group,
        error: function(){
            RepoModel.del(key);
        },
        success: function(){
            result.status = 'initialized';

            var config = result.dir + '/feather_conf.js';

            if(_.exists(config)){    
                result.fConf = analyseFeatherConfig(config);
            }

            RepoModel.update(key, result);
            updateBranch(result);
        }
    }, true);
         
    return {
        code: 0,
        data: result
    };
};

function updateBranch(repo){
    if(repo.fConf && repo.status == 'initialized'){
        Process({
            desc: '克隆仓库 [' + repo.factory + ']',
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
var _ = require('../lib/util.js');

var REPO_DATA_PATH = __dirname + '/../data/repos.json';
var GIT_PATH = __dirname + '/../data/git/';

var TaskService = require('./task.js');

function analyseAddress(url){
    //获取组名和仓库名
    var REG = /^(?:https?:\/\/[^\/]+\/|git@[^:]+:)([\w-]+)\/([\w-]+)\.git$/;
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

function getRepo(key){ 
    var repos = _.readJson(REPO_DATA_PATH);

    if(!key){
        return repos;
    }

    return repos[key];
}

exports.getAllRepos = function(){
    return {
        code: 0,
        data: getRepo()
    };
};

exports.save = function(key, info){
    var repos = getRepo();
    
    repos[key] = _.extend(repos[key] || {}, info);
    _.writeJson(REPO_DATA_PATH, repos);
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
    var info;

    if(info = getRepo(key)){
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

    exports.save(key, result);

    //do clone
    TaskService.add({
        cmd: 'git',
        args: ['clone', address],
        cwd: GIT_PATH + result.group,
        error: function(){
            
        },
        complete: function(){
            // var conf = analyseFeatherConf(GIT_PATH + key + '/feather_conf.js');
            var conf = {xxx: 123};
            conf.status = 'initialized';
            exports.save(key, conf);
        }
    });
         
    return {
        code: 0,
        data: result
    };
};
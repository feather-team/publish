var _ = require('../lib/util.js'), path = require('path');
var TaskService = require('./task.js'), RepoService = require('./repo.js');
var RepoModel = require('../model/repo.js');

var releasing = false;

function analyseFeatherConfig(repo){
    var file = repo.dir + '/feather_conf.js';
    var content = _.read(file), info = {};
    var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);

    if(name){
        info.name = name[1];
    }

    var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);

    if(module){
        info.modulename = module[1];
    }

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

    var list = {};
    var distList = [];

    for(var i = 0; i < repos.length; i++){
        var repo = RepoModel.get(repos[i]);
        var config = analyseFeatherConfig(repo);

        if(!config){
            return {
                code: -1,
                msg: '无法解析feather仓库[' + repo.factory + ']的conf文件'
            }
        }

        if(!config.build){
            return {
                code: -1,
                msg: 'feather仓库[' + repo.factory + ']的conf文件中没有配置deploy.build属性'
            }
        }

        var build = _.toArray(config.build);

        for(var j = 0; j < build.length; j++){
            var dist = build[j];

            if(!dist.to){
                return {
                    code: -1,
                    msg: 'feather仓库[' + repo.factory + ']的deploy.build配置不正确'
                }
            }

            var to = path.resolve(repo.dir, dist.to);
            var sp = to.substring(RepoService.PATH.length);
            // var toRepo = RepoModel.get(sp);

            // if(!toRepo || toRepo.status == 'initializing'){
            //     return {
            //         code: -1,
            //         msg: 'feather仓库[' + repo.factory + ']的产出目录不存在，请确保对应仓库已成功添加进系统'
            //     } 
            // }

            distList.push(sp);
        }

        var name = config.name, mName = config.modulename;

        if(!list[name]){
            list[name] = [];
        }

        if(mName == 'common' || !mName){
            list[name].unshift(repo);
        }else{
            list[name].push(repo);
        }
    }

    var args = ['release.sh', branch, RepoService.PATH], txt = [];

    _.map(list, function(repos){
        repos.forEach(function(repo){
            args.push(repo.factory);
            txt.push(repo.factory);
        });
    });

    TaskService.add({
        desc: '编译 [' + txt.join(', ') + '] 仓库的 [' + branch + '] 分支',
        cmd: 'sh',
        cwd: __dirname + '/../sh',
        args: args
    });

    return {code: 0};
}
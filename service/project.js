var _ = require('../lib/util.js'), Path = require('path');
var RepoModel = require('../model/repo.js');
var GIT_PATH = exports.PATH = Path.normalize(__dirname + '/../data/git/');

function analyseProjectConfig(files, _1x){
    return files.map(function(file){
        var content = _.read(file);

        if(!content){
            return false;
        }

        var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);
        var type = content.match(/project\b[^\}]+?type['"]?\s*[,:]\s*['"]([^'"]+)/);
        var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);
        
        if(!type){
            if(!_1x && /\blothar\./.test(content)){
                type = 'lothar';
            }else if(_1x){
                type = 'feather';
            }else{
                type = false;
            }
        }else{
            type = type[1];
        }

        return config = {
            type: type,
            name: name ? name[1] : '_default',
            modulename: module ? module[1] : 'common',
            dir: _1x ? Path.dirname(file) : Path.dirname(Path.dirname(file))
        };
    });
}

function scanConfigFile(dir, filename){
    var config = dir + '/' + filename;

    if(_.exists(config)){
        return [config];
    }

    var configs = [];

    _.readdir(dir).forEach(function(dir){
        var config = dir + '/' + filename;

        if(_.exists(config)){
            configs.push(config);
        }
    });

    return configs;
}

var Project = module.exports = _.extend({}, require('./common.js'));

Project.analyse = function(repo){
    var dir = repo.dir;
    var config1x = scanConfigFile(dir, 'feather_conf.js'), config2x = scanConfigFile(dir, 'conf/conf.js');
    var sameNameRepo, configs;

    if(config1x.length && config2x.length){
        return this.error('目录同时包含了1.x和2.0模块');
    }else{
        var isFeatherX = true;

        if(config1x.length){
            configs = analyseProjectConfig(config1x, true);
        }else if(config2x.length){
            configs = analyseProjectConfig(config2x);
        }else{
            isFeatherX = false;
        }

        if(isFeatherX){
            if(configs.indexOf(false) > -1){
                return this.error('无法解析配置文件');
            }else{
                //检查是不是都有project.type
                var pass;
                
                pass = configs.every(function(config){
                    return config.type;
                });

                if(!pass){
                    return this.error('配置文件缺少project.type属性，请设置具体的project.type属性[feather2,lothar,feather]！')
                }

                //检查是不是都是同一个类型或一个项目的
                var name = configs[0].name, type = configs[0].type, modules = [];
                pass = configs.every(function(config){
                    modules.push(config.modulename);
                    return config.name == name && config.type == type;
                });

                if(!pass){
                    return this.error('添加仓库中包含多模块时模块间的project.type和project.name必须相同！');
                }   

                if(_.unique(modules).length != modules.length){
                    return this.error('仓库中的模块重名！');
                }

                var sameNameRepo, sameConfig;
                pass = configs.every(function(config){
                    var repo = RepoModel.getByFeatherConfig({
                        name: config.name, 
                        modulename: config.modulename
                    });

                    if(repo.configs[0].dir != config.dir){
                        sameNameRepo = repo;
                        sameConfig = config;
                        return false;
                    }

                    return true;
                });

                if(!pass){
                    return this.error('项目[' + sameConfig.name + ']已存在[' + sameConfig.modulename + ']模块，仓库名[' + sameNameRepo.id + ']');
                }

                return this.success({feather: true, configs: configs});
            }
        }

        return this.success({feather: false});
    }
};

function analyseDeployConfig(info, branch){
    var type = info.type;
    var deploy = Project.getDeployName(type, branch);
    
    if(!deploy) return false;

    var file;

    if(type == 'feather'){
        file = info.dir + '/feather_conf.js';
    }else{
        file = info.dir + '/conf/conf.js';
    }

    var content = _.read(file);
    var config = content.match(new RegExp('deploy\\b[^;$]+?' + deploy + '[\'"]?\\s*[,:]\\s*(\\[[^\\]]+\\]|\\{[^\\}]+\\})'));

    if(config){
        try{
            return (new Function('return ' + config[1]))();
        }catch(e){
            return false;
        }
    }else if(type != 'feather'){
        file = Path.normalize(info.dir + '/conf/deploy/' + deploy + '.js');

        try{
            if(_.exists(file)){
                delete require.cache[file];
                return require(file);
            }
        }catch(e){
            return false;
        }
    }
}

Project.getDeployName = function(type, branch){
    var config = Application.get('config').deploy[type];
    return config[branch] || config['*'];
};

Project.analyseDeployConfig = function(repo, branch){
    var result = [], pass;

    pass = (repo.configs || []).every(function(config){
        var deploy = analyseDeployConfig(config, branch);

        if(deploy){
            for(var dist of deploy){
                if(!dist.to){
                    return false;
                }

                var to = Path.resolve(repo.dir, dist.to);
                var toId = to.substring(GIT_PATH.length).split(Path.sep).slice(0, 2).join('/');

                if(!RepoModel.get(toId)){
                    return false;
                }

                result.push(toId);
            }

            return true;
        }else{
            return false;
        }
    });

    if(pass){
        return exports.success(result);
    }

    return exports.error('配置deploy中存在问题，可能的错误：\n1. 平台编译时，使用的--dest配置值为[' + JSON.stringify(Application.get('config').deploy)) + ']，请确保deploy的对应值存在 \n2. to属性所对应的仓库不存在，请添加该仓库后再进行处理 \n3. 文件存在语法错误.'
};
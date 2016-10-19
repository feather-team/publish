var _ = require('../lib/util.js'), Path = require('path');
var RepoModel = require('../model/repo.js');

function analyseProjectConfig(files, _1x){
    return files.map(function(file){
        var content = _.read(file);

        if(!content){
            return false;
        }

        var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);
        var type = content.match(/project\b[^\}]+?type['"]?\s*[,:]\s*['"]([^'"]+)/);
        var module = content.match(/project\b[^\}]+?modulename['"]?\s*[,:]\s*['"]([^'"]+)/);
        
        return config = {
            type: type ? type[1] : false,
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

module.exports = _.extend({}, require('./common.js'), {
    analyse: function(dir){
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
                        return this.error('配置文件缺少project.type属性，请设置具体的project.type属性[feather2,lothar,feather]')
                    }

                    //检查是不是都是同一个类型或一个项目的
                    var name = configs[0].name, type = configs[0].type;
                    pass = configs.every(function(config){
                        return config.name == name && config.type == type;
                    });

                    if(!pass){
                        return this.error('添加仓库中包含多模块时模块间的project.type和project.name必须相同');
                    }   

                    var sameNameRepo, sameConfig;
                    pass = configs.every(function(config){
                        var repo = RepoModel.getByFeatherConfig({name: config.name, modulename: config.modulename});

                        if(repo){
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
    }
});
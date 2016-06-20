'use strict';
var cprocess = require('../lib/cprocess');

module.exports = {
    getReposMap : function(res,repos,done){
        var results = {},
            pending = repos.length,
            allRepos = featherRepos = repos,
            configPath;
        if (!pending){
            throw '请选择需要产出的仓库！';
            //return cprocess.send(res, false, '请选择需要产出的仓库！');
        } 

        repos.forEach(function(repo) {
            //读取feather-conf.js中name、modulename、local配置

            configPath = path.join(REPO_PATH, 'feather/' + repo + '/feather_conf.js');

            fs.readFile(configPath, 'utf-8', function(err, data) {
                var projectStr = data.match(/project\s*:\s*\{([\s\S]*?)\}/),
                    localStr = data.match(/local\s*:\s*\[([\s\S]*?)\]/);

                if (!projectStr || !localStr) {
                    throw '无法读取feather配置信息';
                    // cprocess.send(res, false, '无法读取feather配置信息');
                    // return false;
                }

                //正则有待优化
                var project = projectStr[1].replace(/\s/g, ''),
                    nameMatch = project.match(/name:\'(.*?)\'/),
                    moduleMatch = project.match(/modulename:\'(.*?)\'/),
                    name = nameMatch[1],
                    modulename = moduleMatch[1];

                var local = localStr[1].replace(/\s/g, '').split('},{');
                var outputName = [];
                local.forEach(function(item) {
                    var itemName = item.match(/\'\.\.\/\.\.\/output\/(.*?)[\/|\']/);
                    outputName.push(itemName[1]);
                    allRepos.push(itemName[1]);
                    allOutputRepos.push(itemName[1]);
                })

                if (results[name]) {
                    results[name]['modules'].push(repo);
                } else {
                    featherRepos.push(repo);
                    if (modulename == '' || modulename == 'common') {
                        results[name] = {
                            'common': [repo],
                            'modules': [],
                            'outputs': outputName
                        }
                    } else {
                        results[name] = {
                            'common': ['feather-' + name + '-common'],
                            'modules': [repo],
                            'outputs': outputName
                        }
                    }
                }

                if (!--pending && results) done(results);
            });
        });
    } 
}

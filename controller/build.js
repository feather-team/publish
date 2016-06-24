var Build = module.exports = function(req, res) {
    res.render('build');
};

var FeatherService = require('../service/feather.js');

Build.release = function(req, res){
    var repos = req.body.reposNames, branch = req.body.fetchName;
    FeatherService.release(repos, branch)
    res.send({
        code: 1
    });
};

// Build.releaseRepo = function(req, res) {
//     var response = {},
//         reposRelations = [],
//         allRepos = [], //将所有仓库放在此数组中，方便控制是否已经全部更新
//         allFeatherRepos = [], //将所有feather仓库放在此数组中，方便控制是否已经全部产出
//         allOutputRepos = [],
//         repos = req.body.reposNames,
//         branch = req.body.fetchName,
//         exec = child_process.exec;
//     //获取仓库关系
//     var getReposRelations = function(repos, done) {
//         var results = {};
//         var pending = repos.length;
//         if (!pending) return cprocess.send(res, false, '请选择需要产出的仓库！');

//         repos.forEach(function(repo) {
//             //读取feather-conf.js中name、modulename、local配置
//             allRepos.push(repo);
//             allFeatherRepos.push(repo)
//             var configPath = path.join(REPO_PATH, 'feather/' + repo + '/feather_conf.js');
//             fs.readFile(configPath, 'utf-8', function(err, data) {
//                 var projectStr = data.match(/project\s*:\s*\{([\s\S]*?)\}/);
//                 var localStr = data.match(/local\s*:\s*\[([\s\S]*?)\]/);

//                 if (!projectStr || !localStr) {
//                     cprocess.send(res, false, '无法读取feather配置信息');
//                     return false;
//                 }

//                 //正则有待优化
//                 var project = projectStr[1].replace(/\s/g, ''),
//                     nameMatch = project.match(/name:\'(.*?)\'/),
//                     moduleMatch = project.match(/modulename:\'(.*?)\'/),
//                     name = nameMatch[1],
//                     modulename = moduleMatch[1];

//                 var local = localStr[1].replace(/\s/g, '').split('},{');
//                 var outputName = [];
//                 local.forEach(function(item) {
//                     var itemName = item.match(/\'\.\.\/\.\.\/output\/(.*?)[\/|\']/);
//                     outputName.push(itemName[1]);
//                     allRepos.push(itemName[1]);
//                     allOutputRepos.push(itemName[1]);
//                 })

//                 if (results[name]) {
//                     results[name]['modules'].push(repo);
//                 } else {
//                     allFeatherRepos.push(repo);
//                     if (modulename == '' || modulename == 'common') {
//                         results[name] = {
//                             'common': [repo],
//                             'modules': [],
//                             'outputs': outputName
//                         }
//                     } else {
//                         results[name] = {
//                             'common': ['feather-' + name + '-common'],
//                             'modules': [repo],
//                             'outputs': outputName
//                         }
//                     }
//                 }

//                 if (!--pending && results) done(results);
//             });
//         });
//     };
//     //更新仓库
//     var updateRepos = function() {
//         allRepos = tools.unique(allRepos); 

//         var allReposLength = allRepos.length;

//         allRepos.forEach(function(currentValue, index, array) {
//             var type = currentValue.match(/^feather.*/),
//                 outfilePath = type == null ? path.join(REPO_PATH, 'output/' + currentValue) : path.join(REPO_PATH, 'feather/' + currentValue),
//                 goOutfilePath = type == null ? 'output/' + currentValue : 'feather/' + currentValue;

//             fs.exists(outfilePath, function(exists) {
//                 if (!exists) { //产出仓库不存在
//                     todoing = false;
//                     cprocess.send(res, false, currentValue + '仓库不存在，请先添加该仓库！');
//                 } else {
//                     fs.stat(outfilePath, function(err, stat) {
//                         if (err !== null) {
//                             cprocess.send(res, false, err);
//                         }
//                         if (stat && stat.isDirectory()) {
//                             exec_result = exec(CMD.GREP_BRANCH + branch, {
//                                 cwd: outfilePath
//                             }, function(err, stdout, stderr) {
//                                 if (err !== null && err.code == 1) {        
//                                     cprocess.spawn('createbranch.sh ' + goOutfilePath + ' ' + branch, function(data) {
//                                         if (data == 0) --allReposLength;
//                                     });//创建分支，拉取新代码
//                                 } else {                    
//                                     cprocess.spawn('updatebranch.sh ' + goOutfilePath + ' ' + branch, function(data) {
//                                         if (data == 0) --allReposLength;
//                                     });//拉取最新代码 
//                                 }

//                             });
//                         }
//                     });
//                 }
//             });
//         })

//         var updateFlag = setInterval(function() {
//             if (allReposLength == 0) {
//                 clearInterval(updateFlag);
//                 console.log('update done');
//                 releaseRepos();
//             }
//         }, 2000);
//     };
//     //产出代码
//     var releaseRepos = function() {
//         allFeatherRepos = tools.unique(allFeatherRepos);
//         var aFRLength = allFeatherRepos.length;

//         for (var name in reposRelations) {
//             var reposInfo = reposRelations[name];
//             cprocess.spawn('releaserepos.sh ' + reposInfo.common, function(data) {
//                 if (data == 0) {
//                     --aFRLength;
//                     if (reposInfo.modules.length != 0) {
//                         reposInfo.modules.forEach(function(repo) {
//                             cprocess.spawn('releaserepos.sh ' + repo, function(data) {
//                                 if (data == 0) --aFRLength;
//                             });
//                         });
//                     }
//                 }
//             });
//         }

//         var releaseFlag = setInterval(function() {
//             if (aFRLength == 0) {
//                 clearInterval(releaseFlag);
//                 console.log('release done');
//                 pushRepos();
//             }
//         }, 2000);
//     };
//     //提交代码
//     var pushRepos = function() {
//         allOutputRepos = tools.unique(allOutputRepos);
//         var aORLength = allOutputRepos.length;

//         allOutputRepos.forEach(function(currentValue, index, array) {
//             cprocess.spawn('pushrepos.sh ' + 'output/' + currentValue + ' ' + branch, function(data) {
//                 if (data == 0) --aORLength;
//             });
//         });

//         var pushFlag = setInterval(function() {
//             if (aORLength == 0) {
//                 clearInterval(pushFlag);
//                 console.log('push done');
//                 cprocess.send(res, true, '代码已产出并提交！');
//             }
//         }, 2000);
//     };
//     getReposRelations(repos, function(results) {
//         console.log(results);
//         reposRelations = results;
//         updateRepos(reposRelations);
//     });
// }

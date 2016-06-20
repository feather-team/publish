var Repo = module.exports = function(req, res){
    res.render('repositories');
};

var _ = require('../lib/util.js');
var RepoService = require('../service/repo.js');

Repo.getRepoList = function(req,res){
    var repos = RepoService.getAllRepos().data;
    var result = {};

    for(var i in repos){
        var temp = i.split('/');
        var group = temp[0], name = temp[1];

        if(!result[group]){
            result[group] = {};
        }

        result[group][name] = repos[i];
    }

    res.send({
        code: 0,
        data: result
    });
};

function analyseImportantInfo(){
    var name = content.match(/project\b[^\}]+?name['"]?\s*[,:]\s*['"]([^'"]+)/);
}

Repo.updateRepoList = function(req, res){
    res.send(RepoService.add(req.body.address));
};

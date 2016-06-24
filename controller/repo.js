var Repo = module.exports = function(req, res){
    res.render('repositories');
};

var _ = require('../lib/util.js');
var RepoService = require('../service/repo.js');

Repo.getList = function(req, res){
    var repos = RepoService.getAllRepos().data;
    var result = {};

    _.map(RepoService.getAllRepos().data, function(item, key){
        var temp = key.split('/');
        var group = temp[0], name = temp[1];

        if(!result[group]){
            result[group] = {};
        }

        result[group][name] = item;
    });

    res.send({
        code: 0,
        data: result
    });
};

Repo.add = function(req, res){
    res.send(RepoService.add(req.body.address));
};

Repo.search = function(req, res){
    res.send(RepoService.getReposByBranch(req.query.branch));
};
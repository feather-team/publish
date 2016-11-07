var Repo = module.exports = function(req, res){
    res.render('repo');
};

var _ = require('../lib/util.js');
var RepoService = require('../service/repo.js');

Repo.getList = function(req, res){
    var result = {};

    _.map(RepoService.getRepos().data, function(item, key){
        var temp = key.split('/');
        var group = temp[0], name = temp[1];

        if(!result[group]){
            result[group] = {
                repos: {},
                class: ''
            };
        }

        result[group]['repos'][name] = item;
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
    var branch = _.trim(req.query.branch);

    if(!branch){
        res.send({
            code: -1,
            msg: '请输入分支名'
        });
        return;
    }

    res.send(RepoService.getRepos(req.query.branch));
};

Repo.del = function(req, res){
    res.send(RepoService.del(req.body.repo));
}
var Build = module.exports = function(req, res) {
    res.render('build');
};

var ReleaseService = require('../service/release.js');
var Task = require('../lib/task.js');

Build.release = function(req, res){
    var repos = req.body.reposNames, branch = req.body.fetchName;
    res.send(ReleaseService.addTask(repos, branch));
};

Build.detail = function(req, res){
    res.send({
        code: 0,
        data: Task.getMsg(req.query.id)
    });
};
var Build = module.exports = function(req, res) {
    res.render('build');
};

var ReleaseService = require('../service/release.js');

Build.release = function(req, res){
    var repos = req.body.reposNames, branch = req.body.fetchName;
    res.send(ReleaseService.addTask(repos, branch));
};
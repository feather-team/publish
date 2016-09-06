var Build = module.exports = function(req, res) {
    res.render('build');
};

var FeatherService = require('../service/feather.js');

Build.release = function(req, res){
    var repos = req.body.reposNames, branch = req.body.fetchName;
    res.send(FeatherService.release(repos, branch));
};
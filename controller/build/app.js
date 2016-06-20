var Build = module.exports = function(req, res) {
    res.render('build');
};

Build.releaseRepo = function(req,res){
    var reposNames = req.body.reposNames,
        branch = req.body.fetchName,
        repos = require('getReposMap');
        
    repos.getReposMap(reposNames, function(results) {
        console.log(results);
        reposRelations = results;
        updateRepos(reposRelations);
    });
}

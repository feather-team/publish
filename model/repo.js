var DB = require('../lib/data.js');

var Repo = module.exports = new DB(__dirname + '/../data/repos.json');

Repo.getByFeatherConfig = function(condition){
    var repos = this.get();

    for(var i in repos){
        var repo = repos[i];

        if(repo.feather && has(repo.config, condition)){
            return repo;
        }
    }
};

function has(obj1, obj2){
    for(var i in obj2){
        if(obj1[i] != obj2[i]){
            return false;
        }
    }

    return true;
}

Repo.STATUS = {
    NORMAL: 1,
    PROCESSING: 2
};
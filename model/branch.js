var DB = require('../lib/data.js');

var Branch = module.exports = new DB(__dirname + '/../data/branches.json');

Branch.getIdsByBranch = function(branch){
    var info = this.get(), ids = [];

    for(var id in info){
        if(info[id].indexOf(branch) != -1){
            ids.push(id);
        }
    }

    return ids;
};
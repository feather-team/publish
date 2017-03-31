var DB = require('../lib/data.js');
var Status = module.exports = new DB(__dirname + '/../data/status.json');

Status.STATUS = {
    PENDING: 0,
    RUNING: 1,
    SUCCESS: 2,
    ERROR: 3
};

Status.getDesc = function(status){
    for(var i in Status.STATUS){
        if(Status.STATUS[i] == status){
            return i;
        }
    }
};
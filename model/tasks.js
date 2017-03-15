var DB = require('../lib/data.js');
var Tasks = module.exports = new DB(__dirname + '/../data/tasks.json');
var _ = require('../lib/util.js');

Tasks.save = function(data){
    _.writeJson(this.file, data);
};
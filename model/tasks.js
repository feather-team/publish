var DB = require('../lib/data.js');
var Tasks = module.exports = new DB(__dirname + '/../data/tasks.json');
Tasks.save = function(arr){
	this.rewrite(arr);
};
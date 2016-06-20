var datacenter = require('../data/datacenter.js').datacenter;
var events = require("events");
var emitter = new events.EventEmitter();//创建了事件监听器的一个对象
var fs = require('../lib/fs.js');
var git = require('../lib/git.js');
var child_process = require('child_process');
var spawn = child_process.spawn;

 module.exports = {

    git_clone_project:function(test){
        var projectName = 'feather-web-gold';
        //git.cloneProject(projectName);
        //git.clone();
        console.log('sssssssssssssss');
        //var free  = spawn('git status');
        //console.log(free);

        test.done();
    }
};


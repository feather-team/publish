var datacenter = require('../data/datacenter.js').datacenter;
var events = require("events");
var emitter = new events.EventEmitter();//创建了事件监听器的一个对象
var fs = require('../lib/fs.js');
var git = require('../lib/git.js');

 module.exports = {

        setUp: function (callback) {
            datacenter.sys_data_init().then(
                function(data){
                    callback();
                }
            );
            callback();
        },

        tearDown: function (callback) {
            // clean up
            callback();
        },

        git_list_projects: function (test) {
            var projectList = datacenter.list_projects('dev-fe');
            test.ok(3,projectList.length);
            test.done();
        },

        git_clone_project:function(test){
            var projectName = 'feather-web-gold';
            //git.cloneProject(projectName);
            git.clone();
            
            test.done();
        }

};


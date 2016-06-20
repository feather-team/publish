var datacenter = require('../data/datacenter.js').datacenter;
var events = require("events");
var emitter = new events.EventEmitter();//创建了事件监听器的一个对象
var fs = require('../lib/fs.js');

module.exports = {
    git_info_init:function(test){
        datacenter.sys_data_init().then(
            function(data){
                test.ok(true, typeof datacenter.gitInfo == 'object');
                test.done();
            }
        );
    }
};


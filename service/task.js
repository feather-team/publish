var waits = [];
var stores = [];

var spawn = require('child_process').spawn;
var path = require('path'), _ = require('../lib/util.js');
var events = require('events');

var Process = require('../lib/process.js');

function doTask(task){
    var chain = true;

    if(!task){
        if(Task.isRuning){
            return false;
        }

        if(!(task = waits.shift())){
            return false;
        }

        Task.isRuning = true;
    }else{
        chain = false;
    }

    stores.push(task);

    Process(task).on('close', function(){
        if(chain){
            Task.isRuning = false;
        }

        Task.emit('close', task);
        doTask();
    });

    Task.emit('start', task);
};

var Task = module.exports = new events;

Task.on('error', function(){});

Task.add = function(task, rightNow){
    var id = Date.now();
    task.id = id;

    if(rightNow){
        doTask(task);
    }else{
        waits.push(task);
        doTask();
    }

    Task.emit('add', task);

    return task;
};

Task.isRuning = false;

Task.getAll = function(){
    return stores.concat(waits).reverse();
}; 
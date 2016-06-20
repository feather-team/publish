var cache = [];
var doings = {};
var completes = {};
var errors = {};

var spawn = require('child_process').spawn;
var path = require('path'), _ = require('../lib/util.js');
var events = require('events');

var GIT_ERROR_REG = /\b(?:fatal|error):/;

function isGitError(cmd, data){
    return cmd == 'git' && GIT_ERROR_REG.test(data);
}

function doTask(){
    //run one task when add one
    if(Task.isRuning() || _.empty(cache)) return;

    var task = cache.shift();
    var root = path.normalize(task.cwd);

    _.mkdir(root);

    var proc = spawn(task.cmd, task.args || [], {
        cwd : root, 
        env: process.env
    });    

    doings[task.id] = true;
    Task.emit('start', task);

    function handleStdStream(data){
        data = (data || '').toString();

        if(isGitError(task.cmd, data)){
            errors[task.id] = true;
            task.error && task.error();
            Task.emit('error', task);
        }
    }

    proc.stdout.on('data', handleStdStream);
    proc.stderr.on('data', handleStdStream);

    proc.on('close', function(){
        delete doings[task.id];

        if(!errors[task.id]){
            completes[task.id] = true;
            task.complete && task.complete();
            Task.emit('complete', task);
        }

        Task.emit('close', task);
        doTask();
    });
}

var Task = module.exports = new events;

Task.add = function(task, first){
    var id = Date.now();
    task.id = id;

    if(first){
        cache.unshift(task);
    }else{
        cache.push(task);
    }

    doTask();

    return id;
};

Task.isRuning = function(){
    return !_.empty(doings);
};
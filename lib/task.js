var spawn = require('child_process').spawn, path = require('path');
var _ = require('../lib/util.js'), log = require('../lib/log.js');
var Q = require('q');
var stores = [];
var TIMEOUT = 10 * 60 * 1000;

var Task = module.exports = function(info, quiet, out){
    var root;
    var deferred = Q.defer();

    info.status = 'processing';
    info.id = Date.now();

    if(!quiet){
        stores.push(info);
        Task.emit('start', info);
    }

    if(info.cwd){
        root = path.normalize(info.cwd);
        _.mkdir(root);
    }else{
        root = process.cwd();
    }

    info.startTime = Date.now();

    !quiet && log.notice('执行任务开始：' + info.cmd + ' ' + info.args.join(' '));

    var proc = spawn(info.cmd, info.args || [], {
        cwd: root, 
        env: process.env
    });

    var result = '', timeout = false, debug = info.debug;

    var tid = setTimeout(function(){
        timeout = true;
        proc.kill();
    }, out || TIMEOUT); 

    proc.stdout.on('data', function(data){
        result += (data || '').toString();
    });

    proc.stderr.on('data', function(data){
        data = data ? data.toString() : '';

        if(info.cmd == 'git'){
            if(!/^(error|fatal):/.test(data)){
                result += data;
                return;
            }
        }else{
            result += data;
        }

        proc.kill();
    });

    proc.on('close', function(code){
        clearTimeout(tid);

        info.msg = result;
        info.closeTime = Date.now();     

        if(timeout){
            info.status = 'error';
            info.msg = info.errorMsg = info.msg + '\n任务超时，请重新执行!!!!';
            !quiet && log.notice('执行任务超时：' + info.cmd + ' ' + info.args.join(' ') + '\n返回：' + info.msg);
            deferred.reject(info);
        }else if(code === 0){
            info.status = 'success';
            !quiet && log.notice('执行任务完成：' + info.cmd + ' ' + info.args.join(' ') + '\n返回：' + info.msg);
            deferred.resolve(info);
        }else{
            info.status = 'error';
            info.errorMsg = info.msg;
            deferred.reject(info);
            !quiet && log.notice('执行任务失败：' + info.cmd + ' ' + info.args.join(' ') + '\n返回：' + info.msg);
        }

        !quiet && process.nextTick(function(){
            Task.emit('close', info);
        })
    });

    return deferred.promise;
};

var eventEmitter = require('events').EventEmitter;
_.extend(Task, eventEmitter.prototype);

Task.get = function(count){
    if(count){
        count = -count;
    }else{
        count = 0;
    }

    return stores.slice(count).reverse().map(function(item){
        return {
            closeTime: item.closeTime,
            desc: item.desc,
            startTime: item.startTime,
            status: item.status,
            id: item.id
        };
    });
};

Task.getMsg = function(id){
    var store = stores.filter(function(store){
        return String(store.id) == String(id);
    });

    if(store.length){
        store = store[0];
        return store.status == 'error' ? store.errorMsg : store.msg;
    }else{
        return '';
    }
};

Task.GC_TIME = 1000 * 60 * 60 * 3;

/**
 * 垃圾回收， 清除执行已超过固定时间的任务
 * @return {[type]} [description]
 */
Task.gc = function(){
    var now = Date.now();

    return stores = stores.filter(function(task){
        return task.closeTime && (now - task.closeTime < Task.GC_TIME);
    });
};

'sh git'.split(' ').forEach(function(method){
    Task[method] = function(options, quiet){
        options.cmd = method;

        if(typeof options.args == 'string'){
            options.args = options.args.split(/\s+/g);
        }

        return Task(options, quiet);
    }
});
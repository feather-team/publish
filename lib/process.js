var spawn = require('child_process').spawn, path = require('path');
var _ = require('../lib/util.js'), log = require('../lib/log.js');

function isGitError(cmd, data){
    return cmd == 'git' && /^(error|fatal):/.test(data);
}

var Process = module.exports = function(info){
    var root = path.normalize(info.cwd);
    _.mkdir(root);

    var proc = spawn(info.cmd, info.args || [], {
        cwd: root, 
        env: process.env
    });  

    var result = '';

    info.status = 'processing';

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
        }
        
        proc.kill();
        info.status = 'error';
        info.errorMsg = data;
        info.error && info.error.call(info);
    });

    proc.on('close', function(code){
        info.msg = result;

        if(code === 0){
            info.status = 'success';
            info.success && info.success.call(info);
        }
        
        info.complete && info.complete.call(info);
    });

    return proc;
};
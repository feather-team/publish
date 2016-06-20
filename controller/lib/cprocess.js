var cprocess = {},
    child_process = require('child_process');

cprocess.spawn = function(command, callback, err) {
    var spawn = child_process.spawn;
    try {
        var spawnObj = spawn('sh', ['-c', command], {
            cwd: REPO_PATH
        });

        spawnObj.stdout.on('data', function(data) {
            console.log('**stdout**' + data.toString());
        });
        spawnObj.stderr.on('data', function(data) {
            console.log('**stderr**' + data.toString());
        });
        spawnObj.on('close', function(data) {
            console.log('**close**' + data.toString());
            data == 0 && callback(data);
        });
    } catch(e) {
        console.log(e);
        err(e);
    }
};

cprocess.send = function(res, flag, results) {
    if (flag) {
        res.json({code: 0, data: results, msg: ''});
    } else {
        res.json({code: -1, data: '', msg: results});
    }
    res.end();
};

module.exports = cprocess;
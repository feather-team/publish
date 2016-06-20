var spawn = require('child_process').spawn;

var proc = spawn('git', ['checkout', 'master'], {
    cwd : process.cwd(),
    env: process.env
});

proc.stdout.on('data', function(data){
    console.log('normal', data ? data.toString() : 'empty');
});

proc.stderr.on('data', function(data){
    console.log('err', data ? data.toString() : 'empty');
});

proc.on('close', function(){
    console.log('close');
});
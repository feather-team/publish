var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var _ = require('./lib/util.js');

var app = global.Application = express();
var http = require('http');
var server = http.Server(app);

if(app.get('env') == 'production' && _.exists(__dirname + '/config/pd.js')){
    app.set('config', require('./config/pd.js'));
}else{
    app.set('config', require('./config/dev.js'));
}

// view engine setup
app.set('port', process.env.PORT || 4000);
app.set('views', path.join(__dirname, 'dist/view'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist/static')));

//static combo
var combo = require('combohandler');
app.get('/combo', combo.combine({
    rootPath: __dirname + '/dist/static'
}), combo.respond);

app.use(require('./router.js'));

server.listen(app.get('port'),function(){
    console.log('Express server listening on port ' + app.get('port'));
});

//global mail settings
var Mail = require('./lib/mail.js');
Mail.config(app.get('config').mail);

//全局任务调度
var io = require('socket.io')(server);
var sockets = [];

var Task = require('./lib/task.js');

function noticeAllTasks(){
    var tasks = Task.get();

    sockets.forEach(function(socket){
        socket.emit('task:update', tasks);
    });
}

Task.on('start', noticeAllTasks);
Task.on('close', noticeAllTasks);

io.on('connection', function(socket){
    var id = sockets.push(socket) - 1;

    socket.emit('task:update', Task.get(30));
    socket.on('disconnect', function(){
        sockets.splice(id, 1);
    });
});

var BranchService = require('./service/branch.js'), ReleaseService = require('./service/release.js');

BranchService.clear();
BranchService.updateBranches(BranchService.updateBranches);

var Log = require('./lib/log.js');

//正式环境
if(app.get('env') == 'production'){
    ReleaseService.autoMode = true;

    var time = 1000 * 60 * 60 * 2;
    //gc
    setTimeout(function(){
        Task.gc();
        setTimeout(arguments.callee, time);
    }, time);

    //程序退出或者crash的一些处理
    process.on('uncaughtException', function(err){
        Log.error(err.stack);　　
    });

    process.on('exit', function(){
        Log.warn('process exit!');
    });
}
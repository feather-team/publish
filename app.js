var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var http = require('http');
var server = http.Server(app);

PATH = __dirname;
REPO_PATH = path.resolve(__dirname, 'repos');

// view engine setup
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'static')));

app.use(require('./router.js'));

server.listen(app.get('port'),function(){
    console.log('Express server listening on port ' + app.get('port'));
});

//全局任务调度
var io = require('socket.io')(server);
var sockets = [];

var TaskService = require('./service/task.js');

function noticeAllTaks(){
    var tasks = TaskService.getAll();

    sockets.forEach(function(socket){
        socket.emit('task:update', tasks);
    });
}

TaskService.on('add', noticeAllTaks);
TaskService.on('start', noticeAllTaks);
TaskService.on('close', noticeAllTaks);

io.on('connection', function(socket){
    var id = sockets.push(socket) - 1;

    socket.emit('task:update', TaskService.getAll());
    socket.on('disconnect', function(){
        sockets.splice(id, 1);
    });
});

var RepoService = require('./service/repo.js');

(function(){
    RepoService.updateBranches();
    setTimeout(arguments.callee, 10 * 1000);
})();
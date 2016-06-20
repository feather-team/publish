var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var http = require('http');

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

http.createServer(app).listen(app.get('port'),function(){
    console.log('Express server listening on port ' + app.get('port'));
});

var Task = require('./service/task.js');

Task.on('start', function(task){
    console.log('start', task);
})

Task.on('complete', function(task){
    console.log('complete', task);
});

Task.on('error', function(task){
    console.log('error', task);
});
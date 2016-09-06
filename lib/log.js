function datetime(){
    var date = new Date;
    var str = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    return str.replace(/([-:])(\d)(?=[$\s-:])/g, '$10$2');
}

function log(msg, type){
    console.log('[' + type.toUpperCase() + '] [' + datetime() + '] ' + msg);
}

exports.warn = function(msg){
    log(msg, 'warn');
};

exports.error = function(msg){
    log(msg, 'error');
};

exports.notice = function(msg){
    log(msg, 'notice');
};
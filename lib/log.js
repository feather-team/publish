function log(msg, type){
    console.log('[' + type.toUpperCase() + '] ' + msg);
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
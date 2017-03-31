'use strict';

var fs = require('fs'), path = require('path'), util = require('util');
var log = require('./log.js');
var _ = module.exports;

_.trim = function(str){
    return (str || '').replace(/^\s+/, '').replace(/\s+$/, '');
};

_.unique = function(arr){
    var obj = {};

    arr.forEach(function(item){
        obj[item] = true;
    });

    return Object.keys(obj);
};

_.toArray = function(arr){
    if(arr == null){
        return [];
    }

    if(!Array.isArray(arr)){
        return [arr];
    }

    return arr;
};

_.map = function(obj, callback){
    for(var i in obj){
        callback(obj[i], i);
    }
};

_.extend = function(sub){
    [].slice.call(arguments, 1).forEach(function(_super){
        _.map(_super, function(item, key){
            sub[key] = item;
        });
    });

    return sub;
};

_.exists = fs.existsSync || path.existsSync;

_.read = function(file, encoding){
    if(!_.exists(file)){
        log.warn(util.format('unable to read file[%s]: No such file or directory.', file));
        return false;
    }

    if(!encoding){
        encoding = 'utf8';
    }

    var content = false;

    try{
        content = fs.readFileSync(file, encoding);
    }catch(e){
        log.error(e);
    }

    return content.toString();
};

_.readJson = function(file, encoding){
    var json = _.read(file, encoding);

    if(!json){
        return {};
    }

    return JSON.parse(json);
};

function mkdir(dir, mode){
    if(!_.exists(dir)){
        try{
            fs.mkdirSync(dir, mode);
        }catch(e){
            log.error(e);
        }
    }
}

_.mkdir = function(dir, mode){
    if(_.exists(dir)){
        return true;
    }

    if(typeof mode === 'undefined'){
        //511 === 0777
        mode = 511 & (~process.umask());
    }

    path.normalize(dir).split(path.sep).reduce(function(prev, next){
        prev && mkdir(prev, mode);
        return prev + '/' + next;
    });

    return mkdir(dir);
};

_.write = function(file, data, append, options){
    if(!_.exists(file)){
        _.mkdir(path.dirname(file));
    }

    try{
        if(append){
            fs.appendFileSync(file, data, options);
        }else{
            fs.writeFileSync(file, data, options);
        }
    }catch(e){
        log.error(e);
    }
};

_.writeJson = function(file, data, options){
    if(typeof data == 'object'){
        data = JSON.stringify(data, null, 4);
    }

    _.write(file, data, false, options);
};

_.empty = function(obj){
    if(Array.isArray(obj)) return !obj.length;

    for(var i in obj){
        if(obj.hasOwnProperty(i)){
            return false;
        }
    }

    return true;
};

_.readdir = function(dir, filter){
    var files = fs.readdirSync(dir);

    if(filter){
        if(filter.constructor == RegExp){
            files = files.filter(function(file){
                return filter.test(file);
            });
        }else{
            files = files.filter(function(file){
                return file.indexOf(filter) > -1;
            });
        }
    }

    return files.map(function(file){
        return path.normalize(dir + '/' + file);
    }); 
};

_.datetime = log._datetime;
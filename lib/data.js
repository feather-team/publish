var _ = require('./util.js');
var Data = module.exports = function(file){
    this.file = file;
};

Data.prototype = {
    del: function(key){
        var data = this.get();
        delete data[key];
        _.writeJson(this.file, data);
    },

    update: function(key, info){
        var data = this.get(key) || {};
        data = _.extend(data, info);
        this.save(key, data);
    },

    rewrite: function(data){
        _.writeJson(this.file, data);
    },

    save: function(key, info){
        var data = this.get();

        if(typeof key == 'object'){
            data = _.extend(data, key);
        }else{
            data[key] = info;
        }

        this.rewrite(data);
    },

    get: function(key){
        var data = _.readJson(this.file);

        if(!key){
            return data;
        }

        return data[key];
    },

    truncate: function(){
        _.writeJson(this.file, {});
    }
};
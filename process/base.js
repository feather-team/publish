var child_process = require('child_process');
var _ = require('../lib/util.js');

var Base = module.exports = require('../lib/class.js').create({
    initialize: function(root, opt){
        this.options = _.extend({
            cwd: root
        }, opt);
        this._initialize();
    },

    /**
     * exexute a command with this.name
     * @param  {String}
     * @param  {Object}
     * @return {Boolean}
     */
    exec: function(command, opt){
        return child_process.execSync((this.name ? this.name + ' ' : '') + command + ' ' + (opt || ''), this.options).toString();
    }
});

Base.addNormalExecuteMethod = function(klass, method){
    if(!Array.isArray(method)){
        method = [method];
    }

    method.forEach(function(item){
        klass.prototype[item] = function(opt){
            return this.exec(item, opt);
        };
    });
};
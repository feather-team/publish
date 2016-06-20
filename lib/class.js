'use strict';

exports.create = function(prototype){
    var klass = function(){
        this.initialize && this.initialize.apply(this, arguments);
    };

    klass.prototype = prototype;
    klass.constructor = klass;
    return klass;
};

exports.extend = function(_super, prototype){
    if(typeof _super == 'function'){
        _super = _super.prototype;
    }

    var klass = this.create(prototype);
    klass.prototype.__proto__ = _super;
    return klass;
};
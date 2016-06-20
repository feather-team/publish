var Base = require('./base.js');

var Factory = module.exports = require('../lib/class.js').extend(Base, {
    _initialize: function(){
        this.name = 'git';
    }
});

Base.addNormalExecuteMethod(Factory, ['clone', 'fetch', 'checkout', 'log']);
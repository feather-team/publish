var _ = require('../lib/util.js'); 

module.exports = {
    readdir: function(test){
        console.log(_.readdir(__dirname + '/../lib', 'util'));
        test.done();
    }
};
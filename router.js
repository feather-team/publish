var express = require('express');
var router = express.Router();

var controllers = {};

'main'.split(' ').forEach(function(item){
	controllers[item] = require('./controller/' + item + '.js');
});

router.get('/', controllers.main);
router.get('/user', controllers.main.user);

module.exports = router;
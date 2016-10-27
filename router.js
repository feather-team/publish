var express = require('express');
var router = express.Router();

var controllers = {};

['main','repo','build'].forEach(function(item){
	controllers[item] = require('./controller/' + item + '.js');
});

router.get('/', controllers.build);
router.post('/build/release', controllers.build.release);
router.get('/build/detail', controllers.build.detail);
router.get('/repo', controllers.repo);
router.get('/repo/list', controllers.repo.getList);
router.post('/repo/add', controllers.repo.add);
router.get('/repo/search', controllers.repo.search);
router.post('/repo/del', controllers.repo.del);

module.exports = router;
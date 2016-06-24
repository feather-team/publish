var express = require('express');
var router = express.Router();

var controllers = {};

['main','repo','build'].forEach(function(item){
	controllers[item] = require('./controller/' + item + '.js');
});

router.get('/', controllers.repo);
router.get('/repo', controllers.repo);
router.get('/repo/list', controllers.repo.getList);
router.post('/repo/add', controllers.repo.add);
router.get('/repo/search', controllers.repo.search);

router.get('/build',controllers.build);
//router.get('/fetchRepo',controllers.build.fetchRepo);
router.post('/build/release', controllers.build.release);

module.exports = router;
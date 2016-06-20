var express = require('express');
var router = express.Router();

var controllers = {};

['main','repo','build'].forEach(function(item){
	controllers[item] = require('./controller/' + item + '.js');
});

router.get('/', controllers.main);
router.get('/user', controllers.main.user);
router.get('/repo', controllers.repo);

router.get('/getRepoList',controllers.repo.getRepoList);
router.post('/updateRepoList',controllers.repo.updateRepoList);
router.get('/build',controllers.build);
router.get('/fetchRepo',controllers.build.fetchRepo);
router.post('/releaseRepo',controllers.build.releaseRepo);

module.exports = router;
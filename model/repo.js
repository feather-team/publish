var DB = require('../lib/data.js');

var Repo = module.exports = new DB(__dirname + '/../data/repos.json');

Repo.STATUS = {
    INITIALIZING: 1,
    NORMAL: 2,
    PROCESSING: 3
};
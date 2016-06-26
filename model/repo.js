var DB = require('../lib/data.js');

var Repo = module.exports = new DB(__dirname + '/../data/repos.json');

Repo.STATUS = {
    NORMAL: 1,
    PROCESSING: 2
};
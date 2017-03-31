var StatusService = require('../service/status.js');

exports.get = function(req, res){
    res.send({
        code: 0,
        data: StatusService.get(req.query.repo, req.query.branch || '')
    });
};
var StatusModel = require('../model/status.js');
var _ = require('../lib/util.js');

exports.get = function(repo, branch){
    return StatusModel.get(exports.id(repo, branch)) || {};
};

exports.id = function(repo, branch){
    if(repo.indexOf('@')){
        return repo;
    }else{
        return repo + '@' + branch;
    }
};

exports.save = function(info){
    info.repos.forEach(function(repo){
        var id = exports.id(repo, info.branch);
        var data = StatusModel.get(id);

        if(data && data.time > info.time){
            return ;
        }

        StatusModel.save(id, _.extend({
            datetime: _.datetime(info.time),
            desc: StatusModel.getDesc(info.status)
        }, info));

        console.log(2);
    });
};
var nodemailer = require('nodemailer'), _ = require('./util.js');
// setup e-mail data with unicode symbols

var config = {
    port: 25
};

exports.send = function(opt, callback){
    var options = _.extend({
        from: config.from
    }, opt);

    if(!config.host || !config.auth){
        return false;
    }

    // create reusable transporter object using the default SMTP transport
    var transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        auth: {
            user: config.auth.user,
            pass: config.auth.pass
        }
    });
    
    // send mail with defined transport object
    // transporter.sendMail(options, function(error, info){
    //     if(error){
    //         return Log.error(error);
    //     }

    //     options.response = info.response;
    //     Log.notice('Message sent: ' + JSON.stringify(options));
    // });

    transporter.sendMail(options, callback);
};

exports.config = function(opts){
    _.extend(config, opts || {});
};
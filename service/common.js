module.exports = {
    error: function(msg){
        return {
            code: -1,
            msg: msg
        }
    },

    success: function(data){
        return {
            code: 0,
            data: data
        }
    }
};
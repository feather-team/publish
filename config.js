module.exports = {
    deploy: {
        feather: {
            //分支对应的操作
            '*': 'build'
        },

        feather2: {
            'master': 'online',
            '*': 'offline'
        },

        lothar: {
            'master': 'online',
            '*': 'offline'
        }
    }
};
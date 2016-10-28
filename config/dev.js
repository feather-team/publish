//正式环境，请在该目录下添加pd.js

module.exports = {
    deploy: {
        feather: {
            //分支对应的操作
            '*': 'build'
        },

        feather2: {
            '*': 'build'
        },

        lothar: {
            '*': 'build'
        }
    },

    mail: {
        host: '',
        from: '',
        auth: {
            user: '',
            pass: ''
        }
    }
};
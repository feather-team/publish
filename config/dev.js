//正式环境，请在该目录下添加pd.js

module.exports = {
    deploy: {
        feather: {
            //分支对应的操作
            '*': 'build'
        },

        feather2: {
            '*': 'offline',
            'master': 'build'
        },

        lothar: {
            '*': 'build',
            'test-remote': 'ftp'
        }
    },

    listen: ['master', 'hotfix*', 'test-remote'],
    ignore: ['test-remote'],

    mail: {
        host: '',
        from: '',
        auth: {
            user: '',
            pass: ''
        }
    }
};
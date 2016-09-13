module.exports = {
    from: '/static',
    to: '远程目录',
    subOnly: true,
    receiver: 'http://www.abc.com/receiver.php',   //可再github上自行下载
    replace: {
        from: '域名A',
        to: '域名B'
    }
};
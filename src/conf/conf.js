feather.config.merge({
    project: {
        charset: 'utf-8'
    },
    
    statics: '/static',
    template: {
        suffix: 'ejs'
    }
});

feather.config.set('autoPack.type', 'combo');
feather.config.set('autoPack.options.syntax', ['combo?', '&']);
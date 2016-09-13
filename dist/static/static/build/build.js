define('static/build/build.js', function(require, exports, module){
var Vue = require('components/vue/vue.js');
require('components/vue-resource/vue-resource.js');

new Vue({
    el: '#build',
    data: {
        isLoading: false,
        release_btn: '编译',
        search_btn: '查找',
        hasRepo : false,
        repos : [],
        reposNames: [],
        hasResult: false,
        releaseResult: ''
    },
    methods: {
        fetchRepo: function(){
            var branch_name = this.branch_name;
            if( this.isLoading ) return false;
            this.$set('isLoading',true);
            this.$set('search_btn','Loading...');
            this.$http.get('/repo/search',{branch: branch_name}).then(function(res){
                return res.json();
            }).then(function(data){
                this.$set('isLoading',false);
                this.$set('search_btn','查找');
                if(data.code == 0){
                    this.$set('repos', []);
                    this.$set('reposNames', []);
                    this.$set('hasRepo',true);
                    this.$set('repos',data.data); 

                    if(data.data.length){
                        this.$set('show_btn', true);
                    }else{
                        this.$set('show_btn', false);
                    }
                }else{
                    this.$set('show_errmsg', true);
                    this.$set('repo_errmsg', data.msg);
                }
            }); 
        },
        releaseRepo: function(){
            if( this.isLoading ) return false;
            this.$set('isLoading',true);
            this.$set('release_btn','Loading...');
            this.$set('show_errmsg', false);
            this.$http.post('/build/release',{
                reposNames : this.reposNames,
                fetchName : this.branch_name
            }).then(function(res){
                return res.json();
            }).then(function(data){
                this.$set('isLoading',false);
                this.$set('release_btn','编译');
                if( data.code != 0 ){
                    this.$set('show_errmsg', true);
                    this.$set('repo_errmsg', res.data.msg);
                }
            });
        }
    }
});
});
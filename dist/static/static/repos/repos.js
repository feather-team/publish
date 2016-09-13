define('static/repos/repos.js', function(require, exports, module){
var Vue = require('components/vue/vue.js');
var TasksView = require('widget/tasks/tasks.js');

require('components/vue-resource/vue-resource.js');

module.exports = new Vue({
    el : '#addRepo',
    data : {
        isLoading: false,
        repo_btn: '添加',
        show_errmsg : false,
        repo_errmsg : '',
        repo_address : '',
        groups : {}
    },
    ready : function(){
        var self = this;

        self.fetchRepos();   

        TasksView.$on('update', function(){
            self.fetchRepos();
        });
    },
    methods : {
        fetchRepos : function(){
            this.$http.get('/repo/list').then(function(res){
                return res.json();
            }).then(function(data){
                if(data.code == 0){
                    this.$set('groups', data.data);
                }else{
                    alert(res.message || '未知错误');
                }
            });
        },
        addRepo : function(){
            if(this.repo_address){ //add rule
                if( this.isLoading ) return false;
                this.$set('isLoading',true);
                this.$set('repo_btn','Loading...');
                this.$http.post('/repo/add', { 
                    address: this.repo_address
                }).then(function(res){
                    return res.json();
                }).then(function(data){
                    this.$set('isLoading',false);
                    this.$set('repo_btn','添加');
                    if( data.code == 0 ){
                        this.fetchRepos();
                        this.$set('show_errmsg', false);
                    }else{
                        this.$set('show_errmsg',true);
                        this.$set('repo_errmsg',data.msg);
                    }
                });
            }
        },
        delRepo: function(event){
            var factory = event.target.getAttribute('data-repo');

            if(confirm('确定删除仓库' + factory + '?')){
                this.$http.post('/repo/del', {
                    repo: factory
                }).then(function(res){
                    return res.json();
                }).then(function(data){
                    if(data.code == 0){
                        this.fetchRepos();
                    }else{
                        alert(data.msg);
                    }
                });
            }
        }
    }
});
});
var Vue = require('vue');
var TasksView = require('widget/tasks/tasks');
var $ = require('jquery');
require('bootstrap')

require('vue-resource');

module.exports = new Vue({
    el : '#repo-container',
    data : {
        column: 3,
        row: 5,
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
                    this.organizeRepos(data.data);
                }else{
                    alert(res.message || '未知错误');
                }
            });
        },
        organizeRepos: function(groups){
            var tempcount = 0, reposLen = 0,
                count = Object.keys(groups).length;
            var left = count%(this.column);

            for( var group in groups){

                groups[group].class = 'col-md-'+ parseInt(12/this.column);
                for( var j=1; j<=left; j++){
                    if( tempcount == count-j ){
                        groups[group].class = 'col-md-' + parseInt(12/left);   
                        break;
                    }
                } 

                reposLen = Object.keys(groups[group].repos).length;
                if( reposLen < this.row ){
                    for(var i=(this.row - reposLen); i > 0; i--){
                       groups[group].repos['...'+i] = {
                            "id": "hf-dev-1/...",
                            "group": "hf-dev-1",
                            "name": "...",
                            "repo": true
                       }; 
                    }
                }

                tempcount++;
            }
            
            this.$set('groups',groups);
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
        setDelRepo: function(event){
            $('#del-modal-submit').attr('data-repo', event.target.getAttribute('data-repo'));
        },
        delRepo: function(event){
            var factory = event.target.getAttribute('data-repo');

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
});
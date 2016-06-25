var RepoView = new Vue({
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
        this.fetchRepos();    
    },
    methods : {
        fetchRepos : function(){
            this.$http({url: '/repo/list',method: 'GET'}).then(function(res){
                if(res.data.code == 0){
                    this.$set('groups',res.data.data);
                }else{
                    alert(res.message);
                }
            },function(res){
                console.log(res);   
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
                    this.$set('isLoading',false);
                    this.$set('repo_btn','添加');
                    if( res.data.code == 0 ){
                        this.fetchRepos();
                        this.$set('show_errmsg', false);
                    }else{
                        this.$set('show_errmsg',true);
                        this.$set('repo_errmsg',res.data.msg);
                        console.log(res.data.msg);
                    }
                },function(res){
                    // handle error
                    console.log(res); 
                });
            }
        }
    }
});
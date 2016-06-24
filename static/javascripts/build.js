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
                this.$set('isLoading',false);
                this.$set('search_btn','查找');
                if(res.data.code == 0){
                    this.$set('hasRepo',true);
                    this.$set('repos',res.data.data);   
                }else{
                    alert(res.data.message);
                }
            });   
        },
        releaseRepo: function(){
            if( this.isLoading ) return false;
            this.$set('isLoading',true);
            this.$set('release_btn','Loading...');
            this.$http.post('/build/release',{
                reposNames : this.reposNames,
                fetchName : this.branch_name
            }).then(function(res){
                this.$set('isLoading',false);
                this.$set('search_btn','编译');
                if( res.data.code == 0 ){

                }else{
                    console.log('repos_names:'+this.reposNames);
                    this.$set('hasResult',true);
                    this.$set('releaseResult',res.data.msg);
                }
            });
        }
    }
});
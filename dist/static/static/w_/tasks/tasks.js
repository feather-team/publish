define('widget/tasks/tasks.js', function(require, exports, module){
var Vue = require('components/vue/vue.js'), IO = require('components/socket.io-client/socket.io.js');
var $ = require('components/jquery/jquery.js');
require('components/bootstrap/js/bootstrap.js');

return new Vue({
    el : '#tasks-wraper',

    data: {
        STATUS_CLASSNAME: {
            'processing': 'info',
            'error': 'danger',
            'success': 'success'
        },

        STATUS_TXT: {
            'processing': '调度中',
            'error': '失败',
            'success': '成功'
        },

        manual: false,
        hidden: true
    },
    
    ready: function(){
        var self = this, tid;

        self.io = IO.connect('/').on('task:update', function(tasks){
            clearTimeout(tid);

            tasks = tasks.map(function(task){
                if(task.status){
                    task.className = self.STATUS_CLASSNAME[task.status];
                    task.text = self.STATUS_TXT[task.status];
                }else{
                    task.className = 'info';
                    task.text = '等待调度';
                }

                task.msg = (task.msg || '').replace(/[\r\n]/g, '<br />');
                task.errorMsg = (task.errorMsg || '').replace(/[\r\n]/g, '<br />');

                var startTime = new Date;
                startTime.setTime(task.startTime);
                task.startTime = startTime.toString();

                var closeTime = new Date;
                closeTime.setTime(task.closeTime);
                task.closeTime = closeTime.toString();

                return task;
            });

            self.$set('tasks', tasks);

            if(tasks.length){
                self.show();
                self.$emit('update');

                tid = setTimeout(function(){
                    !self.manual && self.hide();
                }, 5000);
            }
        });
    },

    methods: {
        toggle: function(){
            if(this.$get('hidden')){
                this.show();
                this.$set('manual', true);
            }else{
                this.hide();
                this.$set('manual', false);
            }
        },  

        show: function(){
            this.$set('hidden', false);
        },
        hide: function(){
            this.$set('hidden', true);
        },

        showDetail: function(event){
            var id = event.target.getAttribute('data-id');
            this.$http.get('/build/detail?id=' + id).then(function(res){
                return res.json();
            }).then(function(data){
                this.$set('exec_detail', data.data);
                this.$set('status', event.target.getAttribute('data-status'));
                $('#task-info-modal').modal('show');
            });
        }
    }
});
});
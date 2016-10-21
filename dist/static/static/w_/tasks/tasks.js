define('widget/tasks/tasks.js', function(require, exports, module){
var Vue = require('components/vue/vue.js'), IO = require('components/socket.io-client/socket.io.js');

return new Vue({
    el : '#tasks-wraper',

    data: {
        STATUS_CLASSNAME: {
            'warning': 'warning',
            'processing': 'info',
            'error': 'danger',
            'success': 'success'
        },

        STATUS_TXT: {
            'warning': '警告',
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

                if(task.status == 'error'){
                    task.showError = true;
                }else if(task.status == 'success'){
                    task.showSuccess = true;
                }else if(task.status == 'warning'){
                    task.showWarning = true;
                }

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
        }
    }
});
});
var TaskView = new Vue({
    el : '#tasks',

    data: {
        STATUS_CLASSNAME: {
            'processing': 'warning',
            'error': 'danger',
            'success': 'success'
        },

        STATUS_TXT: {
            'processing': '调度中',
            'error': '失败',
            'success': '成功'
        }
    },
    
    ready: function(){
        var self = this, tid, sd = false;

        $('#tasks-wraper .panel-heading').click(function(){
            $('#tasks-wraper .panel-body').toggle(function(){
                if($(this).is(':visible')){
                    sd = true;
                }else{
                    sd = false;
                }
            });
        });

        $('#tasks-wraper .panel-body').slideUp();

        self.io = io.connect('/').on('task:update', function(tasks){
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
                }

                return task;
            });

            console.log(tasks);

            self.$set('tasks', tasks);
            $('#tasks-wraper .panel-body').slideDown();
            ('RepoView' in window) && RepoView.fetchRepos();

            tid = setTimeout(function(){
                !sd && $('#tasks-wraper .panel-body').slideUp();
            }, 5000);
        });
    }
});
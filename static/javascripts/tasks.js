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
        var self = this, tid;

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

                return task;
            });

            self.$set('tasks', tasks);
            $('#tasks-wraper').slideDown();
            RepoView.fetchRepos();

            tid = setTimeout(function(){
                $('#tasks-wraper').slideUp();
            }, 5000);
        });
    }
});
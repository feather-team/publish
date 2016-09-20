define("widget/tasks/tasks.js",function(s){var e=s("components/vue/vue.js"),t=s("components/socket.io-client/socket.io.js");return new e({el:"#tasks-wraper",data:{STATUS_CLASSNAME:{processing:"warning",error:"danger",success:"success"},STATUS_TXT:{processing:"调度中",error:"失败",success:"成功"},manual:!1,hidden:!0},ready:function(){var s,e=this;e.io=t.connect("/").on("task:update",function(t){clearTimeout(s),t=t.map(function(s){s.status?(s.className=e.STATUS_CLASSNAME[s.status],s.text=e.STATUS_TXT[s.status]):(s.className="info",s.text="等待调度"),s.msg=(s.msg||"").replace(/[\r\n]/g,"<br />"),"error"==s.status?s.showError=!0:"success"==s.status&&(s.showSuccess=!0);var t=new Date;t.setTime(s.startTime),s.startTime=t.toString();var n=new Date;return n.setTime(s.closeTime),s.closeTime=n.toString(),s}),e.$set("tasks",t),t.length&&(e.show(),e.$emit("update"),s=setTimeout(function(){!e.manual&&e.hide()},5e3))})},methods:{toggle:function(){this.$get("hidden")?(this.show(),this.$set("manual",!0)):(this.hide(),this.$set("manual",!1))},show:function(){this.$set("hidden",!1)},hide:function(){this.$set("hidden",!0)}}})});
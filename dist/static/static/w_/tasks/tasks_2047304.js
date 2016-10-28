define("widget/tasks/tasks.js",function(t){var e=t("components/vue/vue.js"),s=t("components/socket.io-client/socket.io.js"),n=t("components/jquery/jquery.js");return t("components/bootstrap/js/bootstrap.js"),new e({el:"#tasks-wraper",data:{STATUS_CLASSNAME:{processing:"info",error:"danger",success:"success"},STATUS_TXT:{processing:"调度中",error:"失败",success:"成功"},manual:!1,hidden:!0},ready:function(){var t,e=this;e.io=s.connect("/").on("task:update",function(s){clearTimeout(t),s=s.map(function(t){t.status?(t.className=e.STATUS_CLASSNAME[t.status],t.text=e.STATUS_TXT[t.status]):(t.className="info",t.text="等待调度"),t.msg=(t.msg||"").replace(/[\r\n]/g,"<br />");var s=new Date;s.setTime(t.startTime),t.startTime=s.toString();var n=new Date;return n.setTime(t.closeTime),t.closeTime=n.toString(),t}),e.$set("tasks",s),s.length&&(e.show(),e.$emit("update"),t=setTimeout(function(){!e.manual&&e.hide()},5e3))})},methods:{toggle:function(){this.$get("hidden")?(this.show(),this.$set("manual",!0)):(this.hide(),this.$set("manual",!1))},show:function(){this.$set("hidden",!1)},hide:function(){this.$set("hidden",!0)},showDetail:function(t){var e=t.target.getAttribute("data-id");this.$http.get("/build/detail?id="+e).then(function(t){return t.json()}).then(function(t){this.$set("exec_detail",t.data),n("#task-info-modal").modal("show")})}}})});
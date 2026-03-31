/* NEXUS-CSOPS v4.2.0 — screens4.js */
function AuditLogPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState(""),search=_3[0],setSearch=_3[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("audit_log").select("*,actor:employees!actor_id(full_name,role)").order("created_at",{ascending:false}).limit(100)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load audit log","error")})
    .finally(function(){setLoading(false)});
  }
  var filtered=items.filter(function(x){
    return !search||
      (x.action&&x.action.toLowerCase().indexOf(search.toLowerCase())>-1)||
      (x.details&&x.details.toLowerCase().indexOf(search.toLowerCase())>-1);
  });
  if(loading)return React.createElement(LoadingPage,{message:"Loading Audit Log..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Audit Log",icon:"📋",subtitle:items.length+" entries"}),
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement(SearchInput,{value:search,onChange:setSearch,placeholder:"Search actions..."})
    ),
    filtered.length===0?React.createElement(EmptyState,{icon:"📋",title:"No audit entries"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      filtered.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:12}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("span",{style:{fontWeight:700,fontSize:13,color:"var(--primary)"}},item.action),
              item.details&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:2}},item.details)
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}},
              item.actor&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)"}},item.actor.full_name),
                React.createElement(RoleBadge,{role:item.actor.role})
              ),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap"}},fmtRelative(item.created_at))
            )
          )
        );
      })
    )
  );
}

function ReportsNotesPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState(false),showForm=_3[0],setShowForm=_3[1];
  var _4=React.useState({action:"",details:""}),form=_4[0],setForm=_4[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("audit_log").select("*,actor:employees!actor_id(full_name,role)").order("created_at",{ascending:false}).limit(50)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.action){showToast("Title required","warning");return}
    withRetry(function(){return sb.from("audit_log").insert({action:form.action,details:form.details||null,actor_id:user.id})})
    .then(function(){showToast("Note added ✅","success");setShowForm(false);setForm({action:"",details:""});load()})
    .catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Reports..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Reports & Notes",icon:"📄",subtitle:"Team reports and notes",
      actions:React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"✕ Cancel":"+ Add Note")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("input",{className:"nx-input",placeholder:"Report title...",value:form.action,onChange:function(e){setForm(function(f){return Object.assign({},f,{action:e.target.value})})}}),
        React.createElement("textarea",{className:"nx-input",placeholder:"Details...",rows:3,value:form.details,onChange:function(e){setForm(function(f){return Object.assign({},f,{details:e.target.value})})}}),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Add Report")
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"📄",title:"No reports yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13}},item.action),
              item.details&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4,lineHeight:1.6}},item.details)
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              item.actor&&React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)"}},item.actor.full_name),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap"}},fmtRelative(item.created_at))
            )
          )
        );
      })
    )
  );
}

function BreakManagementPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var todayStr=new Date().toISOString().split("T")[0];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("breaks").select("*,employee:employees(full_name,role,avatar_url)").eq("date",todayStr).order("created_at",{ascending:false})})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load","error")})
    .finally(function(){setLoading(false)});
  }
  React.useEffect(function(){ChannelMgr.sub("brkmgmt","breaks",null,load);return function(){ChannelMgr.unsub("brkmgmt")}},[]);
  function endBreak(id){
    withRetry(function(){return sb.from("breaks").update({end_time:new Date().toISOString(),status:"completed"}).eq("id",id)})
    .then(function(){showToast("Break ended ✅","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  var active=items.filter(function(b){return !b.end_time});
  var completed=items.filter(function(b){return b.end_time});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Break Management..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Break Management",icon:"⏱️",subtitle:active.length+" active breaks today"}),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [{label:"Total Today",value:items.length,icon:"☕",color:"var(--primary)"},
       {label:"Active",value:active.length,icon:"🟢",color:"#22C55E"},
       {label:"Completed",value:completed.length,icon:"✅",color:"#3B82F6"},
       {label:"Exceeded",value:items.filter(function(b){return b.status==="exceeded"}).length,icon:"⚠️",color:"#EAB308"}]
      .map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},
            React.createElement("span",{className:"nx-stat-label"},s.label),
            React.createElement("span",null,s.icon)
          ),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ),
    items.length===0?React.createElement(EmptyState,{icon:"☕",title:"No breaks today"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(b){
        return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
              React.createElement(NxAvatar,{user:b.employee,size:"sm"}),
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},(b.employee&&b.employee.full_name)||"—"),
                React.createElement(RoleBadge,{role:b.employee&&b.employee.role})
              )
            ),
            React.createElement("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
              React.createElement("span",{style:{fontSize:12,color:"var(--text-sub)"}},fmtTime(b.start_time)+" → "+(b.end_time?fmtTime(b.end_time):"Active")),
              React.createElement(StatusBadge,{status:b.end_time?"completed":"active"}),
              !b.end_time&&RC.isMgr(user)&&React.createElement("button",{className:"nx-btn nx-btn-secondary nx-btn-sm",onClick:function(){endBreak(b.id)}},"End Break")
            )
          )
        );
      })
    )
  );
}

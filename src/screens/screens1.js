function UpdatesFeedPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("announcements").select("*,author:employees(full_name,role)").eq("is_active",true).order("created_at",{ascending:false}).limit(50)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load","error")})
    .finally(function(){setLoading(false)});
  }
  React.useEffect(function(){
    ChannelMgr.sub("feed","announcements",null,load);
    return function(){ChannelMgr.unsub("feed")};
  },[]);
  if(loading)return React.createElement(LoadingPage,{message:"Loading Updates Feed..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Updates Feed",icon:"📢",subtitle:fmtDate(new Date().toISOString())}),
    items.length===0?React.createElement(EmptyState,{icon:"?",title:"No updates yet",desc:"Announcements will appear here"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:16}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card nx-card-enter",style:{padding:20}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,gap:12}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement(PriorityBadge,{priority:item.priority||"medium"}),
              React.createElement("span",{style:{fontSize:15,fontWeight:700,color:"var(--text)"}},item.title)
            ),
            React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}},fmtRelative(item.created_at))
          ),
          item.body&&React.createElement("p",{style:{fontSize:13,color:"var(--text-sub)",lineHeight:1.7,marginBottom:12}},item.body),
          item.author&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
            React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)"}},"By "+(item.author.full_name||"--")),
            React.createElement(RoleBadge,{role:item.author.role})
          )
        );
      })
    )
  );
}
function AnnouncementsPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({title:"",body:"",priority:"medium"});var form=_4[0];var setForm=_4[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("announcements").select("*,author:employees(full_name,role)").order("created_at",{ascending:false})})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.title){showToast("Title required","warning");return}
    withRetry(function(){return sb.from("announcements").insert({title:form.title,body:form.body||null,priority:form.priority,author_id:user.id,is_active:true})})
    .then(function(){showToast("Posted","success");setShowForm(false);setForm({title:"",body:"",priority:"medium"});load()})
    .catch(function(){showToast("Failed","error")});
  }
  function del(id){
    withRetry(function(){return sb.from("announcements").delete().eq("id",id)})
    .then(function(){showToast("Deleted","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Announcements..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Announcements",icon:"📣",subtitle:items.length+" total",
      actions:RC.isMgr(user)?React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"Cancel":"+ New"):null}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:20}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("input",{className:"nx-input",placeholder:"Title...",value:form.title,onChange:function(e){setForm(function(f){return Object.assign({},f,{title:e.target.value})})}}),
        React.createElement("textarea",{className:"nx-input",placeholder:"Details...",rows:3,value:form.body,onChange:function(e){setForm(function(f){return Object.assign({},f,{body:e.target.value})})}}),
        React.createElement("select",{className:"nx-input",value:form.priority,onChange:function(e){setForm(function(f){return Object.assign({},f,{priority:e.target.value})})}},
          React.createElement("option",{value:"low"},"Low"),
          React.createElement("option",{value:"medium"},"Medium"),
          React.createElement("option",{value:"high"},"High"),
          React.createElement("option",{value:"critical"},"Critical")
        ),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Post")
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"?",title:"No announcements"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},
                React.createElement(PriorityBadge,{priority:item.priority}),
                React.createElement("span",{style:{fontSize:14,fontWeight:700}},item.title)
              ),
              item.body&&React.createElement("p",{style:{fontSize:13,color:"var(--text-sub)",lineHeight:1.6}},item.body),
              React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)",marginTop:8}},fmtRelative(item.created_at))
            ),
            RC.isMgr(user)&&React.createElement("button",{className:"nx-btn nx-btn-danger nx-btn-sm",onClick:function(){del(item.id)}},"Del")
          )
        );
      })
    )
  );
}
function SchedulePage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("schedules").select("*").eq("employee_id",user.id).order("date",{ascending:true}).limit(30)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Schedule..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Schedule",icon:"📅",subtitle:"Your upcoming shifts"}),
    items.length===0?React.createElement(EmptyState,{icon:"?",title:"No schedule",desc:"Your schedule will appear here"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card nx-card-enter",style:{padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontWeight:700,fontSize:14,color:"var(--text)"}},fmtDate(item.date)),
            item.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:2}},item.notes)
          ),
          item.day_off
            ?React.createElement("span",{style:{color:"#22C55E",fontSize:13,fontWeight:700}},"Day Off")
            :React.createElement("span",{style:{fontSize:13,color:"var(--text-sub)",fontWeight:600}},(item.shift_start||"--")+" to "+(item.shift_end||"--"))
        );
      })
    )
  );
}
function AttendancePage(p){
  var user=p.user;
  var todayStr=new Date().toISOString().split("T")[0];
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(null);var today=_3[0];var setToday=_3[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("attendance").select("*").eq("employee_id",user.id).order("date",{ascending:false}).limit(30)})
    .then(function(r){
      var rows=r.data||[];
      setItems(rows);
      setToday(rows.find(function(x){return x.date===todayStr})||null);
    })
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setLoading(false)});
  }
  function checkIn(){
    withRetry(function(){return sb.from("attendance").insert({employee_id:user.id,date:todayStr,check_in:new Date().toISOString(),status:"on_time"})})
    .then(function(){showToast("Checked in","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  function checkOut(){
    if(!today)return;
    withRetry(function(){return sb.from("attendance").update({check_out:new Date().toISOString()}).eq("id",today.id)})
    .then(function(){showToast("Checked out","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Attendance..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Attendance",icon:"✅",subtitle:"Track your attendance"}),
    React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:20}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,color:"var(--text-muted)"}},"Today: "+fmtDate(todayStr)),
          React.createElement("div",{style:{fontSize:15,fontWeight:700,marginTop:4,color:"var(--text)"}},
            today?(today.check_in?"In: "+fmtTime(today.check_in)+(today.check_out?" Out: "+fmtTime(today.check_out):" Working"):"Not checked in"):"Not checked in"
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:8}},
          !today&&React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:checkIn},"Check In"),
          today&&!today.check_out&&React.createElement("button",{className:"nx-btn nx-btn-secondary nx-btn-sm",onClick:checkOut},"Check Out")
        )
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"?",title:"No records"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
          React.createElement("span",{style:{fontWeight:600,fontSize:13}},fmtDate(item.date)),
          React.createElement("div",{style:{display:"flex",gap:10,fontSize:12,alignItems:"center",flexWrap:"wrap"}},
            React.createElement("span",{style:{color:"var(--text-sub)"}},item.check_in?"In: "+fmtTime(item.check_in):"--"),
            React.createElement("span",{style:{color:"var(--text-sub)"}},item.check_out?"Out: "+fmtTime(item.check_out):"--"),
            React.createElement(StatusBadge,{status:item.status||"unknown"})
          )
        );
      })
    )
  );
}
function LiveFloorPage(p){
  var user=p.user;
  var _1=React.useState([]);var emps=_1[0];var setEmps=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("");var search=_3[0];var setSearch=_3[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("employees").select("*").eq("is_active",true).order("full_name")})
    .then(function(r){setEmps(r.data||[])})
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setLoading(false)});
  }
  React.useEffect(function(){
    ChannelMgr.sub("floor","employees",null,load);
    return function(){ChannelMgr.unsub("floor")};
  },[]);
  var filtered=emps.filter(function(e){
    return !search||e.full_name.toLowerCase().indexOf(search.toLowerCase())>-1||(e.role||"").toLowerCase().indexOf(search.toLowerCase())>-1;
  });
  var online=emps.filter(function(e){return e.is_online}).length;
  if(loading)return React.createElement(LoadingPage,{message:"Loading Live Floor..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Live Floor",icon:"🖥️",subtitle:online+" online"}),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [{label:"Total",value:emps.length,color:"var(--primary)"},
       {label:"Online",value:online,color:"#22C55E"},
       {label:"Offline",value:emps.length-online,color:"#6B7280"},
       {label:"On Break",value:emps.filter(function(e){return e.status==="onbreak"}).length,color:"#EAB308"}]
      .map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ),
    React.createElement(SearchInput,{value:search,onChange:setSearch,placeholder:"Search employees..."}),
    React.createElement("div",{className:"nx-grid-3",style:{marginTop:16}},
      filtered.map(function(emp){
        return React.createElement("div",{key:emp.id,className:"nx-card nx-card-enter",style:{padding:16}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10}},
            React.createElement(NxAvatar,{user:emp,size:"md"}),
            React.createElement("div",{style:{flex:1,minWidth:0}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},emp.full_name),
              React.createElement(RoleBadge,{role:emp.role})
            ),
            React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:emp.is_online?"#22C55E":"#6B7280",flexShrink:0}})
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement(StatusBadge,{status:emp.status||"offline"}),
            React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)"}},fmtRelative(emp.last_seen))
          )
        );
      })
    )
  );
}

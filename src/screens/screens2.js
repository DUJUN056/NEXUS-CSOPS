/* NEXUS-CSOPS v4.2.0 — screens2.js */
function MyBreakSchedulePage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("breaks").select("*").eq("employee_id",user.id).order("created_at",{ascending:false}).limit(30)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function startBreak(){
    withRetry(function(){return sb.from("breaks").insert({employee_id:user.id,date:new Date().toISOString().split("T")[0],start_time:new Date().toISOString(),type:"break",status:"active"})})
    .then(function(){showToast("Break started ☕","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  function endBreak(id){
    withRetry(function(){return sb.from("breaks").update({end_time:new Date().toISOString(),status:"completed"}).eq("id",id)})
    .then(function(){showToast("Break ended ✅","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  var active=items.find(function(b){return !b.end_time});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Breaks..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Breaks",icon:"☕",subtitle:"Break management",
      actions:!active
        ?React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:startBreak},"☕ Start Break")
        :React.createElement("button",{className:"nx-btn nx-btn-secondary nx-btn-sm",onClick:function(){endBreak(active.id)}},"✅ End Break")}),
    active&&React.createElement("div",{className:"nx-card",style:{padding:16,marginBottom:16,borderColor:"var(--warning)"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
        React.createElement("span",{style:{fontSize:20}},"☕"),
        React.createElement("div",null,
          React.createElement("div",{style:{fontWeight:700,color:"var(--warning)"}},"Break in progress"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)"}},fmtTime(active.start_time))
        )
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"☕",title:"No breaks yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(b){
        return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
          React.createElement("span",{style:{fontSize:13,fontWeight:600}},fmtDate(b.date)),
          React.createElement("div",{style:{display:"flex",gap:10,fontSize:12,alignItems:"center"}},
            React.createElement("span",{style:{color:"var(--text-sub)"}},fmtTime(b.start_time)),
            React.createElement("span",{style:{color:"var(--text-muted)"}},"→"),
            React.createElement("span",{style:{color:"var(--text-sub)"}},b.end_time?fmtTime(b.end_time):"Active"),
            React.createElement(StatusBadge,{status:b.status||"active"})
          )
        );
      })
    )
  );
}

function MyRequestsPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState(false),showForm=_3[0],setShowForm=_3[1];
  var _4=React.useState({type:"leave",details:""}),form=_4[0],setForm=_4[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("requests").select("*").eq("employee_id",user.id).order("created_at",{ascending:false})})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.details){showToast("Details required","warning");return}
    withRetry(function(){return sb.from("requests").insert({employee_id:user.id,type:form.type,details:form.details,status:"pending"})})
    .then(function(){showToast("Request submitted ✅","success");setShowForm(false);setForm({type:"leave",details:""});load()})
    .catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Requests..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Requests",icon:"📋",subtitle:items.length+" requests",
      actions:React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"✕ Cancel":"+ New Request")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{className:"nx-input",value:form.type,onChange:function(e){setForm(function(f){return Object.assign({},f,{type:e.target.value})})}},
          React.createElement("option",{value:"leave"},"Leave"),
          React.createElement("option",{value:"wfh"},"WFH"),
          React.createElement("option",{value:"swap"},"Shift Swap"),
          React.createElement("option",{value:"other"},"Other")
        ),
        React.createElement("textarea",{className:"nx-input",placeholder:"Details...",rows:3,value:form.details,onChange:function(e){setForm(function(f){return Object.assign({},f,{details:e.target.value})})}}),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit Request")
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"📋",title:"No requests yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("span",{style:{fontWeight:700,fontSize:13,textTransform:"capitalize"}},item.type),
              React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.details)
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              React.createElement(StatusBadge,{status:item.status}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)"}},fmtRelative(item.created_at))
            )
          )
        );
      })
    )
  );
}

function ShiftHandoverPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState(false),showForm=_3[0],setShowForm=_3[1];
  var _4=React.useState({to_id:"",notes:""}),form=_4[0],setForm=_4[1];
  var _5=React.useState([]),emps=_5[0],setEmps=_5[1];
  React.useEffect(function(){load();loadEmps()},[]);
  function load(){
    withRetry(function(){return sb.from("handovers").select("*,from:employees!from_id(full_name),to:employees!to_id(full_name)").eq("type","shift").order("created_at",{ascending:false}).limit(20)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function loadEmps(){
    withRetry(function(){return sb.from("employees").select("id,full_name").eq("is_active",true).neq("id",user.id)})
    .then(function(r){setEmps(r.data||[])})
    .catch(function(){});
  }
  function submit(){
    if(!form.to_id){showToast("Select a recipient","warning");return}
    withRetry(function(){return sb.from("handovers").insert({from_id:user.id,to_id:form.to_id,type:"shift",notes:form.notes,status:"pending"})})
    .then(function(){showToast("Handover submitted ✅","success");setShowForm(false);setForm({to_id:"",notes:""});load()})
    .catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Handovers..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Shift Handover",icon:"🔄",subtitle:"Shift transitions",
      actions:React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"✕ Cancel":"+ New Handover")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{className:"nx-input",value:form.to_id,onChange:function(e){setForm(function(f){return Object.assign({},f,{to_id:e.target.value})})}},
          React.createElement("option",{value:""},"Select recipient..."),
          emps.map(function(e){return React.createElement("option",{key:e.id,value:e.id},e.full_name)})
        ),
        React.createElement("textarea",{className:"nx-input",placeholder:"Handover notes...",rows:3,value:form.notes,onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}}),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit Handover")
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"🔄",title:"No handovers yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:700}},(item.from&&item.from.full_name)||"—"," → ",(item.to&&item.to.full_name)||"—"),
              item.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.notes)
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              React.createElement(StatusBadge,{status:item.status}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)"}},fmtRelative(item.created_at))
            )
          )
        );
      })
    )
  );
}

function CaseHandoverPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState(false),showForm=_3[0],setShowForm=_3[1];
  var _4=React.useState({to_id:"",notes:""}),form=_4[0],setForm=_4[1];
  var _5=React.useState([]),emps=_5[0],setEmps=_5[1];
  React.useEffect(function(){load();loadEmps()},[]);
  function load(){
    withRetry(function(){return sb.from("handovers").select("*,from:employees!from_id(full_name),to:employees!to_id(full_name)").eq("type","case").order("created_at",{ascending:false}).limit(20)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function loadEmps(){
    withRetry(function(){return sb.from("employees").select("id,full_name").eq("is_active",true).neq("id",user.id)})
    .then(function(r){setEmps(r.data||[])})
    .catch(function(){});
  }
  function submit(){
    if(!form.to_id){showToast("Select a recipient","warning");return}
    withRetry(function(){return sb.from("handovers").insert({from_id:user.id,to_id:form.to_id,type:"case",notes:form.notes,status:"pending"})})
    .then(function(){showToast("Case handover submitted ✅","success");setShowForm(false);setForm({to_id:"",notes:""});load()})
    .catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Case Handovers..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Case Handover",icon:"📁",subtitle:"Case transitions",
      actions:React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"✕ Cancel":"+ New Case Handover")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{className:"nx-input",value:form.to_id,onChange:function(e){setForm(function(f){return Object.assign({},f,{to_id:e.target.value})})}},
          React.createElement("option",{value:""},"Select recipient..."),
          emps.map(function(e){return React.createElement("option",{key:e.id,value:e.id},e.full_name)})
        ),
        React.createElement("textarea",{className:"nx-input",placeholder:"Case details...",rows:4,value:form.notes,onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}}),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit Case Handover")
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"📁",title:"No case handovers yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:700}},(item.from&&item.from.full_name)||"—"," → ",(item.to&&item.to.full_name)||"—"),
              item.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.notes)
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              React.createElement(StatusBadge,{status:item.status}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)"}},fmtRelative(item.created_at))
            )
          )
        );
      })
    )
  );
}

function TTTrackerPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState(false),showForm=_3[0],setShowForm=_3[1];
  var _4=React.useState({title:"",description:"",priority:"medium"}),form=_4[0],setForm=_4[1];
  var _5=React.useState("all"),filter=_5[0],setFilter=_5[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("tt_tickets").select("*,employee:employees(full_name)").order("created_at",{ascending:false}).limit(50)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.title){showToast("Title required","warning");return}
    withRetry(function(){return sb.from("tt_tickets").insert({employee_id:user.id,title:form.title,description:form.description||null,priority:form.priority,status:"open"})})
    .then(function(){showToast("Ticket created ✅","success");setShowForm(false);setForm({title:"",description:"",priority:"medium"});load()})
    .catch(function(){showToast("Failed","error")});
  }
  function updateStatus(id,status){
    withRetry(function(){return sb.from("tt_tickets").update({status:status}).eq("id",id)})
    .then(function(){showToast("Updated ✅","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  var filtered=filter==="all"?items:items.filter(function(x){return x.status===filter});
  if(loading)return React.createElement(LoadingPage,{message:"Loading TT Tracker..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"TT Tracker",icon:"🎫",subtitle:items.length+" tickets",
      actions:React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"✕ Cancel":"+ New Ticket")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("input",{className:"nx-input",placeholder:"Ticket title...",value:form.title,onChange:function(e){setForm(function(f){return Object.assign({},f,{title:e.target.value})})}}),
        React.createElement("textarea",{className:"nx-input",placeholder:"Description...",rows:3,value:form.description,onChange:function(e){setForm(function(f){return Object.assign({},f,{description:e.target.value})})}}),
        React.createElement("select",{className:"nx-input",value:form.priority,onChange:function(e){setForm(function(f){return Object.assign({},f,{priority:e.target.value})})}},
          React.createElement("option",{value:"low"},"🟢 Low"),
          React.createElement("option",{value:"medium"},"🟡 Medium"),
          React.createElement("option",{value:"high"},"🔴 High"),
          React.createElement("option",{value:"critical"},"🚨 Critical")
        ),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Create Ticket")
      )
    ),
    React.createElement(Tabs,{
      tabs:[{id:"all",label:"All"},{id:"open",label:"Open"},{id:"in_progress",label:"In Progress"},{id:"resolved",label:"Resolved"}],
      active:filter,onChange:setFilter
    }),
    filtered.length===0?React.createElement(EmptyState,{icon:"🎫",title:"No tickets"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      filtered.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
                React.createElement(PriorityBadge,{priority:item.priority}),
                React.createElement("span",{style:{fontWeight:700,fontSize:13}},item.title)
              ),
              item.description&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginBottom:6}},item.description),
              React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)"}},fmtRelative(item.created_at))
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}},
              React.createElement(StatusBadge,{status:item.status}),
              item.status==="open"&&React.createElement("button",{className:"nx-btn nx-btn-secondary nx-btn-sm",onClick:function(){updateStatus(item.id,"in_progress")}},"Start"),
              item.status==="in_progress"&&React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){updateStatus(item.id,"resolved")}},"Resolve")
            )
          )
        );
      })
    )
  );
}

function PerformancePage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState("week"),period=_3[0],setPeriod=_3[1];
  React.useEffect(function(){load()},[period]);
  function load(){
    setLoading(true);
    var days=period==="day"?1:period==="week"?7:30;
    var from=new Date(Date.now()-days*86400000).toISOString().split("T")[0];
    withRetry(function(){return sb.from("kpi_entries").select("*").eq("employee_id",user.id).gte("entry_date",from).order("entry_date",{ascending:false})})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  var totals=items.reduce(function(acc,k){
    acc.calls+=(k.calls_handled||0);
    acc.resolved+=(k.cases_resolved||0);
    acc.csatSum+=(k.csat_score||0);
    acc.ahtSum+=(k.aht||0);
    acc.count++;
    return acc;
  },{calls:0,resolved:0,csatSum:0,ahtSum:0,count:0});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Performance..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Performance",icon:"📊",subtitle:"Your KPI metrics"}),
    React.createElement(Tabs,{
      tabs:[{id:"day",label:"Today"},{id:"week",label:"7 Days"},{id:"month",label:"30 Days"}],
      active:period,onChange:setPeriod
    }),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [{label:"Calls Handled",value:totals.calls,icon:"📞",color:"var(--primary)"},
       {label:"Cases Resolved",value:totals.resolved,icon:"✅",color:"#22C55E"},
       {label:"Avg CSAT",value:totals.count>0?(totals.csatSum/totals.count).toFixed(1):"—",icon:"⭐",color:"#EAB308"},
       {label:"Avg AHT",value:totals.count>0?fmtDuration(Math.floor(totals.ahtSum/totals.count)):"—",icon:"⏱️",color:"#3B82F6"}]
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
    items.length===0?React.createElement(EmptyState,{icon:"📊",title:"No KPI data",desc:"Data will appear here"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("span",{style:{fontWeight:700,fontSize:13}},fmtDate(item.entry_date)),
            React.createElement("div",{style:{display:"flex",gap:16,fontSize:12,flexWrap:"wrap"}},
              React.createElement("span",{style:{color:"var(--text-sub)"}},"📞 "+(item.calls_handled||0)),
              React.createElement("span",{style:{color:"var(--text-sub)"}},"✅ "+(item.cases_resolved||0)),
              React.createElement("span",{style:{color:"var(--text-sub)"}},"⭐ "+(item.csat_score||0)),
              React.createElement("span",{style:{color:"var(--text-sub)"}},"⏱️ "+fmtDuration(item.aht||0))
            )
          )
        );
      })
    )
  );
}

function QueuePage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("employees").select("id,full_name,role,status,is_online").eq("is_active",true).eq("is_online",true).order("full_name")})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  React.useEffect(function(){ChannelMgr.sub("queue","employees",null,load);return function(){ChannelMgr.unsub("queue")}},[]);
  var available=items.filter(function(e){return e.status==="online"});
  var busy=items.filter(function(e){return e.status==="incall"||e.status==="busy"});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Queue..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Queue",icon:"📞",subtitle:"Live agent status"}),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [{label:"Online",value:items.length,icon:"🟢",color:"#22C55E"},
       {label:"Available",value:available.length,icon:"✅",color:"var(--primary)"},
       {label:"In Call/Busy",value:busy.length,icon:"📞",color:"#EF4444"},
       {label:"On Break",value:items.filter(function(e){return e.status==="onbreak"}).length,icon:"☕",color:"#EAB308"}]
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
    items.length===0?React.createElement(EmptyState,{icon:"📞",title:"No agents online"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(emp){
        return React.createElement("div",{key:emp.id,className:"nx-card",style:{padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
            React.createElement(NxAvatar,{user:emp,size:"sm"}),
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:700,fontSize:13}},emp.full_name),
              React.createElement(RoleBadge,{role:emp.role})
            )
          ),
          React.createElement(StatusBadge,{status:emp.status||"online"})
        );
      })
    )
  );
}

function GamificationPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("employees").select("id,full_name,role,avatar_url").eq("is_active",true).order("full_name")})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Gamification..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Gamification",icon:"🏆",subtitle:"Team leaderboard"}),
    React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16,textAlign:"center"}},
      React.createElement("div",{style:{fontSize:40,marginBottom:8}},"🏆"),
      React.createElement("div",{style:{fontSize:16,fontWeight:700,color:"var(--primary)"}},"Coming Soon"),
      React.createElement("div",{style:{fontSize:13,color:"var(--text-muted)",marginTop:4}},"Points and badges system launching soon")
    ),
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(emp,i){
        return React.createElement("div",{key:emp.id,className:"nx-card",style:{padding:14,display:"flex",alignItems:"center",gap:12}},
          React.createElement("div",{style:{fontSize:18,fontWeight:900,color:"var(--text-muted)",width:28,textAlign:"center"}},i+1),
          React.createElement(NxAvatar,{user:emp,size:"sm"}),
          React.createElement("div",{style:{flex:1}},
            React.createElement("div",{style:{fontWeight:700,fontSize:13}},emp.full_name),
            React.createElement(RoleBadge,{role:emp.role})
          ),
          React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--primary)"}},"— pts")
        );
      })
    )
  );
}

function SurveysPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("surveys").select("*,created_by:employees(full_name)").eq("is_active",true).order("created_at",{ascending:false})})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Surveys..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Surveys",icon:"📝",subtitle:items.length+" active surveys"}),
    items.length===0?React.createElement(EmptyState,{icon:"📝",title:"No surveys available",desc:"Surveys will appear here"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:700,fontSize:14}},item.title),
              React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:4}},
                "By "+((item.created_by&&item.created_by.full_name)||"—")+" · "+fmtRelative(item.created_at))
            ),
            React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm"},"Take Survey")
          )
        );
      })
    )
  );
}

/* NEXUS-CSOPS v4.2.0 — screens2.js */

function MyBreakSchedulePage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  async function load(){try{var r=await withRetry(function(){return sb.from("breaks").select("*").eq("employee_id",user.id).order("created_at",{ascending:false}).limit(30)});setItems(r.data||[])}catch(e){}finally{setLoading(false)}}
  async function startBreak(){try{await withRetry(function(){return sb.from("breaks").insert({employee_id:user.id,date:new Date().toISOString().split("T")[0],start_time:new Date().toISOString(),type:"break",status:"active"})});showToast("Break started ☕","success");load()}catch(e){showToast("Failed","error")}}
  async function endBreak(id){try{var now=new Date().toISOString();await withRetry(function(){return sb.from("breaks").update({end_time:now,status:"completed"}).eq("id",id)});showToast("Break ended ✅","success");load()}catch(e){showToast("Failed","error")}}
  var active=items.find(function(b){return !b.end_time});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Breaks..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Breaks",icon:"☕",subtitle:"Break management",
      actions:!active?React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:startBreak},"☕ Start Break"):
      React.createElement("button",{className:"nx-btn nx-btn-secondary nx-btn-sm",onClick:function(){endBreak(active.id)}},"✅ End Break")}),
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
      items.map(function(b){return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:12,display:"flex",justifyContent:"space-between",alignItems:"center"}},
        React.createElement("span",{style:{fontSize:13,fontWeight:600}},fmtDate(b.date)),
        React.createElement("div",{style:{display:"flex",gap:10,fontSize:12}},
          React.createElement("span",{style:{color:"var(--text-sub)"}},fmtTime(b.start_time)),
          React.createElement("span",{style:{color:"var(--text-muted)"}},"→"),
          React.createElement("span",{style:{color:"var(--text-sub)"}},b.end_time?fmtTime(b.end_time):"Active"),
          React.createElement(StatusBadge,{status:b.status||"active"})
        )
      )})
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
  async function load(){try{var r=await withRetry(function(){return sb.from("requests").select("*").eq("employee_id",user.id).order("created_at",{ascending:false})});setItems(r.data||[])}catch(e){}finally{setLoading(false)}}
  async function submit(){if(!form.details){showToast("Details required","warning");return}try{await withRetry(function(){return sb.from("requests").insert({employee_id:user.id,type:form.type,details:form.details,status:"pending"})});showToast("Request submitted ✅","success");setShowForm(false);setForm({type:"leave",details:""});load()}catch(e){showToast("Failed","error")}}
  if(loading)return React.createElement(LoadingPage,{message:"Loading Requests..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Requests",icon:"📋",subtitle:items.length+" requests",
      actions:React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm",onClick:function(){setShowForm(!showForm)}},showForm?"✕ Cancel":"+ New Request")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{className:"nx-input",value:form.type,onChange:function(e){setForm(function(f){return Object.assign({},f,{type:e.target.value})})}},
          React.createElement("option",{value:"leave"},"Leave"),React.createElement("option",{value:"wfh"},"WFH"),
          React.createElement("option",{value:"swap"},"Shift Swap"),React.createElement("option",{value:"other"},"Other")),
        React.createElement("textarea",{className:"nx-input",placeholder:"Details...",rows:3,value:form.details,onChange:function(e){setForm(function(f){return Object.assign({},f,{details:e.target.value})})}}),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit Request")
      )
    ),
    items.length===0?React.createElement(EmptyState,{icon:"📋",title:"No requests yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("div",null,
            React.createElement("span",{style:{fontWeight:700,fontSize:13,textTransform:"capitalize"}},item.type),
            React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.details)
          ),
          React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
            React.createElement(StatusBadge,{status:item.status}),
            React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)"}},fmtRelative(item.created_at))
          )
        )
      )})
    )
  );
}

function ShiftHandoverPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  async function load(){try{var r=await withRetry(function(){return sb.from("handovers").select("*,from:employees!from_id(full_name),to:employees!to_id(full_name)").order("created_at",{ascending:false}).limit(20)});setItems(r.data||[])}catch(e){}finally{setLoading(false)}}
  if(loading)return React.createElement(LoadingPage,{message:"Loading Handovers..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Shift Handover",icon:"🔄",subtitle:"Shift transitions"}),
    items.length===0?React.createElement(EmptyState,{icon:"🔄",title:"No handovers yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:13,fontWeight:700}},
              (item.from&&item.from.full_name)||"—"," → ",(item.to&&item.to.full_name)||"—"),
            item.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.notes)
          ),
          React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
            React.createElement(StatusBadge,{status:item.status}),
            React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)"}},fmtRelative(item.created_at))
          )
        )
      )})
    )
  );
}

function CaseHandoverPage(p){return React.createElement("div",{className:"nx-page-enter"},React.createElement(PageHeader,{title:"Case Handover",icon:"📁",subtitle:"Case transitions"}),React.createElement(EmptyState,{icon:"📁",title:"Case Handover",desc:"Coming soon"}))}
function TTTrackerPage(p){return React.createElement("div",{className:"nx-page-enter"},React.createElement(PageHeader,{title:"TT Tracker",icon:"🎫",subtitle:"Trouble tickets"}),React.createElement(EmptyState,{icon:"🎫",title:"TT Tracker",desc:"Coming soon"}))}
function PerformancePage(p){return React.createElement("div",{className:"nx-page-enter"},React.createElement(PageHeader,{title:"Performance",icon:"📊",subtitle:"Your KPIs"}),React.createElement(EmptyState,{icon:"📊",title:"Performance",desc:"Coming soon"}))}
function QueuePage(p){return React.createElement("div",{className:"nx-page-enter"},React.createElement(PageHeader,{title:"Queue",icon:"📞",subtitle:"Call queue"}),React.createElement(EmptyState,{icon:"📞",title:"Queue",desc:"Coming soon"}))}
function GamificationPage(p){return React.createElement("div",{className:"nx-page-enter"},React.createElement(PageHeader,{title:"Gamification",icon:"🏆",subtitle:"Leaderboard"}),React.createElement(EmptyState,{icon:"🏆",title:"Gamification",desc:"Coming soon"}))}
function SurveysPage(p){return React.createElement("div",{className:"nx-page-enter"},React.createElement(PageHeader,{title:"Surveys",icon:"📝",subtitle:"Active surveys"}),React.createElement(EmptyState,{icon:"📝",title:"Surveys",desc:"Coming soon"}))}
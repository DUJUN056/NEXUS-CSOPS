/* NEXUS-CSOPS v4.2.0 — screens4.js */

function AuditLogPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  async function load(){try{var r=await withRetry(function(){return sb.from("audit_log").select("*,actor:employees!actor_id(full_name,role)").order("created_at",{ascending:false}).limit(100)});setItems(r.data||[])}catch(e){}finally{setLoading(false)}}
  if(loading)return React.createElement(LoadingPage,{message:"Loading Audit Log..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Audit Log",icon:"📋",subtitle:items.length+" entries"}),
    items.length===0?React.createElement(EmptyState,{icon:"📋",title:"No audit entries"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      items.map(function(item){return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:12}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}},
          React.createElement("div",{style:{flex:1}},
            React.createElement("span",{style:{fontWeight:700,fontSize:13}},item.action),
            item.details&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:2}},item.details)
          ),
          React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}},
            item.actor&&React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)"}},item.actor.full_name),
            React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap"}},fmtRelative(item.created_at))
          )
        )
      )})
    )
  );
}

function ReportsNotesPage(p){
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Reports & Notes",icon:"📄",subtitle:"Team reports"}),
    React.createElement(EmptyState,{icon:"📄",title:"Reports & Notes",desc:"Coming soon"})
  );
}

function BreakManagementPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var todayStr=new Date().toISOString().split("T")[0];
  React.useEffect(function(){load()},[]);
  async function load(){try{var r=await withRetry(function(){return sb.from("breaks").select("*,employee:employees(full_name,role)").eq("date",todayStr).order("created_at",{ascending:false})});setItems(r.data||[])}catch(e){}finally{setLoading(false)}}
  React.useEffect(function(){ChannelMgr.sub("brkmgmt","breaks",null,load);return function(){ChannelMgr.unsub("brkmgmt")}},[]);
  var active=items.filter(function(b){return !b.end_time});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Break Management..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Break Management",icon:"⏱️",subtitle:active.length+" active breaks today"}),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [{label:"Total Today",value:items.length,icon:"☕",color:"var(--primary)"},{label:"Active",value:active.length,icon:"🟢",color:"#22C55E"},{label:"Completed",value:items.filter(function(b){return b.end_time}).length,icon:"✅",color:"#3B82F6"},{label:"Exceeded",value:items.filter(function(b){return b.status==="exceeded"}).length,icon:"⚠️",color:"#EAB308"}]
      .map(function(s){return React.createElement("div",{key:s.label,className:"nx-stat-card"},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},React.createElement("span",{className:"nx-stat-label"},s.label),React.createElement("span",null,s.icon)),
        React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value))})
    ),
    items.length===0?React.createElement(EmptyState,{icon:"☕",title:"No breaks today"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(b){return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:14}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
            React.createElement(NxAvatar,{user:b.employee,size:"sm"}),
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:700,fontSize:13}},(b.employee&&b.employee.full_name)||"—"),
              React.createElement(RoleBadge,{role:b.employee&&b.employee.role})
            )
          ),
          React.createElement("div",{style:{display:"flex",gap:10,alignItems:"center",fontSize:12}},
            React.createElement("span",{style:{color:"var(--text-sub)"}},fmtTime(b.start_time)),
            React.createElement("span",null,"→"),
            React.createElement("span",{style:{color:"var(--text-sub)"}},b.end_time?fmtTime(b.end_time):"Active"),
            React.createElement(StatusBadge,{status:b.end_time?"completed":"active"})
          )
        )
      )})
    )
  );
}
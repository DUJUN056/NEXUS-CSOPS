function MyBreakSchedulePage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("break_schedules")
        .select("*")
        .eq("employee_id",user.id)
        .order("created_at",{ascending:false})
        .limit(30);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Breaks..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Break Schedule",icon:"☕",subtitle:"Your break schedule"}),
    items.length===0
      ?React.createElement(EmptyState,{icon:"☕",title:"No breaks scheduled",desc:"Your break schedule will appear here"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(b){
          return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},b.break_type||"Break"),
                React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:2}},fmtDate(b.date))
              ),
              React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
                React.createElement("span",{style:{fontSize:13,color:"var(--text-sub)",fontWeight:600}},
                  (b.start_time||"--")+" to "+(b.end_time||"--")
                ),
                b.department&&React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)"}},b.department)
              )
            ),
            b.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:8}},b.notes)
          );
        })
      )
  );
}

function MyRequestsPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({type:"leave",notes:""});var form=_4[0];var setForm=_4[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("my_requests")
        .select("*")
        .eq("employee_id",user.id)
        .order("created_at",{ascending:false});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.notes){showToast("Details required","warning");return}
    withRetry(function(){
      return sb.from("my_requests").insert({
        employee_id:user.id,
        type:form.type,
        notes:form.notes,
        status:"pending"
      });
    }).then(function(){
      showToast("Submitted","success");
      setShowForm(false);
      setForm({type:"leave",notes:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Requests..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Requests",icon:"📋",subtitle:items.length+" requests",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(!showForm)}
      },showForm?"Cancel":"+ New")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",value:form.type,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{type:e.target.value})})}
        },
          React.createElement("option",{value:"leave"},"Leave"),
          React.createElement("option",{value:"wfh"},"WFH"),
          React.createElement("option",{value:"swap"},"Shift Swap"),
          React.createElement("option",{value:"other"},"Other")
        ),
        React.createElement("textarea",{
          className:"nx-input",placeholder:"Details...",rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit")
      )
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"📋",title:"No requests yet"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
              React.createElement("div",null,
                React.createElement("span",{style:{fontWeight:700,fontSize:13,textTransform:"capitalize"}},item.type),
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

function ShiftHandoverPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({to_employee:"",notes:""});var form=_4[0];var setForm=_4[1];
  var _5=React.useState([]);var emps=_5[0];var setEmps=_5[1];
  React.useEffect(function(){load();loadEmps()},[]);
  function load(){
    withRetry(function(){
      return sb.from("shift_handover")
        .select("*,from:employees!from_employee(full_name),to:employees!to_employee(full_name)")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  function loadEmps(){
    withRetry(function(){
      return sb.from("employees")
        .select("id,full_name")
        .eq("is_active",true)
        .neq("id",user.id);
    }).then(function(r){setEmps(r.data||[])}).catch(function(){});
  }
  function submit(){
    if(!form.to_employee){showToast("Select recipient","warning");return}
    withRetry(function(){
      return sb.from("shift_handover").insert({
        from_employee:user.id,
        to_employee:form.to_employee,
        shift_date:new Date().toISOString().split("T")[0],
        notes:form.notes,
        open_cases:[],
        pending_tasks:[],
        status:"pending"
      });
    }).then(function(){
      showToast("Submitted","success");
      setShowForm(false);
      setForm({to_employee:"",notes:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Handovers..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Shift Handover",icon:"🔄",subtitle:"Shift transitions",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(!showForm)}
      },showForm?"Cancel":"+ New")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",value:form.to_employee,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{to_employee:e.target.value})})}
        },
          React.createElement("option",{value:""},"Select recipient..."),
          emps.map(function(e){
            return React.createElement("option",{key:e.id,value:e.id},e.full_name);
          })
        ),
        React.createElement("textarea",{
          className:"nx-input",placeholder:"Notes...",rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit")
      )
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"🔄",title:"No handovers yet"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:13,fontWeight:700}},
                  (item.from&&item.from.full_name)||"--"," → ",(item.to&&item.to.full_name)||"--"
                ),
                item.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.notes),
                React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)",marginTop:4}},fmtDate(item.shift_date))
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
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({assigned_to:"",case_reference:"",priority:"medium",action_notes:""});
  var form=_4[0];var setForm=_4[1];
  var _5=React.useState([]);var emps=_5[0];var setEmps=_5[1];
  React.useEffect(function(){load();loadEmps()},[]);
  function load(){
    withRetry(function(){
      return sb.from("case_handover")
        .select("*,creator:employees!created_by(full_name),assignee:employees!assigned_to(full_name)")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  function loadEmps(){
    withRetry(function(){
      return sb.from("employees")
        .select("id,full_name")
        .eq("is_active",true)
        .neq("id",user.id);
    }).then(function(r){setEmps(r.data||[])}).catch(function(){});
  }
  function submit(){
    if(!form.assigned_to){showToast("Select recipient","warning");return}
    if(!form.case_reference){showToast("Case reference required","warning");return}
    withRetry(function(){
      return sb.from("case_handover").insert({
        created_by:user.id,
        assigned_to:form.assigned_to,
        case_reference:form.case_reference,
        priority:form.priority,
        action_notes:form.action_notes,
        status:"pending"
      });
    }).then(function(){
      showToast("Submitted","success");
      setShowForm(false);
      setForm({assigned_to:"",case_reference:"",priority:"medium",action_notes:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Case Handovers..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Case Handover",icon:"📁",subtitle:"Case transitions",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(!showForm)}
      },showForm?"Cancel":"+ New")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("input",{
          className:"nx-input",placeholder:"Case Reference...",
          value:form.case_reference,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{case_reference:e.target.value})})}
        }),
        React.createElement("select",{
          className:"nx-input",value:form.assigned_to,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{assigned_to:e.target.value})})}
        },
          React.createElement("option",{value:""},"Assign to..."),
          emps.map(function(e){
            return React.createElement("option",{key:e.id,value:e.id},e.full_name);
          })
        ),
        React.createElement("select",{
          className:"nx-input",value:form.priority,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{priority:e.target.value})})}
        },
          React.createElement("option",{value:"low"},"Low"),
          React.createElement("option",{value:"medium"},"Medium"),
          React.createElement("option",{value:"high"},"High"),
          React.createElement("option",{value:"critical"},"Critical")
        ),
        React.createElement("textarea",{
          className:"nx-input",placeholder:"Action notes...",rows:3,
          value:form.action_notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{action_notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit")
      )
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"📁",title:"No case handovers yet"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}},
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
                  React.createElement(PriorityBadge,{priority:item.priority}),
                  React.createElement("span",{style:{fontWeight:700,fontSize:13}},item.case_reference)
                ),
                React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)"}},
                  "To: "+((item.assignee&&item.assignee.full_name)||"--")
                ),
                item.action_notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.action_notes)
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
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({ticket_ref:"",priority:"medium",notes:""});var form=_4[0];var setForm=_4[1];
  var _5=React.useState("all");var filter=_5[0];var setFilter=_5[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("tt_tracker")
        .select("*,creator:employees!created_by(full_name),assignee:employees!assigned_to(full_name)")
        .order("created_at",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.ticket_ref){showToast("Ticket reference required","warning");return}
    withRetry(function(){
      return sb.from("tt_tracker").insert({
        ticket_ref:form.ticket_ref,
        priority:form.priority,
        notes:form.notes||null,
        created_by:user.id,
        assigned_to:user.id,
        status:"open"
      });
    }).then(function(){
      showToast("Created","success");
      setShowForm(false);
      setForm({ticket_ref:"",priority:"medium",notes:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }
  function updateStatus(id,status){
    withRetry(function(){
      return sb.from("tt_tracker").update({
        status:status,
        resolved_at:status==="resolved"?new Date().toISOString():null
      }).eq("id",id);
    }).then(function(){showToast("Updated","success");load()})
    .catch(function(){showToast("Failed","error")});
  }
  var filtered=filter==="all"?items:items.filter(function(x){return x.status===filter});
  if(loading)return React.createElement(LoadingPage,{message:"Loading TT Tracker..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"TT Tracker",icon:"🎫",subtitle:items.length+" tickets",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(!showForm)}
      },showForm?"Cancel":"+ New")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("input",{
          className:"nx-input",placeholder:"Ticket Reference...",
          value:form.ticket_ref,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{ticket_ref:e.target.value})})}
        }),
        React.createElement("select",{
          className:"nx-input",value:form.priority,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{priority:e.target.value})})}
        },
          React.createElement("option",{value:"low"},"Low"),
          React.createElement("option",{value:"medium"},"Medium"),
          React.createElement("option",{value:"high"},"High"),
          React.createElement("option",{value:"critical"},"Critical")
        ),
        React.createElement("textarea",{
          className:"nx-input",placeholder:"Notes...",rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Create")
      )
    ),
    React.createElement(Tabs,{
      tabs:[
        {id:"all",label:"All"},
        {id:"open",label:"Open"},
        {id:"in_progress",label:"In Progress"},
        {id:"resolved",label:"Resolved"}
      ],
      active:filter,
      onChange:setFilter
    }),
    filtered.length===0
      ?React.createElement(EmptyState,{icon:"🎫",title:"No tickets"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        filtered.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}},
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
                  React.createElement(PriorityBadge,{priority:item.priority}),
                  React.createElement("span",{style:{fontWeight:700,fontSize:13}},item.ticket_ref)
                ),
                item.notes&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginBottom:6}},item.notes),
                React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)"}},fmtRelative(item.created_at))
              ),
              React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}},
                React.createElement(StatusBadge,{status:item.status}),
                item.status==="open"&&React.createElement("button",{
                  className:"nx-btn nx-btn-secondary nx-btn-sm",
                  onClick:function(){updateStatus(item.id,"in_progress")}
                },"Start"),
                item.status==="in_progress"&&React.createElement("button",{
                  className:"nx-btn nx-btn-primary nx-btn-sm",
                  onClick:function(){updateStatus(item.id,"resolved")}
                },"Resolve")
              )
            )
          );
        })
      )
  );
}

function PerformancePage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("week");var period=_3[0];var setPeriod=_3[1];
  React.useEffect(function(){load()},[period]);
  function load(){
    setLoading(true);
    var days=period==="day"?1:period==="week"?7:30;
    var from=new Date(Date.now()-days*86400000).toISOString().split("T")[0];
    withRetry(function(){
      return sb.from("performance")
        .select("*")
        .eq("employee_id",user.id)
        .gte("date",from)
        .order("date",{ascending:false});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  var totals=items.reduce(function(acc,k){
    acc.tickets+=(k.tickets_handled||0);
    acc.csatSum+=(k.csat||0);
    acc.ahtSum+=(k.aht||0);
    acc.qualitySum+=(k.quality_score||0);
    acc.count++;
    return acc;
  },{tickets:0,csatSum:0,ahtSum:0,qualitySum:0,count:0});
  if(loading)return React.createElement(LoadingPage,{message:"Loading Performance..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Performance",icon:"📊",subtitle:"Your KPI metrics"}),
    React.createElement(Tabs,{
      tabs:[
        {id:"day",label:"Today"},
        {id:"week",label:"7 Days"},
        {id:"month",label:"30 Days"}
      ],
      active:period,
      onChange:setPeriod
    }),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [
        {label:"Tickets",value:totals.tickets,color:"var(--primary)"},
        {label:"Avg CSAT",value:totals.count>0?(totals.csatSum/totals.count).toFixed(1):"--",color:"#EAB308"},
        {label:"Avg AHT",value:totals.count>0?fmtDuration(Math.floor(totals.ahtSum/totals.count)):"--",color:"#3B82F6"},
        {label:"Avg Quality",value:totals.count>0?(totals.qualitySum/totals.count).toFixed(1)+"%":"--",color:"#22C55E"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"📊",title:"No KPI data",desc:"Data will appear here"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
              React.createElement("span",{style:{fontWeight:700,fontSize:13}},fmtDate(item.date)),
              React.createElement("div",{style:{display:"flex",gap:12,fontSize:12,flexWrap:"wrap"}},
                React.createElement("span",{style:{color:"var(--text-sub)"}},"Tickets: "+(item.tickets_handled||0)),
                React.createElement("span",{style:{color:"var(--text-sub)"}},"CSAT: "+(item.csat||0)),
                React.createElement("span",{style:{color:"var(--text-sub)"}},"AHT: "+fmtDuration(item.aht||0)),
                React.createElement("span",{style:{color:"var(--text-sub)"}},"Quality: "+(item.quality_score||0)+"%")
              )
            )
          );
        })
      )
  );
}

function QueuePage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("queue_stats")
        .select("*")
        .order("recorded_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  React.useEffect(function(){
    ChannelMgr.sub("queue","queue_stats",null,load);
    return function(){ChannelMgr.unsub("queue")};
  },[]);
  var latest=items[0]||null;
  if(loading)return React.createElement(LoadingPage,{message:"Loading Queue..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Queue",icon:"📞",subtitle:"Live queue stats"}),
    latest&&React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [
        {label:"Waiting",value:latest.waiting_count||0,color:"#EF4444"},
        {label:"Active Agents",value:latest.active_agents||0,color:"#22C55E"},
        {label:"Avg Wait",value:(latest.avg_wait_time||0)+"m",color:"#EAB308"},
        {label:"Abandoned",value:latest.abandoned_count||0,color:"#6B7280"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"📞",title:"No queue data"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:700,fontSize:13}},fmtTime(item.recorded_at)),
                item.department&&React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)"}},item.department)
              ),
              React.createElement("div",{style:{display:"flex",gap:12,fontSize:12,flexWrap:"wrap"}},
                React.createElement("span",{style:{color:"#EF4444"}},"Wait: "+(item.waiting_count||0)),
                React.createElement("span",{style:{color:"#22C55E"}},"Agents: "+(item.active_agents||0)),
                React.createElement("span",{style:{color:"#EAB308"}},"Avg: "+(item.avg_wait_time||0)+"m")
              )
            )
          );
        })
      )
  );
}

function GamificationPage(p){
  var user=p.user;
  var _1=React.useState([]);var points=_1[0];var setPoints=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("employee_points")
        .select("*,employee:employees(full_name,role,avatar_url)")
        .order("total_points",{ascending:false})
        .limit(50);
    }).then(function(r){setPoints(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Gamification..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Gamification",icon:"🏆",subtitle:"Team leaderboard"}),
    points.length===0
      ?React.createElement(EmptyState,{icon:"🏆",title:"No points data yet"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        points.map(function(item,i){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14,display:"flex",alignItems:"center",gap:12}},
            React.createElement("div",{style:{
              fontSize:18,fontWeight:900,
              color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"var(--text-muted)",
              width:28,textAlign:"center"
            }},i+1),
            React.createElement(NxAvatar,{user:item.employee,size:"sm"}),
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13}},(item.employee&&item.employee.full_name)||"--"),
              React.createElement(RoleBadge,{role:item.employee&&item.employee.role})
            ),
            React.createElement("div",{style:{fontSize:16,fontWeight:900,color:"var(--primary)"}},
              fmtNumber(item.total_points)+" pts"
            )
          );
        })
      )
  );
}

function SurveysPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("surveys")
        .select("*,created_by:employees(full_name)")
        .eq("is_active",true)
        .order("created_at",{ascending:false});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Surveys..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Surveys",icon:"📝",subtitle:items.length+" active"}),
    items.length===0
      ?React.createElement(EmptyState,{icon:"📝",title:"No surveys",desc:"Surveys will appear here"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:16}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:700,fontSize:14}},item.title),
                React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:4}},
                  "By "+((item.created_by&&item.created_by.full_name)||"--")+" — "+fmtRelative(item.created_at)
                )
              ),
              React.createElement("button",{className:"nx-btn nx-btn-primary nx-btn-sm"},"Take Survey")
            )
          );
        })
      )
  );
}
function MyBreakSchedulePage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.BREAK_SCHEDULES)
        .select("*")
        .eq("employee_id",user.id)
        .order("created_at",{ascending:false})
        .limit(30);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Breaks..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Break Schedule",icon:"☕",subtitle:"Your scheduled breaks"}),
    items.length===0?React.createElement(EmptyState,{icon:"☕",title:"No breaks scheduled",desc:"Your break schedule will appear here"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(b){
        return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontWeight:700,fontSize:13,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                b.break_type||"Break"
              ),
              React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:2,fontFamily:"'Space Grotesk',sans-serif"}},
                fmtDate(b.date)
              )
            ),
            React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
              React.createElement("span",{style:{fontSize:13,color:"var(--text-sub)",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}},
                (b.start_time||"--")+" to "+(b.end_time||"--")
              ),
              b.department?React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},b.department):null
            )
          ),
          b.notes?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:8,fontFamily:"'Space Grotesk',sans-serif"}},b.notes):null
        );
      })
    )
  );
}

function MyRequestsPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({type:"leave",notes:""});var form=_4[0];var setForm=_4[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.MY_REQUESTS)
        .select("*")
        .eq("employee_id",user.id)
        .order("created_at",{ascending:false});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }

  function submit(){
    if(!form.notes){showToast("Details required","warning");return}
    withRetry(function(){
      return sb.from(DB.MY_REQUESTS).insert({
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
    React.createElement(PageHeader,{
      title:"My Requests",icon:"📋",
      subtitle:items.length+" requests",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(function(v){return!v})}
      },showForm?"Cancel":"+ New")
    }),
    showForm?React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",
          value:form.type,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{type:e.target.value})})}
        },
          React.createElement("option",{value:"leave"},"Leave"),
          React.createElement("option",{value:"wfh"},"WFH"),
          React.createElement("option",{value:"swap"},"Shift Swap"),
          React.createElement("option",{value:"other"},"Other")
        ),
        React.createElement("textarea",{
          className:"nx-input",
          placeholder:"Details...",
          rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit")
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"📋",title:"No requests yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("span",{style:{fontWeight:700,fontSize:13,textTransform:"capitalize",color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},item.type),
              item.notes?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},item.notes):null
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              React.createElement(StatusBadge,{status:item.status}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},
                new Date(item.created_at).toLocaleString()
              )
            )
          )
        );
      })
    )
  );
}

function ShiftHandoverPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({to_employee:"",notes:""});var form=_4[0];var setForm=_4[1];
  var _5=React.useState([]);var emps=_5[0];var setEmps=_5[1];

  React.useEffect(function(){load();loadEmps()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.SHIFT_HANDOVER)
        .select("*,from:employees!from_employee(full_name),to:employees!to_employee(full_name)")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }

  function loadEmps(){
    withRetry(function(){
      return sb.from(DB.EMPLOYEES)
        .select("id,full_name")
        .eq("is_active",true)
        .neq("id",user.id);
    }).then(function(r){setEmps(r.data||[])}).catch(function(){});
  }

  function submit(){
    if(!form.to_employee){showToast("Select recipient","warning");return}
    withRetry(function(){
      return sb.from(DB.SHIFT_HANDOVER).insert({
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
    React.createElement(PageHeader,{
      title:"Shift Handover",icon:"🔄",
      subtitle:"Shift transitions",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(function(v){return!v})}
      },showForm?"Cancel":"+ New")
    }),
    showForm?React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",
          value:form.to_employee,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{to_employee:e.target.value})})}
        },
          React.createElement("option",{value:""},"Select recipient..."),
          emps.map(function(e){
            return React.createElement("option",{key:e.id,value:e.id},e.full_name);
          })
        ),
        React.createElement("textarea",{
          className:"nx-input",
          placeholder:"Notes...",
          rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit")
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"🔄",title:"No handovers yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                (item.from?item.from.full_name:"--")+" → "+(item.to?item.to.full_name:"--")
              ),
              item.notes?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},item.notes):null,
              React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},
                fmtDate(item.shift_date)
              )
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              React.createElement(StatusBadge,{status:item.status}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},
                new Date(item.created_at).toLocaleString()
              )
            )
          )
        );
      })
    )
  );
}

function CaseHandoverPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({to_employee:"",case_id:"",notes:""});var form=_4[0];var setForm=_4[1];
  var _5=React.useState([]);var emps=_5[0];var setEmps=_5[1];

  React.useEffect(function(){load();loadEmps()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.CASE_HANDOVER)
        .select("*,from:employees!from_employee(full_name),to:employees!to_employee(full_name)")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }

  function loadEmps(){
    withRetry(function(){
      return sb.from(DB.EMPLOYEES)
        .select("id,full_name")
        .eq("is_active",true)
        .neq("id",user.id);
    }).then(function(r){setEmps(r.data||[])}).catch(function(){});
  }

  function submit(){
    if(!form.to_employee){showToast("Select recipient","warning");return}
    if(!form.case_id){showToast("Case ID required","warning");return}
    withRetry(function(){
      return sb.from(DB.CASE_HANDOVER).insert({
        from_employee:user.id,
        to_employee:form.to_employee,
        case_id:form.case_id,
        notes:form.notes,
        status:"pending",
        handover_date:new Date().toISOString().split("T")[0]
      });
    }).then(function(){
      showToast("Submitted","success");
      setShowForm(false);
      setForm({to_employee:"",case_id:"",notes:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Case Handovers..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{
      title:"Case Handover",icon:"📁",
      subtitle:"Case transitions",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(function(v){return!v})}
      },showForm?"Cancel":"+ New")
    }),
    showForm?React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",
          value:form.to_employee,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{to_employee:e.target.value})})}
        },
          React.createElement("option",{value:""},"Select recipient..."),
          emps.map(function(e){
            return React.createElement("option",{key:e.id,value:e.id},e.full_name);
          })
        ),
        React.createElement("input",{
          className:"nx-input",
          placeholder:"Case ID...",
          value:form.case_id,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{case_id:e.target.value})})}
        }),
        React.createElement("textarea",{
          className:"nx-input",
          placeholder:"Notes...",
          rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Submit")
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"📁",title:"No case handovers yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                (item.from?item.from.full_name:"--")+" → "+(item.to?item.to.full_name:"--")
              ),
              item.case_id?React.createElement("div",{style:{fontSize:12,color:"var(--primary)",marginTop:4,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}},
                "Case: "+item.case_id
              ):null,
              item.notes?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},item.notes):null,
              React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},
                fmtDate(item.handover_date)
              )
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              React.createElement(StatusBadge,{status:item.status}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},
                new Date(item.created_at).toLocaleString()
              )
            )
          )
        );
      })
    )
  );
}

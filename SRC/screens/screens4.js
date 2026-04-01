function AuditLogPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("");var search=_3[0];var setSearch=_3[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("audit_log")
        .select("*,actor:employees!performed_by(full_name,role)")
        .order("created_at",{ascending:false})
        .limit(100);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setLoading(false)});
  }
  var filtered=items.filter(function(x){
    return !search
      ||(x.action&&x.action.toLowerCase().indexOf(search.toLowerCase())>-1)
      ||(x.page&&x.page.toLowerCase().indexOf(search.toLowerCase())>-1);
  });
  if(loading)return React.createElement(LoadingPage,{message:"Loading Audit Log..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Audit Log",icon:"📋",subtitle:items.length+" entries"}),
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement(SearchInput,{value:search,onChange:setSearch,placeholder:"Search actions..."})
    ),
    filtered.length===0
      ?React.createElement(EmptyState,{icon:"📋",title:"No entries"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
        filtered.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:12}},
            React.createElement("div",{style:{
              display:"flex",justifyContent:"space-between",
              alignItems:"center",gap:12,flexWrap:"wrap"
            }},
              React.createElement("div",{style:{flex:1}},
                React.createElement("span",{style:{
                  fontWeight:700,fontSize:13,color:"var(--primary)"
                }},item.action),
                item.page&&React.createElement("span",{style:{
                  fontSize:11,color:"var(--text-muted)",marginLeft:8
                }},"["+item.page+"]")
              ),
              React.createElement("div",{style:{
                display:"flex",flexDirection:"column",
                alignItems:"flex-end",gap:2
              }},
                item.actor&&React.createElement("div",{style:{
                  display:"flex",alignItems:"center",gap:4
                }},
                  React.createElement("span",{style:{
                    fontSize:11,color:"var(--text-muted)"
                  }},item.actor.full_name),
                  React.createElement(RoleBadge,{role:item.actor.role})
                ),
                React.createElement("span",{style:{
                  fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap"
                }},fmtRelative(item.created_at))
              )
            )
          );
        })
      )
  );
}

function ReportsNotesPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({type:"note",title:"",content:"",department:""});
  var form=_4[0];var setForm=_4[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("reports_notes")
        .select("*,author:employees!created_by(full_name,role)")
        .order("created_at",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  function submit(){
    if(!form.title){showToast("Title required","warning");return}
    withRetry(function(){
      return sb.from("reports_notes").insert({
        type:form.type,
        title:form.title,
        content:form.content||null,
        department:form.department||null,
        created_by:user.id,
        is_shared:true
      });
    }).then(function(){
      showToast("Added","success");
      setShowForm(false);
      setForm({type:"note",title:"",content:"",department:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Reports..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Reports & Notes",icon:"📄",subtitle:"Team reports",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(!showForm)}
      },showForm?"Cancel":"+ Add")}),
    showForm&&React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",value:form.type,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{type:e.target.value})})}
        },
          React.createElement("option",{value:"note"},"Note"),
          React.createElement("option",{value:"report"},"Report"),
          React.createElement("option",{value:"incident"},"Incident")
        ),
        React.createElement("input",{
          className:"nx-input",placeholder:"Title...",
          value:form.title,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{title:e.target.value})})}
        }),
        React.createElement("textarea",{
          className:"nx-input",placeholder:"Content...",rows:3,
          value:form.content,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{content:e.target.value})})}
        }),
        React.createElement("input",{
          className:"nx-input",placeholder:"Department (optional)...",
          value:form.department,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{department:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Add")
      )
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"📄",title:"No reports yet"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{
              display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",gap:12,flexWrap:"wrap"
            }},
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{
                  display:"flex",alignItems:"center",gap:8,marginBottom:4
                }},
                  React.createElement("span",{style:{
                    fontSize:10,fontWeight:700,color:"var(--primary)",
                    background:"var(--primary)22",padding:"2px 8px",
                    borderRadius:20,textTransform:"uppercase"
                  }},item.type||"note"),
                  React.createElement("span",{style:{fontWeight:700,fontSize:13}},item.title)
                ),
                item.content&&React.createElement("div",{style:{
                  fontSize:12,color:"var(--text-sub)",
                  marginTop:4,lineHeight:1.6
                }},item.content),
                item.department&&React.createElement("div",{style:{
                  fontSize:11,color:"var(--text-muted)",marginTop:4
                }},item.department)
              ),
              React.createElement("div",{style:{
                display:"flex",flexDirection:"column",
                alignItems:"flex-end",gap:4
              }},
                item.author&&React.createElement("span",{style:{
                  fontSize:11,color:"var(--text-muted)"
                }},item.author.full_name),
                React.createElement("span",{style:{
                  fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap"
                }},fmtRelative(item.created_at))
              )
            )
          );
        })
      )
  );
}

function BreakManagementPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var todayStr=new Date().toISOString().split("T")[0];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("break_schedules")
        .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
        .eq("date",todayStr)
        .order("start_time",{ascending:true});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setLoading(false)});
  }
  React.useEffect(function(){
    ChannelMgr.sub("brkmgmt","break_schedules",null,load);
    return function(){ChannelMgr.unsub("brkmgmt")};
  },[]);
  if(loading)return React.createElement(LoadingPage,{message:"Loading Break Management..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Break Management",icon:"⏱️",subtitle:items.length+" breaks today"}),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [
        {label:"Total Today",value:items.length,color:"var(--primary)"},
        {label:"Morning",value:items.filter(function(b){return b.break_type==="morning"}).length,color:"#22C55E"},
        {label:"Lunch",value:items.filter(function(b){return b.break_type==="lunch"}).length,color:"#3B82F6"},
        {label:"Evening",value:items.filter(function(b){return b.break_type==="evening"}).length,color:"#EAB308"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ),
    items.length===0
      ?React.createElement(EmptyState,{icon:"☕",title:"No breaks scheduled today"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(b){
          return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:14}},
            React.createElement("div",{style:{
              display:"flex",justifyContent:"space-between",
              alignItems:"center",gap:12,flexWrap:"wrap"
            }},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                React.createElement(NxAvatar,{user:b.employee,size:"sm"}),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontWeight:700,fontSize:13}},
                    (b.employee&&b.employee.full_name)||"--"
                  ),
                  React.createElement(RoleBadge,{role:b.employee&&b.employee.role})
                )
              ),
              React.createElement("div",{style:{
                display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"
              }},
                React.createElement("span",{style:{
                  fontSize:12,color:"var(--text-sub)",fontWeight:600
                }},(b.start_time||"--")+" to "+(b.end_time||"--")),
                React.createElement("span",{style:{
                  fontSize:11,color:"var(--primary)",
                  fontWeight:700,textTransform:"capitalize"
                }},b.break_type||"break"),
                b.department&&React.createElement("span",{style:{
                  fontSize:11,color:"var(--text-muted)"
                }},b.department)
              )
            ),
            b.notes&&React.createElement("div",{style:{
              fontSize:12,color:"var(--text-sub)",marginTop:8
            }},b.notes)
          );
        })
      )
  );
}
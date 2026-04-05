function TTTrackerPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({ticket_id:"",title:"",priority:"medium",notes:""});var form=_4[0];var setForm=_4[1];
  var isMgr=RC.isMgr(user);

  React.useEffect(function(){load()},[]);

  function load(){
    var q=sb.from(DB.TT_TRACKER)
      .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
      .order("created_at",{ascending:false})
      .limit(50);
    if(!isMgr)q=q.eq("employee_id",user.id);
    withRetry(function(){return q})
      .then(function(r){setItems(r.data||[])})
      .catch(function(){showToast("Failed to load","error")})
      .finally(function(){setLoading(false)});
  }

  function submit(){
    if(!form.ticket_id){showToast("Ticket ID required","warning");return}
    if(!form.title){showToast("Title required","warning");return}
    withRetry(function(){
      return sb.from(DB.TT_TRACKER).insert({
        employee_id:user.id,
        ticket_id:form.ticket_id,
        title:form.title,
        priority:form.priority,
        notes:form.notes,
        status:"open"
      });
    }).then(function(){
      showToast("Ticket added","success");
      setShowForm(false);
      setForm({ticket_id:"",title:"",priority:"medium",notes:""});
      load();
    }).catch(function(){showToast("Failed","error")});
  }

  function updateStatus(id,status){
    withRetry(function(){
      return sb.from(DB.TT_TRACKER).update({status:status}).eq("id",id);
    }).then(function(){
      showToast("Updated","success");
      load();
    }).catch(function(){showToast("Failed","error")});
  }

  var priorityColor={low:"#22C55E",medium:"#EAB308",high:"#EF4444",critical:"#7C3AED"};

  if(loading)return React.createElement(LoadingPage,{message:"Loading TT Tracker..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{
      title:"TT Tracker",icon:"🎫",
      subtitle:items.length+" tickets",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(function(v){return!v})}
      },showForm?"Cancel":"+ New Ticket")
    }),
    showForm?React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap"}},
          React.createElement("input",{
            className:"nx-input",
            placeholder:"Ticket ID...",
            value:form.ticket_id,
            style:{flex:1,minWidth:140},
            onChange:function(e){setForm(function(f){return Object.assign({},f,{ticket_id:e.target.value})})}
          }),
          React.createElement("select",{
            className:"nx-input",
            style:{width:"auto",minWidth:130},
            value:form.priority,
            onChange:function(e){setForm(function(f){return Object.assign({},f,{priority:e.target.value})})}
          },
            React.createElement("option",{value:"low"},"Low"),
            React.createElement("option",{value:"medium"},"Medium"),
            React.createElement("option",{value:"high"},"High"),
            React.createElement("option",{value:"critical"},"Critical")
          )
        ),
        React.createElement("input",{
          className:"nx-input",
          placeholder:"Title...",
          value:form.title,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{title:e.target.value})})}
        }),
        React.createElement("textarea",{
          className:"nx-input",
          placeholder:"Notes...",
          rows:3,
          value:form.notes,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{notes:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Add Ticket")
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"🎫",title:"No tickets yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        var pc=priorityColor[item.priority]||"#EAB308";
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14,borderLeft:"3px solid "+pc}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}},
                React.createElement("span",{style:{fontSize:12,fontWeight:800,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
                  "#"+item.ticket_id
                ),
                React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                  item.title
                ),
                React.createElement(PriorityBadge,{priority:item.priority})
              ),
              item.notes?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}},item.notes):null,
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}},
                isMgr&&item.employee?React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                  React.createElement(NxAvatar,{user:item.employee,size:"xs"}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},item.employee.full_name)
                ):null,
                React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},
                  fmtDate(item.created_at)
                )
              )
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}},
              React.createElement(StatusBadge,{status:item.status}),
              item.status==="open"?React.createElement("button",{
                className:"nx-btn nx-btn-primary nx-btn-sm",
                onClick:function(){updateStatus(item.id,"resolved")}
              },"✓ Resolve"):null,
              item.status==="resolved"&&isMgr?React.createElement("button",{
                className:"nx-btn nx-btn-secondary nx-btn-sm",
                onClick:function(){updateStatus(item.id,"closed")}
              },"Close"):null
            )
          )
        );
      })
    )
  );
}

function PerformancePage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("week");var range=_3[0];var setRange=_3[1];
  var isMgr=RC.isMgr(user);

  React.useEffect(function(){load()},[range]);

  function load(){
    setLoading(true);
    var from=range==="week"
      ?new Date(Date.now()-7*86400000).toISOString().split("T")[0]
      :new Date(Date.now()-30*86400000).toISOString().split("T")[0];
    var q=sb.from(DB.PERFORMANCE)
      .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
      .gte("date",from)
      .order("date",{ascending:false});
    if(!isMgr)q=q.eq("employee_id",user.id);
    withRetry(function(){return q})
      .then(function(r){setItems(r.data||[])})
      .catch(function(){showToast("Failed to load","error")})
      .finally(function(){setLoading(false)});
  }

  var totals=items.reduce(function(acc,x){
    acc.tickets+=(x.tickets_handled||0);
    acc.csat+=(x.csat||0);
    acc.count++;
    return acc;
  },{tickets:0,csat:0,count:0});

  if(loading)return React.createElement(LoadingPage,{message:"Loading Performance..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{
      title:"Performance",icon:"📊",
      subtitle:items.length+" records",
      actions:React.createElement("div",{style:{display:"flex",gap:6}},
        ["week","month"].map(function(r){
          return React.createElement("button",{
            key:r,
            className:"nx-btn nx-btn-sm "+(range===r?"nx-btn-primary":"nx-btn-secondary"),
            onClick:function(){setRange(r)}
          },r==="week"?"7 Days":"30 Days");
        })
      )
    }),
    React.createElement("div",{className:"nx-grid-3",style:{marginBottom:20}},
      [
        {label:"Total Tickets",value:fmtNumber(totals.tickets),color:"var(--primary)"},
        {label:"Avg CSAT",value:totals.count>0?(totals.csat/totals.count).toFixed(1):"--",color:"#22C55E"},
        {label:"Days Tracked",value:totals.count,color:"#3B82F6"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:24}},s.value)
        );
      })
    ),
    items.length===0?React.createElement(EmptyState,{icon:"📊",title:"No performance data"}):
    React.createElement("div",{style:{overflowX:"auto"}},
      React.createElement("table",{className:"nx-table"},
        React.createElement("thead",null,
          React.createElement("tr",null,
            isMgr?React.createElement("th",null,"Employee"):null,
            React.createElement("th",null,"Date"),
            React.createElement("th",null,"Tickets"),
            React.createElement("th",null,"CSAT"),
            React.createElement("th",null,"Notes")
          )
        ),
        React.createElement("tbody",null,
          items.map(function(item){
            return React.createElement("tr",{key:item.id},
              isMgr?React.createElement("td",null,
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                  React.createElement(NxAvatar,{user:item.employee,size:"xs"}),
                  React.createElement("span",{style:{fontSize:12,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}},
                    item.employee?item.employee.full_name:"--"
                  )
                )
              ):null,
              React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},fmtDate(item.date)),
              React.createElement("td",{style:{fontSize:13,fontWeight:700,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
                item.tickets_handled||0
              ),
              React.createElement("td",{style:{fontSize:13,fontWeight:700,color:"#22C55E",fontFamily:"'Space Grotesk',sans-serif"}},
                item.csat?item.csat.toFixed(1):"--"
              ),
              React.createElement("td",{style:{fontSize:12,color:"var(--text-sub)",fontFamily:"'Space Grotesk',sans-serif"}},
                item.notes||"--"
              )
            );
          })
        )
      )
    )
  );
}

function QueuePage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){
    load();
    ChannelMgr.sub("queue",DB.QUEUE_STATS,null,load);
    return function(){ChannelMgr.unsub("queue")};
  },[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.QUEUE_STATS)
        .select("*")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load queue","error")})
    .finally(function(){setLoading(false)});
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Queue..."});

  var latest=items[0]||null;

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Queue",icon:"📞",subtitle:"Live queue stats"}),
    latest?React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [
        {label:"In Queue",value:latest.calls_in_queue||0,color:"#EF4444"},
        {label:"Avg Wait",value:fmtDuration(latest.avg_wait_time||0),color:"#EAB308"},
        {label:"Agents Online",value:latest.agents_online||0,color:"#22C55E"},
        {label:"Calls Today",value:fmtNumber(latest.calls_today||0),color:"var(--primary)"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ):React.createElement(EmptyState,{icon:"📞",title:"No queue data"}),
    items.length>1?React.createElement("div",null,
      React.createElement("div",{className:"nx-section-title"},"Recent Snapshots"),
      React.createElement("div",{style:{overflowX:"auto"}},
        React.createElement("table",{className:"nx-table"},
          React.createElement("thead",null,
            React.createElement("tr",null,
              React.createElement("th",null,"Time"),
              React.createElement("th",null,"In Queue"),
              React.createElement("th",null,"Avg Wait"),
              React.createElement("th",null,"Agents")
            )
          ),
          React.createElement("tbody",null,
            items.slice(0,10).map(function(item){
              return React.createElement("tr",{key:item.id},
                React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},fmtTime(item.created_at)),
                React.createElement("td",{style:{fontSize:13,fontWeight:700,color:"#EF4444",fontFamily:"'Space Grotesk',sans-serif"}},item.calls_in_queue||0),
                React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},fmtDuration(item.avg_wait_time||0)),
                React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},item.agents_online||0)
              );
            })
          )
        )
      )
    ):null
  );
}

function GamificationPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.EMPLOYEE_POINTS)
        .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
        .order("total_points",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load","error")})
    .finally(function(){setLoading(false)});
  }

  var myPoints=items.find(function(x){return x.employee_id===user.id});
  var myRank=items.findIndex(function(x){return x.employee_id===user.id})+1;

  if(loading)return React.createElement(LoadingPage,{message:"Loading Gamification..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Gamification",icon:"🏆",subtitle:"Leaderboard"}),
    myPoints?React.createElement("div",{className:"nx-card",style:{padding:16,marginBottom:20,borderColor:"var(--primary)"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}},
        React.createElement("div",{style:{fontSize:32}},
          myRank===1?"🥇":myRank===2?"🥈":myRank===3?"🥉":"🎖️"
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},"Your Ranking"),
          React.createElement("div",{style:{fontSize:22,fontWeight:900,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
            "#"+myRank+" · "+fmtNumber(myPoints.total_points||0)+" pts"
          )
        )
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"🏆",title:"No data yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item,idx){
        var isMe=item.employee_id===user.id;
        var medal=idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":null;
        return React.createElement("div",{
          key:item.id,
          className:"nx-card",
          style:{
            padding:14,
            borderColor:isMe?"var(--primary)":"var(--border)",
            background:isMe?"rgba(0,255,136,0.04)":"var(--card)"
          }
        },
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12}},
            React.createElement("div",{style:{
              width:32,height:32,borderRadius:"50%",
              background:"var(--card2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:14,fontWeight:800,color:"var(--text-muted)",
              flexShrink:0,fontFamily:"'Space Grotesk',sans-serif"
            }},medal||"#"+(idx+1)),
            React.createElement(NxAvatar,{user:item.employee,size:"sm"}),
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:isMe?"var(--primary)":"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                item.employee?item.employee.full_name:"--"
              ),
              item.employee?React.createElement(RoleBadge,{role:item.employee.role}):null
            ),
            React.createElement("div",{style:{textAlign:"right"}},
              React.createElement("div",{style:{fontSize:16,fontWeight:900,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
                fmtNumber(item.total_points||0)
              ),
              React.createElement("div",{style:{fontSize:10,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},"points")
            )
          )
        );
      })
    )
  );
}

function SurveysPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.SURVEYS)
        .select("*")
        .eq("is_active",true)
        .order("created_at",{ascending:false});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load surveys","error")})
    .finally(function(){setLoading(false)});
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Surveys..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Surveys",icon:"📝",subtitle:items.length+" active surveys"}),
    items.length===0?React.createElement(EmptyState,{icon:"📝",title:"No active surveys",desc:"Surveys will appear here when available"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}},
                item.title
              ),
              item.description?React.createElement("p",{style:{fontSize:13,color:"var(--text-sub)",lineHeight:1.6,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}},
                item.description
              ):null,
              item.expires_at?React.createElement("div",{style:{fontSize:11,color:"var(--warning)",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}},
                "⏰ Expires: "+fmtDate(item.expires_at)
              ):null
            ),
            React.createElement("button",{
              className:"nx-btn nx-btn-primary nx-btn-sm",
              onClick:function(){showToast("Survey response — coming soon","info")}
            },"Take Survey")
          )
        );
      })
    )
  );
}

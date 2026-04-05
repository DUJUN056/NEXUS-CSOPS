function ChatPage(props){
  var user=props.user;
  var _1=React.useState([]);var msgs=_1[0];var setMsgs=_1[1];
  var _2=React.useState("");var text=_2[0];var setText=_2[1];
  var _3=React.useState(true);var loading=_3[0];var setLoading=_3[1];
  var _4=React.useState([]);var convos=_4[0];var setConvos=_4[1];
  var _5=React.useState(null);var activeConvo=_5[0];var setActiveConvo=_5[1];
  var endRef=React.useRef(null);

  React.useEffect(function(){loadConvos()},[]);

  React.useEffect(function(){
    if(activeConvo)loadMsgs(activeConvo);
  },[activeConvo]);

  React.useEffect(function(){
    if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  React.useEffect(function(){
    if(!activeConvo)return;
    ChannelMgr.sub("chat",DB.CHAT_MESSAGES,"conversation_id=eq."+activeConvo,function(){
      loadMsgs(activeConvo);
    });
    return function(){ChannelMgr.unsub("chat")};
  },[activeConvo]);

  function loadConvos(){
    withRetry(function(){
      return sb.from(DB.CHAT_CONVERSATIONS)
        .select("*")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){
      var list=r.data||[];
      setConvos(list);
      if(list.length>0)setActiveConvo(list[0].id);
      else setLoading(false);
    }).catch(function(){setLoading(false)});
  }

  function loadMsgs(convoId){
    setLoading(true);
    withRetry(function(){
      return sb.from(DB.CHAT_MESSAGES)
        .select("*,sender:employees!sender_id(full_name,role,avatar_url)")
        .eq("conversation_id",convoId)
        .order("created_at",{ascending:true})
        .limit(100);
    }).then(function(r){setMsgs(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }

  function send(){
    if(!text.trim()||!activeConvo)return;
    var t=text.trim();
    setText("");
    withRetry(function(){
      return sb.from(DB.CHAT_MESSAGES).insert({
        sender_id:user.id,
        conversation_id:activeConvo,
        content:t,
        is_read:false
      });
    }).catch(function(){showToast("Failed to send","error")});
  }

  function handleKey(e){
    if(e.key==="Enter"&&!e.shiftKey){
      e.preventDefault();
      send();
    }
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Chat..."});

  if(convos.length===0){
    return React.createElement("div",{className:"nx-page-enter"},
      React.createElement(PageHeader,{title:"Team Chat",icon:"💬",subtitle:"No conversations"}),
      React.createElement(EmptyState,{icon:"💬",title:"No conversations yet",desc:"Conversations will appear here"})
    );
  }

  return React.createElement("div",{
    className:"nx-page-enter",
    style:{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}
  },
    React.createElement(PageHeader,{title:"Team Chat",icon:"💬",subtitle:convos.length+" conversations"}),
    convos.length>1?React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}},
      convos.map(function(c){
        return React.createElement("button",{
          key:c.id,
          className:"nx-btn nx-btn-sm "+(activeConvo===c.id?"nx-btn-primary":"nx-btn-secondary"),
          onClick:function(){setActiveConvo(c.id)}
        },c.name||"Chat");
      })
    ):null,
    React.createElement("div",{style:{
      flex:1,overflowY:"auto",display:"flex",
      flexDirection:"column",gap:12,padding:"4px 0",
      WebkitOverflowScrolling:"touch"
    }},
      msgs.map(function(m){
        var isMe=m.sender_id===user.id;
        return React.createElement("div",{
          key:m.id,
          style:{
            display:"flex",gap:10,alignItems:"flex-end",
            flexDirection:isMe?"row-reverse":"row"
          }
        },
          React.createElement(NxAvatar,{user:m.sender,size:"sm"}),
          React.createElement("div",{style:{maxWidth:"70%"}},
            React.createElement("div",{style:{
              fontSize:10,color:"var(--text-muted)",marginBottom:3,
              textAlign:isMe?"right":"left",
              fontFamily:"'Space Grotesk',sans-serif"
            }},
              (m.sender?m.sender.full_name:"--")+" · "+
              new Date(m.created_at).toLocaleTimeString()
            ),
            React.createElement("div",{style:{
              background:isMe?"var(--primary)":"var(--card2)",
              color:isMe?"#000":"var(--text)",
              padding:"10px 14px",
              borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",
              fontSize:13,lineHeight:1.5,wordBreak:"break-word",
              fontFamily:"'Space Grotesk',sans-serif"
            }},m.content)
          )
        );
      }),
      React.createElement("div",{ref:endRef})
    ),
    React.createElement("div",{style:{
      display:"flex",gap:8,paddingTop:12,
      borderTop:"1px solid var(--border)"
    }},
      React.createElement("input",{
        className:"nx-input",
        placeholder:"Type a message...",
        value:text,
        onChange:function(e){setText(e.target.value)},
        onKeyDown:handleKey,
        style:{flex:1}
      }),
      React.createElement("button",{
        className:"nx-btn nx-btn-primary",
        onClick:send,
        disabled:!text.trim()
      },"Send")
    )
  );
}

function NotificationsPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){
    load();
    ChannelMgr.sub("notifs",DB.NOTIFICATIONS,"employee_id=eq."+user.id,load);
    return function(){ChannelMgr.unsub("notifs")};
  },[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.NOTIFICATIONS)
        .select("*")
        .eq("employee_id",user.id)
        .order("created_at",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }

  function markRead(id){
    withRetry(function(){
      return sb.from(DB.NOTIFICATIONS).update({is_read:true}).eq("id",id);
    }).then(function(){
      setItems(function(p){
        return p.map(function(x){return x.id===id?Object.assign({},x,{is_read:true}):x});
      });
    }).catch(function(){});
  }

  function markAllRead(){
    withRetry(function(){
      return sb.from(DB.NOTIFICATIONS)
        .update({is_read:true})
        .eq("employee_id",user.id)
        .eq("is_read",false);
    }).then(function(){
      setItems(function(p){
        return p.map(function(x){return Object.assign({},x,{is_read:true})});
      });
      showToast("All marked as read","success");
    }).catch(function(){});
  }

  var unread=items.filter(function(x){return!x.is_read}).length;

  if(loading)return React.createElement(LoadingPage,{message:"Loading Notifications..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{
      title:"Notifications",icon:"🔔",
      subtitle:unread+" unread",
      actions:unread>0?React.createElement("button",{
        className:"nx-btn nx-btn-secondary nx-btn-sm",
        onClick:markAllRead
      },"Mark All Read"):null
    }),
    items.length===0?React.createElement(EmptyState,{icon:"🔔",title:"No notifications"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{
          key:item.id,
          className:"nx-card",
          style:{
            padding:14,
            borderLeft:"3px solid "+(item.is_read?"var(--border)":"var(--primary)"),
            opacity:item.is_read?0.75:1,
            cursor:item.is_read?"default":"pointer"
          },
          onClick:function(){if(!item.is_read)markRead(item.id)}
        },
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{
                fontSize:13,fontWeight:item.is_read?500:700,
                color:"var(--text)",marginBottom:4,
                fontFamily:"'Space Grotesk',sans-serif"
              }},item.title||item.message),
              item.body?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",lineHeight:1.6,fontFamily:"'Space Grotesk',sans-serif"}},item.body):null
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}},
              !item.is_read?React.createElement("div",{style:{
                width:8,height:8,borderRadius:"50%",
                background:"var(--primary)"
              }}):null,
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}},
                fmtRelative(item.created_at)
              )
            )
          )
        );
      })
    )
  );
}

function MyProfilePage(props){
  var user=props.user;
  var _1=React.useState(user.full_name||"");var name=_1[0];var setName=_1[1];
  var _2=React.useState(user.phone||"");var phone=_2[0];var setPhone=_2[1];
  var _3=React.useState(false);var saving=_3[0];var setSaving=_3[1];

  function save(){
    if(!name.trim()){showToast("Name required","warning");return}
    setSaving(true);
    withRetry(function(){
      return sb.from(DB.EMPLOYEES).update({
        full_name:name.trim(),
        phone:phone.trim()||null
      }).eq("id",user.id);
    }).then(function(){
      showToast("Profile updated","success");
    }).catch(function(){
      showToast("Failed to save","error");
    }).finally(function(){setSaving(false)});
  }

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Profile",icon:"👤",subtitle:"Your account details"}),
    React.createElement("div",{className:"nx-card",style:{padding:24,maxWidth:500}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16,marginBottom:24}},
        React.createElement(NxAvatar,{user:user,size:"lg"}),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:16,fontWeight:800,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
            user.full_name||"--"
          ),
          React.createElement(RoleBadge,{role:user.role}),
          React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},
            user.email||"--"
          )
        )
      ),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:14}},
        React.createElement("div",null,
          React.createElement("label",{style:{
            display:"block",fontSize:11,fontWeight:700,
            color:"var(--text-muted)",marginBottom:6,
            textTransform:"uppercase",letterSpacing:1,
            fontFamily:"'Space Grotesk',sans-serif"
          }},"Full Name"),
          React.createElement("input",{
            className:"nx-input",
            value:name,
            onChange:function(e){setName(e.target.value)}
          })
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            display:"block",fontSize:11,fontWeight:700,
            color:"var(--text-muted)",marginBottom:6,
            textTransform:"uppercase",letterSpacing:1,
            fontFamily:"'Space Grotesk',sans-serif"
          }},"Phone"),
          React.createElement("input",{
            className:"nx-input",
            placeholder:"Optional...",
            value:phone,
            onChange:function(e){setPhone(e.target.value)}
          })
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            display:"block",fontSize:11,fontWeight:700,
            color:"var(--text-muted)",marginBottom:6,
            textTransform:"uppercase",letterSpacing:1,
            fontFamily:"'Space Grotesk',sans-serif"
          }},"Role"),
          React.createElement("div",{style:{padding:"10px 14px",background:"var(--card2)",borderRadius:8,fontSize:13,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},
            user.role||"--"
          )
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            display:"block",fontSize:11,fontWeight:700,
            color:"var(--text-muted)",marginBottom:6,
            textTransform:"uppercase",letterSpacing:1,
            fontFamily:"'Space Grotesk',sans-serif"
          }},"Department"),
          React.createElement("div",{style:{padding:"10px 14px",background:"var(--card2)",borderRadius:8,fontSize:13,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},
            user.department||"--"
          )
        ),
        React.createElement("button",{
          className:"nx-btn nx-btn-primary",
          onClick:save,
          disabled:saving,
          style:{marginTop:8}
        },saving?React.createElement(Spinner,{size:"sm"}):"Save Changes")
      )
    )
  );
}

function MyWorkspacePage(props){
  var user=props.user;
  var _1=React.useState(ThemeMgr.get());var current=_1[0];var setCurrent=_1[1];
  var themes=ThemeMgr.getAvailable(user.role);

  function applyTheme(id){
    ThemeMgr.set(id);
    setCurrent(id);
    showToast("Theme applied","success");
  }

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Workspace",icon:"🖥️",subtitle:"Personalize your experience"}),
    React.createElement("div",{className:"nx-section-title"},"Themes"),
    React.createElement("div",{className:"nx-grid-3"},
      themes.map(function(t){
        var active=current===t.id;
        return React.createElement("div",{
          key:t.id,
          className:"nx-card",
          style:{
            padding:16,cursor:"pointer",
            borderColor:active?"var(--primary)":"var(--border)",
            background:active?"rgba(0,255,136,0.04)":"var(--card)"
          },
          onClick:function(){applyTheme(t.id)}
        },
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:8}},
            React.createElement("div",{style:{
              width:32,height:32,borderRadius:8,
              background:t.bg,flexShrink:0
            }}),
            React.createElement("div",null,
              React.createElement("div",{style:{
                fontSize:13,fontWeight:700,
                color:active?"var(--primary)":"var(--text)",
                fontFamily:"'Space Grotesk',sans-serif"
              }},t.icon+" "+t.label),
              React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},t.desc)
            )
          ),
          active?React.createElement("div",{style:{
            fontSize:11,fontWeight:700,color:"var(--primary)",
            fontFamily:"'Space Grotesk',sans-serif"
          }},"✓ Active"):null
        );
      })
    )
  );
}

function AuditLogPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("");var search=_3[0];var setSearch=_3[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.AUDIT_LOG)
        .select("*,actor:employees!performed_by(full_name,role)")
        .order("created_at",{ascending:false})
        .limit(100);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load audit log","error")})
    .finally(function(){setLoading(false)});
  }

  var filtered=items.filter(function(x){
    return!search||
      (x.action&&x.action.toLowerCase().indexOf(search.toLowerCase())>-1)||
      (x.page&&x.page.toLowerCase().indexOf(search.toLowerCase())>-1);
  });

  if(loading)return React.createElement(LoadingPage,{message:"Loading Audit Log..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Audit Log",icon:"📋",subtitle:items.length+" entries"}),
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement(SearchInput,{value:search,onChange:setSearch,placeholder:"Search actions..."})
    ),
    filtered.length===0?React.createElement(EmptyState,{icon:"📋",title:"No entries"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      filtered.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:12}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("span",{style:{fontWeight:700,fontSize:13,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},item.action),
              item.page?React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",marginLeft:8,fontFamily:"'Space Grotesk',sans-serif"}},"["+item.page+"]"):null
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}},
              item.actor?React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},item.actor.full_name),
                React.createElement(RoleBadge,{role:item.actor.role})
              ):null,
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}},
                new Date(item.created_at).toLocaleString()
              )
            )
          )
        );
      })
    )
  );
}

function ReportsNotesPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState(false);var showForm=_3[0];var setShowForm=_3[1];
  var _4=React.useState({type:"note",title:"",content:"",department:""});var form=_4[0];var setForm=_4[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.REPORTS_NOTES)
        .select("*,author:employees!created_by(full_name,role)")
        .order("created_at",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load","error")})
    .finally(function(){setLoading(false)});
  }

  function submit(){
    if(!form.title){showToast("Title required","warning");return}
    withRetry(function(){
      return sb.from(DB.REPORTS_NOTES).insert({
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
    React.createElement(PageHeader,{
      title:"Reports & Notes",icon:"📄",
      subtitle:"Team reports",
      actions:React.createElement("button",{
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick:function(){setShowForm(function(v){return!v})}
      },showForm?"Cancel":"+ Add")
    }),
    showForm?React.createElement("div",{className:"nx-card",style:{padding:20,marginBottom:16}},
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement("select",{
          className:"nx-input",
          value:form.type,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{type:e.target.value})})}
        },
          React.createElement("option",{value:"note"},"Note"),
          React.createElement("option",{value:"report"},"Report"),
          React.createElement("option",{value:"incident"},"Incident")
        ),
        React.createElement("input",{
          className:"nx-input",
          placeholder:"Title...",
          value:form.title,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{title:e.target.value})})}
        }),
        React.createElement("textarea",{
          className:"nx-input",
          placeholder:"Content...",
          rows:3,
          value:form.content,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{content:e.target.value})})}
        }),
        React.createElement("input",{
          className:"nx-input",
          placeholder:"Department (optional)...",
          value:form.department,
          onChange:function(e){setForm(function(f){return Object.assign({},f,{department:e.target.value})})}
        }),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:submit},"Add")
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"📄",title:"No reports yet",desc:"Reports will appear here"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}},
                React.createElement("span",{style:{
                  fontSize:10,fontWeight:700,color:"var(--primary)",
                  background:"rgba(0,255,136,0.1)",padding:"2px 8px",
                  borderRadius:20,textTransform:"uppercase",
                  fontFamily:"'Space Grotesk',sans-serif"
                }},item.type||"note"),
                React.createElement("span",{style:{fontWeight:700,fontSize:13,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},item.title)
              ),
              item.content?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4,lineHeight:1.6,fontFamily:"'Space Grotesk',sans-serif"}},item.content):null,
              item.department?React.createElement("div",{style:{fontSize:11,color:"var(--text-muted)",marginTop:4,fontFamily:"'Space Grotesk',sans-serif"}},item.department):null
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}},
              item.author?React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},item.author.full_name):null,
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}},
                new Date(item.created_at).toLocaleString()
              )
            )
          )
        );
      })
    )
  );
}

function BreakManagementPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var todayStr=new Date().toISOString().split("T")[0];

  React.useEffect(function(){
    load();
    ChannelMgr.sub("brkmgmt",DB.BREAK_SCHEDULES,null,load);
    return function(){ChannelMgr.unsub("brkmgmt")};
  },[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.BREAK_SCHEDULES)
        .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
        .eq("date",todayStr)
        .order("start_time",{ascending:true});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load breaks","error")})
    .finally(function(){setLoading(false)});
  }

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
    items.length===0?React.createElement(EmptyState,{icon:"☕",title:"No breaks scheduled today"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(b){
        return React.createElement("div",{key:b.id,className:"nx-card",style:{padding:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
              React.createElement(NxAvatar,{user:b.employee,size:"sm"}),
              React.createElement("div",null,
                React.createElement("div",{style:{fontWeight:700,fontSize:13,color:"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                  b.employee?b.employee.full_name:"--"
                ),
                b.employee?React.createElement(RoleBadge,{role:b.employee.role}):null
              )
            ),
            React.createElement("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
              React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text-sub)",fontFamily:"'Space Grotesk',sans-serif"}},
                (b.start_time||"--")+" to "+(b.end_time||"--")
              ),
              React.createElement("span",{style:{
                fontSize:11,color:"var(--primary)",fontWeight:700,
                textTransform:"capitalize",fontFamily:"'Space Grotesk',sans-serif"
              }},b.break_type||"break"),
              b.department?React.createElement("span",{style:{fontSize:11,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},b.department):null
            )
          ),
          b.notes?React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:8,fontFamily:"'Space Grotesk',sans-serif"}},b.notes):null
        );
      })
    )
  );
}
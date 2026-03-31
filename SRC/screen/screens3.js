function ChatPage(p){
  var user=p.user;
  var _1=React.useState([]);var msgs=_1[0];var setMsgs=_1[1];
  var _2=React.useState("");var text=_2[0];var setText=_2[1];
  var _3=React.useState(true);var loading=_3[0];var setLoading=_3[1];
  var _4=React.useState([]);var convos=_4[0];var setConvos=_4[1];
  var _5=React.useState(null);var activeConvo=_5[0];var setActiveConvo=_5[1];
  var endRef=React.useRef(null);
  React.useEffect(function(){loadConvos()},[]);
  React.useEffect(function(){if(activeConvo)loadMsgs(activeConvo)},[activeConvo]);
  React.useEffect(function(){
    if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});
  },[msgs]);
  function loadConvos(){
    withRetry(function(){
      return sb.from("chat_conversations")
        .select("*")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){
      var list=r.data||[];
      setConvos(list);
      if(list.length>0){setActiveConvo(list[0].id)}
      else{setLoading(false)}
    }).catch(function(){setLoading(false)});
  }
  function loadMsgs(convoId){
    setLoading(true);
    withRetry(function(){
      return sb.from("chat_messages")
        .select("*,sender:employees!sender_id(full_name,role,avatar_url)")
        .eq("conversation_id",convoId)
        .order("created_at",{ascending:true})
        .limit(100);
    }).then(function(r){setMsgs(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  React.useEffect(function(){
    if(!activeConvo)return;
    ChannelMgr.sub("chat","chat_messages","conversation_id=eq."+activeConvo,function(){
      loadMsgs(activeConvo);
    });
    return function(){ChannelMgr.unsub("chat")};
  },[activeConvo]);
  function send(){
    if(!text.trim()||!activeConvo)return;
    var t=text.trim();
    setText("");
    withRetry(function(){
      return sb.from("chat_messages").insert({
        sender_id:user.id,
        conversation_id:activeConvo,
        content:t,
        is_read:false
      });
    }).catch(function(){showToast("Failed to send","error")});
  }
  function handleKey(e){
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Chat..."});
  if(convos.length===0){
    return React.createElement("div",{className:"nx-page-enter"},
      React.createElement(PageHeader,{title:"Team Chat",icon:"💬",subtitle:"No conversations"}),
      React.createElement(EmptyState,{icon:"💬",title:"No conversations yet",desc:"Conversations will appear here"})
    );
  }
  return React.createElement("div",{className:"nx-page-enter",style:{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}},
    React.createElement(PageHeader,{title:"Team Chat",icon:"💬",subtitle:convos.length+" conversations"}),
    convos.length>1&&React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}},
      convos.map(function(c){
        return React.createElement("button",{
          key:c.id,
          className:"nx-btn nx-btn-sm "+(activeConvo===c.id?"nx-btn-primary":"nx-btn-secondary"),
          onClick:function(){setActiveConvo(c.id)}
        },c.name||"Chat");
      })
    ),
    React.createElement("div",{style:{
      flex:1,overflowY:"auto",display:"flex",flexDirection:"column",
      gap:12,padding:"4px 0",WebkitOverflowScrolling:"touch"
    }},
      msgs.map(function(m){
        var isMe=m.sender_id===user.id;
        return React.createElement("div",{key:m.id,style:{
          display:"flex",gap:10,alignItems:"flex-end",
          flexDirection:isMe?"row-reverse":"row"
        }},
          React.createElement(NxAvatar,{user:m.sender,size:"sm"}),
          React.createElement("div",{style:{maxWidth:"70%"}},
            React.createElement("div",{style:{
              fontSize:10,color:"var(--text-muted)",marginBottom:3,
              textAlign:isMe?"right":"left"
            }},
              (m.sender&&m.sender.full_name)||"--",
              " ",
              fmtTime(m.created_at)
            ),
            React.createElement("div",{style:{
              background:isMe?"var(--primary)":"var(--card2)",
              color:isMe?"#000":"var(--text)",
              padding:"10px 14px",
              borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",
              fontSize:13,lineHeight:1.5,wordBreak:"break-word"
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

function NotificationsPage(p){
  var user=p.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){
      return sb.from("notifications")
        .select("*")
        .eq("employee_id",user.id)
        .order("created_at",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){}).finally(function(){setLoading(false)});
  }
  function markRead(id){
    withRetry(function(){
      return sb.from("notifications")
        .update({is_read:true,read_at:new Date().toISOString()})
        .eq("id",id);
    }).then(function(){load()}).catch(function(){});
  }
  function markAll(){
    withRetry(function(){
      return sb.from("notifications")
        .update({is_read:true,read_at:new Date().toISOString()})
        .eq("employee_id",user.id)
        .eq("is_read",false);
    }).then(function(){showToast("All marked as read","success");load()})
    .catch(function(){});
  }
  var unread=items.filter(function(x){return !x.is_read}).length;
  if(loading)return React.createElement(LoadingPage,{message:"Loading Notifications..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Notifications",icon:"🔔",subtitle:unread+" unread",
      actions:unread>0
        ?React.createElement("button",{
            className:"nx-btn nx-btn-secondary nx-btn-sm",
            onClick:markAll
          },"Mark All Read")
        :null
    }),
    items.length===0
      ?React.createElement(EmptyState,{icon:"🔔",title:"No notifications"})
      :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        items.map(function(item){
          return React.createElement("div",{
            key:item.id,
            className:"nx-card",
            style:{
              padding:14,cursor:"pointer",
              borderColor:!item.is_read?"var(--primary)44":"var(--border)"
            },
            onClick:function(){if(!item.is_read)markRead(item.id)}
          },
            React.createElement("div",{style:{
              display:"flex",justifyContent:"space-between",
              alignItems:"flex-start",gap:12
            }},
              React.createElement("div",{style:{flex:1}},
                React.createElement("div",{style:{
                  fontWeight:700,fontSize:13,
                  color:!item.is_read?"var(--primary)":"var(--text)"
                }},item.title),
                item.body&&React.createElement("div",{style:{
                  fontSize:12,color:"var(--text-sub)",marginTop:4
                }},item.body)
              ),
              React.createElement("div",{style:{
                display:"flex",flexDirection:"column",
                alignItems:"flex-end",gap:4
              }},
                !item.is_read&&React.createElement("div",{style:{
                  width:8,height:8,borderRadius:"50%",
                  background:"var(--primary)"
                }}),
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

function MyProfilePage(p){
  var user=p.user;
  var _1=React.useState({
    full_name:user.full_name||"",
    phone:user.phone||"",
    team:user.team||"",
    shift:user.shift||""
  });
  var form=_1[0];var setForm=_1[1];
  var _2=React.useState(false);var saving=_2[0];var setSaving=_2[1];
  function save(){
    setSaving(true);
    withRetry(function(){
      return sb.from("employees").update({
        full_name:form.full_name,
        phone:form.phone,
        team:form.team,
        shift:form.shift,
        updated_at:new Date().toISOString()
      }).eq("id",user.id);
    }).then(function(){showToast("Profile updated","success")})
    .catch(function(){showToast("Failed","error")})
    .finally(function(){setSaving(false)});
  }
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Profile",icon:"👤",subtitle:user.email}),
    React.createElement("div",{className:"nx-card",style:{padding:24,maxWidth:500}},
      React.createElement("div",{style:{
        display:"flex",alignItems:"center",gap:16,marginBottom:24
      }},
        React.createElement(NxAvatar,{user:user,size:"xl"}),
        React.createElement("div",null,
          React.createElement("div",{style:{
            fontSize:18,fontWeight:900,color:"var(--text)"
          }},user.full_name||"--"),
          React.createElement(RoleBadge,{role:user.role}),
          React.createElement("div",{style:{
            fontSize:12,color:"var(--text-muted)",marginTop:4
          }},user.email)
        )
      ),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:14}},
        React.createElement("div",null,
          React.createElement("label",{style:{
            fontSize:11,fontWeight:700,color:"var(--text-muted)",
            display:"block",marginBottom:6
          }},"FULL NAME"),
          React.createElement("input",{
            className:"nx-input",value:form.full_name,
            onChange:function(e){setForm(function(f){return Object.assign({},f,{full_name:e.target.value})})}
          })
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            fontSize:11,fontWeight:700,color:"var(--text-muted)",
            display:"block",marginBottom:6
          }},"PHONE"),
          React.createElement("input",{
            className:"nx-input",value:form.phone,
            onChange:function(e){setForm(function(f){return Object.assign({},f,{phone:e.target.value})})}
          })
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            fontSize:11,fontWeight:700,color:"var(--text-muted)",
            display:"block",marginBottom:6
          }},"TEAM"),
          React.createElement("input",{
            className:"nx-input",value:form.team,
            onChange:function(e){setForm(function(f){return Object.assign({},f,{team:e.target.value})})}
          })
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            fontSize:11,fontWeight:700,color:"var(--text-muted)",
            display:"block",marginBottom:6
          }},"SHIFT"),
          React.createElement("input",{
            className:"nx-input",value:form.shift,
            onChange:function(e){setForm(function(f){return Object.assign({},f,{shift:e.target.value})})}
          })
        ),
        React.createElement("button",{
          className:"nx-btn nx-btn-primary",
          onClick:save,
          disabled:saving,
          style:{marginTop:4}
        },saving?React.createElement(Spinner,{size:"sm"}):"Save Changes")
      )
    )
  );
}

function MyWorkspacePage(p){
  var user=p.user;
  var _1=React.useState(ThemeMgr.get());var selected=_1[0];var setSelected=_1[1];
  var available=ThemeMgr.getAvailable(user.role);
  function applyTheme(id){
    setSelected(id);
    ThemeMgr.set(id);
    showToast("Theme applied","success");
  }
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Workspace",icon:"🖥️",subtitle:"Customize your experience"}),
    React.createElement("div",{className:"nx-card",style:{padding:24,maxWidth:560}},
      React.createElement("h3",{className:"nx-section-title"},"Theme"),
      React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}},
        available.map(function(t){
          return React.createElement("button",{
            key:t.id,
            onClick:function(){applyTheme(t.id)},
            style:{
              padding:"12px 16px",borderRadius:8,
              border:"2px solid "+(selected===t.id?"var(--primary)":"var(--border)"),
              background:selected===t.id?"rgba(0,255,136,0.09)":"var(--card2)",
              color:selected===t.id?"var(--primary)":"var(--text)",
              fontWeight:700,fontSize:13,cursor:"pointer",
              transition:"all 0.15s",
              display:"flex",alignItems:"center",gap:8,
              fontFamily:"'Space Grotesk',sans-serif"
            }
          },
            React.createElement("div",{style:{
              width:12,height:12,borderRadius:"50%",
              background:t.bg,flexShrink:0
            }}),
            React.createElement("span",null,t.icon+" "+t.label),
            t.ownerOnly&&React.createElement("span",{style:{
              fontSize:9,fontWeight:800,color:"#EAB308",
              background:"rgba(234,179,8,0.15)",
              padding:"1px 5px",borderRadius:8
            }},"OWNER")
          );
        })
      )
    )
  );
}
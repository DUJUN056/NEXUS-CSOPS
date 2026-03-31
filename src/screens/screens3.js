/* NEXUS-CSOPS v4.2.0 — screens3.js */
function ChatPage(p){
  var user=p.user;
  var _1=React.useState([]),msgs=_1[0],setMsgs=_1[1];
  var _2=React.useState(""),text=_2[0],setText=_2[1];
  var _3=React.useState(true),loading=_3[0],setLoading=_3[1];
  var endRef=React.useRef(null);
  React.useEffect(function(){load()},[]);
  React.useEffect(function(){if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"})},[msgs]);
  function load(){
    withRetry(function(){return sb.from("chat_messages").select("*,sender:employees(full_name,role,avatar_url)").eq("room","general").order("created_at",{ascending:true}).limit(100)})
    .then(function(r){setMsgs(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  React.useEffect(function(){ChannelMgr.sub("chat","chat_messages",null,load);return function(){ChannelMgr.unsub("chat")}},[]);
  function send(){
    if(!text.trim())return;
    var t=text.trim();
    setText("");
    withRetry(function(){return sb.from("chat_messages").insert({sender_id:user.id,room:"general",message:t})})
    .catch(function(){showToast("Failed to send","error")});
  }
  function handleKey(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}
  if(loading)return React.createElement(LoadingPage,{message:"Loading Chat..."});
  return React.createElement("div",{className:"nx-page-enter",style:{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}},
    React.createElement(PageHeader,{title:"Team Chat",icon:"💬",subtitle:"General channel"}),
    React.createElement("div",{style:{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,padding:"4px 0",WebkitOverflowScrolling:"touch"}},
      msgs.map(function(m){
        var isMe=m.sender_id===user.id;
        return React.createElement("div",{key:m.id,style:{display:"flex",gap:10,alignItems:"flex-end",flexDirection:isMe?"row-reverse":"row"}},
          React.createElement(NxAvatar,{user:m.sender,size:"sm"}),
          React.createElement("div",{style:{maxWidth:"70%"}},
            React.createElement("div",{style:{fontSize:10,color:"var(--text-muted)",marginBottom:3,textAlign:isMe?"right":"left"}},
              (m.sender&&m.sender.full_name)||"—"," · ",fmtTime(m.created_at)),
            React.createElement("div",{style:{background:isMe?"var(--primary)":"var(--card2)",color:isMe?"#000":"var(--text)",padding:"10px 14px",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",fontSize:13,lineHeight:1.5,wordBreak:"break-word"}},m.message)
          )
        );
      }),
      React.createElement("div",{ref:endRef})
    ),
    React.createElement("div",{style:{display:"flex",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
      React.createElement("input",{className:"nx-input",placeholder:"Type a message...",value:text,onChange:function(e){setText(e.target.value)},onKeyDown:handleKey,style:{flex:1}}),
      React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:send,disabled:!text.trim()},"Send")
    )
  );
}

function NotificationsPage(p){
  var user=p.user;
  var _1=React.useState([]),items=_1[0],setItems=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    withRetry(function(){return sb.from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50)})
    .then(function(r){setItems(r.data||[])})
    .catch(function(){})
    .finally(function(){setLoading(false)});
  }
  function markRead(id){
    withRetry(function(){return sb.from("notifications").update({is_read:true}).eq("id",id)})
    .then(function(){load()}).catch(function(){});
  }
  function markAll(){
    withRetry(function(){return sb.from("notifications").update({is_read:true}).eq("user_id",user.id).eq("is_read",false)})
    .then(function(){showToast("All marked as read","success");load()}).catch(function(){});
  }
  var unread=items.filter(function(x){return !x.is_read}).length;
  if(loading)return React.createElement(LoadingPage,{message:"Loading Notifications..."});
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Notifications",icon:"🔔",subtitle:unread+" unread",
      actions:unread>0?React.createElement("button",{className:"nx-btn nx-btn-secondary nx-btn-sm",onClick:markAll},"Mark All Read"):null}),
    items.length===0?React.createElement(EmptyState,{icon:"🔔",title:"No notifications"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:14,borderColor:!item.is_read?"var(--primary)44":"var(--border)",cursor:"pointer"},
          onClick:function(){if(!item.is_read)markRead(item.id)}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontWeight:700,fontSize:13,color:!item.is_read?"var(--primary)":"var(--text)"}},item.title),
              item.body&&React.createElement("div",{style:{fontSize:12,color:"var(--text-sub)",marginTop:4}},item.body)
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
              !item.is_read&&React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:"var(--primary)"}}),
              React.createElement("span",{style:{fontSize:10,color:"var(--text-muted)",whiteSpace:"nowrap"}},fmtRelative(item.created_at))
            )
          )
        );
      })
    )
  );
}

function MyProfilePage(p){
  var user=p.user;
  var _1=React.useState({full_name:user.full_name||"",phone:user.phone||"",team:user.team||"",shift:user.shift||""}),form=_1[0],setForm=_1[1];
  var _2=React.useState(false),saving=_2[0],setSaving=_2[1];
  function save(){
    setSaving(true);
    withRetry(function(){return sb.from("employees").update({full_name:form.full_name,phone:form.phone,team:form.team,shift:form.shift,updated_at:new Date().toISOString()}).eq("id",user.id)})
    .then(function(){showToast("Profile updated ✅","success")})
    .catch(function(){showToast("Failed to update","error")})
    .finally(function(){setSaving(false)});
  }
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Profile",icon:"👤",subtitle:user.email}),
    React.createElement("div",{className:"nx-card",style:{padding:24,maxWidth:500}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16,marginBottom:24}},
        React.createElement(NxAvatar,{user:user,size:"xl"}),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:18,fontWeight:900,color:"var(--text)"}},user.full_name||"—"),
          React.createElement(RoleBadge,{role:user.role}),
          React.createElement("div",{style:{fontSize:12,color:"var(--text-muted)",marginTop:4}},user.email)
        )
      ),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:14}},
        React.createElement("div",null,
          React.createElement("label",{style:{fontSize:11,fontWeight:700,color:"var(--text-muted)",display:"block",marginBottom:6}},"FULL NAME"),
          React.createElement("input",{className:"nx-input",value:form.full_name,onChange:function(e){setForm(function(f){return Object.assign({},f,{full_name:e.target.value})})}})
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{fontSize:11,fontWeight:700,color:"var(--text-muted)",display:"block",marginBottom:6}},"PHONE"),
          React.createElement("input",{className:"nx-input",value:form.phone,onChange:function(e){setForm(function(f){return Object.assign({},f,{phone:e.target.value})})}})
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{fontSize:11,fontWeight:700,color:"var(--text-muted)",display:"block",marginBottom:6}},"TEAM"),
          React.createElement("input",{className:"nx-input",value:form.team,onChange:function(e){setForm(function(f){return Object.assign({},f,{team:e.target.value})})}})
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{fontSize:11,fontWeight:700,color:"var(--text-muted)",display:"block",marginBottom:6}},"SHIFT"),
          React.createElement("input",{className:"nx-input",value:form.shift,onChange:function(e){setForm(function(f){return Object.assign({},f,{shift:e.target.value})})}})
        ),
        React.createElement("button",{className:"nx-btn nx-btn-primary",onClick:save,disabled:saving,style:{marginTop:4}},
          saving?React.createElement(Spinner,{size:"sm"}):"Save Changes"
        )
      )
    )
  );
}

function MyWorkspacePage(p){
  var user=p.user;
  var _1=React.useState(ThemeMgr.get()),selected=_1[0],setSelected=_1[1];
  function applyTheme(id){
    setSelected(id);
    ThemeMgr.set(id);
    showToast("Theme applied ✅","success");
  }
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"My Workspace",icon:"🖥️",subtitle:"Customize your experience"}),
    React.createElement("div",{className:"nx-card",style:{padding:24,maxWidth:500}},
      React.createElement("h3",{className:"nx-section-title"},"🎨 Theme"),
      React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}},
        ThemeMgr.getAvailable().map(function(t){
          return React.createElement("button",{key:t.id,onClick:function(){applyTheme(t.id)},style:{padding:"12px 20px",borderRadius:8,border:"2px solid "+(selected===t.id?"var(--primary)":"var(--border)"),background:selected===t.id?"var(--primary)18":"var(--card2)",color:selected===t.id?"var(--primary)":"var(--text)",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:8}},
            React.createElement("div",{style:{width:12,height:12,borderRadius:"50%",background:t.bg,flexShrink:0}}),
            t.label
          );
        })
      )
    )
  );
}

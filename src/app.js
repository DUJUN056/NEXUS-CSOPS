/* NEXUS-CSOPS v4.2.0 — app.js */

var _heartbeatInterval=null;

function startHeartbeat(userId){
  if(_heartbeatInterval)clearInterval(_heartbeatInterval);
  _heartbeatInterval=setInterval(async function(){
    try{await sb.from("employees").update({is_online:true,last_seen:new Date().toISOString()}).eq("id",userId)}catch(e){}
  },60000);
  window.addEventListener("beforeunload",async function(){
    clearInterval(_heartbeatInterval);
    try{await sb.from("employees").update({is_online:false,status:"offline",last_seen:new Date().toISOString()}).eq("id",userId)}catch(e){}
  });
}

function stopHeartbeat(){
  if(_heartbeatInterval){clearInterval(_heartbeatInterval);_heartbeatInterval=null}
}

async function loadUserProfile(authId){
  try{
    var res=await withRetry(function(){return sb.from("employees").select("*").eq("auth_id",authId).single()});
    if(!res.data)return null;
    var emp=res.data;
    if(emp.is_suspended){await sb.auth.signOut();showToast("Account suspended","error");return null}
    await sb.from("employees").update({is_online:true,status:emp.status==="offline"?"online":emp.status,last_seen:new Date().toISOString()}).eq("id",emp.id);
    startHeartbeat(emp.id);
    return emp;
  }catch(e){return null}
}

function PageRouter(props){
  var page=props.page,user=props.user,setPage=props.setPage;
  if(!user)return React.createElement(LoadingPage,{message:"NEXUS-CSOPS Loading..."});
  if(!RC.canAccess(user,page))return React.createElement(EmptyState,{icon:"🔒",title:"Access Denied",desc:"You don't have permission"});
  var p={user:user,setPage:setPage};
  var map={
    "Updates Feed":      typeof UpdatesFeedPage!=="undefined"?React.createElement(UpdatesFeedPage,p):null,
    "Announcements":     typeof AnnouncementsPage!=="undefined"?React.createElement(AnnouncementsPage,p):null,
    "Schedule":          typeof SchedulePage!=="undefined"?React.createElement(SchedulePage,p):null,
    "Attendance":        typeof AttendancePage!=="undefined"?React.createElement(AttendancePage,p):null,
    "Live Floor":        typeof LiveFloorPage!=="undefined"?React.createElement(LiveFloorPage,p):null,
    "My Break Schedule": typeof MyBreakSchedulePage!=="undefined"?React.createElement(MyBreakSchedulePage,p):null,
    "My Requests":       typeof MyRequestsPage!=="undefined"?React.createElement(MyRequestsPage,p):null,
    "Shift Handover":    typeof ShiftHandoverPage!=="undefined"?React.createElement(ShiftHandoverPage,p):null,
    "Case Handover":     typeof CaseHandoverPage!=="undefined"?React.createElement(CaseHandoverPage,p):null,
    "TT Tracker":        typeof TTTrackerPage!=="undefined"?React.createElement(TTTrackerPage,p):null,
    "Performance":       typeof PerformancePage!=="undefined"?React.createElement(PerformancePage,p):null,
    "Queue":             typeof QueuePage!=="undefined"?React.createElement(QueuePage,p):null,
    "Gamification":      typeof GamificationPage!=="undefined"?React.createElement(GamificationPage,p):null,
    "Surveys":           typeof SurveysPage!=="undefined"?React.createElement(SurveysPage,p):null,
    "Chat":              typeof ChatPage!=="undefined"?React.createElement(ChatPage,p):null,
    "Notifications":     typeof NotificationsPage!=="undefined"?React.createElement(NotificationsPage,p):null,
    "My Profile":        typeof MyProfilePage!=="undefined"?React.createElement(MyProfilePage,p):null,
    "My Workspace":      typeof MyWorkspacePage!=="undefined"?React.createElement(MyWorkspacePage,p):null,
    "Audit Log":         typeof AuditLogPage!=="undefined"?React.createElement(AuditLogPage,p):null,
    "Reports & Notes":   typeof ReportsNotesPage!=="undefined"?React.createElement(ReportsNotesPage,p):null,
    "Break Management":  typeof BreakManagementPage!=="undefined"?React.createElement(BreakManagementPage,p):null,
    "Owner Analytics":   typeof OwnerAnalytics!=="undefined"?React.createElement(OwnerAnalytics,p):null,
  };
  return map[page]||React.createElement(EmptyState,{icon:"📭",title:"Page Not Found",desc:page});
}

function Sidebar(props){
  var user=props.user,page=props.page,setPage=props.setPage,onLogout=props.onLogout,isOpen=props.isOpen,onClose=props.onClose;
  var nav=[
    {group:"Operations",items:[
      {id:"Updates Feed",icon:"📢",label:"Updates Feed"},
      {id:"Announcements",icon:"📣",label:"Announcements"},
      {id:"Schedule",icon:"📅",label:"Schedule"},
      {id:"Attendance",icon:"✅",label:"Attendance"},
      {id:"Live Floor",icon:"🖥️",label:"Live Floor"},
    ]},
    {group:"My Tools",items:[
      {id:"My Break Schedule",icon:"☕",label:"My Breaks"},
      {id:"My Requests",icon:"📋",label:"My Requests"},
      {id:"Shift Handover",icon:"🔄",label:"Shift Handover"},
      {id:"Case Handover",icon:"📁",label:"Case Handover"},
      {id:"TT Tracker",icon:"🎫",label:"TT Tracker"},
      {id:"Performance",icon:"📊",label:"Performance"},
      {id:"Queue",icon:"📞",label:"Queue"},
      {id:"Gamification",icon:"🏆",label:"Gamification"},
      {id:"Surveys",icon:"📝",label:"Surveys"},
      {id:"Chat",icon:"💬",label:"Chat"},
    ]},
    {group:"Account",items:[
      {id:"Notifications",icon:"🔔",label:"Notifications"},
      {id:"My Profile",icon:"👤",label:"My Profile"},
      {id:"My Workspace",icon:"🖥️",label:"My Workspace"},
    ]},
  ];
  if(RC.isMgr(user)){nav.push({group:"Management",items:[
    {id:"Audit Log",icon:"📋",label:"Audit Log"},
    {id:"Reports & Notes",icon:"📄",label:"Reports & Notes"},
    {id:"Break Management",icon:"⏱️",label:"Break Management"},
  ]})}
  if(RC.isOwner(user)){nav.push({group:"Owner",items:[
    {id:"Owner Analytics",icon:"👑",label:"Owner Analytics"},
  ]})}
  return React.createElement(React.Fragment,null,
    React.createElement("div",{className:"nx-overlay"+(isOpen?" active":""),onClick:onClose}),
    React.createElement("div",{className:"nx-sidebar"+(isOpen?" open":"")},
      React.createElement("div",{className:"nx-sidebar-logo"},
        React.createElement("span",{style:{fontSize:20}},"⚡"),
        React.createElement("span",null,"NEXUS")
      ),
      React.createElement("div",{className:"nx-sidebar-user"},
        React.createElement(NxAvatar,{user:user,size:"sm"}),
        React.createElement("div",{style:{flex:1,minWidth:0}},
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},user.full_name||"—"),
          React.createElement(RoleBadge,{role:user.role})
        )
      ),
      React.createElement("nav",{className:"nx-sidebar-nav"},
        nav.map(function(group){return React.createElement("div",{key:group.group,className:"nx-nav-group"},
          React.createElement("div",{className:"nx-nav-group-label"},group.group),
          group.items.map(function(item){return React.createElement("button",{key:item.id,className:"nx-nav-item"+(page===item.id?" active":""),
            onClick:function(){setPage(item.id);if(onClose)onClose()}},
            React.createElement("span",{className:"nx-nav-icon"},item.icon),
            React.createElement("span",null,item.label)
          )})
        )})
      ),
      React.createElement("button",{className:"nx-sidebar-logout",onClick:onLogout},"🚪 Sign Out")
    )
  );
}

function LoginPage(props){
  var onLogin=props.onLogin;
  var _1=React.useState(""),email=_1[0],setEmail=_1[1];
  var _2=React.useState(""),password=_2[0],setPassword=_2[1];
  var _3=React.useState(false),loading=_3[0],setLoading=_3[1];
  async function handleLogin(e){
    e.preventDefault();
    if(!email||!password){showToast("Enter email and password","warning");return}
    setLoading(true);
    try{
      var res=await sb.auth.signInWithPassword({email:email.trim(),password:password});
      if(res.error)throw res.error;
      var emp=await loadUserProfile(res.data.user.id);
      if(emp){onLogin(emp);showToast("Welcome, "+(emp.full_name||"")+" 👋","success")}
      else{showToast("Profile not found. Contact admin.","error")}
    }catch(e){showToast(e.message||"Login failed","error")}
    finally{setLoading(false)}
  }
  return React.createElement("div",{style:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24}},
    React.createElement("div",{style:{width:"100%",maxWidth:400,background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:40,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}},
      React.createElement("div",{style:{textAlign:"center",marginBottom:32}},
        React.createElement("div",{style:{fontSize:48,marginBottom:8}},"⚡"),
        React.createElement("h1",{style:{fontSize:24,fontWeight:900,color:"var(--primary)"}},"NEXUS-CSOPS"),
        React.createElement("p",{style:{fontSize:13,color:"var(--text-muted)",marginTop:4}},"CS Operations Platform v4.2.0")
      ),
      React.createElement("form",{onSubmit:handleLogin,style:{display:"flex",flexDirection:"column",gap:16}},
        React.createElement("div",null,
          React.createElement("label",{style:{fontSize:11,fontWeight:700,color:"var(--text-muted)",display:"block",marginBottom:6}},"EMAIL"),
          React.createElement("input",{type:"email",className:"nx-input",placeholder:"your@email.com",value:email,onChange:function(e){setEmail(e.target.value)},style:{fontSize:16}})
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{fontSize:11,fontWeight:700,color:"var(--text-muted)",display:"block",marginBottom:6}},"PASSWORD"),
          React.createElement("input",{type:"password",className:"nx-input",placeholder:"••••••••",value:password,onChange:function(e){setPassword(e.target.value)},style:{fontSize:16}})
        ),
        React.createElement("button",{type:"submit",className:"nx-btn nx-btn-primary",disabled:loading,style:{width:"100%",padding:"14px",fontSize:15,fontWeight:800,marginTop:8}},
          loading?React.createElement(Spinner,{size:"sm"}):"Sign In to NEXUS"
        )
      )
    )
  );
}

function App(){
  var _1=React.useState(null),user=_1[0],setUser=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState("Updates Feed"),page=_3[0],setPage=_3[1];
  var _4=React.useState(false),sidebarOpen=_4[0],setSidebarOpen=_4[1];

  React.useEffect(function(){initAuth()},[]);

  async function initAuth(){
    try{
      var res=await sb.auth.getSession();
      if(res.data&&res.data.session&&res.data.session.user){
        var emp=await loadUserProfile(res.data.session.user.id);
        if(emp)setUser(emp);
      }
    }catch(e){console.error("[NEXUS-CSOPS] Auth error:",e)}
    finally{setLoading(false)}
    sb.auth.onAuthStateChange(async function(event,session){
      if(event==="SIGNED_OUT"){stopHeartbeat();ChannelMgr.unsubAll();setUser(null);setPage("Updates Feed")}
    });
  }

  async function handleLogout(){
    try{
      stopHeartbeat();
      if(user){await sb.from("employees").update({is_online:false,status:"offline",last_seen:new Date().toISOString()}).eq("id",user.id)}
      ChannelMgr.unsubAll();
      await sb.auth.signOut();
      setUser(null);setPage("Updates Feed");
      showToast("Signed out","success");
    }catch(e){showToast("Sign out failed","error")}
  }

  if(loading)return React.createElement("div",{style:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}},
    React.createElement(Spinner,{size:"lg"}),
    React.createElement("p",{style:{color:"var(--text-muted)",fontSize:13}},"NEXUS-CSOPS Loading...")
  );

  if(!user)return React.createElement(React.Fragment,null,
    React.createElement(ToastContainer,null),
    React.createElement(LoginPage,{onLogin:setUser})
  );

  return React.createElement(React.Fragment,null,
    React.createElement(ToastContainer,null),
    React.createElement("div",{className:"nx-layout"},
      React.createElement(Sidebar,{user:user,page:page,setPage:setPage,onLogout:handleLogout,isOpen:sidebarOpen,onClose:function(){setSidebarOpen(false)}}),
      React.createElement("div",{className:"nx-main"},
        React.createElement("div",{className:"nx-mobile-header"},
          React.createElement("button",{className:"nx-hamburger",onClick:function(){setSidebarOpen(true)}},"☰"),
          React.createElement("span",{style:{fontWeight:900,color:"var(--primary)",fontSize:16}},"⚡ NEXUS"),
          React.createElement(NxAvatar,{user:user,size:"xs"})
        ),
        React.createElement("div",{className:"nx-content"},
          React.createElement(PageRouter,{page:page,user:user,setPage:setPage})
        )
      )
    )
  );
}

(function(){
  var theme=ThemeMgr.get();
  document.documentElement.setAttribute("data-theme",theme);
  var root=ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App,null));
})();
var _hbInterval=null;
var _beforeUnloadHandler=null;

function startHeartbeat(userId){
  if(_hbInterval)clearInterval(_hbInterval);
  if(_beforeUnloadHandler){
    window.removeEventListener("beforeunload",_beforeUnloadHandler);
  }
  _hbInterval=setInterval(function(){
    sb.from(DB.EMPLOYEES)
      .update({
        is_online:true,
        last_seen:new Date().toISOString()
      })
      .eq("id",userId)
      .then(function(){}).catch(function(){});
  },60000);
  _beforeUnloadHandler=function(){
    clearInterval(_hbInterval);
    sb.from(DB.EMPLOYEES)
      .update({
        is_online:false,
        status:"offline",
        last_seen:new Date().toISOString()
      })
      .eq("id",userId)
      .then(function(){}).catch(function(){});
  };
  window.addEventListener("beforeunload",_beforeUnloadHandler);
}

function stopHeartbeat(){
  if(_hbInterval){clearInterval(_hbInterval);_hbInterval=null}
  if(_beforeUnloadHandler){
    window.removeEventListener("beforeunload",_beforeUnloadHandler);
    _beforeUnloadHandler=null;
  }
}

function loadUserProfile(authId){
  return withRetry(function(){
    return sb.from(DB.EMPLOYEES)
      .select("*")
      .eq("auth_id",authId)
      .single();
  }).then(function(res){
    if(!res||!res.data){
      showToast("Profile not found. Contact admin.","error");
      return null;
    }
    var emp=res.data;
    if(emp.is_suspended){
      sb.auth.signOut();
      showToast("Account suspended","error");
      return null;
    }
    sb.from(DB.EMPLOYEES).update({
      is_online:true,
      status:emp.status==="offline"?"online":emp.status,
      last_seen:new Date().toISOString()
    }).eq("id",emp.id).then(function(){}).catch(function(){});
    startHeartbeat(emp.id);
    return emp;
  }).catch(function(e){
    console.error("[NEXUS] loadUserProfile error:",e);
    return null;
  });
}

var NexusErrorBoundary=function(props){
  var _s=React.useState(null);
  var err=_s[0];var setErr=_s[1];
  React.useEffect(function(){
    function handler(e){
      setErr(e.message||"Unknown error");
    }
    window.addEventListener("error",handler);
    return function(){window.removeEventListener("error",handler)};
  },[]);
  if(err){
    return React.createElement("div",{style:{
      minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",
      gap:16,background:"var(--bg)",padding:24
    }},
      React.createElement("div",{style:{fontSize:48}},"⚠️"),
      React.createElement("h2",{style:{
        color:"var(--danger)",fontSize:18,fontWeight:800,
        fontFamily:"'Space Grotesk',sans-serif"
      }},"Something went wrong"),
      React.createElement("p",{style:{
        color:"var(--text-muted)",fontSize:13,
        fontFamily:"'Space Grotesk',sans-serif",
        maxWidth:400,textAlign:"center"
      }},err),
      React.createElement("button",{
        className:"nx-btn nx-btn-primary",
        onClick:function(){setErr(null)}
      },"Try Again")
    );
  }
  return props.children;
};

function PageRouter(props){
  var page=props.page;
  var user=props.user;
  var setPage=props.setPage;
  if(!user)return React.createElement(LoadingPage,{message:"Loading..."});
  if(!RC.canAccess(user,page)){
    return React.createElement(EmptyState,{
      icon:"🚫",
      title:"Access Denied",
      desc:"You do not have permission to view this page"
    });
  }
  var p={user:user,setPage:setPage};
  var pages={
    "Updates Feed":
      typeof UpdatesFeedPage!=="undefined"
        ?React.createElement(UpdatesFeedPage,p):null,
    "Announcements":
      typeof AnnouncementsPage!=="undefined"
        ?React.createElement(AnnouncementsPage,p):null,
    "Schedule":
      typeof SchedulePage!=="undefined"
        ?React.createElement(SchedulePage,p):null,
    "Attendance":
      typeof AttendancePage!=="undefined"
        ?React.createElement(AttendancePage,p):null,
    "Live Floor":
      typeof LiveFloorPage!=="undefined"
        ?React.createElement(LiveFloorPage,p):null,
    "My Break Schedule":
      typeof MyBreakSchedulePage!=="undefined"
        ?React.createElement(MyBreakSchedulePage,p):null,
    "My Requests":
      typeof MyRequestsPage!=="undefined"
        ?React.createElement(MyRequestsPage,p):null,
    "Shift Handover":
      typeof ShiftHandoverPage!=="undefined"
        ?React.createElement(ShiftHandoverPage,p):null,
    "Case Handover":
      typeof CaseHandoverPage!=="undefined"
        ?React.createElement(CaseHandoverPage,p):null,
    "TT Tracker":
      typeof TTTrackerPage!=="undefined"
        ?React.createElement(TTTrackerPage,p):null,
    "Performance":
      typeof PerformancePage!=="undefined"
        ?React.createElement(PerformancePage,p):null,
    "Queue":
      typeof QueuePage!=="undefined"
        ?React.createElement(QueuePage,p):null,
    "Gamification":
      typeof GamificationPage!=="undefined"
        ?React.createElement(GamificationPage,p):null,
    "Surveys":
      typeof SurveysPage!=="undefined"
        ?React.createElement(SurveysPage,p):null,
    "Chat":
      typeof ChatPage!=="undefined"
        ?React.createElement(ChatPage,p):null,
    "Notifications":
      typeof NotificationsPage!=="undefined"
        ?React.createElement(NotificationsPage,p):null,
    "My Profile":
      typeof MyProfilePage!=="undefined"
        ?React.createElement(MyProfilePage,p):null,
    "My Workspace":
      typeof MyWorkspacePage!=="undefined"
        ?React.createElement(MyWorkspacePage,p):null,
    "Audit Log":
      typeof AuditLogPage!=="undefined"
        ?React.createElement(AuditLogPage,p):null,
    "Reports & Notes":
      typeof ReportsNotesPage!=="undefined"
        ?React.createElement(ReportsNotesPage,p):null,
    "Break Management":
      typeof BreakManagementPage!=="undefined"
        ?React.createElement(BreakManagementPage,p):null,
    "Owner Analytics":
      typeof OwnerAnalytics!=="undefined"
        ?React.createElement(OwnerAnalytics,p):null
  };
  return pages[page]||React.createElement(EmptyState,{
    icon:"❓",
    title:"Page Not Found",
    desc:page
  });
}

function Sidebar(props){
  var user=props.user;
  var page=props.page;
  var setPage=props.setPage;
  var onLogout=props.onLogout;
  var isOpen=props.isOpen;
  var nav=[
    {group:"Operations",items:[
      {id:"Updates Feed",icon:"📢",label:"Updates Feed"},
      {id:"Announcements",icon:"📣",label:"Announcements"},
      {id:"Schedule",icon:"📅",label:"Schedule"},
      {id:"Attendance",icon:"✅",label:"Attendance"},
      {id:"Live Floor",icon:"🖥️",label:"Live Floor"}
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
      {id:"Chat",icon:"💬",label:"Chat"}
    ]},
    {group:"Account",items:[
      {id:"Notifications",icon:"🔔",label:"Notifications"},
      {id:"My Profile",icon:"👤",label:"My Profile"},
      {id:"My Workspace",icon:"🖥️",label:"My Workspace"}
    ]}
  ];
  if(RC.isMgr(user)){
    nav.push({group:"Management",items:[
      {id:"Audit Log",icon:"📋",label:"Audit Log"},
      {id:"Reports & Notes",icon:"📄",label:"Reports & Notes"},
      {id:"Break Management",icon:"⏱️",label:"Break Management"}
    ]});
  }
  if(RC.isOwner(user)){
    nav.push({group:"Owner",items:[
      {id:"Owner Analytics",icon:"👑",label:"Owner Analytics"}
    ]});
  }
  return React.createElement("div",{
    className:"nx-sidebar"+(isOpen?" open":"")
  },
    React.createElement("div",{className:"nx-sidebar-logo"},
      React.createElement("span",{style:{fontSize:20}},"⚡"),
      React.createElement("span",null,"NEXUS-CSOPS")
    ),
    React.createElement("div",{className:"nx-sidebar-user"},
      React.createElement(NxAvatar,{user:user,size:"sm"}),
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{style:{
          fontSize:12,fontWeight:700,color:"var(--text)",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"
        }},user.full_name||"--"),
        React.createElement(RoleBadge,{role:user.role})
      )
    ),
    React.createElement("nav",{className:"nx-sidebar-nav"},
      nav.map(function(group){
        return React.createElement("div",{key:group.group,className:"nx-nav-group"},
          React.createElement("div",{className:"nx-nav-group-label"},group.group),
          group.items.map(function(item){
            return React.createElement("button",{
              key:item.id,
              className:"nx-nav-item"+(page===item.id?" active":""),
              onClick:function(){setPage(item.id)}
            },
              React.createElement("span",{className:"nx-nav-icon"},item.icon),
              React.createElement("span",null,item.label)
            );
          })
        );
      })
    ),
    React.createElement("button",{
      className:"nx-sidebar-logout",
      onClick:onLogout
    },"Sign Out")
  );
}

function LoginPage(props){
  var _1=React.useState("");var email=_1[0];var setEmail=_1[1];
  var _2=React.useState("");var password=_2[0];var setPassword=_2[1];
  var _3=React.useState(false);var loading=_3[0];var setLoading=_3[1];
  function handleLogin(e){
    e.preventDefault();
    if(!email||!password){showToast("Enter email and password","warning");return}
    setLoading(true);
    sb.auth.signInWithPassword({
      email:email.trim(),
      password:password
    }).then(function(res){
      if(res.error)throw res.error;
      return loadUserProfile(res.data.user.id);
    }).then(function(emp){
      if(emp){
        props.onLogin(emp);
        showToast("Welcome "+(emp.full_name||""),"success");
      }else{
        showToast("Profile not found","error");
      }
    }).catch(function(e){
      showToast(e.message||"Login failed","error");
    }).finally(function(){setLoading(false)});
  }
  return React.createElement("div",{style:{
    minHeight:"100vh",display:"flex",alignItems:"center",
    justifyContent:"center",background:"var(--bg)",padding:24
  }},
    React.createElement("div",{style:{
      width:"100%",maxWidth:400,
      background:"var(--card)",
      border:"1px solid var(--border)",
      borderRadius:"var(--radius)",
      padding:40,
      boxShadow:"0 20px 60px rgba(0,0,0,0.5)"
    }},
      React.createElement("div",{style:{textAlign:"center",marginBottom:32}},
        React.createElement("div",{style:{fontSize:48,marginBottom:8}},"⚡"),
        React.createElement("h1",{style:{
          fontSize:24,fontWeight:900,color:"var(--primary)",
          fontFamily:"'Space Grotesk',sans-serif"
        }},"NEXUS-CSOPS"),
        React.createElement("p",{style:{
          fontSize:13,color:"var(--text-muted)",marginTop:4,
          fontFamily:"'Space Grotesk',sans-serif"
        }},"CS Operations v4.1.0")
      ),
      React.createElement("form",{
        onSubmit:handleLogin,
        style:{display:"flex",flexDirection:"column",gap:16}
      },
        React.createElement("div",null,
          React.createElement("label",{style:{
            fontSize:11,fontWeight:700,color:"var(--text-muted)",
            display:"block",marginBottom:6,
            fontFamily:"'Space Grotesk',sans-serif"
          }},"EMAIL"),
          React.createElement("input",{
            type:"email",className:"nx-input",
            placeholder:"your@email.com",
            value:email,
            onChange:function(e){setEmail(e.target.value)},
            style:{fontSize:16}
          })
        ),
        React.createElement("div",null,
          React.createElement("label",{style:{
            fontSize:11,fontWeight:700,color:"var(--text-muted)",
            display:"block",marginBottom:6,
            fontFamily:"'Space Grotesk',sans-serif"
          }},"PASSWORD"),
          React.createElement("input",{
            type:"password",className:"nx-input",
            placeholder:"password",
            value:password,
            onChange:function(e){setPassword(e.target.value)},
            style:{fontSize:16}
          })
        ),
        React.createElement("button",{
          type:"submit",
          className:"nx-btn nx-btn-primary",
          disabled:loading,
          style:{
            width:"100%",padding:"14px",
            fontSize:15,fontWeight:800,marginTop:8
          }
        },loading?React.createElement(Spinner,{size:"sm"}):"Sign In")
      )
    )
  );
}

function App(){
  var _1=React.useState(null);var user=_1[0];var setUser=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("Updates Feed");var page=_3[0];var setPage=_3[1];
  var _4=React.useState(false);var sidebarOpen=_4[0];var setSidebarOpen=_4[1];
  React.useEffect(function(){
    sb.auth.getSession().then(function(res){
      if(res.data&&res.data.session&&res.data.session.user){
        return loadUserProfile(res.data.session.user.id).then(function(emp){
          if(emp)setUser(emp);
        });
      }
    }).catch(function(e){
      console.error("[NEXUS]",e);
    }).finally(function(){setLoading(false)});
    var authListener=sb.auth.onAuthStateChange(function(event){
      if(event==="SIGNED_OUT"){
        stopHeartbeat();
        ChannelMgr.unsubAll();
        setUser(null);
        setPage("Updates Feed");
        setSidebarOpen(false);
      }
    });
    return function(){
      try{
        if(authListener&&authListener.data&&authListener.data.subscription){
          authListener.data.subscription.unsubscribe();
        }
      }catch(e){}
    };
  },[]);
  React.useEffect(function(){
    if(sidebarOpen){document.body.style.overflow="hidden"}
    else{document.body.style.overflow=""}
    return function(){document.body.style.overflow=""};
  },[sidebarOpen]);
  function handleSetPage(pg){
    setPage(pg);
    setSidebarOpen(false);
    var c=document.querySelector(".nx-content");
    if(c)c.scrollTop=0;
  }
  function handleLogout(){
    stopHeartbeat();
    if(user){
      sb.from(DB.EMPLOYEES)
        .update({
          is_online:false,
          status:"offline",
          last_seen:new Date().toISOString()
        })
        .eq("id",user.id)
        .then(function(){}).catch(function(){});
    }
    ChannelMgr.unsubAll();
    sb.auth.signOut().then(function(){
      setUser(null);
      setPage("Updates Feed");
      showToast("Signed out","success");
    }).catch(function(){showToast("Sign out failed","error")});
  }
  if(loading){
    return React.createElement("div",{style:{
      minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",
      gap:16,background:"var(--bg)"
    }},
      React.createElement(Spinner,{size:"lg"}),
      React.createElement("p",{style:{
        color:"var(--text-muted)",fontSize:13,
        fontFamily:"'Space Grotesk',sans-serif"
      }},"⚡ NEXUS-CSOPS Loading...")
    );
  }
  if(!user){
    return React.createElement(React.Fragment,null,
      React.createElement(ToastContainer,null),
      React.createElement(LoginPage,{onLogin:setUser})
    );
  }
  return React.createElement(React.Fragment,null,
    React.createElement(ToastContainer,null),
    React.createElement(NexusErrorBoundary,null,
      React.createElement("div",{className:"nx-layout"},
        React.createElement("div",{
          className:"nx-overlay"+(sidebarOpen?" active":""),
          onClick:function(){setSidebarOpen(false)}
        }),
        React.createElement(Sidebar,{
          user:user,
          page:page,
          setPage:handleSetPage,
          onLogout:handleLogout,
          isOpen:sidebarOpen
        }),
        React.createElement("div",{className:"nx-main"},
          React.createElement("div",{className:"nx-mobile-header"},
            React.createElement("button",{
              className:"nx-hamburger",
              onClick:function(){setSidebarOpen(true)}
            },"☰"),
            React.createElement("span",{style:{
              fontWeight:900,color:"var(--primary)",fontSize:16,
              fontFamily:"'Space Grotesk',sans-serif"
            }},"⚡ NEXUS"),
            React.createElement(NxAvatar,{user:user,size:"xs"})
          ),
          React.createElement("div",{className:"nx-content"},
            React.createElement(PageRouter,{
              page:page,
              user:user,
              setPage:handleSetPage
            })
          )
        )
      )
    )
  );
}

(function(){
  try{
    var theme=ThemeMgr.get();
    document.documentElement.setAttribute("data-theme",theme);
    var rootEl=document.getElementById("root");
    if(!rootEl){console.error("[NEXUS] root not found");return}
    ReactDOM.createRoot(rootEl).render(React.createElement(App,null));
    console.log("[NEXUS-CSOPS] v4.1.0 Started");
  }catch(e){
    console.error("[NEXUS-CSOPS] Fatal:",e);
  }
})();

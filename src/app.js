function App(){
  var _1=React.useState(null),user=_1[0],setUser=_1[1];
  var _2=React.useState(true),loading=_2[0],setLoading=_2[1];
  var _3=React.useState("Updates Feed"),page=_3[0],setPage=_3[1];
  var _4=React.useState(false),sidebarOpen=_4[0],setSidebarOpen=_4[1];

  React.useEffect(function(){initAuth()},[]);

  /* إغلاق Sidebar عند الضغط على Back */
  React.useEffect(function(){
    function handlePop(){setSidebarOpen(false)}
    window.addEventListener("popstate",handlePop);
    return function(){window.removeEventListener("popstate",handlePop)}
  },[]);

  /* منع scroll الـ body عند فتح Sidebar */
  React.useEffect(function(){
    if(sidebarOpen){
      document.body.style.overflow="hidden";
      document.body.style.position="fixed";
      document.body.style.width="100%";
    } else {
      document.body.style.overflow="";
      document.body.style.position="";
      document.body.style.width="";
    }
    return function(){
      document.body.style.overflow="";
      document.body.style.position="";
      document.body.style.width="";
    }
  },[sidebarOpen]);

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
      if(event==="SIGNED_OUT"){
        stopHeartbeat();
        ChannelMgr.unsubAll();
        setUser(null);
        setPage("Updates Feed");
      }
    });
  }

  async function handleLogout(){
    try{
      stopHeartbeat();
      if(user){
        await sb.from("employees").update({
          is_online:false,
          status:"offline",
          last_seen:new Date().toISOString()
        }).eq("id",user.id);
      }
      ChannelMgr.unsubAll();
      await sb.auth.signOut();
      setUser(null);
      setPage("Updates Feed");
      showToast("Signed out","success");
    }catch(e){showToast("Sign out failed","error")}
  }

  function handleSetPage(p){
    setPage(p);
    setSidebarOpen(false);
    /* scroll للأعلى عند تغيير الصفحة */
    var content=document.querySelector(".nx-content");
    if(content)content.scrollTop=0;
  }

  if(loading)return React.createElement("div",{
    style:{
      minHeight:"100vh",
      minHeight:"-webkit-fill-available",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      flexDirection:"column",
      gap:16,
      background:"var(--bg)"
    }
  },
    React.createElement(Spinner,{size:"lg"}),
    React.createElement("p",{style:{color:"var(--text-muted)",fontSize:13}},
      "NEXUS-CSOPS Loading...")
  );

  if(!user)return React.createElement(React.Fragment,null,
    React.createElement(ToastContainer,null),
    React.createElement(LoginPage,{onLogin:setUser})
  );

  return React.createElement(React.Fragment,null,
    React.createElement(ToastContainer,null),
    React.createElement("div",{className:"nx-layout"},

      /* Overlay */
      React.createElement("div",{
        className:"nx-overlay"+(sidebarOpen?" active":""),
        onClick:function(){setSidebarOpen(false)},
        onTouchStart:function(){setSidebarOpen(false)}
      }),

      /* Sidebar */
      React.createElement(Sidebar,{
        user:user,
        page:page,
        setPage:handleSetPage,
        onLogout:handleLogout,
        isOpen:sidebarOpen,
        onClose:function(){setSidebarOpen(false)}
      }),

      /* Main */
      React.createElement("div",{className:"nx-main"},

        /* Mobile Header */
        React.createElement("div",{className:"nx-mobile-header"},
          React.createElement("button",{
            className:"nx-hamburger",
            onClick:function(){setSidebarOpen(true)},
            "aria-label":"Open menu"
          },"☰"),
          React.createElement("span",{
            style:{fontWeight:900,color:"var(--primary)",fontSize:16}
          },"⚡ NEXUS"),
          React.createElement(NxAvatar,{user:user,size:"xs"})
        ),

        /* Content */
        React.createElement("div",{className:"nx-content"},
          React.createElement(PageRouter,{
            page:page,
            user:user,
            setPage:handleSetPage
          })
        )
      )
    )
  );
}
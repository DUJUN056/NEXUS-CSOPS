/* ============================================================
   S19: APP ROOT
   NEXUS-CSOPS v4.1.0
   ============================================================ */
function App(){
  const [emp,        setEmp]        =useState(null);
  const [session,    setSession]    =useState(null);
  const [page,       setPage]       =useState(
    "Updates Feed"
  );
  const [theme,      setTheme]      =useState(
    ()=>localStorage.getItem(
      'csops_theme'
    )||"dark"
  );
  const [splash,     setSplash]     =useState(true);
  const [progress,   setProgress]   =useState(0);
  const [sidebar,    setSidebar]    =useState(false);
  const [freeze,     setFreeze]     =useState(null);
  const [showFreeze, setShowFreeze] =useState(false);
  const [pages,      setPages]      =useState([]);
  const [unread,     setUnread]     =useState(0);
  const [critAlerts, setCritAlerts] =useState([]);
  const [grantedThemes,
         setGrantedThemes]          =useState([]);
  const [mustChangePw,
         setMustChangePw]           =useState(false);

  const heartbeatCleanup=useRef(null);

  /* ── SPLASH ── */
  useEffect(()=>{
    let p=0;
    const t=setInterval(()=>{
      p+=Math.random()*18+5;
      if(p>=100){
        p=100;clearInterval(t);
        setTimeout(()=>setSplash(false),400);
      }
      setProgress(Math.min(p,100));
    },200);
    return()=>clearInterval(t);
  },[]);

  /* ── AUTH ── */
  useEffect(()=>{
    sb.auth.getSession().then(({data})=>{
      if(data.session) loadEmp(data.session);
    });
    const {data:{subscription}}=
      sb.auth.onAuthStateChange((_,s)=>{
        if(!s){
          setEmp(null);setSession(null);
          setPages([]);setUnread(0);
        }
      });
    return()=>subscription.unsubscribe();
  },[]);

  async function loadEmp(s){
    try{
      const {data}=await withRetry(()=>
        sb.from("employees")
          .select("*")
          .eq("auth_user_id",s.user.id)
          .single()
      );
      if(data){
        setEmp(data);
        setSession(s);
        setMustChangePw(
          data.must_change_password===true
        );
        loadPages(data);
        loadGrantedThemes(data.id);
        heartbeatCleanup.current=
          startHeartbeat(data.id);
        loadUnread(data.id);
        loadCritAlerts();
        loadFreeze();
      }
    }catch(_){}
  }

  /* ── LOAD PAGES ── */
  async function loadPages(e){
    if(!e) return;
    if(isOwn(e)){
      setPages(Object.keys(PA));
      return;
    }
    try{
      const [permsRes,bsRes]=
        await Promise.all([
          sb.from("page_permissions")
            .select("*")
            .eq("employee_id",e.id),
          sb.from("system_settings")
            .select("value")
            .eq("key","blank_slate_mode")
            .single()
        ]);
      const perms=permsRes.data||[];
      const blankSlate=
        bsRes.data?.value?.active===true;
      const result=Object.keys(PA).filter(pg=>{
        const override=perms.find(
          p=>p.page_name===pg
        );
        if(override) return override.is_visible;
        if(blankSlate)
          return GUARANTEED_PAGES.includes(pg);
        return PA[pg]?.includes(e.role)??false;
      });
      setPages(result);
      setPage(prev=>{
        if(!result.includes(prev)&&
           result.length>0){
          return result[0];
        }
        return prev;
      });
    }catch(_){}
  }

  async function loadGrantedThemes(id){
    const {data}=await sb
      .from("theme_delegations")
      .select("theme_id")
      .eq("employee_id",id)
      .eq("is_active",true);
    setGrantedThemes(
      (data||[]).map(d=>d.theme_id)
    );
  }

  async function loadUnread(id){
    const {count}=await sb
      .from("notifications")
      .select("*",{count:"exact",head:true})
      .eq("employee_id",id)
      .eq("is_read",false);
    setUnread(count||0);
  }

  async function loadCritAlerts(){
    const {data}=await sb
      .from("critical_alerts")
      .select("*")
      .eq("is_active",true);
    setCritAlerts(data||[]);
  }

  async function loadFreeze(){
    const {data}=await sb
      .from("system_settings")
      .select("value")
      .eq("key","freeze_mode")
      .single();
    setFreeze(data?.value||null);
  }

  /* ── HEARTBEAT ── */
  function startHeartbeat(id){
    let isActive=true;
    let timerId=null;

    async function beat(){
      if(!isActive) return;
      try{
        await sb.from("employees").update({
          last_heartbeat:
            new Date().toISOString()
        }).eq("id",id);
      }catch(_){}
    }

    beat();
    timerId=setInterval(beat,60000);
    window._csops_heartbeat=timerId;

    function handleVisibility(){
      if(document.visibilityState==="hidden"){
        if(timerId) clearInterval(timerId);
        timerId=setInterval(beat,120000);
        window._csops_heartbeat=timerId;
      }else{
        if(timerId) clearInterval(timerId);
        beat();
        timerId=setInterval(beat,60000);
        window._csops_heartbeat=timerId;
      }
    }

    async function handleUnload(){
      isActive=false;
      if(timerId) clearInterval(timerId);
      try{
        if(navigator.sendBeacon){
          const url=
            SUPABASE_URL+
            "/rest/v1/employees"+
            "?id=eq."+id;
          const body=JSON.stringify({
            status:"Offline",
            last_heartbeat:
              new Date().toISOString()
          });
          navigator.sendBeacon(
            url,
            new Blob(
              [body],
              {type:"application/json"}
            )
          );
        }else{
          await sb.from("employees").update({
            status:"Offline",
            last_heartbeat:
              new Date().toISOString()
          }).eq("id",id);
        }
      }catch(_){}
    }

    document.addEventListener(
      'visibilitychange',handleVisibility
    );
    window.addEventListener(
      'beforeunload',handleUnload
    );

    return function cleanup(){
      isActive=false;
      if(timerId) clearInterval(timerId);
      document.removeEventListener(
        'visibilitychange',handleVisibility
      );
      window.removeEventListener(
        'beforeunload',handleUnload
      );
    };
  }

  /* ── REALTIME ── */
  useEffect(()=>{
    if(!emp) return;

    ChannelMgr.sub(
      "pages-watch","page_permissions",
      ()=>loadPages(emp),
      {filter:"employee_id=eq."+emp.id}
    );

    ChannelMgr.sub(
      "bs-watch","system_settings",
      (payload)=>{
        if(
          payload.new?.key===
            "blank_slate_mode"||
          payload.old?.key===
            "blank_slate_mode"
        ){
          loadPages(emp);
        }
      }
    );

    ChannelMgr.sub(
      "suspend-watch","employees",
      async(payload)=>{
        if(
          payload.new?.is_suspended===true&&
          payload.new?.id===emp.id
        ){
          if(heartbeatCleanup.current){
            heartbeatCleanup.current();
            heartbeatCleanup.current=null;
          }
          try{
            await sb.auth.signOut();
          }catch(_){}
          setEmp(null);
          setSession(null);
          setPages([]);
          setUnread(0);
        }
      },
      {filter:"id=eq."+emp.id}
    );

    ChannelMgr.sub(
      "freeze-watch","system_settings",
      ()=>loadFreeze()
    );

    ChannelMgr.sub(
      "alerts-watch","critical_alerts",
      ()=>loadCritAlerts()
    );

    ChannelMgr.sub(
      "notif-watch","notifications",
      ()=>loadUnread(emp.id),
      {filter:"employee_id=eq."+emp.id}
    );

    return()=>{
      ChannelMgr.unsub("pages-watch");
      ChannelMgr.unsub("bs-watch");
      ChannelMgr.unsub("suspend-watch");
      ChannelMgr.unsub("freeze-watch");
      ChannelMgr.unsub("alerts-watch");
      ChannelMgr.unsub("notif-watch");
    };
  },[emp]);

  /* ── THEME ── */
  useEffect(()=>{
    document.documentElement.setAttribute(
      'data-theme',theme
    );
    localStorage.setItem('csops_theme',theme);
  },[theme]);

  function handleTheme(t){
    if(t==="saudi") t=getSaudiPeriod();
    setTheme(t);
  }

  useEffect(()=>{
    if(!theme.startsWith("saudi")) return;
    const t=setInterval(()=>{
      const next=getSaudiPeriod();
      if(next!==theme) setTheme(next);
    },60000);
    return()=>clearInterval(t);
  },[theme]);

  /* ── LOGIN ── */
  function handleLogin(e,s){
    setEmp(e);setSession(s);
    setMustChangePw(
      e.must_change_password===true
    );
    loadPages(e);
    loadGrantedThemes(e.id);
    heartbeatCleanup.current=
      startHeartbeat(e.id);
    loadUnread(e.id);
    loadCritAlerts();
    loadFreeze();
  }

  /* ── LOGOUT ── */
  async function handleLogout(){
    if(!confirm("Sign out?")) return;
    try{
      if(heartbeatCleanup.current){
        heartbeatCleanup.current();
        heartbeatCleanup.current=null;
      }
      await sb.from("employees").update({
        status:"Offline",
        last_heartbeat:
          new Date().toISOString()
      }).eq("id",emp.id);
    }catch(_){}
    ChannelMgr.unsubAll();
    await sb.auth.signOut();
    setEmp(null);setSession(null);
    setPages([]);setUnread(0);
    setCritAlerts([]);setFreeze(null);
  }

  /* ── NAVIGATION ── */
  function handleNav(pg){
    setPage(pg);setSidebar(false);
    if(pg==="Notifications"){
      setTimeout(()=>
        emp&&loadUnread(emp.id),500
      );
    }
  }

  /* ── DISMISS ALERT ── */
  async function dismissAlert(id){
    const alert=critAlerts.find(a=>a.id===id);
    if(!alert) return;
    try{
      if(alert.admin_close&&
         !isOwn(emp)&&
         !isMgr(emp?.role)){
        const dismissed=Array.isArray(
          alert.dismissed_by
        )?alert.dismissed_by:[];
        await withRetry(()=>
          sb.from("critical_alerts").update({
            dismissed_by:[...dismissed,emp.id]
          }).eq("id",id)
        );
      }else{
        await withRetry(()=>
          sb.from("critical_alerts").update({
            is_active:false
          }).eq("id",id)
        );
      }
      loadCritAlerts();
    }catch(_){}
  }

  /* ── PAGE RENDERER ── */
  function renderPage(){
    const props={emp,key:page};
    switch(page){
      case "Updates Feed":
        return <UpdatesFeed {...props}/>;
      case "Schedule":
        return <Schedule {...props}/>;
      case "Attendance":
        return <Attendance {...props}/>;
      case "Performance":
        return <Performance {...props}/>;
      case "Queue":
        return <QueueMonitor {...props}/>;
      case "Live Floor":
        return <LiveFloor {...props}/>;
      case "Notifications":
        return <Notifications {...props}/>;
      case "My Profile":
        return(
          <MyProfile {...props}
            onUpdate={e=>setEmp(e)}/>
        );
      case "My Workspace":
        return <MyWorkspace {...props}/>;
      case "System Settings":
        return <SystemSettings {...props}/>;
      case "Owner Analytics":
        return <OwnerAnalytics {...props}/>;
      default:
        return <Placeholder page={page}/>;
    }
  }

  /* ── RENDER GUARDS ── */
  if(splash) return(
    <SplashScreen progress={progress}/>
  );

  if(!emp||!session) return(
    <Login onLogin={handleLogin}/>
  );

  if(emp.is_suspended) return(
    <SuspensionScreen
      reason={emp.suspension_reason}/>
  );

  if(mustChangePw) return(
    <ForcePasswordChange emp={emp}
      onComplete={()=>
        setMustChangePw(false)}/>
  );

  const isFrozen=freeze?.active===true;

  /* ── MAIN RENDER ── */
  return(
    <div className="app-root">
      <LiveBackground theme={theme}/>
      {isFrozen&&!canFreeze(emp)&&(
        <FreezeOverlay freeze={freeze}/>
      )}
      <CriticalAlertDisplay
        alerts={critAlerts}
        empId={emp.id}
        onDismiss={dismissAlert}
        isAdmin={
          isOwn(emp)||isMgr(emp.role)
        }/>
      <NetworkBanner/>
      <Header
        emp={emp}
        onLogout={handleLogout}
        page={page}
        onNav={handleNav}
        theme={theme}
        onTheme={handleTheme}
        unread={unread}
        onToggleSidebar={()=>
          setSidebar(s=>!s)}
        freeze={freeze}
        onToggleFreeze={()=>
          setShowFreeze(true)}
        grantedThemes={grantedThemes}/>
      <Sidebar
        emp={emp}
        page={page}
        onNav={handleNav}
        isOpen={sidebar}
        onClose={()=>setSidebar(false)}
        pages={pages}/>
      <main className="app-main">
        <div className="page-container">
          <ErrorBoundary key={page}>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </main>
      <BottomNav
        emp={emp}
        page={page}
        onNav={handleNav}
        pages={pages}
        unread={unread}/>
      {showFreeze&&(
        <FreezeModal
          emp={emp}
          freeze={freeze}
          onClose={()=>setShowFreeze(false)}
          onDone={()=>{
            setShowFreeze(false);
            loadFreeze();
          }}/>
      )}
    </div>
  );
}

/* ── MOUNT ── */
const root=ReactDOM.createRoot(
  document.getElementById('root')
);
root.render(
  <AppProvider>
    <ErrorBoundary>
      <App/>
    </ErrorBoundary>
  </AppProvider>
);

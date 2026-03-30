/* ============================================================
   S01: HEADER
   ============================================================ */
function Header({
  emp,onLogout,page,onNav,
  theme,onTheme,unread,
  onToggleSidebar,freeze,
  onToggleFreeze,grantedThemes
}){
  const [showThemes, setShowThemes]=useState(false);
  const [showStatus, setShowStatus]=useState(false);
  const [showUser,   setShowUser]  =useState(false);
  const themeRef=useRef(null);
  const statusRef=useRef(null);
  const userRef=useRef(null);

  /* Close dropdowns on outside click */
  useEffect(()=>{
    function handler(e){
      if(themeRef.current&&
         !themeRef.current.contains(e.target)){
        setShowThemes(false);
      }
      if(statusRef.current&&
         !statusRef.current.contains(e.target)){
        setShowStatus(false);
      }
      if(userRef.current&&
         !userRef.current.contains(e.target)){
        setShowUser(false);
      }
    }
    document.addEventListener('mousedown',handler);
    return()=>
      document.removeEventListener(
        'mousedown',handler
      );
  },[]);

  async function setStatus(s){
    try{
      await withRetry(()=>
        sb.from("employees").update({
          status:s,
          status_since:new Date().toISOString()
        }).eq("id",emp.id)
      );
      setShowStatus(false);
    }catch(err){
      console.error(err);
    }
  }

  const sc=SC[emp?.status]||SC["Offline"];
  const rc=RC[emp?.role]||RC.Agent;

  /* Available themes for this user */
  const availThemes=useMemo(()=>
    THEMES_ALL.filter(t=>{
      if(t.tier==="free") return true;
      if(t.tier==="owner") return isOwn(emp);
      if(t.tier==="premium"){
        return isOwn(emp)||
          grantedThemes.includes(t.id);
      }
      return false;
    })
  ,[emp,grantedThemes]);

  return(
    <header className="header">
      {/* Left */}
      <div className="header-left">
        <button
          className="btn-icon btn-icon-sm"
          onClick={onToggleSidebar}
          style={{
            background:"none",
            border:"none"
          }}>
          ☰
        </button>
        <div className="header-logo">
          <span className="header-logo-icon">
            🏰
          </span>
          <span className="header-logo-text">
            {APP}
          </span>
        </div>
      </div>

      {/* Center */}
      <div className="header-center">
        <span className="header-page-title">
          {PI[page]||"📄"} {page}
        </span>
      </div>

      {/* Right */}
      <div className="header-right">

        {/* Freeze Toggle */}
        {canFreeze(emp)&&(
          <button
            className={
              "btn-icon btn-icon-sm"+
              (freeze?.active
                ?" btn-active":"")
            }
            onClick={onToggleFreeze}
            title={freeze?.active
              ?"Unfreeze System"
              :"Freeze System"
            }
            style={{
              color:freeze?.active
                ?"var(--danger)"
                :"var(--text-muted)"
            }}>
            {freeze?.active?"🔒":"🔓"}
          </button>
        )}

        {/* Notifications */}
        <button
          className="btn-icon btn-icon-sm"
          style={{position:"relative"}}
          onClick={()=>onNav("Notifications")}>
          🔔
          {unread>0&&(
            <span style={{
              position:"absolute",
              top:-4,right:-4,
              background:"var(--danger)",
              color:"#fff",
              fontSize:9,fontWeight:800,
              padding:"1px 5px",
              borderRadius:"var(--radius-full)",
              minWidth:16,textAlign:"center",
              border:"2px solid var(--bg)"
            }}>
              {unread>99?"99+":unread}
            </span>
          )}
        </button>

        {/* Theme Picker */}
        <div className="dropdown"
          ref={themeRef}>
          <button
            className="btn-icon btn-icon-sm"
            onClick={()=>{
              setShowThemes(s=>!s);
              setShowStatus(false);
              setShowUser(false);
            }}
            title="Change Theme">
            🎨
          </button>
          {showThemes&&(
            <div className="dropdown-menu">
              <ThemePicker
                current={theme}
                themes={availThemes}
                onSelect={(t)=>{
                  onTheme(t);
                  setShowThemes(false);
                }}/>
            </div>
          )}
        </div>

        {/* Status Picker */}
        <div className="dropdown"
          ref={statusRef}>
          <button
            className="btn-icon btn-icon-sm"
            onClick={()=>{
              setShowStatus(s=>!s);
              setShowThemes(false);
              setShowUser(false);
            }}
            title="Change Status"
            style={{
              background:sc.c+"18",
              border:"1px solid "+sc.c+"30",
              color:sc.c
            }}>
            {sc.i}
          </button>
          {showStatus&&(
            <div className="dropdown-menu">
              <StatusPicker
                current={emp?.status}
                onSelect={setStatus}/>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="dropdown"
          ref={userRef}>
          <button
            className="btn-icon btn-icon-sm"
            onClick={()=>{
              setShowUser(s=>!s);
              setShowThemes(false);
              setShowStatus(false);
            }}
            style={{
              background:`linear-gradient(135deg,
                ${rc.c}22,${rc.c}11)`,
              border:"1px solid "+rc.c+"30",
              fontSize:18
            }}>
            {rc.i}
          </button>
          {showUser&&(
            <div className="dropdown-menu">
              <UserMenu
                emp={emp}
                onNav={(p)=>{
                  onNav(p);
                  setShowUser(false);
                }}
                onLogout={onLogout}/>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── ThemePicker ── */
function ThemePicker({current,themes,onSelect}){
  return(
    <div className="theme-picker">
      {themes.map(t=>(
        <div key={t.id}
          className={
            "theme-swatch"+
            (current===t.id||
             (t.id==="saudi"&&
              current.startsWith("saudi"))
              ?" active":"")
          }
          onClick={()=>onSelect(t.id)}>
          <div
            className="theme-swatch-circle"
            style={{background:t.preview}}>
            <div style={{
              position:"absolute",inset:0,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontSize:14
            }}>
              {t.icon}
            </div>
          </div>
          <span className="theme-swatch-label">
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── StatusPicker ── */
function StatusPicker({current,onSelect}){
  return(
    <div className="status-picker">
      {Object.entries(SC).map(([s,cfg])=>(
        <button key={s}
          className={
            "status-picker-item"+
            (current===s?" active":"")
          }
          onClick={()=>onSelect(s)}>
          <span style={{fontSize:16}}>
            {cfg.i}
          </span>
          <span>{s}</span>
          {current===s&&(
            <span style={{
              marginLeft:"auto",
              fontSize:11,
              color:"var(--primary)"
            }}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── UserMenu ── */
function UserMenu({emp,onNav,onLogout}){
  const rc=RC[emp?.role]||RC.Agent;
  return(
    <div style={{
      background:"var(--card)",
      border:"1px solid var(--border2)",
      borderRadius:"var(--radius-lg)",
      padding:8,minWidth:200,
      boxShadow:"var(--shadow-lg)"
    }}>
      {/* User Info */}
      <div style={{
        padding:"10px 12px",
        marginBottom:4,
        borderBottom:"1px solid var(--border)"
      }}>
        <div style={{
          display:"flex",
          alignItems:"center",gap:10
        }}>
          <div style={{
            width:36,height:36,
            borderRadius:10,
            background:`linear-gradient(135deg,
              ${rc.c},${rc.c}88)`,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            fontSize:18,flexShrink:0
          }}>{rc.i}</div>
          <div style={{minWidth:0}}>
            <div style={{
              fontSize:13,fontWeight:800,
              color:"var(--text)",
              overflow:"hidden",
              textOverflow:"ellipsis",
              whiteSpace:"nowrap"
            }} dir="auto">
              {emp?.full_name}
            </div>
            <div style={{
              fontSize:10,
              color:"var(--text-muted)"
            }}>
              {emp?.role}
              {emp?.is_owner?" · 👑 Owner":""}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      {[
        {i:"👤",l:"My Profile",
         p:"My Profile"},
        {i:"📓",l:"My Workspace",
         p:"My Workspace"},
        ...(isOwn(emp)||
            emp?.role==="Manager"?[
          {i:"⚙️",l:"System Settings",
           p:"System Settings"}
        ]:[])
      ].map(item=>(
        <button key={item.p}
          className="status-picker-item"
          onClick={()=>onNav(item.p)}>
          <span style={{fontSize:15}}>
            {item.i}
          </span>
          <span>{item.l}</span>
        </button>
      ))}

      <div style={{
        borderTop:"1px solid var(--border)",
        marginTop:4,paddingTop:4
      }}>
        <button
          className="status-picker-item"
          style={{color:"var(--danger)"}}
          onClick={onLogout}>
          <span style={{fontSize:15}}>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   S02: SIDEBAR
   ============================================================ */
function Sidebar({
  emp,page,onNav,isOpen,onClose,pages
}){
  const groups=useMemo(()=>{
    const core=["Updates Feed","Live Floor",
                "Queue","Schedule","Attendance",
                "Performance"];
    const personal=["Notifications",
                    "My Profile","My Workspace"];
    const admin=["System Settings"];
    return[
      {
        label:"Operations",
        items:core.filter(p=>pages.includes(p))
      },
      {
        label:"Personal",
        items:personal.filter(
          p=>pages.includes(p)
        )
      },
      ...(pages.some(p=>admin.includes(p))?[{
        label:"Admin",
        items:admin.filter(p=>pages.includes(p))
      }]:[])
    ].filter(g=>g.items.length>0);
  },[pages]);

  return(
    <>
      {/* Overlay */}
      <div
        className={
          "sidebar-overlay"+
          (isOpen?" show":"")
        }
        onClick={onClose}/>

      {/* Sidebar */}
      <nav className={
        "sidebar"+(isOpen?" open":"")
      }>
        {/* Employee Card */}
        <div style={{
          padding:"16px 12px",
          borderBottom:"1px solid var(--border)"
        }}>
          <EmployeeCard emp={emp}/>
        </div>

        {/* Nav Groups */}
        {groups.map(g=>(
          <div key={g.label}
            className="sidebar-section">
            <div className="sidebar-label">
              {g.label}
            </div>
            {g.items.map(p=>(
              <button key={p}
                className={
                  "sidebar-item"+
                  (page===p?" active":"")
                }
                onClick={()=>onNav(p)}>
                <span
                  className="sidebar-item-icon">
                  {PI[p]||"📄"}
                </span>
                <span>{p}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop:"auto",
          padding:"12px 8px",
          borderTop:"1px solid var(--border)"
        }}>
          <div style={{
            fontSize:10,
            color:"var(--text-muted)",
            textAlign:"center",
            fontWeight:600
          }}>
            {APP} · v{VER}
          </div>
        </div>
      </nav>
    </>
  );
}

/* ── EmployeeCard (Sidebar) ── */
function EmployeeCard({emp}){
  const rc=RC[emp?.role]||RC.Agent;
  const sc=SC[emp?.status]||SC["Offline"];
  const timer=useTimer(
    ["Online","On Call","Busy"]
      .includes(emp?.status)
      ?emp?.status_since:null
  );
  return(
    <div style={{
      display:"flex",
      alignItems:"center",gap:10
    }}>
      <div style={{
        width:40,height:40,borderRadius:12,
        background:`linear-gradient(135deg,
          ${rc.c},${rc.c}88)`,
        display:"flex",alignItems:"center",
        justifyContent:"center",
        fontSize:20,flexShrink:0,
        position:"relative"
      }}>
        {rc.i}
        <div style={{
          position:"absolute",
          bottom:-2,right:-2,
          width:11,height:11,
          borderRadius:"50%",
          background:sc.c,
          border:"2px solid var(--bg2)",
          animation:sc.pulse
            ?"pulse 2s infinite":"none"
        }}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{
          fontSize:12,fontWeight:800,
          color:"var(--text)",
          overflow:"hidden",
          textOverflow:"ellipsis",
          whiteSpace:"nowrap"
        }} dir="auto">
          {emp?.full_name}
        </div>
        <div style={{
          fontSize:10,
          color:"var(--text-muted)",
          marginTop:1
        }}>
          {emp?.role}
          {emp?.is_owner?" · 👑":""}
        </div>
        {timer!=="--"&&(
          <div style={{
            fontSize:9,
            color:sc.c,marginTop:1,
            fontVariantNumeric:"tabular-nums",
            fontWeight:700
          }}>{timer}</div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   S03: BOTTOM NAV
   ============================================================ */
function BottomNav({emp,page,onNav,pages}){
  const items=useMemo(()=>{
    const priority=[
      "Updates Feed","Live Floor",
      "Queue","Attendance","My Profile"
    ];
    const available=priority.filter(
      p=>pages.includes(p)
    );
    /* Fill up to 5 items */
    if(available.length<5){
      pages.forEach(p=>{
        if(!available.includes(p)&&
           available.length<5){
          available.push(p);
        }
      });
    }
    return available.slice(0,5);
  },[pages]);

  return(
    <nav className="bottom-nav">
      {items.map(p=>(
        <button key={p}
          className={
            "bottom-nav-item"+
            (page===p?" active":"")
          }
          onClick={()=>onNav(p)}>
          <span className="bottom-nav-icon">
            {PI[p]||"📄"}
          </span>
          <span className="bottom-nav-label">
            {p==="Updates Feed"?"Feed"
            :p==="Live Floor"?"Floor"
            :p==="My Profile"?"Profile"
            :p==="My Workspace"?"Notes"
            :p==="System Settings"?"Settings"
            :p}
          </span>
          {p==="Notifications"&&
           /* unread handled via prop */
           null}
        </button>
      ))}
    </nav>
  );
}

/* ============================================================
   S04: DASHBOARD (Updates Feed default page)
   ============================================================ */
function Dashboard({emp,onNav}){
  const [stats,  setStats]  =useState(null);
  const [loading,setLoading]=useState(true);
  const [online, setOnline] =useState([]);

  useEffect(()=>{
    load();
    ChannelMgr.sub(
      "dash-rt","employees",()=>loadOnline()
    );
    return()=>ChannelMgr.unsub("dash-rt");
  },[]);

  async function load(){
    await Promise.all([
      loadStats(),loadOnline()
    ]);
    setLoading(false);
  }

  async function loadStats(){
    const todayStr=new Date()
      .toISOString().split("T")[0];
    const [att,perf,notif]=await Promise.all([
      withRetry(()=>
        sb.from("attendance")
          .select("id,clock_in,clock_out")
          .eq("employee_id",emp.id)
          .gte("clock_in",todayStr+"T00:00:00")
          .maybeSingle()
      ),
      withRetry(()=>
        sb.from("performance_records")
          .select("score")
          .eq("employee_id",emp.id)
          .order("created_at",{ascending:false})
          .limit(1)
          .maybeSingle()
      ),
      withRetry(()=>
        sb.from("notifications")
          .select("*",{count:"exact",head:true})
          .eq("employee_id",emp.id)
          .eq("is_read",false)
      )
    ]);
    setStats({
      clockedIn:att.data&&!att.data.clock_out,
      clockIn:att.data?.clock_in||null,
      lastScore:perf.data?.score||null,
      unread:notif.count||0
    });
  }

  async function loadOnline(){
    const {data}=await withRetry(()=>
      sb.from("employees")
        .select(
          "id,full_name,role,status,"+
          "last_heartbeat"
        )
        .in("status",["Online","On Call","Busy"])
        .order("full_name")
        .limit(12)
    );
    setOnline(data||[]);
  }

  const timer=useTimer(
    stats?.clockedIn?stats.clockIn:null
  );

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            👋 Welcome back
          </h1>
          <p className="page-subtitle"
            dir="auto">
            {emp?.full_name}
            {emp?.is_owner?" · 👑 Owner":""}
          </p>
        </div>
        <div style={{
          fontSize:11,
          color:"var(--text-muted)",
          textAlign:"right",fontWeight:600
        }}>
          {new Date().toLocaleDateString(
            "en-US",{
              weekday:"long",
              month:"long",day:"numeric"
            }
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {loading?(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(140px,1fr))",
          gap:12,marginBottom:20
        }}>
          {[1,2,3,4].map(i=>(
            <div key={i} className="skeleton"
              style={{height:100}}/>
          ))}
        </div>
      ):(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(140px,1fr))",
          gap:12,marginBottom:20
        }}>
          {[
            {
              i:stats?.clockedIn?"⏱️":"🕐",
              l:"Today",
              v:stats?.clockedIn
                ?timer:"Not clocked in",
              c:stats?.clockedIn
                ?"var(--success)"
                :"var(--text-muted)",
              action:()=>onNav("Attendance")
            },
            {
              i:"👥",
              l:"Online Now",
              v:online.length,
              c:"var(--primary)",
              action:()=>onNav("Live Floor")
            },
            {
              i:"📊",
              l:"Last Score",
              v:stats?.lastScore!==null
                ?stats.lastScore+"%":"--",
              c:stats?.lastScore>=80
                ?"var(--success)"
                :stats?.lastScore>=60
                  ?"var(--warning)"
                  :"var(--text-muted)",
              action:()=>onNav("Performance")
            },
            {
              i:"🔔",
              l:"Unread",
              v:stats?.unread||0,
              c:stats?.unread>0
                ?"var(--danger)"
                :"var(--text-muted)",
              action:()=>onNav("Notifications")
            }
          ].map(s=>(
            <div key={s.l}
              className="stat-card"
              style={{cursor:"pointer"}}
              onClick={s.action}>
              <span className="stat-icon">
                {s.i}
              </span>
              <div className="stat-value"
                style={{
                  color:s.c,fontSize:18
                }}>
                {s.v}
              </div>
              <div className="stat-label">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Online Team */}
      {online.length>0&&(
        <div className="card"
          style={{marginBottom:16}}>
          <div className="card-header">
            <div>
              <div className="card-title">
                🟢 Online Team
              </div>
              <div className="card-subtitle">
                {online.length} active now
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={()=>onNav("Live Floor")}>
              View All →
            </button>
          </div>
          <div style={{
            display:"flex",
            flexWrap:"wrap",gap:8
          }}>
            {online.map(a=>{
              const rc2=RC[a.role]||RC.Agent;
              const sc2=SC[a.status]
                ||SC["Offline"];
              return(
                <div key={a.id} style={{
                  display:"flex",
                  alignItems:"center",
                  gap:7,
                  padding:"6px 10px",
                  background:"var(--glass2)",
                  border:"1px solid var(--border)",
                  borderRadius:20
                }}>
                  <span style={{fontSize:14}}>
                    {rc2.i}
                  </span>
                  <span style={{
                    fontSize:11,fontWeight:700,
                    color:"var(--text)"
                  }} dir="auto">
                    {a.full_name.split(" ")[0]}
                  </span>
                  <span style={{
                    width:6,height:6,
                    borderRadius:"50%",
                    background:sc2.c,
                    flexShrink:0
                  }}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-title"
          style={{marginBottom:14}}>
          ⚡ Quick Actions
        </div>
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(130px,1fr))",
          gap:8
        }}>
          {[
            {i:"✅",l:"Clock In/Out",
             p:"Attendance"},
            {i:"📅",l:"My Schedule",
             p:"Schedule"},
            {i:"📊",l:"Performance",
             p:"Performance"},
            {i:"📓",l:"My Notes",
             p:"My Workspace"}
          ].map(a=>(
            <button key={a.p}
              className="btn btn-ghost"
              style={{
                flexDirection:"column",
                gap:6,padding:"14px 10px",
                height:"auto"
              }}
              onClick={()=>onNav(a.p)}>
              <span style={{fontSize:22}}>
                {a.i}
              </span>
              <span style={{
                fontSize:11,fontWeight:700
              }}>
                {a.l}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   S05: STATUS MANAGER (My Status Page)
   ============================================================ */
function StatusManager({emp}){
  const {showToast}=useApp();
  const [current,setCurrent]=useState(
    emp?.status||"Offline"
  );
  const [note,   setNote]   =useState(
    emp?.status_note||""
  );
  const [loading,setLoading]=useState(false);
  const [history,setHistory]=useState([]);
  const [hLoad,  setHLoad]  =useState(true);
  const timer=useTimer(emp?.status_since);

  useEffect(()=>{loadHistory();},[]);

  async function loadHistory(){
    setHLoad(true);
    const {data}=await withRetry(()=>
      sb.from("status_history")
        .select("*")
        .eq("employee_id",emp.id)
        .order("started_at",{ascending:false})
        .limit(20)
    );
    setHistory(data||[]);
    setHLoad(false);
  }

  async function setStatus(s){
    setLoading(true);
    try{
      await withRetry(()=>
        sb.from("employees").update({
          status:s,
          status_note:note||null,
          status_since:new Date().toISOString()
        }).eq("id",emp.id)
      );
      setCurrent(s);
      showToast("Status: "+s,"success");
      setTimeout(loadHistory,500);
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setLoading(false);}
  }

  const sc=SC[current]||SC["Offline"];

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {sc.i} My Status
          </h1>
          <p className="page-subtitle">
            Manage your availability
          </p>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="card"
        style={{
          marginBottom:16,
          textAlign:"center",
          padding:"28px 20px"
        }}>
        <div style={{
          fontSize:52,marginBottom:12,
          animation:"float 3s ease-in-out infinite"
        }}>{sc.i}</div>
        <div style={{
          fontSize:20,fontWeight:800,
          color:sc.c,marginBottom:6
        }}>{current}</div>
        {timer!=="--"&&(
          <div style={{
            fontSize:24,fontWeight:800,
            color:"var(--text)",
            fontVariantNumeric:"tabular-nums",
            marginBottom:8,letterSpacing:1
          }}>{timer}</div>
        )}
        <div style={{
          fontSize:12,
          color:"var(--text-muted)"
        }}>
          Since {fmt.time(emp?.status_since)}
        </div>
      </div>

      {/* Note */}
      <div className="card"
        style={{marginBottom:16}}>
        <div className="card-title"
          style={{marginBottom:10}}>
          📝 Status Note
        </div>
        <div style={{
          display:"flex",gap:8
        }}>
          <input type="text"
            className="input"
            value={note}
            onChange={e=>setNote(e.target.value)}
            placeholder="Optional note..."
            dir="auto"
            maxLength={100}/>
        </div>
      </div>

      {/* Status Grid */}
      <div className="card"
        style={{marginBottom:16}}>
        <div className="card-title"
          style={{marginBottom:14}}>
          🔄 Change Status
        </div>
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(120px,1fr))",
          gap:8
        }}>
          {Object.entries(SC).map(([s,cfg])=>(
            <button key={s}
              className={
                "btn btn-ghost"+
                (current===s?" btn-active":"")
              }
              style={{
                flexDirection:"column",
                gap:4,padding:"12px 8px",
                height:"auto",
                borderColor:current===s
                  ?cfg.c+"50":"var(--border)",
                color:current===s
                  ?cfg.c:"var(--text-muted)"
              }}
              onClick={()=>setStatus(s)}
              disabled={loading||current===s}>
              <span style={{fontSize:20}}>
                {cfg.i}
              </span>
              <span style={{
                fontSize:10,fontWeight:700
              }}>
                {s}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-title"
          style={{marginBottom:14}}>
          📋 Status History
        </div>
        {hLoad?(
          <div style={{
            display:"flex",
            flexDirection:"column",gap:6
          }}>
            {[1,2,3].map(i=>(
              <div key={i} className="skeleton"
                style={{height:48}}/>
            ))}
          </div>
        ):history.length===0?(
          <EmptyState icon="📋"
            title="No history yet"/>
        ):(
          <div style={{
            display:"flex",
            flexDirection:"column",gap:4
          }}>
            {history.map(h=>{
              const sc2=SC[h.status]
                ||SC["Offline"];
              return(
                <div key={h.id} style={{
                  display:"flex",
                  alignItems:"center",
                  gap:10,
                  padding:"8px 12px",
                  background:"var(--glass2)",
                  border:"1px solid var(--border)",
                  borderRadius:10
                }}>
                  <span style={{fontSize:16}}>
                    {sc2.i}
                  </span>
                  <div style={{flex:1}}>
                    <div style={{
                      fontSize:12,fontWeight:700,
                      color:sc2.c
                    }}>{h.status}</div>
                    <div style={{
                      fontSize:10,
                      color:"var(--text-muted)",
                      marginTop:1
                    }}>
                      {fmt.time(h.started_at)}
                      {h.ended_at
                        ?" → "+fmt.time(h.ended_at)
                        :" → now"
                      }
                    </div>
                  </div>
                  {h.duration_ms&&(
                    <div style={{
                      fontSize:11,fontWeight:700,
                      color:"var(--text-muted)",
                      flexShrink:0
                    }}>
                      {fmt.duration(h.duration_ms)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   S06: OWNER ANALYTICS
   ============================================================ */
function OwnerAnalytics({emp}){
  const [data,   setData]   =useState(null);
  const [loading,setLoading]=useState(true);
  const [period, setPeriod] =useState("today");

  useEffect(()=>{load();},[period]);

  async function load(){
    setLoading(true);
    try{
      const days=period==="today"?1
        :period==="week"?7:30;
      const from=new Date(
        Date.now()-days*24*3600*1000
      ).toISOString();

      const [
        empRes,attRes,perfRes,
        queueRes,alertRes
      ]=await Promise.all([
        withRetry(()=>
          sb.from("employees")
            .select(
              "id,role,department,status,"+
              "is_suspended,last_heartbeat"
            )
        ),
        withRetry(()=>
          sb.from("attendance")
            .select("id,employee_id,"+
              "clock_in,clock_out")
            .gte("clock_in",from)
        ),
        withRetry(()=>
          sb.from("performance_records")
            .select("score,employee_id")
            .gte("created_at",from)
        ),
        withRetry(()=>
          sb.from("queue_stats").select("*")
        ),
        withRetry(()=>
          sb.from("critical_alerts")
            .select("id,is_active")
        )
      ]);

      const emps=empRes.data||[];
      const atts=attRes.data||[];
      const perfs=perfRes.data||[];
      const queues=queueRes.data||[];
      const alerts=alertRes.data||[];

      const online=emps.filter(e=>
        ["Online","On Call","Busy"]
          .includes(e.status)
      ).length;

      const avgScore=perfs.length
        ?Math.round(
          perfs.reduce(
            (a,b)=>a+(b.score||0),0
          )/perfs.length
        ):null;

      const totalWaiting=queues.reduce(
        (a,q)=>a+(q.waiting||0),0
      );

      /* Dept breakdown */
      const deptMap={};
      emps.forEach(e=>{
        if(!deptMap[e.department])
          deptMap[e.department]=0;
        deptMap[e.department]++;
      });

      /* Role breakdown */
      const roleMap={};
      emps.forEach(e=>{
        if(!roleMap[e.role])
          roleMap[e.role]=0;
        roleMap[e.role]++;
      });

      setData({
        totalEmp:emps.length,
        online,
        suspended:emps.filter(
          e=>e.is_suspended
        ).length,
        totalAtt:atts.length,
        avgScore,
        totalWaiting,
        activeAlerts:alerts.filter(
          a=>a.is_active
        ).length,
        deptMap,roleMap,queues
      });
    }finally{setLoading(false);}
  }

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            👑 Owner Analytics
          </h1>
          <p className="page-subtitle">
            Full system overview
          </p>
        </div>
        <select className="input"
          style={{width:"auto",minWidth:130}}
          value={period}
          onChange={e=>setPeriod(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {loading?(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(140px,1fr))",
          gap:12,marginBottom:20
        }}>
          {[1,2,3,4,5,6].map(i=>(
            <div key={i} className="skeleton"
              style={{height:100}}/>
          ))}
        </div>
      ):data&&(
        <>
          {/* KPI Cards */}
          <div style={{
            display:"grid",
            gridTemplateColumns:
              "repeat(auto-fill,minmax(140px,1fr))",
            gap:12,marginBottom:20
          }}>
            {[
              {
                i:"👥",l:"Total Staff",
                v:data.totalEmp,
                c:"var(--primary)"
              },
              {
                i:"🟢",l:"Online Now",
                v:data.online,
                c:"var(--success)"
              },
              {
                i:"✅",l:"Attendance",
                v:data.totalAtt,
                c:"var(--info)"
              },
              {
                i:"📊",l:"Avg Score",
                v:data.avgScore!==null
                  ?data.avgScore+"%":"--",
                c:data.avgScore>=80
                  ?"var(--success)"
                  :data.avgScore>=60
                    ?"var(--warning)"
                    :"var(--text-muted)"
              },
              {
                i:"⏳",l:"Waiting",
                v:data.totalWaiting,
                c:data.totalWaiting>20
                  ?"var(--danger)"
                  :data.totalWaiting>10
                    ?"var(--warning)"
                    :"var(--success)"
              },
              {
                i:"🚨",l:"Alerts",
                v:data.activeAlerts,
                c:data.activeAlerts>0
                  ?"var(--danger)"
                  :"var(--success)"
              }
            ].map(s=>(
              <div key={s.l} className="stat-card">
                <span className="stat-icon">
                  {s.i}
                </span>
                <div className="stat-value"
                  style={{color:s.c}}>
                  {s.v}
                </div>
                <div className="stat-label">
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* Dept + Role Breakdown */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"1fr 1fr",
            gap:12,marginBottom:12
          }}>
            {/* Dept */}
            <div className="card">
              <div className="card-title"
                style={{marginBottom:14}}>
                🏢 By Department
              </div>
              <div style={{
                display:"flex",
                flexDirection:"column",gap:8
              }}>
                {Object.entries(data.deptMap)
                  .sort((a,b)=>b[1]-a[1])
                  .map(([dept,count])=>{
                    const dc=DEPT[dept];
                    const pct=Math.round(
                      (count/data.totalEmp)*100
                    );
                    return(
                      <div key={dept}>
                        <div style={{
                          display:"flex",
                          justifyContent:
                            "space-between",
                          fontSize:11,
                          fontWeight:700,
                          marginBottom:4
                        }}>
                          <span style={{
                            color:"var(--text)"
                          }}>
                            {dc?.i||"🏢"} {dept}
                          </span>
                          <span style={{
                            color:"var(--text-muted)"
                          }}>
                            {count}
                          </span>
                        </div>
                        <div className=
                          "score-bar-wrap">
                          <div
                            className="score-bar"
                            style={{
                              width:pct+"%",
                              background:
                                dc?.c||
                                "var(--primary)"
                            }}/>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* Role */}
            <div className="card">
              <div className="card-title"
                style={{marginBottom:14}}>
                👤 By Role
              </div>
              <div style={{
                display:"flex",
                flexDirection:"column",gap:8
              }}>
                {Object.entries(data.roleMap)
                  .sort((a,b)=>b[1]-a[1])
                  .map(([role,count])=>{
                    const rc2=RC[role]||RC.Agent;
                    const pct=Math.round(
                      (count/data.totalEmp)*100
                    );
                    return(
                      <div key={role}>
                        <div style={{
                          display:"flex",
                          justifyContent:
                            "space-between",
                          fontSize:11,
                          fontWeight:700,
                          marginBottom:4
                        }}>
                          <span style={{
                            color:"var(--text)"
                          }}>
                            {rc2.i} {role}
                          </span>
                          <span style={{
                            color:"var(--text-muted)"
                          }}>
                            {count}
                          </span>
                        </div>
                        <div className=
                          "score-bar-wrap">
                          <div
                            className="score-bar"
                            style={{
                              width:pct+"%",
                              background:rc2.c
                            }}/>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>

          {/* Queue Overview */}
          {data.queues.length>0&&(
            <div className="card">
              <div className="card-title"
                style={{marginBottom:14}}>
                🎧 Queue Overview
              </div>
              <div style={{
                display:"grid",
                gridTemplateColumns:
                  "repeat(auto-fill,"+
                  "minmax(200px,1fr))",
                gap:10
              }}>
                {data.queues.map(q=>(
                  <div key={q.id} style={{
                    background:"var(--glass2)",
                    border:
                      "1px solid var(--border)",
                    borderRadius:12,
                    padding:"12px 14px"
                  }}>
                    <div style={{
                      fontSize:12,fontWeight:800,
                      color:"var(--text)",
                      marginBottom:8
                    }}>
                      {q.queue_name}
                    </div>
                    <div style={{
                      display:"flex",gap:8
                    }}>
                      {[
                        {
                          l:"Wait",
                          v:q.waiting,
                          c:(q.waiting||0)>10
                            ?"var(--danger)"
                            :"var(--success)"
                        },
                        {
                          l:"Handle",
                          v:q.handling,
                          c:"var(--primary)"
                        },
                        {
                          l:"SLA",
                          v:(q.sla_pct||100)+"%",
                          c:(q.sla_pct||100)>=90
                            ?"var(--success)"
                            :"var(--warning)"
                        }
                      ].map(item=>(
                        <div key={item.l} style={{
                          flex:1,
                          textAlign:"center",
                          background:"var(--glass)",
                          borderRadius:8,
                          padding:"6px 4px"
                        }}>
                          <div style={{
                            fontSize:14,
                            fontWeight:800,
                            color:item.c
                          }}>{item.v}</div>
                          <div style={{
                            fontSize:9,
                            color:"var(--text-muted)",
                            fontWeight:700,
                            textTransform:"uppercase"
                          }}>{item.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
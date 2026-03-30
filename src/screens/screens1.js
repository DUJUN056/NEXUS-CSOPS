/* ============================================================
   S07: LOGIN
   ============================================================ */
function Login({onLogin}){
  const [email,  setEmail]  =useState("");
  const [pass,   setPass]   =useState("");
  const [loading,setLoading]=useState(false);
  const [err,    setErr]    =useState("");
  const [showFP, setShowFP] =useState(false);
  const [showPw, setShowPw] =useState(false);
  const [locked, setLocked] =useState(false);
  const [lockEnd,setLockEnd]=useState(null);
  const attRef=useRef(0);

  useEffect(()=>{
    const saved=localStorage.getItem(
      'csops_lock'
    );
    if(saved){
      const end=parseInt(saved);
      if(end>Date.now()){
        setLocked(true);setLockEnd(end);
        const t=setInterval(()=>{
          if(Date.now()>=end){
            setLocked(false);setLockEnd(null);
            localStorage.removeItem('csops_lock');
            clearInterval(t);
          }
        },1000);
        return()=>clearInterval(t);
      }else{
        localStorage.removeItem('csops_lock');
      }
    }
  },[]);

  const lockRemaining=useMemo(()=>{
    if(!lockEnd) return "";
    const s=Math.ceil(
      (lockEnd-Date.now())/1000
    );
    return s>60
      ?Math.ceil(s/60)+"m":s+"s";
  },[lockEnd]);

  async function submit(e){
    e.preventDefault();
    if(locked) return;
    setLoading(true);setErr("");
    try{
      const {data,error}=
        await sb.auth.signInWithPassword({
          email:email.trim(),password:pass
        });
      if(error) throw error;
      const {data:emp,error:ee}=
        await withRetry(()=>
          sb.from("employees")
            .select("*")
            .eq("auth_user_id",data.user.id)
            .single()
        );
      if(ee) throw ee;
      if(emp.is_suspended){
        await sb.auth.signOut();
        setErr(
          "Account suspended: "+
          (emp.suspension_reason||
           "Contact admin")
        );
        setLoading(false);
        return;
      }
      attRef.current=0;
      onLogin(emp,data.session);
    }catch(err){
      attRef.current++;
      if(attRef.current>=MAX_ATTEMPTS){
        const end=Date.now()+LOCKOUT_MS;
        setLocked(true);setLockEnd(end);
        localStorage.setItem(
          'csops_lock',end.toString()
        );
        setErr(
          "Too many attempts. Locked for "+
          (LOCKOUT_MS/60000)+" minutes."
        );
      }else{
        setErr(
          err.message||"Invalid credentials"
        );
      }
      setLoading(false);
    }
  }

  if(showFP) return(
    <ForgotPassword
      onBack={()=>setShowFP(false)}/>
  );

  return(
    <div className="login-wrap">
      <div className="live-bg">
        <div className="live-bg-orb" style={{
          width:500,height:500,
          background:"var(--primary)",
          top:"-10%",left:"-10%",
          animationDuration:"25s"
        }}/>
        <div className="live-bg-orb" style={{
          width:350,height:350,
          background:"var(--success)",
          bottom:"-5%",right:"-5%",
          animationDuration:"20s",
          animationDelay:"-10s"
        }}/>
      </div>
      <div className="login-card scale-in">
        <div className="login-logo">🏰</div>
        <div className="login-title">{APP}</div>
        <div className="login-subtitle">
          نظام الحصن · v{VER}
        </div>

        {locked&&(
          <div style={{
            background:"rgba(239,68,68,0.1)",
            border:
              "1px solid rgba(239,68,68,0.2)",
            borderRadius:12,
            padding:"12px 16px",
            marginBottom:20,textAlign:"center"
          }}>
            <div style={{
              fontSize:24,marginBottom:4
            }}>🔒</div>
            <div style={{
              fontSize:13,fontWeight:700,
              color:"#FCA5A5"
            }}>
              Locked · {lockRemaining} remaining
            </div>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="input-group"
            style={{marginBottom:14}}>
            <label className="input-label">
              Email
            </label>
            <input type="email" required
              className="input"
              value={email}
              onChange={e=>
                setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={locked||loading}
              autoComplete="email"/>
          </div>
          <div className="input-group"
            style={{marginBottom:8}}>
            <label className="input-label">
              Password
            </label>
            <div style={{position:"relative"}}>
              <input
                type={showPw?"text":"password"}
                required className="input"
                value={pass}
                onChange={e=>
                  setPass(e.target.value)}
                placeholder="••••••••"
                disabled={locked||loading}
                autoComplete="current-password"
                style={{paddingRight:44}}/>
              <button type="button" style={{
                position:"absolute",
                right:12,top:"50%",
                transform:"translateY(-50%)",
                background:"none",border:"none",
                cursor:"pointer",fontSize:16,
                color:"var(--text-muted)",
                padding:4
              }}
              onClick={()=>setShowPw(s=>!s)}>
                {showPw?"🙈":"👁️"}
              </button>
            </div>
          </div>
          <div style={{
            display:"flex",
            justifyContent:"flex-end",
            marginBottom:20
          }}>
            <button type="button"
              className="btn-link"
              onClick={()=>setShowFP(true)}>
              Forgot password?
            </button>
          </div>
          {err&&(
            <div style={{
              background:"rgba(239,68,68,0.1)",
              color:"#FCA5A5",
              padding:"10px 14px",
              borderRadius:10,fontSize:12,
              marginBottom:16,
              textAlign:"center",
              border:
                "1px solid rgba(239,68,68,0.2)"
            }}>⚠️ {err}</div>
          )}
          <button type="submit"
            className="btn btn-primary btn-full"
            disabled={loading||locked}
            style={{padding:13,fontSize:14}}>
            {loading
              ?<><Spinner size="sm" white/>
                 {" "}Signing in...</>
              :"🔐 Sign In"
            }
          </button>
        </form>
        <div style={{
          textAlign:"center",marginTop:20,
          fontSize:11,color:"var(--text-muted)"
        }}>
          Secure · Real-time · Enterprise Grade
        </div>
      </div>
    </div>
  );
}

/* ── ForgotPassword ── */
function ForgotPassword({onBack}){
  const [email,  setEmail]  =useState("");
  const [sent,   setSent]   =useState(false);
  const [loading,setLoading]=useState(false);
  const [err,    setErr]    =useState("");

  async function submit(e){
    e.preventDefault();
    setLoading(true);setErr("");
    try{
      const {error}=
        await sb.auth.resetPasswordForEmail(
          email.trim(),
          {redirectTo:window.location.origin}
        );
      if(error) throw error;
      setSent(true);
    }catch(err){
      setErr(err.message);
    }finally{setLoading(false);}
  }

  return(
    <div className="login-wrap">
      <div className="login-card scale-in">
        <div className="login-logo">🔑</div>
        <div className="login-title">
          Reset Password
        </div>
        <div className="login-subtitle">
          Enter your email to receive a reset link
        </div>
        {sent?(
          <div style={{
            textAlign:"center",
            padding:"20px 0"
          }}>
            <div style={{
              fontSize:48,marginBottom:12
            }}>📧</div>
            <div style={{
              fontSize:14,
              color:"var(--success)",
              fontWeight:700,marginBottom:8
            }}>Email sent!</div>
            <div style={{
              fontSize:12,
              color:"var(--text-sub)",
              marginBottom:20,lineHeight:1.5
            }}>
              Check your inbox for the reset link.
            </div>
            <button
              className="btn btn-ghost btn-full"
              onClick={onBack}>
              ← Back to Login
            </button>
          </div>
        ):(
          <form onSubmit={submit}>
            <div className="input-group"
              style={{marginBottom:20}}>
              <label className="input-label">
                Email
              </label>
              <input type="email" required
                className="input"
                value={email}
                onChange={e=>
                  setEmail(e.target.value)}
                placeholder="your@email.com"/>
            </div>
            {err&&(
              <div style={{
                background:
                  "rgba(239,68,68,0.1)",
                color:"#FCA5A5",padding:10,
                borderRadius:10,fontSize:12,
                marginBottom:16,
                textAlign:"center"
              }}>⚠️ {err}</div>
            )}
            <button type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{
                padding:13,marginBottom:12
              }}>
              {loading
                ?<><Spinner size="sm" white/>
                   {" "}Sending...</>
                :"📧 Send Reset Link"
              }
            </button>
            <button type="button"
              className="btn btn-ghost btn-full"
              onClick={onBack}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   S08: FREEZE MODAL
   ============================================================ */
function FreezeModal({emp,freeze,onClose,onDone}){
  const {showToast}=useApp();
  const [reason, setReason] =useState("");
  const [loading,setLoading]=useState(false);
  const isFrozen=freeze?.active===true;

  async function toggle(){
    if(!isFrozen&&!reason.trim()){
      showToast("Please enter a reason","warning");
      return;
    }
    setLoading(true);
    try{
      const val=isFrozen
        ?{
          active:false,reason:null,
          by:null,by_name:null,at:null
        }:{
          active:true,
          reason:reason.trim(),
          by:emp.id,
          by_name:emp.full_name,
          at:new Date().toISOString()
        };
      await withRetry(()=>
        sb.from("system_settings").upsert(
          {
            key:"freeze_mode",value:val,
            updated_at:new Date().toISOString(),
            updated_by:emp.id
          },
          {onConflict:"key"}
        )
      );
      showToast(
        isFrozen
          ?"System unfrozen ✅"
          :"System frozen 🔒",
        isFrozen?"success":"warning"
      );
      onDone();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setLoading(false);}
  }

  return(
    <Portal>
      <div className="modal-overlay"
        onClick={e=>
          e.target===e.currentTarget&&
          onClose()}>
        <div className="modal modal-sm">
          <div className="modal-header">
            <h3 className="modal-title">
              {isFrozen
                ?"🔓 Unfreeze System"
                :"🔒 Freeze System"}
            </h3>
            <button
              className="btn-icon btn-icon-sm"
              onClick={onClose}>×</button>
          </div>

          {isFrozen?(
            <div style={{marginBottom:20}}>
              <div style={{
                background:
                  "rgba(239,68,68,0.08)",
                border:
                  "1px solid rgba(239,68,68,0.2)",
                borderRadius:12,
                padding:"14px 16px",
                marginBottom:16
              }}>
                <div style={{
                  fontSize:12,fontWeight:700,
                  color:"var(--danger)",
                  marginBottom:6
                }}>
                  Currently Frozen
                </div>
                <div style={{
                  fontSize:13,
                  color:"var(--text-sub)"
                }}>
                  {freeze.reason}
                </div>
                <div style={{
                  fontSize:11,
                  color:"var(--text-muted)",
                  marginTop:6
                }}>
                  By {freeze.by_name}
                  {freeze.at
                    ?" · "+fmt.ago(freeze.at)
                    :""}
                </div>
              </div>
              <p style={{
                fontSize:13,
                color:"var(--text-sub)",
                textAlign:"center"
              }}>
                Unfreeze to restore
                normal operations?
              </p>
            </div>
          ):(
            <div style={{marginBottom:20}}>
              <div className="input-group"
                style={{marginBottom:14}}>
                <label className="input-label">
                  Reason (required)
                </label>
                <textarea className="input"
                  value={reason}
                  onChange={e=>
                    setReason(e.target.value)}
                  placeholder=
                    "Why are you freezing?"
                  rows={3}/>
              </div>
              <div style={{
                background:
                  "rgba(245,158,11,0.08)",
                border:
                  "1px solid rgba(245,158,11,0.2)",
                borderRadius:10,
                padding:"10px 14px",
                fontSize:12,
                color:"var(--warning)"
              }}>
                ⚠️ All users will see freeze
                screen immediately.
              </div>
            </div>
          )}

          <div className="modal-footer" style={{
            paddingTop:0,borderTop:"none",
            marginTop:0
          }}>
            <button className="btn btn-ghost"
              style={{flex:1}}
              onClick={onClose}>
              Cancel
            </button>
            <button
              className={
                "btn "+(isFrozen
                  ?"btn-success":"btn-danger")
              }
              style={{flex:1}}
              onClick={toggle}
              disabled={loading}>
              {loading
                ?<><Spinner size="sm" white/>
                   {" "}Processing...</>
                :isFrozen
                  ?"🔓 Unfreeze"
                  :"🔒 Freeze Now"
              }
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ============================================================
   S09: SYSTEM SETTINGS
   ============================================================ */
function SystemSettings({emp}){
  const [tab,setTab]=useState("general");

  const tabs=[
    {id:"general",   l:"General",   i:"⚙️"},
    {id:"employees", l:"Employees", i:"👥"},
    ...(isOwn(emp)?[
      {id:"visibility",l:"Visibility",i:"👁️"},
      {id:"suspension",l:"Suspension",i:"🚫"},
      {id:"alerts",    l:"Alerts",    i:"🚨"},
      {id:"themes",    l:"Themes",    i:"🎨"}
    ]:[])
  ];

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            ⚙️ System Settings
          </h1>
          <p className="page-subtitle">
            {isOwn(emp)
              ?"Full sovereign control"
              :"Manager settings"}
          </p>
        </div>
      </div>
      <div className="tabs" style={{
        marginBottom:20,flexWrap:"wrap"
      }}>
        {tabs.map(t=>(
          <button key={t.id}
            className={
              "tab"+(tab===t.id?" active":"")
            }
            onClick={()=>setTab(t.id)}>
            {t.i} {t.l}
          </button>
        ))}
      </div>
      {tab==="general"&&
        <GeneralSettings emp={emp}/>}
      {tab==="employees"&&
        <EmployeeManager emp={emp}/>}
      {tab==="visibility"&&isOwn(emp)&&
        <VisibilityControl emp={emp}/>}
      {tab==="suspension"&&isOwn(emp)&&
        <SuspensionManager emp={emp}/>}
      {tab==="alerts"&&isOwn(emp)&&
        <CriticalAlertMgr emp={emp}/>}
      {tab==="themes"&&isOwn(emp)&&
        <ThemeDelegationMgr emp={emp}/>}
    </div>
  );
}

/* ── GeneralSettings ── */
function GeneralSettings({emp}){
  const {showToast}=useApp();
  const [bs,  setBs]  =useState(false);
  const [load,setLoad]=useState(true);

  useEffect(()=>{
    sb.from("system_settings")
      .select("value")
      .eq("key","blank_slate_mode")
      .single()
      .then(({data})=>{
        setBs(data?.value?.active===true);
        setLoad(false);
      });
  },[]);

  async function toggle(v){
    try{
      await withRetry(()=>
        sb.from("system_settings").upsert(
          {
            key:"blank_slate_mode",
            value:{active:v},
            updated_at:new Date().toISOString(),
            updated_by:emp.id
          },
          {onConflict:"key"}
        )
      );
      setBs(v);
      showToast(
        v?"Blank Slate ON":"Blank Slate OFF",
        "success"
      );
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  if(load) return(
    <div className="skeleton"
      style={{height:160}}/>
  );

  return(
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            🎛️ Blank Slate Mode
          </div>
          <div className="card-subtitle">
            Control default page visibility
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox"
            checked={bs}
            onChange={e=>toggle(e.target.checked)}/>
          <span className="toggle-slider"/>
        </label>
      </div>
      <div style={{
        background:bs
          ?"rgba(245,158,11,0.06)"
          :"rgba(16,185,129,0.06)",
        border:"1px solid "+(bs
          ?"rgba(245,158,11,0.2)"
          :"rgba(16,185,129,0.2)"),
        borderRadius:10,
        padding:"12px 16px",
        fontSize:12,
        color:bs
          ?"var(--warning)":"var(--success)"
      }}>
        {bs
          ?"⚠️ New employees see only "+
            "guaranteed pages until Owner grants"
          :"✅ New employees get default role "+
            "permissions automatically"
        }
      </div>
    </div>
  );
}

/* ── VisibilityControl ── */
function VisibilityControl({emp}){
  const {showToast}=useApp();
  const [employees,setEmployees]=useState([]);
  const [selected, setSelected] =useState(null);
  const [perms,    setPerms]    =useState([]);
  const [loading,  setLoading]  =useState(true);

  useEffect(()=>{
    sb.from("employees")
      .select("id,full_name,role,department")
      .neq("id",emp.id)
      .order("full_name")
      .then(({data})=>{
        setEmployees(data||[]);
        setLoading(false);
      });
  },[]);

  async function loadPerms(id){
    const {data}=await sb
      .from("page_permissions")
      .select("*").eq("employee_id",id);
    setPerms(data||[]);
  }

  async function togglePage(empId,pg,cur){
    try{
      const ex=perms.find(
        p=>p.page_name===pg
      );
      if(ex){
        await withRetry(()=>
          sb.from("page_permissions")
            .update({is_visible:!cur})
            .eq("id",ex.id)
        );
      }else{
        await withRetry(()=>
          sb.from("page_permissions").insert({
            employee_id:empId,
            page_name:pg,
            is_visible:!cur,
            granted_by:emp.id
          })
        );
      }
      await loadPerms(empId);
      showToast(
        (!cur?"Granted: ":"Revoked: ")+pg,
        !cur?"success":"warning"
      );
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  function getVis(empId,pg,role){
    const p=perms.find(x=>x.page_name===pg);
    if(p) return p.is_visible;
    return PA[pg]?.includes(role)??false;
  }

  if(loading) return(
    <div style={{
      display:"flex",flexDirection:"column",
      gap:8
    }}>
      {[1,2,3].map(i=>(
        <div key={i} className="skeleton"
          style={{height:60}}/>
      ))}
    </div>
  );

  return(
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            👁️ Page Visibility
          </div>
          <div className="card-subtitle">
            Grant or revoke pages per employee
          </div>
        </div>
      </div>
      <div style={{
        display:"flex",flexDirection:"column",
        gap:6,marginBottom:16
      }}>
        {employees.map(e=>(
          <button key={e.id}
            className={
              "card card-clickable"+
              (selected?.id===e.id
                ?" card-active":"")
            }
            style={{
              padding:"10px 14px",
              display:"flex",
              alignItems:"center",gap:10
            }}
            onClick={()=>{
              setSelected(e);
              loadPerms(e.id);
            }}>
            <div style={{
              width:36,height:36,
              borderRadius:10,
              background:`linear-gradient(135deg,
                ${RC[e.role]?.c||"#64748B"},
                ${RC[e.role]?.c||"#64748B"}88)`,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontSize:18,flexShrink:0
            }}>
              {RC[e.role]?.i||"👤"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{
                fontSize:13,fontWeight:700,
                color:"var(--text)"
              }} dir="auto">
                {e.full_name}
              </div>
              <div style={{
                fontSize:11,
                color:"var(--text-muted)"
              }}>
                {e.role} · {e.department}
              </div>
            </div>
            {selected?.id===e.id&&(
              <span style={{
                fontSize:11,fontWeight:700,
                color:"var(--primary)"
              }}>Selected ✓</span>
            )}
          </button>
        ))}
      </div>

      {selected&&(
        <div style={{
          borderTop:"1px solid var(--border)",
          paddingTop:16
        }}>
          <div style={{
            fontSize:13,fontWeight:800,
            color:"var(--text)",marginBottom:12
          }} dir="auto">
            Pages for: {selected.full_name}
          </div>
          <div style={{
            display:"grid",
            gridTemplateColumns:
              "repeat(auto-fill,minmax(190px,1fr))",
            gap:8
          }}>
            {Object.keys(PA).map(pg=>{
              const vis=getVis(
                selected.id,pg,selected.role
              );
              return(
                <div key={pg} style={{
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"space-between",
                  padding:"8px 12px",
                  background:vis
                    ?"rgba(16,185,129,0.06)"
                    :"rgba(239,68,68,0.04)",
                  border:"1px solid "+(vis
                    ?"rgba(16,185,129,0.15)"
                    :"rgba(239,68,68,0.10)"),
                  borderRadius:10
                }}>
                  <div style={{
                    display:"flex",
                    alignItems:"center",gap:6
                  }}>
                    <span style={{fontSize:13}}>
                      {PI[pg]||"📄"}
                    </span>
                    <span style={{
                      fontSize:11,fontWeight:600,
                      color:"var(--text)"
                    }}>{pg}</span>
                  </div>
                  <label className="toggle toggle-sm">
                    <input type="checkbox"
                      checked={vis}
                      onChange={()=>
                        togglePage(
                          selected.id,pg,vis
                        )
                      }/>
                    <span className="toggle-slider"/>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SuspensionManager ── */
function SuspensionManager({emp}){
  const {showToast}=useApp();
  const [employees,setEmployees]=useState([]);
  const [loading,  setLoading]  =useState(true);
  const [reason,   setReason]   =useState("");
  const [target,   setTarget]   =useState(null);
  const [showConf, setShowConf] =useState(false);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    const {data}=await withRetry(()=>
      sb.from("employees")
        .select(
          "id,full_name,role,department,"+
          "is_suspended,suspension_reason,"+
          "suspended_at"
        )
        .neq("id",emp.id)
        .order("full_name")
    );
    setEmployees(data||[]);
    setLoading(false);
  }

  async function suspend(e){
    if(!reason.trim()){
      showToast("Reason required","warning");
      return;
    }
    try{
      await withRetry(()=>
        sb.from("employees").update({
          is_suspended:true,
          suspension_reason:reason.trim(),
          suspended_at:new Date().toISOString(),
          suspended_by:emp.id
        }).eq("id",e.id)
      );
      showToast(
        "Suspended: "+e.full_name,"warning"
      );
      setShowConf(false);
      setReason("");setTarget(null);
      load();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  async function reinstate(e){
    if(!confirm("Reinstate "+e.full_name+"?"))
      return;
    try{
      await withRetry(()=>
        sb.from("employees").update({
          is_suspended:false,
          suspension_reason:null,
          suspended_at:null,
          suspended_by:null
        }).eq("id",e.id)
      );
      showToast("Reinstated ✅","success");
      load();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  if(loading) return(
    <div style={{
      display:"flex",flexDirection:"column",
      gap:8
    }}>
      {[1,2,3].map(i=>(
        <div key={i} className="skeleton"
          style={{height:70}}/>
      ))}
    </div>
  );

  return(
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🚫 Account Suspension
        </div>
        <div className="card-subtitle">
          Suspend or reinstate accounts
        </div>
      </div>
      <div style={{
        display:"flex",flexDirection:"column",
        gap:8
      }}>
        {employees.map(e=>(
          <div key={e.id} style={{
            display:"flex",
            alignItems:"center",
            gap:12,padding:"12px 16px",
            background:e.is_suspended
              ?"rgba(239,68,68,0.06)"
              :"var(--glass2)",
            border:"1px solid "+(e.is_suspended
              ?"rgba(239,68,68,0.2)"
              :"var(--border)"),
            borderRadius:12
          }}>
            <div style={{
              width:40,height:40,
              borderRadius:10,flexShrink:0,
              background:`linear-gradient(135deg,
                ${RC[e.role]?.c||"#64748B"},
                ${RC[e.role]?.c||"#64748B"}88)`,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontSize:18
            }}>
              {RC[e.role]?.i||"👤"}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{
                fontSize:13,fontWeight:700,
                color:"var(--text)"
              }} dir="auto">
                {e.full_name}
              </div>
              <div style={{
                fontSize:11,
                color:"var(--text-muted)",
                marginTop:2
              }}>
                {e.role} · {e.department}
              </div>
              {e.is_suspended&&
               e.suspension_reason&&(
                <div style={{
                  fontSize:11,
                  color:"var(--danger)",
                  marginTop:3
                }}>
                  🚫 {e.suspension_reason}
                </div>
              )}
            </div>
            {e.is_suspended?(
              <button
                className="btn btn-success btn-sm"
                onClick={()=>reinstate(e)}>
                ✅ Reinstate
              </button>
            ):(
              <button
                className="btn btn-danger btn-sm"
                onClick={()=>{
                  setTarget(e);
                  setShowConf(true);
                }}>
                🚫 Suspend
              </button>
            )}
          </div>
        ))}
      </div>

      {showConf&&target&&(
        <Portal>
          <div className="modal-overlay"
            onClick={e=>
              e.target===e.currentTarget&&
              setShowConf(false)}>
            <div className="modal modal-sm">
              <div className="modal-header">
                <h3 className="modal-title">
                  🚫 Suspend Account
                </h3>
                <button
                  className="btn-icon btn-icon-sm"
                  onClick={()=>
                    setShowConf(false)}>
                  ×
                </button>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{
                  fontSize:13,
                  color:"var(--text-sub)",
                  marginBottom:14
                }} dir="auto">
                  Suspending:{" "}
                  <strong>
                    {target.full_name}
                  </strong>
                </div>
                <div className="input-group">
                  <label className="input-label">
                    Reason (required)
                  </label>
                  <textarea className="input"
                    value={reason}
                    onChange={e=>
                      setReason(e.target.value)}
                    placeholder="Reason..."
                    rows={3}/>
                </div>
              </div>
              <div className="modal-footer"
                style={{
                  paddingTop:0,
                  borderTop:"none",
                  marginTop:0
                }}>
                <button
                  className="btn btn-ghost"
                  style={{flex:1}}
                  onClick={()=>
                    setShowConf(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  style={{flex:1}}
                  onClick={()=>suspend(target)}>
                  🚫 Confirm
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

/* ── CriticalAlertMgr ── */
function CriticalAlertMgr({emp}){
  const {showToast}=useApp();
  const [alerts, setAlerts] =useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    const {data}=await sb
      .from("critical_alerts")
      .select("*")
      .order("created_at",{ascending:false});
    setAlerts(data||[]);
    setLoading(false);
  }

  async function deactivate(id){
    await withRetry(()=>
      sb.from("critical_alerts")
        .update({is_active:false})
        .eq("id",id)
    );
    showToast("Alert deactivated","success");
    load();
  }

  return(
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            🚨 Critical Alerts
          </div>
          <div className="card-subtitle">
            Broadcast urgent messages
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={()=>setShowAdd(true)}>
          + New Alert
        </button>
      </div>
      {loading?(
        <div className="skeleton"
          style={{height:100}}/>
      ):alerts.length===0?(
        <EmptyState icon="🚨"
          title="No alerts yet"/>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {alerts.map(a=>(
            <div key={a.id} style={{
              padding:"12px 16px",
              background:a.is_active
                ?"rgba(239,68,68,0.06)"
                :"var(--glass2)",
              border:"1px solid "+(a.is_active
                ?"rgba(239,68,68,0.2)"
                :"var(--border)"),
              borderRadius:12
            }}>
              <div style={{
                display:"flex",
                alignItems:"flex-start",
                justifyContent:"space-between",
                gap:10
              }}>
                <div style={{flex:1}}>
                  <div style={{
                    fontSize:13,fontWeight:700,
                    color:a.is_active
                      ?"var(--danger)"
                      :"var(--text-muted)"
                  }}>
                    {a.is_active?"🔴":"⚫"}{" "}
                    {a.title_en}
                  </div>
                  {a.title_ar&&(
                    <div style={{
                      fontSize:12,
                      color:"var(--text-muted)",
                      marginTop:2
                    }} dir="rtl">
                      {a.title_ar}
                    </div>
                  )}
                  <div style={{
                    fontSize:11,
                    color:"var(--text-muted)",
                    marginTop:4
                  }}>
                    {fmt.ago(a.created_at)} ·{" "}
                    {a.admin_close
                      ?"Admin close only"
                      :"Users can close"}
                  </div>
                </div>
                {a.is_active&&(
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={()=>deactivate(a.id)}>
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd&&(
        <NewAlertModal emp={emp}
          onClose={()=>setShowAdd(false)}
          onDone={()=>{
            setShowAdd(false);load();
          }}/>
      )}
    </div>
  );
}

/* ── NewAlertModal ── */
function NewAlertModal({emp,onClose,onDone}){
  const {showToast}=useApp();
  const [form,setForm]=useState({
    title_en:"",title_ar:"",
    body_en:"",body_ar:"",
    alert_type:"critical",admin_close:true
  });
  const [loading,setLoading]=useState(false);
  function upd(k,v){setForm(f=>({...f,[k]:v}));}

  async function submit(e){
    e.preventDefault();
    if(!form.title_en||!form.body_en){
      showToast(
        "Title and body required","warning"
      );
      return;
    }
    setLoading(true);
    try{
      await withRetry(()=>
        sb.from("critical_alerts").insert({
          ...form,is_active:true,
          created_by:emp.id,
          dismissed_by:[]
        })
      );
      showToast("Alert broadcast 🚨","success");
      onDone();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setLoading(false);}
  }

  return(
    <Portal>
      <div className="modal-overlay"
        onClick={e=>
          e.target===e.currentTarget&&
          onClose()}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">
              🚨 New Critical Alert
            </h3>
            <button
              className="btn-icon btn-icon-sm"
              onClick={onClose}>×</button>
          </div>
          <form onSubmit={submit}>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:14
            }}>
              <div className="input-group">
                <label className="input-label">
                  Title EN *
                </label>
                <input type="text"
                  className="input"
                  value={form.title_en}
                  onChange={e=>
                    upd("title_en",e.target.value)}
                  placeholder="Alert title..."
                  required/>
              </div>
              <div className="input-group">
                <label className="input-label">
                  العنوان AR
                </label>
                <input type="text"
                  className="input"
                  value={form.title_ar}
                  onChange={e=>
                    upd("title_ar",e.target.value)}
                  placeholder="عنوان التنبيه..."
                  dir="rtl"/>
              </div>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:14
            }}>
              <div className="input-group">
                <label className="input-label">
                  Body EN *
                </label>
                <textarea className="input"
                  value={form.body_en}
                  onChange={e=>
                    upd("body_en",e.target.value)}
                  placeholder="Message..."
                  rows={3} required/>
              </div>
              <div className="input-group">
                <label className="input-label">
                  النص AR
                </label>
                <textarea className="input"
                  value={form.body_ar}
                  onChange={e=>
                    upd("body_ar",e.target.value)}
                  placeholder="النص..."
                  rows={3} dir="rtl"/>
              </div>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:20
            }}>
              <div className="input-group">
                <label className="input-label">
                  Type
                </label>
                <select className="input"
                  value={form.alert_type}
                  onChange={e=>
                    upd("alert_type",
                      e.target.value)}>
                  <option value="critical">
                    🔴 Critical
                  </option>
                  <option value="warning">
                    🟡 Warning
                  </option>
                  <option value="info">
                    🔵 Info
                  </option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">
                  Close Permission
                </label>
                <div style={{
                  display:"flex",
                  alignItems:"center",
                  gap:10,marginTop:8
                }}>
                  <label className="toggle">
                    <input type="checkbox"
                      checked={form.admin_close}
                      onChange={e=>
                        upd("admin_close",
                          e.target.checked)}/>
                    <span className="toggle-slider"/>
                  </label>
                  <span style={{
                    fontSize:11,
                    color:"var(--text-muted)"
                  }}>
                    {form.admin_close
                      ?"Admin only"
                      :"Users can close"}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{
              paddingTop:0,borderTop:"none",
              marginTop:0
            }}>
              <button type="button"
                className="btn btn-ghost"
                style={{flex:1}}
                onClick={onClose}>
                Cancel
              </button>
              <button type="submit"
                className="btn btn-danger"
                style={{flex:1}}
                disabled={loading}>
                {loading
                  ?<><Spinner size="sm" white/>
                     {" "}Broadcasting...</>
                  :"🚨 Broadcast"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

/* ── ThemeDelegationMgr ── */
function ThemeDelegationMgr({emp}){
  const {showToast}=useApp();
  const [employees,  setEmployees]  =useState([]);
  const [delegations,setDelegations]=useState([]);
  const [loading,    setLoading]    =useState(true);

  useEffect(()=>{
    Promise.all([
      sb.from("employees")
        .select("id,full_name,role,department")
        .neq("id",emp.id)
        .order("full_name"),
      sb.from("theme_delegations")
        .select("*").eq("is_active",true)
    ]).then(([{data:e},{data:d}])=>{
      setEmployees(e||[]);
      setDelegations(d||[]);
      setLoading(false);
    });
  },[]);

  async function grant(empId,themeId){
    try{
      await withRetry(()=>
        sb.from("theme_delegations").upsert(
          {
            employee_id:empId,
            theme_id:themeId,
            granted_by:emp.id,
            is_active:true,
            granted_at:new Date().toISOString()
          },
          {onConflict:"employee_id,theme_id"}
        )
      );
      showToast("Theme granted ✅","success");
      const {data}=await sb
        .from("theme_delegations")
        .select("*").eq("is_active",true);
      setDelegations(data||[]);
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  async function revoke(id){
    await withRetry(()=>
      sb.from("theme_delegations")
        .update({is_active:false})
        .eq("id",id)
    );
    showToast("Theme revoked","warning");
    const {data}=await sb
      .from("theme_delegations")
      .select("*").eq("is_active",true);
    setDelegations(data||[]);
  }

  const premiumThemes=THEMES_ALL.filter(
    t=>t.tier==="premium"
  );

  if(loading) return(
    <div className="skeleton"
      style={{height:200}}/>
  );

  return(
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          🎨 Theme Delegation
        </div>
        <div className="card-subtitle">
          Grant premium themes to employees
        </div>
      </div>
      <div style={{
        display:"grid",
        gridTemplateColumns:
          "repeat(auto-fill,minmax(260px,1fr))",
        gap:12
      }}>
        {employees.map(e=>(
          <div key={e.id} style={{
            background:"var(--glass2)",
            border:"1px solid var(--border)",
            borderRadius:12,padding:"14px 16px"
          }}>
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:10,marginBottom:12
            }}>
              <div style={{
                width:36,height:36,
                borderRadius:10,
                background:`linear-gradient(135deg,
                  ${RC[e.role]?.c||"#64748B"},
                  ${RC[e.role]?.c||"#64748B"}88)`,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                fontSize:18,flexShrink:0
              }}>
                {RC[e.role]?.i||"👤"}
              </div>
              <div style={{minWidth:0}}>
                <div style={{
                  fontSize:12,fontWeight:700,
                  color:"var(--text)"
                }} dir="auto">
                  {e.full_name}
                </div>
                <div style={{
                  fontSize:10,
                  color:"var(--text-muted)"
                }}>{e.role}</div>
              </div>
            </div>
            <div style={{
              display:"flex",
              flexWrap:"wrap",gap:6
            }}>
              {premiumThemes.map(t=>{
                const granted=delegations.some(
                  d=>d.employee_id===e.id&&
                     d.theme_id===t.id
                );
                const delId=delegations.find(
                  d=>d.employee_id===e.id&&
                     d.theme_id===t.id
                )?.id;
                return(
                  <button key={t.id}
                    onClick={()=>granted
                      ?revoke(delId)
                      :grant(e.id,t.id)
                    }
                    style={{
                      display:"flex",
                      alignItems:"center",
                      gap:4,
                      padding:"4px 10px",
                      borderRadius:20,
                      fontSize:11,fontWeight:700,
                      cursor:"pointer",
                      background:granted
                        ?"rgba(16,185,129,0.12)"
                        :"var(--glass2)",
                      border:"1px solid "+(granted
                        ?"rgba(16,185,129,0.3)"
                        :"var(--border)"),
                      color:granted
                        ?"var(--success)"
                        :"var(--text-muted)"
                    }}>
                    {t.icon} {t.label}
                    {granted&&" ✓"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── EmployeeManager ── */
function EmployeeManager({emp}){
  const {showToast}=useApp();
  const [employees,setEmployees]=useState([]);
  const [loading,  setLoading]  =useState(true);
  const [search,   setSearch]   =useState("");
  const [showAdd,  setShowAdd]  =useState(false);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    const {data}=await withRetry(()=>
      sb.from("employees")
        .select("*").order("full_name")
    );
    setEmployees(data||[]);
    setLoading(false);
  }

  const filtered=useMemo(()=>{
    if(!search) return employees;
    const s=search.toLowerCase();
    return employees.filter(e=>
      e.full_name?.toLowerCase().includes(s)||
      e.role?.toLowerCase().includes(s)||
      e.department?.toLowerCase().includes(s)||
      e.email?.toLowerCase().includes(s)
    );
  },[employees,search]);

  return(
    <div style={{
      display:"flex",flexDirection:"column",
      gap:16
    }}>
      <div style={{
        display:"flex",alignItems:"center",
        gap:12,flexWrap:"wrap"
      }}>
        <input type="search" className="input"
          style={{flex:1,minWidth:200}}
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search employees..."/>
        {isOwn(emp)&&(
          <button
            className="btn btn-primary btn-sm"
            onClick={()=>setShowAdd(true)}>
            + Add Employee
          </button>
        )}
      </div>

      {loading?(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {[1,2,3,4].map(i=>(
            <div key={i} className="skeleton"
              style={{height:72}}/>
          ))}
        </div>
      ):filtered.length===0?(
        <EmptyState icon="👥"
          title="No employees found"
          desc="Try a different search"/>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {filtered.map(e=>(
            <div key={e.id}
              className="card fade-in"
              style={{
                borderLeft:e.is_suspended
                  ?"3px solid var(--danger)"
                  :undefined
              }}>
              <div style={{
                display:"flex",
                alignItems:"center",gap:12
              }}>
                <div style={{
                  width:44,height:44,
                  borderRadius:12,flexShrink:0,
                  background:`linear-gradient(135deg,
                    ${RC[e.role]?.c||"#64748B"},
                    ${RC[e.role]?.c||"#64748B"}88)`,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontSize:22
                }}>
                  {RC[e.role]?.i||"👤"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{
                    display:"flex",
                    alignItems:"center",
                    gap:8,flexWrap:"wrap",
                    marginBottom:4
                  }}>
                    <span style={{
                      fontSize:14,fontWeight:800,
                      color:"var(--text)"
                    }} dir="auto">
                      {e.full_name}
                    </span>
                    {e.is_suspended&&(
                      <span style={{
                        fontSize:10,fontWeight:700,
                        color:"var(--danger)",
                        background:
                          "rgba(239,68,68,0.1)",
                        border:
                          "1px solid rgba(239,68,68,0.2)",
                        borderRadius:20,
                        padding:"2px 8px"
                      }}>SUSPENDED</span>
                    )}
                    {e.is_owner&&(
                      <span style={{
                        fontSize:10,fontWeight:700,
                        color:"#EAB308",
                        background:
                          "rgba(234,179,8,0.1)",
                        border:
                          "1px solid rgba(234,179,8,0.2)",
                        borderRadius:20,
                        padding:"2px 8px"
                      }}>👑 OWNER</span>
                    )}
                  </div>
                  <div style={{
                    display:"flex",
                    alignItems:"center",
                    gap:6,flexWrap:"wrap"
                  }}>
                    <RoleBadge role={e.role}/>
                    <DeptBadge dept={e.department}/>
                    <StatusBadge
                      status={e.status||"Offline"}/>
                  </div>
                </div>
                <div style={{
                  fontSize:11,
                  color:"var(--text-muted)",
                  textAlign:"right",flexShrink:0
                }}>
                  {e.last_heartbeat
                    ?fmt.ago(e.last_heartbeat)
                    :"Never"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd&&(
        <AddEmployeeModal emp={emp}
          onClose={()=>setShowAdd(false)}
          onDone={()=>{
            setShowAdd(false);load();
          }}/>
      )}
    </div>
  );
}

/* ── AddEmployeeModal ── */
function AddEmployeeModal({emp,onClose,onDone}){
  const {showToast}=useApp();
  const [form,setForm]=useState({
    full_name:"",email:"",
    role:"Agent",department:"KFOOD",
    password:"",is_owner:false
  });
  const [loading,setLoading]=useState(false);
  function upd(k,v){setForm(f=>({...f,[k]:v}));}

  async function submit(e){
    e.preventDefault();
    if(!form.full_name||!form.email||
       !form.password){
      showToast("All fields required","warning");
      return;
    }
    setLoading(true);
    try{
      const {data:au,error:ae}=
        await sb.auth.admin.createUser({
          email:form.email,
          password:form.password,
          email_confirm:true
        });
      if(ae) throw ae;
      await withRetry(()=>
        sb.from("employees").insert({
          full_name:form.full_name,
          email:form.email,
          role:form.role,
          department:form.department,
          is_owner:form.is_owner,
          auth_user_id:au.user.id,
          status:"Offline",
          must_change_password:true
        })
      );
      showToast("Employee added ✅","success");
      onDone();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setLoading(false);}
  }

  return(
    <Portal>
      <div className="modal-overlay"
        onClick={e=>
          e.target===e.currentTarget&&
          onClose()}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">
              👤 Add Employee
            </h3>
            <button
              className="btn-icon btn-icon-sm"
              onClick={onClose}>×</button>
          </div>
          <form onSubmit={submit}>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:14
            }}>
              <div className="input-group">
                <label className="input-label">
                  Full Name *
                </label>
                <input type="text"
                  className="input"
                  value={form.full_name}
                  onChange={e=>
                    upd("full_name",
                      e.target.value)}
                  placeholder="Ahmed Al-Rashidi"
                  dir="auto" required/>
              </div>
              <div className="input-group">
                <label className="input-label">
                  Email *
                </label>
                <input type="email"
                  className="input"
                  value={form.email}
                  onChange={e=>
                    upd("email",e.target.value)}
                  placeholder="ahmed@company.com"
                  required/>
              </div>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:14
            }}>
              <div className="input-group">
                <label className="input-label">
                  Role
                </label>
                <select className="input"
                  value={form.role}
                  onChange={e=>
                    upd("role",e.target.value)}>
                  {Object.keys(RC)
                    .filter(r=>r!=="Owner")
                    .map(r=>(
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))
                  }
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">
                  Department
                </label>
                <select className="input"
                  value={form.department}
                  onChange={e=>
                    upd("department",
                      e.target.value)}>
                  {Object.keys(DEPT).map(d=>(
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Temp Password *
              </label>
              <input type="text"
                className="input"
                value={form.password}
                onChange={e=>
                  upd("password",e.target.value)}
                placeholder="Temporary password..."
                required/>
              <div style={{
                fontSize:10,
                color:"var(--text-muted)",
                marginTop:4
              }}>
                Employee forced to change
                on first login
              </div>
            </div>
            {isOwn(emp)&&(
              <div style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                padding:"12px 16px",
                background:
                  "rgba(234,179,8,0.06)",
                border:
                  "1px solid rgba(234,179,8,0.15)",
                borderRadius:12,marginBottom:20
              }}>
                <div>
                  <div style={{
                    fontSize:13,fontWeight:700,
                    color:"#EAB308"
                  }}>
                    👑 Owner Privileges
                  </div>
                  <div style={{
                    fontSize:11,
                    color:"var(--text-muted)"
                  }}>
                    Grant full sovereign access
                  </div>
                </div>
                <label className="toggle">
                  <input type="checkbox"
                    checked={form.is_owner}
                    onChange={e=>
                      upd("is_owner",
                        e.target.checked)}/>
                  <span className="toggle-slider"/>
                </label>
              </div>
            )}
            <div className="modal-footer" style={{
              paddingTop:0,borderTop:"none",
              marginTop:0
            }}>
              <button type="button"
                className="btn btn-ghost"
                style={{flex:1}}
                onClick={onClose}>
                Cancel
              </button>
              <button type="submit"
                className="btn btn-primary"
                style={{flex:1}}
                disabled={loading}>
                {loading
                  ?<><Spinner size="sm" white/>
                     {" "}Adding...</>
                  :"👤 Add Employee"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

/* ============================================================
   S10: UPDATES FEED
   ============================================================ */
function UpdatesFeed({emp}){
  const {showToast}=useApp();
  const [updates,setUpdates]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [filter, setFilter] =useState("all");
  const canPost=isMgr(emp?.role);

  useEffect(()=>{
    load();
    ChannelMgr.sub(
      "feed-rt","updates_feed",
      ()=>load()
    );
    return()=>ChannelMgr.unsub("feed-rt");
  },[]);

  async function load(){
    const {data}=await withRetry(()=>
      sb.from("updates_feed")
        .select(
          "*,author:employees(full_name,role)"
        )
        .order("created_at",{ascending:false})
        .limit(50)
    );
    setUpdates(data||[]);
    setLoading(false);
  }

  const cats=useMemo(()=>{
    const s=new Set(
      updates.map(u=>u.category).filter(Boolean)
    );
    return ["all",...s];
  },[updates]);

  const filtered=useMemo(()=>
    filter==="all"
      ?updates
      :updates.filter(u=>u.category===filter)
  ,[updates,filter]);

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            📋 Updates Feed
          </h1>
          <p className="page-subtitle">
            Latest news and announcements
          </p>
        </div>
        {canPost&&(
          <button
            className="btn btn-primary btn-sm"
            onClick={()=>setShowAdd(true)}>
            + New Post
          </button>
        )}
      </div>

      {cats.length>1&&(
        <div className="tabs" style={{
          marginBottom:20,flexWrap:"wrap"
        }}>
          {cats.map(c=>(
            <button key={c}
              className={
                "tab"+(filter===c?" active":"")
              }
              onClick={()=>setFilter(c)}>
              {c.charAt(0).toUpperCase()+
               c.slice(1)}
            </button>
          ))}
        </div>
      )}

      {loading?(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:12
        }}>
          {[1,2,3].map(i=>(
            <div key={i} className="card">
              <div style={{
                display:"flex",gap:12,
                marginBottom:12
              }}>
                <div className="skeleton skel-avatar"/>
                <div style={{flex:1}}>
                  <div className="skeleton skel-h2"
                    style={{marginBottom:8}}/>
                  <div className="skeleton skel-p-short"/>
                </div>
              </div>
              <div className="skeleton"
                style={{height:60}}/>
            </div>
          ))}
        </div>
      ):filtered.length===0?(
        <EmptyState icon="📋"
          title="No updates yet"
          desc="Check back later"/>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:12
        }}>
          {filtered.map(u=>(
            <UpdateCard key={u.id}
              update={u} emp={emp}
              onDelete={load}/>
          ))}
        </div>
      )}

      {showAdd&&(
        <NewUpdateModal emp={emp}
          onClose={()=>setShowAdd(false)}
          onDone={()=>{
            setShowAdd(false);load();
          }}/>
      )}
    </div>
  );
}

/* ── UpdateCard ── */
function UpdateCard({update:u,emp,onDelete}){
  const {showToast}=useApp();
  const [expanded,setExpanded]=useState(false);
  const canDel=isOwn(emp)||
    emp?.id===u.author_id||
    emp?.role==="Manager";

  const catColor={
    announcement:"#3B82F6",
    update:"#10B981",
    alert:"#EF4444",
    info:"#8B5CF6"
  }[u.category]||"var(--primary)";

  async function del(){
    if(!confirm("Delete this post?")) return;
    try{
      await withRetry(()=>
        sb.from("updates_feed")
          .delete().eq("id",u.id)
      );
      showToast("Post deleted","success");
      onDelete();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  return(
    <div className="card fade-in" style={{
      borderLeft:"3px solid "+catColor
    }}>
      <div style={{
        display:"flex",
        alignItems:"flex-start",
        justifyContent:"space-between",
        gap:12,marginBottom:12
      }}>
        <div style={{
          display:"flex",
          alignItems:"center",gap:10
        }}>
          <div style={{
            width:38,height:38,borderRadius:10,
            background:`linear-gradient(135deg,
              ${RC[u.author?.role]?.c||"#64748B"},
              ${RC[u.author?.role]?.c||"#64748B"}88)`,
            display:"flex",alignItems:"center",
            justifyContent:"center",
            fontSize:18,flexShrink:0
          }}>
            {RC[u.author?.role]?.i||"👤"}
          </div>
          <div>
            <div style={{
              fontSize:13,fontWeight:700,
              color:"var(--text)"
            }} dir="auto">
              {u.author?.full_name||"Unknown"}
            </div>
            <div style={{
              fontSize:11,
              color:"var(--text-muted)"
            }}>
              {fmt.ago(u.created_at)}
            </div>
          </div>
        </div>
        <div style={{
          display:"flex",
          alignItems:"center",gap:8
        }}>
          {u.category&&(
            <span style={{
              fontSize:10,fontWeight:800,
              color:catColor,
              background:catColor+"15",
              border:"1px solid "+catColor+"30",
              borderRadius:20,
              padding:"3px 10px",
              textTransform:"uppercase",
              letterSpacing:1
            }}>
              {u.category}
            </span>
          )}
          {canDel&&(
            <button
              className="btn-icon btn-icon-sm"
              onClick={del}
              style={{
                width:28,height:28,fontSize:14
              }}>
              🗑️
            </button>
          )}
        </div>
      </div>

      {u.title&&(
        <div style={{
          fontSize:15,fontWeight:800,
          color:"var(--text)",
          marginBottom:8,lineHeight:1.3
        }} dir="auto">{u.title}</div>
      )}

      <div style={{
        fontSize:13,color:"var(--text-sub)",
        lineHeight:1.7,
        maxHeight:expanded?"none":"80px",
        overflow:"hidden",position:"relative"
      }} dir="auto">
        {u.content}
        {!expanded&&
         (u.content?.length||0)>200&&(
          <div style={{
            position:"absolute",bottom:0,
            left:0,right:0,height:40,
            background:
              "linear-gradient(transparent,"+
              "var(--card))"
          }}/>
        )}
      </div>

      {(u.content?.length||0)>200&&(
        <button className="btn-link"
          style={{marginTop:8,fontSize:12}}
          onClick={()=>setExpanded(s=>!s)}>
          {expanded?"Show less ▲":"Read more ▼"}
        </button>
      )}
    </div>
  );
}

/* ── NewUpdateModal ── */
function NewUpdateModal({emp,onClose,onDone}){
  const {showToast}=useApp();
  const [form,setForm]=useState({
    title:"",content:"",category:"update"
  });
  const [loading,setLoading]=useState(false);
  function upd(k,v){setForm(f=>({...f,[k]:v}));}

  async function submit(e){
    e.preventDefault();
    if(!form.content.trim()){
      showToast("Content required","warning");
      return;
    }
    setLoading(true);
    try{
      await withRetry(()=>
        sb.from("updates_feed").insert({
          title:form.title||null,
          content:form.content.trim(),
          category:form.category,
          author_id:emp.id
        })
      );
      showToast("Post published ✅","success");
      onDone();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setLoading(false);}
  }

  return(
    <Portal>
      <div className="modal-overlay"
        onClick={e=>
          e.target===e.currentTarget&&
          onClose()}>
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">
              📋 New Post
            </h3>
            <button
              className="btn-icon btn-icon-sm"
              onClick={onClose}>×</button>
          </div>
          <form onSubmit={submit}>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Title (optional)
              </label>
              <input type="text"
                className="input"
                value={form.title}
                onChange={e=>
                  upd("title",e.target.value)}
                placeholder="Post title..."
                dir="auto"/>
            </div>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Content *
              </label>
              <textarea className="input"
                value={form.content}
                onChange={e=>
                  upd("content",e.target.value)}
                placeholder="Write your update..."
                rows={5} dir="auto" required/>
            </div>
            <div className="input-group"
              style={{marginBottom:20}}>
              <label className="input-label">
                Category
              </label>
              <select className="input"
                value={form.category}
                onChange={e=>
                  upd("category",e.target.value)}>
                <option value="update">
                  📋 Update
                </option>
                <option value="announcement">
                  📢 Announcement
                </option>
                <option value="alert">
                  🚨 Alert
                </option>
                <option value="info">
                  ℹ️ Info
                </option>
              </select>
            </div>
            <div className="modal-footer" style={{
              paddingTop:0,borderTop:"none",
              marginTop:0
            }}>
              <button type="button"
                className="btn btn-ghost"
                style={{flex:1}}
                onClick={onClose}>
                Cancel
              </button>
              <button type="submit"
                className="btn btn-primary"
                style={{flex:1}}
                disabled={loading}>
                {loading
                  ?<><Spinner size="sm" white/>
                     {" "}Publishing...</>
                  :"📋 Publish"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

/* ============================================================
   S11: SCHEDULE
   ============================================================ */
function Schedule({emp}){
  const [shifts, setShifts] =useState([]);
  const [loading,setLoading]=useState(true);
  const [week,   setWeek]   =useState(0);

  const weekStart=useMemo(()=>{
    const d=new Date();
    d.setDate(d.getDate()-d.getDay()+week*7);
    d.setHours(0,0,0,0);
    return d;
  },[week]);

  const weekDays=useMemo(()=>
    Array.from({length:7},(_,i)=>{
      const d=new Date(weekStart);
      d.setDate(d.getDate()+i);
      return d;
    })
  ,[weekStart]);

  useEffect(()=>{load();},[weekStart]);

  async function load(){
    setLoading(true);
    const from=weekStart.toISOString();
    const to=new Date(
      weekStart.getTime()+7*24*3600*1000
    ).toISOString();
    const {data}=await withRetry(()=>
      sb.from("schedules")
        .select(
          "*,employee:employees(full_name,role)"
        )
        .gte("shift_date",from)
        .lt("shift_date",to)
        .order("shift_date")
    );
    setShifts(data||[]);
    setLoading(false);
  }

  const DAYS=["Sun","Mon","Tue","Wed",
               "Thu","Fri","Sat"];

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            📅 Schedule
          </h1>
          <p className="page-subtitle">
            Weekly shift overview
          </p>
        </div>
        <div style={{
          display:"flex",alignItems:"center",
          gap:8
        }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={()=>setWeek(w=>w-1)}>
            ← Prev
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={()=>setWeek(0)}
            style={{
              color:week===0
                ?"var(--primary)":undefined
            }}>
            Today
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={()=>setWeek(w=>w+1)}>
            Next →
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div style={{
        display:"grid",
        gridTemplateColumns:
          "repeat(7,minmax(0,1fr))",
        gap:6,marginBottom:20
      }}>
        {weekDays.map((d,i)=>{
          const isToday=
            d.toDateString()===
            new Date().toDateString();
          const dayShifts=shifts.filter(s=>
            new Date(s.shift_date)
              .toDateString()===
            d.toDateString()
          );
          return(
            <div key={i} style={{
              background:isToday
                ?"rgba(var(--primary-rgb),0.08)"
                :"var(--glass2)",
              border:"1px solid "+(isToday
                ?"var(--primary)"
                :"var(--border)"),
              borderRadius:12,
              padding:"10px 6px",
              minHeight:90
            }}>
              <div style={{
                fontSize:9,fontWeight:800,
                color:isToday
                  ?"var(--primary)"
                  :"var(--text-muted)",
                textAlign:"center",
                marginBottom:3,
                textTransform:"uppercase",
                letterSpacing:1
              }}>{DAYS[i]}</div>
              <div style={{
                fontSize:14,fontWeight:800,
                color:"var(--text)",
                textAlign:"center",
                marginBottom:6
              }}>
                {d.getDate()}
              </div>
              <div style={{
                display:"flex",
                flexDirection:"column",gap:3
              }}>
                {dayShifts.map(s=>(
                  <div key={s.id} style={{
                    background:
                      "rgba(var(--primary-rgb),0.12)",
                    borderRadius:5,
                    padding:"2px 4px",
                    fontSize:9,fontWeight:700,
                    color:"var(--primary)",
                    textAlign:"center",
                    overflow:"hidden",
                    textOverflow:"ellipsis",
                    whiteSpace:"nowrap"
                  }}>
                    {s.start_time}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift List */}
      {loading?(
        <div className="skeleton"
          style={{height:200}}/>
      ):shifts.length===0?(
        <EmptyState icon="📅"
          title="No shifts this week"
          desc="Schedule is empty"/>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {shifts.map(s=>(
            <div key={s.id} className="card">
              <div style={{
                display:"flex",
                alignItems:"center",gap:12
              }}>
                <div style={{
                  width:40,height:40,
                  borderRadius:10,
                  background:`linear-gradient(135deg,
                    ${RC[s.employee?.role]?.c
                      ||"#64748B"},
                    ${RC[s.employee?.role]?.c
                      ||"#64748B"}88)`,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontSize:18,flexShrink:0
                }}>
                  {RC[s.employee?.role]?.i||"👤"}
                </div>
                <div style={{flex:1}}>
                  <div style={{
                    fontSize:13,fontWeight:700,
                    color:"var(--text)"
                  }} dir="auto">
                    {s.employee?.full_name}
                  </div>
                  <div style={{
                    fontSize:11,
                    color:"var(--text-muted)",
                    marginTop:2
                  }}>
                    {fmt.date(s.shift_date)} ·{" "}
                    {s.start_time}–{s.end_time}
                  </div>
                </div>
                {s.shift_type&&(
                  <span style={{
                    fontSize:11,fontWeight:700,
                    color:"var(--primary)",
                    background:
                      "rgba(var(--primary-rgb),0.1)",
                    borderRadius:20,
                    padding:"4px 12px",
                    flexShrink:0
                  }}>
                    {s.shift_type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   S12: ATTENDANCE
   ============================================================ */
function Attendance({emp}){
  const {showToast}=useApp();
  const [records, setRecords] =useState([]);
  const [loading, setLoading] =useState(true);
  const [today,   setToday]   =useState(null);
  const [clocking,setClocking]=useState(false);
  const timer=useTimer(
    today&&!today.clock_out
      ?today.clock_in:null
  );

  useEffect(()=>{
    load();
    ChannelMgr.sub(
      "att-rt","attendance",()=>load(),
      {filter:"employee_id=eq."+emp.id}
    );
    return()=>ChannelMgr.unsub("att-rt");
  },[]);

  async function load(){
    const todayStr=new Date()
      .toISOString().split("T")[0];
    const [all,tod]=await Promise.all([
      withRetry(()=>
        sb.from("attendance")
          .select("*")
          .eq("employee_id",emp.id)
          .order("clock_in",{ascending:false})
          .limit(30)
      ),
      withRetry(()=>
        sb.from("attendance")
          .select("*")
          .eq("employee_id",emp.id)
          .gte("clock_in",
            todayStr+"T00:00:00")
          .maybeSingle()
      )
    ]);
    setRecords(all.data||[]);
    setToday(tod.data||null);
    setLoading(false);
  }

  async function clockIn(){
    setClocking(true);
    try{
      await withRetry(()=>
        sb.from("attendance").insert({
          employee_id:emp.id,
          clock_in:new Date().toISOString()
        })
      );
      showToast("Clocked in ✅","success");
      load();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setClocking(false);}
  }

  async function clockOut(){
    if(!today) return;
    setClocking(true);
    try{
      await withRetry(()=>
        sb.from("attendance")
          .update({
            clock_out:new Date().toISOString()
          })
          .eq("id",today.id)
      );
      showToast("Clocked out 👋","success");
      load();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setClocking(false);}
  }

  const isClockedIn=today&&!today.clock_out;

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            ✅ Attendance
          </h1>
          <p className="page-subtitle">
            Track your working hours
          </p>
        </div>
      </div>

      {/* Clock Card */}
      <div className="card" style={{
        marginBottom:20,textAlign:"center",
        padding:"28px 20px"
      }}>
        <div style={{
          fontSize:52,marginBottom:12,
          animation:
            "float 3s ease-in-out infinite"
        }}>
          {isClockedIn?"⏱️":"🕐"}
        </div>
        {isClockedIn?(
          <>
            <div style={{
              fontSize:13,fontWeight:700,
              color:"var(--success)",
              marginBottom:6
            }}>
              🟢 Currently Clocked In
            </div>
            <div style={{
              fontSize:28,fontWeight:800,
              color:"var(--text)",
              fontVariantNumeric:"tabular-nums",
              marginBottom:4,letterSpacing:1
            }}>{timer}</div>
            <div style={{
              fontSize:12,
              color:"var(--text-muted)",
              marginBottom:20
            }}>
              Since {fmt.time(today.clock_in)}
            </div>
            <button
              className="btn btn-danger"
              style={{
                padding:"12px 32px",fontSize:14
              }}
              onClick={clockOut}
              disabled={clocking}>
              {clocking
                ?<><Spinner size="sm" white/>
                   {" "}Processing...</>
                :"🚪 Clock Out"
              }
            </button>
          </>
        ):(
          <>
            <div style={{
              fontSize:13,fontWeight:700,
              color:"var(--text-muted)",
              marginBottom:16
            }}>
              {today?.clock_out
                ?"✅ Shift completed today"
                :"Not clocked in"
              }
            </div>
            {!today?.clock_out&&(
              <button
                className="btn btn-success"
                style={{
                  padding:"12px 32px",
                  fontSize:14
                }}
                onClick={clockIn}
                disabled={clocking}>
                {clocking
                  ?<><Spinner size="sm" white/>
                     {" "}Processing...</>
                  :"✅ Clock In"
                }
              </button>
            )}
          </>
        )}
      </div>

      {/* Today Summary */}
      {today&&(
        <div className="card"
          style={{marginBottom:20}}>
          <div className="card-title"
            style={{marginBottom:14}}>
            📊 Today's Summary
          </div>
          <div style={{
            display:"grid",
            gridTemplateColumns:"1fr 1fr 1fr",
            gap:12
          }}>
            {[
              {
                l:"Clock In",
                v:fmt.time(today.clock_in),
                c:"var(--success)"
              },
              {
                l:"Clock Out",
                v:today.clock_out
                  ?fmt.time(today.clock_out)
                  :"--",
                c:"var(--danger)"
              },
              {
                l:"Duration",
                v:today.clock_out
                  ?fmt.duration(
                    new Date(today.clock_out)-
                    new Date(today.clock_in)
                  ):timer,
                c:"var(--primary)"
              }
            ].map(item=>(
              <div key={item.l} style={{
                background:"var(--glass2)",
                border:"1px solid var(--border)",
                borderRadius:12,
                padding:"14px 12px",
                textAlign:"center"
              }}>
                <div style={{
                  fontSize:10,fontWeight:700,
                  color:"var(--text-muted)",
                  marginBottom:6,
                  textTransform:"uppercase",
                  letterSpacing:0.5
                }}>{item.l}</div>
                <div style={{
                  fontSize:16,fontWeight:800,
                  color:item.c,
                  fontVariantNumeric:"tabular-nums"
                }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="card-title"
          style={{marginBottom:14}}>
          📋 Recent History
        </div>
        {loading?(
          <div style={{
            display:"flex",
            flexDirection:"column",gap:8
          }}>
            {[1,2,3].map(i=>(
              <div key={i} className="skeleton"
                style={{height:56}}/>
            ))}
          </div>
        ):records.length===0?(
          <EmptyState icon="📋"
            title="No records yet"/>
        ):(
          <div style={{
            display:"flex",
            flexDirection:"column",gap:6
          }}>
            {records.map(r=>{
              const isActive=!r.clock_out;
              const dur=r.clock_out
                ?fmt.duration(
                  new Date(r.clock_out)-
                  new Date(r.clock_in)
                ):"In progress";
              return(
                <div key={r.id} style={{
                  display:"flex",
                  alignItems:"center",
                  gap:12,padding:"10px 14px",
                  background:isActive
                    ?"rgba(16,185,129,0.06)"
                    :"var(--glass2)",
                  border:"1px solid "+(isActive
                    ?"rgba(16,185,129,0.2)"
                    :"var(--border)"),
                  borderRadius:10
                }}>
                  <div style={{
                    width:8,height:8,
                    borderRadius:"50%",
                    background:isActive
                      ?"var(--success)"
                      :"var(--text-muted)",
                    flexShrink:0,
                    animation:isActive
                      ?"pulse 2s infinite"
                      :"none"
                  }}/>
                  <div style={{flex:1}}>
                    <div style={{
                      fontSize:12,fontWeight:700,
                      color:"var(--text)"
                    }}>
                      {fmt.date(r.clock_in)}
                    </div>
                    <div style={{
                      fontSize:11,
                      color:"var(--text-muted)",
                      marginTop:2
                    }}>
                      {fmt.time(r.clock_in)}
                      {r.clock_out
                        ?" → "+
                          fmt.time(r.clock_out)
                        :" → now"
                      }
                    </div>
                  </div>
                  <div style={{
                    fontSize:12,fontWeight:700,
                    color:isActive
                      ?"var(--success)"
                      :"var(--text-sub)",
                    textAlign:"right",
                    flexShrink:0
                  }}>
                    {dur}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
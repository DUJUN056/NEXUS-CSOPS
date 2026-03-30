/* ============================================================
   CSOPS نظام الحصن v4.1.0
   JS - Config + Helpers + Core Components
   ============================================================ */

/* ── Imports ── */
const {
  useState,useEffect,useRef,
  useMemo,useCallback,useContext,
  createContext,memo
}=React;

/* ============================================================
   CONFIG & CONSTANTS
   ============================================================ */
const APP         ="🏰 نظام الحصن";
const VER         ="4.1.0";
const SUPABASE_URL=window.ENV_SUPABASE_URL||"";
const SUPABASE_KEY=window.ENV_SUPABASE_KEY||"";
const MAX_ATTEMPTS=5;
const LOCKOUT_MS  =15*60*1000;

/* ── Supabase Client ── */
const sb=supabase.createClient(
  SUPABASE_URL,SUPABASE_KEY,{
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    },
    realtime:{
      params:{eventsPerSecond:10}
    }
  }
);

/* ============================================================
   ROLE CONFIG (RC)
   ============================================================ */
const RC={
  Owner:     {i:"👑",c:"#EAB308",l:"Owner"},
  Manager:   {i:"🎯",c:"#8B5CF6",l:"Manager"},
  Supervisor:{i:"🔷",c:"#3B82F6",l:"Supervisor"},
  Agent:     {i:"🎧",c:"#10B981",l:"Agent"},
  Support:   {i:"🛠️",c:"#F97316",l:"Support"},
  Trainer:   {i:"📚",c:"#06B6D4",l:"Trainer"},
  QA:        {i:"🔍",c:"#EC4899",l:"QA"},
  HR:        {i:"👥",c:"#84CC16",l:"HR"}
};

/* ============================================================
   STATUS CONFIG (SC)
   ============================================================ */
const SC={
  Online:      {i:"🟢",c:"#10B981",pulse:true,
                cls:"status-online"},
  Offline:     {i:"⚫",c:"#64748B",pulse:false,
                cls:"status-offline"},
  "On Call":   {i:"📞",c:"#3B82F6",pulse:true,
                cls:"status-oncall"},
  Break:       {i:"☕",c:"#F59E0B",pulse:false,
                cls:"status-break"},
  "Short Break":{i:"⏸️",c:"#F59E0B",pulse:false,
                cls:"status-break"},
  Lunch:       {i:"🍽️",c:"#FB923C",pulse:false,
                cls:"status-lunch"},
  Prayer:      {i:"🕌",c:"#10B981",pulse:true,
                cls:"status-prayer"},
  Busy:        {i:"🔴",c:"#EF4444",pulse:true,
                cls:"status-busy"},
  Meeting:     {i:"👔",c:"#8B5CF6",pulse:false,
                cls:"status-meeting"},
  Training:    {i:"📚",c:"#06B6D4",pulse:false,
                cls:"status-training"},
  Away:        {i:"🌙",c:"#94A3B8",pulse:false,
                cls:"status-away"}
};

/* ============================================================
   DEPARTMENT CONFIG (DEPT)
   ============================================================ */
const DEPT={
  KFOOD:   {i:"🍔",c:"#EF4444"},
  MRSOOL:  {i:"🛵",c:"#F97316"},
  JAHEZ:   {i:"🚀",c:"#8B5CF6"},
  HUNGER:  {i:"🍕",c:"#EC4899"},
  NANA:    {i:"🌿",c:"#10B981"},
  ADMIN:   {i:"🏢",c:"#64748B"},
  HR:      {i:"👥",c:"#84CC16"},
  QA:      {i:"🔍",c:"#06B6D4"},
  TRAINING:{i:"📚",c:"#F59E0B"}
};

/* ============================================================
   PAGE ACCESS (PA)
   ============================================================ */
const PA={
  "Updates Feed":  ["Owner","Manager","Supervisor",
                    "Agent","Support","Trainer",
                    "QA","HR"],
  "Live Floor":    ["Owner","Manager","Supervisor",
                    "QA"],
  "Queue":         ["Owner","Manager","Supervisor",
                    "Agent","Support"],
  "Schedule":      ["Owner","Manager","Supervisor",
                    "HR","Agent","Trainer"],
  "Attendance":    ["Owner","Manager","Supervisor",
                    "HR","Agent","Support",
                    "Trainer","QA"],
  "Performance":   ["Owner","Manager","Supervisor",
                    "QA","Trainer"],
  "Notifications": ["Owner","Manager","Supervisor",
                    "Agent","Support","Trainer",
                    "QA","HR"],
  "My Profile":    ["Owner","Manager","Supervisor",
                    "Agent","Support","Trainer",
                    "QA","HR"],
  "My Workspace":  ["Owner","Manager","Supervisor",
                    "Agent","Support","Trainer",
                    "QA","HR"],
  "System Settings":["Owner","Manager"]
};

/* ── Guaranteed Pages (Blank Slate) ── */
const GUARANTEED_PAGES=[
  "Updates Feed",
  "Notifications",
  "My Profile",
  "My Workspace"
];

/* ============================================================
   PAGE ICONS (PI)
   ============================================================ */
const PI={
  "Updates Feed":   "📋",
  "Live Floor":     "🖥️",
  "Queue":          "🎧",
  "Schedule":       "📅",
  "Attendance":     "✅",
  "Performance":    "📊",
  "Notifications":  "🔔",
  "My Profile":     "👤",
  "My Workspace":   "📓",
  "System Settings":"⚙️"
};

/* ============================================================
   THEMES CONFIG
   ============================================================ */
const THEMES_ALL=[
  {id:"dark",    label:"Dark",    icon:"🌑",
   tier:"free",  preview:"#0A0A0F"},
  {id:"light",   label:"Light",   icon:"☀️",
   tier:"free",  preview:"#F4F4F8"},
  {id:"midnight",label:"Midnight",icon:"🌊",
   tier:"free",  preview:"#050914"},
  {id:"emerald", label:"Emerald", icon:"💚",
   tier:"premium",preview:"#030D09"},
  {id:"sunset",  label:"Sunset",  icon:"🌅",
   tier:"premium",preview:"#0F0805"},
  {id:"rose",    label:"Rose",    icon:"🌸",
   tier:"premium",preview:"#0F080A"},
  {id:"arctic",  label:"Arctic",  icon:"❄️",
   tier:"premium",preview:"#F0F6FF"},
  {id:"gold",    label:"Gold",    icon:"👑",
   tier:"owner", preview:"#0A0800"},
  {id:"saudi",   label:"Saudi",   icon:"🇸🇦",
   tier:"owner", preview:"#dynamic"}
];

/* ============================================================
   HELPERS
   ============================================================ */
const isOwn =(e)=>e?.is_owner===true;
const isMgr =(r)=>["Owner","Manager","Supervisor"]
  .includes(r);
const canFreeze=(e)=>isOwn(e)||
  e?.role==="Manager";

function getSaudiPeriod(){
  const h=new Date().getHours();
  if(h>=4  &&h<7)  return "saudi-fajr";
  if(h>=7  &&h<17) return "saudi-day";
  if(h>=17 &&h<20) return "saudi-sunset";
  return "saudi-night";
}

/* ============================================================
   FORMAT HELPERS (fmt)
   ============================================================ */
const fmt={
  ago(ts){
    if(!ts) return "Never";
    const s=Math.floor(
      (Date.now()-new Date(ts))/1000
    );
    if(s<5)   return "Just now";
    if(s<60)  return s+"s ago";
    if(s<3600)return Math.floor(s/60)+"m ago";
    if(s<86400)return Math.floor(s/3600)+"h ago";
    return Math.floor(s/86400)+"d ago";
  },
  time(ts){
    if(!ts) return "--";
    return new Date(ts).toLocaleTimeString(
      "en-US",{
        hour:"2-digit",minute:"2-digit",
        hour12:true
      }
    );
  },
  date(ts){
    if(!ts) return "--";
    return new Date(ts).toLocaleDateString(
      "en-US",{
        month:"short",day:"numeric",
        year:"numeric"
      }
    );
  },
  dateShort(ts){
    if(!ts) return "--";
    return new Date(ts).toLocaleDateString(
      "en-US",{month:"short",day:"numeric"}
    );
  },
  duration(ms){
    if(!ms||ms<0) return "0m";
    const h=Math.floor(ms/3600000);
    const m=Math.floor((ms%3600000)/60000);
    if(h>0) return h+"h "+m+"m";
    return m+"m";
  },
  timer(ms){
    if(!ms||ms<0) return "00:00:00";
    const h=Math.floor(ms/3600000);
    const m=Math.floor((ms%3600000)/60000);
    const s=Math.floor((ms%60000)/1000);
    return [
      h.toString().padStart(2,"0"),
      m.toString().padStart(2,"0"),
      s.toString().padStart(2,"0")
    ].join(":");
  },
  percent(v,max=100){
    return Math.round((v/max)*100)+"%";
  },
  number(n){
    if(n===null||n===undefined) return "--";
    return n.toLocaleString("en-US");
  }
};

/* ============================================================
   withRetry - Network resilience
   ============================================================ */
async function withRetry(fn,retries=3,delay=800){
  for(let i=0;i<retries;i++){
    try{return await fn();}
    catch(err){
      if(i===retries-1) throw err;
      await new Promise(r=>
        setTimeout(r,delay*Math.pow(2,i))
      );
    }
  }
}

/* ============================================================
   CHANNEL MANAGER - Realtime subscriptions
   ============================================================ */
const ChannelMgr={
  channels:{},
  sub(key,table,cb,opts={}){
    this.unsub(key);
    let ch=sb.channel(
      "csops-"+key+"-"+Date.now()
    );
    const ev={
      event:"*",schema:"public",table
    };
    if(opts.filter) ev.filter=opts.filter;
    ch=ch.on(
      "postgres_changes",ev,
      (payload)=>cb(payload)
    ).subscribe();
    this.channels[key]=ch;
  },
  unsub(key){
    if(this.channels[key]){
      sb.removeChannel(this.channels[key]);
      delete this.channels[key];
    }
  },
  unsubAll(){
    Object.keys(this.channels)
      .forEach(k=>this.unsub(k));
  }
};

/* ============================================================
   HOOKS
   ============================================================ */

/* ── useTimer: live elapsed time ── */
function useTimer(startTs){
  const [elapsed,setElapsed]=useState("--");
  useEffect(()=>{
    if(!startTs){setElapsed("--");return;}
    function tick(){
      const ms=Date.now()-new Date(startTs);
      setElapsed(fmt.timer(ms));
    }
    tick();
    const t=setInterval(tick,1000);
    return()=>clearInterval(t);
  },[startTs]);
  return elapsed;
}

/* ── useOnline: network status ── */
function useOnline(){
  const [online,setOnline]=
    useState(navigator.onLine);
  useEffect(()=>{
    const on =()=>setOnline(true);
    const off=()=>setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline',off);
    return()=>{
      window.removeEventListener('online', on);
      window.removeEventListener('offline',off);
    };
  },[]);
  return online;
}

/* ── useLocalStorage ── */
function useLocalStorage(key,init){
  const [val,setVal]=useState(()=>{
    try{
      const s=localStorage.getItem(key);
      return s?JSON.parse(s):init;
    }catch{return init;}
  });
  function set(v){
    const next=typeof v==="function"?v(val):v;
    setVal(next);
    try{
      localStorage.setItem(
        key,JSON.stringify(next)
      );
    }catch{}
  }
  return [val,set];
}

/* ── useDebounce ── */
function useDebounce(value,delay=300){
  const [dv,setDv]=useState(value);
  useEffect(()=>{
    const t=setTimeout(()=>setDv(value),delay);
    return()=>clearTimeout(t);
  },[value,delay]);
  return dv;
}

/* ============================================================
   CONTEXT
   ============================================================ */
const AppCtx=createContext(null);
function useApp(){return useContext(AppCtx);}

function AppProvider({children}){
  const [toasts,setToasts]=useState([]);

  const showToast=useCallback(
    (message,type="info",duration=4000)=>{
      const id=Date.now()+Math.random();
      setToasts(t=>[...t,{id,message,type}]);
      setTimeout(()=>
        setToasts(t=>t.filter(x=>x.id!==id))
      ,duration);
    },[]
  );

  const removeToast=useCallback((id)=>{
    setToasts(t=>t.filter(x=>x.id!==id));
  },[]);

  return(
    <AppCtx.Provider value={{showToast}}>
      {children}
      <Toasts
        toasts={toasts}
        remove={removeToast}/>
    </AppCtx.Provider>
  );
}

/* ============================================================
   CORE UI COMPONENTS
   ============================================================ */

/* ── Portal ── */
function Portal({children}){
  return ReactDOM.createPortal(
    children,
    document.getElementById('portal-root')||
    document.body
  );
}

/* ── Spinner ── */
function Spinner({size="md",white=false}){
  return(
    <div className={
      "spinner spinner-"+size+
      (white?" spinner-white":"")
    } style={white?{
      borderColor:"rgba(255,255,255,0.25)",
      borderTopColor:"#fff"
    }:{}}/>
  );
}

/* ── EmptyState ── */
function EmptyState({icon,title,desc,action}){
  return(
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {desc&&(
        <div className="empty-desc">{desc}</div>
      )}
      {action&&(
        <div style={{marginTop:8}}>{action}</div>
      )}
    </div>
  );
}

/* ── ErrorBoundary ── */
class ErrorBoundary extends React.Component{
  constructor(p){
    super(p);
    this.state={hasError:false,error:null};
  }
  static getDerivedStateFromError(e){
    return{hasError:true,error:e};
  }
  componentDidCatch(e,info){
    console.error("CSOPS Error:",e,info);
  }
  render(){
    if(this.state.hasError) return(
      <div className="error-boundary">
        <div className="error-boundary-icon">
          ⚠️
        </div>
        <div className="error-boundary-title">
          Something went wrong
        </div>
        <div className="error-boundary-desc">
          {this.state.error?.message||
           "An unexpected error occurred"}
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{marginTop:12}}
          onClick={()=>this.setState({
            hasError:false,error:null
          })}>
          Try Again
        </button>
      </div>
    );
    return this.props.children;
  }
}

/* ── Toasts ── */
function Toasts({toasts,remove}){
  return(
    <div className="toast-container">
      {toasts.map(t=>(
        <div key={t.id}
          className={"toast toast-"+t.type}
          onClick={()=>remove(t.id)}>
          <span style={{fontSize:15}}>
            {t.type==="success"?"✅"
            :t.type==="error"?"❌"
            :t.type==="warning"?"⚠️"
            :"ℹ️"}
          </span>
          <span style={{flex:1}}>
            {t.message}
          </span>
          <span style={{
            fontSize:16,
            color:"inherit",
            opacity:0.6
          }}>×</span>
        </div>
      ))}
    </div>
  );
}

/* ── StatusBadge ── */
function StatusBadge({status,size="md"}){
  const sc=SC[status]||SC["Offline"];
  return(
    <span className={
      "status-badge "+sc.cls+
      (size==="sm"?" text-xs":"")
    }>
      <span className="status-dot" style={{
        background:sc.c,
        animation:sc.pulse
          ?"pulse 2s infinite":"none",
        ...(status==="Prayer"?{
          animation:
            "prayerPulse 2.5s ease-in-out infinite"
        }:{})
      }}/>
      {status||"Offline"}
    </span>
  );
}

/* ── RoleBadge ── */
function RoleBadge({role}){
  const rc=RC[role]||RC.Agent;
  return(
    <span className="role-badge" style={{
      background:rc.c+"18",
      color:rc.c,
      border:"1px solid "+rc.c+"30"
    }}>
      {rc.i} {role}
    </span>
  );
}

/* ── DeptBadge ── */
function DeptBadge({dept}){
  const dc=DEPT[dept];
  return(
    <span className="dept-badge" style={
      dc?{
        background:dc.c+"12",
        color:dc.c,
        border:"1px solid "+dc.c+"25"
      }:{}
    }>
      {dc?.i||"🏢"} {dept}
    </span>
  );
}

/* ── NetworkBanner ── */
function NetworkBanner(){
  const online=useOnline();
  if(online) return null;
  return(
    <div className="network-banner">
      <span>📡</span>
      <span>
        No internet connection · 
        Reconnecting...
      </span>
    </div>
  );
}

/* ── SplashScreen ── */
function SplashScreen({progress}){
  return(
    <div className="splash">
      <div className="live-bg">
        <div className="live-bg-orb" style={{
          width:400,height:400,
          background:"var(--primary)",
          top:"10%",left:"20%",
          animationDelay:"0s"
        }}/>
        <div className="live-bg-orb" style={{
          width:300,height:300,
          background:"var(--success)",
          bottom:"20%",right:"15%",
          animationDelay:"-7s"
        }}/>
      </div>
      <div className="splash-logo">🏰</div>
      <div className="splash-title">{APP}</div>
      <div style={{
        fontSize:12,
        color:"var(--text-muted)",
        fontWeight:600,
        marginTop:-8
      }}>
        v{VER} · نظام الحصن
      </div>
      <div className="splash-bar-wrap">
        <div className="splash-bar" style={{
          width:progress+"%"
        }}/>
      </div>
      <div style={{
        fontSize:11,
        color:"var(--text-muted)",
        marginTop:-8
      }}>
        {progress<30?"Initializing..."
        :progress<60?"Loading modules..."
        :progress<90?"Connecting..."
        :"Ready"}
      </div>
    </div>
  );
}

/* ── LiveBackground ── */
function LiveBackground({theme}){
  const orbs=useMemo(()=>[
    {
      size:500,
      color:"var(--primary)",
      top:"5%",left:"10%",
      delay:"0s",dur:"25s"
    },
    {
      size:350,
      color:"var(--success)",
      bottom:"10%",right:"5%",
      delay:"-8s",dur:"20s"
    },
    {
      size:280,
      color:"var(--info)",
      top:"40%",right:"20%",
      delay:"-15s",dur:"30s"
    }
  ],[theme]);

  return(
    <div className="live-bg">
      {orbs.map((o,i)=>(
        <div key={i}
          className="live-bg-orb"
          style={{
            width:o.size,height:o.size,
            background:o.color,
            top:o.top,bottom:o.bottom,
            left:o.left,right:o.right,
            animationDelay:o.delay,
            animationDuration:o.dur
          }}/>
      ))}
    </div>
  );
}

/* ── FreezeOverlay ── */
function FreezeOverlay({freeze}){
  return(
    <div className="freeze-screen">
      <div className="freeze-card">
        <div style={{
          fontSize:64,marginBottom:16,
          animation:"float 3s ease-in-out infinite"
        }}>🔒</div>
        <div style={{
          fontSize:22,fontWeight:900,
          color:"#FCA5A5",marginBottom:10,
          letterSpacing:-0.5
        }}>
          System Frozen
        </div>
        <div style={{
          fontSize:14,
          color:"rgba(255,255,255,0.6)",
          lineHeight:1.7,marginBottom:20
        }}>
          {freeze?.reason||
            "System is temporarily frozen "+
            "by administrator."
          }
        </div>
        <div style={{
          background:"rgba(239,68,68,0.08)",
          border:
            "1px solid rgba(239,68,68,0.2)",
          borderRadius:12,
          padding:"12px 16px",
          fontSize:12,
          color:"rgba(255,255,255,0.4)"
        }}>
          🔒 Frozen by {freeze?.by_name||"Admin"}
          {freeze?.at
            ?" · "+fmt.ago(freeze.at):""}
        </div>
      </div>
    </div>
  );
}

/* ── SuspensionScreen ── */
function SuspensionScreen({reason}){
  return(
    <div style={{
      position:"fixed",inset:0,
      background:"#0A0A0F",
      display:"flex",alignItems:"center",
      justifyContent:"center",
      zIndex:99999,padding:20
    }}>
      <div style={{
        maxWidth:420,width:"100%",
        background:
          "linear-gradient(135deg,"+
          "rgba(239,68,68,0.08),"+
          "rgba(10,10,15,0.95))",
        border:"1px solid rgba(239,68,68,0.3)",
        borderRadius:24,
        padding:"40px 32px",
        textAlign:"center",
        animation:"scaleIn 0.4s ease",
        boxShadow:
          "0 0 60px rgba(239,68,68,0.15)"
      }}>
        <div style={{
          fontSize:64,marginBottom:16,
          animation:"float 3s ease-in-out infinite"
        }}>🚫</div>
        <div style={{
          fontSize:22,fontWeight:800,
          color:"#FCA5A5",marginBottom:12,
          letterSpacing:-0.5
        }}>
          Account Suspended
        </div>
        <div style={{
          fontSize:14,
          color:"rgba(255,255,255,0.6)",
          lineHeight:1.7,marginBottom:24
        }}>
          {reason||
            "Your account has been suspended. "+
            "Please contact your administrator."
          }
        </div>
        <div style={{
          background:"rgba(239,68,68,0.08)",
          border:
            "1px solid rgba(239,68,68,0.2)",
          borderRadius:12,
          padding:"12px 16px",
          fontSize:12,
          color:"rgba(255,255,255,0.4)"
        }}>
          🔒 Session terminated · Contact admin
        </div>
      </div>
    </div>
  );
}

/* ── ForcePasswordChange ── */
function ForcePasswordChange({emp,onComplete}){
  const {showToast}=useApp();
  const [form,setForm]=useState({
    next:"",confirm:""
  });
  const [loading,setLoading]=useState(false);
  function upd(k,v){setForm(f=>({...f,[k]:v}));}

  async function submit(e){
    e.preventDefault();
    if(form.next.length<6){
      showToast("Min 6 characters","warning");
      return;
    }
    if(form.next!==form.confirm){
      showToast(
        "Passwords don't match","warning"
      );
      return;
    }
    setLoading(true);
    try{
      const {error}=
        await sb.auth.updateUser({
          password:form.next
        });
      if(error) throw error;
      await withRetry(()=>
        sb.from("employees").update({
          must_change_password:false
        }).eq("id",emp.id)
      );
      showToast(
        "Password changed ✅","success"
      );
      onComplete();
    }catch(err){
      showToast(
        "Failed: "+err.message,"error"
      );
    }finally{setLoading(false);}
  }

  return(
    <div className="force-pw-wrap">
      <div className="force-pw-card">
        <div style={{
          fontSize:48,textAlign:"center",
          marginBottom:12,
          animation:"float 3s ease-in-out infinite"
        }}>🔑</div>
        <div style={{
          fontSize:20,fontWeight:900,
          color:"var(--text)",
          textAlign:"center",marginBottom:6
        }}>
          Change Your Password
        </div>
        <div style={{
          fontSize:13,
          color:"var(--text-muted)",
          textAlign:"center",marginBottom:24,
          lineHeight:1.5
        }}>
          You must set a new password
          before continuing
        </div>
        <form onSubmit={submit}>
          <div className="input-group"
            style={{marginBottom:14}}>
            <label className="input-label">
              New Password *
            </label>
            <input type="password"
              className="input"
              value={form.next}
              onChange={e=>
                upd("next",e.target.value)}
              placeholder="Min 6 characters"
              required autoFocus/>
          </div>
          <div className="input-group"
            style={{marginBottom:24}}>
            <label className="input-label">
              Confirm Password *
            </label>
            <input type="password"
              className="input"
              value={form.confirm}
              onChange={e=>
                upd("confirm",e.target.value)}
              placeholder="Type again"
              required/>
          </div>
          <button type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{padding:13,fontSize:14}}>
            {loading
              ?<><Spinner size="sm" white/>
                 {" "}Changing...</>
              :"🔒 Set New Password"
            }
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── CriticalAlertDisplay ── */
function CriticalAlertDisplay({
  alerts,empId,onDismiss,isAdmin
}){
  const visible=alerts.filter(a=>{
    if(!a.is_active) return false;
    const dismissed=Array.isArray(a.dismissed_by)
      ?a.dismissed_by:[];
    if(a.admin_close&&!isAdmin) return true;
    return !dismissed.includes(empId);
  });

  if(!visible.length) return null;

  const typeColor={
    critical:"var(--danger)",
    warning:"var(--warning)",
    info:"var(--info)"
  };

  return(
    <div className="critical-banner">
      {visible.map(a=>(
        <div key={a.id}
          className={
            "critical-alert "+
            (a.alert_type==="warning"
              ?"critical-alert-warning"
              :a.alert_type==="info"
                ?"critical-alert-info":"")
          }>
          <div style={{
            fontSize:20,flexShrink:0
          }}>
            {a.alert_type==="critical"?"🚨"
            :a.alert_type==="warning"?"⚠️"
            :"ℹ️"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{
              fontSize:13,fontWeight:800,
              color:typeColor[a.alert_type]
                ||"var(--danger)"
            }}>
              {a.title_en}
            </div>
            {a.body_en&&(
              <div style={{
                fontSize:12,
                color:"var(--text-sub)",
                marginTop:2,lineHeight:1.5
              }}>
                {a.body_en}
              </div>
            )}
            {a.title_ar&&(
              <div style={{
                fontSize:12,
                color:"var(--text-muted)",
                marginTop:2
              }} dir="rtl">
                {a.title_ar}
              </div>
            )}
          </div>
          {(!a.admin_close||isAdmin)&&(
            <button
              className="btn btn-ghost btn-sm"
              style={{flexShrink:0}}
              onClick={()=>onDismiss(a.id)}>
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Placeholder ── */
function Placeholder({page}){
  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {PI[page]||"📄"} {page}
          </h1>
        </div>
      </div>
      <EmptyState
        icon={PI[page]||"📄"}
        title={page+" Coming Soon"}
        desc="This page is under construction"/>
    </div>
  );
}
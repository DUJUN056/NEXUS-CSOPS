function ToastContainer(){
  var st=React.useState([]);
  var t=st[0];
  var s=st[1];
  React.useEffect(function(){
    function h(e){
      var id=Date.now()+Math.random();
      var d=e.detail;
      s(function(p){return p.concat([{id:id,message:d.message,type:d.type}])});
      setTimeout(function(){
        s(function(p){return p.filter(function(x){return x.id!==id})});
      },d.duration||3500);
    }
    window.addEventListener("nx-toast",h);
    return function(){window.removeEventListener("nx-toast",h)};
  },[]);
  if(!t.length)return null;
  return React.createElement("div",{style:{position:"fixed",bottom:24,right:24,zIndex:99999,display:"flex",flexDirection:"column",gap:8,maxWidth:340,pointerEvents:"none"}},
    t.map(function(x){
      var bg=x.type==="success"?"#22C55E":x.type==="error"?"#EF4444":x.type==="warning"?"#EAB308":"#3B82F6";
      var icon=x.type==="success"?"OK":x.type==="error"?"ERR":x.type==="warning"?"WARN":"INFO";
      return React.createElement("div",{key:x.id,style:{padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:600,color:"#fff",background:bg,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",gap:8,pointerEvents:"auto"}},
        React.createElement("span",null,icon),
        x.message
      );
    })
  );
}
function Spinner(p){
  var s=(p&&p.size==="lg")?32:(p&&p.size==="md")?20:16;
  return React.createElement("div",{style:{width:s,height:s,border:"2px solid rgba(255,255,255,0.2)",borderTop:"2px solid currentColor",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}});
}
function LoadingPage(p){
  return React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:16}},
    React.createElement(Spinner,{size:"lg"}),
    React.createElement("p",{style:{fontSize:13,color:"var(--text-muted)"}},(p&&p.message)||"Loading...")
  );
}
function EmptyState(p){
  return React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 24px",gap:12,textAlign:"center"}},
    React.createElement("div",{style:{fontSize:48}},(p&&p.icon)||"?"),
    React.createElement("h3",{style:{fontSize:16,fontWeight:700,color:"var(--text)"}},(p&&p.title)||"Nothing here"),
    (p&&p.desc)?React.createElement("p",{style:{fontSize:13,color:"var(--text-muted)",maxWidth:300,lineHeight:1.6}},p.desc):null
  );
}
function PageHeader(p){
  return React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,gap:12,flexWrap:"wrap"}},
    React.createElement("div",null,
      React.createElement("h1",{style:{fontSize:22,fontWeight:900,color:"var(--text)",display:"flex",alignItems:"center",gap:8}},
        p.icon?React.createElement("span",null,p.icon):null,
        p.title
      ),
      p.subtitle?React.createElement("p",{style:{fontSize:13,color:"var(--text-muted)",marginTop:4}},p.subtitle):null
    ),
    p.actions?React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},p.actions):null
  );
}
function SectionHeader(p){
  return React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
    React.createElement("h3",{className:"nx-section-title"},p.title),
    p.action||null
  );
}
function Tabs(p){
  return React.createElement("div",{className:"nx-tabs"},
    (p.tabs||[]).filter(Boolean).map(function(tab){
      return React.createElement("button",{
        key:tab.id,
        className:"nx-tab"+(p.active===tab.id?" active":""),
        onClick:function(){p.onChange(tab.id)}
      },tab.label);
    })
  );
}
function NxAvatar(p){
  var user=p.user;
  var size=p.size||"sm";
  var px={xs:24,sm:32,md:40,lg:56,xl:72}[size]||32;
  var fs=Math.floor(px*0.4);
  var name=(user&&user.full_name)?user.full_name:"?";
  var initials=name.split(" ").map(function(w){return w[0]||""}).join("").toUpperCase().slice(0,2);
  var colors=["#3B82F6","#22C55E","#EAB308","#EF4444","#8B5CF6","#F97316","#06B6D4","#84CC16"];
  var bg=colors[name.charCodeAt(0)%colors.length]||colors[0];
  if(user&&user.avatar_url){
    return React.createElement("img",{
      src:user.avatar_url,alt:name,
      style:{width:px,height:px,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"2px solid var(--border)"},
      onError:function(e){e.target.style.display="none"}
    });
  }
  return React.createElement("div",{style:{width:px,height:px,borderRadius:"50%",background:bg+"33",border:"2px solid "+bg+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:fs,fontWeight:800,color:bg,flexShrink:0,userSelect:"none"}},initials);
}
function RoleBadge(p){
  if(!p.role)return null;
  var color=RC.color[p.role]||"#94A3B8";
  var icon=RC.icon[p.role]||"?";
  return React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:color,background:color+"22",border:"1px solid "+color+"44",padding:"2px 8px",borderRadius:20}},icon+" "+p.role);
}
function StatusBadge(p){
  var s=STATUS_MAP[p.status]||{label:p.status||"Unknown",color:"#6B7280"};
  return React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:s.color,background:s.color+"22",border:"1px solid "+s.color+"44",padding:"2px 8px",borderRadius:20}},
    React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:s.color,flexShrink:0}}),
    s.label
  );
}
function PriorityBadge(p){
  var map={
    low:{label:"Low",color:"#22C55E"},
    medium:{label:"Medium",color:"#EAB308"},
    high:{label:"High",color:"#EF4444"},
    critical:{label:"Critical",color:"#7C3AED"}
  };
  var x=map[p.priority]||map.medium;
  return React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:x.color,background:x.color+"22",border:"1px solid "+x.color+"44",padding:"2px 6px",borderRadius:20}},x.label);
}
function SearchInput(p){
  return React.createElement("div",{style:{position:"relative",flex:1,minWidth:200}},
    React.createElement("input",{
      type:"text",
      className:"nx-input",
      placeholder:p.placeholder||"Search...",
      value:p.value||"",
      onChange:function(e){p.onChange(e.target.value)},
      style:{paddingLeft:14}
    })
  );
}
function TimerDisplay(p){
  if(p.seconds===null||p.seconds===undefined)return React.createElement("span",null,"--");
  var s=Math.abs(Math.floor(p.seconds));
  var m=Math.floor(s/60);
  var sec=s%60;
  return React.createElement("span",{style:{fontVariantNumeric:"tabular-nums",fontWeight:800,color:p.exceeded?"var(--danger)":"var(--text)",fontSize:"inherit"}},m+":"+String(sec).padStart(2,"0"));
}
function FileUploadBtn(p){
  var ref=React.useRef(null);
  return React.createElement("div",null,
    React.createElement("input",{
      ref:ref,type:"file",accept:p.accept||"*",style:{display:"none"},
      onChange:function(e){var f=e.target.files&&e.target.files[0];if(f)p.onFile(f);e.target.value=""}
    }),
    React.createElement("button",{
      className:"nx-btn nx-btn-secondary nx-btn-sm",
      onClick:function(){if(ref.current)ref.current.click()}
    },p.label||"Upload")
  );
}
function OwnerAnalytics(p){
  var _1=React.useState(null);
  var stats=_1[0];var setStats=_1[1];
  var _2=React.useState(true);
  var loading=_2[0];var setLoading=_2[1];
  React.useEffect(function(){load()},[]);
  function load(){
    var today=new Date().toISOString().split("T")[0];
    var week=new Date(Date.now()-7*86400000).toISOString().split("T")[0];
    Promise.all([
      withRetry(function(){return sb.from("employees").select("id,is_online,is_suspended").eq("is_active",true)}),
      withRetry(function(){return sb.from("attendance").select("id,status").eq("date",today)}),
      withRetry(function(){return sb.from("breaks").select("id,status,end_time").eq("date",today)}),
      withRetry(function(){return sb.from("kpi_entries").select("calls_handled,csat_score").gte("entry_date",week)})
    ]).then(function(r){
      var emps=r[0].data||[];
      var att=r[1].data||[];
      var brks=r[2].data||[];
      var kpis=r[3].data||[];
      setStats({
        totalEmps:emps.length,
        online:emps.filter(function(e){return e.is_online}).length,
        suspended:emps.filter(function(e){return e.is_suspended}).length,
        todayAtt:att.length,
        onTime:att.filter(function(a){return a.status==="on_time"}).length,
        late:att.filter(function(a){return a.status==="late"}).length,
        activeBreaks:brks.filter(function(b){return !b.end_time}).length,
        totalCalls:kpis.reduce(function(s,k){return s+(k.calls_handled||0)},0),
        avgCsat:kpis.length>0?(kpis.reduce(function(s,k){return s+(k.csat_score||0)},0)/kpis.length).toFixed(1):"--"
      });
    }).catch(function(){
      showToast("Failed to load analytics","error");
    }).finally(function(){setLoading(false)});
  }
  if(loading)return React.createElement(LoadingPage,{message:"Loading Analytics..."});
  if(!stats)return React.createElement(EmptyState,{icon:"?",title:"No data"});
  var cards=[
    {label:"Total Staff",value:stats.totalEmps,color:"var(--primary)"},
    {label:"Online Now",value:stats.online,color:"#22C55E"},
    {label:"Today Present",value:stats.todayAtt,color:"#3B82F6"},
    {label:"On Time",value:stats.onTime,color:"#22C55E"},
    {label:"Late Today",value:stats.late,color:"#EAB308"},
    {label:"Active Breaks",value:stats.activeBreaks,color:"#F97316"},
    {label:"Calls 7d",value:stats.totalCalls,color:"#8B5CF6"},
    {label:"Avg CSAT",value:stats.avgCsat,color:"#EAB308"}
  ];
  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Owner Analytics",icon:"👑",subtitle:"Real-time overview"}),
    React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      cards.map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card nx-card-enter"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    )
  );
}

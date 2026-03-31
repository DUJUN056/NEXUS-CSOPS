var SUPABASE_URL="https://nrcnadkrnsjzbdzgrtgg.supabase.co";
var SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY25hZGtybnNqemJkemdydGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDkzMjksImV4cCI6MjA5MDEyNTMyOX0.SLYEKj01VAbwnyEUNq6l2VUnfvoRs-zivplF01-oDLQ";
var sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false},realtime:{params:{eventsPerSecond:10}}});
var RC={
  icon:{"Owner":"👑","Shift Leader":"🛡️","Team Leader":"⭐","SME":"🎯","Agent":"👤"},
  color:{"Owner":"#FFD700","Shift Leader":"#3B82F6","Team Leader":"#22C55E","SME":"#8B5CF6","Agent":"#94A3B8"},
  rank:{"Owner":5,"Shift Leader":4,"Team Leader":3,"SME":2,"Agent":1},
  isOwner:function(u){return u&&u.role==="Owner"},
  isMgr:function(u){return u&&["Owner","Shift Leader","Team Leader"].indexOf(u.role)>-1},
  isSME:function(u){return u&&u.role==="SME"},
  canAccess:function(u,page){
    if(!u)return false;
    if(u.role==="Owner")return true;
    if(["Owner Analytics"].indexOf(page)>-1)return false;
    if(["Break Management","Audit Log","Reports & Notes"].indexOf(page)>-1){
      return["Owner","Shift Leader","Team Leader"].indexOf(u.role)>-1;
    }
    return true;
  }
};
var STATUS_MAP={
  online:{label:"Online",icon:"🟢",color:"#22C55E"},
  offline:{label:"Offline",icon:"⚫",color:"#6B7280"},
  onbreak:{label:"On Break",icon:"☕",color:"#EAB308"},
  incall:{label:"In Call",icon:"📞",color:"#3B82F6"},
  busy:{label:"Busy",icon:"🔴",color:"#EF4444"},
  away:{label:"Away",icon:"🟡",color:"#F97316"},
  training:{label:"Training",icon:"📚",color:"#8B5CF6"},
  meeting:{label:"Meeting",icon:"👥",color:"#06B6D4"},
  lunch:{label:"Lunch",icon:"🍽️",color:"#84CC16"},
  coaching:{label:"Coaching",icon:"🎯",color:"#F59E0B"},
  wfh:{label:"WFH",icon:"🏠",color:"#10B981"},
  unknown:{label:"Unknown",icon:"❓",color:"#6B7280"}
};
var ThemeMgr={
  get:function(){
    try{return localStorage.getItem("nx_theme")||"nika"}catch(e){return"nika"}
  },
  set:function(id){
    try{localStorage.setItem("nx_theme",id);document.documentElement.setAttribute("data-theme",id)}catch(e){}
  },
  getAvailable:function(){
    return[
      {id:"nika",label:"Nika",bg:"#00ff88"},
      {id:"zoro",label:"Zoro",bg:"#22c55e"},
      {id:"porsche",label:"Porsche",bg:"#f97316"},
      {id:"raptor",label:"Raptor",bg:"#3b82f6"},
      {id:"dark",label:"Dark",bg:"#1a1a1a"}
    ];
  }
};
var ChannelMgr={
  channels:{},
  sub:function(name,table,filter,cb){
    this.unsub(name);
    try{
      var ch=sb.channel("nx_"+name);
      var cfg={event:"*",schema:"public",table:table};
      if(filter)cfg.filter=filter;
      ch=ch.on("postgres_changes",cfg,function(){
        try{cb()}catch(e){}
      });
      ch.subscribe();
      this.channels[name]=ch;
    }catch(e){}
  },
  unsub:function(name){
    try{
      if(this.channels[name]){
        sb.removeChannel(this.channels[name]);
        delete this.channels[name];
      }
    }catch(e){}
  },
  unsubAll:function(){
    var self=this;
    try{Object.keys(this.channels).forEach(function(k){self.unsub(k)})}catch(e){}
  }
};
function withRetry(fn,retries,delay){
  retries=retries||3;
  delay=delay||800;
  function attempt(i){
    return fn().then(function(r){
      if(r&&r.error)throw r.error;
      return r;
    }).catch(function(e){
      if(i>=retries-1)throw e;
      return new Promise(function(resolve){
        setTimeout(resolve,delay*(i+1));
      }).then(function(){return attempt(i+1)});
    });
  }
  return attempt(0);
}
function showToast(message,type,duration){
  try{
    window.dispatchEvent(new CustomEvent("nx-toast",{
      detail:{message:message||"",type:type||"info",duration:duration||3500}
    }));
  }catch(e){console.log("[NEXUS-CSOPS]",type,message)}
}
function logAudit(action,details,actorId,targetId){
  try{
    sb.from("audit_log").insert({
      action:action,
      details:details||null,
      actor_id:actorId||null,
      target_id:targetId||null,
      created_at:new Date().toISOString()
    }).then(function(){}).catch(function(){});
  }catch(e){}
}
function fmtDate(d){
  if(!d)return"--";
  try{return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}catch(e){return"--"}
}
function fmtTime(d){
  if(!d)return"--";
  try{return new Date(d).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}catch(e){return"--"}
}
function fmtRelative(d){
  if(!d)return"--";
  try{
    var diff=Date.now()-new Date(d).getTime();
    if(isNaN(diff))return"--";
    var mins=Math.floor(diff/60000);
    var hours=Math.floor(diff/3600000);
    var days=Math.floor(diff/86400000);
    if(mins<1)return"Just now";
    if(mins<60)return mins+"m ago";
    if(hours<24)return hours+"h ago";
    if(days<7)return days+"d ago";
    return fmtDate(d);
  }catch(e){return"--"}
}
function fmtDuration(s){
  if(s===null||s===undefined)return"--";
  try{
    var x=Math.abs(Math.floor(s));
    var h=Math.floor(x/3600);
    var m=Math.floor((x%3600)/60);
    var sec=x%60;
    if(h>0)return h+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
    return m+":"+String(sec).padStart(2,"0");
  }catch(e){return"--"}
}
function fmtNumber(n){
  if(n===null||n===undefined)return"0";
  try{return Number(n).toLocaleString("en-US")}catch(e){return String(n)}
}

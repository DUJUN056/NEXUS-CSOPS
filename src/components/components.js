/* NEXUS-CSOPS v4.2.0 — components.js */
function ToastContainer(){
  var st=React.useState([]),t=st[0],s=st[1];
  React.useEffect(function(){
    function h(e){
      var id=Date.now()+Math.random(),d=e.detail;
      s(function(p){return p.concat([{id:id,message:d.message,type:d.type}])});
      setTimeout(function(){s(function(p){return p.filter(function(x){return x.id!==id})})},d.duration||3500);
    }
    window.addEventListener("nx-toast",h);
    return function(){window.removeEventListener("nx-toast",h)};
  },[]);
  if(!t.length)return null;
  return React.createElement("div",{style:{position:"fixed",bottom:24,right:24,zIndex:99999,display:"flex",flexDirection:"column",gap:8,maxWidth:340,pointerEvents:"none"}},
    t.map(function(x){
      return React.createElement("div",{key:x.id,style:{padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:600,color:"#fff",background:x.type==="success"?"#22C55E":x.type==="error"?"#EF4444":x.type==="warning"?"#EAB308":"#3
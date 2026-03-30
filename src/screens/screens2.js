/* ============================================================
   S13: PERFORMANCE
   ============================================================ */
function Performance({emp}){
  const [tab,    setTab]    =useState("my");
  const [data,   setData]   =useState([]);
  const [loading,setLoading]=useState(true);
  const [period, setPeriod] =useState("week");
  const canViewAll=isMgr(emp?.role);

  useEffect(()=>{load();},[tab,period]);

  async function load(){
    setLoading(true);
    try{
      const days=period==="week"?7
        :period==="month"?30:90;
      const from=new Date(
        Date.now()-days*24*3600*1000
      ).toISOString();
      let q=sb.from("performance_records")
        .select(
          "*,employee:employees("+
          "full_name,role,department)"
        )
        .gte("created_at",from)
        .order("created_at",{ascending:false});
      if(tab==="my")
        q=q.eq("employee_id",emp.id);
      const {data:d}=await withRetry(()=>q);
      setData(d||[]);
    }finally{setLoading(false);}
  }

  const stats=useMemo(()=>{
    if(!data.length) return null;
    const myData=data.filter(
      d=>d.employee_id===emp.id
    );
    const src=tab==="my"?data:myData;
    return{
      total:src.length,
      avg:src.length
        ?Math.round(
          src.reduce(
            (a,b)=>a+(b.score||0),0
          )/src.length
        ):0,
      trend:src.length>=2
        ?(src[0].score||0)-
          (src[src.length-1].score||0)
        :0
    };
  },[data,tab,emp.id]);

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            📊 Performance
          </h1>
          <p className="page-subtitle">
            Track scores and metrics
          </p>
        </div>
        <select className="input"
          style={{width:"auto",minWidth:130}}
          value={period}
          onChange={e=>setPeriod(e.target.value)}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">Quarter</option>
        </select>
      </div>

      {canViewAll&&(
        <div className="tabs"
          style={{marginBottom:20}}>
          <button
            className={
              "tab"+(tab==="my"?" active":"")
            }
            onClick={()=>setTab("my")}>
            👤 My Performance
          </button>
          <button
            className={
              "tab"+(tab==="team"?" active":"")
            }
            onClick={()=>setTab("team")}>
            👥 Team Performance
          </button>
        </div>
      )}

      {/* Stats */}
      {stats&&(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(150px,1fr))",
          gap:12,marginBottom:20
        }}>
          {[
            {
              l:"Total Records",
              v:stats.total,
              i:"📋",c:"var(--primary)"
            },
            {
              l:"Average Score",
              v:stats.avg+"%",
              i:"📊",
              c:stats.avg>=80
                ?"var(--success)"
                :stats.avg>=60
                  ?"var(--warning)"
                  :"var(--danger)"
            },
            {
              l:"Trend",
              v:(stats.trend>=0?"+":"")+
                stats.trend+"%",
              i:stats.trend>=0?"📈":"📉",
              c:stats.trend>=0
                ?"var(--success)"
                :"var(--danger)"
            }
          ].map(s=>(
            <div key={s.l}
              className="stat-card"
              style={{padding:"18px 12px"}}>
              <span className="stat-icon">
                {s.i}
              </span>
              <div className="stat-value"
                style={{
                  color:s.c,fontSize:22
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

      {/* Records */}
      {loading?(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {[1,2,3].map(i=>(
            <div key={i} className="skeleton"
              style={{height:80}}/>
          ))}
        </div>
      ):data.length===0?(
        <EmptyState icon="📊"
          title="No performance records"
          desc="Records will appear here"/>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {data.map(r=>(
            <PerformanceCard key={r.id}
              record={r} emp={emp}
              showName={tab==="team"}/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── PerformanceCard ── */
function PerformanceCard({
  record:r,emp,showName
}){
  const score=r.score||0;
  const color=score>=80
    ?"var(--success)"
    :score>=60
      ?"var(--warning)"
      :"var(--danger)";

  return(
    <div className="card fade-in">
      <div style={{
        display:"flex",
        alignItems:"center",gap:12
      }}>
        {showName&&r.employee&&(
          <div style={{
            width:40,height:40,borderRadius:10,
            background:`linear-gradient(135deg,
              ${RC[r.employee.role]?.c||"#64748B"},
              ${RC[r.employee.role]?.c||"#64748B"}88)`,
            display:"flex",alignItems:"center",
            justifyContent:"center",
            fontSize:18,flexShrink:0
          }}>
            {RC[r.employee.role]?.i||"👤"}
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          {showName&&(
            <div style={{
              fontSize:13,fontWeight:700,
              color:"var(--text)",marginBottom:4
            }} dir="auto">
              {r.employee?.full_name}
            </div>
          )}
          <div style={{
            display:"flex",
            alignItems:"center",
            gap:8,marginBottom:6,flexWrap:"wrap"
          }}>
            {r.metric_name&&(
              <span style={{
                fontSize:11,fontWeight:700,
                color:"var(--text-sub)"
              }}>
                {r.metric_name}
              </span>
            )}
            <span style={{
              fontSize:10,
              color:"var(--text-muted)"
            }}>
              {fmt.ago(r.created_at)}
            </span>
          </div>
          <div className="score-bar-wrap">
            <div className="score-bar" style={{
              width:score+"%",background:color
            }}/>
          </div>
        </div>
        <div style={{
          fontSize:20,fontWeight:800,
          color,flexShrink:0,
          minWidth:52,textAlign:"right"
        }}>
          {score}%
        </div>
      </div>
      {r.notes&&(
        <div style={{
          marginTop:10,fontSize:12,
          color:"var(--text-muted)",
          lineHeight:1.5,
          padding:"8px 12px",
          background:"var(--glass2)",
          borderRadius:8
        }} dir="auto">
          {r.notes}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   S14: QUEUE MONITOR
   ============================================================ */
function QueueMonitor({emp}){
  const [queues, setQueues] =useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const canEdit=isMgr(emp?.role);

  useEffect(()=>{
    load();
    ChannelMgr.sub(
      "queue-rt","queue_stats",()=>load()
    );
    return()=>ChannelMgr.unsub("queue-rt");
  },[]);

  async function load(){
    const {data}=await withRetry(()=>
      sb.from("queue_stats")
        .select("*")
        .order("updated_at",{ascending:false})
    );
    setQueues(data||[]);
    setLoading(false);
  }

  const totals=useMemo(()=>({
    waiting:queues.reduce(
      (a,q)=>a+(q.waiting||0),0
    ),
    handling:queues.reduce(
      (a,q)=>a+(q.handling||0),0
    ),
    avgWait:queues.length
      ?Math.round(
        queues.reduce(
          (a,q)=>a+(q.avg_wait_sec||0),0
        )/queues.length
      ):0
  }),[queues]);

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            🎧 Queue Monitor
          </h1>
          <p className="page-subtitle">
            Real-time queue overview
          </p>
        </div>
        {canEdit&&(
          <button
            className="btn btn-primary btn-sm"
            onClick={()=>setShowAdd(true)}>
            + Update Queue
          </button>
        )}
      </div>

      {/* Totals */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr 1fr",
        gap:12,marginBottom:20
      }}>
        {[
          {
            l:"Waiting",v:totals.waiting,
            i:"⏳",
            c:totals.waiting>20
              ?"var(--danger)"
              :totals.waiting>10
                ?"var(--warning)"
                :"var(--success)"
          },
          {
            l:"Handling",v:totals.handling,
            i:"🎧",c:"var(--primary)"
          },
          {
            l:"Avg Wait",
            v:totals.avgWait>60
              ?Math.floor(totals.avgWait/60)+"m"
              :totals.avgWait+"s",
            i:"⏱️",
            c:totals.avgWait>300
              ?"var(--danger)"
              :totals.avgWait>120
                ?"var(--warning)"
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

      {/* Queue Cards */}
      {loading?(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:8
        }}>
          {[1,2,3].map(i=>(
            <div key={i} className="skeleton"
              style={{height:100}}/>
          ))}
        </div>
      ):queues.length===0?(
        <EmptyState icon="🎧"
          title="No queue data"
          desc="Queue stats will appear here"/>
      ):(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(280px,1fr))",
          gap:12
        }}>
          {queues.map(q=>(
            <QueueCard key={q.id}
              queue={q} canEdit={canEdit}
              onUpdate={load}/>
          ))}
        </div>
      )}

      {showAdd&&(
        <QueueUpdateModal emp={emp}
          onClose={()=>setShowAdd(false)}
          onDone={()=>{
            setShowAdd(false);load();
          }}/>
      )}
    </div>
  );
}

/* ── QueueCard ── */
function QueueCard({queue:q,canEdit,onUpdate}){
  const waitColor=
    (q.waiting||0)>20?"var(--danger)"
    :(q.waiting||0)>10?"var(--warning)"
    :"var(--success)";
  const slaColor=
    (q.sla_pct||100)>=90?"var(--success)"
    :(q.sla_pct||100)>=75?"var(--warning)"
    :"var(--danger)";

  return(
    <div className="card" style={{
      borderTop:"3px solid "+waitColor
    }}>
      <div style={{
        display:"flex",
        alignItems:"flex-start",
        justifyContent:"space-between",
        marginBottom:14
      }}>
        <div>
          <div style={{
            fontSize:14,fontWeight:800,
            color:"var(--text)",marginBottom:4
          }}>
            {q.queue_name||"Queue"}
          </div>
          <div style={{
            fontSize:11,color:"var(--text-muted)"
          }}>
            Updated {fmt.ago(q.updated_at)}
          </div>
        </div>
        <div style={{
          width:10,height:10,
          borderRadius:"50%",
          background:waitColor,marginTop:4,
          animation:(q.waiting||0)>0
            ?"pulse 2s infinite":"none"
        }}/>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:10,marginBottom:12
      }}>
        {[
          {
            l:"Waiting",
            v:q.waiting||0,c:waitColor
          },
          {
            l:"Handling",
            v:q.handling||0,
            c:"var(--primary)"
          },
          {
            l:"Avg Wait",
            v:(q.avg_wait_sec||0)>60
              ?Math.floor(
                (q.avg_wait_sec||0)/60
              )+"m"
              :(q.avg_wait_sec||0)+"s",
            c:"var(--text-sub)"
          },
          {
            l:"SLA",
            v:(q.sla_pct||100)+"%",
            c:slaColor
          }
        ].map(item=>(
          <div key={item.l} style={{
            background:"var(--glass2)",
            border:"1px solid var(--border)",
            borderRadius:10,
            padding:"10px 12px",
            textAlign:"center"
          }}>
            <div style={{
              fontSize:10,fontWeight:700,
              color:"var(--text-muted)",
              marginBottom:4,
              textTransform:"uppercase",
              letterSpacing:0.5
            }}>{item.l}</div>
            <div style={{
              fontSize:18,fontWeight:800,
              color:item.c,
              fontVariantNumeric:"tabular-nums"
            }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* SLA Bar */}
      <div>
        <div style={{
          display:"flex",
          justifyContent:"space-between",
          fontSize:10,fontWeight:700,
          color:"var(--text-muted)",
          marginBottom:4
        }}>
          <span>SLA</span>
          <span style={{color:slaColor}}>
            {q.sla_pct||100}%
          </span>
        </div>
        <div className="score-bar-wrap">
          <div className="score-bar" style={{
            width:(q.sla_pct||100)+"%",
            background:slaColor
          }}/>
        </div>
      </div>
    </div>
  );
}

/* ── QueueUpdateModal ── */
function QueueUpdateModal({emp,onClose,onDone}){
  const {showToast}=useApp();
  const [form,setForm]=useState({
    queue_name:"",waiting:0,
    handling:0,avg_wait_sec:0,sla_pct:100
  });
  const [loading,setLoading]=useState(false);
  function upd(k,v){setForm(f=>({...f,[k]:v}));}

  async function submit(e){
    e.preventDefault();
    if(!form.queue_name.trim()){
      showToast("Queue name required","warning");
      return;
    }
    setLoading(true);
    try{
      await withRetry(()=>
        sb.from("queue_stats").upsert(
          {
            queue_name:form.queue_name.trim(),
            waiting:parseInt(form.waiting)||0,
            handling:parseInt(form.handling)||0,
            avg_wait_sec:
              parseInt(form.avg_wait_sec)||0,
            sla_pct:
              parseInt(form.sla_pct)||100,
            updated_by:emp.id,
            updated_at:new Date().toISOString()
          },
          {onConflict:"queue_name"}
        )
      );
      showToast("Queue updated ✅","success");
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
              🎧 Update Queue
            </h3>
            <button
              className="btn-icon btn-icon-sm"
              onClick={onClose}>×</button>
          </div>
          <form onSubmit={submit}>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Queue Name *
              </label>
              <input type="text"
                className="input"
                value={form.queue_name}
                onChange={e=>
                  upd("queue_name",
                    e.target.value)}
                placeholder="e.g. KFOOD Inbound"
                required/>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:14
            }}>
              <div className="input-group">
                <label className="input-label">
                  Waiting
                </label>
                <input type="number"
                  className="input" min="0"
                  value={form.waiting}
                  onChange={e=>
                    upd("waiting",
                      e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">
                  Handling
                </label>
                <input type="number"
                  className="input" min="0"
                  value={form.handling}
                  onChange={e=>
                    upd("handling",
                      e.target.value)}/>
              </div>
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gap:12,marginBottom:20
            }}>
              <div className="input-group">
                <label className="input-label">
                  Avg Wait (sec)
                </label>
                <input type="number"
                  className="input" min="0"
                  value={form.avg_wait_sec}
                  onChange={e=>
                    upd("avg_wait_sec",
                      e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">
                  SLA %
                </label>
                <input type="number"
                  className="input"
                  min="0" max="100"
                  value={form.sla_pct}
                  onChange={e=>
                    upd("sla_pct",
                      e.target.value)}/>
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
                className="btn btn-primary"
                style={{flex:1}}
                disabled={loading}>
                {loading
                  ?<><Spinner size="sm" white/>
                     {" "}Saving...</>
                  :"✅ Update"
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
   S15: LIVE FLOOR
   ============================================================ */
function LiveFloor({emp}){
  const [agents,  setAgents]  =useState([]);
  const [loading, setLoading] =useState(true);
  const [search,  setSearch]  =useState("");
  const [filter,  setFilter]  =useState("all");
  const [view,    setView]    =useState("grid");

  useEffect(()=>{
    load();
    ChannelMgr.sub(
      "floor-rt","employees",()=>load()
    );
    return()=>ChannelMgr.unsub("floor-rt");
  },[]);

  async function load(){
    const {data}=await withRetry(()=>
      sb.from("employees")
        .select(
          "id,full_name,role,department,"+
          "status,status_since,"+
          "last_heartbeat,is_suspended"
        )
        .eq("is_suspended",false)
        .order("full_name")
    );
    setAgents(data||[]);
    setLoading(false);
  }

  const filtered=useMemo(()=>{
    let list=agents;
    if(search){
      const s=search.toLowerCase();
      list=list.filter(a=>
        a.full_name?.toLowerCase().includes(s)||
        a.role?.toLowerCase().includes(s)||
        a.department?.toLowerCase().includes(s)
      );
    }
    if(filter!=="all"){
      list=list.filter(a=>
        filter==="online"
          ?["Online","On Call"]
             .includes(a.status)
          :filter==="break"
            ?["Break","Short Break",
               "Lunch","Prayer"]
               .includes(a.status)
            :filter==="busy"
              ?["Busy","Meeting","Training"]
                 .includes(a.status)
              :a.status===filter
      );
    }
    return list;
  },[agents,search,filter]);

  const onlineCount=agents.filter(a=>
    ["Online","On Call"].includes(a.status)
  ).length;

  const breakCount=agents.filter(a=>
    ["Break","Short Break","Lunch","Prayer"]
      .includes(a.status)
  ).length;

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            🖥️ Live Floor
          </h1>
          <p className="page-subtitle">
            Real-time team status
          </p>
        </div>
        <div style={{
          display:"flex",alignItems:"center",
          gap:8
        }}>
          <button
            className={
              "btn btn-ghost btn-sm"+
              (view==="grid"?" btn-active":"")
            }
            onClick={()=>setView("grid")}>
            ⊞
          </button>
          <button
            className={
              "btn btn-ghost btn-sm"+
              (view==="list"?" btn-active":"")
            }
            onClick={()=>setView("list")}>
            ☰
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        display:"grid",
        gridTemplateColumns:
          "repeat(auto-fill,minmax(110px,1fr))",
        gap:10,marginBottom:20
      }}>
        {[
          {
            l:"Total",v:agents.length,
            c:"var(--text)",i:"👥",
            f:"all"
          },
          {
            l:"Online",v:onlineCount,
            c:"var(--success)",i:"🟢",
            f:"online"
          },
          {
            l:"On Break",v:breakCount,
            c:"var(--warning)",i:"☕",
            f:"break"
          },
          {
            l:"Offline",
            v:agents.filter(
              a=>a.status==="Offline"
            ).length,
            c:"var(--text-muted)",i:"⚫",
            f:"offline"
          }
        ].map(s=>(
          <div key={s.l}
            className="stat-card"
            style={{cursor:"pointer"}}
            onClick={()=>setFilter(s.f)}>
            <span className="stat-icon"
              style={{fontSize:20}}>
              {s.i}
            </span>
            <div className="stat-value"
              style={{
                color:s.c,fontSize:20
              }}>
              {s.v}
            </div>
            <div className="stat-label">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{
        display:"flex",gap:10,
        marginBottom:16,flexWrap:"wrap"
      }}>
        <input type="search" className="input"
          style={{flex:1,minWidth:180}}
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search agents..."/>
        <select className="input"
          style={{width:"auto",minWidth:130}}
          value={filter}
          onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="online">
            🟢 Online
          </option>
          <option value="break">
            ☕ On Break
          </option>
          <option value="busy">
            🔴 Busy
          </option>
          <option value="offline">
            ⚫ Offline
          </option>
        </select>
      </div>

      {loading?(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            view==="grid"
              ?"repeat(auto-fill,"+
                "minmax(200px,1fr))"
              :"1fr",
          gap:10
        }}>
          {[1,2,3,4,5,6].map(i=>(
            <div key={i} className="skeleton"
              style={{
                height:view==="grid"?120:64
              }}/>
          ))}
        </div>
      ):filtered.length===0?(
        <EmptyState icon="🖥️"
          title="No agents found"
          desc="Try adjusting your filters"/>
      ):view==="grid"?(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(200px,1fr))",
          gap:10
        }}>
          {filtered.map(a=>(
            <AgentCard key={a.id}
              agent={a} view="grid"/>
          ))}
        </div>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:6
        }}>
          {filtered.map(a=>(
            <AgentCard key={a.id}
              agent={a} view="list"/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── AgentCard ── */
function AgentCard({agent:a,view}){
  const sc2=SC[a.status]||SC["Offline"];
  const rc2=RC[a.role]||RC.Agent;
  const timer=useTimer(
    ["Online","On Call","Busy",
     "Meeting","Training"]
      .includes(a.status)
      ?a.status_since:null
  );
  const isOnline=
    a.last_heartbeat&&
    Date.now()-
    new Date(a.last_heartbeat)<120000;

  if(view==="list") return(
    <div className="card fade-in"
      style={{padding:"10px 14px"}}>
      <div style={{
        display:"flex",
        alignItems:"center",gap:12
      }}>
        <div style={{
          width:38,height:38,borderRadius:10,
          background:`linear-gradient(135deg,
            ${rc2.c},${rc2.c}88)`,
          display:"flex",alignItems:"center",
          justifyContent:"center",
          fontSize:18,flexShrink:0,
          position:"relative"
        }}>
          {rc2.i}
          <div style={{
            position:"absolute",
            bottom:-2,right:-2,
            width:10,height:10,
            borderRadius:"50%",
            background:isOnline
              ?"var(--success)"
              :"var(--text-muted)",
            border:"2px solid var(--card)"
          }}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontSize:13,fontWeight:700,
            color:"var(--text)",
            overflow:"hidden",
            textOverflow:"ellipsis",
            whiteSpace:"nowrap"
          }} dir="auto">
            {a.full_name}
          </div>
          <div style={{
            fontSize:11,
            color:"var(--text-muted)",marginTop:1
          }}>
            {a.role} · {a.department}
          </div>
        </div>
        <div style={{
          display:"flex",flexDirection:"column",
          alignItems:"flex-end",
          gap:4,flexShrink:0
        }}>
          <StatusBadge
            status={a.status||"Offline"}
            size="sm"/>
          {timer!=="--"&&(
            <span style={{
              fontSize:10,
              color:"var(--text-muted)",
              fontVariantNumeric:"tabular-nums"
            }}>{timer}</span>
          )}
        </div>
      </div>
    </div>
  );

  return(
    <div className="card fade-in" style={{
      padding:"16px 14px",textAlign:"center"
    }}>
      <div style={{
        position:"relative",
        display:"inline-block",marginBottom:10
      }}>
        <div style={{
          width:52,height:52,borderRadius:14,
          background:`linear-gradient(135deg,
            ${rc2.c},${rc2.c}88)`,
          display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:24
        }}>{rc2.i}</div>
        <div style={{
          position:"absolute",
          bottom:-2,right:-2,
          width:14,height:14,
          borderRadius:"50%",
          background:sc2.c,
          border:"2px solid var(--card)",
          animation:sc2.pulse
            ?"pulse 2s infinite":"none",
          ...(a.status==="Prayer"?{
            animation:
              "prayerPulse 2.5s ease-in-out "+
              "infinite"
          }:{})
        }}/>
      </div>
      <div style={{
        fontSize:12,fontWeight:800,
        color:"var(--text)",marginBottom:3,
        overflow:"hidden",
        textOverflow:"ellipsis",
        whiteSpace:"nowrap"
      }} dir="auto">{a.full_name}</div>
      <div style={{
        fontSize:10,color:"var(--text-muted)",
        marginBottom:8
      }}>{a.role}</div>
      <StatusBadge
        status={a.status||"Offline"} size="sm"/>
      {timer!=="--"&&(
        <div style={{
          fontSize:10,color:"var(--text-muted)",
          marginTop:6,
          fontVariantNumeric:"tabular-nums"
        }}>{timer}</div>
      )}
      {a.last_heartbeat&&(
        <div style={{
          fontSize:9,color:"var(--text-muted)",
          marginTop:4,opacity:0.7
        }}>
          {fmt.ago(a.last_heartbeat)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   S16: NOTIFICATIONS
   ============================================================ */
function Notifications({emp}){
  const {showToast}=useApp();
  const [notifs, setNotifs] =useState([]);
  const [loading,setLoading]=useState(true);
  const [filter, setFilter] =useState("all");

  useEffect(()=>{
    load();
    ChannelMgr.sub(
      "notif-page-rt","notifications",
      ()=>load(),
      {filter:"employee_id=eq."+emp.id}
    );
    return()=>
      ChannelMgr.unsub("notif-page-rt");
  },[]);

  async function load(){
    const {data}=await withRetry(()=>
      sb.from("notifications")
        .select("*")
        .eq("employee_id",emp.id)
        .order("created_at",{ascending:false})
        .limit(50)
    );
    setNotifs(data||[]);
    setLoading(false);
  }

  async function markRead(id){
    await withRetry(()=>
      sb.from("notifications")
        .update({is_read:true})
        .eq("id",id)
    );
    setNotifs(n=>n.map(x=>
      x.id===id?{...x,is_read:true}:x
    ));
  }

  async function markAllRead(){
    const unread=notifs
      .filter(n=>!n.is_read)
      .map(n=>n.id);
    if(!unread.length) return;
    await withRetry(()=>
      sb.from("notifications")
        .update({is_read:true})
        .in("id",unread)
    );
    setNotifs(n=>
      n.map(x=>({...x,is_read:true}))
    );
    showToast(
      "All marked as read ✅","success"
    );
  }

  async function deleteNotif(id){
    await withRetry(()=>
      sb.from("notifications")
        .delete().eq("id",id)
    );
    setNotifs(n=>n.filter(x=>x.id!==id));
  }

  const filtered=useMemo(()=>
    filter==="unread"
      ?notifs.filter(n=>!n.is_read)
      :notifs
  ,[notifs,filter]);

  const unreadCount=notifs.filter(
    n=>!n.is_read
  ).length;

  const typeIcon={
    info:"ℹ️",success:"✅",
    warning:"⚠️",error:"❌",
    mention:"💬",system:"🔔"
  };
  const typeColor={
    info:"var(--primary)",
    success:"var(--success)",
    warning:"var(--warning)",
    error:"var(--danger)",
    mention:"#8B5CF6",
    system:"var(--text-muted)"
  };

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            🔔 Notifications
          </h1>
          <p className="page-subtitle">
            {unreadCount>0
              ?unreadCount+" unread"
              :"All caught up"
            }
          </p>
        </div>
        {unreadCount>0&&(
          <button
            className="btn btn-ghost btn-sm"
            onClick={markAllRead}>
            ✅ Mark all read
          </button>
        )}
      </div>

      <div className="tabs"
        style={{marginBottom:20}}>
        <button
          className={
            "tab"+(filter==="all"?" active":"")
          }
          onClick={()=>setFilter("all")}>
          All ({notifs.length})
        </button>
        <button
          className={
            "tab"+
            (filter==="unread"?" active":"")
          }
          onClick={()=>setFilter("unread")}>
          Unread ({unreadCount})
        </button>
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
        <EmptyState icon="🔔"
          title="No notifications"
          desc={filter==="unread"
            ?"You're all caught up!"
            :"Nothing here yet"
          }/>
      ):(
        <div style={{
          display:"flex",flexDirection:"column",
          gap:6
        }}>
          {filtered.map(n=>{
            const ic=typeIcon[n.type]||"🔔";
            const tc=typeColor[n.type]
              ||"var(--text-muted)";
            return(
              <div key={n.id}
                className="card fade-in"
                style={{
                  padding:"12px 14px",
                  borderLeft:"3px solid "+(
                    n.is_read
                      ?"var(--border)":tc
                  ),
                  opacity:n.is_read?0.75:1,
                  cursor:"pointer"
                }}
                onClick={()=>
                  !n.is_read&&markRead(n.id)
                }>
                <div style={{
                  display:"flex",
                  alignItems:"flex-start",
                  gap:12
                }}>
                  <div style={{
                    width:36,height:36,
                    borderRadius:10,
                    background:tc+"15",
                    border:"1px solid "+tc+"25",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    fontSize:18,flexShrink:0
                  }}>{ic}</div>
                  <div style={{
                    flex:1,minWidth:0
                  }}>
                    <div style={{
                      fontSize:13,fontWeight:700,
                      color:"var(--text)",
                      marginBottom:3
                    }} dir="auto">
                      {n.title}
                    </div>
                    {n.body&&(
                      <div style={{
                        fontSize:12,
                        color:"var(--text-sub)",
                        lineHeight:1.5,
                        marginBottom:4
                      }} dir="auto">
                        {n.body}
                      </div>
                    )}
                    <div style={{
                      fontSize:10,
                      color:"var(--text-muted)"
                    }}>
                      {fmt.ago(n.created_at)}
                    </div>
                  </div>
                  <div style={{
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"flex-end",
                    gap:6,flexShrink:0
                  }}>
                    {!n.is_read&&(
                      <div style={{
                        width:8,height:8,
                        borderRadius:"50%",
                        background:tc,
                        animation:
                          "pulse 2s infinite"
                      }}/>
                    )}
                    <button
                      className="btn-icon btn-icon-sm"
                      style={{
                        width:24,height:24,
                        fontSize:12
                      }}
                      onClick={e=>{
                        e.stopPropagation();
                        deleteNotif(n.id);
                      }}>×</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   S17: MY PROFILE
   ============================================================ */
function MyProfile({emp,onUpdate}){
  const {showToast}=useApp();
  const [editing, setEditing] =useState(false);
  const [form,    setForm]    =useState({
    full_name:emp.full_name||"",
    phone:emp.phone||"",
    bio:emp.bio||""
  });
  const [loading, setLoading] =useState(false);
  const [showPw,  setShowPw]  =useState(false);
  const [pwForm,  setPwForm]  =useState({
    next:"",confirm:""
  });
  const [pwLoad,  setPwLoad]  =useState(false);
  const [stats,   setStats]   =useState(null);

  useEffect(()=>{loadStats();},[]);

  async function loadStats(){
    const [att,perf]=await Promise.all([
      sb.from("attendance")
        .select("id,clock_in,clock_out")
        .eq("employee_id",emp.id)
        .order("clock_in",{ascending:false})
        .limit(30),
      sb.from("performance_records")
        .select("score")
        .eq("employee_id",emp.id)
        .order("created_at",{ascending:false})
        .limit(20)
    ]);
    const attData=att.data||[];
    const perfData=perf.data||[];
    const totalMs=attData.reduce((a,r)=>{
      if(!r.clock_out) return a;
      return a+
        new Date(r.clock_out)-
        new Date(r.clock_in);
    },0);
    setStats({
      days:attData.length,
      totalHours:Math.round(totalMs/3600000),
      avgScore:perfData.length
        ?Math.round(
          perfData.reduce(
            (a,b)=>a+(b.score||0),0
          )/perfData.length
        ):null
    });
  }

  async function saveProfile(e){
    e.preventDefault();
    if(!form.full_name.trim()){
      showToast("Name required","warning");
      return;
    }
    setLoading(true);
    try{
      await withRetry(()=>
        sb.from("employees").update({
          full_name:form.full_name.trim(),
          phone:form.phone.trim()||null,
          bio:form.bio.trim()||null
        }).eq("id",emp.id)
      );
      showToast("Profile updated ✅","success");
      setEditing(false);
      if(onUpdate) onUpdate({
        ...emp,
        full_name:form.full_name.trim(),
        phone:form.phone.trim()||null,
        bio:form.bio.trim()||null
      });
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setLoading(false);}
  }

  async function changePw(e){
    e.preventDefault();
    if(pwForm.next.length<6){
      showToast("Min 6 characters","warning");
      return;
    }
    if(pwForm.next!==pwForm.confirm){
      showToast(
        "Passwords don't match","warning"
      );
      return;
    }
    setPwLoad(true);
    try{
      const {error}=
        await sb.auth.updateUser({
          password:pwForm.next
        });
      if(error) throw error;
      showToast("Password changed ✅","success");
      setShowPw(false);
      setPwForm({next:"",confirm:""});
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }finally{setPwLoad(false);}
  }

  const rc2=RC[emp.role]||RC.Agent;

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            👤 My Profile
          </h1>
          <p className="page-subtitle">
            Manage your account
          </p>
        </div>
        <button
          className={
            "btn btn-sm "+
            (editing?"btn-ghost":"btn-primary")
          }
          onClick={()=>setEditing(s=>!s)}>
          {editing?"✕ Cancel":"✏️ Edit"}
        </button>
      </div>

      {/* Profile Card */}
      <div className="card"
        style={{marginBottom:16}}>
        <div style={{
          display:"flex",alignItems:"center",
          gap:16,marginBottom:20
        }}>
          <div style={{
            width:72,height:72,borderRadius:20,
            background:`linear-gradient(135deg,
              ${rc2.c},${rc2.c}88)`,
            display:"flex",alignItems:"center",
            justifyContent:"center",
            fontSize:36,flexShrink:0
          }}>{rc2.i}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{
              fontSize:20,fontWeight:800,
              color:"var(--text)",marginBottom:6
            }} dir="auto">
              {emp.full_name}
            </div>
            <div style={{
              display:"flex",
              alignItems:"center",
              gap:8,flexWrap:"wrap"
            }}>
              <RoleBadge role={emp.role}/>
              <DeptBadge dept={emp.department}/>
            </div>
            {emp.is_owner&&(
              <div style={{
                marginTop:6,fontSize:12,
                fontWeight:700,color:"#EAB308"
              }}>
                👑 System Owner
              </div>
            )}
          </div>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gap:10,marginBottom:16
        }}>
          {[
            {l:"Email",v:emp.email,i:"📧"},
            {
              l:"Phone",
              v:emp.phone||"Not set",i:"📱"
            },
            {
              l:"Status",
              v:emp.status||"Offline",i:"🟢"
            },
            {
              l:"Member since",
              v:fmt.date(emp.created_at),
              i:"📅"
            }
          ].map(item=>(
            <div key={item.l} style={{
              background:"var(--glass2)",
              border:"1px solid var(--border)",
              borderRadius:10,
              padding:"10px 12px"
            }}>
              <div style={{
                fontSize:10,fontWeight:700,
                color:"var(--text-muted)",
                marginBottom:4,
                textTransform:"uppercase",
                letterSpacing:0.5
              }}>
                {item.i} {item.l}
              </div>
              <div style={{
                fontSize:12,fontWeight:600,
                color:"var(--text)",
                overflow:"hidden",
                textOverflow:"ellipsis",
                whiteSpace:"nowrap"
              }}>
                {item.v}
              </div>
            </div>
          ))}
        </div>

        {emp.bio&&!editing&&(
          <div style={{
            background:"var(--glass2)",
            border:"1px solid var(--border)",
            borderRadius:10,
            padding:"12px 14px",
            fontSize:13,
            color:"var(--text-sub)",
            lineHeight:1.6
          }} dir="auto">
            {emp.bio}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats&&(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(130px,1fr))",
          gap:10,marginBottom:16
        }}>
          {[
            {
              l:"Days Worked",
              v:stats.days,
              i:"📅",c:"var(--primary)"
            },
            {
              l:"Total Hours",
              v:stats.totalHours+"h",
              i:"⏱️",c:"var(--success)"
            },
            ...(stats.avgScore!==null?[{
              l:"Avg Score",
              v:stats.avgScore+"%",
              i:"📊",
              c:stats.avgScore>=80
                ?"var(--success)"
                :stats.avgScore>=60
                  ?"var(--warning)"
                  :"var(--danger)"
            }]:[])
          ].map(s=>(
            <div key={s.l} className="stat-card">
              <span className="stat-icon">
                {s.i}
              </span>
              <div className="stat-value"
                style={{color:s.c,fontSize:20}}>
                {s.v}
              </div>
              <div className="stat-label">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Form */}
      {editing&&(
        <div className="card"
          style={{marginBottom:16}}>
          <div className="card-title"
            style={{marginBottom:16}}>
            ✏️ Edit Profile
          </div>
          <form onSubmit={saveProfile}>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Full Name *
              </label>
              <input type="text"
                className="input"
                value={form.full_name}
                onChange={e=>setForm(f=>({
                  ...f,
                  full_name:e.target.value
                }))}
                dir="auto" required/>
            </div>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Phone
              </label>
              <input type="tel"
                className="input"
                value={form.phone}
                onChange={e=>setForm(f=>({
                  ...f,phone:e.target.value
                }))}
                placeholder="+966 5x xxx xxxx"/>
            </div>
            <div className="input-group"
              style={{marginBottom:20}}>
              <label className="input-label">
                Bio
              </label>
              <textarea className="input"
                value={form.bio}
                onChange={e=>setForm(f=>({
                  ...f,bio:e.target.value
                }))}
                placeholder=
                  "Tell us about yourself..."
                rows={3} dir="auto"/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button type="button"
                className="btn btn-ghost"
                style={{flex:1}}
                onClick={()=>setEditing(false)}>
                Cancel
              </button>
              <button type="submit"
                className="btn btn-primary"
                style={{flex:1}}
                disabled={loading}>
                {loading
                  ?<><Spinner size="sm" white/>
                     {" "}Saving...</>
                  :"✅ Save Changes"
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password */}
      <div className="card">
        <div style={{
          display:"flex",alignItems:"center",
          justifyContent:"space-between",
          marginBottom:showPw?16:0
        }}>
          <div>
            <div className="card-title">
              🔒 Change Password
            </div>
            <div className="card-subtitle">
              Update your login password
            </div>
          </div>
          <button
            className={
              "btn btn-sm "+
              (showPw?"btn-ghost":"btn-primary")
            }
            onClick={()=>setShowPw(s=>!s)}>
            {showPw?"✕ Cancel":"Change"}
          </button>
        </div>
        {showPw&&(
          <form onSubmit={changePw}>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                New Password *
              </label>
              <input type="password"
                className="input"
                value={pwForm.next}
                onChange={e=>setPwForm(f=>({
                  ...f,next:e.target.value
                }))}
                placeholder="Min 6 characters"
                required/>
            </div>
            <div className="input-group"
              style={{marginBottom:20}}>
              <label className="input-label">
                Confirm Password *
              </label>
              <input type="password"
                className="input"
                value={pwForm.confirm}
                onChange={e=>setPwForm(f=>({
                  ...f,confirm:e.target.value
                }))}
                placeholder="Type again"
                required/>
            </div>
            <button type="submit"
              className="btn btn-primary btn-full"
              disabled={pwLoad}>
              {pwLoad
                ?<><Spinner size="sm" white/>
                   {" "}Changing...</>
                :"🔒 Change Password"
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   S18: MY WORKSPACE
   ============================================================ */
function MyWorkspace({emp}){
  const {showToast}=useApp();
  const [notes,   setNotes]   =useState([]);
  const [loading, setLoading] =useState(true);
  const [showAdd, setShowAdd] =useState(false);
  const [editNote,setEditNote]=useState(null);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    const {data}=await withRetry(()=>
      sb.from("workspace_notes")
        .select("*")
        .eq("employee_id",emp.id)
        .order("updated_at",{ascending:false})
    );
    setNotes(data||[]);
    setLoading(false);
  }

  async function deleteNote(id){
    if(!confirm("Delete this note?")) return;
    try{
      await withRetry(()=>
        sb.from("workspace_notes")
          .delete().eq("id",id)
      );
      showToast("Note deleted","success");
      setNotes(n=>n.filter(x=>x.id!==id));
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  const pinned=notes.filter(n=>n.is_pinned);
  const unpinned=notes.filter(n=>!n.is_pinned);

  const NOTE_COLORS=[
    "#3B82F6","#10B981","#F59E0B",
    "#EF4444","#8B5CF6","#EC4899",
    "#06B6D4","#84CC16"
  ];

  return(
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            📓 My Workspace
          </h1>
          <p className="page-subtitle">
            Personal notes and tasks
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={()=>setShowAdd(true)}>
          + New Note
        </button>
      </div>

      {loading?(
        <div style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(240px,1fr))",
          gap:12
        }}>
          {[1,2,3].map(i=>(
            <div key={i} className="skeleton"
              style={{height:160}}/>
          ))}
        </div>
      ):notes.length===0?(
        <EmptyState icon="📓"
          title="No notes yet"
          desc="Create your first note"
          action={
            <button
              className="btn btn-primary btn-sm"
              onClick={()=>setShowAdd(true)}>
              + New Note
            </button>
          }/>
      ):(
        <>
          {pinned.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{
                fontSize:11,fontWeight:800,
                color:"var(--text-muted)",
                marginBottom:10,
                textTransform:"uppercase",
                letterSpacing:1.5
              }}>📌 Pinned</div>
              <div style={{
                display:"grid",
                gridTemplateColumns:
                  "repeat(auto-fill,"+
                  "minmax(240px,1fr))",
                gap:12
              }}>
                {pinned.map(n=>(
                  <NoteCard key={n.id}
                    note={n}
                    onEdit={()=>setEditNote(n)}
                    onDelete={()=>
                      deleteNote(n.id)}
                    onPin={load}
                    emp={emp}/>
                ))}
              </div>
            </div>
          )}
          {unpinned.length>0&&(
            <div>
              {pinned.length>0&&(
                <div style={{
                  fontSize:11,fontWeight:800,
                  color:"var(--text-muted)",
                  marginBottom:10,
                  textTransform:"uppercase",
                  letterSpacing:1.5
                }}>📋 Notes</div>
              )}
              <div style={{
                display:"grid",
                gridTemplateColumns:
                  "repeat(auto-fill,"+
                  "minmax(240px,1fr))",
                gap:12
              }}>
                {unpinned.map(n=>(
                  <NoteCard key={n.id}
                    note={n}
                    onEdit={()=>setEditNote(n)}
                    onDelete={()=>
                      deleteNote(n.id)}
                    onPin={load}
                    emp={emp}/>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(showAdd||editNote)&&(
        <NoteModal emp={emp}
          note={editNote}
          colors={NOTE_COLORS}
          onClose={()=>{
            setShowAdd(false);
            setEditNote(null);
          }}
          onDone={()=>{
            setShowAdd(false);
            setEditNote(null);
            load();
          }}/>
      )}
    </div>
  );
}

/* ── NoteCard ── */
function NoteCard({
  note:n,onEdit,onDelete,onPin,emp
}){
  const {showToast}=useApp();
  const accent=n.color||"#3B82F6";

  async function togglePin(){
    try{
      await withRetry(()=>
        sb.from("workspace_notes")
          .update({is_pinned:!n.is_pinned})
          .eq("id",n.id)
      );
      onPin();
    }catch(err){
      showToast("Failed: "+err.message,"error");
    }
  }

  return(
    <div className="card fade-in" style={{
      borderTop:"3px solid "+accent,
      display:"flex",flexDirection:"column",
      minHeight:140
    }}>
      <div style={{
        display:"flex",
        alignItems:"flex-start",
        justifyContent:"space-between",
        marginBottom:8,gap:8
      }}>
        <div style={{
          fontSize:13,fontWeight:800,
          color:"var(--text)",
          flex:1,lineHeight:1.3
        }} dir="auto">
          {n.title||"Untitled"}
        </div>
        <div style={{
          display:"flex",gap:4,flexShrink:0
        }}>
          <button
            className="btn-icon btn-icon-sm"
            style={{
              width:26,height:26,fontSize:13,
              color:n.is_pinned
                ?"#EAB308":"var(--text-muted)"
            }}
            onClick={togglePin}>
            📌
          </button>
          <button
            className="btn-icon btn-icon-sm"
            style={{width:26,height:26,fontSize:13}}
            onClick={onEdit}>
            ✏️
          </button>
          <button
            className="btn-icon btn-icon-sm"
            style={{width:26,height:26,fontSize:13}}
            onClick={onDelete}>
            🗑️
          </button>
        </div>
      </div>
      {n.content&&(
        <div style={{
          fontSize:12,color:"var(--text-sub)",
          lineHeight:1.6,flex:1,
          overflow:"hidden",
          display:"-webkit-box",
          WebkitLineClamp:4,
          WebkitBoxOrient:"vertical"
        }} dir="auto">
          {n.content}
        </div>
      )}
      <div style={{
        fontSize:10,color:"var(--text-muted)",
        marginTop:10
      }}>
        {fmt.ago(n.updated_at)}
      </div>
    </div>
  );
}

/* ── NoteModal ── */
function NoteModal({
  emp,note,colors,onClose,onDone
}){
  const {showToast}=useApp();
  const [form,setForm]=useState({
    title:note?.title||"",
    content:note?.content||"",
    color:note?.color||colors[0]
  });
  const [loading,setLoading]=useState(false);
  function upd(k,v){setForm(f=>({...f,[k]:v}));}

  async function submit(e){
    e.preventDefault();
    setLoading(true);
    try{
      if(note){
        await withRetry(()=>
          sb.from("workspace_notes").update({
            title:form.title||null,
            content:form.content,
            color:form.color,
            updated_at:new Date().toISOString()
          }).eq("id",note.id)
        );
      }else{
        await withRetry(()=>
          sb.from("workspace_notes").insert({
            employee_id:emp.id,
            title:form.title||null,
            content:form.content,
            color:form.color,
            is_pinned:false
          })
        );
      }
      showToast(
        note
          ?"Note updated ✅"
          :"Note created ✅",
        "success"
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
        <div className="modal">
          <div className="modal-header">
            <h3 className="modal-title">
              {note?"✏️ Edit Note":"📝 New Note"}
            </h3>
            <button
              className="btn-icon btn-icon-sm"
              onClick={onClose}>×</button>
          </div>
          <form onSubmit={submit}>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Title
              </label>
              <input type="text"
                className="input"
                value={form.title}
                onChange={e=>
                  upd("title",e.target.value)}
                placeholder="Note title..."
                dir="auto"/>
            </div>
            <div className="input-group"
              style={{marginBottom:14}}>
              <label className="input-label">
                Content
              </label>
              <textarea className="input"
                value={form.content}
                onChange={e=>
                  upd("content",e.target.value)}
                placeholder="Write your note..."
                rows={6} dir="auto"/>
            </div>
            <div className="input-group"
              style={{marginBottom:20}}>
              <label className="input-label">
                Color
              </label>
              <div style={{
                display:"flex",gap:8,
                flexWrap:"wrap",marginTop:4
              }}>
                {colors.map(c=>(
                  <button key={c} type="button"
                    onClick={()=>upd("color",c)}
                    style={{
                      width:28,height:28,
                      borderRadius:8,
                      background:c,
                      border:form.color===c
                        ?"3px solid var(--text)"
                        :"2px solid transparent",
                      cursor:"pointer",
                      transition:
                        "transform 0.15s",
                      transform:form.color===c
                        ?"scale(1.2)":"scale(1)"
                    }}/>
                ))}
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
                className="btn btn-primary"
                style={{flex:1}}
                disabled={loading}>
                {loading
                  ?<><Spinner size="sm" white/>
                     {" "}Saving...</>
                  :note?"✅ Update":"📝 Create"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
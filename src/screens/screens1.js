/* ==========================================================================
   SOVEREIGN SYSTEM - CORE OPERATIONS MODULE (CONSOLIDATED)
   Contains: Updates, Announcements, Schedule, Attendance, Live Floor
   ========================================================================== */

function UpdatesFeedPage(props){
  var user = props.user;
  var _1 = React.useState([]); var feeds = _1[0]; var setFeeds = _1[1];
  var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];
  var _3 = React.useState({}); var acks = _3[0]; var setAcks = _3[1];
  var _4 = React.useState("all"); var filter = _4[0]; var setFilter = _4[1];
  var canCreate = ["Owner", "Team Leader", "Shift Leader", "SME"].indexOf(user.role) > -1;

  React.useEffect(function(){
    load();
    ChannelMgr.sub("feed", DB.UPDATES_FEED, null, load);
    return function(){ ChannelMgr.unsub("feed") };
  }, []);

  function load(){
    withRetry(function(){
      return sb.from(DB.UPDATES_FEED)
        .select("*, by:employees!updates_feed_created_by_fkey(full_name, role)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
    }).then(function(r){
      var data = r.data || [];
      var filtered = data.filter(function(item){
        if(item.expires_at && new Date(item.expires_at) < new Date()) return false;
        if(item.target_type === "all") return true;
        if(item.target_type === "role"){
          var roles = Array.isArray(item.target_roles) ? item.target_roles : [];
          return roles.indexOf(user.role) > -1;
        }
        if(item.target_type === "department"){
          return item.target_dept === user.department || user.department === "Both" || item.target_dept === "Both";
        }
        if(item.target_type === "specific"){
          var users = Array.isArray(item.target_users) ? item.target_users : [];
          return users.indexOf(user.id) > -1;
        }
        return true;
      });
      setFeeds(filtered);
    }).catch(function(){ showToast("Failed to load updates", "error") })
    .finally(function(){ setLoading(false) });

    withRetry(function(){
      return sb.from("feed_acknowledgments")
        .select("feed_id, status")
        .eq("employee_id", user.id);
    }).then(function(r){
      var map = {};
      (r.data || []).forEach(function(a){ map[a.feed_id] = a.status });
      setAcks(map);
    }).catch(function(){});
  }

  function ack(id, status){
    sb.from("feed_acknowledgments").upsert(
      { feed_id: id, employee_id: user.id, status: status || "read" },
      { onConflict: "feed_id,employee_id" }
    ).then(function(){
      setAcks(function(p){ var n = Object.assign({}, p); n[id] = status || "read"; return n; });
    }).catch(function(){});
  }

  var typesCfg = {
    urgent: { c: "#EF4444", i: "🚨", l: "Urgent" },
    task: { c: "#3B82F6", i: "📌", l: "Task" },
    announcement: { c: "#8B5CF6", i: "📢", l: "Announcement" },
    update: { c: "#10B981", i: "📊", l: "Update" },
    document: { c: "#F59E0B", i: "📎", l: "Document" },
    appreciation: { c: "#EC4899", i: "🎉", l: "Appreciation" }
  };

  var shown = filter === "all" ? feeds : feeds.filter(function(f){ return f.type === filter });

  if(loading) return React.createElement(LoadingPage, { message: "Loading Updates..." });

  return React.createElement("div", { className: "nx-page-enter" },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } },
          user.role === "Agent" ? "My Tasks" : "Updates Feed"
        ),
        React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontFamily: "'Space Grotesk',sans-serif" } },
          feeds.length + " items"
        )
      ),
      canCreate ? React.createElement("button", {
        className: "nx-btn nx-btn-primary",
        onClick: function(){ showToast("Create update — coming soon", "info") }
      }, "+ New Update") : null
    ),
    React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" } },
      ["all", "urgent", "task", "announcement", "update"].map(function(f){
        var tc = typesCfg[f];
        return React.createElement("button", {
          key: f,
          onClick: function(){ setFilter(f) },
          style: {
            background: filter === f ? "rgba(0,255,136,0.1)" : "var(--card2)",
            border: "1px solid " + (filter === f ? "var(--primary)" : "var(--border)"),
            color: filter === f ? "var(--primary)" : "var(--text-sub)",
            borderRadius: 20, padding: "5px 14px", fontSize: 12,
            fontWeight: 600, cursor: "pointer",
            fontFamily: "'Space Grotesk',sans-serif"
          }
        }, f === "all" ? "All" : tc ? tc.i + " " + tc.l : f);
      })
    ),
    shown.length === 0 ? React.createElement(EmptyState, { icon: "📭", title: "No updates found" }) :
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
      shown.map(function(f){
        var tc = typesCfg[f.type] || typesCfg.update;
        var ackd = acks[f.id];
        return React.createElement("div", {
          key: f.id,
          className: "nx-card",
          style: { padding: 16, borderLeft: "3px solid " + tc.c, opacity: ackd ? 0.85 : 1 }
        },
          f.is_pinned ? React.createElement("div", { style: {
            fontSize: 10, fontWeight: 800, color: "#F59E0B",
            marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif"
          } }, "📌 PINNED") : null,
          React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" } },
            React.createElement("div", { style: {
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: tc.c + "18", border: "1px solid " + tc.c + "30",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
            } }, tc.i),
            React.createElement("div", { style: { flex: 1, minWidth: 180 } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } },
                React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, f.title),
                React.createElement("span", { style: {
                  fontSize: 10, fontWeight: 700, color: tc.c,
                  background: tc.c + "18", border: "1px solid " + tc.c + "30",
                  padding: "2px 8px", borderRadius: 20,
                  fontFamily: "'Space Grotesk',sans-serif"
                } }, tc.l)
              ),
              React.createElement("p", { style: { fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6, marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" } }, f.content),
              React.createElement("div", { style: { fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Grotesk',sans-serif" } },
                (f.by ? f.by.full_name : "System") + " · " + new Date(f.created_at).toLocaleString()
              )
            ),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 } },
              !ackd ? React.createElement("button", {
                className: "nx-btn nx-btn-secondary nx-btn-sm",
                onClick: function(){ ack(f.id, "read") }
              }, "✓ Read") : null,
              f.type === "task" && ackd !== "done" ? React.createElement("button", {
                className: "nx-btn nx-btn-primary nx-btn-sm",
                onClick: function(){ ack(f.id, "done") }
              }, "✅ Done") : null,
              ackd ? React.createElement("span", { style: { fontSize: 11, color: "var(--primary)", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" } },
                ackd === "done" ? "✅ Done" : "✓ Read"
              ) : null
            )
          )
        );
      })
    )
  );
}

function AnnouncementsPage(props){
  var user = props.user;
  var _1 = React.useState([]); var items = _1[0]; var setItems = _1[1];
  var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];

  React.useEffect(function(){
    load();
    ChannelMgr.sub("ann", DB.UPDATES_FEED, null, load);
    return function(){ ChannelMgr.unsub("ann") };
  }, []);

  function load(){
    withRetry(function(){
      return sb.from(DB.UPDATES_FEED)
        .select("*, by:employees!updates_feed_created_by_fkey(full_name, role)")
        .eq("type", "announcement")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
    }).then(function(r){
      setItems(r.data || []);
    }).catch(function(){ showToast("Failed to load", "error") })
    .finally(function(){ setLoading(false) });
  }

  if(loading) return React.createElement(LoadingPage, { message: "Loading Announcements..." });

  return React.createElement("div", { className: "nx-page-enter" },
    React.createElement(PageHeader, { title: "Announcements", icon: "📣", subtitle: items.length + " announcements" }),
    items.length === 0 ? React.createElement(EmptyState, { icon: "📣", title: "No announcements" }) :
    React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
      items.map(function(item){
        return React.createElement("div", { key: item.id, className: "nx-card", style: { padding: 16 } },
          item.is_pinned ? React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: "#F59E0B", marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" } }, "📌 PINNED") : null,
          React.createElement("div", { style: { marginBottom: 8 } },
            React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, item.title)
          ),
          React.createElement("p", { style: { fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6, marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" } }, item.content),
          React.createElement("div", { style: { fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Grotesk',sans-serif" } },
            (item.by ? item.by.full_name : "System") + " · " + new Date(item.created_at).toLocaleString()
          )
        );
      })
    )
  );
}

function SchedulePage(props){
  var user = props.user;
  var _1 = React.useState([]); var emps = _1[0]; var setEmps = _1[1];
  var _2 = React.useState([]); var schedules = _2[0]; var setSchedules = _2[1];
  var _3 = React.useState([]); var shiftTypes = _3[0]; var setShiftTypes = _3[1];
  var _4 = React.useState(true); var loading = _4[0]; var setLoading = _4[1];
  var _5 = React.useState(function(){
    var d = new Date();
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }); var weekStart = _5[0]; var setWeekStart = _5[1];
  var isMgr = RC.isMgr(user);

  React.useEffect(function(){ load() }, [weekStart]);

  function load(){
    setLoading(true);
    var ws = weekStart.toISOString().split("T")[0];
    var we = new Date(weekStart.getTime() + 6 * 86400000).toISOString().split("T")[0];
    withRetry(function(){
      return sb.from(DB.EMPLOYEES).select("id,full_name,role,department,avatar_url").eq("is_active", true).order("full_name");
    }).then(function(r){ setEmps(r.data || []) }).catch(function(){});
    withRetry(function(){
      return sb.from(DB.SCHEDULES)
        .select("*, days:schedule_days(*)")
        .gte("week_start", ws)
        .lte("week_start", we);
    }).then(function(r){ setSchedules(r.data || []) }).catch(function(){});
    withRetry(function(){
      return sb.from(DB.SHIFT_TYPES).select("*").eq("is_active", true);
    }).then(function(r){ setShiftTypes(r.data || []) }).catch(function(){})
    .finally(function(){ setLoading(false) });
  }

  function prevWeek(){ setWeekStart(function(w){ return new Date(w.getTime() - 7 * 86400000) }); }
  function nextWeek(){ setWeekStart(function(w){ return new Date(w.getTime() + 7 * 86400000) }); }

  var days = [];
  for(var i = 0; i < 7; i++){ days.push(new Date(weekStart.getTime() + i * 86400000)); }
  var dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function getDayData(empId, date){
    var ws = weekStart.toISOString().split("T")[0];
    var sched = schedules.find(function(s){ return s.employee_id === empId && s.week_start === ws });
    if(!sched || !sched.days) return null;
    var dk = date.toISOString().split("T")[0];
    return sched.days.find(function(d){ return d.day_date === dk }) || null;
  }

  function getCellColor(day){
    if(!day) return "var(--card2)";
    if(day.shift_type === "WO") return "rgba(34,197,94,0.15)";
    if(day.shift_type === "Leave") return "rgba(234,179,8,0.15)";
    if(day.shift_type === "Holiday") return "rgba(236,72,153,0.15)";
    if(day.shift_type === "Training") return "rgba(139,92,246,0.15)";
    if(day.shift_type === "shift"){
      var st = shiftTypes.find(function(s){ return s.label === day.shift_label });
      return st ? (st.color + "22") : "rgba(59,130,246,0.15)";
    }
    return "var(--card2)";
  }

  if(loading) return React.createElement(LoadingPage, { message: "Loading Schedule..." });

  return React.createElement("div", { className: "nx-page-enter" },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 } },
      React.createElement("h1", { style: { fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, "📅 Schedule"),
      React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement("button", { className: "nx-btn nx-btn-secondary nx-btn-sm", onClick: prevWeek }, "← Prev"),
        React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } },
          weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " – " +
          new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        ),
        React.createElement("button", { className: "nx-btn nx-btn-secondary nx-btn-sm", onClick: nextWeek }, "Next →")
      )
    ),
    React.createElement("div", { style: { overflowX: "auto", WebkitOverflowScrolling: "touch" } },
      React.createElement("table", { className: "nx-table", style: { minWidth: 700 } },
        React.createElement("thead", null,
          React.createElement("tr", null,
            React.createElement("th", { style: { minWidth: 140 } }, "Employee"),
            days.map(function(d, i){
              var isToday = d.toDateString() === new Date().toDateString();
              return React.createElement("th", { key: i, style: { textAlign: "center", minWidth: 90, color: isToday ? "var(--primary)" : "var(--text-muted)" } },
                dayNames[i], React.createElement("br", null),
                React.createElement("span", { style: { fontSize: 10, fontWeight: 400 } }, d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }))
              );
            })
          )
        ),
        React.createElement("tbody", null,
          emps.map(function(emp){
            return React.createElement("tr", { key: emp.id },
              React.createElement("td", null,
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                  React.createElement(NxAvatar, { user: emp, size: "xs" }),
                  React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, emp.full_name),
                    React.createElement(RoleBadge, { role: emp.role })
                  )
                )
              ),
              days.map(function(d, i){
                var day = getDayData(emp.id, d);
                var bg = getCellColor(day);
                return React.createElement("td", { key: i, style: { textAlign: "center", padding: 6 } },
                  React.createElement("div", { style: {
                    background: bg, borderRadius: 8, padding: "6px 4px", fontSize: 11, fontWeight: 600,
                    color: "var(--text-sub)", minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Grotesk',sans-serif", cursor: isMgr ? "pointer" : "default"
                  },
                  onClick: isMgr ? function(){ showToast("Edit schedule — coming soon", "info") } : null
                  },
                    day ? (
                      day.shift_type === "shift" ? (day.shift_label || "Shift") :
                      day.shift_type === "WO" ? "🌴 WO" :
                      day.shift_type === "Leave" ? "📋 Leave" :
                      day.shift_type === "Holiday" ? "🎉 Holiday" :
                      day.shift_type === "Training" ? "📚 Train" :
                      day.shift_type
                    ) : "—"
                  )
                );
              })
            );
          })
        )
      )
    )
  );
}

function AttendancePage(props){
  var user = props.user;
  var _1 = React.useState([]); var items = _1[0]; var setItems = _1[1];
  var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];
  var _3 = React.useState("today"); var range = _3[0]; var setRange = _3[1];
  var isMgr = RC.isMgr(user);

  React.useEffect(function(){ load() }, [range]);

  function load(){
    setLoading(true);
    var today = new Date().toISOString().split("T")[0];
    var from = range === "today" ? today :
               range === "week" ? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0] :
               new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    var q = sb.from(DB.ATTENDANCE)
      .select("*, employee:employees!employee_id(full_name, role, avatar_url)")
      .gte("date", from)
      .order("date", { ascending: false })
      .order("check_in", { ascending: false });
    if(!isMgr) q = q.eq("employee_id", user.id);
    withRetry(function(){ return q; })
      .then(function(r){ setItems(r.data || []) })
      .catch(function(){ showToast("Failed to load attendance", "error") })
      .finally(function(){ setLoading(false) });
  }

  if(loading) return React.createElement(LoadingPage, { message: "Loading Attendance..." });

  return React.createElement("div", { className: "nx-page-enter" },
    React.createElement(PageHeader, {
      title: "Attendance", icon: "✅",
      subtitle: items.length + " records",
      actions: React.createElement("div", { style: { display: "flex", gap: 6 } },
        ["today", "week", "month"].map(function(r){
          return React.createElement("button", {
            key: r,
            className: "nx-btn nx-btn-sm " + (range === r ? "nx-btn-primary" : "nx-btn-secondary"),
            onClick: function(){ setRange(r) }
          }, r.charAt(0).toUpperCase() + r.slice(1));
        })
      )
    }),
    items.length === 0 ? React.createElement(EmptyState, { icon: "✅", title: "No records found" }) :
    React.createElement("div", { style: { overflowX: "auto" } },
      React.createElement("table", { className: "nx-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            isMgr ? React.createElement("th", null, "Employee") : null,
            React.createElement("th", null, "Date"),
            React.createElement("th", null, "Check In"),
            React.createElement("th", null, "Check Out"),
            React.createElement("th", null, "Status")
          )
        ),
        React.createElement("tbody", null,
          items.map(function(item){
            return React.createElement("tr", { key: item.id },
              isMgr ? React.createElement("td", null,
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                  React.createElement(NxAvatar, { user: item.employee, size: "xs" }),
                  React.createElement("span", { style: { fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" } },
                    item.employee ? item.employee.full_name : "--"
                  )
                )
              ) : null,
              React.createElement("td", { style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" } }, fmtDate(item.date)),
              React.createElement("td", { style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" } }, item.check_in ? fmtTime(item.check_in) : "--"),
              React.createElement("td", { style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" } }, item.check_out ? fmtTime(item.check_out) : "--"),
              React.createElement("td", null, React.createElement(StatusBadge, { status: item.status || "unknown" }))
            );
          })
        )
      )
    )
  );
}

function LiveFloorPage(props){
  var user = props.user;
  var _1 = React.useState([]); var emps = _1[0]; var setEmps = _1[1];
  var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];
  var _3 = React.useState(""); var search = _3[0]; var setSearch = _3[1];
  var _4 = React.useState("all"); var statusFilter = _4[0]; var setStatusFilter = _4[1];

  React.useEffect(function(){
    load();
    ChannelMgr.sub("livefloor", DB.EMPLOYEES, null, load);
    return function(){ ChannelMgr.unsub("livefloor") };
  }, []);

  function load(){
    withRetry(function(){
      return sb.from(DB.EMPLOYEES)
        .select("id, full_name, role, department, status, is_online, last_seen, avatar_url")
        .eq("is_active", true)
        .order("full_name");
    }).then(function(r){ setEmps(r.data || []) })
    .catch(function(){ showToast("Failed to load floor", "error") })
    .finally(function(){ setLoading(false) });
  }

  var online = emps.filter(function(e){ return e.is_online }).length;
  var shown = emps.filter(function(e){
    var matchSearch = !search || e.full_name.toLowerCase().indexOf(search.toLowerCase()) > -1;
    var matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if(loading) return React.createElement(LoadingPage, { message: "Loading Live Floor..." });

  return React.createElement("div", { className: "nx-page-enter" },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, "🖥️ Live Floor"),
        React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontFamily: "'Space Grotesk',sans-serif" } },
          online + " online · " + emps.length + " total"
        )
      )
    ),
    React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" } },
      React.createElement(SearchInput, { value: search, onChange: setSearch, placeholder: "Search agents..." }),
      React.createElement("select", {
        className: "nx-input",
        style: { width: "auto", minWidth: 130 },
        value: statusFilter,
        onChange: function(e){ setStatusFilter(e.target.value) }
      },
        React.createElement("option", { value: "all" }, "All Status"),
        Object.keys(STATUS_MAP).map(function(k){
          return React.createElement("option", { key: k, value: k }, STATUS_MAP[k].label);
        })
      )
    ),
    React.createElement("div", { className: "nx-grid-4" },
      shown.map(function(emp){
        var sm = STATUS_MAP[emp.status] || STATUS_MAP.unknown;
        return React.createElement("div", { key: emp.id, className: "nx-card", style: { padding: 16 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 } },
            React.createElement("div", { style: { position: "relative" } },
              React.createElement(NxAvatar, { user: emp, size: "md" }),
              React.createElement("div", { style: {
                position: "absolute", bottom: 0, right: 0,
                width: 10, height: 10, borderRadius: "50%",
                background: emp.is_online ? "#22C55E" : "#6B7280",
                border: "2px solid var(--card)"
              } })
            ),
            React.createElement("div", { style: { flex: 1, minWidth: 0 } },
              React.createElement("div", { style: {
                fontSize: 13, fontWeight: 700, color: "var(--text)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "'Space Grotesk',sans-serif"
              } }, emp.full_name),
              React.createElement(RoleBadge, { role: emp.role })
            )
          ),
          React.createElement(StatusBadge, { status: emp.status || "unknown" }),
          emp.last_seen ? React.createElement("div", { style: { fontSize: 10, color: "var(--text-muted)", marginTop: 6, fontFamily: "'Space Grotesk',sans-serif" } },
            "Last seen: " + fmtRelative(emp.last_seen)
          ) : null
        );
      })
    )
  );
}
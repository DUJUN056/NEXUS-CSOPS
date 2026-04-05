// [NEXUS-CSOPS] Core Application Screens (Part 2)
// STATUS: SOVEREIGN COMPLIANCE ENFORCED
// LANGUAGE: ENGLISH ONLY

(function() {
  const React = window.React;

  // --- 1. Updates Feed Page ---
  window.UpdatesFeedPage = function(props) {
    var user = props.user;
    var _1 = React.useState([]); var feeds = _1[0]; var setFeeds = _1[1];
    var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];
    var _3 = React.useState({}); var acks = _3[0]; var setAcks = _3[1];
    var _4 = React.useState("all"); var filter = _4[0]; var setFilter = _4[1];
    var canCreate = ["Owner", "Team Leader", "Shift Leader", "SME"].indexOf(user.role) > -1;

    React.useEffect(function() {
      load();
      if (window.ChannelMgr) {
        window.ChannelMgr.sub("feed", window.DB.UPDATES_FEED, null, load);
      }
      return function() { if (window.ChannelMgr) window.ChannelMgr.unsub("feed"); };
    }, []);

    function load() {
      window.withRetry(function() {
        return window.sb.from(window.DB.UPDATES_FEED)
          .select("*,by:employees!updates_feed_created_by_fkey(full_name,role)")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });
      }).then(function(r) {
        var data = r.data || [];
        var filtered = data.filter(function(item) {
          if (item.expires_at && new Date(item.expires_at) < new Date()) return false;
          if (item.target_type === "all") return true;
          if (item.target_type === "role") {
            var roles = Array.isArray(item.target_roles) ? item.target_roles : [];
            return roles.indexOf(user.role) > -1;
          }
          if (item.target_type === "department") {
            return item.target_dept === user.department || user.department === "Both" || item.target_dept === "Both";
          }
          return true;
        });
        setFeeds(filtered);
      }).catch(function() { window.showToast("Failed to load updates", "error") })
        .finally(function() { setLoading(false) });

      window.withRetry(function() {
        return window.sb.from("feed_acknowledgments")
          .select("feed_id,status")
          .eq("employee_id", user.id);
      }).then(function(r) {
        var map = {};
        (r.data || []).forEach(function(a) { map[a.feed_id] = a.status });
        setAcks(map);
      }).catch(function() { });
    }

    function ack(id, status) {
      window.sb.from("feed_acknowledgments").upsert(
        { feed_id: id, employee_id: user.id, status: status || "read" },
        { onConflict: "feed_id,employee_id" }
      ).then(function() {
        setAcks(function(p) { var n = Object.assign({}, p); n[id] = status || "read"; return n });
      }).catch(function() { });
    }

    var typesCfg = {
      urgent: { c: "#EF4444", i: "🚨", l: "Urgent" },
      task: { c: "#3B82F6", i: "📌", l: "Task" },
      announcement: { c: "#8B5CF6", i: "📢", l: "Announcement" },
      update: { c: "#10B981", i: "📊", l: "Update" }
    };

    var shown = filter === "all" ? feeds : feeds.filter(function(f) { return f.type === filter });

    if (loading) return React.createElement(window.LoadingPage, { message: "Loading Updates..." });

    return React.createElement("div", { className: "nx-page-enter" },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 } },
        React.createElement("div", null,
          React.createElement("h1", { style: { fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } },
            user.role === "Agent" ? "My Tasks" : "Updates Feed"
          ),
          React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontFamily: "'Space Grotesk',sans-serif" } }, feeds.length + " items")
        ),
        canCreate ? React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: function() { window.showToast("Create update — coming soon", "info") }
        }, "+ New Update") : null
      ),
      React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" } },
        ["all", "urgent", "task", "announcement", "update"].map(function(f) {
          var tc = typesCfg[f];
          return React.createElement("button", {
            key: f, onClick: function() { setFilter(f) },
            style: {
              background: filter === f ? "rgba(0,255,136,0.1)" : "var(--card2)",
              border: "1px solid " + (filter === f ? "var(--primary)" : "var(--border)"),
              color: filter === f ? "var(--primary)" : "var(--text-sub)",
              borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif"
            }
          }, f === "all" ? "All" : tc ? tc.i + " " + tc.l : f);
        })
      ),
      shown.length === 0 ? React.createElement(window.EmptyState, { icon: "📭", title: "No updates found" }) :
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          shown.map(function(f) {
            var tc = typesCfg[f.type] || typesCfg.update;
            var ackd = acks[f.id];
            return React.createElement("div", {
              key: f.id, className: "nx-card",
              style: { padding: 16, borderLeft: "3px solid " + tc.c, opacity: ackd ? 0.85 : 1 }
            },
              f.is_pinned ? React.createElement("div", { style: { fontSize: 10, fontWeight: 800, color: "#F59E0B", marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" } }, "📌 PINNED") : null,
              React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" } },
                React.createElement("div", { style: { width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: tc.c + "18", border: "1px solid " + tc.c + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 } }, tc.i),
                React.createElement("div", { style: { flex: 1, minWidth: 180 } },
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } },
                    React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, f.title),
                    React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: tc.c, background: tc.c + "18", border: "1px solid " + tc.c + "30", padding: "2px 8px", borderRadius: 20, fontFamily: "'Space Grotesk',sans-serif" } }, tc.l)
                  ),
                  React.createElement("p", { style: { fontSize: 13, color: "var(--text-sub)", lineHeight: 1.6, marginBottom: 8, fontFamily: "'Space Grotesk',sans-serif" } }, f.content),
                  React.createElement("div", { style: { fontSize: 11, color: "var(--text-muted)", fontFamily: "'Space Grotesk',sans-serif" } },
                    (f.by ? f.by.full_name : "System") + " · " + new Date(f.created_at).toLocaleString()
                  )
                ),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 } },
                  !ackd ? React.createElement("button", { className: "nx-btn nx-btn-secondary nx-btn-sm", onClick: function() { ack(f.id, "read") } }, "✓ Read") : null,
                  f.type === "task" && ackd !== "done" ? React.createElement("button", { className: "nx-btn nx-btn-primary nx-btn-sm", onClick: function() { ack(f.id, "done") } }, "✅ Done") : null,
                  ackd ? React.createElement("span", { style: { fontSize: 11, color: "var(--primary)", fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" } }, ackd === "done" ? "✅ Done" : "✓ Read") : null
                )
              )
            );
          })
        )
    );
  };

  // --- 2. Live Floor Page ---
  window.LiveFloorPage = function(props) {
    var user = props.user;
    var _1 = React.useState([]); var emps = _1[0]; var setEmps = _1[1];
    var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];
    var _3 = React.useState(""); var search = _3[0]; var setSearch = _3[1];
    var _4 = React.useState("all"); var statusFilter = _4[0]; var setStatusFilter = _4[1];

    React.useEffect(function() {
      load();
      if (window.ChannelMgr) {
        window.ChannelMgr.sub("livefloor", window.DB.EMPLOYEES, null, load);
      }
      return function() { if (window.ChannelMgr) window.ChannelMgr.unsub("livefloor"); };
    }, []);

    function load() {
      window.withRetry(function() {
        return window.sb.from(window.DB.EMPLOYEES)
          .select("id,full_name,role,department,status,is_online,last_seen,avatar_url")
          .eq("is_active", true)
          .order("full_name");
      }).then(function(r) { setEmps(r.data || []) })
        .catch(function() { window.showToast("Failed to load floor", "error") })
        .finally(function() { setLoading(false) });
    }

    var online = emps.filter(function(e) { return e.is_online }).length;
    var shown = emps.filter(function(e) {
      var matchSearch = !search || e.full_name.toLowerCase().indexOf(search.toLowerCase()) > -1;
      var matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (loading) return React.createElement(window.LoadingPage, { message: "Loading Live Floor..." });

    return React.createElement("div", { className: "nx-page-enter" },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 } },
        React.createElement("div", null,
          React.createElement("h1", { style: { fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" } }, "🖥️ Live Floor"),
          React.createElement("p", { style: { fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontFamily: "'Space Grotesk',sans-serif" } }, online + " online · " + emps.length + " total")
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" } },
        React.createElement(window.SearchInput, { value: search, onChange: setSearch, placeholder: "Search agents..." }),
        React.createElement("select", {
          className: "nx-input", style: { width: "auto", minWidth: 130 },
          value: statusFilter, onChange: function(e) { setStatusFilter(e.target.value) }
        },
          React.createElement("option", { value: "all" }, "All Status"),
          Object.keys(window.STATUS_MAP || {}).map(function(k) {
            return React.createElement("option", { key: k, value: k }, window.STATUS_MAP[k].label);
          })
        )
      ),
      React.createElement("div", { className: "nx-grid-4" },
        shown.map(function(emp) {
          return React.createElement("div", { key: emp.id, className: "nx-card", style: { padding: 16 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 } },
              React.createElement("div", { style: { position: "relative" } },
                React.createElement(window.NxAvatar, { user: emp, size: "md" }),
                React.createElement("div", { style: { position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: emp.is_online ? "#22C55E" : "#6B7280", border: "2px solid var(--card)" } })
              ),
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Space Grotesk',sans-serif" } }, emp.full_name),
                React.createElement(window.RoleBadge, { role: emp.role })
              )
            ),
            React.createElement(window.StatusBadge, { status: emp.status || "unknown" })
          );
        })
      )
    );
  };
})();
/* NEXUS-CSOPS v4.2.0 — app.js */

/* ══════════════════════════════════════════
   HEARTBEAT
   ══════════════════════════════════════════ */
var _heartbeatInterval = null;

function startHeartbeat(userId) {
  if (_heartbeatInterval) clearInterval(_heartbeatInterval);
  _heartbeatInterval = setInterval(async function() {
    try {
      await sb.from("employees").update({
        is_online: true,
        last_seen: new Date().toISOString()
      }).eq("id", userId);
    } catch(e) {}
  }, 60000);

  window.addEventListener("beforeunload", async function() {
    clearInterval(_heartbeatInterval);
    try {
      await sb.from("employees").update({
        is_online: false,
        status: "offline",
        last_seen: new Date().toISOString()
      }).eq("id", userId);
    } catch(e) {}
  });
}

function stopHeartbeat() {
  if (_heartbeatInterval) {
    clearInterval(_heartbeatInterval);
    _heartbeatInterval = null;
  }
}

/* ══════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════ */
async function loadUserProfile(authId) {
  try {
    var res = await withRetry(function() {
      return sb.from("employees")
        .select("*")
        .eq("auth_id", authId)
        .single();
    });
    if (!res.data) return null;
    var emp = res.data;
    if (emp.is_suspended) {
      await sb.auth.signOut();
      showToast("Account suspended: " + (emp.suspend_reason || ""), "error");
      return null;
    }
    await sb.from("employees").update({
      is_online: true,
      status: emp.status === "offline" ? "online" : emp.status,
      last_seen: new Date().toISOString()
    }).eq("id", emp.id);
    startHeartbeat(emp.id);
    return emp;
  } catch(e) {
    return null;
  }
}

/* ══════════════════════════════════════════
   PAGE ROUTER
   ══════════════════════════════════════════ */
function PageRouter({ page, user, setPage }) {
  if (!user) return React.createElement(LoadingPage, {
    message: "NEXUS-CSOPS Loading..."
  });

  var props = { user: user, setPage: setPage };

  var routes = {
    "Updates Feed":       typeof UpdatesFeedPage       !== "undefined" ? React.createElement(UpdatesFeedPage, props)       : null,
    "Announcements":      typeof AnnouncementsPage     !== "undefined" ? React.createElement(AnnouncementsPage, props)     : null,
    "Schedule":           typeof SchedulePage          !== "undefined" ? React.createElement(SchedulePage, props)          : null,
    "Attendance":         typeof AttendancePage        !== "undefined" ? React.createElement(AttendancePage, props)        : null,
    "Live Floor":         typeof LiveFloorPage         !== "undefined" ? React.createElement(LiveFloorPage, props)         : null,
    "My Break Schedule":  typeof MyBreakSchedulePage   !== "undefined" ? React.createElement(MyBreakSchedulePage, props)   : null,
    "My Requests":        typeof MyRequestsPage        !== "undefined" ? React.createElement(MyRequestsPage, props)        : null,
    "Shift Handover":     typeof ShiftHandoverPage     !== "undefined" ? React.createElement(ShiftHandoverPage, props)     : null,
    "Case Handover":      typeof CaseHandoverPage      !== "undefined" ? React.createElement(CaseHandoverPage, props)      : null,
    "TT Tracker":         typeof TTTrackerPage         !== "undefined" ? React.createElement(TTTrackerPage, props)         : null,
    "Performance":        typeof PerformancePage       !== "undefined" ? React.createElement(PerformancePage, props)       : null,
    "Queue":              typeof QueuePage             !== "undefined" ? React.createElement(QueuePage, props)             : null,
    "Gamification":       typeof GamificationPage      !== "undefined" ? React.createElement(GamificationPage, props)      : null,
    "Surveys":            typeof SurveysPage           !== "undefined" ? React.createElement(SurveysPage, props)           : null,
    "Chat":               typeof ChatPage              !== "undefined" ? React.createElement(ChatPage, props)              : null,
    "Notifications":      typeof NotificationsPage     !== "undefined" ? React.createElement(NotificationsPage, props)     : null,
    "My Profile":         typeof MyProfilePage         !== "undefined" ? React.createElement(MyProfilePage, props)         : null,
    "My Workspace":       typeof MyWorkspacePage       !== "undefined" ? React.createElement(MyWorkspacePage, props)       : null,
    "Audit Log":          typeof AuditLogPage          !== "undefined" ? React.createElement(AuditLogPage, props)          : null,
    "Reports & Notes":    typeof ReportsNotesPage      !== "undefined" ? React.createElement(ReportsNotesPage, props)      : null,
    "Break Management":   typeof BreakManagementPage   !== "undefined" ? React.createElement(BreakManagementPage, props)   : null,
    "Owner Analytics":    typeof OwnerAnalytics        !== "undefined" ? React.createElement(OwnerAnalytics, props)        : null,
  };

  if (!RC.canAccess(user, page)) {
    return React.createElement(EmptyState, {
      icon: "🔒",
      title: "Access Denied",
      desc: "You don't have permission to view this page."
    });
  }

  return routes[page] || React.createElement(EmptyState, {
    icon: "📭",
    title: "Page Not Found",
    desc: page
  });
}

/* ══════════════════════════════════════════
   SIDEBAR NAV
   ══════════════════════════════════════════ */
function Sidebar({ user, page, setPage, onLogout }) {
  var nav = [
    { group: "Operations",
      items: [
        { id:"Updates Feed",      icon:"📢", label:"Updates Feed" },
        { id:"Announcements",     icon:"📣", label:"Announcements" },
        { id:"Schedule",          icon:"📅", label:"Schedule" },
        { id:"Attendance",        icon:"✅", label:"Attendance" },
        { id:"Live Floor",        icon:"🖥️", label:"Live Floor" },
      ]
    },
    { group: "My Tools",
      items: [
        { id:"My Break Schedule", icon:"☕", label:"My Breaks" },
        { id:"My Requests",       icon:"📋", label:"My Requests" },
        { id:"Shift Handover",    icon:"🔄", label:"Shift Handover" },
        { id:"Case Handover",     icon:"📁", label:"Case Handover" },
        { id:"TT Tracker",        icon:"🎫", label:"TT Tracker" },
        { id:"Performance",       icon:"📊", label:"Performance" },
        { id:"Queue",             icon:"📞", label:"Queue" },
        { id:"Gamification",      icon:"🏆", label:"Gamification" },
        { id:"Surveys",           icon:"📝", label:"Surveys" },
        { id:"Chat",              icon:"💬", label:"Chat" },
      ]
    },
    { group: "Account",
      items: [
        { id:"Notifications",     icon:"🔔", label:"Notifications" },
        { id:"My Profile",        icon:"👤", label:"My Profile" },
        { id:"My Workspace",      icon:"🖥️", label:"My Workspace" },
      ]
    },
  ];

  if (RC.isMgr(user)) {
    nav.push({
      group: "Management",
      items: [
        { id:"Audit Log",         icon:"📋", label:"Audit Log" },
        { id:"Reports & Notes",   icon:"📄", label:"Reports & Notes" },
        { id:"Break Management",  icon:"⏱️", label:"Break Management" },
      ]
    });
  }

  if (RC.isOwner(user)) {
    nav.push({
      group: "Owner",
      items: [
        { id:"Owner Analytics",   icon:"👑", label:"Owner Analytics" },
      ]
    });
  }

  return React.createElement("div", {
    className: "nx-sidebar"
  },
    React.createElement("div", { className: "nx-sidebar-logo" },
      React.createElement("span", { style:{ fontSize:20 } }, "⚡"),
      React.createElement("span", { style:{ fontWeight:900, fontSize:14 } }, "NEXUS")
    ),
    React.createElement("div", { className: "nx-sidebar-user" },
      React.createElement(NxAvatar, { user:user, size:"sm" }),
      React.createElement("div", null,
        React.createElement("div", {
          style:{ fontSize:12, fontWeight:700, color:"var(--text)" }
        }, user.full_name || "—"),
        React.createElement(RoleBadge, { role: user.role })
      )
    ),
    React.createElement("nav", { className: "nx-sidebar-nav" },
      nav.map(function(group) {
        return React.createElement("div", {
          key: group.group,
          className: "nx-nav-group"
        },
          React.createElement("div", {
            className: "nx-nav-group-label"
          }, group.group),
          group.items.map(function(item) {
            return React.createElement("button", {
              key: item.id,
              className: "nx-nav-item" +
                (page === item.id ? " active" : ""),
              onClick: function() { setPage(item.id); }
            },
              React.createElement("span", {
                className: "nx-nav-icon"
              }, item.icon),
              React.createElement("span", null, item.label)
            );
          })
        );
      })
    ),
    React.createElement("button", {
      className: "nx-sidebar-logout",
      onClick: onLogout
    }, "🚪 Sign Out")
  );
}

/* ══════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  var _1 = React.useState(""),  email    = _1[0], setEmail    = _1[1];
  var _2 = React.useState(""),  password = _2[0], setPassword = _2[1];
  var _3 = React.useState(false), loading = _3[0], setLoading = _3[1];
  var theme = ThemeMgr.get();
  var bg    = ThemeImageMgr.getSync(theme, "Login");

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter email and password", "warning");
      return;
    }
    setLoading(true);
    try {
      var res = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (res.error) throw res.error;
      var emp = await loadUserProfile(res.data.user.id);
      if (emp) {
        onLogin(emp);
        showToast("Welcome back, " + (emp.full_name || "") + "! 👋", "success");
      }
    } catch(e) {
      showToast(e.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg
        ? "url("+bg+") center/cover no-repeat"
        : "var(--bg)",
      padding: 24
    }
  },
    React.createElement("div", {
      style: {
        width: "100%", maxWidth: 400,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 40,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }
    },
      React.createElement("div", {
        style: {
          textAlign: "center", marginBottom: 32
        }
      },
        React.createElement("div", {
          style: { fontSize: 48, marginBottom: 8 }
        }, "⚡"),
        React.createElement("h1", {
          style: {
            fontSize: 24, fontWeight: 900,
            color: "var(--primary)"
          }
        }, "NEXUS-CSOPS"),
        React.createElement("p", {
          style: {
            fontSize: 13, color: "var(--text-muted)",
            marginTop: 4
          }
        }, "CS Operations Platform v4.2.0")
      ),
      React.createElement("form", {
        onSubmit: handleLogin,
        style: {
          display: "flex", flexDirection: "column", gap: 16
        }
      },
        React.createElement("div", null,
          React.createElement("label", {
            style: {
              fontSize: 12, fontWeight: 700,
              color: "var(--text-sub)",
              display: "block", marginBottom: 6
            }
          }, "EMAIL"),
          React.createElement("input", {
            type: "email",
            className: "nx-input",
            placeholder: "your@email.com",
            value: email,
            onChange: function(e) { setEmail(e.target.value); },
            style: { fontSize: 16 }
          })
        ),
        React.createElement("div", null,
          React.createElement("label", {
            style: {
              fontSize: 12, fontWeight: 700,
              color: "var(--text-sub)",
              display: "block", marginBottom: 6
            }
          }, "PASSWORD"),
          React.createElement("input", {
            type: "password",
            className: "nx-input",
            placeholder: "••••••••",
            value: password,
            onChange: function(e) { setPassword(e.target.value); },
            style: { fontSize: 16 }
          })
        ),
        React.createElement("button", {
          type: "submit",
          className: "nx-btn nx-btn-primary",
          disabled: loading,
          style: {
            width: "100%", padding: "14px",
            fontSize: 15, fontWeight: 800,
            marginTop: 8
          }
        },
          loading
            ? React.createElement(Spinner, { size: "sm" })
            : "Sign In to NEXUS"
        )
      )
    )
  );
}

/* ══════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════ */
function App() {
  var _1 = React.useState(null),  user    = _1[0], setUser    = _1[1];
  var _2 = React.useState(true),  loading = _2[0], setLoading = _2[1];
  var _3 = React.useState("Updates Feed"), page = _3[0], setPage = _3[1];
  var _4 = React.useState(false), sidebarOpen = _4[0], setSidebarOpen = _4[1];

  React.useEffect(function() {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      var res = await sb.auth.getSession();
      if (res.data?.session?.user) {
        var emp = await loadUserProfile(
          res.data.session.user.id
        );
        if (emp) setUser(emp);
      }
    } catch(e) {
      console.error("[NEXUS-CSOPS] Auth init error:", e);
    } finally {
      setLoading(false);
    }

    sb.auth.onAuthStateChange(async function(event, session) {
      if (event === "SIGNED_OUT") {
        stopHeartbeat();
        ChannelMgr.unsubAll();
        setUser(null);
        setPage("Updates Feed");
      }
    });
  }

  async function handleLogout() {
    try {
      stopHeartbeat();
      if (user) {
        await sb.from("employees").update({
          is_online: false,
          status: "offline",
          last_seen: new Date().toISOString()
        }).eq("id", user.id);
      }
      ChannelMgr.unsubAll();
      await sb.auth.signOut();
      setUser(null);
      setPage("Updates Feed");
      showToast("Signed out successfully", "success");
    } catch(e) {
      showToast("Sign out failed", "error");
    }
  }

  if (loading) {
    return React.createElement("div", {
      style: {
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16
      }
    },
      React.createElement(Spinner, { size: "lg" }),
      React.createElement("p", {
        style: { color: "var(--text-muted)", fontSize: 13 }
      }, "NEXUS-CSOPS Loading...")
    );
  }

  if (!user) {
    return React.createElement(React.Fragment, null,
      React.createElement(ToastContainer, null),
      React.createElement(LoginPage, { onLogin: setUser })
    );
  }

  return React.createElement(React.Fragment, null,
    React.createElement(ToastContainer, null),
    React.createElement("div", { className: "nx-layout" },
      React.createElement(Sidebar, {
        user: user,
        page: page,
        setPage: function(p) {
          setPage(p);
          setSidebarOpen(false);
        },
        onLogout: handleLogout
      }),
      React.createElement("main", { className: "nx-main" },
        React.createElement("div", { className: "nx-content" },
          React.createElement(PageRouter, {
            page: page,
            user: user,
            setPage: setPage
          })
        )
      )
    )
  );
}

/* ══════════════════════════════════════════
   MOUNT
   ══════════════════════════════════════════ */
(function() {
  var theme = ThemeMgr.get();
  document.documentElement.setAttribute("data-theme", theme);
  var root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App, null));
})();
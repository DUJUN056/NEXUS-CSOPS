/* ============================================================
   NEXUS-CSOPS v4.2.0
   app.js — Main Application Entry
   Router + Auth + Layout + App Shell
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════════════════ */
function App() {
  const [user,         setUser]         = useState(null);
  const [authLoading,  setAuthLoading]  = useState(true);
  const [currentPage,  setCurrentPage]  = useState("Updates Feed");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [systemBanner, setSystemBanner] = useState(null);
  const [systemFrozen, setSystemFrozen] = useState(false);
  const [notifCount,   setNotifCount]   = useState(0);
  const [appReady,     setAppReady]     = useState(false);

  /* ── Auth Init ── */
  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      /* Check cached user */
      const cached = localStorage.getItem("nx_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(parsed);
        applyUserTheme(parsed);
      }

      /* Verify session */
      const { data: { session } } =
        await sb.auth.getSession();

      if (!session) {
        setUser(null);
        localStorage.removeItem("nx_user");
        setAuthLoading(false);
        return;
      }

      /* Load fresh employee data */
      await loadUserProfile(session.user.id);

    } catch(e) {
      console.error("Auth init error:", e);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }

    /* Auth state listener */
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("nx_user");
        setCurrentPage("Updates Feed");
      } else if (event === "SIGNED_IN" && session) {
        await loadUserProfile(session.user.id);
      }
    });
  }

  async function loadUserProfile(authId) {
    try {
      const { data: emp } = await withRetry(() =>
        sb.from("employees")
          .select("*")
          .eq("auth_id", authId)
          .single()
      );

      if (!emp) {
        showToast("Employee profile not found", "error");
        await sb.auth.signOut();
        return;
      }

      /* Check suspension */
      if (emp.is_suspended) {
        await sb.auth.signOut();
        showToast(
          `Account suspended: ${emp.suspend_reason || "Contact admin"}`,
          "error"
        );
        return;
      }

      /* Update online status */
      await withRetry(() =>
        sb.from("employees")
          .update({
            is_online: true,
            status:    emp.status === "offline"
              ? "online" : emp.status,
            last_seen: new Date().toISOString()
          })
          .eq("id", emp.id)
      );

      const userObj = {
        ...emp,
        is_online: true
      };

      localStorage.setItem("nx_user",
        JSON.stringify(userObj));
      setUser(userObj);
      applyUserTheme(userObj);

      /* Load system settings */
      await loadSystemSettings();

      /* Load notif count */
      loadNotifCount(emp.id);

      /* Start heartbeat */
      startHeartbeat(emp.id);

      /* App ready */
      setAppReady(true);

    } catch(e) {
      console.error("Profile load error:", e);
    }
  }

  function applyUserTheme(u) {
    const theme = ThemeMgr.get(u);
    document.documentElement
      .setAttribute("data-theme", theme);
  }

  async function loadSystemSettings() {
    try {
      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", [
            "system_frozen",
            "banner_active",
            "banner_text",
            "banner_type"
          ])
      );
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });

      setSystemFrozen(map.system_frozen === "true");

      if (map.banner_active === "true" && map.banner_text) {
        setSystemBanner({
          text: map.banner_text,
          type: map.banner_type || "info"
        });
      } else {
        setSystemBanner(null);
      }
    } catch(e) {}
  }

  async function loadNotifCount(userId) {
    try {
      const { count } = await withRetry(() =>
        sb.from("notifications")
          .select("id", { count:"exact", head:true })
          .eq("user_id", userId)
          .eq("is_read", false)
      );
      setNotifCount(count || 0);
    } catch(e) {}
  }

  /* Heartbeat — تحديث last_seen كل دقيقة */
  function startHeartbeat(userId) {
    const interval = setInterval(async () => {
      try {
        await sb.from("employees")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", userId);
      } catch(e) {}
    }, 60000);

    /* تنظيف عند إغلاق النافذة */
    window.addEventListener("beforeunload", async () => {
      clearInterval(interval);
      try {
        await sb.from("employees")
          .update({
            is_online: false,
            status:    "offline",
            last_seen: new Date().toISOString()
          })
          .eq("id", userId);
      } catch(e) {}
    });

    return interval;
  }

  /* Navigation */
  function navigate(page) {
    setCurrentPage(page);
    setSidebarOpen(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  /* User Update (from profile page) */
  function handleUserUpdate(updated) {
    setUser(updated);
    applyUserTheme(updated);
  }

  /* Logout */
  async function handleLogout() {
    try {
      if (user?.id) {
        await withRetry(() =>
          sb.from("employees")
            .update({
              is_online: false,
              status:    "offline",
              last_seen: new Date().toISOString()
            })
            .eq("id", user.id)
        );
        await logAudit("LOGOUT", "User logged out", user.id);
      }
      ChannelMgr.unsubAll();
      localStorage.removeItem("nx_user");
      await sb.auth.signOut();
      setUser(null);
      setCurrentPage("Updates Feed");
      showToast("Logged out successfully", "success");
    } catch(e) {
      showToast("Logout failed", "error");
    }
  }

  /* ── Loading Screen ── */
  if (authLoading) {
    return React.createElement("div", {
      style: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 16
      }
    },
      React.createElement("div", {
        style: { fontSize: 56, marginBottom: 8 }
      }, "⚡"),
      React.createElement("div", {
        style: {
          fontSize: 22,
          fontWeight: 900,
          color: "var(--primary)",
          letterSpacing: -0.5
        }
      }, "NEXUS"),
      React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 16
        }
      }, "CS Operations Platform"),
      React.createElement(Spinner, { size: "lg" })
    );
  }

  /* ── Login Screen ── */
  if (!user) {
    return React.createElement(LoginPage, {
      onLogin: loadUserProfile
    });
  }

  /* ── System Frozen (non-owner) ── */
  if (systemFrozen && !RC.isOwner(user)) {
    return React.createElement("div", {
      style: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 16,
        padding: 24
      }
    },
      React.createElement("div", {
        style: { fontSize: 64 }
      }, "🔒"),
      React.createElement("h1", {
        style: {
          fontSize: 24,
          fontWeight: 900,
          color: "var(--danger)"
        }
      }, "System Temporarily Frozen"),
      React.createElement("p", {
        style: {
          fontSize: 14,
          color: "var(--text-sub)",
          textAlign: "center",
          maxWidth: 400,
          lineHeight: 1.6
        }
      }, "The system is currently under maintenance. Please check back later or contact your administrator."),
      React.createElement("button", {
        className: "nx-btn nx-btn-secondary",
        onClick: handleLogout
      }, "← Sign Out")
    );
  }

  /* ── Main App ── */
  return React.createElement("div", {
    className: "nx-app",
    "data-sidebar": sidebarOpen ? "open" : "closed"
  },
    /* System Banner */
    systemBanner &&
    React.createElement(SystemBanner, {
      banner: systemBanner,
      onClose: () => setSystemBanner(null)
    }),

    /* Sidebar */
    React.createElement(Sidebar, {
      user,
      currentPage,
      onNavigate: navigate,
      onLogout: handleLogout,
      isOpen: sidebarOpen,
      onClose: () => setSidebarOpen(false),
      notifCount
    }),

    /* Overlay (mobile) */
    sidebarOpen &&
    React.createElement("div", {
      className: "nx-sidebar-overlay",
      onClick: () => setSidebarOpen(false)
    }),

    /* Main Content */
    React.createElement("div", {
      className: "nx-main"
    },
      /* Top Bar */
      React.createElement(TopBar, {
        user,
        currentPage,
        onMenuToggle: () => setSidebarOpen(p => !p),
        onNavigate: navigate,
        notifCount,
        onLogout: handleLogout
      }),

      /* Page Content */
      React.createElement("div", {
        className: "nx-content"
      },
        React.createElement(PageRouter, {
          page: currentPage,
          user,
          onNavigate: navigate,
          onUserUpdate: handleUserUpdate
        })
      )
    ),

    /* Toast Container */
    React.createElement(ToastContainer)
  );
}

/* ══════════════════════════════════════════════════════════
   SYSTEM BANNER
   ══════════════════════════════════════════════════════════ */
function SystemBanner({ banner, onClose }) {
  const colors = {
    info:    { bg:"rgba(59,130,246,0.12)",
               border:"rgba(59,130,246,0.25)",
               color:"#3B82F6" },
    warning: { bg:"rgba(234,179,8,0.12)",
               border:"rgba(234,179,8,0.25)",
               color:"#EAB308" },
    danger:  { bg:"rgba(239,68,68,0.12)",
               border:"rgba(239,68,68,0.25)",
               color:"#EF4444" },
  };
  const c = colors[banner.type] || colors.info;

  return React.createElement("div", {
    style: {
      background:   c.bg,
      border:       `1px solid ${c.border}`,
      borderRadius: 0,
      padding:      "10px 20px",
      display:      "flex",
      alignItems:   "center",
      justifyContent:"space-between",
      gap:          12,
      position:     "sticky",
      top:          0,
      zIndex:       9999
    }
  },
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: c.color,
        fontWeight: 600
      }
    },
      React.createElement("span", null,
        banner.type === "danger" ? "🚨" :
        banner.type === "warning" ? "⚠️" : "ℹ️"
      ),
      banner.text
    ),
    React.createElement("button", {
      onClick: onClose,
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: c.color,
        fontSize: 16,
        padding: 0,
        flexShrink: 0
      }
    }, "✕")
  );
}

/* ══════════════════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════════════════ */
function Sidebar({
  user, currentPage, onNavigate,
  onLogout, isOpen, onClose, notifCount
}) {
  const pages = getAccessiblePages(user);

  return React.createElement("aside", {
    className: `nx-sidebar ${isOpen ? "open" : ""}`,
  },
    /* Logo */
    React.createElement("div", {
      className: "nx-sidebar-logo"
    },
      React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      },
        React.createElement("div", {
          style: {
            width: 36, height: 36,
            borderRadius: 10,
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 900,
            color: "#000"
          }
        }, "⚡"),
        React.createElement("div", null,
          React.createElement("div", {
            style: {
              fontSize: 16,
              fontWeight: 900,
              color: "var(--primary)",
              letterSpacing: -0.5
            }
          }, "NEXUS"),
          React.createElement("div", {
            style: {
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: 1
            }
          }, "CS OPERATIONS")
        )
      ),
      /* Close button (mobile) */
      React.createElement("button", {
        className: "nx-btn nx-btn-ghost nx-btn-icon nx-sidebar-close",
        onClick: onClose
      }, "✕")
    ),

    /* User Card */
    React.createElement("div", {
      className: "nx-sidebar-user",
      onClick: () => onNavigate("My Profile"),
      style: { cursor: "pointer" }
    },
      React.createElement(NxAvatar, {
        user, size: "sm"
      }),
      React.createElement("div", {
        style: { flex: 1, minWidth: 0 }
      },
        React.createElement("div", {
          style: {
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, user.full_name),
        React.createElement("div", {
          style: {
            fontSize: 10,
            color: RC.color[user.role]
          }
        }, `${RC.icon[user.role]} ${user.role}`)
      ),
      React.createElement("span", {
        className: "nx-live-dot green",
        style: { flexShrink: 0 }
      })
    ),

    /* Navigation */
    React.createElement("nav", {
      className: "nx-sidebar-nav"
    },
      pages.map((item, i) => {
        if (item.divider) {
          return React.createElement("div", {
            key: `div-${i}`,
            className: "nx-nav-divider"
          }, item.label);
        }

        const isActive = currentPage === item.page;
        const badge = item.page === "Notifications"
          && notifCount > 0
          ? notifCount : null;

        return React.createElement("button", {
          key: item.page,
          className: `nx-nav-item ${isActive ? "active" : ""}`,
          onClick: () => onNavigate(item.page)
        },
          React.createElement("span", {
            className: "nx-nav-icon"
          }, item.icon),
          React.createElement("span", {
            className: "nx-nav-label"
          }, item.page),
          badge &&
          React.createElement("span", {
            className: "nx-nav-badge"
          }, badge > 99 ? "99+" : badge)
        );
      })
    ),

    /* Logout */
    React.createElement("div", {
      className: "nx-sidebar-footer"
    },
      React.createElement("button", {
        className: "nx-btn nx-btn-ghost nx-btn-full",
        onClick: onLogout,
        style: {
          justifyContent: "flex-start",
          gap: 10,
          color: "var(--text-muted)",
          fontSize: 13
        }
      },
        React.createElement("span", null, "🚪"),
        "Sign Out"
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   TOP BAR
   ══════════════════════════════════════════════════════════ */
function TopBar({
  user, currentPage, onMenuToggle,
  onNavigate, notifCount, onLogout
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return React.createElement("header", {
    className: "nx-topbar"
  },
    /* Left: Menu + Page Title */
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    },
      React.createElement("button", {
        className: "nx-btn nx-btn-ghost nx-btn-icon nx-menu-btn",
        onClick: onMenuToggle
      }, "☰"),
      React.createElement("div", null,
        React.createElement("h1", {
          className: "nx-topbar-title"
        }, currentPage),
        React.createElement("div", {
          style: {
            fontSize: 10,
            color: "var(--text-muted)"
          }
        },
          now.toLocaleDateString("en-GB", {
            weekday:"short",
            day:"2-digit",
            month:"short"
          }),
          " · ",
          now.toLocaleTimeString("en-GB", {
            hour:"2-digit",
            minute:"2-digit"
          }),
          " KSA"
        )
      )
    ),

    /* Right: Actions */
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    },
      /* Notifications Bell */
      React.createElement("button", {
        className: "nx-btn nx-btn-ghost nx-btn-icon",
        onClick: () => onNavigate("Notifications"),
        style: { position: "relative" }
      },
        "🔔",
        notifCount > 0 &&
        React.createElement("span", {
          style: {
            position: "absolute",
            top: 2, right: 2,
            width: 16, height: 16,
            borderRadius: "50%",
            background: "var(--danger)",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }
        }, notifCount > 9 ? "9+" : notifCount)
      ),

      /* Avatar */
      React.createElement("div", {
        style: { cursor: "pointer" },
        onClick: () => onNavigate("My Profile")
      },
        React.createElement(NxAvatar, {
          user, size: "xs"
        })
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE ROUTER
   ══════════════════════════════════════════════════════════ */
function PageRouter({ page, user, onNavigate, onUserUpdate }) {
  /* Check access */
  const accessible = getAccessiblePages(user)
    .filter(p => !p.divider)
    .map(p => p.page);

  if (!accessible.includes(page)) {
    return React.createElement(EmptyState, {
      icon: "🔒",
      title: "Access Denied",
      desc: "You don't have permission to view this page"
    });
  }

  const props = { user, onNavigate };

  switch(page) {
    case "Updates Feed":
      return React.createElement(UpdatesFeedPage, props);
    case "Schedule":
      return React.createElement(SchedulePage, props);
    case "Attendance":
      return React.createElement(AttendancePage, props);
    case "Live Floor":
      return React.createElement(LiveFloorPage, props);
    case "Break Management":
      return React.createElement(BreakManagementPage, props);
    case "My Break Schedule":
      return React.createElement(MyBreakSchedulePage, props);
    case "My Requests":
      return React.createElement(MyRequestsPage, props);
    case "Shift Handover":
      return React.createElement(ShiftHandoverPage, props);
    case "Performance":
      return React.createElement(PerformancePage, props);
    case "Queue":
      return React.createElement(QueuePage, props);
    case "Gamification":
      return React.createElement(GamificationPage, props);
    case "Surveys":
      return React.createElement(SurveysPage, props);
    case "Case Handover":
      return React.createElement(CaseHandoverPage, props);
    case "TT Tracker":
      return React.createElement(TTTrackerPage, props);
    case "Chat":
      return React.createElement(ChatPage, props);
    case "Notifications":
      return React.createElement(NotificationsPage, props);
    case "My Profile":
      return React.createElement(MyProfilePage, {
        ...props, onUserUpdate
      });
    case "My Workspace":
      return React.createElement(MyWorkspacePage, props);
    case "Audit Log":
      return React.createElement(AuditLogPage, props);
    case "Announcements":
      return React.createElement(AnnouncementsPage, props);
    case "Reports & Notes":
      return React.createElement(ReportsNotesPage, props);
    case "Owner Analytics":
      return React.createElement(OwnerAnalytics, props);
    default:
      return React.createElement(EmptyState, {
        icon: "🔍",
        title: "Page not found",
        desc: `"${page}" doesn't exist`
      });
  }
}

/* ══════════════════════════════════════════════════════════
   GET ACCESSIBLE PAGES
   ══════════════════════════════════════════════════════════ */
function getAccessiblePages(user) {
  const all = [
    /* Core */
    { divider:true, label:"CORE" },
    { page:"Updates Feed",    icon:"📰" },
    { page:"Announcements",   icon:"📢" },
    { page:"Schedule",        icon:"📅" },
    { page:"Attendance",      icon:"✅" },
    { page:"Live Floor",      icon:"🖥️"  },

    /* Operations */
    { divider:true, label:"OPERATIONS" },
    { page:"My Break Schedule", icon:"☕" },
    { page:"My Requests",       icon:"📤" },
    { page:"Shift Handover",    icon:"🔄" },
    { page:"Case Handover",     icon:"🗂️" },
    { page:"TT Tracker",        icon:"🎫" },

    /* Performance */
    { divider:true, label:"PERFORMANCE" },
    { page:"Performance",   icon:"📊" },
    { page:"Queue",         icon:"🎧" },
    { page:"Gamification",  icon:"🎮" },
    { page:"Surveys",       icon:"📋" },

    /* Communication */
    { divider:true, label:"COMMUNICATION" },
    { page:"Chat",          icon:"💬" },
    { page:"Notifications", icon:"🔔" },
    { page:"Reports & Notes",icon:"📄" },

    /* Personal */
    { divider:true, label:"PERSONAL" },
    { page:"My Profile",    icon:"👤" },
    { page:"My Workspace",  icon:"🗂️" },
  ];

  /* Manager-only pages */
  if (RC.isMgr(user)) {
    all.push(
      { divider:true, label:"MANAGEMENT" },
      { page:"Break Management", icon:"☕" },
      { page:"Audit Log",        icon:"📜" }
    );
  }

  /* Owner-only pages */
  if (RC.isOwner(user)) {
    all.push(
      { page:"Owner Analytics", icon:"👑" }
    );
  }

  /* Filter by page access */
  return all.filter(item => {
    if (item.divider) return true;
    return RC.canAccess(user, item.page);
  });
}

/* ══════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const theme = ThemeMgr.get();

  async function handleLogin(e) {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: authErr } =
        await sb.auth.signInWithPassword({
          email:    email.trim().toLowerCase(),
          password: password.trim()
        });

      if (authErr) {
        setError(
          authErr.message === "Invalid login credentials"
            ? "Incorrect email or password"
            : authErr.message
        );
        return;
      }

      await onLogin(data.user.id);
      await logAudit("LOGIN",
        "User logged in", data.user.id);

    } catch(e) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* Get login background */
  const loginBg = ThemeImageMgr.getSync(theme, "Login");

  return React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: loginBg
        ? `url(${loginBg}) center/cover no-repeat`
        : "var(--bg)",
      padding: 20,
      position: "relative"
    }
  },
    /* Overlay */
    loginBg &&
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)"
      }
    }),

    /* Login Card */
    React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 400,
        position: "relative",
        zIndex: 1
      }
    },
      React.createElement("div", {
        className: "nx-card",
        style: {
          padding: "40px 32px",
          backdropFilter: loginBg
            ? "blur(20px)" : "none",
          background: loginBg
            ? "rgba(var(--card-rgb), 0.85)"
            : "var(--card)"
        }
      },
        /* Logo */
        React.createElement("div", {
          style: {
            textAlign: "center",
            marginBottom: 32
          }
        },
          React.createElement("div", {
            style: {
              fontSize: 52,
              marginBottom: 12
            }
          }, "⚡"),
          React.createElement("h1", {
            style: {
              fontSize: 28,
              fontWeight: 900,
              color: "var(--primary)",
              letterSpacing: -1,
              marginBottom: 4
            }
          }, "NEXUS"),
          React.createElement("p", {
            style: {
              fontSize: 12,
              color: "var(--text-muted)",
              letterSpacing: 2
            }
          }, "CS OPERATIONS PLATFORM")
        ),

        /* Form */
        React.createElement("form", {
          onSubmit: handleLogin,
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 16
          }
        },
          /* Email */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label"
            }, "Email"),
            React.createElement("input", {
              type: "email",
              className: "nx-input",
              placeholder: "your@email.com",
              value: email,
              onChange: e => setEmail(e.target.value),
              autoComplete: "email",
              autoFocus: true
            })
          ),

          /* Password */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label"
            }, "Password"),
            React.createElement("div", {
              style: { position: "relative" }
            },
              React.createElement("input", {
                type: showPass ? "text" : "password",
                className: "nx-input",
                placeholder: "••••••••",
                value: password,
                onChange: e => setPassword(e.target.value),
                autoComplete: "current-password",
                style: { paddingRight: 44 }
              }),
              React.createElement("button", {
                type: "button",
                onClick: () => setShowPass(p => !p),
                style: {
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 16,
                  padding: 0
                }
              }, showPass ? "🙈" : "👁️")
            )
          ),

          /* Error */
          error &&
          React.createElement("div", {
            className: "nx-alert nx-alert-danger"
          },
            React.createElement("span", {
              className: "nx-alert-icon"
            }, "⚠️"),
            error
          ),

          /* Submit */
          React.createElement("button", {
            type: "submit",
            className: "nx-btn nx-btn-primary nx-btn-full nx-btn-lg",
            disabled: loading
          },
            loading
              ? React.createElement("span", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "center"
                  }
                },
                  React.createElement(Spinner),
                  "Signing in..."
                )
              : "Sign In →"
          )
        ),

        /* Footer */
        React.createElement("p", {
          style: {
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 24
          }
        }, "NEXUS v4.2.0 · Secure Login")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   MOUNT APP
   ══════════════════════════════════════════════════════════ */
const root = ReactDOM.createRoot(
  document.getElementById("root")
);
root.render(React.createElement(App));

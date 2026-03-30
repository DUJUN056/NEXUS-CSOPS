/* ============================================================
   NEXUS-CSOPS v4.2.0
   components.js — SEC 3 + SEC 4
   6 Systems + Header + Sidebar + BottomNav + Shared UI
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

const { useState, useEffect, useRef,
        useCallback, useMemo } = React;

/* ══════════════════════════════════════════════════════════
   SYSTEM 1 — TOAST SYSTEM
   ══════════════════════════════════════════════════════════ */
let _toastSetFn = null;

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _toastSetFn = setToasts;

  const remove = useCallback((id) => {
    setToasts(p => p.map(t =>
      t.id === id ? { ...t, removing: true } : t
    ));
    setTimeout(() =>
      setToasts(p => p.filter(t => t.id !== id)), 300
    );
  }, []);

  return React.createElement("div",
    { className: "nx-toast-container" },
    toasts.map(t =>
      React.createElement("div", {
        key: t.id,
        className: `nx-toast ${t.type} ${t.removing ? "removing" : ""}`,
      },
        React.createElement("span", { className: "nx-toast-icon" },
          t.type === "success" ? "✅" :
          t.type === "error"   ? "❌" :
          t.type === "warning" ? "⚠️" : "ℹ️"
        ),
        React.createElement("div", { className: "nx-toast-body" },
          t.title && React.createElement("div",
            { className: "nx-toast-title" }, t.title),
          React.createElement("div",
            { className: "nx-toast-msg" }, t.message)
        ),
        React.createElement("button", {
          className: "nx-toast-close",
          onClick: () => remove(t.id)
        }, "✕"),
        React.createElement("div", {
          className: "nx-toast-bar nx-toast-progress"
        })
      )
    )
  );
}

function showToast(message, type = "info", title = "", duration = 5000) {
  if (!_toastSetFn) return;
  const id = Date.now() + Math.random();
  _toastSetFn(p => [...p.slice(-4), { id, message, type, title }]);
  setTimeout(() => {
    if (!_toastSetFn) return;
    _toastSetFn(p => p.map(t =>
      t.id === id ? { ...t, removing: true } : t
    ));
    setTimeout(() =>
      _toastSetFn(p => p.filter(t => t.id !== id)), 300
    );
  }, duration);
}

/* ══════════════════════════════════════════════════════════
   SYSTEM 2 — NOTIFICATION BELL
   ══════════════════════════════════════════════════════════ */
function NotificationBell({ user, onNavigate }) {
  const [count, setCount]   = useState(0);
  const [ringing, setRing]  = useState(false);
  const prevCount           = useRef(0);

  useEffect(() => {
    if (!user?.id) return;

    /* جلب العدد الأولي */
    withRetry(() =>
      sb.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
    ).then(({ count: c }) => {
      setCount(c || 0);
      prevCount.current = c || 0;
    }).catch(() => {});

    /* Realtime */
    ChannelMgr.sub(
      `notif_bell_${user.id}`,
      "notifications",
      `user_id=eq.${user.id}`,
      () => {
        withRetry(() =>
          sb.from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
        ).then(({ count: c }) => {
          const newCount = c || 0;
          if (newCount > prevCount.current) {
            setRing(true);
            setTimeout(() => setRing(false), 1000);
          }
          prevCount.current = newCount;
          setCount(newCount);
        }).catch(() => {});
      }
    );

    return () => ChannelMgr.unsub(`notif_bell_${user.id}`);
  }, [user?.id]);

  return React.createElement("button", {
    className: "nx-header-btn",
    onClick: () => onNavigate("Notifications"),
    title: "Notifications",
    style: { position: "relative" }
  },
    React.createElement("span", {
      className: ringing ? "nx-bell-ring" : ""
    }, "🔔"),
    count > 0 && React.createElement("span", {
      className: "nx-notif-badge nx-badge-pop"
    }, count > 99 ? "99+" : count)
  );
}

/* ══════════════════════════════════════════════════════════
   SYSTEM 3 — SUSPEND WATCH
   طرد فوري عند تعليق الحساب
   ══════════════════════════════════════════════════════════ */
function SuspendWatch({ user, onSuspend }) {
  useEffect(() => {
    if (!user?.id) return;

    ChannelMgr.sub(
      `suspend_${user.id}`,
      "employees",
      `id=eq.${user.id}`,
      async (payload) => {
        const rec = payload.new;
        if (rec?.is_suspended) {
          /* تنظيف كامل */
          ChannelMgr.unsubAll();
          localStorage.removeItem("nx_user");
          await sb.auth.signOut().catch(() => {});
          onSuspend(rec.suspend_reason || "Your account has been suspended.");
        }
      }
    );

    return () => ChannelMgr.unsub(`suspend_${user.id}`);
  }, [user?.id]);

  return null;
}

/* ══════════════════════════════════════════════════════════
   SYSTEM 4 — FREEZE MODE
   تجميد النظام من المالك
   ══════════════════════════════════════════════════════════ */
function FreezeWatch({ user, onFreeze, onUnfreeze }) {
  useEffect(() => {
    /* جلب الحالة الأولية */
    withRetry(() =>
      sb.from("system_settings")
        .select("value")
        .eq("key", "system_frozen")
        .single()
    ).then(({ data }) => {
      if (data?.value === "true" && !RC.isOwner(user)) {
        onFreeze("System is temporarily frozen by admin.");
      }
    }).catch(() => {});

    /* Realtime */
    ChannelMgr.sub(
      "freeze_watch",
      "system_settings",
      "key=eq.system_frozen",
      (payload) => {
        const frozen = payload.new?.value === "true";
        if (frozen && !RC.isOwner(user)) {
          onFreeze("System is temporarily frozen by admin.");
        } else {
          onUnfreeze();
        }
      }
    );

    return () => ChannelMgr.unsub("freeze_watch");
  }, [user?.id]);

  return null;
}

/* Freeze Overlay UI */
function FreezeOverlay({ message }) {
  return React.createElement("div", {
    className: "nx-freeze-overlay"
  },
    React.createElement("div", { className: "nx-freeze-card" },
      React.createElement("div", {
        className: "nx-freeze-icon"
      }, "🔒"),
      React.createElement("h2", {
        style: {
          color: "var(--text)",
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 8
        }
      }, "System Frozen"),
      React.createElement("p", {
        style: {
          color: "var(--text-sub)",
          fontSize: 14,
          lineHeight: 1.6
        }
      }, message || "The system is temporarily unavailable."),
      React.createElement("p", {
        style: {
          color: "var(--text-muted)",
          fontSize: 12,
          marginTop: 16
        }
      }, "Please wait for the administrator to resume.")
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SYSTEM 5 — CRITICAL ALERTS
   تنبيهات حرجة لا تُغلق إلا من المسؤول
   ══════════════════════════════════════════════════════════ */
function CriticalAlertWatch({ user, onAlert, onClear }) {
  useEffect(() => {
    if (!user?.id) return;

    ChannelMgr.sub(
      `critical_${user.id}`,
      "critical_alerts",
      `target_id=eq.${user.id}`,
      (payload) => {
        if (payload.eventType === "INSERT") {
          onAlert(payload.new);
        }
        if (payload.eventType === "DELETE") {
          onClear(payload.old?.id);
        }
      }
    );

    return () => ChannelMgr.unsub(`critical_${user.id}`);
  }, [user?.id]);

  return null;
}

/* Critical Alert Overlay UI */
function CriticalAlertOverlay({ alert, user, onAcknowledge }) {
  if (!alert) return null;

  const canClose = RC.isMgr(user) || alert.created_by === user?.id;

  return React.createElement("div", {
    className: "nx-critical-overlay"
  },
    React.createElement("div", { className: "nx-critical-card" },
      React.createElement("div", {
        style: { fontSize: 48, marginBottom: 12 }
      }, "🚨"),
      React.createElement("h2", {
        style: {
          color: "#F85149",
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 8,
          animation: "criticalBlink 0.8s ease-in-out infinite"
        }
      }, "CRITICAL ALERT"),
      React.createElement("p", {
        style: {
          color: "#FFF",
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 8
        }
      }, alert.title),
      React.createElement("p", {
        style: {
          color: "#FFAAAA",
          fontSize: 13,
          lineHeight: 1.6,
          marginBottom: 20
        }
      }, alert.message),
      canClose && React.createElement("button", {
        className: "nx-btn nx-btn-danger nx-btn-full",
        onClick: () => onAcknowledge(alert.id)
      }, "✓ Acknowledge & Close")
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SYSTEM 6 — BEACON PULSE
   نبضة التواجد + إغلاق المتصفح
   ══════════════════════════════════════════════════════════ */
function BeaconPulse({ user }) {
  const intervalRef = useRef(null);
  const isVisible   = useRef(true);

  const sendHeartbeat = useCallback(async () => {
    if (!user?.id) return;
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            last_seen: new Date().toISOString(),
            is_online: true
          })
          .eq("id", user.id)
      );
    } catch(e) {}
  }, [user?.id]);

  const goOffline = useCallback(async () => {
    if (!user?.id) return;
    try {
      /* Beacon API للإرسال عند إغلاق المتصفح */
      const url = `${SURL}/rest/v1/employees?id=eq.${user.id}`;
      const body = JSON.stringify({
        is_online: false,
        status: "offline",
        last_seen: new Date().toISOString()
      });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        await sb.from("employees")
          .update({ is_online: false, status: "offline" })
          .eq("id", user.id);
      }
    } catch(e) {}
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    /* نبضة كل 60 ثانية */
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, 60000);

    /* تقليل التردد عند الخلفية */
    const handleVisibility = () => {
      isVisible.current = document.visibilityState === "visible";
      if (isVisible.current) {
        sendHeartbeat();
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(sendHeartbeat, 60000);
      } else {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(sendHeartbeat, 180000);
      }
    };

    /* إغلاق المتصفح */
    const handleUnload = () => goOffline();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      goOffline();
    };
  }, [user?.id]);

  return null;
}

/* ══════════════════════════════════════════════════════════
   SUSPEND OVERLAY UI
   ══════════════════════════════════════════════════════════ */
function SuspendOverlay({ reason }) {
  return React.createElement("div", {
    className: "nx-freeze-overlay",
    style: { background: "rgba(20,5,5,0.95)" }
  },
    React.createElement("div", {
      className: "nx-freeze-card",
      style: { borderColor: "var(--danger)" }
    },
      React.createElement("div", {
        className: "nx-freeze-icon"
      }, "🚫"),
      React.createElement("h2", {
        style: {
          color: "var(--danger)",
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 8
        }
      }, "Account Suspended"),
      React.createElement("p", {
        style: {
          color: "var(--text-sub)",
          fontSize: 14,
          lineHeight: 1.6
        }
      }, reason || "Your account has been suspended."),
      React.createElement("p", {
        style: {
          color: "var(--text-muted)",
          fontSize: 12,
          marginTop: 16
        }
      }, "Please contact your administrator.")
    )
  );
}

/* ══════════════════════════════════════════════════════════
   HEADER COMPONENT
   ══════════════════════════════════════════════════════════ */
function Header({ user, page, onNavigate, onMenuToggle }) {
  const theme = ThemeMgr.get();

  return React.createElement("header", {
    className: "nx-header"
  },
    /* Left */
    React.createElement("div", { className: "nx-header-left" },
      /* Menu Toggle (Mobile) */
      React.createElement("button", {
        className: "nx-header-btn nx-hide-desktop",
        onClick: onMenuToggle,
        title: "Menu"
      }, "☰"),

      /* Logo + Name */
      React.createElement("span", {
        className: "nx-logo"
      }, theme === "pirateking" ? "🏴‍☠️" : "⚡"),

      React.createElement("span", {
        className: "nx-app-name"
      }, APP),

      React.createElement("span", {
        className: "nx-app-version nx-hide-mobile"
      }, `v${VER}`)
    ),

    /* Right */
    React.createElement("div", { className: "nx-header-right" },

      /* Pirate King Badge */
      theme === "pirateking" && RC.isOwner(user) &&
      React.createElement("span", {
        className: "nx-badge nx-badge-warning nx-hide-mobile",
        style: { fontSize: 11 }
      }, "⚓ JUSTICE"),

      /* Live Indicator */
      React.createElement("div", {
        className: "nx-flex nx-items-center nx-gap-1",
        style: { fontSize: 11, color: "var(--success)" }
      },
        React.createElement("span", { className: "nx-live-dot green" }),
        React.createElement("span", {
          className: "nx-hide-mobile",
          style: { fontWeight: 600 }
        }, "LIVE")
      ),

      /* Notification Bell */
      React.createElement(NotificationBell, {
        user, onNavigate
      }),

      /* Theme Toggle */
      React.createElement("button", {
        className: "nx-header-btn nx-hide-mobile",
        onClick: () => onNavigate("My Profile"),
        title: "Theme Settings"
      }, "🎨"),

      /* Avatar */
      React.createElement("div", {
        style: { position: "relative", cursor: "pointer" },
        onClick: () => onNavigate("My Profile"),
        title: user?.full_name || "Profile"
      },
        user?.avatar_url
          ? React.createElement("img", {
              src: user.avatar_url,
              alt: user.full_name,
              className: "nx-header-avatar"
            })
          : React.createElement("div", {
              className: "nx-header-avatar nx-avatar nx-avatar-sm",
              style: {
                background: AvatarMgr.colorFromName(user?.full_name),
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            }, AvatarMgr.initials(user?.full_name)),

        /* Online dot */
        React.createElement("span", {
          style: {
            position: "absolute",
            bottom: 0, right: 0,
            width: 9, height: 9,
            background: "#22C55E",
            borderRadius: "50%",
            border: "2px solid var(--bg)"
          }
        })
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SIDEBAR COMPONENT
   ══════════════════════════════════════════════════════════ */
function Sidebar({ user, page, onNavigate, isOpen, onClose }) {
  const availablePages = useMemo(() => {
    if (!user) return [];
    return Object.entries(PA)
      .filter(([, roles]) => roles.includes(user.role))
      .map(([p]) => p);
  }, [user?.role]);

  const sidebarStyle = {
    position: window.innerWidth <= 768 ? "fixed" : "relative",
    top: window.innerWidth <= 768 ? 0 : "auto",
    left: window.innerWidth <= 768 ? 0 : "auto",
    bottom: window.innerWidth <= 768 ? 0 : "auto",
    zIndex: window.innerWidth <= 768 ? 200 : "auto",
    transform: window.innerWidth <= 768
      ? (isOpen ? "translateX(0)" : "translateX(-100%)")
      : "none",
    transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
    display: "flex"
  };

  return React.createElement(React.Fragment, null,
    /* Backdrop (Mobile) */
    isOpen && window.innerWidth <= 768 &&
    React.createElement("div", {
      style: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 199,
        backdropFilter: "blur(2px)"
      },
      onClick: onClose
    }),

    /* Sidebar */
    React.createElement("nav", {
      className: "nx-sidebar",
      style: sidebarStyle
    },
      /* Nav Groups */
      NAVG.map(group => {
        const pages = group.pages.filter(p =>
          availablePages.includes(p)
        );
        if (pages.length === 0) return null;

        return React.createElement("div", {
          key: group.label,
          className: "nx-sidebar-section"
        },
          React.createElement("div", {
            className: "nx-sidebar-section-label"
          }, group.label),

          pages.map(p =>
            React.createElement("div", {
              key: p,
              className: `nx-nav-item ${page === p ? "active" : ""}`,
              onClick: () => {
                onNavigate(p);
                if (window.innerWidth <= 768) onClose();
              }
            },
              React.createElement("span", {
                className: "nx-nav-icon"
              }, PI[p] || "📄"),
              React.createElement("span", {
                className: "nx-nav-label"
              }, p)
            )
          )
        );
      }),

      /* User Info Bottom */
      React.createElement("div", {
        className: "nx-sidebar-user",
        onClick: () => {
          onNavigate("My Profile");
          if (window.innerWidth <= 768) onClose();
        }
      },
        user?.avatar_url
          ? React.createElement("img", {
              src: user.avatar_url,
              alt: user.full_name,
              className: "nx-sidebar-avatar"
            })
          : React.createElement("div", {
              className: "nx-sidebar-avatar nx-avatar nx-avatar-sm",
              style: {
                background: AvatarMgr.colorFromName(user?.full_name),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff"
              }
            }, AvatarMgr.initials(user?.full_name)),

        React.createElement("div", {
          className: "nx-sidebar-user-info"
        },
          React.createElement("div", {
            className: "nx-sidebar-user-name"
          }, user?.full_name || "User"),
          React.createElement("div", {
            className: "nx-sidebar-user-role",
            style: { color: RC.color[user?.role] || "var(--text-muted)" }
          },
            `${RC.icon[user?.role] || ""} ${user?.role || ""}`)
        )
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BOTTOM NAV (Mobile)
   ══════════════════════════════════════════════════════════ */
function BottomNav({ user, page, onNavigate }) {
  /* أهم 5 صفحات للموبايل */
  const mobilePages = useMemo(() => {
    const all = [
      "Updates Feed",
      "Live Floor",
      "My Break Schedule",
      "Chat",
      "My Profile"
    ];
    return all.filter(p =>
      PA[p]?.includes(user?.role)
    );
  }, [user?.role]);

  return React.createElement("div", {
    className: "nx-bottom-nav"
  },
    React.createElement("div", {
      className: "nx-bottom-nav-items"
    },
      mobilePages.map(p =>
        React.createElement("button", {
          key: p,
          className: `nx-bottom-nav-item ${page === p ? "active" : ""}`,
          onClick: () => onNavigate(p)
        },
          React.createElement("span", {
            className: "nx-nav-icon"
          }, PI[p] || "📄"),
          React.createElement("span", {}, p.split(" ")[0])
        )
      ),

      /* More Button */
      React.createElement("button", {
        className: "nx-bottom-nav-item",
        onClick: () => onNavigate("__menu__")
      },
        React.createElement("span", {
          className: "nx-nav-icon"
        }, "☰"),
        React.createElement("span", {}, "More")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ══════════════════════════════════════════════════════════ */

/* Avatar Component */
function NxAvatar({ user, size = "md", onClick }) {
  const sizeClass = `nx-avatar-${size}`;
  const style = {
    background: AvatarMgr.colorFromName(user?.full_name),
    color: "#fff",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: onClick ? "pointer" : "default"
  };

  if (user?.avatar_url) {
    return React.createElement("img", {
      src: user.avatar_url,
      alt: user?.full_name || "User",
      className: `nx-avatar ${sizeClass}`,
      onClick,
      style: { cursor: onClick ? "pointer" : "default" }
    });
  }

  return React.createElement("div", {
    className: `nx-avatar ${sizeClass}`,
    style,
    onClick
  }, AvatarMgr.initials(user?.full_name));
}

/* Status Dot */
function StatusDot({ status, size = 10 }) {
  const s = STATUS_MAP[status] || STATUS_MAP.unknown;
  return React.createElement("span", {
    className: `status-dot ${s.css}`,
    style: {
      background: s.color,
      width: size,
      height: size,
      flexShrink: 0
    },
    title: s.label
  });
}

/* Status Badge */
function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.unknown;
  return React.createElement("span", {
    className: "nx-badge",
    style: {
      background: `${s.color}22`,
      color: s.color,
      border: `1px solid ${s.color}44`,
      fontSize: 11
    }
  },
    React.createElement(StatusDot, { status, size: 7 }),
    s.label
  );
}

/* Role Badge */
function RoleBadge({ role }) {
  const cls = RC.cssClass[role] || "agent";
  return React.createElement("span", {
    className: `role-badge ${cls}`
  },
    RC.icon[role] || "👤",
    " ",
    role
  );
}

/* Spinner */
function Spinner({ size = "md" }) {
  return React.createElement("div", {
    className: `nx-spinner ${size === "lg" ? "nx-spinner-lg" : ""}`,
    style: { margin: "0 auto" }
  });
}

/* Loading Page */
function LoadingPage({ message = "Loading..." }) {
  return React.createElement("div", {
    className: "nx-empty"
  },
    React.createElement(Spinner, { size: "lg" }),
    React.createElement("p", {
      style: { color: "var(--text-sub)", fontSize: 14 }
    }, message)
  );
}

/* Empty State */
function EmptyState({ icon = "📭", title, desc, action }) {
  return React.createElement("div", { className: "nx-empty" },
    React.createElement("div", {
      className: "nx-empty-icon"
    }, icon),
    React.createElement("div", {
      className: "nx-empty-title"
    }, title),
    desc && React.createElement("div", {
      className: "nx-empty-desc"
    }, desc),
    action && React.createElement("div", {
      style: { marginTop: 16 }
    }, action)
  );
}

/* Confirm Modal */
function ConfirmModal({ open, title, message, onConfirm,
                        onCancel, danger = false }) {
  if (!open) return null;
  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onCancel
  },
    React.createElement("div", {
      className: "nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className: "nx-modal-header" },
        React.createElement("span", {
          className: "nx-modal-title"
        }, title || "Confirm"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onCancel
        }, "✕")
      ),
      React.createElement("div", { className: "nx-modal-body" },
        React.createElement("p", {
          style: {
            color: "var(--text-sub)",
            fontSize: 14,
            lineHeight: 1.6
          }
        }, message)
      ),
      React.createElement("div", { className: "nx-modal-footer" },
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onCancel
        }, "Cancel"),
        React.createElement("button", {
          className: `nx-btn ${danger
            ? "nx-btn-danger" : "nx-btn-primary"}`,
          onClick: onConfirm
        }, "Confirm")
      )
    )
  );
}

/* Page Header */
function PageHeader({ title, subtitle, icon, actions }) {
  return React.createElement("div", { className: "nx-page-header" },
    React.createElement("div", null,
      React.createElement("h1", { className: "nx-page-title" },
        icon && React.createElement("span", {
          style: { marginRight: 8 }
        }, icon),
        title
      ),
      subtitle && React.createElement("p", {
        className: "nx-page-subtitle"
      }, subtitle)
    ),
    actions && React.createElement("div", {
      className: "nx-page-actions"
    }, actions)
  );
}

/* Section Header */
function SectionHeader({ title, action }) {
  return React.createElement("div", { className: "nx-section-header" },
    React.createElement("h3", { className: "nx-section-title" }, title),
    action
  );
}

/* Tabs Component */
function Tabs({ tabs, active, onChange }) {
  return React.createElement("div", { className: "nx-tabs" },
    tabs.map(tab =>
      React.createElement("button", {
        key: tab.id || tab,
        className: `nx-tab ${active === (tab.id || tab) ? "active" : ""}`,
        onClick: () => onChange(tab.id || tab)
      },
        tab.icon && `${tab.icon} `,
        tab.label || tab
      )
    )
  );
}

/* Search Input */
function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return React.createElement("div", { className: "nx-search-wrap" },
    React.createElement("span", { className: "nx-search-icon" }, "🔍"),
    React.createElement("input", {
      type: "text",
      className: "nx-input nx-search-input",
      placeholder,
      value,
      onChange: e => onChange(e.target.value)
    })
  );
}

/* Priority Badge */
function PriorityBadge({ priority }) {
  const map = {
    low:      { label: "Low",      color: "#10B981" },
    medium:   { label: "Medium",   color: "#F59E0B" },
    high:     { label: "High",     color: "#EF4444" },
    critical: { label: "Critical", color: "#FF0000",
                anim: "criticalBlink 0.8s ease-in-out infinite" }
  };
  const p = map[priority] || map.low;
  return React.createElement("span", {
    className: "nx-badge",
    style: {
      background: `${p.color}22`,
      color: p.color,
      border: `1px solid ${p.color}44`,
      animation: p.anim || "none"
    }
  }, p.label);
}

/* Timer Display */
function TimerDisplay({ seconds, exceeded = false }) {
  const cls = exceeded
    ? "nx-timer-exceeded"
    : seconds < 120
    ? "nx-timer-danger"
    : seconds < 300
    ? "nx-timer-warning"
    : "nx-timer-normal";

  return React.createElement("span", { className: cls },
    fmtDuration(Math.abs(seconds))
  );
}

/* File Upload Button */
function FileUploadBtn({ onFile, accept = "image/*",
                         label = "Upload", capture }) {
  const ref = useRef();
  return React.createElement(React.Fragment, null,
    React.createElement("input", {
      ref,
      type: "file",
      accept,
      capture,
      style: { display: "none" },
      onChange: e => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }
    }),
    React.createElement("button", {
      className: "nx-btn nx-btn-secondary nx-btn-sm",
      onClick: () => ref.current?.click()
    }, `📁 ${label}`)
  );
}

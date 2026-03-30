/* ============================================================
   NEXUS-CSOPS v4.2.0
   screens1.js — Part A
   SEC 5: LoginPage + SEC 6: UpdatesFeed
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 5 — LOGIN PAGE
   ══════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const theme = ThemeMgr.get();

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      /* Step 1: Supabase Auth */
      const { data: authData, error: authErr } =
        await sb.auth.signInWithPassword({ email, password });

      if (authErr) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      /* Step 2: جلب بيانات الموظف */
      const { data: emp, error: empErr } = await withRetry(() =>
        sb.from("employees")
          .select("*")
          .eq("auth_id", authData.user.id)
          .single()
      );

      if (empErr || !emp) {
        setError("Employee record not found.");
        await sb.auth.signOut();
        setLoading(false);
        return;
      }

      /* Step 3: التحقق من الحظر */
      if (emp.is_suspended) {
        setError(`Account suspended: ${emp.suspend_reason || "Contact admin."}`);
        await sb.auth.signOut();
        setLoading(false);
        return;
      }

      /* Step 4: تطبيق الثيم */
      ThemeMgr.apply(emp);

      /* Step 5: حفظ في localStorage */
      localStorage.setItem("nx_user", JSON.stringify(emp));

      /* Step 6: تسجيل في Audit */
      await logAudit("LOGIN", `${emp.full_name} logged in`, emp.id);

      onLogin(emp);

    } catch (err) {
      setError("Connection error. Please try again.");
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
      padding: "20px",
      background: "var(--bg)"
    }
  },
    React.createElement("div", {
      style: {
        width: "100%",
        maxWidth: 400,
        animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both"
      }
    },
      /* Logo Block */
      React.createElement("div", {
        style: {
          textAlign: "center",
          marginBottom: 32
        }
      },
        React.createElement("div", {
          style: { fontSize: 56, marginBottom: 12 }
        }, theme === "pirateking" ? "🏴‍☠️" : "⚡"),
        React.createElement("h1", {
          style: {
            fontSize: 28,
            fontWeight: 900,
            color: "var(--text)",
            letterSpacing: -1,
            marginBottom: 4
          }
        }, APP),
        React.createElement("p", {
          style: {
            fontSize: 13,
            color: "var(--text-muted)",
            fontWeight: 500
          }
        }, `v${VER} — Customer Operations Platform`)
      ),

      /* Card */
      React.createElement("div", {
        className: "nx-card nx-card-lg"
      },
        React.createElement("h2", {
          style: {
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 20,
            textAlign: "center"
          }
        }, "Sign In"),

        /* Form */
        React.createElement("form", {
          onSubmit: handleLogin,
          style: { display: "flex", flexDirection: "column", gap: 16 }
        },

          /* Email */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label nx-label-required"
            }, "Email"),
            React.createElement("input", {
              type: "email",
              className: "nx-input",
              placeholder: "your@email.com",
              value: email,
              onChange: e => setEmail(e.target.value),
              autoComplete: "email",
              disabled: loading
            })
          ),

          /* Password */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label nx-label-required"
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
                disabled: loading,
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
          error && React.createElement("div", {
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
                  style: { display: "flex", alignItems: "center",
                           gap: 8, justifyContent: "center" }
                },
                  React.createElement(Spinner),
                  "Signing in..."
                )
              : "Sign In →"
          )
        ),

        /* Divider */
        React.createElement("div", {
          className: "nx-divider",
          style: { margin: "20px 0 16px" }
        }),

        /* Theme Selector */
        React.createElement("div", {
          style: { textAlign: "center" }
        },
          React.createElement("p", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5
            }
          }, "Theme"),
          React.createElement("div", {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              justifyContent: "center"
            }
          },
            THEMES_ALL
              .filter(t => !t.ownerOnly)
              .map(t =>
                React.createElement("button", {
                  key: t.id,
                  title: t.label,
                  onClick: () => {
                    ThemeMgr.set(t.id, null);
                    window.location.reload();
                  },
                  style: {
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: t.bg,
                    border: theme === t.id
                      ? "2px solid var(--primary)"
                      : "2px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    transform: theme === t.id
                      ? "scale(1.2)" : "scale(1)"
                  }
                })
              )
          )
        )
      ),

      /* Footer */
      React.createElement("p", {
        style: {
          textAlign: "center",
          marginTop: 20,
          fontSize: 11,
          color: "var(--text-muted)"
        }
      }, `${APP} ${VER} — All rights reserved`)
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 6 — UPDATES FEED
   محفوظ من v4.0.0 — FROZEN
   ══════════════════════════════════════════════════════════ */
function UpdatesFeed({ user }) {
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter,     setFilter]     = useState("all");

  const POST_TYPES = [
    { id: "update",      label: "Update",      icon: "📋",
      color: "#3B82F6" },
    { id: "alert",       label: "Alert",       icon: "🚨",
      color: "#EF4444" },
    { id: "achievement", label: "Achievement", icon: "🏆",
      color: "#EAB308" },
    { id: "reminder",    label: "Reminder",    icon: "⏰",
      color: "#F97316" },
    { id: "praise",      label: "Praise",      icon: "⭐",
      color: "#10B981" },
    { id: "info",        label: "Info",        icon: "ℹ️",
      color: "#8B5CF6" },
  ];

  useEffect(() => {
    loadPosts();
    ChannelMgr.sub("feed", "updates_feed", null, loadPosts);
    return () => ChannelMgr.unsub("feed");
  }, []);

  async function loadPosts() {
    try {
      const { data } = await withRetry(() =>
        sb.from("updates_feed")
          .select(`
            *,
            author:employees!updates_feed_author_id_fkey(
              id, full_name, role, avatar_url
            )
          `)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50)
      );
      setPosts(data || []);
    } catch(e) {
      showToast("Failed to load feed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(postId) {
    try {
      const post = posts.find(p => p.id === postId);
      const acks = post?.acknowledged_by || [];
      if (acks.includes(user.id)) return;

      await withRetry(() =>
        sb.from("updates_feed")
          .update({
            acknowledged_by: [...acks, user.id],
            ack_count: (post?.ack_count || 0) + 1
          })
          .eq("id", postId)
      );
      showToast("Acknowledged ✓", "success");
    } catch(e) {
      showToast("Failed to acknowledge", "error");
    }
  }

  async function handlePin(postId, pinned) {
    if (!RC.isMgr(user)) return;
    try {
      await withRetry(() =>
        sb.from("updates_feed")
          .update({ is_pinned: !pinned })
          .eq("id", postId)
      );
    } catch(e) {
      showToast("Failed to pin", "error");
    }
  }

  async function handleDelete(postId) {
    if (!RC.isMgr(user)) return;
    try {
      await withRetry(() =>
        sb.from("updates_feed")
          .delete()
          .eq("id", postId)
      );
      showToast("Post deleted", "success");
    } catch(e) {
      showToast("Failed to delete", "error");
    }
  }

  const filtered = filter === "all"
    ? posts
    : posts.filter(p => p.type === filter);

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading feed..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Updates Feed",
      icon: "📋",
      subtitle: `${posts.length} posts`,
      actions: RC.isMgr(user) &&
        React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: () => setShowCreate(true)
        }, "+ New Post")
    }),

    /* Filter Tabs */
    React.createElement("div", {
      style: { marginBottom: 20, overflowX: "auto" }
    },
      React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          paddingBottom: 4
        }
      },
        React.createElement("button", {
          className: `nx-btn nx-btn-sm ${
            filter === "all" ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => setFilter("all")
        }, "All"),
        POST_TYPES.map(t =>
          React.createElement("button", {
            key: t.id,
            className: `nx-btn nx-btn-sm ${
              filter === t.id ? "nx-btn-primary" : "nx-btn-secondary"}`,
            onClick: () => setFilter(t.id)
          }, `${t.icon} ${t.label}`)
        )
      )
    ),

    /* Posts */
    filtered.length === 0
      ? React.createElement(EmptyState, {
          icon: "📭",
          title: "No posts yet",
          desc: "Updates will appear here"
        })
      : React.createElement("div", {
          style: { display: "flex", flexDirection: "column", gap: 12 }
        },
          filtered.map(post =>
            React.createElement(FeedPost, {
              key: post.id,
              post,
              user,
              postTypes: POST_TYPES,
              onAck: handleAcknowledge,
              onPin: handlePin,
              onDelete: handleDelete
            })
          )
        ),

    /* Create Modal */
    showCreate && React.createElement(CreatePostModal, {
      user,
      postTypes: POST_TYPES,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        showToast("Post created!", "success");
      }
    })
  );
}

/* Feed Post Card */
function FeedPost({ post, user, postTypes, onAck, onPin, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const type = postTypes.find(t => t.id === post.type)
    || postTypes[0];
  const isAcked = (post.acknowledged_by || []).includes(user.id);
  const canMgr  = RC.isMgr(user);

  return React.createElement("div", {
    className: "nx-card nx-card-enter",
    style: {
      borderLeft: `3px solid ${type.color}`,
      opacity: post.type === "alert" && !isAcked ? 1 : 0.95
    }
  },
    /* Header */
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12
      }
    },
      React.createElement("div", {
        style: { display: "flex", alignItems: "center", gap: 10 }
      },
        React.createElement("span", {
          style: { fontSize: 20 }
        }, type.icon),
        React.createElement("div", null,
          React.createElement("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap"
            }
          },
            React.createElement("span", {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text)"
              }
            }, post.author?.full_name || "System"),
            React.createElement("span", {
              className: "nx-badge",
              style: {
                background: `${type.color}22`,
                color: type.color,
                border: `1px solid ${type.color}44`,
                fontSize: 10
              }
            }, type.label),
            post.is_pinned && React.createElement("span", {
              className: "nx-badge nx-badge-warning",
              style: { fontSize: 10 }
            }, "📌 Pinned")
          ),
          React.createElement("div", {
            style: { fontSize: 11, color: "var(--text-muted)",
                     marginTop: 2 }
          }, fmtRelative(post.created_at))
        )
      ),

      /* Actions */
      canMgr && React.createElement("div", {
        style: { display: "flex", gap: 4 }
      },
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon nx-btn-icon-sm",
          onClick: () => onPin(post.id, post.is_pinned),
          title: post.is_pinned ? "Unpin" : "Pin"
        }, post.is_pinned ? "📌" : "📍"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon nx-btn-icon-sm",
          onClick: () => onDelete(post.id),
          title: "Delete",
          style: { color: "var(--danger)" }
        }, "🗑️")
      )
    ),

    /* Title */
    post.title && React.createElement("h3", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "var(--text)",
        marginBottom: 8
      }
    }, post.title),

    /* Body */
    React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: "var(--text-sub)",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        overflow: "hidden",
        maxHeight: expanded ? "none" : "80px"
      }
    }, post.body),

    post.body?.length > 200 &&
    React.createElement("button", {
      className: "nx-btn nx-btn-ghost nx-btn-sm",
      onClick: () => setExpanded(p => !p),
      style: { marginTop: 4, padding: "2px 0" }
    }, expanded ? "Show less ▲" : "Read more ▼"),

    /* Footer */
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid var(--border)"
      }
    },
      React.createElement("span", {
        style: { fontSize: 11, color: "var(--text-muted)" }
      }, `${post.ack_count || 0} acknowledged`),

      React.createElement("button", {
        className: `nx-btn nx-btn-sm ${
          isAcked ? "nx-btn-success" : "nx-btn-secondary"}`,
        onClick: () => !isAcked && onAck(post.id),
        disabled: isAcked
      }, isAcked ? "✓ Acknowledged" : "Acknowledge")
    )
  );
}

/* Create Post Modal */
function CreatePostModal({ user, postTypes, onClose, onCreated }) {
  const [form, setForm] = useState({
    type: "update",
    title: "",
    body: "",
    is_pinned: false
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.body.trim()) {
      showToast("Post body is required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("updates_feed").insert({
          type: form.type,
          title: form.title.trim() || null,
          body: form.body.trim(),
          is_pinned: form.is_pinned,
          author_id: user.id,
          acknowledged_by: [],
          ack_count: 0,
          created_at: new Date().toISOString()
        })
      );
      await logAudit("CREATE_POST", form.title || form.type, user.id);
      onCreated();
    } catch(e) {
      showToast("Failed to create post", "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className: "nx-modal-header" },
        React.createElement("span", {
          className: "nx-modal-title"
        }, "📋 New Post"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", { className: "nx-modal-body" },
        React.createElement("div", {
          style: { display: "flex", flexDirection: "column", gap: 16 }
        },
          /* Type */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label"
            }, "Post Type"),
            React.createElement("div", {
              style: { display: "flex", flexWrap: "wrap", gap: 8 }
            },
              postTypes.map(t =>
                React.createElement("button", {
                  key: t.id,
                  className: `nx-btn nx-btn-sm ${
                    form.type === t.id
                      ? "nx-btn-primary" : "nx-btn-secondary"}`,
                  onClick: () => setForm(p => ({...p, type: t.id}))
                }, `${t.icon} ${t.label}`)
              )
            )
          ),

          /* Title */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label"
            }, "Title (optional)"),
            React.createElement("input", {
              type: "text",
              className: "nx-input",
              placeholder: "Post title...",
              value: form.title,
              onChange: e => setForm(p => ({
                ...p, title: e.target.value
              }))
            })
          ),

          /* Body */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label nx-label-required"
            }, "Content"),
            React.createElement("textarea", {
              className: "nx-textarea",
              placeholder: "Write your post...",
              value: form.body,
              rows: 5,
              onChange: e => setForm(p => ({
                ...p, body: e.target.value
              }))
            })
          ),

          /* Pin Toggle */
          RC.isMgr(user) &&
          React.createElement("label", {
            className: "nx-checkbox-wrap"
          },
            React.createElement("div", {
              className: `nx-checkbox ${form.is_pinned ? "checked" : ""}`,
              onClick: () => setForm(p => ({
                ...p, is_pinned: !p.is_pinned
              }))
            }, form.is_pinned ? "✓" : ""),
            React.createElement("span", {
              style: { fontSize: 13, color: "var(--text-sub)" }
            }, "📌 Pin this post")
          )
        )
      ),

      React.createElement("div", { className: "nx-modal-footer" },
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onClose
        }, "Cancel"),
        React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: handleSave,
          disabled: saving
        }, saving
          ? React.createElement(Spinner)
          : "Publish Post")
      )
    )
  );
}

/* ============================================================
   screens1.js — Part B
   SEC 7: SchedulePage — مستعادة من v4.0.0
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 7 — SCHEDULE PAGE
   ══════════════════════════════════════════════════════════ */
function SchedulePage({ user }) {
  const [schedules,   setSchedules]   = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [weekStart,   setWeekStart]   = useState(getMonday(new Date()));
  const [dept,        setDept]        = useState("all");
  const [depts,       setDepts]       = useState([]);
  const [showUpload,  setShowUpload]  = useState(false);
  const [showManage,  setShowManage]  = useState(false);
  const [editCell,    setEditCell]    = useState(null);
  const theme = ThemeMgr.get();

  /* أيام الأسبوع */
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  function getMonday(d) {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    dt.setHours(0,0,0,0);
    return dt;
  }

  function getWeekDates(monday) {
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  const weekDates = useMemo(() =>
    getWeekDates(weekStart), [weekStart]);

  useEffect(() => { loadData(); }, [weekStart, dept]);

  async function loadData() {
    setLoading(true);
    try {
      /* جلب الموظفين */
      let empQ = sb.from("employees")
        .select("id, full_name, role, department, avatar_url")
        .eq("is_active", true)
        .order("full_name");

      if (dept !== "all") empQ = empQ.eq("department", dept);

      const { data: empData } = await withRetry(() => empQ);
      setEmployees(empData || []);

      /* جلب الأقسام */
      const { data: deptData } = await withRetry(() =>
        sb.from("employees")
          .select("department")
          .eq("is_active", true)
          .not("department", "is", null)
      );
      const uniqueDepts = [...new Set(
        (deptData || []).map(e => e.department).filter(Boolean)
      )];
      setDepts(uniqueDepts);

      /* جلب الجداول */
      const ws = weekStart.toISOString().split("T")[0];
      const { data: schData } = await withRetry(() =>
        sb.from("schedules")
          .select(`
            *,
            schedule_days(*)
          `)
          .eq("week_start", ws)
      );
      setSchedules(schData || []);

    } catch(e) {
      showToast("Failed to load schedule", "error");
    } finally {
      setLoading(false);
    }
  }

  /* الحصول على خلية الجدول */
  function getCell(empId, date) {
    const dateStr = date.toISOString().split("T")[0];
    for (const sch of schedules) {
      if (sch.employee_id !== empId) continue;
      const day = (sch.schedule_days || []).find(
        d => d.day_date === dateStr
      );
      if (day) return day;
    }
    return null;
  }

  /* ألوان الشيفت */
  const SHIFT_COLORS = {
    morning:  "#3B82F6",
    evening:  "#8B5CF6",
    night:    "#1E293B",
    off:      "#6B7280",
    wfh:      "#10B981",
    training: "#F97316",
    leave:    "#EF4444",
  };

  function getShiftColor(shiftType) {
    const base = SHIFT_COLORS[shiftType] || "#64748B";
    return adaptColor(base, theme);
  }

  /* التنقل بين الأسابيع */
  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
  }

  const canEdit = RC.canSchedule(user);

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading schedule..." });

  return React.createElement("div", { className: "nx-page-enter" },

    /* Page Header */
    React.createElement(PageHeader, {
      title: "Schedule",
      icon: "📅",
      subtitle: `Week of ${weekStart.toLocaleDateString("en-GB",
        { day:"2-digit", month:"short", year:"numeric" })}`,
      actions: React.createElement("div", {
        style: { display: "flex", gap: 8, flexWrap: "wrap" }
      },
        canEdit && React.createElement("button", {
          className: "nx-btn nx-btn-secondary nx-btn-sm",
          onClick: () => setShowManage(true)
        }, "⚙️ Shifts"),
        canEdit && React.createElement("button", {
          className: "nx-btn nx-btn-primary nx-btn-sm",
          onClick: () => setShowUpload(true)
        }, "📤 Upload Excel")
      )
    }),

    /* Controls */
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap"
      }
    },
      /* Week Navigation */
      React.createElement("div", {
        style: { display: "flex", alignItems: "center", gap: 8 }
      },
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary nx-btn-icon",
          onClick: prevWeek
        }, "◀"),
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary nx-btn-sm",
          onClick: goToday
        }, "Today"),
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary nx-btn-icon",
          onClick: nextWeek
        }, "▶")
      ),

      /* Dept Filter */
      React.createElement("select", {
        className: "nx-select",
        value: dept,
        onChange: e => setDept(e.target.value),
        style: { width: "auto", minWidth: 140 }
      },
        React.createElement("option", { value: "all" },
          "All Departments"),
        depts.map(d =>
          React.createElement("option", { key: d, value: d }, d)
        )
      )
    ),

    /* Legend */
    React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16
      }
    },
      Object.entries(SHIFT_COLORS).map(([type, color]) =>
        React.createElement("div", {
          key: type,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--text-sub)"
          }
        },
          React.createElement("div", {
            style: {
              width: 10, height: 10,
              borderRadius: 2,
              background: adaptColor(color, theme)
            }
          }),
          type.charAt(0).toUpperCase() + type.slice(1)
        )
      )
    ),

    /* Schedule Table */
    React.createElement("div", { className: "nx-table-wrap" },
      React.createElement("table", { className: "nx-table" },

        /* Header */
        React.createElement("thead", null,
          React.createElement("tr", null,
            React.createElement("th", {
              style: { minWidth: 180, position: "sticky",
                       left: 0, zIndex: 2,
                       background: "var(--card2)" }
            }, "Employee"),
            weekDates.map((date, i) => {
              const isToday = date.toDateString() ===
                new Date().toDateString();
              return React.createElement("th", {
                key: i,
                style: {
                  minWidth: 110,
                  textAlign: "center",
                  background: isToday
                    ? "var(--primary-glow)" : "var(--card2)",
                  color: isToday
                    ? "var(--primary)" : "var(--text-sub)"
                }
              },
                React.createElement("div", null,
                  DAYS[date.getDay()]),
                React.createElement("div", {
                  style: { fontSize: 10, fontWeight: 400,
                           marginTop: 2 }
                }, date.toLocaleDateString("en-GB",
                  { day:"2-digit", month:"short" }))
              );
            })
          )
        ),

        /* Body */
        React.createElement("tbody", null,
          employees.length === 0
            ? React.createElement("tr", null,
                React.createElement("td", {
                  colSpan: 8,
                  style: { textAlign: "center",
                           padding: "40px 20px",
                           color: "var(--text-muted)" }
                }, "No employees found")
              )
            : employees.map(emp =>
                React.createElement("tr", { key: emp.id },
                  /* Employee Name */
                  React.createElement("td", {
                    style: {
                      position: "sticky", left: 0,
                      background: "var(--card)",
                      zIndex: 1,
                      borderRight: "1px solid var(--border)"
                    }
                  },
                    React.createElement("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }
                    },
                      React.createElement(NxAvatar, {
                        user: emp, size: "xs"
                      }),
                      React.createElement("div", null,
                        React.createElement("div", {
                          style: {
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text)"
                          }
                        }, emp.full_name),
                        React.createElement("div", {
                          style: {
                            fontSize: 10,
                            color: RC.color[emp.role]
                          }
                        }, emp.role)
                      )
                    )
                  ),

                  /* Days */
                  weekDates.map((date, i) => {
                    const cell = getCell(emp.id, date);
                    const isToday = date.toDateString() ===
                      new Date().toDateString();

                    return React.createElement("td", {
                      key: i,
                      style: {
                        textAlign: "center",
                        padding: "6px",
                        background: isToday
                          ? "rgba(var(--primary-rgb),0.04)"
                          : "transparent",
                        cursor: canEdit ? "pointer" : "default"
                      },
                      onClick: () => canEdit && setEditCell({
                        emp, date, cell
                      })
                    },
                      cell
                        ? React.createElement("div", {
                            style: {
                              background: `${getShiftColor(
                                cell.shift_type)}22`,
                              color: getShiftColor(cell.shift_type),
                              border: `1px solid ${getShiftColor(
                                cell.shift_type)}44`,
                              borderRadius: 6,
                              padding: "4px 6px",
                              fontSize: 11,
                              fontWeight: 600
                            }
                          },
                            React.createElement("div", null,
                              cell.shift_label ||
                              cell.shift_type),
                            cell.shift_start &&
                            React.createElement("div", {
                              style: {
                                fontSize: 9,
                                opacity: 0.8,
                                marginTop: 2
                              }
                            }, `${cell.shift_start
                              .slice(0,5)} - ${
                              cell.shift_end?.slice(0,5) || ""}`)
                          )
                        : canEdit
                        ? React.createElement("div", {
                            style: {
                              width: 24, height: 24,
                              borderRadius: 4,
                              border: "1px dashed var(--border)",
                              margin: "0 auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                              fontSize: 14
                            }
                          }, "+")
                        : null
                    );
                  })
                )
              )
        )
      )
    ),

    /* Upload Modal */
    showUpload && React.createElement(UploadScheduleModal, {
      user,
      weekStart,
      onClose: () => setShowUpload(false),
      onUploaded: () => {
        setShowUpload(false);
        loadData();
        showToast("Schedule uploaded!", "success");
      }
    }),

    /* Edit Cell Modal */
    editCell && React.createElement(EditCellModal, {
      user,
      emp: editCell.emp,
      date: editCell.date,
      cell: editCell.cell,
      weekStart,
      onClose: () => setEditCell(null),
      onSaved: () => {
        setEditCell(null);
        loadData();
        showToast("Schedule updated!", "success");
      }
    }),

    /* Manage Shifts Modal */
    showManage && React.createElement(ManageShiftsModal, {
      user,
      onClose: () => setShowManage(false)
    })
  );
}

/* ══════════════════════════════════════════════════════════
   UPLOAD SCHEDULE MODAL — 3 خطوات
   ══════════════════════════════════════════════════════════ */
function UploadScheduleModal({ user, weekStart, onClose, onUploaded }) {
  const [step,     setStep]     = useState(1);
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState([]);
  const [errors,   setErrors]   = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  /* الأعمدة المتوقعة في Excel */
  const EXPECTED_COLS = [
    "employee_name","sun","mon","tue","wed","thu","fri","sat"
  ];

  async function handleFile(f) {
    if (!f) return;
    const allowed = [
      "application/vnd.openxmlformats-officedocument"
      + ".spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv"
    ];
    if (!allowed.includes(f.type) &&
        !f.name.match(/\.(xlsx|xls|csv)$/i)) {
      showToast("Only Excel/CSV files allowed", "error");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast("Max file size: 10MB", "error");
      return;
    }
    setFile(f);
    await parseFile(f);
    setStep(2);
  }

  async function parseFile(f) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, {
            header: 1, defval: ""
          });

          if (rows.length < 2) {
            setErrors(["File is empty or has no data rows"]);
            resolve();
            return;
          }

          /* Header row */
          const headers = rows[0].map(h =>
            String(h).toLowerCase().trim().replace(/\s+/g, "_")
          );

          const errs = [];
          const parsed = [];

          rows.slice(1).forEach((row, idx) => {
            if (!row[0]) return;
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = String(row[i] || "").trim();
            });

            if (!obj.employee_name) {
              errs.push(`Row ${idx+2}: Missing employee name`);
              return;
            }

            parsed.push({
              employee_name: obj.employee_name,
              sun: obj.sun || obj.sunday    || "",
              mon: obj.mon || obj.monday    || "",
              tue: obj.tue || obj.tuesday   || "",
              wed: obj.wed || obj.wednesday || "",
              thu: obj.thu || obj.thursday  || "",
              fri: obj.fri || obj.friday    || "",
              sat: obj.sat || obj.saturday  || "",
            });
          });

          setErrors(errs);
          setPreview(parsed);
          resolve();
        } catch(err) {
          setErrors(["Failed to parse file: " + err.message]);
          resolve();
        }
      };
      reader.readAsBinaryString(f);
    });
  }

  async function handleUpload() {
    if (preview.length === 0) return;
    setSaving(true);
    setProgress(0);

    try {
      /* جلب الموظفين */
      const { data: emps } = await withRetry(() =>
        sb.from("employees")
          .select("id, full_name")
          .eq("is_active", true)
      );

      const empMap = {};
      (emps || []).forEach(e => {
        empMap[e.full_name.toLowerCase().trim()] = e.id;
      });

      const ws = weekStart.toISOString().split("T")[0];
      const weekDates = Array.from({length: 7}, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      const dayKeys = ["sun","mon","tue","wed","thu","fri","sat"];
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday",
                        "Thursday","Friday","Saturday"];

      let done = 0;
      const batchSize = 10;

      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);

        for (const row of batch) {
          const empId = empMap[
            row.employee_name.toLowerCase().trim()
          ];
          if (!empId) continue;

          /* إنشاء أو جلب schedule */
          let { data: sch } = await withRetry(() =>
            sb.from("schedules")
              .select("id")
              .eq("employee_id", empId)
              .eq("week_start", ws)
              .single()
          );

          if (!sch) {
            const { data: newSch } = await withRetry(() =>
              sb.from("schedules").insert({
                employee_id: empId,
                week_start: ws,
                created_by: user.id,
                created_at: new Date().toISOString()
              }).select("id").single()
            );
            sch = newSch;
          }

          if (!sch?.id) continue;

          /* حذف الأيام القديمة */
          await withRetry(() =>
            sb.from("schedule_days")
              .delete()
              .eq("schedule_id", sch.id)
          );

          /* إدراج الأيام الجديدة */
          const days = dayKeys.map((key, idx) => {
            const val = row[key] || "";
            return parseShiftValue(
              val, sch.id, weekDates[idx], dayNames[idx]
            );
          }).filter(Boolean);

          if (days.length > 0) {
            await withRetry(() =>
              sb.from("schedule_days").insert(days)
            );
          }
        }

        done += batch.length;
        setProgress(Math.round((done / preview.length) * 100));
      }

      await logAudit("UPLOAD_SCHEDULE",
        `Week ${ws}, ${preview.length} employees`, user.id);
      onUploaded();

    } catch(e) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function parseShiftValue(val, schId, date, dayName) {
    if (!val || val.toLowerCase() === "off") {
      return {
        schedule_id: schId,
        day_date: date,
        day_name: dayName,
        shift_type: "off",
        shift_label: "OFF",
        shift_start: null,
        shift_end: null
      };
    }

    /* تحليل التنسيق: "Morning 08:00-17:00" */
    const timeMatch = val.match(
      /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/
    );
    const typeMap = {
      morning: "morning", evening: "evening",
      night: "night", wfh: "wfh",
      training: "training", leave: "leave",
      vacation: "leave", annual: "leave"
    };

    let shiftType = "morning";
    const valLower = val.toLowerCase();
    for (const [k, v] of Object.entries(typeMap)) {
      if (valLower.includes(k)) { shiftType = v; break; }
    }

    return {
      schedule_id: schId,
      day_date: date,
      day_name: dayName,
      shift_type: shiftType,
      shift_label: val.slice(0, 20),
      shift_start: timeMatch ? timeMatch[1] + ":00" : null,
      shift_end:   timeMatch ? timeMatch[2] + ":00" : null
    };
  }

  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal nx-modal-lg",
      onClick: e => e.stopPropagation()
    },
      /* Header */
      React.createElement("div", { className: "nx-modal-header" },
        React.createElement("span", { className: "nx-modal-title" },
          "📤 Upload Schedule — Excel"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      /* Steps Indicator */
      React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          gap: 8
        }
      },
        [
          { n: 1, label: "Upload File" },
          { n: 2, label: "Preview" },
          { n: 3, label: "Confirm" }
        ].map((s, i) =>
          React.createElement(React.Fragment, { key: s.n },
            React.createElement("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6
              }
            },
              React.createElement("div", {
                style: {
                  width: 28, height: 28,
                  borderRadius: "50%",
                  background: step >= s.n
                    ? "var(--primary)" : "var(--card3)",
                  color: step >= s.n ? "#000" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700
                }
              }, step > s.n ? "✓" : s.n),
              React.createElement("span", {
                style: {
                  fontSize: 12,
                  fontWeight: step === s.n ? 700 : 400,
                  color: step === s.n
                    ? "var(--text)" : "var(--text-muted)"
                }
              }, s.label)
            ),
            i < 2 && React.createElement("div", {
              style: {
                flex: 1,
                height: 1,
                background: step > s.n
                  ? "var(--primary)" : "var(--border)"
              }
            })
          )
        )
      ),

      React.createElement("div", { className: "nx-modal-body" },

        /* Step 1: Upload */
        step === 1 && React.createElement("div", {
          style: { display: "flex", flexDirection: "column", gap: 16 }
        },
          React.createElement("div", {
            className: "nx-file-upload",
            onClick: () => fileRef.current?.click(),
            onDragOver: e => e.preventDefault(),
            onDrop: e => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }
          },
            React.createElement("input", {
              ref: fileRef,
              type: "file",
              accept: ".xlsx,.xls,.csv",
              onChange: e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }
            }),
            React.createElement("div", {
              style: { fontSize: 40, marginBottom: 12 }
            }, "📊"),
            React.createElement("p", {
              style: {
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text)"
              }
            }, "Drop Excel file here or click to browse"),
            React.createElement("p", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 6
              }
            }, "Supports: .xlsx, .xls, .csv — Max 10MB")
          ),

          /* Template Info */
          React.createElement("div", {
            className: "nx-alert nx-alert-info"
          },
            React.createElement("span", {
              className: "nx-alert-icon"
            }, "ℹ️"),
            React.createElement("div", null,
              React.createElement("strong", null,
                "Expected columns: "),
              "employee_name, sun, mon, tue, wed, thu, fri, sat",
              React.createElement("br"),
              React.createElement("span", {
                style: { fontSize: 11, marginTop: 4,
                         display: "block" }
              }, "Shift format: Morning 08:00-17:00 or just: morning, off, wfh, leave")
            )
          )
        ),

        /* Step 2: Preview */
        step === 2 && React.createElement("div", null,
          errors.length > 0 &&
          React.createElement("div", {
            className: "nx-alert nx-alert-warning",
            style: { marginBottom: 16 }
          },
            React.createElement("span", {
              className: "nx-alert-icon"
            }, "⚠️"),
            React.createElement("div", null,
              React.createElement("strong", null,
                `${errors.length} warnings:`),
              errors.slice(0, 5).map((e, i) =>
                React.createElement("div", {
                  key: i,
                  style: { fontSize: 11, marginTop: 2 }
                }, e)
              )
            )
          ),

          React.createElement("p", {
            style: {
              fontSize: 13,
              color: "var(--text-sub)",
              marginBottom: 12
            }
          }, `Found ${preview.length} employee rows`),

          React.createElement("div", {
            style: {
              maxHeight: 300,
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)"
            }
          },
            React.createElement("table", {
              className: "nx-table",
              style: { fontSize: 11 }
            },
              React.createElement("thead", null,
                React.createElement("tr", null,
                  ["Employee","Sun","Mon","Tue",
                   "Wed","Thu","Fri","Sat"].map(h =>
                    React.createElement("th", { key: h }, h)
                  )
                )
              ),
              React.createElement("tbody", null,
                preview.slice(0, 20).map((row, i) =>
                  React.createElement("tr", { key: i },
                    ["employee_name","sun","mon","tue",
                     "wed","thu","fri","sat"].map(k =>
                      React.createElement("td", { key: k },
                        row[k] || "—"
                      )
                    )
                  )
                )
              )
            )
          ),
          preview.length > 20 &&
          React.createElement("p", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 8,
              textAlign: "center"
            }
          }, `Showing 20 of ${preview.length} rows`)
        ),

        /* Step 3: Confirm + Progress */
        step === 3 && React.createElement("div", {
          style: {
            textAlign: "center",
            padding: "20px 0"
          }
        },
          saving
            ? React.createElement("div", null,
                React.createElement("div", {
                  style: { fontSize: 40, marginBottom: 12 }
                }, "⏳"),
                React.createElement("p", {
                  style: {
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 16
                  }
                }, `Uploading... ${progress}%`),
                React.createElement("div", {
                  className: "nx-progress-bar",
                  style: { maxWidth: 300, margin: "0 auto" }
                },
                  React.createElement("div", {
                    className: "nx-progress-fill",
                    style: { width: `${progress}%`,
                             transition: "width 0.3s ease" }
                  })
                )
              )
            : React.createElement("div", null,
                React.createElement("div", {
                  style: { fontSize: 40, marginBottom: 12 }
                }, "✅"),
                React.createElement("p", {
                  style: {
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 8
                  }
                }, "Ready to Upload"),
                React.createElement("p", {
                  style: {
                    fontSize: 13,
                    color: "var(--text-sub)"
                  }
                }, `${preview.length} employees × 7 days will be saved`),
                React.createElement("p", {
                  style: {
                    fontSize: 12,
                    color: "var(--warning)",
                    marginTop: 8
                  }
                }, "⚠️ This will overwrite existing schedule for this week")
              )
        )
      ),

      /* Footer */
      React.createElement("div", { className: "nx-modal-footer" },
        step > 1 && !saving &&
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: () => setStep(p => p - 1)
        }, "← Back"),

        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onClose,
          disabled: saving
        }, "Cancel"),

        step === 1 && React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: () => fileRef.current?.click()
        }, "Choose File"),

        step === 2 && preview.length > 0 &&
        React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: () => setStep(3)
        }, `Confirm ${preview.length} rows →`),

        step === 3 && !saving &&
        React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: handleUpload
        }, "🚀 Upload Now")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   EDIT CELL MODAL
   ══════════════════════════════════════════════════════════ */
function EditCellModal({ user, emp, date, cell, weekStart,
                         onClose, onSaved }) {
  const [form, setForm] = useState({
    shift_type:  cell?.shift_type  || "morning",
    shift_label: cell?.shift_label || "",
    shift_start: cell?.shift_start?.slice(0,5) || "08:00",
    shift_end:   cell?.shift_end?.slice(0,5)   || "17:00",
  });
  const [saving, setSaving] = useState(false);

  const SHIFT_TYPES = [
    { id:"morning",  label:"Morning",  icon:"🌅" },
    { id:"evening",  label:"Evening",  icon:"🌆" },
    { id:"night",    label:"Night",    icon:"🌙" },
    { id:"off",      label:"Off",      icon:"🔴" },
    { id:"wfh",      label:"WFH",      icon:"🏠" },
    { id:"training", label:"Training", icon:"📚" },
    { id:"leave",    label:"Leave",    icon:"✈️"  },
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const ws = weekStart.toISOString().split("T")[0];
      const dateStr = date.toISOString().split("T")[0];

      /* جلب أو إنشاء schedule */
      let { data: sch } = await withRetry(() =>
        sb.from("schedules")
          .select("id")
          .eq("employee_id", emp.id)
          .eq("week_start", ws)
          .single()
      );

      if (!sch) {
        const { data: newSch } = await withRetry(() =>
          sb.from("schedules").insert({
            employee_id: emp.id,
            week_start: ws,
            created_by: user.id,
            created_at: new Date().toISOString()
          }).select("id").single()
        );
        sch = newSch;
      }

      /* حذف اليوم القديم */
      if (cell?.id) {
        await withRetry(() =>
          sb.from("schedule_days")
            .delete()
            .eq("id", cell.id)
        );
      }

      /* إدراج اليوم الجديد */
      await withRetry(() =>
        sb.from("schedule_days").insert({
          schedule_id: sch.id,
          day_date: dateStr,
          day_name: date.toLocaleDateString("en-US",
            { weekday: "long" }),
          shift_type:  form.shift_type,
          shift_label: form.shift_label ||
            form.shift_type.charAt(0).toUpperCase() +
            form.shift_type.slice(1),
          shift_start: form.shift_type !== "off"
            ? form.shift_start + ":00" : null,
          shift_end:   form.shift_type !== "off"
            ? form.shift_end + ":00" : null,
        })
      );

      await logAudit("EDIT_SCHEDULE",
        `${emp.full_name} — ${dateStr}`, user.id, emp.id);
      onSaved();
    } catch(e) {
      showToast("Failed to save: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className: "nx-modal-header" },
        React.createElement("span", { className: "nx-modal-title" },
          `✏️ ${emp.full_name}`),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", { className: "nx-modal-body" },
        React.createElement("p", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 16
          }
        }, date.toLocaleDateString("en-GB", {
          weekday:"long", day:"2-digit",
          month:"long", year:"numeric"
        })),

        React.createElement("div", {
          style: { display: "flex", flexDirection: "column", gap: 14 }
        },
          /* Shift Type */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label"
            }, "Shift Type"),
            React.createElement("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6
              }
            },
              SHIFT_TYPES.map(t =>
                React.createElement("button", {
                  key: t.id,
                  className: `nx-btn nx-btn-sm ${
                    form.shift_type === t.id
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(p => ({
                    ...p, shift_type: t.id
                  })),
                  style: { flexDirection: "column",
                           gap: 2, padding: "6px 4px" }
                },
                  React.createElement("span", null, t.icon),
                  React.createElement("span", {
                    style: { fontSize: 10 }
                  }, t.label)
                )
              )
            )
          ),

          /* Label */
          React.createElement("div", { className: "nx-form-group" },
            React.createElement("label", {
              className: "nx-label"
            }, "Label (optional)"),
            React.createElement("input", {
              type: "text",
              className: "nx-input",
              placeholder: "e.g. Morning A",
              value: form.shift_label,
              onChange: e => setForm(p => ({
                ...p, shift_label: e.target.value
              }))
            })
          ),

          /* Times */
          form.shift_type !== "off" &&
          form.shift_type !== "leave" &&
          React.createElement("div", {
            style: { display: "grid",
                     gridTemplateColumns: "1fr 1fr", gap: 10 }
          },
            React.createElement("div", { className: "nx-form-group" },
              React.createElement("label", {
                className: "nx-label"
              }, "Start"),
              React.createElement("input", {
                type: "time",
                className: "nx-input",
                value: form.shift_start,
                onChange: e => setForm(p => ({
                  ...p, shift_start: e.target.value
                }))
              })
            ),
            React.createElement("div", { className: "nx-form-group" },
              React.createElement("label", {
                className: "nx-label"
              }, "End"),
              React.createElement("input", {
                type: "time",
                className: "nx-input",
                value: form.shift_end,
                onChange: e => setForm(p => ({
                  ...p, shift_end: e.target.value
                }))
              })
            )
          )
        )
      ),

      React.createElement("div", { className: "nx-modal-footer" },
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onClose
        }, "Cancel"),
        React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: handleSave,
          disabled: saving
        }, saving ? React.createElement(Spinner) : "Save")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   MANAGE SHIFTS MODAL
   ══════════════════════════════════════════════════════════ */
function ManageShiftsModal({ user, onClose }) {
  const [shifts,  setShifts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({
    name: "", start: "08:00", end: "17:00", type: "morning"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadShifts(); }, []);

  async function loadShifts() {
    try {
      const { data } = await withRetry(() =>
        sb.from("shift_templates")
          .select("*")
          .order("created_at")
      );
      setShifts(data || []);
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      showToast("Shift name required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("shift_templates").insert({
          name: form.name.trim(),
          shift_start: form.start + ":00",
          shift_end:   form.end   + ":00",
          shift_type:  form.type,
          created_by:  user.id,
          created_at:  new Date().toISOString()
        })
      );
      setForm({ name:"", start:"08:00", end:"17:00", type:"morning" });
      loadShifts();
      showToast("Shift template added!", "success");
    } catch(e) {
      showToast("Failed to add shift", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await withRetry(() =>
        sb.from("shift_templates").delete().eq("id", id)
      );
      loadShifts();
      showToast("Deleted", "success");
    } catch(e) {
      showToast("Failed to delete", "error");
    }
  }

  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className: "nx-modal-header" },
        React.createElement("span", {
          className: "nx-modal-title"
        }, "⚙️ Manage Shift Templates"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", { className: "nx-modal-body" },
        /* Add Form */
        React.createElement("div", {
          className: "nx-card nx-card-sm",
          style: { marginBottom: 16 }
        },
          React.createElement("p", {
            style: {
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-sub)",
              marginBottom: 12
            }
          }, "Add New Template"),
          React.createElement("div", {
            style: { display: "flex", gap: 8, flexWrap: "wrap" }
          },
            React.createElement("input", {
              type: "text",
              className: "nx-input",
              placeholder: "Shift name",
              value: form.name,
              onChange: e => setForm(p => ({
                ...p, name: e.target.value
              })),
              style: { flex: 2, minWidth: 120 }
            }),
            React.createElement("input", {
              type: "time",
              className: "nx-input",
              value: form.start,
              onChange: e => setForm(p => ({
                ...p, start: e.target.value
              })),
              style: { flex: 1, minWidth: 90 }
            }),
            React.createElement("input", {
              type: "time",
              className: "nx-input",
              value: form.end,
              onChange: e => setForm(p => ({
                ...p, end: e.target.value
              })),
              style: { flex: 1, minWidth: 90 }
            }),
            React.createElement("button", {
              className: "nx-btn nx-btn-primary",
              onClick: handleAdd,
              disabled: saving
            }, saving ? React.createElement(Spinner) : "+ Add")
          )
        ),

        /* List */
        loading
          ? React.createElement(LoadingPage,
              { message: "Loading..." })
          : shifts.length === 0
          ? React.createElement(EmptyState, {
              icon: "📋",
              title: "No shift templates",
              desc: "Add your first shift template above"
            })
          : React.createElement("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8
              }
            },
              shifts.map(s =>
                React.createElement("div", {
                  key: s.id,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "var(--card2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)"
                  }
                },
                  React.createElement("div", null,
                    React.createElement("span", {
                      style: {
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text)"
                      }
                    }, s.name),
                    React.createElement("span", {
                      style: {
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginLeft: 10
                      }
                    }, `${s.shift_start?.slice(0,5)} - ${
                      s.shift_end?.slice(0,5)}`)
                  ),
                  React.createElement("button", {
                    className: "nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => handleDelete(s.id),
                    style: { color: "var(--danger)" }
                  }, "🗑️")
                )
              )
            )
      ),

      React.createElement("div", { className: "nx-modal-footer" },
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onClose
        }, "Close")
      )
    )
  );
}

/* ============================================================
   screens1.js — Part C
   SEC 8: OwnerAnalytics — 7 Blocks
   ============================================================ */

function OwnerAnalytics({ user }) {
  const [activeBlock, setActiveBlock] = useState("overview");
  const [stats,       setStats]       = useState({});
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  const BLOCKS = [
    { id:"overview",   label:"Overview",         icon:"📊" },
    { id:"employees",  label:"Employees",         icon:"👥" },
    { id:"config",     label:"Configuration",     icon:"⚙️"  },
    { id:"pages",      label:"Pages & Access",    icon:"🔐" },
    { id:"analytics",  label:"Analytics",         icon:"📈" },
    { id:"critical",   label:"Critical Systems",  icon:"🚨" },
    { id:"pirateking", label:"Pirate King",        icon:"🏴‍☠️" },
  ];

  useEffect(() => {
    if (!RC.isOwner(user)) return;
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [empRes, attRes, notifRes] = await Promise.all([
        withRetry(() =>
          sb.from("employees")
            .select("id, full_name, role, department, is_active, is_suspended, status, last_seen, avatar_url, is_online")
            .order("full_name")
        ),
        withRetry(() =>
          sb.from("attendance")
            .select("id, status")
            .gte("clock_in", new Date().toISOString().split("T")[0])
        ),
        withRetry(() =>
          sb.from("notifications")
            .select("id", { count:"exact", head:true })
            .eq("is_read", false)
        ),
      ]);

      setEmployees(empRes.data || []);
      const emps = empRes.data || [];

      setStats({
        total:      emps.length,
        active:     emps.filter(e => e.is_active).length,
        online:     emps.filter(e => e.is_online).length,
        suspended:  emps.filter(e => e.is_suspended).length,
        onBreak:    emps.filter(e => e.status === "onbreak").length,
        inCall:     emps.filter(e => e.status === "incall").length,
        todayAtt:   (attRes.data || []).length,
        unreadNotif:(notifRes.count || 0),
      });
    } catch(e) {
      showToast("Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!RC.isOwner(user)) {
    return React.createElement(EmptyState, {
      icon: "🔒",
      title: "Access Denied",
      desc: "Owner access required"
    });
  }

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading analytics..." });

  return React.createElement("div", { className: "nx-page-enter" },

    React.createElement(PageHeader, {
      title: "Owner Analytics",
      icon: "👑",
      subtitle: "Full system control & monitoring"
    }),

    /* Block Tabs */
    React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 24,
        overflowX: "auto",
        paddingBottom: 4
      }
    },
      BLOCKS.map(b =>
        React.createElement("button", {
          key: b.id,
          className: `nx-btn nx-btn-sm ${
            activeBlock === b.id
              ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => setActiveBlock(b.id),
          style: { whiteSpace: "nowrap" }
        }, `${b.icon} ${b.label}`)
      )
    ),

    /* Block Content */
    activeBlock === "overview"   &&
      React.createElement(OA_Overview,   { stats, employees, user }),
    activeBlock === "employees"  &&
      React.createElement(OA_Employees,  { employees, user, onRefresh: loadStats }),
    activeBlock === "config"     &&
      React.createElement(OA_Config,     { user }),
    activeBlock === "pages"      &&
      React.createElement(OA_Pages,      { user }),
    activeBlock === "analytics"  &&
      React.createElement(OA_Analytics,  { user }),
    activeBlock === "critical"   &&
      React.createElement(OA_Critical,   { user }),
    activeBlock === "pirateking" &&
      React.createElement(OA_PirateKing, { user })
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 1 — OVERVIEW DASHBOARD
   ══════════════════════════════════════════════════════════ */
function OA_Overview({ stats, employees, user }) {
  const liveEmps = employees.filter(e => e.is_online);

  return React.createElement("div", {
    style: { display:"flex", flexDirection:"column", gap:20 }
  },
    /* Stat Cards */
    React.createElement("div", { className:"nx-grid-4" },
      [
        { label:"Total Staff",    value:stats.total,      icon:"👥", color:"var(--primary)" },
        { label:"Online Now",     value:stats.online,     icon:"🟢", color:"#22C55E" },
        { label:"On Break",       value:stats.onBreak,    icon:"☕", color:"#EAB308" },
        { label:"In Call",        value:stats.inCall,     icon:"📞", color:"#3B82F6" },
        { label:"Today Att.",     value:stats.todayAtt,   icon:"✅", color:"#10B981" },
        { label:"Suspended",      value:stats.suspended,  icon:"🚫", color:"#EF4444" },
        { label:"Unread Notifs",  value:stats.unreadNotif,icon:"🔔", color:"#8B5CF6" },
        { label:"Active Accts",   value:stats.active,     icon:"✨", color:"#F97316" },
      ].map(s =>
        React.createElement("div", {
          key: s.label,
          className: "nx-stat-card nx-card-enter"
        },
          React.createElement("div", {
            style: {
              display:"flex", alignItems:"center",
              justifyContent:"space-between"
            }
          },
            React.createElement("span", {
              className:"nx-stat-label"
            }, s.label),
            React.createElement("span", {
              style:{ fontSize:20 }
            }, s.icon)
          ),
          React.createElement("div", {
            className:"nx-stat-value",
            style:{ color: s.color }
          }, s.value ?? "—")
        )
      )
    ),

    /* Live Floor Mini */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title: `🖥️ Live Floor (${liveEmps.length} online)`
      }),
      liveEmps.length === 0
        ? React.createElement("p", {
            style:{ color:"var(--text-muted)", fontSize:13,
                    padding:"20px 0", textAlign:"center" }
          }, "No one online right now")
        : React.createElement("div", {
            style:{
              display:"grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(200px, 1fr))",
              gap:10, marginTop:12
            }
          },
            liveEmps.map(e =>
              React.createElement("div", {
                key: e.id,
                style:{
                  display:"flex", alignItems:"center",
                  gap:8, padding:"8px 12px",
                  background:"var(--card2)",
                  borderRadius:"var(--radius-sm)",
                  border:"1px solid var(--border)"
                }
              },
                React.createElement(NxAvatar,
                  { user:e, size:"xs" }),
                React.createElement("div", {
                  style:{ flex:1, overflow:"hidden" }
                },
                  React.createElement("div", {
                    style:{
                      fontSize:12, fontWeight:600,
                      color:"var(--text)",
                      overflow:"hidden",
                      textOverflow:"ellipsis",
                      whiteSpace:"nowrap"
                    }
                  }, e.full_name),
                  React.createElement(StatusBadge,
                    { status: e.status || "online" })
                )
              )
            )
          )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 2 — EMPLOYEE MANAGEMENT
   ══════════════════════════════════════════════════════════ */
function OA_Employees({ employees, user, onRefresh }) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAdd,    setShowAdd]    = useState(false);
  const [editEmp,    setEditEmp]    = useState(null);
  const [confirmSuspend, setConfirmSuspend] = useState(null);

  const filtered = useMemo(() =>
    employees.filter(e => {
      const matchSearch =
        e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.role?.toLowerCase().includes(search.toLowerCase());
      const matchRole =
        roleFilter === "all" || e.role === roleFilter;
      return matchSearch && matchRole;
    }),
  [employees, search, roleFilter]);

  async function handleSuspend(emp, reason) {
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            is_suspended: !emp.is_suspended,
            suspend_reason: reason || null
          })
          .eq("id", emp.id)
      );
      await logAudit(
        emp.is_suspended ? "UNSUSPEND" : "SUSPEND",
        `${emp.full_name}: ${reason || ""}`,
        user.id, emp.id
      );
      showToast(
        emp.is_suspended
          ? "Account restored" : "Account suspended",
        emp.is_suspended ? "success" : "warning"
      );
      onRefresh();
    } catch(e) {
      showToast("Failed", "error");
    } finally {
      setConfirmSuspend(null);
    }
  }

  async function handleInstantKick(emp) {
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            is_online: false,
            status: "offline",
            last_seen: new Date().toISOString()
          })
          .eq("id", emp.id)
      );
      await logAudit("INSTANT_KICK",
        emp.full_name, user.id, emp.id);
      showToast(`${emp.full_name} kicked`, "warning");
      onRefresh();
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  return React.createElement("div", {
    style:{ display:"flex", flexDirection:"column", gap:16 }
  },
    /* Controls */
    React.createElement("div", {
      style:{
        display:"flex", gap:10,
        flexWrap:"wrap", alignItems:"center"
      }
    },
      React.createElement(SearchInput, {
        value: search,
        onChange: setSearch,
        placeholder: "Search employees..."
      }),
      React.createElement("select", {
        className:"nx-select",
        value: roleFilter,
        onChange: e => setRoleFilter(e.target.value),
        style:{ width:"auto", minWidth:140 }
      },
        React.createElement("option", { value:"all" },
          "All Roles"),
        Object.values(RC).filter(v =>
          typeof v === "string" &&
          ["Owner","Team Leader","Shift Leader","SME","Agent"]
          .includes(v)
        ).map(r =>
          React.createElement("option", { key:r, value:r }, r)
        )
      ),
      React.createElement("button", {
        className:"nx-btn nx-btn-primary nx-btn-sm",
        onClick: () => setShowAdd(true)
      }, "+ Add Employee")
    ),

    /* Count */
    React.createElement("p", {
      style:{ fontSize:12, color:"var(--text-muted)" }
    }, `${filtered.length} of ${employees.length} employees`),

    /* Table */
    React.createElement("div", { className:"nx-table-wrap" },
      React.createElement("table", { className:"nx-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            ["Employee","Role","Status","Dept",
             "Last Seen","Actions"].map(h =>
              React.createElement("th", { key:h }, h)
            )
          )
        ),
        React.createElement("tbody", null,
          filtered.length === 0
            ? React.createElement("tr", null,
                React.createElement("td", {
                  colSpan:6,
                  style:{ textAlign:"center",
                          padding:"30px", color:"var(--text-muted)" }
                }, "No employees found")
              )
            : filtered.map(e =>
                React.createElement("tr", { key:e.id },
                  /* Name */
                  React.createElement("td", null,
                    React.createElement("div", {
                      style:{
                        display:"flex",
                        alignItems:"center", gap:8
                      }
                    },
                      React.createElement(NxAvatar,
                        { user:e, size:"xs" }),
                      React.createElement("div", null,
                        React.createElement("div", {
                          style:{
                            fontSize:13, fontWeight:600,
                            color:"var(--text)"
                          }
                        }, e.full_name),
                        e.is_suspended &&
                        React.createElement("span", {
                          className:"nx-badge nx-badge-danger",
                          style:{ fontSize:9 }
                        }, "SUSPENDED")
                      )
                    )
                  ),
                  /* Role */
                  React.createElement("td", null,
                    React.createElement(RoleBadge,
                      { role:e.role })
                  ),
                  /* Status */
                  React.createElement("td", null,
                    React.createElement(StatusBadge, {
                      status: e.status || "offline"
                    })
                  ),
                  /* Dept */
                  React.createElement("td", {
                    style:{
                      fontSize:12,
                      color:"var(--text-sub)"
                    }
                  }, e.department || "—"),
                  /* Last Seen */
                  React.createElement("td", {
                    style:{
                      fontSize:11,
                      color:"var(--text-muted)"
                    }
                  }, fmtRelative(e.last_seen)),
                  /* Actions */
                  React.createElement("td", null,
                    React.createElement("div", {
                      style:{ display:"flex", gap:4 }
                    },
                      React.createElement("button", {
                        className:"nx-btn nx-btn-secondary nx-btn-icon-sm",
                        onClick: () => setEditEmp(e),
                        title:"Edit"
                      }, "✏️"),
                      e.is_online &&
                      React.createElement("button", {
                        className:"nx-btn nx-btn-danger nx-btn-icon-sm",
                        onClick: () => handleInstantKick(e),
                        title:"Kick"
                      }, "⚡"),
                      React.createElement("button", {
                        className:`nx-btn nx-btn-icon-sm ${
                          e.is_suspended
                            ? "nx-btn-success"
                            : "nx-btn-danger"}`,
                        onClick: () => setConfirmSuspend(e),
                        title: e.is_suspended
                          ? "Restore" : "Suspend"
                      }, e.is_suspended ? "✅" : "🚫")
                    )
                  )
                )
              )
        )
      )
    ),

    /* Add Employee Modal */
    showAdd && React.createElement(AddEmployeeModal, {
      user,
      onClose: () => setShowAdd(false),
      onAdded: () => {
        setShowAdd(false);
        onRefresh();
        showToast("Employee added!", "success");
      }
    }),

    /* Edit Employee Modal */
    editEmp && React.createElement(EditEmployeeModal, {
      emp: editEmp,
      user,
      onClose: () => setEditEmp(null),
      onSaved: () => {
        setEditEmp(null);
        onRefresh();
        showToast("Employee updated!", "success");
      }
    }),

    /* Suspend Confirm */
    confirmSuspend && React.createElement(SuspendConfirmModal, {
      emp: confirmSuspend,
      onConfirm: (reason) =>
        handleSuspend(confirmSuspend, reason),
      onCancel: () => setConfirmSuspend(null)
    })
  );
}

/* Add Employee Modal */
function AddEmployeeModal({ user, onClose, onAdded }) {
  const [form, setForm] = useState({
    full_name:"", email:"", password:"",
    role:"Agent", department:"", employee_id:""
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim() ||
        !form.password.trim()) {
      showToast("Name, email and password required", "warning");
      return;
    }
    if (form.password.length < 6) {
      showToast("Password min 6 characters", "warning");
      return;
    }
    setSaving(true);
    try {
      /* إنشاء Auth User */
      const { data: authData, error: authErr } =
        await sb.auth.admin.createUser({
          email: form.email.trim(),
          password: form.password,
          email_confirm: true
        });

      if (authErr) throw authErr;

      /* إنشاء Employee Record */
      await withRetry(() =>
        sb.from("employees").insert({
          auth_id:     authData.user.id,
          full_name:   form.full_name.trim(),
          email:       form.email.trim(),
          role:        form.role,
          department:  form.department.trim() || null,
          employee_id: form.employee_id.trim() || null,
          is_active:   true,
          is_suspended:false,
          is_owner:    false,
          status:      "offline",
          is_online:   false,
          created_at:  new Date().toISOString()
        })
      );

      await logAudit("ADD_EMPLOYEE",
        form.full_name, user.id);
      onAdded();
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className:"nx-modal-backdrop", onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "👤 Add Employee"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{
            display:"flex", flexDirection:"column", gap:14
          }
        },
          [
            { key:"full_name",   label:"Full Name *",    type:"text",     ph:"John Smith" },
            { key:"email",       label:"Email *",        type:"email",    ph:"john@company.com" },
            { key:"password",    label:"Password *",     type:"password", ph:"Min 6 chars" },
            { key:"employee_id", label:"Employee ID",    type:"text",     ph:"EMP001" },
            { key:"department",  label:"Department",     type:"text",     ph:"Customer Service" },
          ].map(f =>
            React.createElement("div", {
              key:f.key, className:"nx-form-group"
            },
              React.createElement("label", {
                className:"nx-label"
              }, f.label),
              React.createElement("input", {
                type: f.type,
                className:"nx-input",
                placeholder: f.ph,
                value: form[f.key],
                onChange: e => setForm(p => ({
                  ...p, [f.key]: e.target.value
                }))
              })
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Role"),
            React.createElement("select", {
              className:"nx-select",
              value: form.role,
              onChange: e => setForm(p => ({
                ...p, role: e.target.value
              }))
            },
              ["Agent","SME","Shift Leader",
               "Team Leader"].map(r =>
                React.createElement("option", {
                  key:r, value:r
                }, r)
              )
            )
          )
        )
      ),
      React.createElement("div", { className:"nx-modal-footer" },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Cancel"),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick:handleSave,
          disabled:saving
        }, saving ? React.createElement(Spinner) : "Add Employee")
      )
    )
  );
}

/* Edit Employee Modal */
function EditEmployeeModal({ emp, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name:  emp.full_name  || "",
    role:       emp.role       || "Agent",
    department: emp.department || "",
    employee_id:emp.employee_id|| "",
    is_active:  emp.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.full_name.trim()) {
      showToast("Name required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            full_name:   form.full_name.trim(),
            role:        form.role,
            department:  form.department.trim() || null,
            employee_id: form.employee_id.trim() || null,
            is_active:   form.is_active,
            updated_at:  new Date().toISOString()
          })
          .eq("id", emp.id)
      );
      await logAudit("EDIT_EMPLOYEE",
        form.full_name, user.id, emp.id);
      onSaved();
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className:"nx-modal-backdrop", onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, `✏️ Edit — ${emp.full_name}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{
            display:"flex", flexDirection:"column", gap:14
          }
        },
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Full Name"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              value: form.full_name,
              onChange: e => setForm(p => ({
                ...p, full_name: e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Role"),
            React.createElement("select", {
              className:"nx-select",
              value: form.role,
              onChange: e => setForm(p => ({
                ...p, role: e.target.value
              }))
            },
              ["Agent","SME","Shift Leader","Team Leader"]
              .map(r =>
                React.createElement("option", {
                  key:r, value:r
                }, r)
              )
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Department"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              value: form.department,
              onChange: e => setForm(p => ({
                ...p, department: e.target.value
              }))
            })
          ),
          React.createElement("label", {
            className:"nx-checkbox-wrap"
          },
            React.createElement("div", {
              className:`nx-checkbox ${form.is_active ? "checked":""}`,
              onClick: () => setForm(p => ({
                ...p, is_active: !p.is_active
              }))
            }, form.is_active ? "✓" : ""),
            React.createElement("span", {
              style:{ fontSize:13, color:"var(--text-sub)" }
            }, "Active Account")
          )
        )
      ),
      React.createElement("div", { className:"nx-modal-footer" },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Cancel"),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick:handleSave,
          disabled:saving
        }, saving ? React.createElement(Spinner) : "Save Changes")
      )
    )
  );
}

/* Suspend Confirm Modal */
function SuspendConfirmModal({ emp, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  return React.createElement("div", {
    className:"nx-modal-backdrop", onClick:onCancel
  },
    React.createElement("div", {
      className:"nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, emp.is_suspended
          ? `✅ Restore ${emp.full_name}`
          : `🚫 Suspend ${emp.full_name}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onCancel
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        !emp.is_suspended &&
        React.createElement("div", {
          style:{
            display:"flex", flexDirection:"column", gap:12
          }
        },
          React.createElement("p", {
            style:{
              fontSize:13, color:"var(--text-sub)",
              lineHeight:1.5
            }
          }, "This will immediately log out the employee and block all access."),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Reason (shown to employee)"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Reason for suspension...",
              value:reason,
              rows:3,
              onChange: e => setReason(e.target.value)
            })
          )
        ),
        emp.is_suspended &&
        React.createElement("p", {
          style:{
            fontSize:13, color:"var(--text-sub)"
          }
        }, `Restore access for ${emp.full_name}?`)
      ),
      React.createElement("div", { className:"nx-modal-footer" },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onCancel
        }, "Cancel"),
        React.createElement("button", {
          className:`nx-btn ${emp.is_suspended
            ? "nx-btn-success" : "nx-btn-danger"}`,
          onClick: () => onConfirm(reason)
        }, emp.is_suspended ? "Restore Access" : "Suspend Now")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 3 — SYSTEM CONFIGURATION
   ══════════════════════════════════════════════════════════ */
function OA_Config({ user }) {
  const [config, setConfig] = useState({
    office_lat:       "",
    office_lng:       "",
    gps_radius:       "10",
    late_minutes:     "7",
    absent_minutes:   "60",
    max_break_minutes:"15",
    break_count_day:  "2",
    work_start:       "08:00",
    work_end:         "17:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    try {
      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", Object.keys(config))
      );
      if (data) {
        const map = {};
        data.forEach(r => { map[r.key] = r.value; });
        setConfig(p => ({ ...p, ...map }));
      }
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rows = Object.entries(config).map(([key, value]) => ({
        key, value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }));
      await withRetry(() =>
        sb.from("system_settings")
          .upsert(rows, { onConflict:"key" })
      );
      await logAudit("UPDATE_CONFIG",
        "System configuration updated", user.id);
      showToast("Configuration saved!", "success");
    } catch(e) {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading config..." });

  const sections = [
    {
      title:"📍 GPS & Attendance",
      fields:[
        { key:"office_lat",     label:"Office Latitude",   type:"text", ph:"24.7136" },
        { key:"office_lng",     label:"Office Longitude",  type:"text", ph:"46.6753" },
        { key:"gps_radius",     label:"GPS Radius (meters)",type:"number",ph:"10" },
        { key:"late_minutes",   label:"Late After (mins)", type:"number",ph:"7" },
        { key:"absent_minutes", label:"Absent After (mins)",type:"number",ph:"60" },
      ]
    },
    {
      title:"☕ Break Settings",
      fields:[
        { key:"max_break_minutes",label:"Max Break (mins)", type:"number",ph:"15" },
        { key:"break_count_day",  label:"Breaks Per Day",   type:"number",ph:"2" },
      ]
    },
    {
      title:"🕐 Work Hours",
      fields:[
        { key:"work_start", label:"Work Start", type:"time", ph:"" },
        { key:"work_end",   label:"Work End",   type:"time", ph:"" },
      ]
    },
  ];

  return React.createElement("div", {
    style:{ display:"flex", flexDirection:"column", gap:20 }
  },
    sections.map(sec =>
      React.createElement("div", {
        key:sec.title, className:"nx-card"
      },
        React.createElement(SectionHeader, { title:sec.title }),
        React.createElement("div", {
          className:"nx-grid-2",
          style:{ marginTop:16 }
        },
          sec.fields.map(f =>
            React.createElement("div", {
              key:f.key, className:"nx-form-group"
            },
              React.createElement("label", {
                className:"nx-label"
              }, f.label),
              React.createElement("input", {
                type:f.type,
                className:"nx-input",
                placeholder:f.ph,
                value:config[f.key] || "",
                onChange: e => setConfig(p => ({
                  ...p, [f.key]: e.target.value
                }))
              })
            )
          )
        )
      )
    ),

    /* Theme Image Manager */
    React.createElement(OA_ThemeImages, { user }),

    React.createElement("div", {
      style:{ display:"flex", justifyContent:"flex-end" }
    },
      React.createElement("button", {
        className:"nx-btn nx-btn-primary",
        onClick:handleSave,
        disabled:saving
      }, saving
        ? React.createElement(Spinner)
        : "💾 Save Configuration")
    )
  );
}

/* ══════════════════════════════════════════════════════════
   THEME IMAGE MANAGER (داخل Config)
   ══════════════════════════════════════════════════════════ */
function OA_ThemeImages({ user }) {
  const [activeTheme, setActiveTheme] = useState("nika");
  const [images,      setImages]      = useState({});
  const [urlInput,    setUrlInput]    = useState("");
  const [activePage,  setActivePage]  = useState("default");
  const [uploading,   setUploading]   = useState(false);
  const [preview,     setPreview]     = useState(null);

  const IMAGE_THEMES = [
    { id:"nika",    label:"NIKA",    icon:"🌟" },
    { id:"zoro",    label:"ZORO",    icon:"⚔️"  },
    { id:"porsche", label:"PORSCHE", icon:"🏎️",  perPage:true },
    { id:"raptor",  label:"RAPTOR",  icon:"🚙", perPage:true },
  ];

  const PER_PAGE_OPTIONS = [
    "default","Updates Feed","Schedule","Attendance",
    "Live Floor","Performance","Owner Analytics"
  ];

  const currentTheme = IMAGE_THEMES.find(t => t.id === activeTheme);

  useEffect(() => { loadImages(); }, [activeTheme]);

  async function loadImages() {
    try {
      const keys = currentTheme?.perPage
        ? PER_PAGE_OPTIONS.map(p =>
            `theme_img_${activeTheme}_${p}`)
        : [`theme_img_${activeTheme}_default`];

      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", keys)
      );

      const map = {};
      (data || []).forEach(r => {
        const page = r.key.replace(
          `theme_img_${activeTheme}_`, "");
        map[page] = r.value;
      });
      setImages(map);
    } catch(e) {}
  }

  async function handleUpload(file) {
    setUploading(true);
    try {
      const url = await ThemeImageMgr.upload(
        file, activeTheme, activePage, user.id
      );
      setImages(p => ({ ...p, [activePage]: url }));
      setPreview(url);
      showToast("Image uploaded! ✅", "success");
      await applyPageBackground(activeTheme, activePage);
    } catch(e) {
      showToast("Upload failed: " + e.message, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlSave() {
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      await ThemeImageMgr.setUrl(
        urlInput.trim(), activeTheme, activePage, user.id
      );
      setImages(p => ({ ...p, [activePage]: urlInput.trim() }));
      setPreview(urlInput.trim());
      setUrlInput("");
      showToast("Image URL saved! ✅", "success");
    } catch(e) {
      showToast("Failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    try {
      await ThemeImageMgr.reset(activeTheme, activePage);
      setImages(p => {
        const n = { ...p };
        delete n[activePage];
        return n;
      });
      setPreview(null);
      showToast("Reset to default", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const currentImg = images[activePage] ||
    DEFAULT_IMAGES[activeTheme]?.[activePage] ||
    DEFAULT_IMAGES[activeTheme]?.default;

  return React.createElement("div", { className:"nx-card" },
    React.createElement(SectionHeader, {
      title:"🎨 Theme Image Manager"
    }),

    /* Theme Selector */
    React.createElement("div", {
      style:{
        display:"flex", gap:8,
        marginTop:16, marginBottom:16
      }
    },
      IMAGE_THEMES.map(t =>
        React.createElement("button", {
          key:t.id,
          className:`nx-btn nx-btn-sm ${
            activeTheme === t.id
              ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => {
            setActiveTheme(t.id);
            setActivePage("default");
            setPreview(null);
          }
        }, `${t.icon} ${t.label}`)
      )
    ),

    /* Page Selector (للثيمات التي تدعم صور لكل صفحة) */
    currentTheme?.perPage &&
    React.createElement("div", {
      style:{ marginBottom:16 }
    },
      React.createElement("label", {
        className:"nx-label",
        style:{ marginBottom:6, display:"block" }
      }, "Page"),
      React.createElement("select", {
        className:"nx-select",
        value:activePage,
        onChange: e => {
          setActivePage(e.target.value);
          setPreview(null);
        },
        style:{ maxWidth:240 }
      },
        PER_PAGE_OPTIONS.map(p =>
          React.createElement("option", {
            key:p, value:p
          }, p === "default" ? "All Pages (Default)" : p)
        )
      )
    ),

    /* Preview */
    React.createElement("div", {
      style:{
        width:"100%", height:160,
        borderRadius:"var(--radius)",
        overflow:"hidden",
        border:"1px solid var(--border)",
        marginBottom:16,
        position:"relative",
        background:"var(--card2)"
      }
    },
      currentImg &&
      React.createElement("img", {
        src: preview || currentImg,
        alt:"Preview",
        style:{
          width:"100%", height:"100%",
          objectFit:"cover"
        },
        onError: e => { e.target.style.display = "none"; }
      }),
      React.createElement("div", {
        style:{
          position:"absolute", bottom:8, left:8,
          background:"rgba(0,0,0,0.6)",
          color:"#fff", fontSize:10,
          padding:"3px 8px",
          borderRadius:4, fontWeight:600
        }
      }, images[activePage]
        ? "✅ Custom Image"
        : "📌 Default Image")
    ),

    /* Upload Controls */
    React.createElement("div", {
      style:{
        display:"flex", gap:10,
        flexWrap:"wrap", alignItems:"flex-end"
      }
    },
      /* Upload from Device */
      React.createElement("div", null,
        React.createElement("label", {
          className:"nx-label",
          style:{ marginBottom:6, display:"block" }
        }, "Upload from Device"),
        React.createElement(FileUploadBtn, {
          onFile: handleUpload,
          accept:"image/*",
          label: uploading ? "Uploading..." : "Choose Image",
          capture: undefined
        })
      ),

      /* URL Input */
      React.createElement("div", {
        style:{ flex:1, minWidth:200 }
      },
        React.createElement("label", {
          className:"nx-label",
          style:{ marginBottom:6, display:"block" }
        }, "Or Paste URL"),
        React.createElement("div", {
          style:{ display:"flex", gap:6 }
        },
          React.createElement("input", {
            type:"text",
            className:"nx-input",
            placeholder:"https://...",
            value:urlInput,
            onChange: e => setUrlInput(e.target.value),
            onKeyDown: e => {
              if (e.key === "Enter") handleUrlSave();
            }
          }),
          React.createElement("button", {
            className:"nx-btn nx-btn-primary nx-btn-sm",
            onClick:handleUrlSave,
            disabled:!urlInput.trim() || uploading
          }, "Save")
        )
      ),

      /* Reset */
      images[activePage] &&
      React.createElement("div", null,
        React.createElement("label", {
          className:"nx-label",
          style:{ marginBottom:6, display:"block" }
        }, "Reset"),
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary nx-btn-sm",
          onClick:handleReset
        }, "🔄 Default")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 4 — PAGE & PERMISSION CONTROL
   ══════════════════════════════════════════════════════════ */
function OA_Pages({ user }) {
  const [overrides, setOverrides] = useState({});
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { loadOverrides(); }, []);

  async function loadOverrides() {
    try {
      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .like("key", "page_access_%")
      );
      const map = {};
      (data || []).forEach(r => {
        const page = r.key.replace("page_access_", "");
        try { map[page] = JSON.parse(r.value); }
        catch(e) {}
      });
      setOverrides(map);
    } catch(e) {}
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rows = Object.entries(overrides).map(
        ([page, roles]) => ({
          key: `page_access_${page}`,
          value: JSON.stringify(roles),
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
      );
      if (rows.length > 0) {
        await withRetry(() =>
          sb.from("system_settings")
            .upsert(rows, { onConflict:"key" })
        );
      }
      await logAudit("UPDATE_PAGE_ACCESS",
        "Page permissions updated", user.id);
      showToast("Permissions saved!", "success");
    } catch(e) {
      showToast("Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  const ALL_ROLES = ["Owner","Team Leader",
    "Shift Leader","SME","Agent"];

  return React.createElement("div", {
    style:{ display:"flex", flexDirection:"column", gap:16 }
  },
    React.createElement("div", {
      className:"nx-alert nx-alert-info"
    },
      React.createElement("span", {
        className:"nx-alert-icon"
      }, "ℹ️"),
      "Changes here override default page access. Owner always has full access."
    ),

    React.createElement("div", { className:"nx-table-wrap" },
      React.createElement("table", { className:"nx-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            React.createElement("th", null, "Page"),
            ALL_ROLES.map(r =>
              React.createElement("th", {
                key:r,
                style:{ textAlign:"center",
                        color: RC.color[r] }
              }, RC.icon[r])
            )
          )
        ),
        React.createElement("tbody", null,
          Object.entries(PA).map(([page, defaultRoles]) => {
            const current = overrides[page] || defaultRoles;
            return React.createElement("tr", { key:page },
              React.createElement("td", {
                style:{ fontSize:12, fontWeight:600 }
              },
                `${PI[page] || "📄"} ${page}`
              ),
              ALL_ROLES.map(role =>
                React.createElement("td", {
                  key:role,
                  style:{ textAlign:"center" }
                },
                  React.createElement("div", {
                    className:`nx-checkbox ${
                      current.includes(role) ? "checked":""}`,
                    style:{ margin:"0 auto" },
                    onClick: () => {
                      if (role === "Owner") return;
                      setOverrides(p => {
                        const cur = p[page] || defaultRoles;
                        const next = cur.includes(role)
                          ? cur.filter(r => r !== role)
                          : [...cur, role];
                        return { ...p, [page]: next };
                      });
                    }
                  }, current.includes(role) ? "✓" : "")
                )
              )
            );
          })
        )
      )
    ),

    React.createElement("div", {
      style:{ display:"flex", justifyContent:"flex-end" }
    },
      React.createElement("button", {
        className:"nx-btn nx-btn-primary",
        onClick:handleSave,
        disabled:saving
      }, saving
        ? React.createElement(Spinner)
        : "💾 Save Permissions")
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 5 — ANALYTICS & REPORTS
   ══════════════════════════════════════════════════════════ */
function OA_Analytics({ user }) {
  const [period,  setPeriod]  = useState("week");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, [period]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const now  = new Date();
      let from;
      if (period === "today") {
        from = new Date(now);
        from.setHours(0,0,0,0);
      } else if (period === "week") {
        from = new Date(now);
        from.setDate(from.getDate() - 7);
      } else {
        from = new Date(now);
        from.setMonth(from.getMonth() - 1);
      }

      const fromISO = from.toISOString();

      const [attRes, breakRes, auditRes] = await Promise.all([
        withRetry(() =>
          sb.from("attendance")
            .select("id, status, clock_in, employee_id")
            .gte("clock_in", fromISO)
        ),
        withRetry(() =>
          sb.from("breaks")
            .select("id, duration_minutes, employee_id")
            .gte("created_at", fromISO)
        ),
        withRetry(() =>
          sb.from("audit_log")
            .select("id, action, created_at")
            .gte("created_at", fromISO)
            .order("created_at", { ascending:false })
            .limit(20)
        ),
      ]);

      const att   = attRes.data   || [];
      const brks  = breakRes.data || [];
      const audit = auditRes.data || [];

      const onTime = att.filter(a => a.status === "on_time").length;
      const late   = att.filter(a => a.status === "late").length;
      const absent = att.filter(a => a.status === "absent").length;

      const totalBreakMins = brks.reduce(
        (s, b) => s + (b.duration_minutes || 0), 0
      );
      const avgBreak = brks.length > 0
        ? Math.round(totalBreakMins / brks.length) : 0;

      setData({
        attendance: { onTime, late, absent,
                      total: att.length },
        breaks: { total: brks.length, avgMins: avgBreak },
        audit,
      });
    } catch(e) {
      showToast("Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading analytics..." });

  return React.createElement("div", {
    style:{ display:"flex", flexDirection:"column", gap:20 }
  },
    /* Period Filter */
    React.createElement(Tabs, {
      tabs:[
        { id:"today", label:"Today" },
        { id:"week",  label:"This Week" },
        { id:"month", label:"This Month" },
      ],
      active:period,
      onChange:setPeriod
    }),

    /* Attendance Stats */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"✅ Attendance Summary"
      }),
      React.createElement("div", {
        className:"nx-grid-4",
        style:{ marginTop:16 }
      },
        [
          { label:"On Time", value:data?.attendance.onTime,
            color:"#22C55E" },
          { label:"Late",    value:data?.attendance.late,
            color:"#EAB308" },
          { label:"Absent",  value:data?.attendance.absent,
            color:"#EF4444" },
          { label:"Total",   value:data?.attendance.total,
            color:"var(--primary)" },
        ].map(s =>
          React.createElement("div", {
            key:s.label, className:"nx-stat-card"
          },
            React.createElement("div", {
              className:"nx-stat-label"
            }, s.label),
            React.createElement("div", {
              className:"nx-stat-value",
              style:{ color:s.color, fontSize:24 }
            }, s.value ?? 0)
          )
        )
      )
    ),

    /* Break Stats */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"☕ Break Summary"
      }),
      React.createElement("div", {
        className:"nx-grid-2",
        style:{ marginTop:16 }
      },
        [
          { label:"Total Breaks",
            value:data?.breaks.total },
          { label:"Avg Duration",
            value:`${data?.breaks.avgMins || 0} min` },
        ].map(s =>
          React.createElement("div", {
            key:s.label, className:"nx-stat-card"
          },
            React.createElement("div", {
              className:"nx-stat-label"
            }, s.label),
            React.createElement("div", {
              className:"nx-stat-value",
              style:{ fontSize:22 }
            }, s.value)
          )
        )
      )
    ),

    /* Recent Audit */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"🕐 Recent Activity"
      }),
      React.createElement("div", {
        style:{
          display:"flex", flexDirection:"column",
          gap:8, marginTop:12
        }
      },
        (data?.audit || []).length === 0
          ? React.createElement("p", {
              style:{
                color:"var(--text-muted)",
                fontSize:13, textAlign:"center",
                padding:"20px 0"
              }
            }, "No activity in this period")
          : (data?.audit || []).map(a =>
              React.createElement("div", {
                key:a.id,
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  padding:"8px 12px",
                  background:"var(--card2)",
                  borderRadius:"var(--radius-sm)",
                  border:"1px solid var(--border)"
                }
              },
                React.createElement("span", {
                  style:{
                    fontSize:12,
                    fontWeight:600,
                    color:"var(--text)"
                  }
                }, a.action),
                React.createElement("span", {
                  style:{
                    fontSize:11,
                    color:"var(--text-muted)"
                  }
                }, fmtRelative(a.created_at))
              )
            )
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 6 — CRITICAL SYSTEMS CONTROL
   ══════════════════════════════════════════════════════════ */
function OA_Critical({ user }) {
  const [frozen,       setFrozen]       = useState(false);
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerText,   setBannerText]   = useState("");
  const [bannerType,   setBannerType]   = useState("info");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
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
      setFrozen(map.system_frozen === "true");
      setBannerActive(map.banner_active === "true");
      setBannerText(map.banner_text || "");
      setBannerType(map.banner_type || "info");
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  async function toggleFreeze() {
    setSaving(true);
    try {
      const newVal = !frozen;
      await withRetry(() =>
        sb.from("system_settings").upsert({
          key:"system_frozen",
          value: String(newVal),
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict:"key" })
      );
      setFrozen(newVal);
      await logAudit(
        newVal ? "FREEZE_SYSTEM" : "UNFREEZE_SYSTEM",
        "", user.id
      );
      showToast(
        newVal ? "⚠️ System frozen!" : "✅ System unfrozen",
        newVal ? "warning" : "success"
      );
    } catch(e) {
      showToast("Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveBanner() {
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("system_settings").upsert([
          { key:"banner_active", value:String(bannerActive),
            updated_by:user.id,
            updated_at:new Date().toISOString() },
          { key:"banner_text",   value:bannerText,
            updated_by:user.id,
            updated_at:new Date().toISOString() },
          { key:"banner_type",   value:bannerType,
            updated_by:user.id,
            updated_at:new Date().toISOString() },
        ], { onConflict:"key" })
      );
      await logAudit("UPDATE_BANNER", bannerText, user.id);
      showToast("Banner updated!", "success");
    } catch(e) {
      showToast("Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading..." });

  return React.createElement("div", {
    style:{ display:"flex", flexDirection:"column", gap:20 }
  },
    /* Freeze System */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"🔒 System Freeze"
      }),
      React.createElement("p", {
        style:{
          fontSize:13, color:"var(--text-sub)",
          lineHeight:1.6, margin:"12px 0"
        }
      }, "Freezing the system will lock all employees out immediately. Only you (Owner) can access the system while frozen."),
      React.createElement("div", {
        style:{ display:"flex", alignItems:"center", gap:16 }
      },
        React.createElement("div", {
          style:{
            padding:"10px 16px",
            borderRadius:"var(--radius-sm)",
            background: frozen
              ? "rgba(248,81,73,0.12)"
              : "rgba(63,185,80,0.12)",
            border: `1px solid ${frozen
              ? "rgba(248,81,73,0.30)"
              : "rgba(63,185,80,0.30)"}`,
            fontSize:13, fontWeight:700,
            color: frozen
              ? "var(--danger)" : "var(--success)"
          }
        }, frozen ? "🔴 SYSTEM FROZEN" : "🟢 SYSTEM ACTIVE"),
        React.createElement("button", {
          className:`nx-btn ${frozen
            ? "nx-btn-success" : "nx-btn-danger"}`,
          onClick:toggleFreeze,
          disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : frozen ? "🔓 Unfreeze System"
                   : "🔒 Freeze System")
      )
    ),

    /* Status Banner */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"📢 Status Banner"
      }),
      React.createElement("div", {
        style:{
          display:"flex", flexDirection:"column",
          gap:14, marginTop:16
        }
      },
        React.createElement("label", {
          className:"nx-checkbox-wrap"
        },
          React.createElement("div", {
            className:`nx-checkbox ${bannerActive ? "checked":""}`,
            onClick: () => setBannerActive(p => !p)
          }, bannerActive ? "✓" : ""),
          React.createElement("span", {
            style:{ fontSize:13, color:"var(--text-sub)" }
          }, "Show banner to all employees")
        ),
        React.createElement("div", { className:"nx-form-group" },
          React.createElement("label", {
            className:"nx-label"
          }, "Banner Message"),
          React.createElement("input", {
            type:"text",
            className:"nx-input",
            placeholder:"System maintenance at 3PM...",
            value:bannerText,
            onChange: e => setBannerText(e.target.value)
          })
        ),
        React.createElement("div", { className:"nx-form-group" },
          React.createElement("label", {
            className:"nx-label"
          }, "Banner Type"),
          React.createElement("div", {
            style:{ display:"flex", gap:8 }
          },
            ["info","warning","danger"].map(t =>
              React.createElement("button", {
                key:t,
                className:`nx-btn nx-btn-sm ${
                  bannerType === t
                    ? "nx-btn-primary"
                    : "nx-btn-secondary"}`,
                onClick: () => setBannerType(t)
              },
                t === "info"    ? "ℹ️ Info" :
                t === "warning" ? "⚠️ Warning" :
                                  "🚨 Danger"
              )
            )
          )
        ),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick:saveBanner,
          disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "💾 Save Banner")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   BLOCK 7 — PIRATE KING EXCLUSIVE
   ══════════════════════════════════════════════════════════ */
function OA_PirateKing({ user }) {
  const [theme,    setTheme]    = useState(ThemeMgr.get());
  const [showReset,setShowReset]= useState(false);

  function handleThemeChange(themeId) {
    ThemeMgr.set(themeId, user);
    setTheme(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    showToast(`Theme: ${themeId}`, "success");
  }

  async function handleResetAllData() {
    try {
      await withRetry(() =>
        sb.from("notifications")
          .delete()
          .lt("created_at",
            new Date(Date.now() - 90*24*3600*1000).toISOString())
      );
      await logAudit("CLEANUP_DATA",
        "Old notifications cleaned", user.id);
      showToast("Old data cleaned!", "success");
      setShowReset(false);
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  return React.createElement("div", {
    style:{ display:"flex", flexDirection:"column", gap:20 }
  },
    /* Pirate King Header */
    React.createElement("div", {
      className:"nx-card",
      style:{
        background:"linear-gradient(135deg, #1a1a1a, #2a2000)",
        border:"1px solid rgba(255,215,0,0.25)",
        textAlign:"center",
        padding:"32px"
      }
    },
      React.createElement("div", {
        style:{ fontSize:56, marginBottom:8 }
      }, "🏴‍☠️"),
      React.createElement("h2", {
        style:{
          fontSize:22, fontWeight:900,
          background:"linear-gradient(135deg, #FFD700, #FF6B00)",
          WebkitBackgroundClip:"text",
          WebkitTextFillColor:"transparent",
          backgroundClip:"text",
          marginBottom:4
        }
      }, "PIRATE KING PANEL"),
      React.createElement("p", {
        style:{
          fontSize:13,
          color:"rgba(255,215,0,0.6)"
        }
      }, "⚓ Exclusive Owner Controls")
    ),

    /* Theme Control */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"🎨 Theme Control"
      }),
      React.createElement("div", {
        style:{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(90px, 1fr))",
          gap:10, marginTop:16
        }
      },
        ThemeMgr.getAvailable(user).map(t =>
          React.createElement("div", {
            key:t.id,
            className:`nx-theme-swatch ${
              theme === t.id ? "active":""}`,
            style:{
              background: theme === t.id
                ? "var(--primary-glow)"
                : "var(--card2)",
              border: theme === t.id
                ? "2px solid var(--primary)"
                : "2px solid var(--border)"
            },
            onClick: () => handleThemeChange(t.id)
          },
            React.createElement("div", {
              className:"nx-theme-dot",
              style:{ background:t.bg }
            }),
            React.createElement("div", {
              style:{
                fontSize:10, fontWeight:600,
                color:"var(--text-sub)",
                marginTop:4
              }
            }, t.label)
          )
        )
      )
    ),

    /* Data Maintenance */
    React.createElement("div", { className:"nx-card" },
      React.createElement(SectionHeader, {
        title:"🗄️ Data Maintenance"
      }),
      React.createElement("div", {
        style:{
          display:"flex", flexDirection:"column",
          gap:12, marginTop:16
        }
      },
        React.createElement("div", {
          style:{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            padding:"12px 16px",
            background:"var(--card2)",
            borderRadius:"var(--radius-sm)",
            border:"1px solid var(--border)"
          }
        },
          React.createElement("div", null,
            React.createElement("div", {
              style:{
                fontSize:13, fontWeight:600,
                color:"var(--text)"
              }
            }, "Clean Old Notifications"),
            React.createElement("div", {
              style:{
                fontSize:11,
                color:"var(--text-muted)",
                marginTop:2
              }
            }, "Delete notifications older than 90 days")
          ),
          React.createElement("button", {
            className:"nx-btn nx-btn-warning nx-btn-sm",
            onClick: () => setShowReset(true),
            style:{
              background:"rgba(210,153,34,0.15)",
              color:"var(--warning)",
              border:"1px solid rgba(210,153,34,0.30)"
            }
          }, "🧹 Clean")
        )
      )
    ),

    /* Confirm Reset */
    React.createElement(ConfirmModal, {
      open:showReset,
      title:"🧹 Clean Old Data",
      message:"Delete all notifications older than 90 days? This cannot be undone.",
      danger:true,
      onConfirm:handleResetAllData,
      onCancel: () => setShowReset(false)
    })
  );
}

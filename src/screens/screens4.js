/* ============================================================
   NEXUS-CSOPS v4.2.0
   screens4.js
   SEC 24: MyProfile
   SEC 25: MyWorkspace
   SEC 26: AuditLog
   SEC 27: Announcements
   SEC 28: ReportsNotes
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 24 — MY PROFILE
   ══════════════════════════════════════════════════════════ */
function MyProfilePage({ user, onUserUpdate }) {
  const [profile,      setProfile]      = useState({ ...user });
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [activeTab,    setActiveTab]    = useState("profile");
  const [showPassModal,setShowPassModal]= useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const theme = ThemeMgr.get();

  async function handleSave() {
    if (!profile.full_name?.trim()) {
      showToast("Name required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            full_name:  profile.full_name.trim(),
            department: profile.department?.trim() || null,
            phone:      profile.phone?.trim()      || null,
            bio:        profile.bio?.trim()         || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id)
      );

      const updated = { ...user, ...profile };
      localStorage.setItem("nx_user", JSON.stringify(updated));
      onUserUpdate(updated);
      await logAudit("UPDATE_PROFILE", "Profile updated", user.id);
      showToast("Profile saved! ✅", "success");
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(file) {
    setUploadingAvatar(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: upErr } = await sb.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = sb.storage
        .from("avatars")
        .getPublicUrl(path);

      const avatarUrl = urlData.publicUrl +
        `?t=${Date.now()}`;

      await withRetry(() =>
        sb.from("employees")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id)
      );

      const updated = { ...user, avatar_url: avatarUrl };
      localStorage.setItem("nx_user", JSON.stringify(updated));
      setProfile(p => ({ ...p, avatar_url: avatarUrl }));
      onUserUpdate(updated);
      showToast("Avatar updated! ✅", "success");
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleThemeChange(themeId) {
    ThemeMgr.set(themeId, user);
    document.documentElement
      .setAttribute("data-theme", themeId);
    showToast(`Theme: ${themeId}`, "success");
  }

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "My Profile",
      icon:  "👤"
    }),

    React.createElement(Tabs, {
      tabs: [
        { id:"profile",  label:"Profile" },
        { id:"theme",    label:"Theme" },
        { id:"security", label:"Security" },
        { id:"stats",    label:"My Stats" },
      ],
      active: activeTab,
      onChange: setActiveTab
    }),

    React.createElement("div", {
      style: { marginTop: 20 }
    },

      /* ── Profile Tab ── */
      activeTab === "profile" &&
      React.createElement("div", {
        className: "nx-grid-2",
        style: { gap: 20 }
      },
        /* Avatar Card */
        React.createElement("div", { className: "nx-card" },
          React.createElement(SectionHeader, {
            title: "🖼️ Avatar"
          }),
          React.createElement("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "20px 0"
            }
          },
            React.createElement("div", {
              style: { position: "relative" }
            },
              React.createElement(NxAvatar, {
                user: profile, size: "xl"
              }),
              uploadingAvatar &&
              React.createElement("div", {
                style: {
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }
              },
                React.createElement(Spinner)
              )
            ),
            React.createElement("div", {
              style: { textAlign: "center" }
            },
              React.createElement("div", {
                style: {
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--text)"
                }
              }, profile.full_name),
              React.createElement(RoleBadge, {
                role: profile.role
              }),
              profile.department &&
              React.createElement("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4
                }
              }, `🏢 ${profile.department}`)
            ),
            React.createElement(FileUploadBtn, {
              onFile: handleAvatarUpload,
              accept: "image/*",
              label: uploadingAvatar
                ? "Uploading..." : "Change Avatar"
            })
          )
        ),

        /* Info Card */
        React.createElement("div", { className: "nx-card" },
          React.createElement(SectionHeader, {
            title: "📋 Personal Info"
          }),
          React.createElement("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginTop: 16
            }
          },
            [
              {
                key: "full_name",
                label: "Full Name *",
                type: "text",
                ph: "Your full name"
              },
              {
                key: "department",
                label: "Department",
                type: "text",
                ph: "Your department"
              },
              {
                key: "phone",
                label: "Phone",
                type: "tel",
                ph: "+966 5x xxx xxxx"
              },
            ].map(f =>
              React.createElement("div", {
                key: f.key,
                className: "nx-form-group"
              },
                React.createElement("label", {
                  className: "nx-label"
                }, f.label),
                React.createElement("input", {
                  type: f.type,
                  className: "nx-input",
                  placeholder: f.ph,
                  value: profile[f.key] || "",
                  onChange: e => setProfile(p => ({
                    ...p, [f.key]: e.target.value
                  }))
                })
              )
            ),
            React.createElement("div", {
              className: "nx-form-group"
            },
              React.createElement("label", {
                className: "nx-label"
              }, "Bio"),
              React.createElement("textarea", {
                className: "nx-textarea",
                placeholder: "Tell us about yourself...",
                value: profile.bio || "",
                rows: 3,
                onChange: e => setProfile(p => ({
                  ...p, bio: e.target.value
                }))
              })
            ),
            /* Read-only Fields */
            React.createElement("div", {
              style: {
                padding: "12px",
                background: "var(--card2)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                flexDirection: "column",
                gap: 8
              }
            },
              [
                { label: "Email",       value: user.email },
                { label: "Employee ID", value: user.employee_id || "—" },
                { label: "Role",        value: user.role },
                { label: "Member Since",value: fmtDate(user.created_at) },
              ].map(item =>
                React.createElement("div", {
                  key: item.label,
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12
                  }
                },
                  React.createElement("span", {
                    style: { color: "var(--text-muted)" }
                  }, item.label),
                  React.createElement("span", {
                    style: {
                      color: "var(--text)",
                      fontWeight: 600
                    }
                  }, item.value)
                )
              )
            ),
            React.createElement("button", {
              className: "nx-btn nx-btn-primary nx-btn-full",
              onClick: handleSave,
              disabled: saving
            }, saving
              ? React.createElement(Spinner)
              : "💾 Save Profile")
          )
        )
      ),

      /* ── Theme Tab ── */
      activeTab === "theme" &&
      React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 20
        }
      },
        React.createElement("div", { className: "nx-card" },
          React.createElement(SectionHeader, {
            title: "🎨 Choose Theme"
          }),
          React.createElement("div", {
            style: {
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 12,
              marginTop: 16
            }
          },
            ThemeMgr.getAvailable(user).map(t =>
              React.createElement("div", {
                key: t.id,
                className: `nx-theme-swatch ${
                  theme === t.id ? "active" : ""}`,
                style: {
                  background: theme === t.id
                    ? "var(--primary-glow)"
                    : "var(--card2)",
                  border: `2px solid ${
                    theme === t.id
                      ? "var(--primary)"
                      : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "var(--transition)"
                },
                onClick: () => handleThemeChange(t.id)
              },
                React.createElement("div", {
                  style: {
                    width: 32, height: 32,
                    borderRadius: "50%",
                    background: t.bg,
                    margin: "0 auto 8px",
                    border: "2px solid rgba(255,255,255,0.1)"
                  }
                }),
                React.createElement("div", {
                  style: {
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme === t.id
                      ? "var(--primary)"
                      : "var(--text-sub)"
                  }
                }, t.label),
                theme === t.id &&
                React.createElement("div", {
                  style: {
                    fontSize: 10,
                    color: "var(--primary)",
                    marginTop: 4
                  }
                }, "✓ Active")
              )
            )
          )
        ),

        /* Theme Preview */
        React.createElement("div", { className: "nx-card" },
          React.createElement(SectionHeader, {
            title: "👁️ Preview"
          }),
          React.createElement("div", {
            style: {
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 12
            }
          },
            ["nx-btn-primary","nx-btn-secondary",
             "nx-btn-success","nx-btn-danger",
             "nx-btn-warning"].map(cls =>
              React.createElement("button", {
                key: cls,
                className: `nx-btn nx-btn-sm ${cls}`
              }, cls.replace("nx-btn-",""))
            )
          ),
          React.createElement("div", {
            style: {
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 12
            }
          },
            ["success","warning","danger","info",
             "neutral"].map(t =>
              React.createElement("span", {
                key: t,
                className: `nx-badge nx-badge-${t}`
              }, t)
            )
          )
        )
      ),

      /* ── Security Tab ── */
      activeTab === "security" &&
      React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 480
        }
      },
        React.createElement("div", { className: "nx-card" },
          React.createElement(SectionHeader, {
            title: "🔐 Security Settings"
          }),
          React.createElement("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16
            }
          },
            React.createElement("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--card2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)"
              }
            },
              React.createElement("div", null,
                React.createElement("div", {
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)"
                  }
                }, "Password"),
                React.createElement("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)"
                  }
                }, "Change your login password")
              ),
              React.createElement("button", {
                className: "nx-btn nx-btn-secondary nx-btn-sm",
                onClick: () => setShowPassModal(true)
              }, "Change")
            ),
            React.createElement("div", {
              style: {
                padding: "12px 16px",
                background: "var(--card2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)"
              }
            },
              React.createElement("div", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 8
                }
              }, "Active Sessions"),
              React.createElement("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-sub)"
                }
              },
                React.createElement("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }
                },
                  React.createElement("span", {
                    className: "nx-live-dot green"
                  }),
                  "Current session — Active now"
                )
              )
            ),
            React.createElement("div", {
              className: "nx-alert nx-alert-info"
            },
              React.createElement("span", {
                className: "nx-alert-icon"
              }, "ℹ️"),
              "Your account activity is logged for security purposes."
            )
          )
        )
      ),

      /* ── Stats Tab ── */
      activeTab === "stats" &&
      React.createElement(MyStatsTab, { user })
    ),

    /* Change Password Modal */
    showPassModal && React.createElement(ChangePasswordModal, {
      user,
      onClose: () => setShowPassModal(false),
      onChanged: () => {
        setShowPassModal(false);
        showToast("Password changed! ✅", "success");
      }
    })
  );
}

/* My Stats Tab */
function MyStatsTab({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const now   = new Date();
      const month = new Date(now);
      month.setDate(1);
      month.setHours(0,0,0,0);

      const [attRes, brkRes, kpiRes, ptsRes] =
        await Promise.all([
          withRetry(() =>
            sb.from("attendance")
              .select("id, status, work_seconds")
              .eq("employee_id", user.id)
              .gte("date", month.toISOString()
                .split("T")[0])
          ),
          withRetry(() =>
            sb.from("breaks")
              .select("id, duration_minutes, status")
              .eq("employee_id", user.id)
              .gte("date", month.toISOString()
                .split("T")[0])
          ),
          withRetry(() =>
            sb.from("kpi_entries")
              .select("calls_handled, cases_resolved, csat_score")
              .eq("employee_id", user.id)
              .gte("entry_date", month.toISOString()
                .split("T")[0])
          ),
          withRetry(() =>
            sb.from("employee_points")
              .select("total_points, level, monthly_points")
              .eq("employee_id", user.id)
              .single()
          ),
        ]);

      const att  = attRes.data  || [];
      const brks = brkRes.data  || [];
      const kpis = kpiRes.data  || [];
      const pts  = ptsRes.data  || {};

      setStats({
        attendance: {
          total:     att.length,
          onTime:    att.filter(a => a.status === "on_time").length,
          late:      att.filter(a => a.status === "late").length,
          workHours: Math.round(
            att.reduce((s,a) =>
              s + (a.work_seconds || 0), 0) / 3600
          )
        },
        breaks: {
          total:    brks.length,
          exceeded: brks.filter(
            b => b.status === "exceeded"
          ).length
        },
        kpi: {
          calls:    kpis.reduce(
            (s,k) => s + (k.calls_handled || 0), 0),
          resolved: kpis.reduce(
            (s,k) => s + (k.cases_resolved || 0), 0),
          avgCsat:  kpis.length > 0
            ? (kpis.reduce((s,k) =>
                s + (k.csat_score || 0), 0) /
               kpis.length).toFixed(1)
            : "—"
        },
        points: {
          total:   pts.total_points   || 0,
          monthly: pts.monthly_points || 0,
          level:   pts.level          || 1
        }
      });
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading stats..." });

  return React.createElement("div", {
    style: { display:"flex", flexDirection:"column", gap:16 }
  },
    /* This Month */
    React.createElement("div", { className: "nx-card" },
      React.createElement(SectionHeader, {
        title: "📅 This Month"
      }),
      React.createElement("div", {
        className: "nx-grid-4",
        style: { marginTop: 16 }
      },
        [
          { label:"Days Present",
            value:stats.attendance.total,
            icon:"✅", color:"#22C55E" },
          { label:"On Time",
            value:stats.attendance.onTime,
            icon:"🟢", color:"#22C55E" },
          { label:"Late",
            value:stats.attendance.late,
            icon:"🟡", color:"#EAB308" },
          { label:"Work Hours",
            value:`${stats.attendance.workHours}h`,
            icon:"⏱️", color:"var(--primary)" },
        ].map(s =>
          React.createElement("div", {
            key: s.label,
            className: "nx-stat-card"
          },
            React.createElement("div", {
              style: {
                display:"flex",
                justifyContent:"space-between"
              }
            },
              React.createElement("span", {
                className: "nx-stat-label"
              }, s.label),
              React.createElement("span", {
                style:{ fontSize:16 }
              }, s.icon)
            ),
            React.createElement("div", {
              className: "nx-stat-value",
              style:{ color:s.color, fontSize:20 }
            }, s.value)
          )
        )
      )
    ),

    /* KPI */
    React.createElement("div", { className: "nx-card" },
      React.createElement(SectionHeader, {
        title: "📊 KPI This Month"
      }),
      React.createElement("div", {
        className: "nx-grid-4",
        style: { marginTop: 16 }
      },
        [
          { label:"Calls",
            value:fmtNumber(stats.kpi.calls),
            icon:"📞", color:"#3B82F6" },
          { label:"Resolved",
            value:fmtNumber(stats.kpi.resolved),
            icon:"✅", color:"#22C55E" },
          { label:"Avg CSAT",
            value:stats.kpi.avgCsat,
            icon:"⭐", color:"#EAB308" },
          { label:"Level",
            value:`Lv.${stats.points.level}`,
            icon:"🏆", color:"var(--primary)" },
        ].map(s =>
          React.createElement("div", {
            key: s.label,
            className: "nx-stat-card"
          },
            React.createElement("div", {
              style: {
                display:"flex",
                justifyContent:"space-between"
              }
            },
              React.createElement("span", {
                className: "nx-stat-label"
              }, s.label),
              React.createElement("span", {
                style:{ fontSize:16 }
              }, s.icon)
            ),
            React.createElement("div", {
              className: "nx-stat-value",
              style:{ color:s.color, fontSize:20 }
            }, s.value)
          )
        )
      )
    ),

    /* Points */
    React.createElement("div", { className: "nx-card" },
      React.createElement(SectionHeader, {
        title: "🎯 Points"
      }),
      React.createElement("div", {
        style: {
          display:"flex",
          gap:24,
          marginTop:16,
          flexWrap:"wrap"
        }
      },
        [
          { label:"Total Points",
            value:fmtNumber(stats.points.total) },
          { label:"This Month",
            value:fmtNumber(stats.points.monthly) },
          { label:"Break Exceeded",
            value:stats.breaks.exceeded },
        ].map(s =>
          React.createElement("div", {
            key: s.label,
            style: { textAlign:"center" }
          },
            React.createElement("div", {
              style: {
                fontSize:24, fontWeight:900,
                color:"var(--primary)"
              }
            }, s.value),
            React.createElement("div", {
              style: {
                fontSize:11,
                color:"var(--text-muted)",
                marginTop:4
              }
            }, s.label)
          )
        )
      )
    )
  );
}

/* Change Password Modal */
function ChangePasswordModal({ user, onClose, onChanged }) {
  const [form, setForm] = useState({
    current:"", newPass:"", confirm:""
  });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  async function handleSave() {
    if (!form.current || !form.newPass || !form.confirm) {
      showToast("All fields required", "warning");
      return;
    }
    if (form.newPass.length < 6) {
      showToast("Min 6 characters", "warning");
      return;
    }
    if (form.newPass !== form.confirm) {
      showToast("Passwords don't match", "error");
      return;
    }
    setSaving(true);
    try {
      /* Verify current password */
      const { error: signInErr } =
        await sb.auth.signInWithPassword({
          email:    user.email,
          password: form.current
        });

      if (signInErr) {
        showToast("Current password incorrect", "error");
        setSaving(false);
        return;
      }

      /* Update password */
      const { error: updateErr } =
        await sb.auth.updateUser({
          password: form.newPass
        });

      if (updateErr) throw updateErr;

      await logAudit("CHANGE_PASSWORD",
        "Password changed", user.id);
      onChanged();
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
      className:"nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "🔐 Change Password"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:14 }
        },
          [
            {
              key:"current", label:"Current Password",
              show:showCurrent,
              toggle:() => setShowCurrent(p => !p)
            },
            {
              key:"newPass", label:"New Password",
              show:showNew,
              toggle:() => setShowNew(p => !p)
            },
            {
              key:"confirm", label:"Confirm New Password",
              show:showNew,
              toggle:() => setShowNew(p => !p)
            },
          ].map(f =>
            React.createElement("div", {
              key:f.key, className:"nx-form-group"
            },
              React.createElement("label", {
                className:"nx-label"
              }, f.label),
              React.createElement("div", {
                style:{ position:"relative" }
              },
                React.createElement("input", {
                  type: f.show ? "text" : "password",
                  className:"nx-input",
                  placeholder:"••••••••",
                  value:form[f.key],
                  onChange: e => setForm(p => ({
                    ...p, [f.key]:e.target.value
                  })),
                  style:{ paddingRight:44 }
                }),
                React.createElement("button", {
                  type:"button",
                  onClick:f.toggle,
                  style:{
                    position:"absolute",
                    right:12, top:"50%",
                    transform:"translateY(-50%)",
                    background:"none", border:"none",
                    cursor:"pointer",
                    color:"var(--text-muted)",
                    fontSize:16, padding:0
                  }
                }, f.show ? "🙈" : "👁️")
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
          onClick:handleSave, disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "Change Password")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 25 — MY WORKSPACE
   ══════════════════════════════════════════════════════════ */
function MyWorkspacePage({ user }) {
  const [notes,      setNotes]      = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("notes");
  const [showAddNote,setShowAddNote]= useState(false);
  const [showAddTask,setShowAddTask]= useState(false);
  const [editNote,   setEditNote]   = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [notesRes, tasksRes] = await Promise.all([
        withRetry(() =>
          sb.from("workspace_notes")
            .select("*")
            .eq("employee_id", user.id)
            .order("updated_at", { ascending:false })
        ),
        withRetry(() =>
          sb.from("workspace_tasks")
            .select("*")
            .eq("employee_id", user.id)
            .order("created_at", { ascending:false })
        )
      ]);
      setNotes(notesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch(e) {
      showToast("Failed to load workspace", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id) {
    try {
      await withRetry(() =>
        sb.from("workspace_notes")
          .delete().eq("id", id)
      );
      setNotes(p => p.filter(n => n.id !== id));
      showToast("Note deleted", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  async function toggleTask(task) {
    try {
      await withRetry(() =>
        sb.from("workspace_tasks")
          .update({
            is_done:    !task.is_done,
            updated_at: new Date().toISOString()
          })
          .eq("id", task.id)
      );
      setTasks(p => p.map(t =>
        t.id === task.id
          ? { ...t, is_done: !t.is_done }
          : t
      ));
    } catch(e) {}
  }

  async function deleteTask(id) {
    try {
      await withRetry(() =>
        sb.from("workspace_tasks")
          .delete().eq("id", id)
      );
      setTasks(p => p.filter(t => t.id !== id));
    } catch(e) {}
  }

  const NOTE_COLORS = [
    "#3B82F6","#22C55E","#EAB308",
    "#EF4444","#8B5CF6","#F97316"
  ];

  const pendingTasks = tasks.filter(t => !t.is_done).length;
  const doneTasks    = tasks.filter(t => t.is_done).length;

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading workspace..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"My Workspace",
      icon:"🗂️",
      subtitle:`${notes.length} notes · ${pendingTasks} tasks pending`
    }),

    React.createElement(Tabs, {
      tabs:[
        { id:"notes", label:`📝 Notes (${notes.length})` },
        { id:"tasks", label:`✅ Tasks (${pendingTasks} pending)` },
      ],
      active:activeTab,
      onChange:setActiveTab
    }),

    React.createElement("div", {
      style:{ marginTop:20 }
    },

      /* Notes Tab */
      activeTab === "notes" &&
      React.createElement("div", null,
        React.createElement("div", {
          style:{
            display:"flex",
            justifyContent:"flex-end",
            marginBottom:16
          }
        },
          React.createElement("button", {
            className:"nx-btn nx-btn-primary nx-btn-sm",
            onClick: () => setShowAddNote(true)
          }, "+ New Note")
        ),
        notes.length === 0
          ? React.createElement(EmptyState, {
              icon:"📝",
              title:"No notes yet",
              desc:"Create your first note"
            })
          : React.createElement("div", {
              style:{
                display:"grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(240px, 1fr))",
                gap:12
              }
            },
              notes.map(note =>
                React.createElement("div", {
                  key:note.id,
                  className:"nx-card nx-card-enter",
                  style:{
                    borderTop:`3px solid ${
                      note.color || NOTE_COLORS[0]}`,
                    cursor:"pointer"
                  },
                  onClick: () => setEditNote(note)
                },
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      justifyContent:"space-between",
                      alignItems:"flex-start",
                      marginBottom:8
                    }
                  },
                    note.title &&
                    React.createElement("h4", {
                      style:{
                        fontSize:13, fontWeight:700,
                        color:"var(--text)",
                        flex:1,
                        overflow:"hidden",
                        textOverflow:"ellipsis",
                        whiteSpace:"nowrap"
                      }
                    }, note.title),
                    React.createElement("button", {
                      className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                      onClick: e => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      },
                      style:{ color:"var(--danger)" }
                    }, "🗑️")
                  ),
                  React.createElement("p", {
                    style:{
                      fontSize:12,
                      color:"var(--text-sub)",
                      lineHeight:1.6,
                      overflow:"hidden",
                      display:"-webkit-box",
                      WebkitLineClamp:4,
                      WebkitBoxOrient:"vertical"
                    }
                  }, note.content),
                  React.createElement("div", {
                    style:{
                      fontSize:10,
                      color:"var(--text-muted)",
                      marginTop:8
                    }
                  }, fmtRelative(note.updated_at))
                )
              )
            )
      ),

      /* Tasks Tab */
      activeTab === "tasks" &&
      React.createElement("div", null,
        React.createElement("div", {
          style:{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            marginBottom:16
          }
        },
          React.createElement("div", {
            style:{
              fontSize:12,
              color:"var(--text-muted)"
            }
          },
            `${doneTasks}/${tasks.length} completed`
          ),
          React.createElement("button", {
            className:"nx-btn nx-btn-primary nx-btn-sm",
            onClick: () => setShowAddTask(true)
          }, "+ New Task")
        ),
        tasks.length > 0 &&
        React.createElement("div", {
          className:"nx-progress-bar",
          style:{ marginBottom:16 }
        },
          React.createElement("div", {
            className:"nx-progress-fill",
            style:{
              width: tasks.length > 0
                ? `${Math.round(
                    (doneTasks/tasks.length)*100
                  )}%`
                : "0%"
            }
          })
        ),
        tasks.length === 0
          ? React.createElement(EmptyState, {
              icon:"✅",
              title:"No tasks yet",
              desc:"Add tasks to track your work"
            })
          : React.createElement("div", {
              style:{
                display:"flex",
                flexDirection:"column",
                gap:8
              }
            },
              tasks.map(task =>
                React.createElement("div", {
                  key:task.id,
                  style:{
                    display:"flex",
                    alignItems:"center",
                    gap:10,
                    padding:"10px 14px",
                    background:"var(--card2)",
                    borderRadius:"var(--radius-sm)",
                    border:"1px solid var(--border)",
                    opacity: task.is_done ? 0.6 : 1,
                    transition:"var(--transition)"
                  }
                },
                  React.createElement("div", {
                    className:`nx-checkbox ${
                      task.is_done ? "checked":""}`,
                    onClick: () => toggleTask(task),
                    style:{ flexShrink:0 }
                  }, task.is_done ? "✓" : ""),
                  React.createElement("div", {
                    style:{ flex:1 }
                  },
                    React.createElement("div", {
                      style:{
                        fontSize:13,
                        fontWeight:600,
                        color:"var(--text)",
                        textDecoration: task.is_done
                          ? "line-through" : "none"
                      }
                    }, task.title),
                    task.due_date &&
                    React.createElement("div", {
                      style:{
                        fontSize:10,
                        color: new Date(task.due_date) <
                          new Date() && !task.is_done
                          ? "var(--danger)"
                          : "var(--text-muted)"
                      }
                    }, `📅 Due: ${fmtDate(task.due_date)}`)
                  ),
                  task.priority &&
                  React.createElement(PriorityBadge, {
                    priority:task.priority
                  }),
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => deleteTask(task.id),
                    style:{ color:"var(--danger)" }
                  }, "🗑️")
                )
              )
            )
      )
    ),

    /* Add Note Modal */
    (showAddNote || editNote) &&
    React.createElement(NoteModal, {
      note: editNote,
      user,
      colors: NOTE_COLORS,
      onClose: () => {
        setShowAddNote(false);
        setEditNote(null);
      },
      onSaved: () => {
        setShowAddNote(false);
        setEditNote(null);
        loadData();
        showToast(
          editNote ? "Note updated!" : "Note saved!",
          "success"
        );
      }
    }),

    /* Add Task Modal */
    showAddTask && React.createElement(TaskModal, {
      user,
      onClose: () => setShowAddTask(false),
      onSaved: () => {
        setShowAddTask(false);
        loadData();
        showToast("Task added!", "success");
      }
    })
  );
}

/* Note Modal */
function NoteModal({ note, user, colors, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:   note?.title   || "",
    content: note?.content || "",
    color:   note?.color   || colors[0]
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.content.trim()) {
      showToast("Content required", "warning");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (note) {
        await withRetry(() =>
          sb.from("workspace_notes")
            .update({
              title:      form.title.trim() || null,
              content:    form.content.trim(),
              color:      form.color,
              updated_at: now
            })
            .eq("id", note.id)
        );
      } else {
        await withRetry(() =>
          sb.from("workspace_notes").insert({
            employee_id: user.id,
            title:       form.title.trim() || null,
            content:     form.content.trim(),
            color:       form.color,
            created_at:  now,
            updated_at:  now
          })
        );
      }
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
        }, note ? "✏️ Edit Note" : "📝 New Note"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:14 }
        },
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Title (optional)"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"Note title...",
              value:form.title,
              onChange: e => setForm(p => ({
                ...p, title:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Content"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Write your note...",
              value:form.content, rows:6,
              onChange: e => setForm(p => ({
                ...p, content:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Color"),
            React.createElement("div", {
              style:{ display:"flex", gap:8 }
            },
              colors.map(c =>
                React.createElement("div", {
                  key:c,
                  onClick: () => setForm(p => ({
                    ...p, color:c
                  })),
                  style:{
                    width:28, height:28,
                    borderRadius:"50%",
                    background:c,
                    cursor:"pointer",
                    border: form.color === c
                      ? "3px solid var(--text)"
                      : "2px solid transparent",
                    transition:"var(--transition)"
                  }
                })
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
          onClick:handleSave, disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : note ? "Save Changes" : "Save Note")
      )
    )
  );
}

/* Task Modal */
function TaskModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:"", due_date:"", priority:"medium"
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim()) {
      showToast("Title required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("workspace_tasks").insert({
          employee_id: user.id,
          title:       form.title.trim(),
          due_date:    form.due_date || null,
          priority:    form.priority,
          is_done:     false,
          created_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString()
        })
      );
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
      className:"nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "✅ New Task"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:14 }
        },
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Task Title"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"What needs to be done?",
              value:form.title,
              onChange: e => setForm(p => ({
                ...p, title:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Due Date"),
            React.createElement("input", {
              type:"date", className:"nx-input",
              value:form.due_date,
              onChange: e => setForm(p => ({
                ...p, due_date:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Priority"),
            React.createElement("div", {
              style:{ display:"flex", gap:8 }
            },
              ["low","medium","high"].map(p =>
                React.createElement("button", {
                  key:p,
                  className:`nx-btn nx-btn-sm ${
                    form.priority === p
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(prev => ({
                    ...prev, priority:p
                  }))
                },
                  p === "low"  ? "🟢 Low" :
                  p === "medium" ? "🟡 Medium" :
                  "🔴 High"
                )
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
          onClick:handleSave, disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "Add Task")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 26 — AUDIT LOG
   ══════════════════════════════════════════════════════════ */
function AuditLogPage({ user }) {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [page,     setPage]     = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadLogs();
  }, [page, filter]);

  async function loadLogs() {
    setLoading(true);
    try {
      let q = sb.from("audit_log")
        .select(`
          *,
          actor:employees!audit_log_actor_id_fkey(
            id, full_name, role, avatar_url
          ),
          target:employees!audit_log_target_id_fkey(
            id, full_name
          )
        `)
        .order("created_at", { ascending:false })
        .range(page * PAGE_SIZE, (page+1) * PAGE_SIZE - 1);

      /* Non-owner sees only their own logs */
      if (!RC.isMgr(user)) {
        q = q.eq("actor_id", user.id);
      }

      const { data } = await withRetry(() => q);
      setLogs(data || []);
    } catch(e) {
      showToast("Failed to load audit log", "error");
    } finally {
      setLoading(false);
    }
  }

  const ACTION_ICONS = {
    LOGIN:            "🔑",
    CLOCK_IN:         "🟢",
    CLOCK_OUT:        "🔴",
    GRANT_BREAK:      "☕",
    END_BREAK:        "⏱️",
    SUBMIT_REQUEST:   "📤",
    CREATE_POST:      "📋",
    UPLOAD_SCHEDULE:  "📅",
    EDIT_SCHEDULE:    "✏️",
    SUSPEND:          "🚫",
    UNSUSPEND:        "✅",
    INSTANT_KICK:     "⚡",
    FREEZE_SYSTEM:    "🔒",
    UNFREEZE_SYSTEM:  "🔓",
    UPDATE_CONFIG:    "⚙️",
    ADD_EMPLOYEE:     "👤",
    EDIT_EMPLOYEE:    "✏️",
    LOG_KPI:          "📊",
    AWARD_POINTS:     "🎯",
    CREATE_SURVEY:    "📋",
    CREATE_HANDOVER:  "🔄",
    CREATE_CASE:      "🗂️",
    CREATE_TICKET:    "🎫",
    CHANGE_PASSWORD:  "🔐",
    DEFAULT:          "📝"
  };

  const filtered = useMemo(() => {
    if (!search) return logs;
    return logs.filter(l =>
      l.action?.toLowerCase()
        .includes(search.toLowerCase()) ||
      l.details?.toLowerCase()
        .includes(search.toLowerCase()) ||
      l.actor?.full_name?.toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [logs, search]);

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading audit log..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"Audit Log",
      icon:"📜",
      subtitle:"System activity history"
    }),

    React.createElement("div", {
      style:{
        display:"flex", gap:10,
        marginBottom:16, flexWrap:"wrap"
      }
    },
      React.createElement(SearchInput, {
        value:search, onChange:setSearch,
        placeholder:"Search actions..."
      })
    ),

    React.createElement("div", { className:"nx-table-wrap" },
      React.createElement("table", { className:"nx-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            ["Time","Actor","Action",
             "Details","Target"].map(h =>
              React.createElement("th", { key:h }, h)
            )
          )
        ),
        React.createElement("tbody", null,
          filtered.length === 0
            ? React.createElement("tr", null,
                React.createElement("td", {
                  colSpan:5,
                  style:{
                    textAlign:"center",
                    padding:"30px",
                    color:"var(--text-muted)"
                  }
                }, "No logs found")
              )
            : filtered.map(log =>
                React.createElement("tr", { key:log.id },
                  React.createElement("td", {
                    style:{
                      fontSize:11,
                      color:"var(--text-muted)",
                      whiteSpace:"nowrap"
                    }
                  }, fmtDateTime(log.created_at)),
                  React.createElement("td", null,
                    log.actor
                      ? React.createElement("div", {
                          style:{
                            display:"flex",
                            alignItems:"center",
                            gap:6
                          }
                        },
                          React.createElement(NxAvatar, {
                            user:log.actor, size:"xs"
                          }),
                          React.createElement("span", {
                            style:{
                              fontSize:12,
                              fontWeight:600
                            }
                          }, log.actor.full_name)
                        )
                      : React.createElement("span", {
                          style:{
                            fontSize:11,
                            color:"var(--text-muted)"
                          }
                        }, "System")
                  ),
                  React.createElement("td", null,
                    React.createElement("span", {
                      style:{
                        display:"flex",
                        alignItems:"center",
                        gap:5,
                        fontSize:12,
                        fontWeight:600,
                        color:"var(--text)"
                      }
                    },
                      ACTION_ICONS[log.action] ||
                      ACTION_ICONS.DEFAULT,
                      " ",
                      log.action?.replace(/_/g," ")
                    )
                  ),
                  React.createElement("td", {
                    style:{
                      fontSize:11,
                      color:"var(--text-sub)",
                      maxWidth:200,
                      overflow:"hidden",
                      textOverflow:"ellipsis",
                      whiteSpace:"nowrap"
                    }
                  }, log.details || "—"),
                  React.createElement("td", {
                    style:{
                      fontSize:11,
                      color:"var(--text-muted)"
                    }
                  }, log.target?.full_name || "—")
                )
              )
        )
      )
    ),

    /* Pagination */
    React.createElement("div", {
      style:{
        display:"flex",
        justifyContent:"center",
        gap:8, marginTop:16
      }
    },
      React.createElement("button", {
        className:"nx-btn nx-btn-secondary nx-btn-sm",
        onClick: () => setPage(p => Math.max(0, p-1)),
        disabled: page === 0
      }, "← Prev"),
      React.createElement("span", {
        style:{
          fontSize:12,
          color:"var(--text-muted)",
          display:"flex",
          alignItems:"center",
          padding:"0 8px"
        }
      }, `Page ${page+1}`),
      React.createElement("button", {
        className:"nx-btn nx-btn-secondary nx-btn-sm",
        onClick: () => setPage(p => p+1),
        disabled: logs.length < PAGE_SIZE
      }, "Next →")
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 27 — ANNOUNCEMENTS
   ══════════════════════════════════════════════════════════ */
function AnnouncementsPage({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showCreate,    setShowCreate]    = useState(false);
  const [filter,        setFilter]        = useState("active");

  useEffect(() => {
    loadAnnouncements();
    ChannelMgr.sub(
      "announcements",
      "announcements",
      null,
      loadAnnouncements
    );
    return () => ChannelMgr.unsub("announcements");
  }, []);

  async function loadAnnouncements() {
    try {
      const { data } = await withRetry(() =>
        sb.from("announcements")
          .select(`
            *,
            creator:employees!announcements_created_by_fkey(
              id, full_name, role, avatar_url
            )
          `)
          .order("is_pinned", { ascending:false })
          .order("created_at", { ascending:false })
      );
      setAnnouncements(data || []);
    } catch(e) {
      showToast("Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await withRetry(() =>
        sb.from("announcements").delete().eq("id", id)
      );
      showToast("Deleted", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  async function togglePin(ann) {
    try {
      await withRetry(() =>
        sb.from("announcements")
          .update({ is_pinned: !ann.is_pinned })
          .eq("id", ann.id)
      );
    } catch(e) {}
  }

  const TYPES = {
    general:     { icon:"📢", color:"#3B82F6" },
    urgent:      { icon:"🚨", color:"#EF4444" },
    maintenance: { icon:"🔧", color:"#EAB308" },
    celebration: { icon:"🎉", color:"#22C55E" },
    policy:      { icon:"📜", color:"#8B5CF6" },
  };

  const filtered = useMemo(() => {
    if (filter === "pinned") {
      return announcements.filter(a => a.is_pinned);
    }
    if (filter === "urgent") {
      return announcements.filter(a => a.type === "urgent");
    }
    return announcements.filter(a => a.is_active !== false);
  }, [announcements, filter]);

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading announcements..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"Announcements",
      icon:"📢",
      subtitle:`${announcements.length} total`,
      actions: RC.isMgr(user) &&
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick: () => setShowCreate(true)
        }, "+ New Announcement")
    }),

    React.createElement(Tabs, {
      tabs:[
        { id:"active", label:"Active" },
        { id:"pinned", label:"📌 Pinned" },
        { id:"urgent", label:"🚨 Urgent" },
      ],
      active:filter,
      onChange:setFilter
    }),

    React.createElement("div", {
      style:{
        display:"flex", flexDirection:"column",
        gap:12, marginTop:16
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon:"📢",
            title:"No announcements",
            desc:"Check back later"
          })
        : filtered.map(ann => {
            const t = TYPES[ann.type] || TYPES.general;
            return React.createElement("div", {
              key:ann.id,
              className:"nx-card nx-card-enter",
              style:{
                borderLeft:`3px solid ${t.color}`
              }
            },
              React.createElement("div", {
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"flex-start",
                  gap:12
                }
              },
                React.createElement("div", {
                  style:{ flex:1 }
                },
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      alignItems:"center",
                      gap:8, flexWrap:"wrap",
                      marginBottom:8
                    }
                  },
                    React.createElement("span", {
                      style:{ fontSize:20 }
                    }, t.icon),
                    React.createElement("h3", {
                      style:{
                        fontSize:15, fontWeight:700,
                        color:"var(--text)"
                      }
                    }, ann.title),
                    React.createElement("span", {
                      className:"nx-badge",
                      style:{
                        background:`${t.color}22`,
                        color:t.color,
                        border:`1px solid ${t.color}44`,
                        fontSize:10
                      }
                    }, ann.type),
                    ann.is_pinned &&
                    React.createElement("span", {
                      className:"nx-badge nx-badge-warning",
                      style:{ fontSize:10 }
                    }, "📌 Pinned")
                  ),
                  React.createElement("p", {
                    style:{
                      fontSize:13,
                      color:"var(--text-sub)",
                      lineHeight:1.6,
                      marginBottom:8,
                      whiteSpace:"pre-wrap"
                    }
                  }, ann.content),
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      alignItems:"center",
                      gap:8, fontSize:11,
                      color:"var(--text-muted)"
                    }
                  },
                    React.createElement(NxAvatar, {
                      user:ann.creator, size:"xs"
                    }),
                    React.createElement("span", null,
                      ann.creator?.full_name || "—"),
                    React.createElement("span", null,
                      fmtRelative(ann.created_at))
                  )
                ),
                RC.isMgr(user) &&
                React.createElement("div", {
                  style:{ display:"flex", gap:4, flexShrink:0 }
                },
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => togglePin(ann),
                    title: ann.is_pinned ? "Unpin" : "Pin"
                  }, ann.is_pinned ? "📌" : "📍"),
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => handleDelete(ann.id),
                    style:{ color:"var(--danger)" }
                  }, "🗑️")
                )
              )
            );
          })
    ),

    showCreate && React.createElement(CreateAnnouncementModal, {
      user,
      types:TYPES,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadAnnouncements();
        showToast("Announcement published!", "success");
      }
    })
  );
}

/* Create Announcement Modal */
function CreateAnnouncementModal({
  user, types, onClose, onCreated
}) {
  const [form, setForm] = useState({
    title:"", content:"", type:"general",
    is_pinned:false
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      showToast("Title and content required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("announcements").insert({
          title:      form.title.trim(),
          content:    form.content.trim(),
          type:       form.type,
          is_pinned:  form.is_pinned,
          is_active:  true,
          created_by: user.id,
          created_at: new Date().toISOString()
        })
      );
      await logAudit("CREATE_ANNOUNCEMENT",
        form.title, user.id);
      onCreated();
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
      className:"nx-modal nx-modal-lg",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "📢 New Announcement"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:14 }
        },
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Title"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"Announcement title...",
              value:form.title,
              onChange: e => setForm(p => ({
                ...p, title:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Type"),
            React.createElement("div", {
              style:{ display:"flex", gap:6, flexWrap:"wrap" }
            },
              Object.entries(types).map(([id, t]) =>
                React.createElement("button", {
                  key:id,
                  className:`nx-btn nx-btn-sm ${
                    form.type === id
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(p => ({
                    ...p, type:id
                  }))
                }, `${t.icon} ${id}`)
              )
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Content"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Announcement content...",
              value:form.content, rows:6,
              onChange: e => setForm(p => ({
                ...p, content:e.target.value
              }))
            })
          ),
          React.createElement("label", {
            className:"nx-checkbox-wrap"
          },
            React.createElement("div", {
              className:`nx-checkbox ${
                form.is_pinned ? "checked":""}`,
              onClick: () => setForm(p => ({
                ...p, is_pinned:!p.is_pinned
              }))
            }, form.is_pinned ? "✓" : ""),
            React.createElement("span", {
              style:{ fontSize:13, color:"var(--text-sub)" }
            }, "📌 Pin this announcement")
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
          onClick:handleSave, disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "📢 Publish")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 28 — REPORTS & NOTES
   ══════════════════════════════════════════════════════════ */
function ReportsNotesPage({ user }) {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");

  const REPORT_TYPES = [
    { id:"daily",    label:"Daily Report",   icon:"📅" },
    { id:"incident", label:"Incident",       icon:"⚠️"  },
    { id:"feedback", label:"Feedback",       icon:"💬" },
    { id:"coaching", label:"Coaching Note",  icon:"🎯" },
    { id:"other",    label:"Other",          icon:"📋" },
  ];

  useEffect(() => {
    loadReports();
    ChannelMgr.sub(
      "reports", "reports_notes",
      null, loadReports
    );
    return () => ChannelMgr.unsub("reports");
  }, []);

  async function loadReports() {
    try {
      let q = sb.from("reports_notes")
        .select(`
          *,
          author:employees!reports_notes_author_id_fkey(
            id, full_name, role, avatar_url
          ),
          subject_emp:employees!reports_notes_subject_id_fkey(
            id, full_name, role, avatar_url
          )
        `)
        .order("created_at", { ascending:false })
        .limit(100);

      if (!RC.isMgr(user)) {
        q = q.or(
          `author_id.eq.${user.id},subject_id.eq.${user.id}`
        );
      }

      const { data } = await withRetry(() => q);
      setReports(data || []);
    } catch(e) {
      showToast("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await withRetry(() =>
        sb.from("reports_notes").delete().eq("id", id)
      );
      showToast("Deleted", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const filtered = useMemo(() => {
    let list = reports;
    if (filter !== "all") {
      list = list.filter(r => r.type === filter);
    }
    if (search) {
      list = list.filter(r =>
        r.title?.toLowerCase()
          .includes(search.toLowerCase()) ||
        r.content?.toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    return list;
  }, [reports, filter, search]);

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading reports..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"Reports & Notes",
      icon:"📄",
      subtitle:`${reports.length} total`,
      actions: React.createElement("button", {
        className:"nx-btn nx-btn-primary",
        onClick: () => setShowCreate(true)
      }, "+ New Report")
    }),

    React.createElement("div", {
      style:{
        display:"flex", gap:10,
        marginBottom:16, flexWrap:"wrap"
      }
    },
      React.createElement(SearchInput, {
        value:search, onChange:setSearch,
        placeholder:"Search reports..."
      }),
      React.createElement("div", {
        style:{ display:"flex", gap:6, flexWrap:"wrap" }
      },
        React.createElement("button", {
          className:`nx-btn nx-btn-sm ${
            filter === "all"
              ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => setFilter("all")
        }, "All"),
        REPORT_TYPES.map(t =>
          React.createElement("button", {
            key:t.id,
            className:`nx-btn nx-btn-sm ${
              filter === t.id
                ? "nx-btn-primary" : "nx-btn-secondary"}`,
            onClick: () => setFilter(t.id)
          }, `${t.icon} ${t.label}`)
        )
      )
    ),

    filtered.length === 0
      ? React.createElement(EmptyState, {
          icon:"📄",
          title:"No reports found",
          desc:"Create your first report"
        })
      : React.createElement("div", {
          style:{
            display:"flex", flexDirection:"column", gap:10
          }
        },
          filtered.map(r => {
            const rType = REPORT_TYPES.find(
              t => t.id === r.type
            ) || REPORT_TYPES[4];
            return React.createElement("div", {
              key:r.id,
              className:"nx-card nx-card-enter",
              style:{ cursor:"pointer" },
              onClick: () => setSelected(r)
            },
              React.createElement("div", {
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"flex-start", gap:12
                }
              },
                React.createElement("div", {
                  style:{ flex:1 }
                },
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      alignItems:"center",
                      gap:8, flexWrap:"wrap",
                      marginBottom:6
                    }
                  },
                    React.createElement("span", {
                      style:{ fontSize:18 }
                    }, rType.icon),
                    React.createElement("span", {
                      style:{
                        fontSize:14, fontWeight:700,
                        color:"var(--text)"
                      }
                    }, r.title),
                    React.createElement("span", {
                      className:"nx-badge nx-badge-neutral",
                      style:{ fontSize:10 }
                    }, rType.label)
                  ),
                  React.createElement("p", {
                    style:{
                      fontSize:12,
                      color:"var(--text-sub)",
                      lineHeight:1.5,
                      overflow:"hidden",
                      display:"-webkit-box",
                      WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical",
                      marginBottom:8
                    }
                  }, r.content),
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      alignItems:"center",
                      gap:10, fontSize:11,
                      color:"var(--text-muted)"
                    }
                  },
                    React.createElement("div", {
                      style:{
                        display:"flex",
                        alignItems:"center", gap:4
                      }
                    },
                      React.createElement(NxAvatar, {
                        user:r.author, size:"xs"
                      }),
                      r.author?.full_name
                    ),
                    r.subject_emp &&
                    React.createElement("span", null,
                      `→ ${r.subject_emp.full_name}`),
                    React.createElement("span", null,
                      fmtRelative(r.created_at))
                  )
                ),
                RC.isMgr(user) &&
                r.author_id === user.id &&
                React.createElement("button", {
                  className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                  onClick: e => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  },
                  style:{ color:"var(--danger)" }
                }, "🗑️")
              )
            );
          })
        ),

    showCreate && React.createElement(CreateReportModal, {
      user,
      reportTypes:REPORT_TYPES,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadReports();
        showToast("Report saved!", "success");
      }
    }),

    selected && React.createElement(ViewReportModal, {
      report:selected,
      reportTypes:REPORT_TYPES,
      onClose: () => setSelected(null)
    })
  );
}

/* Create Report Modal */
function CreateReportModal({ user, reportTypes, onClose, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    title:"", content:"", type:"daily",
    subject_id:"", is_private:false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (RC.isMgr(user)) {
      withRetry(() =>
        sb.from("employees")
          .select("id, full_name, role")
          .eq("is_active", true)
          .neq("id", user.id)
          .order("full_name")
      ).then(({ data }) => setEmployees(data || []));
    }
  }, []);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      showToast("Title and content required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("reports_notes").insert({
          title:      form.title.trim(),
          content:    form.content.trim(),
          type:       form.type,
          subject_id: form.subject_id || null,
          is_private: form.is_private,
          author_id:  user.id,
          created_at: new Date().toISOString()
        })
      );
      await logAudit("CREATE_REPORT",
        form.title, user.id);
      onCreated();
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
      className:"nx-modal nx-modal-lg",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "📄 New Report / Note"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:14 }
        },
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Type"),
            React.createElement("div", {
              style:{ display:"flex", gap:6, flexWrap:"wrap" }
            },
              reportTypes.map(t =>
                React.createElement("button", {
                  key:t.id,
                  className:`nx-btn nx-btn-sm ${
                    form.type === t.id
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(p => ({
                    ...p, type:t.id
                  }))
                }, `${t.icon} ${t.label}`)
              )
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Title"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"Report title...",
              value:form.title,
              onChange: e => setForm(p => ({
                ...p, title:e.target.value
              }))
            })
          ),
          RC.isMgr(user) && employees.length > 0 &&
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "About Employee (optional)"),
            React.createElement("select", {
              className:"nx-select",
              value:form.subject_id,
              onChange: e => setForm(p => ({
                ...p, subject_id:e.target.value
              }))
            },
              React.createElement("option", { value:"" },
                "General report"),
              employees.map(e =>
                React.createElement("option", {
                  key:e.id, value:e.id
                }, e.full_name)
              )
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Content"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Write your report...",
              value:form.content, rows:8,
              onChange: e => setForm(p => ({
                ...p, content:e.target.value
              }))
            })
          ),
          React.createElement("label", {
            className:"nx-checkbox-wrap"
          },
            React.createElement("div", {
              className:`nx-checkbox ${
                form.is_private ? "checked":""}`,
              onClick: () => setForm(p => ({
                ...p, is_private:!p.is_private
              }))
            }, form.is_private ? "✓" : ""),
            React.createElement("span", {
              style:{ fontSize:13, color:"var(--text-sub)" }
            }, "🔒 Private (only visible to managers)")
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
          onClick:handleSave, disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "💾 Save Report")
      )
    )
  );
}

/* View Report Modal */
function ViewReportModal({ report:r, reportTypes, onClose }) {
  const rType = reportTypes.find(t => t.id === r.type)
    || reportTypes[4];

  return React.createElement("div", {
    className:"nx-modal-backdrop", onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal nx-modal-lg",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, `${rType.icon} ${r.title}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{
            display:"flex", gap:8,
            flexWrap:"wrap", marginBottom:16
          }
        },
          React.createElement("span", {
            className:"nx-badge nx-badge-neutral"
          }, rType.label),
          r.is_private &&
          React.createElement("span", {
            className:"nx-badge nx-badge-warning"
          }, "🔒 Private"),
          React.createElement("span", {
            style:{ fontSize:11, color:"var(--text-muted)" }
          }, fmtDateTime(r.created_at))
        ),
        r.subject_emp &&
        React.createElement("div", {
          style:{
            display:"flex", alignItems:"center",
            gap:8, marginBottom:16,
            padding:"10px 14px",
            background:"var(--card2)",
            borderRadius:"var(--radius-sm)"
          }
        },
          React.createElement("span", {
            style:{ fontSize:12, color:"var(--text-muted)" }
          }, "About:"),
          React.createElement(NxAvatar, {
            user:r.subject_emp, size:"xs"
          }),
          React.createElement("span", {
            style:{
              fontSize:13, fontWeight:600,
              color:"var(--text)"
            }
          }, r.subject_emp.full_name)
        ),
        React.createElement("div", {
          style:{
            padding:"16px",
            background:"var(--card2)",
            borderRadius:"var(--radius-sm)",
            fontSize:13, color:"var(--text-sub)",
            lineHeight:1.8, whiteSpace:"pre-wrap",
            minHeight:200
          }
        }, r.content),
        React.createElement("div", {
          style:{
            display:"flex", alignItems:"center",
            gap:8, marginTop:16,
            fontSize:11, color:"var(--text-muted)"
          }
        },
          React.createElement(NxAvatar, {
            user:r.author, size:"xs"
          }),
          React.createElement("span", null,
            `Written by ${r.author?.full_name || "—"}`)
        )
      ),
      React.createElement("div", { className:"nx-modal-footer" },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Close")
      )
    )
  );
}

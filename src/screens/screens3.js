/* ============================================================
   NEXUS-CSOPS v4.2.0
   screens3.js — Part A
   SEC 16: Performance
   SEC 17: Queue
   SEC 18: Gamification
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 16 — PERFORMANCE
   ══════════════════════════════════════════════════════════ */
function PerformancePage({ user }) {
  const [period,    setPeriod]    = useState("week");
  const [empFilter, setEmpFilter] = useState(
    RC.isMgr(user) ? "all" : user.id
  );
  const [employees, setEmployees] = useState([]);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEntry, setShowEntry] = useState(false);
  const theme = ThemeMgr.get();

  useEffect(() => {
    if (RC.isMgr(user)) loadEmployees();
    loadPerformance();
  }, [period, empFilter]);

  async function loadEmployees() {
    try {
      const { data } = await withRetry(() =>
        sb.from("employees")
          .select("id, full_name, role, avatar_url")
          .eq("is_active", true)
          .order("full_name")
      );
      setEmployees(data || []);
    } catch(e) {}
  }

  async function loadPerformance() {
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
      } else if (period === "month") {
        from = new Date(now);
        from.setMonth(from.getMonth() - 1);
      } else {
        from = new Date(now);
        from.setFullYear(from.getFullYear() - 1);
      }

      const fromISO = from.toISOString();
      const empId   = empFilter === "all" ? null : empFilter;

      /* KPI Entries */
      let kpiQ = sb.from("kpi_entries")
        .select(`
          *,
          employee:employees!kpi_entries_employee_id_fkey(
            id, full_name, role, avatar_url
          )
        `)
        .gte("entry_date", fromISO.split("T")[0])
        .order("entry_date", { ascending: false });

      if (empId) kpiQ = kpiQ.eq("employee_id", empId);

      /* Attendance */
      let attQ = sb.from("attendance")
        .select("id, status, work_seconds, employee_id")
        .gte("date", fromISO.split("T")[0]);

      if (empId) attQ = attQ.eq("employee_id", empId);

      /* Breaks */
      let brkQ = sb.from("breaks")
        .select("id, duration_minutes, status, employee_id")
        .gte("date", fromISO.split("T")[0]);

      if (empId) brkQ = brkQ.eq("employee_id", empId);

      const [kpiRes, attRes, brkRes] = await Promise.all([
        withRetry(() => kpiQ),
        withRetry(() => attQ),
        withRetry(() => brkQ),
      ]);

      const kpis = kpiRes.data || [];
      const atts = attRes.data || [];
      const brks = brkRes.data || [];

      /* Aggregate */
      const totalCalls    = kpis.reduce(
        (s, k) => s + (k.calls_handled || 0), 0);
      const totalResolved = kpis.reduce(
        (s, k) => s + (k.cases_resolved || 0), 0);
      const avgCsat       = kpis.length > 0
        ? (kpis.reduce((s, k) =>
            s + (k.csat_score || 0), 0) / kpis.length
          ).toFixed(1)
        : "—";
      const avgAht        = kpis.length > 0
        ? Math.round(kpis.reduce((s, k) =>
            s + (k.aht_seconds || 0), 0) / kpis.length)
        : 0;
      const onTimeCount   = atts.filter(
        a => a.status === "on_time").length;
      const lateCount     = atts.filter(
        a => a.status === "late").length;
      const totalWorkSecs = atts.reduce(
        (s, a) => s + (a.work_seconds || 0), 0);
      const exceededBreaks = brks.filter(
        b => b.status === "exceeded").length;

      /* Per-employee breakdown (manager view) */
      let empBreakdown = [];
      if (empFilter === "all" && RC.isMgr(user)) {
        const empMap = {};
        kpis.forEach(k => {
          if (!empMap[k.employee_id]) {
            empMap[k.employee_id] = {
              emp:      k.employee,
              calls:    0,
              resolved: 0,
              csat:     [],
              entries:  0
            };
          }
          empMap[k.employee_id].calls    +=
            k.calls_handled  || 0;
          empMap[k.employee_id].resolved +=
            k.cases_resolved || 0;
          empMap[k.employee_id].csat.push(
            k.csat_score || 0);
          empMap[k.employee_id].entries++;
        });
        empBreakdown = Object.values(empMap)
          .map(e => ({
            ...e,
            avgCsat: e.csat.length > 0
              ? (e.csat.reduce((a,b) => a+b,0) /
                 e.csat.length).toFixed(1)
              : "—"
          }))
          .sort((a,b) => b.calls - a.calls);
      }

      setData({
        kpis, atts, brks,
        summary: {
          totalCalls,
          totalResolved,
          avgCsat,
          avgAht,
          onTimeCount,
          lateCount,
          totalWorkSecs,
          exceededBreaks,
          totalEntries: kpis.length
        },
        empBreakdown
      });

    } catch(e) {
      showToast("Failed to load performance", "error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading performance..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Performance",
      icon:  "📊",
      actions: React.createElement("div", {
        style: { display:"flex", gap:8 }
      },
        RC.isMgr(user) &&
        React.createElement("button", {
          className: "nx-btn nx-btn-primary nx-btn-sm",
          onClick: () => setShowEntry(true)
        }, "+ Log KPI"),
        React.createElement("select", {
          className: "nx-select",
          value: period,
          onChange: e => setPeriod(e.target.value),
          style: { width:"auto" }
        },
          [
            { v:"today", l:"Today" },
            { v:"week",  l:"This Week" },
            { v:"month", l:"This Month" },
            { v:"year",  l:"This Year" },
          ].map(o =>
            React.createElement("option", {
              key:o.v, value:o.v
            }, o.l)
          )
        )
      )
    }),

    /* Employee Filter (Manager) */
    RC.isMgr(user) &&
    React.createElement("div", {
      style: { marginBottom:20 }
    },
      React.createElement("select", {
        className: "nx-select",
        value: empFilter,
        onChange: e => setEmpFilter(e.target.value),
        style: { maxWidth:240 }
      },
        React.createElement("option", { value:"all" },
          "All Employees"),
        employees.map(e =>
          React.createElement("option", {
            key:e.id, value:e.id
          }, e.full_name)
        )
      )
    ),

    /* Tabs */
    React.createElement(Tabs, {
      tabs: [
        { id:"overview",  label:"Overview" },
        { id:"kpi",       label:"KPI Log" },
        { id:"attendance",label:"Attendance" },
        RC.isMgr(user) && empFilter === "all"
          ? { id:"team", label:"Team" }
          : null
      ].filter(Boolean),
      active: activeTab,
      onChange: setActiveTab
    }),

    React.createElement("div", {
      style: { marginTop:20 }
    },

      /* Overview Tab */
      activeTab === "overview" &&
      React.createElement("div", {
        style: {
          display:"flex",
          flexDirection:"column",
          gap:20
        }
      },
        /* KPI Cards */
        React.createElement("div", { className:"nx-grid-4" },
          [
            {
              label:"Total Calls",
              value: fmtNumber(data.summary.totalCalls),
              icon:"📞", color:"#3B82F6"
            },
            {
              label:"Cases Resolved",
              value: fmtNumber(data.summary.totalResolved),
              icon:"✅", color:"#22C55E"
            },
            {
              label:"Avg CSAT",
              value: data.summary.avgCsat,
              icon:"⭐", color:"#EAB308"
            },
            {
              label:"Avg AHT",
              value: data.summary.avgAht > 0
                ? fmtDuration(data.summary.avgAht)
                : "—",
              icon:"⏱️", color:"#8B5CF6"
            },
            {
              label:"On Time",
              value: data.summary.onTimeCount,
              icon:"🟢", color:"#22C55E"
            },
            {
              label:"Late",
              value: data.summary.lateCount,
              icon:"🟡", color:"#EAB308"
            },
            {
              label:"Work Hours",
              value: fmtDuration(
                data.summary.totalWorkSecs),
              icon:"🕐", color:"var(--primary)"
            },
            {
              label:"Break Exceeded",
              value: data.summary.exceededBreaks,
              icon:"⚠️", color:"#EF4444"
            },
          ].map(s =>
            React.createElement("div", {
              key:s.label,
              className:"nx-stat-card nx-card-enter"
            },
              React.createElement("div", {
                style:{
                  display:"flex",
                  justifyContent:"space-between"
                }
              },
                React.createElement("span", {
                  className:"nx-stat-label"
                }, s.label),
                React.createElement("span", {
                  style:{ fontSize:18 }
                }, s.icon)
              ),
              React.createElement("div", {
                className:"nx-stat-value",
                style:{
                  color: adaptColor(s.color, theme),
                  fontSize:22
                }
              }, s.value)
            )
          )
        )
      ),

      /* KPI Log Tab */
      activeTab === "kpi" &&
      React.createElement("div", null,
        data.kpis.length === 0
          ? React.createElement(EmptyState, {
              icon:"📊",
              title:"No KPI entries",
              desc:"Log KPI data using the button above"
            })
          : React.createElement("div", {
              className:"nx-table-wrap"
            },
              React.createElement("table", {
                className:"nx-table"
              },
                React.createElement("thead", null,
                  React.createElement("tr", null,
                    ["Date","Employee","Calls",
                     "Resolved","CSAT","AHT",
                     "Notes"].map(h =>
                      React.createElement("th", {
                        key:h
                      }, h)
                    )
                  )
                ),
                React.createElement("tbody", null,
                  data.kpis.map(k =>
                    React.createElement("tr", {
                      key:k.id
                    },
                      React.createElement("td", {
                        style:{ fontSize:11 }
                      }, fmtDate(k.entry_date)),
                      React.createElement("td", null,
                        React.createElement("div", {
                          style:{
                            display:"flex",
                            alignItems:"center",
                            gap:6
                          }
                        },
                          React.createElement(NxAvatar, {
                            user:k.employee, size:"xs"
                          }),
                          React.createElement("span", {
                            style:{
                              fontSize:12,
                              fontWeight:600
                            }
                          }, k.employee?.full_name || "—")
                        )
                      ),
                      React.createElement("td", {
                        style:{ fontWeight:700 }
                      }, k.calls_handled || 0),
                      React.createElement("td", null,
                        k.cases_resolved || 0),
                      React.createElement("td", null,
                        k.csat_score
                          ? React.createElement("span", {
                              style:{
                                color:"#EAB308",
                                fontWeight:700
                              }
                            }, `⭐ ${k.csat_score}`)
                          : "—"
                      ),
                      React.createElement("td", null,
                        k.aht_seconds
                          ? fmtDuration(k.aht_seconds)
                          : "—"
                      ),
                      React.createElement("td", {
                        style:{
                          fontSize:11,
                          color:"var(--text-sub)",
                          maxWidth:200
                        }
                      }, k.notes || "—")
                    )
                  )
                )
              )
            )
      ),

      /* Attendance Tab */
      activeTab === "attendance" &&
      React.createElement("div", null,
        data.atts.length === 0
          ? React.createElement(EmptyState, {
              icon:"✅",
              title:"No attendance records",
              desc:"No data for this period"
            })
          : React.createElement("div", {
              className:"nx-table-wrap"
            },
              React.createElement("table", {
                className:"nx-table"
              },
                React.createElement("thead", null,
                  React.createElement("tr", null,
                    ["Date","Status","Work Time"].map(h =>
                      React.createElement("th", {
                        key:h
                      }, h)
                    )
                  )
                ),
                React.createElement("tbody", null,
                  data.atts.map(a =>
                    React.createElement("tr", {
                      key:a.id
                    },
                      React.createElement("td", null,
                        fmtDate(a.date || a.clock_in)),
                      React.createElement("td", null,
                        React.createElement("span", {
                          className:`nx-badge ${
                            a.status === "on_time"
                              ? "nx-badge-success"
                              : a.status === "late"
                              ? "nx-badge-warning"
                              : "nx-badge-danger"}`
                        },
                          a.status?.replace("_"," ")
                            .toUpperCase()
                        )
                      ),
                      React.createElement("td", null,
                        a.work_seconds
                          ? fmtDuration(a.work_seconds)
                          : "—"
                      )
                    )
                  )
                )
              )
            )
      ),

      /* Team Tab */
      activeTab === "team" &&
      React.createElement("div", null,
        data.empBreakdown.length === 0
          ? React.createElement(EmptyState, {
              icon:"👥",
              title:"No team data",
              desc:"No KPI entries for this period"
            })
          : React.createElement("div", {
              className:"nx-table-wrap"
            },
              React.createElement("table", {
                className:"nx-table"
              },
                React.createElement("thead", null,
                  React.createElement("tr", null,
                    ["Employee","Calls","Resolved",
                     "Avg CSAT","Entries"].map(h =>
                      React.createElement("th", {
                        key:h
                      }, h)
                    )
                  )
                ),
                React.createElement("tbody", null,
                  data.empBreakdown.map((e, i) =>
                    React.createElement("tr", {
                      key:i
                    },
                      React.createElement("td", null,
                        React.createElement("div", {
                          style:{
                            display:"flex",
                            alignItems:"center",
                            gap:8
                          }
                        },
                          React.createElement("span", {
                            style:{
                              width:20,
                              fontSize:12,
                              fontWeight:700,
                              color:"var(--text-muted)"
                            }
                          }, `#${i+1}`),
                          React.createElement(NxAvatar, {
                            user:e.emp, size:"xs"
                          }),
                          React.createElement("span", {
                            style:{
                              fontSize:12,
                              fontWeight:600
                            }
                          }, e.emp?.full_name || "—")
                        )
                      ),
                      React.createElement("td", {
                        style:{
                          fontWeight:700,
                          color:"var(--primary)"
                        }
                      }, fmtNumber(e.calls)),
                      React.createElement("td", null,
                        fmtNumber(e.resolved)),
                      React.createElement("td", null,
                        e.avgCsat !== "—"
                          ? React.createElement("span", {
                              style:{
                                color:"#EAB308",
                                fontWeight:700
                              }
                            }, `⭐ ${e.avgCsat}`)
                          : "—"
                      ),
                      React.createElement("td", null,
                        e.entries)
                    )
                  )
                )
              )
            )
      )
    ),

    /* KPI Entry Modal */
    showEntry && React.createElement(KpiEntryModal, {
      user,
      employees,
      onClose: () => setShowEntry(false),
      onSaved: () => {
        setShowEntry(false);
        loadPerformance();
        showToast("KPI logged!", "success");
      }
    })
  );
}

/* KPI Entry Modal */
function KpiEntryModal({ user, employees, onClose, onSaved }) {
  const [form, setForm] = useState({
    employee_id:    user.id,
    entry_date:     new Date().toISOString().split("T")[0],
    calls_handled:  "",
    cases_resolved: "",
    csat_score:     "",
    aht_seconds:    "",
    notes:          ""
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.employee_id) {
      showToast("Employee required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("kpi_entries").insert({
          employee_id:    form.employee_id,
          entry_date:     form.entry_date,
          calls_handled:  parseInt(form.calls_handled)  || 0,
          cases_resolved: parseInt(form.cases_resolved) || 0,
          csat_score:     parseFloat(form.csat_score)   || null,
          aht_seconds:    parseInt(form.aht_seconds)    || null,
          notes:          form.notes.trim() || null,
          logged_by:      user.id,
          created_at:     new Date().toISOString()
        })
      );
      await logAudit("LOG_KPI",
        `Employee: ${form.employee_id}`, user.id);
      onSaved();
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className:"nx-modal-backdrop",
    onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", {
        className:"nx-modal-header"
      },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "📊 Log KPI Entry"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", {
        className:"nx-modal-body"
      },
        React.createElement("div", {
          style:{
            display:"flex",
            flexDirection:"column",
            gap:14
          }
        },
          /* Employee */
          RC.isMgr(user) &&
          React.createElement("div", {
            className:"nx-form-group"
          },
            React.createElement("label", {
              className:"nx-label"
            }, "Employee"),
            React.createElement("select", {
              className:"nx-select",
              value:form.employee_id,
              onChange: e => setForm(p => ({
                ...p, employee_id:e.target.value
              }))
            },
              employees.map(e =>
                React.createElement("option", {
                  key:e.id, value:e.id
                }, e.full_name)
              )
            )
          ),

          /* Date */
          React.createElement("div", {
            className:"nx-form-group"
          },
            React.createElement("label", {
              className:"nx-label"
            }, "Date"),
            React.createElement("input", {
              type:"date",
              className:"nx-input",
              value:form.entry_date,
              onChange: e => setForm(p => ({
                ...p, entry_date:e.target.value
              }))
            })
          ),

          /* KPI Fields */
          React.createElement("div", {
            className:"nx-grid-2"
          },
            [
              { key:"calls_handled",  label:"Calls Handled",
                type:"number", ph:"0" },
              { key:"cases_resolved", label:"Cases Resolved",
                type:"number", ph:"0" },
              { key:"csat_score",     label:"CSAT Score (1-5)",
                type:"number", ph:"4.5" },
              { key:"aht_seconds",    label:"AHT (seconds)",
                type:"number", ph:"180" },
            ].map(f =>
              React.createElement("div", {
                key:f.key,
                className:"nx-form-group"
              },
                React.createElement("label", {
                  className:"nx-label"
                }, f.label),
                React.createElement("input", {
                  type:f.type,
                  className:"nx-input",
                  placeholder:f.ph,
                  value:form[f.key],
                  min:"0",
                  onChange: e => setForm(p => ({
                    ...p, [f.key]:e.target.value
                  }))
                })
              )
            )
          ),

          /* Notes */
          React.createElement("div", {
            className:"nx-form-group"
          },
            React.createElement("label", {
              className:"nx-label"
            }, "Notes"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Optional notes...",
              value:form.notes,
              rows:3,
              onChange: e => setForm(p => ({
                ...p, notes:e.target.value
              }))
            })
          )
        )
      ),
      React.createElement("div", {
        className:"nx-modal-footer"
      },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Cancel"),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick:handleSave,
          disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "Save KPI")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 17 — QUEUE
   ══════════════════════════════════════════════════════════ */
function QueuePage({ user }) {
  const [queues,   setQueues]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editQ,    setEditQ]    = useState(null);
  const [now,      setNow]      = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadQueues();
    ChannelMgr.sub("queues", "queues", null, loadQueues);
    return () => ChannelMgr.unsub("queues");
  }, []);

  async function loadQueues() {
    try {
      const { data } = await withRetry(() =>
        sb.from("queues")
          .select("*")
          .eq("is_active", true)
          .order("queue_name")
      );
      setQueues(data || []);
    } catch(e) {
      showToast("Failed to load queues", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(queueId, field, value) {
    try {
      await withRetry(() =>
        sb.from("queues")
          .update({
            [field]:    value,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq("id", queueId)
      );
    } catch(e) {
      showToast("Failed to update", "error");
    }
  }

  async function handleDelete(queueId) {
    try {
      await withRetry(() =>
        sb.from("queues")
          .update({ is_active: false })
          .eq("id", queueId)
      );
      showToast("Queue removed", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  /* تحديد لون القائمة بناءً على العدد */
  function getQueueColor(count, threshold) {
    if (!threshold) return "var(--primary)";
    if (count >= threshold * 1.5) return "#EF4444";
    if (count >= threshold)       return "#EAB308";
    return "#22C55E";
  }

  /* إجمالي الانتظار */
  const totalWaiting = queues.reduce(
    (s, q) => s + (q.waiting_count || 0), 0
  );
  const alertQueues  = queues.filter(q =>
    q.waiting_count >= (q.alert_threshold || 999)
  ).length;

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading queues..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Queue Monitor",
      icon:  "🎧",
      subtitle: `${totalWaiting} total waiting${
        alertQueues > 0
          ? ` — ⚠️ ${alertQueues} alert(s)` : ""}`,
      actions: RC.isMgr(user) &&
        React.createElement("button", {
          className: "nx-btn nx-btn-primary nx-btn-sm",
          onClick: () => setShowAdd(true)
        }, "+ Add Queue")
    }),

    /* Summary Stats */
    React.createElement("div", {
      className: "nx-grid-4",
      style: { marginBottom:20 }
    },
      [
        {
          label:"Total Waiting",
          value:totalWaiting,
          icon:"⏳",
          color: totalWaiting > 20
            ? "#EF4444" : "var(--primary)"
        },
        {
          label:"Active Queues",
          value:queues.length,
          icon:"🎧",
          color:"var(--primary)"
        },
        {
          label:"Alerts",
          value:alertQueues,
          icon:"🚨",
          color: alertQueues > 0
            ? "#EF4444" : "#22C55E"
        },
        {
          label:"Last Update",
          value:now.toLocaleTimeString("en-GB", {
            hour:"2-digit", minute:"2-digit"
          }),
          icon:"🕐",
          color:"var(--text-sub)"
        },
      ].map(s =>
        React.createElement("div", {
          key:s.label,
          className:"nx-stat-card"
        },
          React.createElement("div", {
            style:{
              display:"flex",
              justifyContent:"space-between"
            }
          },
            React.createElement("span", {
              className:"nx-stat-label"
            }, s.label),
            React.createElement("span", {
              style:{ fontSize:18 }
            }, s.icon)
          ),
          React.createElement("div", {
            className:"nx-stat-value",
            style:{ color:s.color, fontSize:22 }
          }, s.value)
        )
      )
    ),

    /* Queue Cards */
    queues.length === 0
      ? React.createElement(EmptyState, {
          icon:"🎧",
          title:"No queues configured",
          desc:"Add queues using the button above"
        })
      : React.createElement("div", {
          style:{
            display:"grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(280px, 1fr))",
            gap:16
          }
        },
          queues.map(q => {
            const color = getQueueColor(
              q.waiting_count || 0,
              q.alert_threshold
            );
            const isAlert =
              (q.waiting_count || 0) >=
              (q.alert_threshold || 999);

            return React.createElement("div", {
              key:q.id,
              className:`nx-card nx-card-enter ${
                isAlert ? "nx-queue-high" : ""}`,
              style:{
                borderLeft:`3px solid ${color}`
              }
            },
              /* Queue Header */
              React.createElement("div", {
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"flex-start",
                  marginBottom:16
                }
              },
                React.createElement("div", null,
                  React.createElement("h3", {
                    style:{
                      fontSize:14,
                      fontWeight:700,
                      color:"var(--text)"
                    }
                  }, q.queue_name),
                  q.description &&
                  React.createElement("p", {
                    style:{
                      fontSize:11,
                      color:"var(--text-muted)",
                      marginTop:2
                    }
                  }, q.description)
                ),
                RC.isMgr(user) &&
                React.createElement("div", {
                  style:{ display:"flex", gap:4 }
                },
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => setEditQ(q)
                  }, "✏️"),
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => handleDelete(q.id),
                    style:{ color:"var(--danger)" }
                  }, "🗑️")
                )
              ),

              /* Waiting Count */
              React.createElement("div", {
                style:{ textAlign:"center", margin:"8px 0 16px" }
              },
                React.createElement("div", {
                  className: isAlert ? "nx-number-update" : "",
                  style:{
                    fontSize:56,
                    fontWeight:900,
                    color,
                    lineHeight:1,
                    fontVariantNumeric:"tabular-nums"
                  }
                }, q.waiting_count || 0),
                React.createElement("div", {
                  style:{
                    fontSize:12,
                    color:"var(--text-muted)",
                    marginTop:4
                  }
                }, "Waiting"),
                isAlert &&
                React.createElement("div", {
                  style:{
                    fontSize:11,
                    color:"#EF4444",
                    fontWeight:700,
                    marginTop:4
                  }
                }, "⚠️ THRESHOLD EXCEEDED")
              ),

              /* Stats Row */
              React.createElement("div", {
                style:{
                  display:"grid",
                  gridTemplateColumns:"1fr 1fr",
                  gap:8,
                  marginBottom:16
                }
              },
                [
                  {
                    label:"Avg Wait",
                    value: q.avg_wait_seconds
                      ? fmtDuration(q.avg_wait_seconds)
                      : "—"
                  },
                  {
                    label:"Agents",
                    value: q.agents_available || 0
                  },
                ].map(s =>
                  React.createElement("div", {
                    key:s.label,
                    style:{
                      padding:"8px",
                      background:"var(--card2)",
                      borderRadius:"var(--radius-sm)",
                      textAlign:"center"
                    }
                  },
                    React.createElement("div", {
                      style:{
                        fontSize:16,
                        fontWeight:800,
                        color:"var(--text)"
                      }
                    }, s.value),
                    React.createElement("div", {
                      style:{
                        fontSize:10,
                        color:"var(--text-muted)",
                        marginTop:2
                      }
                    }, s.label)
                  )
                )
              ),

              /* Update Controls (Manager) */
              RC.isMgr(user) &&
              React.createElement("div", {
                style:{
                  display:"flex",
                  gap:6,
                  alignItems:"center"
                }
              },
                React.createElement("button", {
                  className:"nx-btn nx-btn-danger nx-btn-sm",
                  onClick: () => handleUpdate(
                    q.id,
                    "waiting_count",
                    Math.max(0,
                      (q.waiting_count || 0) - 1)
                  )
                }, "−"),
                React.createElement("span", {
                  style:{
                    flex:1,
                    textAlign:"center",
                    fontSize:12,
                    color:"var(--text-sub)"
                  }
                }, "Adjust Count"),
                React.createElement("button", {
                  className:"nx-btn nx-btn-success nx-btn-sm",
                  onClick: () => handleUpdate(
                    q.id,
                    "waiting_count",
                    (q.waiting_count || 0) + 1
                  )
                }, "+"),
                React.createElement("button", {
                  className:"nx-btn nx-btn-secondary nx-btn-sm",
                  onClick: () => handleUpdate(
                    q.id, "waiting_count", 0
                  )
                }, "Reset")
              )
            );
          })
        ),

    /* Add/Edit Queue Modal */
    (showAdd || editQ) &&
    React.createElement(QueueModal, {
      queue: editQ,
      user,
      onClose: () => {
        setShowAdd(false);
        setEditQ(null);
      },
      onSaved: () => {
        setShowAdd(false);
        setEditQ(null);
        loadQueues();
        showToast(
          editQ ? "Queue updated!" : "Queue added!",
          "success"
        );
      }
    })
  );
}

/* Queue Modal */
function QueueModal({ queue, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    queue_name:       queue?.queue_name       || "",
    description:      queue?.description      || "",
    alert_threshold:  queue?.alert_threshold  || 10,
    agents_available: queue?.agents_available || 0,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.queue_name.trim()) {
      showToast("Queue name required", "warning");
      return;
    }
    setSaving(true);
    try {
      if (queue) {
        await withRetry(() =>
          sb.from("queues")
            .update({
              queue_name:       form.queue_name.trim(),
              description:      form.description.trim() || null,
              alert_threshold:  parseInt(form.alert_threshold) || 10,
              agents_available: parseInt(form.agents_available) || 0,
              updated_at:       new Date().toISOString(),
              updated_by:       user.id
            })
            .eq("id", queue.id)
        );
      } else {
        await withRetry(() =>
          sb.from("queues").insert({
            queue_name:       form.queue_name.trim(),
            description:      form.description.trim() || null,
            alert_threshold:  parseInt(form.alert_threshold) || 10,
            agents_available: parseInt(form.agents_available) || 0,
            waiting_count:    0,
            is_active:        true,
            created_by:       user.id,
            created_at:       new Date().toISOString()
          })
        );
      }
      await logAudit(
        queue ? "EDIT_QUEUE" : "ADD_QUEUE",
        form.queue_name, user.id
      );
      onSaved();
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className:"nx-modal-backdrop",
    onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", {
        className:"nx-modal-header"
      },
        React.createElement("span", {
          className:"nx-modal-title"
        }, queue ? "✏️ Edit Queue" : "🎧 Add Queue"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", {
        className:"nx-modal-body"
      },
        React.createElement("div", {
          style:{
            display:"flex",
            flexDirection:"column",
            gap:14
          }
        },
          [
            { key:"queue_name",       label:"Queue Name *",
              type:"text",   ph:"Customer Service" },
            { key:"description",      label:"Description",
              type:"text",   ph:"Main support queue" },
            { key:"alert_threshold",  label:"Alert Threshold",
              type:"number", ph:"10" },
            { key:"agents_available", label:"Agents Available",
              type:"number", ph:"5" },
          ].map(f =>
            React.createElement("div", {
              key:f.key,
              className:"nx-form-group"
            },
              React.createElement("label", {
                className:"nx-label"
              }, f.label),
              React.createElement("input", {
                type:f.type,
                className:"nx-input",
                placeholder:f.ph,
                value:form[f.key],
                min:"0",
                onChange: e => setForm(p => ({
                  ...p, [f.key]:e.target.value
                }))
              })
            )
          )
        )
      ),
      React.createElement("div", {
        className:"nx-modal-footer"
      },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Cancel"),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick:handleSave,
          disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : queue ? "Save Changes" : "Add Queue")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 18 — GAMIFICATION
   ══════════════════════════════════════════════════════════ */
function GamificationPage({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats,     setMyStats]     = useState(null);
  const [badges,      setBadges]      = useState([]);
  const [myBadges,    setMyBadges]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("leaderboard");
  const [period,      setPeriod]      = useState("month");
  const [showAward,   setShowAward]   = useState(false);

  useEffect(() => {
    loadData();
    ChannelMgr.sub(
      "gamification",
      "employee_points",
      null,
      loadData
    );
    return () => ChannelMgr.unsub("gamification");
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const now  = new Date();
      let from;
      if (period === "week") {
        from = new Date(now);
        from.setDate(from.getDate() - 7);
      } else if (period === "month") {
        from = new Date(now);
        from.setMonth(from.getMonth() - 1);
      } else {
        from = new Date(now);
        from.setFullYear(from.getFullYear() - 1);
      }

      const [lbRes, myRes, badgesRes, myBadgesRes] =
        await Promise.all([
          /* Leaderboard */
          withRetry(() =>
            sb.from("employee_points")
              .select(`
                employee_id,
                total_points,
                level,
                employee:employees!employee_points_employee_id_fkey(
                  id, full_name, role, avatar_url, department
                )
              `)
              .order("total_points", { ascending: false })
              .limit(20)
          ),
          /* My Stats */
          withRetry(() =>
            sb.from("employee_points")
              .select("*")
              .eq("employee_id", user.id)
              .single()
          ),
          /* All Badges */
          withRetry(() =>
            sb.from("badges")
              .select("*")
              .eq("is_active", true)
              .order("points_required")
          ),
          /* My Badges */
          withRetry(() =>
            sb.from("employee_badges")
              .select(`
                *,
                badge:badges!employee_badges_badge_id_fkey(*)
              `)
              .eq("employee_id", user.id)
              .order("awarded_at", { ascending: false })
          ),
        ]);

      setLeaderboard(lbRes.data || []);
      setMyStats(myRes.data || {
        total_points: 0, level: 1,
        weekly_points: 0, monthly_points: 0
      });
      setBadges(badgesRes.data || []);
      setMyBadges(myBadgesRes.data || []);

    } catch(e) {
      showToast("Failed to load gamification", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAwardPoints(
    empId, points, reason
  ) {
    try {
      /* Upsert points */
      const { data: current } = await withRetry(() =>
        sb.from("employee_points")
          .select("total_points, monthly_points")
          .eq("employee_id", empId)
          .single()
      );

      const newTotal   = (current?.total_points   || 0) + points;
      const newMonthly = (current?.monthly_points || 0) + points;
      const newLevel   = Math.floor(newTotal / 100) + 1;

      await withRetry(() =>
        sb.from("employee_points").upsert({
          employee_id:    empId,
          total_points:   newTotal,
          monthly_points: newMonthly,
          level:          newLevel,
          updated_at:     new Date().toISOString()
        }, { onConflict: "employee_id" })
      );

      /* Log point transaction */
      await withRetry(() =>
        sb.from("point_transactions").insert({
          employee_id:  empId,
          points,
          reason,
          awarded_by:   user.id,
          created_at:   new Date().toISOString()
        })
      );

      /* إشعار */
      await sendNotification(
        empId,
        "points_awarded",
        `🎯 +${points} Points!`,
        reason,
        "Gamification"
      );

      await logAudit("AWARD_POINTS",
        `+${points} to ${empId}: ${reason}`, user.id, empId);
      showToast(`✨ +${points} points awarded!`, "success");
      loadData();
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  /* حساب المستوى التالي */
  function getNextLevelPoints(level) {
    return level * 100;
  }

  function getLevelProgress(totalPoints, level) {
    const prevLevel = (level - 1) * 100;
    const nextLevel = level * 100;
    return Math.min(100, Math.round(
      ((totalPoints - prevLevel) /
       (nextLevel - prevLevel)) * 100
    ));
  }

  /* أيقونات المستويات */
  function getLevelIcon(level) {
    if (level >= 10) return "👑";
    if (level >= 7)  return "💎";
    if (level >= 5)  return "🏆";
    if (level >= 3)  return "⭐";
    return "🌱";
  }

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading gamification..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Gamification",
      icon:  "🎮",
      actions: React.createElement("div", {
        style:{ display:"flex", gap:8 }
      },
        RC.isMgr(user) &&
        React.createElement("button", {
          className:"nx-btn nx-btn-primary nx-btn-sm",
          onClick: () => setShowAward(true)
        }, "🎯 Award Points"),
        React.createElement("select", {
          className:"nx-select",
          value:period,
          onChange: e => setPeriod(e.target.value),
          style:{ width:"auto" }
        },
          [
            { v:"week",  l:"This Week" },
            { v:"month", l:"This Month" },
            { v:"year",  l:"This Year" },
          ].map(o =>
            React.createElement("option", {
              key:o.v, value:o.v
            }, o.l)
          )
        )
      )
    }),

    /* My Stats Card */
    myStats &&
    React.createElement("div", {
      className:"nx-card",
      style:{
        marginBottom:20,
        background:"linear-gradient(135deg, var(--card), var(--card2))",
        border:"1px solid var(--border-bright)"
      }
    },
      React.createElement("div", {
        style:{
          display:"flex",
          alignItems:"center",
          gap:16,
          flexWrap:"wrap"
        }
      },
        React.createElement("div", {
          style:{ fontSize:48 }
        }, getLevelIcon(myStats.level || 1)),
        React.createElement("div", { style:{ flex:1 } },
          React.createElement("div", {
            style:{
              fontSize:13,
              color:"var(--text-muted)",
              marginBottom:2
            }
          }, "Your Level"),
          React.createElement("div", {
            style:{
              fontSize:28,
              fontWeight:900,
              color:"var(--primary)"
            }
          }, `Level ${myStats.level || 1}`),
          React.createElement("div", {
            className:"nx-progress-bar",
            style:{ marginTop:8, maxWidth:300 }
          },
            React.createElement("div", {
              className:"nx-progress-fill",
              style:{
                width:`${getLevelProgress(
                  myStats.total_points || 0,
                  myStats.level || 1
                )}%`
              }
            })
          ),
          React.createElement("div", {
            style:{
              fontSize:11,
              color:"var(--text-muted)",
              marginTop:4
            }
          },
            `${myStats.total_points || 0} / ${
              getNextLevelPoints(myStats.level || 1)
            } pts to next level`
          )
        ),
        React.createElement("div", {
          style:{
            display:"flex",
            gap:16,
            flexWrap:"wrap"
          }
        },
          [
            { label:"Total",   value:myStats.total_points   || 0 },
            { label:"Monthly", value:myStats.monthly_points || 0 },
            { label:"Badges",  value:myBadges.length },
          ].map(s =>
            React.createElement("div", {
              key:s.label,
              style:{ textAlign:"center" }
            },
              React.createElement("div", {
                style:{
                  fontSize:22,
                  fontWeight:800,
                  color:"var(--primary)"
                }
              }, fmtNumber(s.value)),
              React.createElement("div", {
                style:{
                  fontSize:10,
                  color:"var(--text-muted)"
                }
              }, s.label)
            )
          )
        )
      )
    ),

    /* Tabs */
    React.createElement(Tabs, {
      tabs:[
        { id:"leaderboard", label:"🏆 Leaderboard" },
        { id:"badges",      label:"🎖️ Badges" },
        { id:"mybadges",    label:`⭐ My Badges (${myBadges.length})` },
      ],
      active:activeTab,
      onChange:setActiveTab
    }),

    React.createElement("div", {
      style:{ marginTop:20 }
    },

      /* Leaderboard */
      activeTab === "leaderboard" &&
      React.createElement("div", null,
        leaderboard.length === 0
          ? React.createElement(EmptyState, {
              icon:"🏆",
              title:"No data yet",
              desc:"Points will appear here"
            })
          : React.createElement("div", {
              style:{
                display:"flex",
                flexDirection:"column",
                gap:8
              }
            },
              leaderboard.map((entry, i) => {
                const isMe = entry.employee_id === user.id;
                const medal =
                  i === 0 ? "🥇" :
                  i === 1 ? "🥈" :
                  i === 2 ? "🥉" :
                  `#${i+1}`;

                return React.createElement("div", {
                  key: entry.employee_id,
                  className: `nx-card nx-card-enter ${
                    isMe ? "nx-rank-changed" : ""}`,
                  style:{
                    borderLeft:`3px solid ${
                      i === 0 ? "#FFD700" :
                      i === 1 ? "#C0C0C0" :
                      i === 2 ? "#CD7F32" :
                      "var(--border)"}`
                  }
                },
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      alignItems:"center",
                      gap:12
                    }
                  },
                    React.createElement("span", {
                      style:{
                        fontSize: i < 3 ? 24 : 14,
                        fontWeight:700,
                        minWidth:32,
                        textAlign:"center"
                      }
                    }, medal),
                    React.createElement(NxAvatar, {
                      user:entry.employee, size:"sm"
                    }),
                    React.createElement("div", {
                      style:{ flex:1 }
                    },
                      React.createElement("div", {
                        style:{
                          fontSize:13,
                          fontWeight:700,
                          color:"var(--text)"
                        }
                      },
                        entry.employee?.full_name || "—",
                        isMe &&
                        React.createElement("span", {
                          style:{
                            fontSize:10,
                            color:"var(--primary)",
                            marginLeft:6
                          }
                        }, "(You)")
                      ),
                      React.createElement("div", {
                        style:{
                          fontSize:10,
                          color:"var(--text-muted)"
                        }
                      },
                        `${getLevelIcon(entry.level || 1)} Level ${entry.level || 1}`
                      )
                    ),
                    React.createElement("div", {
                      style:{
                        fontSize:20,
                        fontWeight:900,
                        color: i === 0 ? "#FFD700" :
                               i === 1 ? "#C0C0C0" :
                               i === 2 ? "#CD7F32" :
                               "var(--primary)"
                      }
                    },
                      fmtNumber(entry.total_points || 0),
                      React.createElement("span", {
                        style:{
                          fontSize:10,
                          color:"var(--text-muted)",
                          marginLeft:3
                        }
                      }, "pts")
                    )
                  )
                );
              })
            )
      ),

      /* All Badges */
      activeTab === "badges" &&
      React.createElement("div", null,
        badges.length === 0
          ? React.createElement(EmptyState, {
              icon:"🎖️",
              title:"No badges configured",
              desc:"Badges will appear here"
            })
          : React.createElement("div", {
              style:{
                display:"grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(160px, 1fr))",
                gap:12
              }
            },
              badges.map(b => {
                const earned = myBadges.some(
                  mb => mb.badge_id === b.id
                );
                return React.createElement("div", {
                  key:b.id,
                  className:"nx-card",
                  style:{
                    textAlign:"center",
                    padding:"20px 12px",
                    opacity: earned ? 1 : 0.5,
                    border:`1px solid ${
                      earned
                        ? "var(--border-bright)"
                        : "var(--border)"}`
                  }
                },
                  React.createElement("div", {
                    style:{ fontSize:36, marginBottom:8 }
                  }, b.icon || "🎖️"),
                  React.createElement("div", {
                    style:{
                      fontSize:12,
                      fontWeight:700,
                      color:"var(--text)",
                      marginBottom:4
                    }
                  }, b.name),
                  React.createElement("div", {
                    style:{
                      fontSize:10,
                      color:"var(--text-muted)",
                      marginBottom:8
                    }
                  }, b.description),
                  React.createElement("div", {
                    style:{
                      fontSize:11,
                      color:"var(--primary)",
                      fontWeight:600
                    }
                  }, `${b.points_required} pts`),
                  earned &&
                  React.createElement("div", {
                    style:{
                      fontSize:10,
                      color:"var(--success)",
                      marginTop:4
                    }
                  }, "✅ Earned")
                );
              })
            )
      ),

      /* My Badges */
      activeTab === "mybadges" &&
      React.createElement("div", null,
        myBadges.length === 0
          ? React.createElement(EmptyState, {
              icon:"⭐",
              title:"No badges yet",
              desc:"Earn points to unlock badges!"
            })
          : React.createElement("div", {
              style:{
                display:"grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(160px, 1fr))",
                gap:12
              }
            },
              myBadges.map(mb =>
                React.createElement("div", {
                  key:mb.id,
                  className:"nx-card nx-badge-reveal",
                  style:{
                    textAlign:"center",
                    padding:"20px 12px",
                    border:"1px solid var(--border-bright)"
                  }
                },
                  React.createElement("div", {
                    style:{ fontSize:36, marginBottom:8 }
                  }, mb.badge?.icon || "🎖️"),
                  React.createElement("div", {
                    style:{
                      fontSize:12,
                      fontWeight:700,
                      color:"var(--text)",
                      marginBottom:4
                    }
                  }, mb.badge?.name || "Badge"),
                  React.createElement("div", {
                    style:{
                      fontSize:10,
                      color:"var(--text-muted)"
                    }
                  }, fmtDate(mb.awarded_at))
                )
              )
            )
      )
    ),

    /* Award Points Modal */
    showAward && React.createElement(AwardPointsModal, {
      user,
      onClose: () => setShowAward(false),
      onAwarded: (empId, pts, reason) => {
        handleAwardPoints(empId, pts, reason);
        setShowAward(false);
      }
    })
  );
}

/* Award Points Modal */
function AwardPointsModal({ user, onClose, onAwarded }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employee_id: "",
    points:      "10",
    reason:      ""
  });

  useEffect(() => {
    withRetry(() =>
      sb.from("employees")
        .select("id, full_name, role")
        .eq("is_active", true)
        .neq("id", user.id)
        .order("full_name")
    ).then(({ data }) => setEmployees(data || []));
  }, []);

  const QUICK_REASONS = [
    "Great performance! 🌟",
    "Helped a teammate 🤝",
    "Resolved complex case 💡",
    "Perfect attendance ✅",
    "Customer compliment ⭐",
    "Above & beyond 🚀",
  ];

  return React.createElement("div", {
    className:"nx-modal-backdrop",
    onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", {
        className:"nx-modal-header"
      },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "🎯 Award Points"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", {
        className:"nx-modal-body"
      },
        React.createElement("div", {
          style:{
            display:"flex",
            flexDirection:"column",
            gap:14
          }
        },
          /* Employee */
          React.createElement("div", {
            className:"nx-form-group"
          },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Employee"),
            React.createElement("select", {
              className:"nx-select",
              value:form.employee_id,
              onChange: e => setForm(p => ({
                ...p, employee_id:e.target.value
              }))
            },
              React.createElement("option", { value:"" },
                "Select employee..."),
              employees.map(e =>
                React.createElement("option", {
                  key:e.id, value:e.id
                }, `${RC.icon[e.role]} ${e.full_name}`)
              )
            )
          ),

          /* Points */
          React.createElement("div", {
            className:"nx-form-group"
          },
            React.createElement("label", {
              className:"nx-label"
            }, "Points"),
            React.createElement("div", {
              style:{ display:"flex", gap:6, flexWrap:"wrap" }
            },
              [5,10,25,50,100].map(p =>
                React.createElement("button", {
                  key:p,
                  className:`nx-btn nx-btn-sm ${
                    form.points === String(p)
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(prev => ({
                    ...prev, points:String(p)
                  }))
                }, `+${p}`)
              ),
              React.createElement("input", {
                type:"number",
                className:"nx-input",
                placeholder:"Custom",
                value:form.points,
                min:"1",
                onChange: e => setForm(p => ({
                  ...p, points:e.target.value
                })),
                style:{ width:80 }
              })
            )
          ),

          /* Reason */
          React.createElement("div", {
            className:"nx-form-group"
          },
            React.createElement("label", {
              className:"nx-label"
            }, "Reason"),
            React.createElement("div", {
              style:{
                display:"flex",
                flexWrap:"wrap",
                gap:6,
                marginBottom:8
              }
            },
              QUICK_REASONS.map(r =>
                React.createElement("button", {
                  key:r,
                  className:"nx-btn nx-btn-secondary nx-btn-sm",
                  onClick: () => setForm(p => ({
                    ...p, reason:r
                  })),
                  style:{ fontSize:11 }
                }, r)
              )
            ),
            React.createElement("input", {
              type:"text",
              className:"nx-input",
              placeholder:"Or type custom reason...",
              value:form.reason,
              onChange: e => setForm(p => ({
                ...p, reason:e.target.value
              }))
            })
          )
        )
      ),
      React.createElement("div", {
        className:"nx-modal-footer"
      },
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Cancel"),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary",
          onClick: () => {
            if (!form.employee_id || !form.points ||
                !form.reason.trim()) {
              showToast(
                "All fields required", "warning"
              );
              return;
            }
            onAwarded(
              form.employee_id,
              parseInt(form.points),
              form.reason.trim()
            );
          }
        }, "🎯 Award Points")
      )
    )
  );
}

/* ============================================================
   screens3.js — Part B
   SEC 19: Surveys
   SEC 20: CaseHandover
   SEC 21: TTTracker
   SEC 22: Chat
   SEC 23: Notifications
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 19 — SURVEYS
   ══════════════════════════════════════════════════════════ */
function SurveysPage({ user }) {
  const [surveys,    setSurveys]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [viewResults,  setViewResults]  = useState(null);
  const [filter,     setFilter]     = useState("active");

  useEffect(() => {
    loadSurveys();
    ChannelMgr.sub("surveys", "surveys", null, loadSurveys);
    return () => ChannelMgr.unsub("surveys");
  }, []);

  async function loadSurveys() {
    try {
      const { data } = await withRetry(() =>
        sb.from("surveys")
          .select(`
            *,
            creator:employees!surveys_created_by_fkey(
              id, full_name
            )
          `)
          .order("created_at", { ascending: false })
      );
      setSurveys(data || []);
    } catch(e) {
      showToast("Failed to load surveys", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await withRetry(() =>
        sb.from("surveys").delete().eq("id", id)
      );
      showToast("Survey deleted", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  async function toggleStatus(survey) {
    try {
      await withRetry(() =>
        sb.from("surveys")
          .update({
            is_active: !survey.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", survey.id)
      );
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const filtered = useMemo(() => {
    if (filter === "active")
      return surveys.filter(s => s.is_active);
    if (filter === "closed")
      return surveys.filter(s => !s.is_active);
    return surveys;
  }, [surveys, filter]);

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading surveys..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Surveys",
      icon:  "📋",
      actions: RC.isMgr(user) &&
        React.createElement("button", {
          className: "nx-btn nx-btn-primary",
          onClick: () => setShowCreate(true)
        }, "+ Create Survey")
    }),

    React.createElement(Tabs, {
      tabs: [
        { id:"active", label:"Active" },
        { id:"closed", label:"Closed" },
        { id:"all",    label:"All" },
      ],
      active: filter,
      onChange: setFilter
    }),

    React.createElement("div", {
      style: {
        display:"flex", flexDirection:"column",
        gap:12, marginTop:16
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon:"📋",
            title:"No surveys",
            desc:"Create a survey to gather feedback"
          })
        : filtered.map(s => {
            const hasResponded =
              (s.responded_by || []).includes(user.id);
            return React.createElement("div", {
              key: s.id,
              className: "nx-card nx-card-enter",
              style: {
                borderLeft: `3px solid ${
                  s.is_active
                    ? "var(--primary)"
                    : "var(--border)"}`
              }
            },
              React.createElement("div", {
                style: {
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
                      gap:8,
                      flexWrap:"wrap",
                      marginBottom:6
                    }
                  },
                    React.createElement("h3", {
                      style:{
                        fontSize:15,
                        fontWeight:700,
                        color:"var(--text)"
                      }
                    }, s.title),
                    React.createElement("span", {
                      className:`nx-badge ${
                        s.is_active
                          ? "nx-badge-success"
                          : "nx-badge-neutral"}`
                    }, s.is_active ? "Active" : "Closed"),
                    hasResponded &&
                    React.createElement("span", {
                      className:"nx-badge nx-badge-info"
                    }, "✅ Responded")
                  ),
                  s.description &&
                  React.createElement("p", {
                    style:{
                      fontSize:13,
                      color:"var(--text-sub)",
                      marginBottom:8
                    }
                  }, s.description),
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      gap:12,
                      fontSize:11,
                      color:"var(--text-muted)"
                    }
                  },
                    React.createElement("span", null,
                      `📝 ${(s.questions || []).length} questions`),
                    React.createElement("span", null,
                      `👥 ${(s.responded_by || []).length} responses`),
                    React.createElement("span", null,
                      `By: ${s.creator?.full_name || "—"}`),
                    React.createElement("span", null,
                      fmtRelative(s.created_at))
                  )
                ),
                React.createElement("div", {
                  style:{ display:"flex", gap:6, flexShrink:0 }
                },
                  s.is_active && !hasResponded &&
                  React.createElement("button", {
                    className:"nx-btn nx-btn-primary nx-btn-sm",
                    onClick: () => setActiveSurvey(s)
                  }, "📝 Take Survey"),
                  RC.isMgr(user) &&
                  React.createElement("button", {
                    className:"nx-btn nx-btn-secondary nx-btn-sm",
                    onClick: () => setViewResults(s)
                  }, "📊 Results"),
                  RC.isMgr(user) &&
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => toggleStatus(s),
                    title: s.is_active ? "Close" : "Reopen"
                  }, s.is_active ? "🔒" : "🔓"),
                  RC.isMgr(user) &&
                  React.createElement("button", {
                    className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                    onClick: () => handleDelete(s.id),
                    style:{ color:"var(--danger)" }
                  }, "🗑️")
                )
              )
            );
          })
    ),

    showCreate && React.createElement(CreateSurveyModal, {
      user,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadSurveys();
        showToast("Survey created!", "success");
      }
    }),

    activeSurvey && React.createElement(TakeSurveyModal, {
      survey: activeSurvey,
      user,
      onClose: () => setActiveSurvey(null),
      onSubmitted: () => {
        setActiveSurvey(null);
        loadSurveys();
        showToast("Response submitted! ✅", "success");
      }
    }),

    viewResults && React.createElement(SurveyResultsModal, {
      survey: viewResults,
      onClose: () => setViewResults(null)
    })
  );
}

/* Create Survey Modal */
function CreateSurveyModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: ""
  });
  const [questions, setQuestions] = useState([
    { id:1, text:"", type:"rating", options:[] }
  ]);
  const [saving, setSaving] = useState(false);

  const Q_TYPES = [
    { id:"rating",   label:"Rating (1-5)",   icon:"⭐" },
    { id:"yesno",    label:"Yes / No",        icon:"✅" },
    { id:"text",     label:"Text Answer",     icon:"📝" },
    { id:"choice",   label:"Multiple Choice", icon:"🔘" },
  ];

  function addQuestion() {
    setQuestions(p => [...p, {
      id: Date.now(),
      text: "", type: "rating", options: []
    }]);
  }

  function removeQuestion(id) {
    setQuestions(p => p.filter(q => q.id !== id));
  }

  function updateQuestion(id, field, value) {
    setQuestions(p => p.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast("Title required", "warning");
      return;
    }
    const validQs = questions.filter(q => q.text.trim());
    if (validQs.length === 0) {
      showToast("Add at least one question", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("surveys").insert({
          title:        form.title.trim(),
          description:  form.description.trim() || null,
          questions:    validQs,
          is_active:    true,
          responded_by: [],
          created_by:   user.id,
          created_at:   new Date().toISOString()
        })
      );
      await logAudit("CREATE_SURVEY",
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
        }, "📋 Create Survey"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:16 }
        },
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Title"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"Survey title...",
              value:form.title,
              onChange: e => setForm(p => ({
                ...p, title:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Description"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Optional description...",
              value:form.description, rows:2,
              onChange: e => setForm(p => ({
                ...p, description:e.target.value
              }))
            })
          ),
          React.createElement("div", {
            className:"nx-divider-label"
          }, "Questions"),
          questions.map((q, i) =>
            React.createElement("div", {
              key:q.id,
              style:{
                padding:"14px",
                background:"var(--card2)",
                borderRadius:"var(--radius-sm)",
                border:"1px solid var(--border)"
              }
            },
              React.createElement("div", {
                style:{
                  display:"flex",
                  justifyContent:"space-between",
                  marginBottom:10
                }
              },
                React.createElement("span", {
                  style:{
                    fontSize:12,
                    fontWeight:700,
                    color:"var(--text-sub)"
                  }
                }, `Q${i+1}`),
                questions.length > 1 &&
                React.createElement("button", {
                  className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                  onClick: () => removeQuestion(q.id),
                  style:{ color:"var(--danger)" }
                }, "✕")
              ),
              React.createElement("input", {
                type:"text", className:"nx-input",
                placeholder:"Question text...",
                value:q.text,
                onChange: e => updateQuestion(
                  q.id, "text", e.target.value
                ),
                style:{ marginBottom:8 }
              }),
              React.createElement("div", {
                style:{ display:"flex", gap:6, flexWrap:"wrap" }
              },
                Q_TYPES.map(t =>
                  React.createElement("button", {
                    key:t.id,
                    className:`nx-btn nx-btn-sm ${
                      q.type === t.id
                        ? "nx-btn-primary"
                        : "nx-btn-secondary"}`,
                    onClick: () => updateQuestion(
                      q.id, "type", t.id
                    ),
                    style:{ fontSize:11 }
                  }, `${t.icon} ${t.label}`)
                )
              ),
              q.type === "choice" &&
              React.createElement("div", {
                style:{ marginTop:8 }
              },
                React.createElement("input", {
                  type:"text", className:"nx-input",
                  placeholder:"Options (comma separated): A, B, C",
                  value:(q.options || []).join(", "),
                  onChange: e => updateQuestion(
                    q.id, "options",
                    e.target.value.split(",")
                      .map(o => o.trim())
                      .filter(Boolean)
                  )
                })
              )
            )
          ),
          React.createElement("button", {
            className:"nx-btn nx-btn-secondary nx-btn-sm",
            onClick:addQuestion
          }, "+ Add Question")
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
        }, saving ? React.createElement(Spinner) : "Create Survey")
      )
    )
  );
}

/* Take Survey Modal */
function TakeSurveyModal({ survey, user, onClose, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [saving,  setSaving]  = useState(false);

  async function handleSubmit() {
    const qs = survey.questions || [];
    const unanswered = qs.filter(
      q => !answers[q.id] && answers[q.id] !== 0
    );
    if (unanswered.length > 0) {
      showToast("Please answer all questions", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("survey_responses").insert({
          survey_id:   survey.id,
          employee_id: user.id,
          answers,
          created_at:  new Date().toISOString()
        })
      );
      await withRetry(() =>
        sb.from("surveys")
          .update({
            responded_by: [
              ...(survey.responded_by || []),
              user.id
            ]
          })
          .eq("id", survey.id)
      );
      onSubmitted();
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
        }, `📋 ${survey.title}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        survey.description &&
        React.createElement("p", {
          style:{
            fontSize:13, color:"var(--text-sub)",
            marginBottom:20, lineHeight:1.6
          }
        }, survey.description),
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:20 }
        },
          (survey.questions || []).map((q, i) =>
            React.createElement("div", {
              key:q.id || i,
              style:{
                padding:"16px",
                background:"var(--card2)",
                borderRadius:"var(--radius-sm)",
                border:"1px solid var(--border)"
              }
            },
              React.createElement("p", {
                style:{
                  fontSize:14, fontWeight:600,
                  color:"var(--text)", marginBottom:12
                }
              }, `${i+1}. ${q.text}`),
              /* Rating */
              q.type === "rating" &&
              React.createElement("div", {
                style:{ display:"flex", gap:8 }
              },
                [1,2,3,4,5].map(n =>
                  React.createElement("button", {
                    key:n,
                    className:`nx-btn nx-btn-sm ${
                      answers[q.id] === n
                        ? "nx-btn-primary"
                        : "nx-btn-secondary"}`,
                    onClick: () => setAnswers(p => ({
                      ...p, [q.id]:n
                    })),
                    style:{ fontSize:18 }
                  }, "⭐".repeat(n))
                )
              ),
              /* Yes/No */
              q.type === "yesno" &&
              React.createElement("div", {
                style:{ display:"flex", gap:8 }
              },
                ["Yes","No"].map(v =>
                  React.createElement("button", {
                    key:v,
                    className:`nx-btn nx-btn-sm ${
                      answers[q.id] === v
                        ? "nx-btn-primary"
                        : "nx-btn-secondary"}`,
                    onClick: () => setAnswers(p => ({
                      ...p, [q.id]:v
                    }))
                  }, v === "Yes" ? "✅ Yes" : "❌ No")
                )
              ),
              /* Text */
              q.type === "text" &&
              React.createElement("textarea", {
                className:"nx-textarea",
                placeholder:"Your answer...",
                value:answers[q.id] || "",
                rows:3,
                onChange: e => setAnswers(p => ({
                  ...p, [q.id]:e.target.value
                }))
              }),
              /* Choice */
              q.type === "choice" &&
              React.createElement("div", {
                style:{ display:"flex", gap:6, flexWrap:"wrap" }
              },
                (q.options || []).map(opt =>
                  React.createElement("button", {
                    key:opt,
                    className:`nx-btn nx-btn-sm ${
                      answers[q.id] === opt
                        ? "nx-btn-primary"
                        : "nx-btn-secondary"}`,
                    onClick: () => setAnswers(p => ({
                      ...p, [q.id]:opt
                    }))
                  }, opt)
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
          onClick:handleSubmit, disabled:saving
        }, saving
          ? React.createElement(Spinner)
          : "Submit Response")
      )
    )
  );
}

/* Survey Results Modal */
function SurveyResultsModal({ survey, onClose }) {
  const [responses, setResponses] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    withRetry(() =>
      sb.from("survey_responses")
        .select(`
          *,
          employee:employees!survey_responses_employee_id_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq("survey_id", survey.id)
        .order("created_at", { ascending:false })
    ).then(({ data }) => {
      setResponses(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading results..." });

  return React.createElement("div", {
    className:"nx-modal-backdrop", onClick:onClose
  },
    React.createElement("div", {
      className:"nx-modal nx-modal-xl",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, `📊 Results — ${survey.title}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("p", {
          style:{
            fontSize:13, color:"var(--text-muted)",
            marginBottom:16
          }
        }, `${responses.length} total responses`),
        responses.length === 0
          ? React.createElement(EmptyState, {
              icon:"📊", title:"No responses yet"
            })
          : React.createElement("div", {
              style:{ display:"flex", flexDirection:"column", gap:16 }
            },
              (survey.questions || []).map((q, i) => {
                const qAnswers = responses.map(
                  r => r.answers?.[q.id]
                ).filter(a => a !== undefined && a !== null);

                return React.createElement("div", {
                  key:q.id || i,
                  className:"nx-card nx-card-sm"
                },
                  React.createElement("p", {
                    style:{
                      fontSize:13, fontWeight:700,
                      color:"var(--text)", marginBottom:10
                    }
                  }, `${i+1}. ${q.text}`),
                  q.type === "rating" &&
                  React.createElement("div", null,
                    React.createElement("div", {
                      style:{
                        fontSize:22, fontWeight:800,
                        color:"#EAB308"
                      }
                    },
                      `⭐ ${qAnswers.length > 0
                        ? (qAnswers.reduce((a,b) =>
                            a+b,0) / qAnswers.length
                          ).toFixed(1)
                        : "—"} avg`
                    )
                  ),
                  q.type === "yesno" &&
                  React.createElement("div", {
                    style:{ display:"flex", gap:16 }
                  },
                    ["Yes","No"].map(v => {
                      const count = qAnswers.filter(
                        a => a === v
                      ).length;
                      const pct = qAnswers.length > 0
                        ? Math.round(
                            (count/qAnswers.length)*100
                          ) : 0;
                      return React.createElement("div", {
                        key:v
                      },
                        React.createElement("span", {
                          style:{
                            fontSize:16, fontWeight:700,
                            color: v==="Yes"
                              ? "var(--success)"
                              : "var(--danger)"
                          }
                        }, `${v}: ${count} (${pct}%)`)
                      );
                    })
                  ),
                  q.type === "text" &&
                  React.createElement("div", {
                    style:{
                      maxHeight:150, overflowY:"auto",
                      display:"flex",
                      flexDirection:"column", gap:4
                    }
                  },
                    qAnswers.slice(0,10).map((a,idx) =>
                      React.createElement("div", {
                        key:idx,
                        style:{
                          fontSize:12, padding:"6px 10px",
                          background:"var(--card2)",
                          borderRadius:"var(--radius-sm)",
                          color:"var(--text-sub)"
                        }
                      }, a)
                    )
                  ),
                  q.type === "choice" &&
                  React.createElement("div", {
                    style:{
                      display:"flex", gap:8, flexWrap:"wrap"
                    }
                  },
                    (q.options || []).map(opt => {
                      const count = qAnswers.filter(
                        a => a === opt
                      ).length;
                      return React.createElement("span", {
                        key:opt,
                        className:"nx-badge nx-badge-neutral"
                      }, `${opt}: ${count}`)
                    })
                  )
                );
              })
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

/* ══════════════════════════════════════════════════════════
   SEC 20 — CASE HANDOVER
   ══════════════════════════════════════════════════════════ */
function CaseHandoverPage({ user }) {
  const [cases,      setCases]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");

  useEffect(() => {
    loadCases();
    ChannelMgr.sub(
      "case_handovers", "case_handovers",
      null, loadCases
    );
    return () => ChannelMgr.unsub("case_handovers");
  }, []);

  async function loadCases() {
    try {
      const { data } = await withRetry(() =>
        sb.from("case_handovers")
          .select(`
            *,
            from_emp:employees!case_handovers_from_id_fkey(
              id, full_name, role, avatar_url
            ),
            to_emp:employees!case_handovers_to_id_fkey(
              id, full_name, role, avatar_url
            )
          `)
          .order("created_at", { ascending:false })
          .limit(100)
      );
      setCases(data || []);
    } catch(e) {
      showToast("Failed to load cases", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(id) {
    try {
      await withRetry(() =>
        sb.from("case_handovers")
          .update({
            status:          "acknowledged",
            acknowledged_by: user.id,
            acknowledged_at: new Date().toISOString()
          })
          .eq("id", id)
      );
      await logAudit("ACK_CASE", `Case #${id}`, user.id);
      showToast("✅ Case acknowledged", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  async function handleClose(id) {
    try {
      await withRetry(() =>
        sb.from("case_handovers")
          .update({
            status:     "closed",
            closed_by:  user.id,
            closed_at:  new Date().toISOString()
          })
          .eq("id", id)
      );
      showToast("Case closed", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const filtered = useMemo(() => {
    let list = cases;
    if (filter !== "all") {
      list = list.filter(c => c.status === filter);
    }
    if (search) {
      list = list.filter(c =>
        c.case_number?.toLowerCase()
          .includes(search.toLowerCase()) ||
        c.customer_name?.toLowerCase()
          .includes(search.toLowerCase()) ||
        c.issue?.toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    return list;
  }, [cases, filter, search]);

  const STATUS_COLORS = {
    pending:       "var(--warning)",
    acknowledged:  "var(--info)",
    closed:        "var(--success)",
  };

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading cases..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"Case Handover",
      icon:"🗂️",
      subtitle:`${cases.filter(c => c.status === "pending").length} pending`,
      actions: React.createElement("button", {
        className:"nx-btn nx-btn-primary",
        onClick: () => setShowCreate(true)
      }, "+ New Case")
    }),

    React.createElement("div", {
      style:{
        display:"flex", gap:10,
        marginBottom:16, flexWrap:"wrap"
      }
    },
      React.createElement(SearchInput, {
        value:search, onChange:setSearch,
        placeholder:"Search cases..."
      }),
      React.createElement(Tabs, {
        tabs:[
          { id:"all",          label:"All" },
          { id:"pending",      label:"Pending" },
          { id:"acknowledged", label:"Acknowledged" },
          { id:"closed",       label:"Closed" },
        ],
        active:filter, onChange:setFilter
      })
    ),

    filtered.length === 0
      ? React.createElement(EmptyState, {
          icon:"🗂️", title:"No cases found"
        })
      : React.createElement("div", {
          style:{
            display:"flex", flexDirection:"column", gap:10
          }
        },
          filtered.map(c =>
            React.createElement("div", {
              key:c.id,
              className:"nx-card nx-card-enter",
              style:{
                borderLeft:`3px solid ${
                  STATUS_COLORS[c.status] || "var(--border)"}`
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
                      marginBottom:6
                    }
                  },
                    c.case_number &&
                    React.createElement("code", {
                      style:{
                        fontSize:12, fontWeight:700,
                        background:"var(--card2)",
                        padding:"2px 6px",
                        borderRadius:4,
                        color:"var(--primary)"
                      }
                    }, c.case_number),
                    React.createElement("span", {
                      className:"nx-badge",
                      style:{
                        background:`${STATUS_COLORS[c.status]}22`,
                        color:STATUS_COLORS[c.status],
                        border:`1px solid ${STATUS_COLORS[c.status]}44`
                      }
                    }, c.status?.toUpperCase()),
                    React.createElement(PriorityBadge, {
                      priority:c.priority || "medium"
                    })
                  ),
                  c.customer_name &&
                  React.createElement("div", {
                    style:{
                      fontSize:13, fontWeight:600,
                      color:"var(--text)", marginBottom:4
                    }
                  }, `👤 ${c.customer_name}`),
                  React.createElement("p", {
                    style:{
                      fontSize:13, color:"var(--text-sub)",
                      lineHeight:1.5, marginBottom:8
                    }
                  }, c.issue),
                  React.createElement("div", {
                    style:{
                      display:"flex", gap:8,
                      alignItems:"center", flexWrap:"wrap"
                    }
                  },
                    React.createElement("div", {
                      style:{
                        display:"flex",
                        alignItems:"center", gap:4
                      }
                    },
                      React.createElement(NxAvatar, {
                        user:c.from_emp, size:"xs"
                      }),
                      React.createElement("span", {
                        style:{
                          fontSize:11,
                          color:"var(--text-muted)"
                        }
                      }, c.from_emp?.full_name),
                      React.createElement("span", {
                        style:{ fontSize:11 }
                      }, "→"),
                      React.createElement(NxAvatar, {
                        user:c.to_emp, size:"xs"
                      }),
                      React.createElement("span", {
                        style:{
                          fontSize:11,
                          color:"var(--text-muted)"
                        }
                      }, c.to_emp?.full_name)
                    ),
                    React.createElement("span", {
                      style:{
                        fontSize:11,
                        color:"var(--text-muted)"
                      }
                    }, fmtRelative(c.created_at))
                  )
                ),
                React.createElement("div", {
                  style:{ display:"flex", gap:4, flexShrink:0 }
                },
                  React.createElement("button", {
                    className:"nx-btn nx-btn-secondary nx-btn-icon-sm",
                    onClick: () => setSelected(c)
                  }, "👁️"),
                  c.status === "pending" &&
                  c.to_id === user.id &&
                  React.createElement("button", {
                    className:"nx-btn nx-btn-success nx-btn-sm",
                    onClick: () => handleAcknowledge(c.id)
                  }, "✅ Ack"),
                  c.status === "acknowledged" &&
                  RC.isMgr(user) &&
                  React.createElement("button", {
                    className:"nx-btn nx-btn-secondary nx-btn-sm",
                    onClick: () => handleClose(c.id)
                  }, "🔒 Close")
                )
              )
            )
          )
        ),

    showCreate && React.createElement(CreateCaseModal, {
      user,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadCases();
        showToast("Case created!", "success");
      }
    }),

    selected && React.createElement(ViewCaseModal, {
      caseData:selected, user,
      onClose: () => setSelected(null),
      onAck: () => {
        handleAcknowledge(selected.id);
        setSelected(null);
      },
      onClose2: () => {
        handleClose(selected.id);
        setSelected(null);
      }
    })
  );
}

/* Create Case Modal */
function CreateCaseModal({ user, onClose, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    to_id:"", case_number:"", customer_name:"",
    issue:"", priority:"medium", notes:""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    withRetry(() =>
      sb.from("employees")
        .select("id, full_name, role")
        .eq("is_active", true)
        .neq("id", user.id)
        .order("full_name")
    ).then(({ data }) => setEmployees(data || []));
  }, []);

  async function handleSave() {
    if (!form.to_id || !form.issue.trim()) {
      showToast("Recipient and issue required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("case_handovers").insert({
          from_id:       user.id,
          to_id:         form.to_id,
          case_number:   form.case_number.trim() || null,
          customer_name: form.customer_name.trim() || null,
          issue:         form.issue.trim(),
          priority:      form.priority,
          notes:         form.notes.trim() || null,
          status:        "pending",
          created_at:    new Date().toISOString()
        })
      );
      await sendNotification(
        form.to_id, "case_handover",
        "New Case Handover",
        `${user.full_name} handed over a case to you`,
        "Case Handover"
      );
      await logAudit("CREATE_CASE",
        form.case_number || "new", user.id);
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
      className:"nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "🗂️ New Case Handover"),
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
            }, "Hand Over To"),
            React.createElement("select", {
              className:"nx-select",
              value:form.to_id,
              onChange: e => setForm(p => ({
                ...p, to_id:e.target.value
              }))
            },
              React.createElement("option", { value:"" },
                "Select employee..."),
              employees.map(e =>
                React.createElement("option", {
                  key:e.id, value:e.id
                }, `${RC.icon[e.role]} ${e.full_name}`)
              )
            )
          ),
          React.createElement("div", { className:"nx-grid-2" },
            React.createElement("div", {
              className:"nx-form-group"
            },
              React.createElement("label", {
                className:"nx-label"
              }, "Case Number"),
              React.createElement("input", {
                type:"text", className:"nx-input",
                placeholder:"CASE-001",
                value:form.case_number,
                onChange: e => setForm(p => ({
                  ...p, case_number:e.target.value
                }))
              })
            ),
            React.createElement("div", {
              className:"nx-form-group"
            },
              React.createElement("label", {
                className:"nx-label"
              }, "Customer Name"),
              React.createElement("input", {
                type:"text", className:"nx-input",
                placeholder:"Customer name",
                value:form.customer_name,
                onChange: e => setForm(p => ({
                  ...p, customer_name:e.target.value
                }))
              })
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label nx-label-required"
            }, "Issue Description"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Describe the issue...",
              value:form.issue, rows:3,
              onChange: e => setForm(p => ({
                ...p, issue:e.target.value
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
              ["low","medium","high","critical"].map(p =>
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
                  p === "low"      ? "🟢 Low" :
                  p === "medium"   ? "🟡 Medium" :
                  p === "high"     ? "🔴 High" :
                  "🚨 Critical"
                )
              )
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Additional Notes"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Any additional notes...",
              value:form.notes, rows:2,
              onChange: e => setForm(p => ({
                ...p, notes:e.target.value
              }))
            })
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
          : "Create Case")
      )
    )
  );
}

/* View Case Modal */
function ViewCaseModal({ caseData:c, user, onClose, onAck, onClose2 }) {
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
        }, `🗂️ ${c.case_number || "Case Details"}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:12 }
        },
          [
            { label:"Case #",    value:c.case_number || "—" },
            { label:"Customer",  value:c.customer_name || "—" },
            { label:"Priority",  value:React.createElement(PriorityBadge,{priority:c.priority||"medium"}) },
            { label:"Status",    value:c.status?.toUpperCase() },
            { label:"Created",   value:fmtDateTime(c.created_at) },
          ].map(item =>
            React.createElement("div", {
              key:item.label,
              style:{
                display:"flex", justifyContent:"space-between",
                padding:"8px 12px",
                background:"var(--card2)",
                borderRadius:"var(--radius-sm)"
              }
            },
              React.createElement("span", {
                style:{ fontSize:12, color:"var(--text-sub)" }
              }, item.label),
              React.createElement("span", {
                style:{
                  fontSize:12, fontWeight:700,
                  color:"var(--text)"
                }
              }, item.value)
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Issue"),
            React.createElement("div", {
              style:{
                padding:"10px 12px",
                background:"var(--card2)",
                borderRadius:"var(--radius-sm)",
                fontSize:13, color:"var(--text-sub)",
                lineHeight:1.6, whiteSpace:"pre-wrap"
              }
            }, c.issue)
          ),
          c.notes &&
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Notes"),
            React.createElement("div", {
              style:{
                padding:"10px 12px",
                background:"var(--card2)",
                borderRadius:"var(--radius-sm)",
                fontSize:13, color:"var(--text-sub)",
                lineHeight:1.6
              }
            }, c.notes)
          )
        )
      ),
      React.createElement("div", { className:"nx-modal-footer" },
        c.status === "pending" && c.to_id === user.id &&
        React.createElement("button", {
          className:"nx-btn nx-btn-success",
          onClick:onAck
        }, "✅ Acknowledge"),
        c.status === "acknowledged" && RC.isMgr(user) &&
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose2
        }, "🔒 Close Case"),
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary",
          onClick:onClose
        }, "Close")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 21 — TT TRACKER
   ══════════════════════════════════════════════════════════ */
function TTTrackerPage({ user }) {
  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");

  const STATUSES = [
    { id:"open",        label:"Open",        color:"#3B82F6" },
    { id:"in_progress", label:"In Progress", color:"#F97316" },
    { id:"pending",     label:"Pending",     color:"#EAB308" },
    { id:"resolved",    label:"Resolved",    color:"#22C55E" },
    { id:"closed",      label:"Closed",      color:"#6B7280" },
  ];

  useEffect(() => {
    loadTickets();
    ChannelMgr.sub("tt_tracker","tt_tickets",null,loadTickets);
    return () => ChannelMgr.unsub("tt_tracker");
  }, []);

  async function loadTickets() {
    try {
      let q = sb.from("tt_tickets")
        .select(`
          *,
          created_by_emp:employees!tt_tickets_created_by_fkey(
            id, full_name, role, avatar_url
          ),
          assigned_to_emp:employees!tt_tickets_assigned_to_fkey(
            id, full_name, role, avatar_url
          )
        `)
        .order("created_at", { ascending:false })
        .limit(100);

      if (!RC.isMgr(user)) {
        q = q.eq("created_by", user.id);
      }

      const { data } = await withRetry(() => q);
      setTickets(data || []);
    } catch(e) {
      showToast("Failed to load tickets", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await withRetry(() =>
        sb.from("tt_tickets")
          .update({
            status,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
            ...(status === "resolved"
              ? { resolved_at: new Date().toISOString() }
              : {})
          })
          .eq("id", id)
      );
      await logAudit("UPDATE_TICKET",
        `#${id} → ${status}`, user.id);
      showToast(`Ticket ${status}`, "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const filtered = useMemo(() => {
    let list = tickets;
    if (filter !== "all") {
      list = list.filter(t => t.status === filter);
    }
    if (search) {
      list = list.filter(t =>
        t.ticket_number?.toLowerCase()
          .includes(search.toLowerCase()) ||
        t.title?.toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    return list;
  }, [tickets, filter, search]);

  const counts = useMemo(() => {
    const map = {};
    STATUSES.forEach(s => {
      map[s.id] = tickets.filter(
        t => t.status === s.id
      ).length;
    });
    return map;
  }, [tickets]);

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading tickets..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"TT Tracker",
      icon:"🎫",
      subtitle:`${counts.open || 0} open tickets`,
      actions: React.createElement("button", {
        className:"nx-btn nx-btn-primary",
        onClick: () => setShowCreate(true)
      }, "+ New Ticket")
    }),

    /* Status Summary */
    React.createElement("div", {
      style:{
        display:"flex", gap:8,
        marginBottom:16, flexWrap:"wrap"
      }
    },
      STATUSES.map(s =>
        React.createElement("div", {
          key:s.id,
          style:{
            padding:"8px 14px",
            background:`${s.color}15`,
            border:`1px solid ${s.color}33`,
            borderRadius:"var(--radius-sm)",
            cursor:"pointer",
            opacity: filter === s.id ||
              filter === "all" ? 1 : 0.5
          },
          onClick: () => setFilter(
            filter === s.id ? "all" : s.id
          )
        },
          React.createElement("div", {
            style:{
              fontSize:18, fontWeight:800,
              color:s.color
            }
          }, counts[s.id] || 0),
          React.createElement("div", {
            style:{
              fontSize:10, color:"var(--text-muted)"
            }
          }, s.label)
        )
      )
    ),

    /* Search */
    React.createElement(SearchInput, {
      value:search, onChange:setSearch,
      placeholder:"Search tickets..."
    }),

    React.createElement("div", {
      style:{
        display:"flex", flexDirection:"column",
        gap:10, marginTop:16
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon:"🎫", title:"No tickets found"
          })
        : filtered.map(t => {
            const st = STATUSES.find(
              s => s.id === t.status
            ) || STATUSES[0];
            return React.createElement("div", {
              key:t.id,
              className:"nx-card nx-card-enter",
              style:{
                borderLeft:`3px solid ${st.color}`
              }
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
                    t.ticket_number &&
                    React.createElement("code", {
                      style:{
                        fontSize:11, fontWeight:700,
                        background:"var(--card2)",
                        padding:"2px 6px",
                        borderRadius:4,
                        color:st.color
                      }
                    }, t.ticket_number),
                    React.createElement("span", {
                      style:{
                        fontSize:13, fontWeight:700,
                        color:"var(--text)"
                      }
                    }, t.title),
                    React.createElement("span", {
                      className:"nx-badge",
                      style:{
                        background:`${st.color}22`,
                        color:st.color,
                        border:`1px solid ${st.color}44`
                      }
                    }, st.label),
                    React.createElement(PriorityBadge, {
                      priority:t.priority || "medium"
                    })
                  ),
                  t.description &&
                  React.createElement("p", {
                    style:{
                      fontSize:12, color:"var(--text-sub)",
                      lineHeight:1.5, marginBottom:6,
                      overflow:"hidden",
                      display:"-webkit-box",
                      WebkitLineClamp:2,
                      WebkitBoxOrient:"vertical"
                    }
                  }, t.description),
                  React.createElement("div", {
                    style:{
                      display:"flex", gap:10,
                      fontSize:11, color:"var(--text-muted)"
                    }
                  },
                    React.createElement("span", null,
                      `By: ${t.created_by_emp?.full_name || "—"}`),
                    t.assigned_to_emp &&
                    React.createElement("span", null,
                      `→ ${t.assigned_to_emp.full_name}`),
                    React.createElement("span", null,
                      fmtRelative(t.created_at))
                  )
                ),
                React.createElement("div", {
                  style:{ display:"flex", gap:4, flexShrink:0 }
                },
                  React.createElement("button", {
                    className:"nx-btn nx-btn-secondary nx-btn-icon-sm",
                    onClick: () => setSelected(t)
                  }, "👁️"),
                  RC.isMgr(user) &&
                  t.status !== "closed" &&
                  React.createElement("select", {
                    className:"nx-select",
                    value:t.status,
                    onChange: e => updateStatus(
                      t.id, e.target.value
                    ),
                    style:{
                      fontSize:11, padding:"4px 8px",
                      height:"auto"
                    }
                  },
                    STATUSES.map(s =>
                      React.createElement("option", {
                        key:s.id, value:s.id
                      }, s.label)
                    )
                  )
                )
              )
            );
          })
    ),

    showCreate && React.createElement(CreateTicketModal, {
      user,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadTickets();
        showToast("Ticket created!", "success");
      }
    }),

    selected && React.createElement(ViewTicketModal, {
      ticket:selected,
      user,
      statuses:STATUSES,
      onClose: () => setSelected(null),
      onStatusChange: (id, s) => {
        updateStatus(id, s);
        setSelected(null);
      }
    })
  );
}

/* Create Ticket Modal */
function CreateTicketModal({ user, onClose, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    title:"", description:"",
    priority:"medium", assigned_to:"",
    ticket_number:""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    withRetry(() =>
      sb.from("employees")
        .select("id, full_name, role")
        .eq("is_active", true)
        .order("full_name")
    ).then(({ data }) => setEmployees(data || []));
  }, []);

  async function handleSave() {
    if (!form.title.trim()) {
      showToast("Title required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("tt_tickets").insert({
          title:         form.title.trim(),
          description:   form.description.trim() || null,
          priority:      form.priority,
          assigned_to:   form.assigned_to || null,
          ticket_number: form.ticket_number.trim() || null,
          status:        "open",
          created_by:    user.id,
          created_at:    new Date().toISOString()
        })
      );
      if (form.assigned_to) {
        await sendNotification(
          form.assigned_to, "ticket_assigned",
          "New Ticket Assigned",
          `${user.full_name} assigned you a ticket: ${form.title}`,
          "TT Tracker"
        );
      }
      await logAudit("CREATE_TICKET",
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
      className:"nx-modal",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className:"nx-modal-header" },
        React.createElement("span", {
          className:"nx-modal-title"
        }, "🎫 New Ticket"),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("div", {
          style:{ display:"flex", flexDirection:"column", gap:14 }
        },
          React.createElement("div", { className:"nx-grid-2" },
            React.createElement("div", { className:"nx-form-group" },
              React.createElement("label", {
                className:"nx-label nx-label-required"
              }, "Title"),
              React.createElement("input", {
                type:"text", className:"nx-input",
                placeholder:"Ticket title...",
                value:form.title,
                onChange: e => setForm(p => ({
                  ...p, title:e.target.value
                }))
              })
            ),
            React.createElement("div", { className:"nx-form-group" },
              React.createElement("label", {
                className:"nx-label"
              }, "Ticket #"),
              React.createElement("input", {
                type:"text", className:"nx-input",
                placeholder:"TT-001",
                value:form.ticket_number,
                onChange: e => setForm(p => ({
                  ...p, ticket_number:e.target.value
                }))
              })
            )
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Description"),
            React.createElement("textarea", {
              className:"nx-textarea",
              placeholder:"Describe the issue...",
              value:form.description, rows:3,
              onChange: e => setForm(p => ({
                ...p, description:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-grid-2" },
            React.createElement("div", { className:"nx-form-group" },
              React.createElement("label", {
                className:"nx-label"
              }, "Priority"),
              React.createElement("select", {
                className:"nx-select",
                value:form.priority,
                onChange: e => setForm(p => ({
                  ...p, priority:e.target.value
                }))
              },
                ["low","medium","high","critical"].map(p =>
                  React.createElement("option", {
                    key:p, value:p
                  },
                    p.charAt(0).toUpperCase()+p.slice(1)
                  )
                )
              )
            ),
            React.createElement("div", { className:"nx-form-group" },
              React.createElement("label", {
                className:"nx-label"
              }, "Assign To"),
              React.createElement("select", {
                className:"nx-select",
                value:form.assigned_to,
                onChange: e => setForm(p => ({
                  ...p, assigned_to:e.target.value
                }))
              },
                React.createElement("option", { value:"" },
                  "Unassigned"),
                employees.map(e =>
                  React.createElement("option", {
                    key:e.id, value:e.id
                  }, e.full_name)
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
          : "Create Ticket")
      )
    )
  );
}

/* View Ticket Modal */
function ViewTicketModal({
  ticket:t, user, statuses, onClose, onStatusChange
}) {
  const st = statuses.find(s => s.id === t.status) || statuses[0];
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
        }, `🎫 ${t.ticket_number || "Ticket"}`),
        React.createElement("button", {
          className:"nx-btn nx-btn-ghost nx-btn-icon",
          onClick:onClose
        }, "✕")
      ),
      React.createElement("div", { className:"nx-modal-body" },
        React.createElement("h3", {
          style:{
            fontSize:16, fontWeight:700,
            color:"var(--text)", marginBottom:12
          }
        }, t.title),
        React.createElement("div", {
          style:{
            display:"flex", gap:8,
            flexWrap:"wrap", marginBottom:16
          }
        },
          React.createElement("span", {
            className:"nx-badge",
            style:{
              background:`${st.color}22`,
              color:st.color,
              border:`1px solid ${st.color}44`
            }
          }, st.label),
          React.createElement(PriorityBadge, {
            priority:t.priority || "medium"
          })
        ),
        t.description &&
        React.createElement("div", {
          style:{
            padding:"12px 14px",
            background:"var(--card2)",
            borderRadius:"var(--radius-sm)",
            fontSize:13, color:"var(--text-sub)",
            lineHeight:1.6, marginBottom:16,
            whiteSpace:"pre-wrap"
          }
        }, t.description),
        React.createElement("div", {
          style:{
            display:"flex", flexDirection:"column", gap:8
          }
        },
          [
            { label:"Created By",
              value:t.created_by_emp?.full_name || "—" },
            { label:"Assigned To",
              value:t.assigned_to_emp?.full_name || "Unassigned" },
            { label:"Created",
              value:fmtDateTime(t.created_at) },
            t.resolved_at
              ? { label:"Resolved",
                  value:fmtDateTime(t.resolved_at) }
              : null
          ].filter(Boolean).map(item =>
            React.createElement("div", {
              key:item.label,
              style:{
                display:"flex",
                justifyContent:"space-between",
                padding:"8px 12px",
                background:"var(--card2)",
                borderRadius:"var(--radius-sm)"
              }
            },
              React.createElement("span", {
                style:{ fontSize:12, color:"var(--text-sub)" }
              }, item.label),
              React.createElement("span", {
                style:{
                  fontSize:12, fontWeight:700,
                  color:"var(--text)"
                }
              }, item.value)
            )
          )
        ),
        RC.isMgr(user) && t.status !== "closed" &&
        React.createElement("div", {
          style:{ marginTop:16 }
        },
          React.createElement("label", {
            className:"nx-label",
            style:{ marginBottom:6, display:"block" }
          }, "Update Status"),
          React.createElement("div", {
            style:{ display:"flex", gap:6, flexWrap:"wrap" }
          },
            statuses.map(s =>
              React.createElement("button", {
                key:s.id,
                className:`nx-btn nx-btn-sm ${
                  t.status === s.id
                    ? "nx-btn-primary"
                    : "nx-btn-secondary"}`,
                onClick: () => onStatusChange(t.id, s.id)
              }, s.label)
            )
          )
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

/* ══════════════════════════════════════════════════════════
   SEC 22 — CHAT
   ══════════════════════════════════════════════════════════ */
function ChatPage({ user }) {
  const [rooms,       setRooms]       = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const messagesEnd = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      ChannelMgr.sub(
        `chat_${activeRoom.id}`,
        "chat_messages",
        `room_id=eq.${activeRoom.id}`,
        () => loadMessages(activeRoom.id)
      );
    }
    return () => {
      if (activeRoom) {
        ChannelMgr.unsub(`chat_${activeRoom.id}`);
      }
    };
  }, [activeRoom?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEnd.current?.scrollIntoView({ behavior:"smooth" });
  }

  async function loadRooms() {
    try {
      const { data } = await withRetry(() =>
        sb.from("chat_rooms")
          .select(`
            *,
            last_message:chat_messages(
              content, created_at
            )
          `)
          .or(`is_public.eq.true,members.cs.{${user.id}}`)
          .order("updated_at", { ascending:false })
      );
      setRooms(data || []);
      if (data?.length > 0 && !activeRoom) {
        setActiveRoom(data[0]);
      }
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  async function loadMessages(roomId) {
    try {
      const { data } = await withRetry(() =>
        sb.from("chat_messages")
          .select(`
            *,
            sender:employees!chat_messages_sender_id_fkey(
              id, full_name, role, avatar_url
            )
          `)
          .eq("room_id", roomId)
          .order("created_at", { ascending:true })
          .limit(100)
      );
      setMessages(data || []);
    } catch(e) {}
  }

  async function handleSend() {
    if (!input.trim() || !activeRoom || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await withRetry(() =>
        sb.from("chat_messages").insert({
          room_id:    activeRoom.id,
          sender_id:  user.id,
          content,
          type:       "text",
          created_at: new Date().toISOString()
        })
      );
      await withRetry(() =>
        sb.from("chat_rooms")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeRoom.id)
      );
    } catch(e) {
      showToast("Failed to send", "error");
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading chat..." });

  return React.createElement("div", {
    className:"nx-page-enter",
    style:{
      display:"flex", gap:16,
      height:"calc(100vh - 140px)",
      minHeight:400
    }
  },
    /* Rooms List */
    React.createElement("div", {
      style:{
        width:260, flexShrink:0,
        display:"flex", flexDirection:"column",
        gap:8
      }
    },
      React.createElement("div", {
        style:{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center", marginBottom:4
        }
      },
        React.createElement("h3", {
          style:{
            fontSize:14, fontWeight:700,
            color:"var(--text)"
          }
        }, "💬 Rooms"),
        React.createElement("button", {
          className:"nx-btn nx-btn-primary nx-btn-icon-sm",
          onClick: () => setShowNewRoom(true),
          title:"New Room"
        }, "+")
      ),
      React.createElement("div", {
        style:{
          display:"flex", flexDirection:"column",
          gap:4, overflowY:"auto", flex:1
        }
      },
        rooms.length === 0
          ? React.createElement("p", {
              style:{
                fontSize:12, color:"var(--text-muted)",
                textAlign:"center", padding:"20px 0"
              }
            }, "No rooms yet")
          : rooms.map(r =>
              React.createElement("div", {
                key:r.id,
                style:{
                  padding:"10px 12px",
                  borderRadius:"var(--radius-sm)",
                  cursor:"pointer",
                  background: activeRoom?.id === r.id
                    ? "var(--primary-glow)"
                    : "var(--card2)",
                  border:`1px solid ${
                    activeRoom?.id === r.id
                      ? "rgba(var(--primary-rgb),0.25)"
                      : "var(--border)"}`,
                  transition:"var(--transition)"
                },
                onClick: () => setActiveRoom(r)
              },
                React.createElement("div", {
                  style:{
                    fontSize:13, fontWeight:600,
                    color: activeRoom?.id === r.id
                      ? "var(--primary)"
                      : "var(--text)"
                  }
                },
                  `${r.is_public ? "🌐" : "🔒"} ${r.name}`
                ),
                React.createElement("div", {
                  style:{
                    fontSize:10,
                    color:"var(--text-muted)",
                    marginTop:2
                  }
                }, fmtRelative(r.updated_at))
              )
            )
      )
    ),

    /* Chat Area */
    React.createElement("div", {
      style:{
        flex:1, display:"flex",
        flexDirection:"column",
        background:"var(--card)",
        border:"1px solid var(--border)",
        borderRadius:"var(--radius)",
        overflow:"hidden"
      }
    },
      activeRoom
        ? React.createElement(React.Fragment, null,
            /* Room Header */
            React.createElement("div", {
              style:{
                padding:"12px 16px",
                borderBottom:"1px solid var(--border)",
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between"
              }
            },
              React.createElement("div", null,
                React.createElement("h3", {
                  style:{
                    fontSize:14, fontWeight:700,
                    color:"var(--text)"
                  }
                }, activeRoom.name),
                React.createElement("p", {
                  style:{
                    fontSize:11,
                    color:"var(--text-muted)"
                  }
                },
                  activeRoom.is_public
                    ? "Public Room"
                    : "Private Room"
                )
              ),
              React.createElement("span", {
                className:"nx-live-dot green"
              })
            ),

            /* Messages */
            React.createElement("div", {
              style:{
                flex:1, overflowY:"auto",
                padding:"16px",
                display:"flex",
                flexDirection:"column",
                gap:12
              }
            },
              messages.length === 0 &&
              React.createElement("div", {
                style:{
                  textAlign:"center",
                  color:"var(--text-muted)",
                  fontSize:13,
                  padding:"40px 0"
                }
              }, "No messages yet. Say hello! 👋"),
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user.id;
                const showAvatar = !isMe && (
                  i === 0 ||
                  messages[i-1]?.sender_id !== msg.sender_id
                );
                return React.createElement("div", {
                  key:msg.id,
                  style:{
                    display:"flex",
                    justifyContent: isMe
                      ? "flex-end" : "flex-start",
                    gap:8,
                    alignItems:"flex-end"
                  }
                },
                  !isMe && showAvatar &&
                  React.createElement(NxAvatar, {
                    user:msg.sender, size:"xs"
                  }),
                  !isMe && !showAvatar &&
                  React.createElement("div", {
                    style:{ width:24 }
                  }),
                  React.createElement("div", {
                    style:{
                      maxWidth:"70%",
                      display:"flex",
                      flexDirection:"column",
                      alignItems: isMe
                        ? "flex-end" : "flex-start",
                      gap:2
                    }
                  },
                    showAvatar && !isMe &&
                    React.createElement("span", {
                      style:{
                        fontSize:10,
                        color:"var(--text-muted)",
                        marginLeft:4
                      }
                    }, msg.sender?.full_name),
                    React.createElement("div", {
                      style:{
                        padding:"8px 12px",
                        borderRadius: isMe
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                        background: isMe
                          ? "var(--primary)"
                          : "var(--card2)",
                        color: isMe
                          ? "#000" : "var(--text)",
                        fontSize:13,
                        lineHeight:1.5,
                        wordBreak:"break-word"
                      }
                    }, msg.content),
                    React.createElement("span", {
                      style:{
                        fontSize:9,
                        color:"var(--text-muted)"
                      }
                    }, fmtTime(msg.created_at))
                  )
                );
              }),
              React.createElement("div", {
                ref:messagesEnd
              })
            ),

            /* Input */
            React.createElement("div", {
              style:{
                padding:"12px 16px",
                borderTop:"1px solid var(--border)",
                display:"flex", gap:8
              }
            },
              React.createElement("input", {
                ref:inputRef,
                type:"text",
                className:"nx-input",
                placeholder:"Type a message...",
                value:input,
                onChange: e => setInput(e.target.value),
                onKeyDown: e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                },
                style:{ flex:1 }
              }),
              React.createElement("button", {
                className:"nx-btn nx-btn-primary",
                onClick:handleSend,
                disabled:!input.trim() || sending
              }, sending
                ? React.createElement(Spinner)
                : "Send ➤")
            )
          )
        : React.createElement("div", {
            style:{
              flex:1, display:"flex",
              alignItems:"center",
              justifyContent:"center"
            }
          },
            React.createElement(EmptyState, {
              icon:"💬",
              title:"Select a room",
              desc:"Choose a chat room to start messaging"
            })
          )
    ),

    /* New Room Modal */
    showNewRoom && React.createElement(NewRoomModal, {
      user,
      onClose: () => setShowNewRoom(false),
      onCreated: (room) => {
        setShowNewRoom(false);
        loadRooms();
        setActiveRoom(room);
        showToast("Room created!", "success");
      }
    })
  );
}

/* New Room Modal */
function NewRoomModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({
    name:"", is_public:true, description:""
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) {
      showToast("Room name required", "warning");
      return;
    }
    setSaving(true);
    try {
      const { data } = await withRetry(() =>
        sb.from("chat_rooms").insert({
          name:        form.name.trim(),
          description: form.description.trim() || null,
          is_public:   form.is_public,
          members:     [user.id],
          created_by:  user.id,
          created_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString()
        }).select("*").single()
      );
      onCreated(data);
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
        }, "💬 New Room"),
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
            }, "Room Name"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"e.g. General, Team-A...",
              value:form.name,
              onChange: e => setForm(p => ({
                ...p, name:e.target.value
              }))
            })
          ),
          React.createElement("div", { className:"nx-form-group" },
            React.createElement("label", {
              className:"nx-label"
            }, "Description"),
            React.createElement("input", {
              type:"text", className:"nx-input",
              placeholder:"Optional...",
              value:form.description,
              onChange: e => setForm(p => ({
                ...p, description:e.target.value
              }))
            })
          ),
          React.createElement("label", {
            className:"nx-checkbox-wrap"
          },
            React.createElement("div", {
              className:`nx-checkbox ${
                form.is_public ? "checked":""}`,
              onClick: () => setForm(p => ({
                ...p, is_public:!p.is_public
              }))
            }, form.is_public ? "✓" : ""),
            React.createElement("span", {
              style:{ fontSize:13, color:"var(--text-sub)" }
            }, "🌐 Public Room (visible to all)")
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
          : "Create Room")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 23 — NOTIFICATIONS
   ══════════════════════════════════════════════════════════ */
function NotificationsPage({ user, onNavigate }) {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");

  useEffect(() => {
    loadNotifs();
    ChannelMgr.sub(
      `notifs_page_${user.id}`,
      "notifications",
      `user_id=eq.${user.id}`,
      loadNotifs
    );
    return () =>
      ChannelMgr.unsub(`notifs_page_${user.id}`);
  }, []);

  async function loadNotifs() {
    try {
      const { data } = await withRetry(() =>
        sb.from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending:false })
          .limit(100)
      );
      setNotifs(data || []);
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  async function markRead(id) {
    try {
      await withRetry(() =>
        sb.from("notifications")
          .update({ is_read:true })
          .eq("id", id)
      );
      setNotifs(p => p.map(n =>
        n.id === id ? { ...n, is_read:true } : n
      ));
    } catch(e) {}
  }

  async function markAllRead() {
    try {
      await withRetry(() =>
        sb.from("notifications")
          .update({ is_read:true })
          .eq("user_id", user.id)
          .eq("is_read", false)
      );
      setNotifs(p => p.map(n => ({ ...n, is_read:true })));
      showToast("All marked as read", "success");
    } catch(e) {}
  }

  async function deleteNotif(id) {
    try {
      await withRetry(() =>
        sb.from("notifications")
          .delete().eq("id", id)
      );
      setNotifs(p => p.filter(n => n.id !== id));
    } catch(e) {}
  }

  const NOTIF_ICONS = {
    request_update:  "📤",
    new_request:     "📥",
    handover:        "🔄",
    case_handover:   "🗂️",
    ticket_assigned: "🎫",
    points_awarded:  "🎯",
    announcement:    "📢",
    system:          "⚙️",
    default:         "🔔"
  };

  const filtered = useMemo(() => {
    if (filter === "unread") {
      return notifs.filter(n => !n.is_read);
    }
    return notifs;
  }, [notifs, filter]);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  if (loading) return React.createElement(LoadingPage,
    { message:"Loading notifications..." });

  return React.createElement("div", {
    className:"nx-page-enter"
  },
    React.createElement(PageHeader, {
      title:"Notifications",
      icon:"🔔",
      subtitle: unreadCount > 0
        ? `${unreadCount} unread` : "All caught up!",
      actions: unreadCount > 0 &&
        React.createElement("button", {
          className:"nx-btn nx-btn-secondary nx-btn-sm",
          onClick:markAllRead
        }, "✓ Mark All Read")
    }),

    React.createElement(Tabs, {
      tabs:[
        { id:"all",    label:`All (${notifs.length})` },
        { id:"unread", label:`Unread (${unreadCount})` },
      ],
      active:filter, onChange:setFilter
    }),

    React.createElement("div", {
      style:{
        display:"flex", flexDirection:"column",
        gap:8, marginTop:16
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon:"🔔",
            title: filter === "unread"
              ? "No unread notifications"
              : "No notifications",
            desc:"You're all caught up! ✅"
          })
        : filtered.map(n =>
            React.createElement("div", {
              key:n.id,
              style:{
                display:"flex",
                alignItems:"flex-start",
                gap:12,
                padding:"12px 16px",
                background: n.is_read
                  ? "var(--card)"
                  : "var(--primary-glow)",
                border:`1px solid ${
                  n.is_read
                    ? "var(--border)"
                    : "rgba(var(--primary-rgb),0.20)"}`,
                borderRadius:"var(--radius-sm)",
                cursor:"pointer",
                transition:"var(--transition)"
              },
              onClick: () => {
                if (!n.is_read) markRead(n.id);
                if (n.link) onNavigate(n.link);
              }
            },
              React.createElement("span", {
                style:{ fontSize:20, flexShrink:0 }
              },
                                NOTIF_ICONS[n.type] || NOTIF_ICONS.default
              ),
              React.createElement("div", {
                style:{ flex:1, minWidth:0 }
              },
                React.createElement("div", {
                  style:{
                    display:"flex",
                    justifyContent:"space-between",
                    alignItems:"flex-start",
                    gap:8
                  }
                },
                  React.createElement("div", {
                    style:{
                      fontSize:13, fontWeight:
                        n.is_read ? 500 : 700,
                      color:"var(--text)",
                      overflow:"hidden",
                      textOverflow:"ellipsis",
                      whiteSpace:"nowrap"
                    }
                  }, n.title),
                  React.createElement("div", {
                    style:{
                      display:"flex",
                      alignItems:"center",
                      gap:6, flexShrink:0
                    }
                  },
                    React.createElement("span", {
                      style:{
                        fontSize:10,
                        color:"var(--text-muted)"
                      }
                    }, fmtRelative(n.created_at)),
                    !n.is_read &&
                    React.createElement("span", {
                      style:{
                        width:8, height:8,
                        borderRadius:"50%",
                        background:"var(--primary)",
                        flexShrink:0
                      }
                    }),
                    React.createElement("button", {
                      className:"nx-btn nx-btn-ghost nx-btn-icon-sm",
                      onClick: e => {
                        e.stopPropagation();
                        deleteNotif(n.id);
                      },
                      style:{ color:"var(--text-muted)" }
                    }, "✕")
                  )
                ),
                n.body &&
                React.createElement("p", {
                  style:{
                    fontSize:12,
                    color:"var(--text-sub)",
                    marginTop:3,
                    lineHeight:1.5,
                    overflow:"hidden",
                    display:"-webkit-box",
                    WebkitLineClamp:2,
                    WebkitBoxOrient:"vertical"
                  }
                }, n.body)
              )
            )
          )
    )
  );
}

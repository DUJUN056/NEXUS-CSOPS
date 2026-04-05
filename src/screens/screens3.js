function TTTrackerPage(props) {
  var user = props.user;

  var _1  = React.useState([]);    var items      = _1[0];  var setItems      = _1[1];
  var _2  = React.useState([]);    var employees  = _2[0];  var setEmployees  = _2[1];
  var _3  = React.useState(true);  var loading    = _3[0];  var setLoading    = _3[1];
  var _4  = React.useState(false); var showForm   = _4[0];  var setShowForm   = _4[1];
  var _5  = React.useState(null);  var selected   = _5[0];  var setSelected   = _5[1];
  var _6  = React.useState(null);  var assignItem = _6[0];  var setAssignItem = _6[1];
  var _7  = React.useState(null);  var actionItem = _7[0];  var setActionItem = _7[1];
  var _8  = React.useState("");    var actionType = _8[0];  var setActionType = _8[1];
  var _9  = React.useState("");    var actionNote = _9[0];  var setActionNote = _9[1];
  var _10 = React.useState("");    var assignTo   = _10[0]; var setAssignTo   = _10[1];
  var _11 = React.useState("");    var assignDue  = _11[0]; var setAssignDue  = _11[1];
  var _12 = React.useState("");    var assignNote = _12[0]; var setAssignNote = _12[1];
  var _13 = React.useState([]);    var dupWarning = _13[0]; var setDupWarning = _13[1];
  var _14 = React.useState(false); var isSubmitting = _14[0]; var setIsSubmitting = _14[1];

  var _f = React.useState({
    caseId: "", userId: "", orderId: "", ttNumber: "", country: "KSA", notes: ""
  });
  var form = _f[0]; var setForm = _f[1];

  var _fi = React.useState({
    search: "", status: "All", country: "All",
    assignedTo: "All", createdBy: "All",
    dateFrom: "", dateTo: "",
    overdueOnly: false, staleOnly: false
  });
  var filters = _fi[0]; var setFilters = _fi[1];

  var isMgr   = RC.isMgr(user);
  var isAgent = user.role === "Agent";
  var canAssign = isMgr;

  function canAct(item) {
    if (isMgr) return true;
    if (user.role === "SME") return true;
    if (isAgent) return item.created_by === user.id || item.assigned_to === user.id;
    return false;
  }

  function canClose(item) { return isMgr; }
  function canEscalate(item) { return isMgr; }

  React.useEffect(function () {
    load();
    loadEmployees();
    ChannelMgr.sub("tt_tracker", DB.TT_TRACKER, null, load);
    return function () { ChannelMgr.unsub("tt_tracker"); };
  }, []);

  function load() {
    var q = sb.from(DB.TT_TRACKER)
      .select([
        "*",
        "creator:employees!created_by(full_name,role)",
        "assignee:employees!assigned_to(full_name,role)"
      ].join(","))
      .order("created_at", { ascending: false });

    if (isAgent) {
      q = q.or("created_by.eq." + user.id + ",assigned_to.eq." + user.id);
    }

    withRetry(function () { return q; })
      .then(function (r) { setItems(r.data || []); })
      .catch(function () { showToast("Failed to load TT Tracker", "error"); })
      .finally(function () { setLoading(false); });
  }

  function loadEmployees() {
    withRetry(function () {
      return sb.from("employees")
        .select("id,full_name,role")
        .eq("is_active", true)
        .order("full_name");
    }).then(function (r) { setEmployees(r.data || []); })
      .catch(function () {});
  }

  function checkDuplicate(caseId, userId) {
    var dups = items.filter(function (x) {
      return (
        (caseId && x.case_id === caseId) ||
        (userId && x.user_id === userId)
      ) && x.status !== "Closed";
    });
    setDupWarning(dups);
    return dups;
  }

  function submit() {
    if (!form.ttNumber || !form.caseId) {
      showToast("Required fields missing", "warning");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const now = new Date().toISOString();
    
    // Check if user object exists, otherwise use a fallback or null
    const currentUserId = (user && user.id) ? user.id : null;

    const payload = {
        case_id:         String(form.caseId),
        user_id:         String(form.userId),
        order_id:        String(form.orderId),
        tt_number:       String(form.ttNumber), 
        country:         form.country,
        notes:           form.notes,
        status:          "In Progress",
        created_by:      currentUserId, // Ensure this ID exists in 'users' table
        created_at:      now,
        last_updated_by: currentUserId,
        last_updated_at: now
    };

    withRetry(function () {
      return sb.from(DB.TT_TRACKER).insert(payload);
    }).then(function (response) {
      if (response.error) throw response.error;
      showToast("Success: Data saved", "success");
      setShowForm(false);
      load();
    }).catch(function (err) {
      console.error("Final Debug:", err);
      showToast("Database Rejection: Check User ID", "error");
    }).finally(function () {
      setIsSubmitting(false);
    });
  }

  function logActivity(ttId, action, prevStatus, newStatus, note, type) {
    if (!ttId && action !== "created") return;
    withRetry(function () {
      return sb.from(DB.TT_ACTIVITY || "tt_activity_log").insert({
        tt_id:        ttId,
        action:       action,
        prev_status:  prevStatus || null,
        new_status:   newStatus  || null,
        note:         note       || null,
        performed_by: user.id,
        performed_at: new Date().toISOString(),
        type:         type || "action"
      });
    }).catch(function () {});
  }

  function changeStatus(item, newStatus, note) {
    var now = new Date().toISOString();
    withRetry(function () {
      return sb.from(DB.TT_TRACKER).update({
        status:          newStatus,
        last_updated_by: user.id,
        last_updated_at: now
      }).eq("id", item.id);
    }).then(function () {
      showToast("Status updated to " + newStatus, "success");
      logActivity(item.id, "status_changed", item.status, newStatus, note, "status");
      load();
      setActionItem(null);
      setActionNote("");
    }).catch(function () { showToast("Update failed", "error"); });
  }

  function addNote(item, note) {
    if (!note || !note.trim()) {
      showToast("Note is required", "warning");
      return;
    }
    var now = new Date().toISOString();
    withRetry(function () {
      return sb.from(DB.TT_TRACKER).update({
        last_updated_by: user.id,
        last_updated_at: now
      }).eq("id", item.id);
    }).then(function () {
      logActivity(item.id, "note_added", null, null, note, "note");
      showToast("Note added successfully", "success");
      load();
      setActionItem(null);
      setActionNote("");
    }).catch(function () { showToast("Failed to add note", "error"); });
  }

  function assignTT(item) {
    if (!assignTo)  { showToast("Please select an employee", "warning"); return; }
    if (!assignDue) { showToast("Please set a due date", "warning"); return; }
    var now = new Date().toISOString();
    withRetry(function () {
      return sb.from(DB.TT_TRACKER).update({
        assigned_to:     assignTo,
        assigned_by:     user.id,
        assigned_at:     now,
        assignment_due:  assignDue,
        assignment_note: assignNote,
        last_updated_by: user.id,
        last_updated_at: now
      }).eq("id", item.id);
    }).then(function () {
      showToast("Assignment saved successfully", "success");
      logActivity(item.id, "assigned", null, null, assignNote, "assign");
      load();
      setAssignItem(null);
      setAssignTo(""); setAssignDue(""); setAssignNote("");
    }).catch(function () { showToast("Assignment failed", "error"); });
  }

  function calcAge(createdAt) {
    if (!createdAt) return "--";
    var diff  = Date.now() - new Date(createdAt).getTime();
    var days  = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return days + "d " + hours + "h";
    return hours + "h";
  }

  function isOverdue(item) {
    if (!item.last_updated_at) return false;
    return Date.now() - new Date(item.last_updated_at).getTime() > 3 * 86400000;
  }

  function isAssignmentOverdue(item) {
    if (!item.assignment_due) return false;
    return Date.now() > new Date(item.assignment_due).getTime();
  }

  var filtered = items.filter(function (x) {
    var s = filters.search.toLowerCase();
    if (s) {
      var match =
        (x.case_id   && x.case_id.toLowerCase().includes(s))   ||
        (x.user_id   && x.user_id.toLowerCase().includes(s))   ||
        (x.tt_number && x.tt_number.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (filters.status     !== "All" && x.status       !== filters.status)     return false;
    if (filters.country    !== "All" && x.country      !== filters.country)    return false;
    if (filters.assignedTo !== "All" && x.assigned_to  !== filters.assignedTo) return false;
    if (filters.createdBy  !== "All" && x.created_by   !== filters.createdBy)  return false;
    if (filters.dateFrom && new Date(x.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo   && new Date(x.created_at) > new Date(filters.dateTo))   return false;
    if (filters.overdueOnly && !isOverdue(x))           return false;
    if (filters.staleOnly   && !isAssignmentOverdue(x)) return false;
    return true;
  });

  var stats = {
    inProgress: items.filter(function (x) { return x.status === "In Progress"; }).length,
    escalated:  items.filter(function (x) { return x.status === "Escalated";   }).length,
    closed:     items.filter(function (x) { return x.status === "Closed";      }).length,
    reopen:     items.filter(function (x) { return x.status === "Reopen";      }).length,
    overdue:    items.filter(function (x) { return isOverdue(x);               }).length,
    assigned:   items.filter(function (x) { return !!x.assigned_to;            }).length
  };

  var STATUS_COLORS = {
    "In Progress": "#3B82F6",
    "Escalated":   "#EF4444",
    "Closed":      "#6B7280",
    "Reopen":      "#F97316"
  };

  var COUNTRIES = ["KSA", "KWT", "BAH", "UAE", "OMA"];

  if (loading) return React.createElement(LoadingPage, { message: "Loading TT Tracker..." });

  return React.createElement("div", { className: "nx-page-enter" },

    // ── Page Header ──
    React.createElement(PageHeader, {
      title: "TT Tracker", icon: "🎫",
      subtitle: filtered.length + " / " + items.length + " tickets",
      actions: React.createElement("div", { style: { display: "flex", gap: 6 } },
        React.createElement("button", {
          className: "nx-btn nx-btn-primary nx-btn-sm",
          onClick: function () {
            setShowForm(function (v) { return !v; });
            setDupWarning([]);
          }
        }, showForm ? "Cancel" : "+ New TT")
      )
    }),

    // ── Stats Bar ──
    React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(6,1fr)",
        gap: 12, marginBottom: 16
      }
    },
      [
        { label: "In Progress", value: stats.inProgress, color: "#3B82F6" },
        { label: "Escalated",   value: stats.escalated,  color: "#EF4444" },
        { label: "Closed",      value: stats.closed,     color: "#6B7280" },
        { label: "Reopen",      value: stats.reopen,     color: "#F97316" },
        { label: "Overdue",     value: stats.overdue,    color: "#EAB308" },
        { label: "Assigned",    value: stats.assigned,   color: "#22C55E" }
      ].map(function (s) {
        return React.createElement("div", { key: s.label, className: "nx-stat-card" },
          React.createElement("span", { className: "nx-stat-label" }, s.label),
          React.createElement("div", {
            className: "nx-stat-value",
            style: { color: s.color, fontSize: 22,
              fontFamily: "'Space Grotesk',sans-serif" }
          }, s.value)
        );
      })
    ),

    // ── Create Form ──
    showForm ? React.createElement("div", {
      className: "nx-card",
      style: { padding: 20, marginBottom: 16 }
    },
      React.createElement("div", {
        style: { fontSize: 14, fontWeight: 700, marginBottom: 12,
          color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif" }
      }, "Create New TT"),

      // Duplicate warning
      dupWarning.length > 0 ? React.createElement("div", {
        style: {
          background: "rgba(239,68,68,0.1)", border: "1px solid #EF4444",
          borderRadius: 8, padding: "10px 14px", marginBottom: 12,
          fontSize: 13, color: "#EF4444",
          fontFamily: "'Space Grotesk',sans-serif"
        }
      },
        "⚠ Warning: " + dupWarning.length +
        " open TT(s) already linked to this Case ID or User ID.",
        React.createElement("div", {
          style: { marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }
        },
          dupWarning.map(function (d) {
            return React.createElement("span", {
              key: d.id,
              style: { fontSize: 12, color: "#FCA5A5" }
            }, "• TT# " + d.tt_number + " — " + d.status + " — Case: " + d.case_id);
          })
        )
      ) : null,

      React.createElement("div", {
        style: { display: "flex", flexDirection: "column", gap: 10 }
      },
        // Row 1
        React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
          React.createElement("input", {
            className: "nx-input", placeholder: "Case ID *",
            style: { flex: 1, minWidth: 130 },
            value: form.caseId,
            onChange: function (e) {
              var v = e.target.value;
              setForm(function (f) { return Object.assign({}, f, { caseId: v }); });
              if (v.length > 2) checkDuplicate(v, form.userId);
            }
          }),
          React.createElement("input", {
            className: "nx-input", placeholder: "User ID *",
            style: { flex: 1, minWidth: 130 },
            value: form.userId,
            onChange: function (e) {
              var v = e.target.value;
              setForm(function (f) { return Object.assign({}, f, { userId: v }); });
              if (v.length > 2) checkDuplicate(form.caseId, v);
            }
          }),
          React.createElement("input", {
            className: "nx-input", placeholder: "Order ID *",
            style: { flex: 1, minWidth: 130 },
            value: form.orderId,
            onChange: function (e) {
              setForm(function (f) {
                return Object.assign({}, f, { orderId: e.target.value });
              });
            }
          })
        ),
        // Row 2
        React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
          React.createElement("input", {
            className: "nx-input", placeholder: "TT# *",
            style: { flex: 1, minWidth: 130 },
            value: form.ttNumber,
            onChange: function (e) {
              setForm(function (f) {
                return Object.assign({}, f, { ttNumber: e.target.value });
              });
            }
          }),
          React.createElement("select", {
            className: "nx-input",
            style: { width: "auto", minWidth: 120 },
            value: form.country,
            onChange: function (e) {
              setForm(function (f) {
                return Object.assign({}, f, { country: e.target.value });
              });
            }
          },
            COUNTRIES.map(function (c) {
              return React.createElement("option", { key: c, value: c }, c);
            })
          )
        ),
        // Notes
        React.createElement("textarea", {
          className: "nx-input",
          placeholder: "Notes (optional)",
          rows: 2, value: form.notes,
          onChange: function (e) {
            setForm(function (f) {
              return Object.assign({}, f, { notes: e.target.value });
            });
          }
        }),
        // Buttons
        React.createElement("div", { style: { display: "flex", gap: 8 } },
          React.createElement("button", {
            className: "nx-btn nx-btn-primary",
            onClick: submit
          }, "Create TT"),
          React.createElement("button", {
            className: "nx-btn nx-btn-secondary",
            onClick: function () {
              setForm({
                caseId: "", userId: "", orderId: "",
                ttNumber: "", country: "KSA", notes: ""
              });
              setDupWarning([]);
            }
          }, "Clear")
        )
      )
    ) : null,

    // ── Filters ──
    React.createElement("div", {
      className: "nx-card",
      style: { padding: 14, marginBottom: 16 }
    },
      React.createElement("div", {
        style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }
      },
        React.createElement("input", {
          className: "nx-input",
          placeholder: "Search: Case ID / User ID / TT#",
          style: { flex: 1, minWidth: 200 },
          value: filters.search,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { search: e.target.value });
            });
          }
        }),
        React.createElement("select", {
          className: "nx-input", style: { width: "auto", minWidth: 130 },
          value: filters.status,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { status: e.target.value });
            });
          }
        },
          ["All", "In Progress", "Escalated", "Closed", "Reopen"].map(function (s) {
            return React.createElement("option", { key: s, value: s },
              s === "All" ? "All Statuses" : s
            );
          })
        ),
        React.createElement("select", {
          className: "nx-input", style: { width: "auto", minWidth: 110 },
          value: filters.country,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { country: e.target.value });
            });
          }
        },
          ["All"].concat(COUNTRIES).map(function (c) {
            return React.createElement("option", { key: c, value: c },
              c === "All" ? "All Countries" : c
            );
          })
        ),
        React.createElement("select", {
          className: "nx-input", style: { width: "auto", minWidth: 140 },
          value: filters.assignedTo,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { assignedTo: e.target.value });
            });
          }
        },
          [React.createElement("option", { key: "All", value: "All" }, "All Assignees")]
            .concat(employees.map(function (emp) {
              return React.createElement("option", { key: emp.id, value: emp.id },
                emp.full_name
              );
            }))
        ),
        React.createElement("select", {
          className: "nx-input", style: { width: "auto", minWidth: 140 },
          value: filters.createdBy,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { createdBy: e.target.value });
            });
          }
        },
          [React.createElement("option", { key: "All", value: "All" }, "All Creators")]
            .concat(employees.map(function (emp) {
              return React.createElement("option", { key: emp.id, value: emp.id },
                emp.full_name
              );
            }))
        ),
        React.createElement("input", {
          className: "nx-input", type: "date",
          style: { width: "auto" },
          value: filters.dateFrom,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { dateFrom: e.target.value });
            });
          }
        }),
        React.createElement("input", {
          className: "nx-input", type: "date",
          style: { width: "auto" },
          value: filters.dateTo,
          onChange: function (e) {
            setFilters(function (f) {
              return Object.assign({}, f, { dateTo: e.target.value });
            });
          }
        }),
        React.createElement("label", {
          style: {
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--text-sub)",
            cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif"
          }
        },
          React.createElement("input", {
            type: "checkbox", checked: filters.overdueOnly,
            onChange: function (e) {
              setFilters(function (f) {
                return Object.assign({}, f, { overdueOnly: e.target.checked });
              });
            }
          }),
          "Overdue Only"
        ),
        React.createElement("label", {
          style: {
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--text-sub)",
            cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif"
          }
        },
          React.createElement("input", {
            type: "checkbox", checked: filters.staleOnly,
            onChange: function (e) {
              setFilters(function (f) {
                return Object.assign({}, f, { staleOnly: e.target.checked });
              });
            }
          }),
          "Not Updated 3 Days"
        ),
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary nx-btn-sm",
          onClick: function () {
            setFilters({
              search: "", status: "All", country: "All",
              assignedTo: "All", createdBy: "All",
              dateFrom: "", dateTo: "",
              overdueOnly: false, staleOnly: false
            });
          }
        }, "Clear Filters")
      )
    ),

    // ── Main Table ──
    filtered.length === 0
      ? React.createElement(EmptyState, { icon: "🎫", title: "No tickets found" })
      : React.createElement("div", { style: { overflowX: "auto" } },
          React.createElement("table", { className: "nx-table" },
            React.createElement("thead", null,
              React.createElement("tr", null,
                React.createElement("th", null, "TT#"),
                React.createElement("th", null, "Case ID"),
                React.createElement("th", null, "User ID"),
                React.createElement("th", null, "Order ID"),
                React.createElement("th", null, "Country"),
                React.createElement("th", null, "Status"),
                React.createElement("th", null, "Created By"),
                React.createElement("th", null, "Created At"),
                React.createElement("th", null, "Assigned To"),
                React.createElement("th", null, "Assignment Due"),
                React.createElement("th", null, "Last Updated By"),
                React.createElement("th", null, "Last Updated At"),
                React.createElement("th", null, "Age"),
                React.createElement("th", null, "Overdue"),
                React.createElement("th", null, "Actions")
              )
            ),
            React.createElement("tbody", null,
              filtered.map(function (item) {
                var overdue    = isOverdue(item);
                var assignOver = isAssignmentOverdue(item);
                var sc         = STATUS_COLORS[item.status] || "#6B7280";

                return React.createElement("tr", {
                  key: item.id,
                  style: {
                    background: overdue ? "rgba(239,68,68,0.04)" : undefined
                  }
                },
                  React.createElement("td", null,
                    React.createElement("span", {
                      style: {
                        fontSize: 12, fontWeight: 800,
                        color: "var(--primary)",
                        fontFamily: "'Space Grotesk',sans-serif",
                        cursor: "pointer"
                      },
                      onClick: function () { setSelected(item); }
                    }, item.tt_number || "--")
                  ),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.case_id || "--"),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.user_id || "--"),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.order_id || "--"),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.country || "--"),
                  React.createElement("td", null,
                    React.createElement("span", {
                      style: {
                        fontSize: 11, fontWeight: 700,
                        padding: "2px 8px", borderRadius: 20,
                        background: sc + "22", color: sc,
                        fontFamily: "'Space Grotesk',sans-serif"
                      }
                    }, item.status || "--")
                  ),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.creator ? item.creator.full_name : "--"),
                  React.createElement("td", {
                    style: {
                      fontSize: 11, color: "var(--text-muted)",
                      fontFamily: "'Space Grotesk',sans-serif"
                    }
                  }, fmtDate(item.created_at)),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.assignee ? item.assignee.full_name : "—"),
                  React.createElement("td", {
                    style: {
                      fontSize: 11, fontFamily: "'Space Grotesk',sans-serif",
                      color: assignOver ? "#EF4444" : "var(--text-muted)"
                    }
                  }, item.assignment_due ? fmtDate(item.assignment_due) : "—"),
                  React.createElement("td", {
                    style: { fontSize: 12, fontFamily: "'Space Grotesk',sans-serif" }
                  }, item.last_updated_by_name || "--"),
                  React.createElement("td", {
                    style: {
                      fontSize: 11, color: "var(--text-muted)",
                      fontFamily: "'Space Grotesk',sans-serif"
                    }
                  }, item.last_updated_at ? fmtDate(item.last_updated_at) : "--"),
                  React.createElement("td", {
                    style: {
                      fontSize: 12, fontFamily: "'Space Grotesk',sans-serif",
                      color: overdue ? "#EF4444" : "var(--text)"
                    }
                  }, calcAge(item.created_at)),
                  React.createElement("td", null,
                    overdue
                      ? React.createElement("span", {
                          style: {
                            fontSize: 11, color: "#EF4444",
                            fontWeight: 700,
                            fontFamily: "'Space Grotesk',sans-serif"
                          }
                        }, "⚠ Overdue")
                      : React.createElement("span", {
                          style: {
                            fontSize: 11, color: "#22C55E",
                            fontFamily: "'Space Grotesk',sans-serif"
                          }
                        }, "✓ OK")
                  ),
                  React.createElement("td", null,
                    React.createElement("div", {
                      style: { display: "flex", gap: 4, flexWrap: "wrap" }
                    },
                      React.createElement("button", {
                        className: "nx-btn nx-btn-secondary nx-btn-sm",
                        onClick: function () { setSelected(item); }
                      }, "View"),
                      canAct(item) ? React.createElement("button", {
                        className: "nx-btn nx-btn-secondary nx-btn-sm",
                        onClick: function () {
                          setActionItem(item);
                          setActionType("note");
                          setActionNote("");
                        }
                      }, "Add Note") : null,
                      canAct(item) && item.status !== "Closed"
                        ? React.createElement("button", {
                            className: "nx-btn nx-btn-secondary nx-btn-sm",
                            onClick: function () {
                              setActionItem(item);
                              setActionType("status");
                              setActionNote("");
                            }
                          }, "Change Status")
                        : null,
                      canAssign ? React.createElement("button", {
                        className: "nx-btn nx-btn-secondary nx-btn-sm",
                        onClick: function () {
                          setAssignItem(item);
                          setAssignTo(item.assigned_to || "");
                          setAssignDue(item.assignment_due || "");
                          setAssignNote("");
                        }
                      }, item.assigned_to ? "Reassign" : "Assign") : null,
                      canEscalate(item) &&
                      item.status !== "Escalated" &&
                      item.status !== "Closed"
                        ? React.createElement("button", {
                            className: "nx-btn nx-btn-sm",
                            style: {
                              background: "rgba(239,68,68,0.1)",
                              color: "#EF4444",
                              border: "1px solid rgba(239,68,68,0.3)"
                            },
                            onClick: function () {
                              setActionItem(item);
                              setActionType("escalate");
                              setActionNote("");
                            }
                          }, "Escalate")
                        : null,
                      canClose(item) && item.status !== "Closed"
                        ? React.createElement("button", {
                            className: "nx-btn nx-btn-sm",
                            style: {
                              background: "rgba(107,114,128,0.1)",
                              color: "#6B7280",
                              border: "1px solid rgba(107,114,128,0.3)"
                            },
                            onClick: function () {
                              setActionItem(item);
                              setActionType("close");
                              setActionNote("");
                            }
                          }, "Close")
                        : null,
                      canClose(item) && item.status === "Closed"
                        ? React.createElement("button", {
                            className: "nx-btn nx-btn-sm",
                            style: {
                              background: "rgba(249,115,22,0.1)",
                              color: "#F97316",
                              border: "1px solid rgba(249,115,22,0.3)"
                            },
                            onClick: function () {
                              changeStatus(item, "Reopen", "Ticket reopened");
                            }
                          }, "Reopen")
                        : null
                    )
                  )
                );
              })
            )
          )
        ),

    // ── Action Modal ──
    actionItem ? React.createElement("div", {
      style: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 1000, padding: 16
      },
      onClick: function (e) {
        if (e.target === e.currentTarget) {
          setActionItem(null); setActionNote("");
        }
      }
    },
      React.createElement("div", {
        className: "nx-card",
        style: { width: "100%", maxWidth: 460, padding: 24 }
      },
        React.createElement("div", {
          style: {
            fontSize: 15, fontWeight: 700, marginBottom: 16,
            color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif"
          }
        },
          actionType === "note"     ? "Add Note — TT# "      + actionItem.tt_number :
          actionType === "status"   ? "Change Status — TT# " + actionItem.tt_number :
          actionType === "escalate" ? "Escalate TT# "        + actionItem.tt_number :
          actionType === "close"    ? "Close TT# "           + actionItem.tt_number : ""
        ),
        actionType === "status" ? React.createElement("select", {
          className: "nx-input", style: { marginBottom: 10 },
          onChange: function (e) { setActionType("status_" + e.target.value); }
        },
          ["In Progress", "Escalated", "Closed", "Reopen"]
            .filter(function (s) { return s !== actionItem.status; })
            .map(function (s) {
              return React.createElement("option", { key: s, value: s }, s);
            })
        ) : null,
        React.createElement("textarea", {
          className: "nx-input",
          placeholder:
            (actionType === "note" ||
             actionType === "escalate" ||
             actionType === "close")
              ? "Note (required)"
              : "Note (optional)",
          rows: 4,
          value: actionNote,
          onChange: function (e) { setActionNote(e.target.value); }
        }),
        React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 12 } },
          React.createElement("button", {
            className: "nx-btn nx-btn-primary",
            onClick: function () {
              var requireNote =
                actionType === "note" ||
                actionType === "escalate" ||
                actionType === "close" ||
                actionType.startsWith("status_");
              if (requireNote && (!actionNote || !actionNote.trim())) {
                showToast("Note is required for this action", "warning");
                return;
              }
              if (actionType === "note") {
                addNote(actionItem, actionNote);
              } else if (actionType === "escalate") {
                changeStatus(actionItem, "Escalated", actionNote);
              } else if (actionType === "close") {
                changeStatus(actionItem, "Closed", actionNote);
              } else if (actionType.startsWith("status_")) {
                changeStatus(actionItem, actionType.replace("status_", ""), actionNote);
              }
            }
          }, "Confirm"),
          React.createElement("button", {
            className: "nx-btn nx-btn-secondary",
            onClick: function () { setActionItem(null); setActionNote(""); }
          }, "Cancel")
        )
      )
    ) : null,

    // ── Assign Modal ──
    assignItem ? React.createElement("div", {
      style: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 1000, padding: 16
      },
      onClick: function (e) {
        if (e.target === e.currentTarget) {
          setAssignItem(null);
          setAssignTo(""); setAssignDue(""); setAssignNote("");
        }
      }
    },
      React.createElement("div", {
        className: "nx-card",
        style: { width: "100%", maxWidth: 460, padding: 24 }
      },
        React.createElement("div", {
          style: {
            fontSize: 15, fontWeight: 700, marginBottom: 16,
            color: "var(--text)", fontFamily: "'Space Grotesk',sans-serif"
          }
        }, (assignItem.assigned_to ? "Reassign" : "Assign") +
           " — TT# " + assignItem.tt_number),
        React.createElement("div", {
          style: { display: "flex", flexDirection: "column", gap: 10 }
        },
          React.createElement("select", {
            className: "nx-input",
            value: assignTo,
            onChange: function (e) { setAssignTo(e.target.value); }
          },
            [React.createElement("option", { key: "", value: "" }, "Select employee...")]
              .concat(employees.map(function (emp) {
                return React.createElement("option", { key: emp.id, value: emp.id },
                  emp.full_name + " (" + emp.role + ")"
                );
              }))
          ),
          React.createElement("input", {
            className: "nx-input", type: "datetime-local",
            value: assignDue,
            onChange: function (e) { setAssignDue(e.target.value); }
          }),
          React.createElement("textarea", {
            className: "nx-input",
            placeholder: assignItem.assigned_to
              ? "Reassign note (required)"
              : "Assignment note (optional)",
            rows: 3,
            value: assignNote,
            onChange: function (e) { setAssignNote(e.target.value); }
          }),
          React.createElement("div", { style: { display: "flex", gap: 8 } },
            React.createElement("button", {
              className: "nx-btn nx-btn-primary",
              onClick: function () {
                if (assignItem.assigned_to && (!assignNote || !assignNote.trim())) {
                  showToast("Reassign note is required", "warning");
                  return;
                }
                assignTT(assignItem);
              }
            }, "Save Assignment"),
            React.createElement("button", {
              className: "nx-btn nx-btn-secondary",
              onClick: function () {
                setAssignItem(null);
                setAssignTo(""); setAssignDue(""); setAssignNote("");
              }
            }, "Cancel")
          )
        )
      )
    ) : null,

    // ── Detail Modal ──
    selected ? React.createElement("div", {
      style: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 1000,
        padding: 16, overflowY: "auto"
      },
      onClick: function (e) {
        if (e.target === e.currentTarget) setSelected(null);
      }
    },
      React.createElement("div", {
        className: "nx-card",
        style: {
          width: "100%", maxWidth: 560,
          padding: 24, maxHeight: "90vh", overflowY: "auto"
        }
      },
        React.createElement("div", {
          style: {
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16
          }
        },
          React.createElement("div", {
            style: {
              fontSize: 16, fontWeight: 800,
              color: "var(--primary)",
              fontFamily: "'Space Grotesk',sans-serif"
            }
          }, "TT# " + selected.tt_number),
          React.createElement("button", {
            className: "nx-btn nx-btn-secondary nx-btn-sm",
            onClick: function () { setSelected(null); }
          }, "✕ Close")
        ),
        React.createElement("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 16
          }
        },
          [
            { label: "Case ID",        value: selected.case_id },
            { label: "User ID",        value: selected.user_id },
            { label: "Order ID",       value: selected.order_id },
            { label: "Country",        value: selected.country },
            { label: "Status",         value: selected.status },
            { label: "Created By",     value: selected.creator ? selected.creator.full_name : "--" },
            { label: "Created At",     value: fmtDate(selected.created_at) },
            { label: "Assigned To",    value: selected.assignee ? selected.assignee.full_name : "—" },
            { label: "Assignment Due", value: selected.assignment_due ? fmtDate(selected.assignment_due) : "—" },
            { label: "Last Updated",   value: selected.last_updated_at ? fmtDate(selected.last_updated_at) : "--" },
            { label: "Age",            value: calcAge(selected.created_at) },
            { label: "Overdue",        value: isOverdue(selected) ? "⚠ Yes" : "✓ No" }
          ].map(function (row) {
            return React.createElement("div", {
              key: row.label,
              style: {
                background: "var(--card2)",
                borderRadius: 8, padding: "8px 12px"
              }
            },
              React.createElement("div", {
                style: {
                  fontSize: 10, color: "var(--text-muted)",
                  marginBottom: 2, textTransform: "uppercase",
                  fontFamily: "'Space Grotesk',sans-serif"
                }
              }, row.label),
              React.createElement("div", {
                style: {
                  fontSize: 13, fontWeight: 600,
                  color: "var(--text)",
                  fontFamily: "'Space Grotesk',sans-serif"
                }
              }, row.value || "--")
            );
          })
        ),
        selected.notes ? React.createElement("div", { style: { marginBottom: 16 } },
          React.createElement("div", {
            style: {
              fontSize: 11, color: "var(--text-muted)",
              marginBottom: 6, textTransform: "uppercase",
              fontFamily: "'Space Grotesk',sans-serif"
            }
          }, "Notes"),
          React.createElement("div", {
            style: {
              fontSize: 13, color: "var(--text-sub)",
              lineHeight: 1.6, background: "var(--card2)",
              borderRadius: 8, padding: "10px 14px",
              fontFamily: "'Space Grotesk',sans-serif"
            }
          }, selected.notes)
        ) : null,
        React.createElement(TTActivityLog, { ttId: selected.id, sb: sb, DB: DB })
      )
    ) : null

  );
}

// ── TTActivityLog Component ──
function TTActivityLog(props) {
  var ttId = props.ttId;
  var _1 = React.useState([]); var logs = _1[0]; var setLogs = _1[1];
  var _2 = React.useState(true); var loading = _2[0]; var setLoading = _2[1];

  React.useEffect(function () {
    if (!ttId) return;
    withRetry(function () {
      return props.sb.from(props.DB.TT_ACTIVITY || "tt_activity_log")
        .select("*,performer:employees!performed_by(full_name)")
        .eq("tt_id", ttId)
        .order("performed_at", { ascending: false });
    }).then(function (r) { setLogs(r.data || []); })
      .catch(function () {})
      .finally(function () { setLoading(false); });
  }, [ttId]);

  var ACTION_LABELS = {
    created:        "Ticket created",
    status_changed: "Status changed",
    escalated:      "Ticket escalated",
    closed:         "Ticket closed",
    assigned:       "Ticket assigned",
    reassigned:     "Ticket reassigned",
    note_added:     "Note added",
    overdue:        "Due date exceeded",
    alert_sent:     "Alert sent",
    reopened:       "Ticket reopened"
  };

  if (loading) return React.createElement("div", {
    style: {
      fontSize: 12, color: "var(--text-muted)",
      padding: 8, fontFamily: "'Space Grotesk',sans-serif"
    }
  }, "Loading activity log...");

  if (logs.length === 0) return React.createElement("div", {
    style: {
      fontSize: 12, color: "var(--text-muted)",
      padding: 8, fontFamily: "'Space Grotesk',sans-serif"
    }
  }, "No activity log yet.");

  return React.createElement("div", null,
    React.createElement("div", {
      style: {
        fontSize: 11, color: "var(--text-muted)",
        marginBottom: 8, textTransform: "uppercase",
        fontFamily: "'Space Grotesk',sans-serif"
      }
    }, "Activity Log"),
    React.createElement("div", {
      style: { display: "flex", flexDirection: "column", gap: 6 }
    },
      logs.map(function (log) {
        return React.createElement("div", {
          key: log.id,
          style: {
            background: "var(--card2)", borderRadius: 8,
            padding: "8px 12px",
            borderLeft: "3px solid var(--primary)"
          }
        },
          React.createElement("div", {
            style: {
              display: "flex", justifyContent: "space-between",
              alignItems: "center", flexWrap: "wrap", gap: 4
            }
          },
            React.createElement("span", {
              style: {
                fontSize: 12, fontWeight: 700,
                color: "var(--text)",
                fontFamily: "'Space Grotesk',sans-serif"
              }
            }, ACTION_LABELS[log.action] || log.action),
            React.createElement("span", {
              style: {
                fontSize: 10, color: "var(--text-muted)",
                fontFamily: "'Space Grotesk',sans-serif"
              }
            }, fmtDate(log.performed_at))
          ),
          log.performer ? React.createElement("div", {
            style: {
              fontSize: 11, color: "var(--text-muted)",
              marginTop: 2, fontFamily: "'Space Grotesk',sans-serif"
            }
          }, "By: " + log.performer.full_name) : null,
          log.prev_status && log.new_status
            ? React.createElement("div", {
                style: {
                  fontSize: 11, color: "var(--text-sub)",
                  marginTop: 2, fontFamily: "'Space Grotesk',sans-serif"
                }
              }, log.prev_status + " → " + log.new_status)
            : null,
          log.note ? React.createElement("div", {
            style: {
              fontSize: 12, color: "var(--text-sub)",
              marginTop: 4, fontStyle: "italic",
              fontFamily: "'Space Grotesk',sans-serif"
            }
          }, "\"" + log.note + "\"") : null
        );
      })
    )
  );
}

function PerformancePage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];
  var _3=React.useState("week");var range=_3[0];var setRange=_3[1];
  var isMgr=RC.isMgr(user);

  React.useEffect(function(){load()},[range]);

  function load(){
    setLoading(true);
    var from=range==="week"
      ?new Date(Date.now()-7*86400000).toISOString().split("T")[0]
      :new Date(Date.now()-30*86400000).toISOString().split("T")[0];
    var q=sb.from(DB.PERFORMANCE)
      .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
      .gte("date",from)
      .order("date",{ascending:false});
    if(!isMgr)q=q.eq("employee_id",user.id);
    withRetry(function(){return q})
      .then(function(r){setItems(r.data||[])})
      .catch(function(){showToast("Failed to load","error")})
      .finally(function(){setLoading(false)});
  }

  var totals=items.reduce(function(acc,x){
    acc.tickets+=(x.tickets_handled||0);
    acc.csat+=(x.csat||0);
    acc.count++;
    return acc;
  },{tickets:0,csat:0,count:0});

  if(loading)return React.createElement(LoadingPage,{message:"Loading Performance..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{
      title:"Performance",icon:"📊",
      subtitle:items.length+" records",
      actions:React.createElement("div",{style:{display:"flex",gap:6}},
        ["week","month"].map(function(r){
          return React.createElement("button",{
            key:r,
            className:"nx-btn nx-btn-sm "+(range===r?"nx-btn-primary":"nx-btn-secondary"),
            onClick:function(){setRange(r)}
          },r==="week"?"7 Days":"30 Days");
        })
      )
    }),
    React.createElement("div",{className:"nx-grid-3",style:{marginBottom:20}},
      [
        {label:"Total Tickets",value:fmtNumber(totals.tickets),color:"var(--primary)"},
        {label:"Avg CSAT",value:totals.count>0?(totals.csat/totals.count).toFixed(1):"--",color:"#22C55E"},
        {label:"Days Tracked",value:totals.count,color:"#3B82F6"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:24}},s.value)
        );
      })
    ),
    items.length===0?React.createElement(EmptyState,{icon:"📊",title:"No performance data"}):
    React.createElement("div",{style:{overflowX:"auto"}},
      React.createElement("table",{className:"nx-table"},
        React.createElement("thead",null,
          React.createElement("tr",null,
            isMgr?React.createElement("th",null,"Employee"):null,
            React.createElement("th",null,"Date"),
            React.createElement("th",null,"Tickets"),
            React.createElement("th",null,"CSAT"),
            React.createElement("th",null,"Notes")
          )
        ),
        React.createElement("tbody",null,
          items.map(function(item){
            return React.createElement("tr",{key:item.id},
              isMgr?React.createElement("td",null,
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                  React.createElement(NxAvatar,{user:item.employee,size:"xs"}),
                  React.createElement("span",{style:{fontSize:12,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}},
                    item.employee?item.employee.full_name:"--"
                  )
                )
              ):null,
              React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},fmtDate(item.date)),
              React.createElement("td",{style:{fontSize:13,fontWeight:700,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
                item.tickets_handled||0
              ),
              React.createElement("td",{style:{fontSize:13,fontWeight:700,color:"#22C55E",fontFamily:"'Space Grotesk',sans-serif"}},
                item.csat?item.csat.toFixed(1):"--"
              ),
              React.createElement("td",{style:{fontSize:12,color:"var(--text-sub)",fontFamily:"'Space Grotesk',sans-serif"}},
                item.notes||"--"
              )
            );
          })
        )
      )
    )
  );
}

function QueuePage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){
    load();
    ChannelMgr.sub("queue",DB.QUEUE_STATS,null,load);
    return function(){ChannelMgr.unsub("queue")};
  },[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.QUEUE_STATS)
        .select("*")
        .order("created_at",{ascending:false})
        .limit(20);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load queue","error")})
    .finally(function(){setLoading(false)});
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Queue..."});

  var latest=items[0]||null;

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Queue",icon:"📞",subtitle:"Live queue stats"}),
    latest?React.createElement("div",{className:"nx-grid-4",style:{marginBottom:20}},
      [
        {label:"In Queue",value:latest.calls_in_queue||0,color:"#EF4444"},
        {label:"Avg Wait",value:fmtDuration(latest.avg_wait_time||0),color:"#EAB308"},
        {label:"Agents Online",value:latest.agents_online||0,color:"#22C55E"},
        {label:"Calls Today",value:fmtNumber(latest.calls_today||0),color:"var(--primary)"}
      ].map(function(s){
        return React.createElement("div",{key:s.label,className:"nx-stat-card"},
          React.createElement("span",{className:"nx-stat-label"},s.label),
          React.createElement("div",{className:"nx-stat-value",style:{color:s.color,fontSize:22}},s.value)
        );
      })
    ):React.createElement(EmptyState,{icon:"📞",title:"No queue data"}),
    items.length>1?React.createElement("div",null,
      React.createElement("div",{className:"nx-section-title"},"Recent Snapshots"),
      React.createElement("div",{style:{overflowX:"auto"}},
        React.createElement("table",{className:"nx-table"},
          React.createElement("thead",null,
            React.createElement("tr",null,
              React.createElement("th",null,"Time"),
              React.createElement("th",null,"In Queue"),
              React.createElement("th",null,"Avg Wait"),
              React.createElement("th",null,"Agents")
            )
          ),
          React.createElement("tbody",null,
            items.slice(0,10).map(function(item){
              return React.createElement("tr",{key:item.id},
                React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},fmtTime(item.created_at)),
                React.createElement("td",{style:{fontSize:13,fontWeight:700,color:"#EF4444",fontFamily:"'Space Grotesk',sans-serif"}},item.calls_in_queue||0),
                React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},fmtDuration(item.avg_wait_time||0)),
                React.createElement("td",{style:{fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}},item.agents_online||0)
              );
            })
          )
        )
      )
    ):null
  );
}

function GamificationPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.EMPLOYEE_POINTS)
        .select("*,employee:employees!employee_id(full_name,role,avatar_url)")
        .order("total_points",{ascending:false})
        .limit(50);
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load","error")})
    .finally(function(){setLoading(false)});
  }

  var myPoints=items.find(function(x){return x.employee_id===user.id});
  var myRank=items.findIndex(function(x){return x.employee_id===user.id})+1;

  if(loading)return React.createElement(LoadingPage,{message:"Loading Gamification..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Gamification",icon:"🏆",subtitle:"Leaderboard"}),
    myPoints?React.createElement("div",{className:"nx-card",style:{padding:16,marginBottom:20,borderColor:"var(--primary)"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}},
        React.createElement("div",{style:{fontSize:32}},
          myRank===1?"🥇":myRank===2?"🥈":myRank===3?"🥉":"🎖️"
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},"Your Ranking"),
          React.createElement("div",{style:{fontSize:22,fontWeight:900,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
            "#"+myRank+" · "+fmtNumber(myPoints.total_points||0)+" pts"
          )
        )
      )
    ):null,
    items.length===0?React.createElement(EmptyState,{icon:"🏆",title:"No data yet"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      items.map(function(item,idx){
        var isMe=item.employee_id===user.id;
        var medal=idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":null;
        return React.createElement("div",{
          key:item.id,
          className:"nx-card",
          style:{
            padding:14,
            borderColor:isMe?"var(--primary)":"var(--border)",
            background:isMe?"rgba(0,255,136,0.04)":"var(--card)"
          }
        },
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12}},
            React.createElement("div",{style:{
              width:32,height:32,borderRadius:"50%",
              background:"var(--card2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:14,fontWeight:800,color:"var(--text-muted)",
              flexShrink:0,fontFamily:"'Space Grotesk',sans-serif"
            }},medal||"#"+(idx+1)),
            React.createElement(NxAvatar,{user:item.employee,size:"sm"}),
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:isMe?"var(--primary)":"var(--text)",fontFamily:"'Space Grotesk',sans-serif"}},
                item.employee?item.employee.full_name:"--"
              ),
              item.employee?React.createElement(RoleBadge,{role:item.employee.role}):null
            ),
            React.createElement("div",{style:{textAlign:"right"}},
              React.createElement("div",{style:{fontSize:16,fontWeight:900,color:"var(--primary)",fontFamily:"'Space Grotesk',sans-serif"}},
                fmtNumber(item.total_points||0)
              ),
              React.createElement("div",{style:{fontSize:10,color:"var(--text-muted)",fontFamily:"'Space Grotesk',sans-serif"}},"points")
            )
          )
        );
      })
    )
  );
}

function SurveysPage(props){
  var user=props.user;
  var _1=React.useState([]);var items=_1[0];var setItems=_1[1];
  var _2=React.useState(true);var loading=_2[0];var setLoading=_2[1];

  React.useEffect(function(){load()},[]);

  function load(){
    withRetry(function(){
      return sb.from(DB.SURVEYS)
        .select("*")
        .eq("is_active",true)
        .order("created_at",{ascending:false});
    }).then(function(r){setItems(r.data||[])})
    .catch(function(){showToast("Failed to load surveys","error")})
    .finally(function(){setLoading(false)});
  }

  if(loading)return React.createElement(LoadingPage,{message:"Loading Surveys..."});

  return React.createElement("div",{className:"nx-page-enter"},
    React.createElement(PageHeader,{title:"Surveys",icon:"📝",subtitle:items.length+" active surveys"}),
    items.length===0?React.createElement(EmptyState,{icon:"📝",title:"No active surveys",desc:"Surveys will appear here when available"}):
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
      items.map(function(item){
        return React.createElement("div",{key:item.id,className:"nx-card",style:{padding:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}},
            React.createElement("div",{style:{flex:1}},
              React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"}},
                item.title
              ),
              item.description?React.createElement("p",{style:{fontSize:13,color:"var(--text-sub)",lineHeight:1.6,marginBottom:8,fontFamily:"'Space Grotesk',sans-serif"}},
                item.description
              ):null,
              item.expires_at?React.createElement("div",{style:{fontSize:11,color:"var(--warning)",fontWeight:600,fontFamily:"'Space Grotesk',sans-serif"}},
                "⏰ Expires: "+fmtDate(item.expires_at)
              ):null
            ),
            React.createElement("button",{
              className:"nx-btn nx-btn-primary nx-btn-sm",
              onClick:function(){showToast("Survey response — coming soon","info")}
            },"Take Survey")
          )
        );
      })
    )
  );
}
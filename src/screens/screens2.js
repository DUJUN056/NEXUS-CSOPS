/* ============================================================
   NEXUS-CSOPS v4.2.0
   screens2.js — Part A
   SEC 10: Attendance + SEC 11: LiveFloor
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 10 — ATTENDANCE
   ══════════════════════════════════════════════════════════ */
function AttendancePage({ user }) {
  const [record,    setRecord]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [clocking,  setClocking]  = useState(false);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [location,  setLocation]  = useState(null);
  const [officePos, setOfficePos] = useState(null);
  const [distance,  setDistance]  = useState(null);
  const [history,   setHistory]   = useState([]);
  const [showHist,  setShowHist]  = useState(false);
  const [now,       setNow]       = useState(new Date());

  /* تحديث الساعة كل ثانية */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadConfig();
    loadTodayRecord();
    loadHistory();
  }, []);

  async function loadConfig() {
    try {
      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", ["office_lat","office_lng","gps_radius"])
      );
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      if (map.office_lat && map.office_lng) {
        setOfficePos({
          lat:    parseFloat(map.office_lat),
          lng:    parseFloat(map.office_lng),
          radius: parseInt(map.gps_radius) || 10
        });
      }
    } catch(e) {}
  }

  async function loadTodayRecord() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await withRetry(() =>
        sb.from("attendance")
          .select("*")
          .eq("employee_id", user.id)
          .eq("date", today)
          .single()
      );
      setRecord(data || null);
    } catch(e) {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const { data } = await withRetry(() =>
        sb.from("attendance")
          .select("*")
          .eq("employee_id", user.id)
          .order("date", { ascending: false })
          .limit(30)
      );
      setHistory(data || []);
    } catch(e) {}
  }

  /* الحصول على GPS */
  async function getGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS not supported on this device"));
        return;
      }
      setGpsStatus("scanning");
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsStatus("success");
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        err => {
          setGpsStatus("error");
          reject(new Error(
            err.code === 1 ? "GPS permission denied" :
            err.code === 2 ? "GPS position unavailable" :
            "GPS timeout"
          ));
        },
        { enableHighAccuracy: true, timeout: 15000,
          maximumAge: 0 }
      );
    });
  }

  /* Clock In */
  async function handleClockIn() {
    setClocking(true);
    try {
      let pos = null;
      let dist = null;
      let withinRange = true;

      /* GPS Check */
      if (officePos) {
        try {
          pos = await getGPS();
          dist = haversine(
            pos.lat, pos.lng,
            officePos.lat, officePos.lng
          );
          setDistance(dist);
          setLocation(pos);
          withinRange = dist <= officePos.radius;
        } catch(gpsErr) {
          showToast(gpsErr.message, "warning");
          /* السماح بالتسجيل مع تحذير */
        }
      }

      if (!withinRange) {
        showToast(
          `You are ${dist}m away. Must be within ${officePos.radius}m`,
          "error"
        );
        setClocking(false);
        return;
      }

      /* حساب الحالة */
      const now        = new Date();
      const today      = now.toISOString().split("T")[0];
      const clockInISO = now.toISOString();

      /* جلب إعدادات الوقت */
      const { data: cfg } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", ["work_start","late_minutes"])
      );
      const cfgMap = {};
      (cfg || []).forEach(r => { cfgMap[r.key] = r.value; });

      const workStart    = cfgMap.work_start || "08:00";
      const lateMinutes  = parseInt(cfgMap.late_minutes) || 7;
      const [wh, wm]     = workStart.split(":").map(Number);
      const workStartMin = wh * 60 + wm;
      const nowMin       = now.getHours() * 60 + now.getMinutes();
      const attStatus    = nowMin > workStartMin + lateMinutes
        ? "late" : "on_time";

      /* إدراج السجل */
      const { data: newRec } = await withRetry(() =>
        sb.from("attendance").insert({
          employee_id:  user.id,
          date:         today,
          clock_in:     clockInISO,
          clock_out:    null,
          status:       attStatus,
          lat_in:       pos?.lat || null,
          lng_in:       pos?.lng || null,
          distance_in:  dist || null,
          created_at:   clockInISO
        }).select("*").single()
      );

      /* تحديث حالة الموظف */
      await withRetry(() =>
        sb.from("employees")
          .update({
            status:    "online",
            is_online: true,
            last_seen: clockInISO
          })
          .eq("id", user.id)
      );

      await logAudit("CLOCK_IN",
        `${attStatus} — ${dist ? dist+"m" : "no GPS"}`,
        user.id
      );

      setRecord(newRec);
      loadHistory();
      showToast(
        attStatus === "late"
          ? "⚠️ Clocked in — LATE"
          : "✅ Clocked in — On Time",
        attStatus === "late" ? "warning" : "success"
      );

    } catch(e) {
      showToast("Clock in failed: " + e.message, "error");
    } finally {
      setClocking(false);
      setGpsStatus("idle");
    }
  }

  /* Clock Out */
  async function handleClockOut() {
    if (!record) return;
    setClocking(true);
    try {
      const now        = new Date();
      const clockOutISO = now.toISOString();

      /* حساب مدة العمل */
      const clockIn   = new Date(record.clock_in);
      const workSecs  = Math.floor(
        (now - clockIn) / 1000
      );

      let pos  = null;
      let dist = null;

      if (officePos) {
        try {
          pos  = await getGPS();
          dist = haversine(
            pos.lat, pos.lng,
            officePos.lat, officePos.lng
          );
        } catch(e) {}
      }

      await withRetry(() =>
        sb.from("attendance")
          .update({
            clock_out:    clockOutISO,
            work_seconds: workSecs,
            lat_out:      pos?.lat  || null,
            lng_out:      pos?.lng  || null,
            distance_out: dist      || null,
          })
          .eq("id", record.id)
      );

      /* تحديث حالة الموظف */
      await withRetry(() =>
        sb.from("employees")
          .update({
            status:    "offline",
            is_online: false,
            last_seen: clockOutISO
          })
          .eq("id", user.id)
      );

      await logAudit("CLOCK_OUT",
        `Duration: ${fmtDuration(workSecs)}`, user.id
      );

      setRecord(p => ({
        ...p,
        clock_out:    clockOutISO,
        work_seconds: workSecs
      }));
      loadHistory();
      showToast("✅ Clocked out successfully", "success");

    } catch(e) {
      showToast("Clock out failed: " + e.message, "error");
    } finally {
      setClocking(false);
      setGpsStatus("idle");
    }
  }

  /* حساب مدة العمل الحالية */
  const currentWorkSecs = record?.clock_in && !record?.clock_out
    ? Math.floor(
        (now - new Date(record.clock_in)) / 1000
      )
    : record?.work_seconds || 0;

  const isClockedIn  = !!record?.clock_in && !record?.clock_out;
  const isClockedOut = !!record?.clock_out;

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading attendance..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Attendance",
      icon:  "✅",
      subtitle: now.toLocaleDateString("en-GB", {
        weekday:"long", day:"2-digit",
        month:"long", year:"numeric"
      })
    }),

    React.createElement("div", {
      className: "nx-grid-2",
      style: { gap: 20 }
    },

      /* Clock Card */
      React.createElement("div", { className: "nx-card" },
        /* Clock Display */
        React.createElement("div", {
          style: {
            textAlign: "center",
            padding: "24px 0 20px"
          }
        },
          React.createElement("div", {
            style: {
              fontSize: 48,
              fontWeight: 900,
              color: "var(--text)",
              letterSpacing: -2,
              fontVariantNumeric: "tabular-nums"
            }
          },
            now.toLocaleTimeString("en-GB", {
              hour:"2-digit", minute:"2-digit",
              second:"2-digit"
            })
          ),
          React.createElement("div", {
            style: {
              fontSize: 13,
              color: "var(--text-muted)",
              marginTop: 4
            }
          }, getSaudiPeriod().toUpperCase() + " — KSA")
        ),

        /* Status */
        React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "center",
            marginBottom: 20
          }
        },
          isClockedOut
            ? React.createElement("span", {
                className: "nx-badge nx-badge-neutral"
              }, "✅ Shift Complete")
            : isClockedIn
            ? React.createElement("span", {
                className: "nx-badge nx-badge-success"
              },
                React.createElement("span", {
                  className: "nx-live-dot green",
                  style: { marginRight: 4 }
                }),
                "Clocked In"
              )
            : React.createElement("span", {
                className: "nx-badge nx-badge-neutral"
              }, "⏸ Not Clocked In")
        ),

        /* GPS Status */
        gpsStatus === "scanning" &&
        React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
            fontSize: 13,
            color: "var(--primary)"
          }
        },
          React.createElement("span", {
            className: "nx-gps-scan",
            style: { fontSize: 20 }
          }, "📡"),
          "Getting GPS location..."
        ),

        distance !== null &&
        React.createElement("div", {
          style: {
            textAlign: "center",
            marginBottom: 16,
            fontSize: 12,
            color: distance <= (officePos?.radius || 10)
              ? "var(--success)" : "var(--danger)"
          }
        },
          `📍 ${distance}m from office `,
          `(max: ${officePos?.radius || 10}m)`
        ),

        /* Work Duration */
        isClockedIn &&
        React.createElement("div", {
          style: {
            textAlign: "center",
            marginBottom: 20
          }
        },
          React.createElement("div", {
            style: {
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 4
            }
          }, "Work Duration"),
          React.createElement("div", {
            style: {
              fontSize: 28,
              fontWeight: 800,
              color: "var(--primary)",
              fontVariantNumeric: "tabular-nums"
            }
          }, fmtDuration(currentWorkSecs))
        ),

        /* Clock In/Out Button */
        !isClockedOut &&
        React.createElement("button", {
          className: `nx-btn nx-btn-full nx-btn-lg ${
            isClockedIn
              ? "nx-btn-danger"
              : "nx-btn-primary"}`,
          onClick: isClockedIn
            ? handleClockOut : handleClockIn,
          disabled: clocking,
          style: { marginTop: 8 }
        },
          clocking
            ? React.createElement("span", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  justifyContent: "center"
                }
              },
                React.createElement(Spinner),
                gpsStatus === "scanning"
                  ? "Getting GPS..." : "Processing..."
              )
            : isClockedIn
            ? "🔴 Clock Out"
            : "🟢 Clock In"
        ),

        isClockedOut &&
        React.createElement("div", {
          className: "nx-alert nx-alert-success",
          style: { marginTop: 8 }
        },
          React.createElement("span", {
            className: "nx-alert-icon"
          }, "✅"),
          React.createElement("div", null,
            React.createElement("strong", null,
              "Shift Complete"),
            React.createElement("div", {
              style: { fontSize: 12, marginTop: 2 }
            },
              `Duration: ${fmtDuration(record.work_seconds)}`
            )
          )
        )
      ),

      /* Today's Info Card */
      React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 16
        }
      },
        /* Today Record */
        React.createElement("div", { className: "nx-card" },
          React.createElement(SectionHeader, {
            title: "📋 Today's Record"
          }),
          React.createElement("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16
            }
          },
            [
              {
                label: "Clock In",
                value: record?.clock_in
                  ? fmtTime(record.clock_in) : "—",
                icon: "🟢"
              },
              {
                label: "Clock Out",
                value: record?.clock_out
                  ? fmtTime(record.clock_out) : "—",
                icon: "🔴"
              },
              {
                label: "Status",
                value: record?.status || "—",
                icon: "📊"
              },
              {
                label: "Work Time",
                value: record?.work_seconds
                  ? fmtDuration(record.work_seconds)
                  : isClockedIn
                  ? fmtDuration(currentWorkSecs)
                  : "—",
                icon: "⏱️"
              },
              {
                label: "GPS Distance",
                value: record?.distance_in
                  ? `${record.distance_in}m`
                  : "—",
                icon: "📍"
              },
            ].map(item =>
              React.createElement("div", {
                key: item.label,
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--card2)",
                  borderRadius: "var(--radius-sm)"
                }
              },
                React.createElement("span", {
                  style: {
                    fontSize: 12,
                    color: "var(--text-sub)"
                  }
                },
                  `${item.icon} ${item.label}`
                ),
                React.createElement("span", {
                  style: {
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)"
                  }
                }, item.value)
              )
            )
          )
        ),

        /* Status Badge */
        record?.status &&
        React.createElement("div", {
          className: "nx-card",
          style: { textAlign: "center", padding: "16px" }
        },
          React.createElement("div", {
            style: {
              fontSize: 32,
              marginBottom: 8
            }
          },
            record.status === "on_time" ? "✅" :
            record.status === "late"    ? "⚠️" :
            record.status === "absent"  ? "❌" : "📋"
          ),
          React.createElement("div", {
            style: {
              fontSize: 16,
              fontWeight: 800,
              color:
                record.status === "on_time"
                  ? "var(--success)" :
                record.status === "late"
                  ? "var(--warning)" :
                "var(--danger)"
            }
          },
            record.status === "on_time" ? "ON TIME" :
            record.status === "late"    ? "LATE"    :
            record.status.toUpperCase()
          )
        )
      )
    ),

    /* History Toggle */
    React.createElement("div", {
      style: { marginTop: 24 }
    },
      React.createElement("button", {
        className: "nx-btn nx-btn-secondary",
        onClick: () => setShowHist(p => !p)
      }, showHist
        ? "▲ Hide History"
        : `▼ Show History (${history.length} records)`
      )
    ),

    /* History Table */
    showHist && React.createElement("div", {
      className: "nx-table-wrap",
      style: { marginTop: 12 }
    },
      React.createElement("table", { className: "nx-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            ["Date","Clock In","Clock Out",
             "Duration","Status","Distance"].map(h =>
              React.createElement("th", { key: h }, h)
            )
          )
        ),
        React.createElement("tbody", null,
          history.map(r =>
            React.createElement("tr", { key: r.id },
              React.createElement("td", {
                style: { fontWeight: 600 }
              }, fmtDate(r.date)),
              React.createElement("td", null,
                fmtTime(r.clock_in)),
              React.createElement("td", null,
                r.clock_out ? fmtTime(r.clock_out) : "—"),
              React.createElement("td", null,
                r.work_seconds
                  ? fmtDuration(r.work_seconds) : "—"),
              React.createElement("td", null,
                React.createElement("span", {
                  className: `nx-badge ${
                    r.status === "on_time"
                      ? "nx-badge-success" :
                    r.status === "late"
                      ? "nx-badge-warning" :
                    "nx-badge-danger"}`
                }, r.status?.replace("_"," ").toUpperCase())
              ),
              React.createElement("td", {
                style: { fontSize: 11 }
              }, r.distance_in ? `${r.distance_in}m` : "—")
            )
          )
        )
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 11 — LIVE FLOOR
   ══════════════════════════════════════════════════════════ */
function LiveFloorPage({ user }) {
  const [employees,    setEmployees]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter,   setDeptFilter]   = useState("all");
  const [search,       setSearch]       = useState("");
  const [depts,        setDepts]        = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [viewMode,     setViewMode]     = useState("grid");
  const lastUpdate = useRef(new Date());

  useEffect(() => {
    loadEmployees();

    /* Realtime */
    ChannelMgr.sub(
      "live_floor",
      "employees",
      null,
      () => loadEmployees()
    );

    return () => ChannelMgr.unsub("live_floor");
  }, []);

  async function loadEmployees() {
    try {
      const { data } = await withRetry(() =>
        sb.from("employees")
          .select("id, full_name, role, department, status, is_online, last_seen, avatar_url, is_suspended")
          .eq("is_active", true)
          .order("full_name")
      );
      setEmployees(data || []);
      lastUpdate.current = new Date();

      const uniqueDepts = [...new Set(
        (data || [])
          .map(e => e.department)
          .filter(Boolean)
      )];
      setDepts(uniqueDepts);
    } catch(e) {
      showToast("Failed to load floor", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(empId, newStatus) {
    if (!RC.isMgr(user)) return;
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            status:    newStatus,
            last_seen: new Date().toISOString()
          })
          .eq("id", empId)
      );
      await logAudit("CHANGE_STATUS",
        `→ ${newStatus}`, user.id, empId);
      showToast(`Status updated: ${newStatus}`, "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  async function handleInstantKick(emp) {
    if (!RC.isOwner(user)) return;
    try {
      await withRetry(() =>
        sb.from("employees")
          .update({
            is_online: false,
            status:    "offline",
            last_seen: new Date().toISOString()
          })
          .eq("id", emp.id)
      );
      await logAudit("INSTANT_KICK",
        emp.full_name, user.id, emp.id);
      showToast(`⚡ ${emp.full_name} kicked`, "warning");
      setSelected(null);
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  /* Filtered List */
  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = !search ||
        e.full_name?.toLowerCase()
          .includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        e.status === statusFilter;
      const matchDept =
        deptFilter === "all" ||
        e.department === deptFilter;
      return matchSearch && matchStatus && matchDept;
    });
  }, [employees, search, statusFilter, deptFilter]);

  /* Stats */
  const stats = useMemo(() => ({
    total:     employees.length,
    online:    employees.filter(e => e.is_online).length,
    onBreak:   employees.filter(e =>
                 e.status === "onbreak").length,
    inCall:    employees.filter(e =>
                 e.status === "incall").length,
    offline:   employees.filter(e => !e.is_online).length,
  }), [employees]);

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading live floor..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Live Floor",
      icon:  "🖥️",
      subtitle: React.createElement("span", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
        React.createElement("span", {
          className: "nx-live-dot green"
        }),
        `${stats.online} online — Last update: ${
          fmtTime(lastUpdate.current.toISOString())}`
      )
    }),

    /* Quick Stats */
    React.createElement("div", {
      className: "nx-grid-4",
      style: { marginBottom: 20 }
    },
      [
        { label:"Total",    value:stats.total,
          color:"var(--text)",    icon:"👥" },
        { label:"Online",   value:stats.online,
          color:"#22C55E",        icon:"🟢" },
        { label:"On Break", value:stats.onBreak,
          color:"#EAB308",        icon:"☕" },
        { label:"In Call",  value:stats.inCall,
          color:"#3B82F6",        icon:"📞" },
      ].map(s =>
        React.createElement("div", {
          key: s.label,
          className: "nx-stat-card nx-card-enter",
          style: { cursor: "pointer" },
          onClick: () => setStatusFilter(
            s.label === "Total"    ? "all" :
            s.label === "Online"   ? "online" :
            s.label === "On Break" ? "onbreak" :
            "incall"
          )
        },
          React.createElement("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }
          },
            React.createElement("span", {
              className: "nx-stat-label"
            }, s.label),
            React.createElement("span", {
              style: { fontSize: 18 }
            }, s.icon)
          ),
          React.createElement("div", {
            className: "nx-stat-value",
            style: { color: s.color, fontSize: 24 }
          }, s.value)
        )
      )
    ),

    /* Controls */
    React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 20,
        flexWrap: "wrap",
        alignItems: "center"
      }
    },
      React.createElement(SearchInput, {
        value: search,
        onChange: setSearch,
        placeholder: "Search employees..."
      }),

      /* Status Filter */
      React.createElement("select", {
        className: "nx-select",
        value: statusFilter,
        onChange: e => setStatusFilter(e.target.value),
        style: { width: "auto", minWidth: 130 }
      },
        React.createElement("option", { value:"all" },
          "All Statuses"),
        Object.entries(STATUS_MAP).map(([k, v]) =>
          React.createElement("option", {
            key: k, value: k
          }, `${v.icon} ${v.label}`)
        )
      ),

      /* Dept Filter */
      depts.length > 0 &&
      React.createElement("select", {
        className: "nx-select",
        value: deptFilter,
        onChange: e => setDeptFilter(e.target.value),
        style: { width: "auto", minWidth: 140 }
      },
        React.createElement("option", { value:"all" },
          "All Departments"),
        depts.map(d =>
          React.createElement("option", {
            key: d, value: d
          }, d)
        )
      ),

      /* View Mode */
      React.createElement("div", {
        style: { display: "flex", gap: 4, marginLeft: "auto" }
      },
        React.createElement("button", {
          className: `nx-btn nx-btn-icon nx-btn-sm ${
            viewMode === "grid"
              ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => setViewMode("grid"),
          title: "Grid View"
        }, "⊞"),
        React.createElement("button", {
          className: `nx-btn nx-btn-icon nx-btn-sm ${
            viewMode === "list"
              ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => setViewMode("list"),
          title: "List View"
        }, "☰")
      )
    ),

    /* Count */
    React.createElement("p", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginBottom: 16
      }
    }, `Showing ${filtered.length} of ${employees.length}`),

    /* Grid View */
    viewMode === "grid" &&
    React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon: "👥",
            title: "No employees found",
            desc: "Try adjusting your filters"
          })
        : filtered.map(emp =>
            React.createElement(LiveFloorCard, {
              key:      emp.id,
              emp,
              user,
              onSelect: () => setSelected(emp),
              onKick:   handleInstantKick,
              onStatusChange: handleStatusChange
            })
          )
    ),

    /* List View */
    viewMode === "list" &&
    React.createElement("div", { className: "nx-table-wrap" },
      React.createElement("table", { className: "nx-table" },
        React.createElement("thead", null,
          React.createElement("tr", null,
            ["Employee","Role","Status","Department",
             "Last Seen","Actions"].map(h =>
              React.createElement("th", { key: h }, h)
            )
          )
        ),
        React.createElement("tbody", null,
          filtered.length === 0
            ? React.createElement("tr", null,
                React.createElement("td", {
                  colSpan: 6,
                  style: {
                    textAlign: "center",
                    padding: "30px",
                    color: "var(--text-muted)"
                  }
                }, "No employees found")
              )
            : filtered.map(emp =>
                React.createElement("tr", { key: emp.id },
                  React.createElement("td", null,
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
                      React.createElement("span", {
                        style: {
                          fontSize: 13,
                          fontWeight: 600
                        }
                      }, emp.full_name)
                    )
                  ),
                  React.createElement("td", null,
                    React.createElement(RoleBadge,
                      { role: emp.role })
                  ),
                  React.createElement("td", null,
                    React.createElement(StatusBadge, {
                      status: emp.status || "offline"
                    })
                  ),
                  React.createElement("td", {
                    style: {
                      fontSize: 12,
                      color: "var(--text-sub)"
                    }
                  }, emp.department || "—"),
                  React.createElement("td", {
                    style: {
                      fontSize: 11,
                      color: "var(--text-muted)"
                    }
                  }, fmtRelative(emp.last_seen)),
                  React.createElement("td", null,
                    React.createElement("div", {
                      style: { display: "flex", gap: 4 }
                    },
                      React.createElement("button", {
                        className: "nx-btn nx-btn-secondary nx-btn-icon-sm",
                        onClick: () => setSelected(emp),
                        title: "View Details"
                      }, "👁️"),
                      RC.isOwner(user) && emp.is_online &&
                      React.createElement("button", {
                        className: "nx-btn nx-btn-danger nx-btn-icon-sm",
                        onClick: () => handleInstantKick(emp),
                        title: "Instant Kick"
                      }, "⚡")
                    )
                  )
                )
              )
        )
      )
    ),

    /* Employee Detail Modal */
    selected && React.createElement(EmployeeDetailModal, {
      emp:    selected,
      user,
      onClose: () => setSelected(null),
      onKick:  handleInstantKick,
      onStatusChange: handleStatusChange
    })
  );
}

/* Live Floor Card */
function LiveFloorCard({ emp, user, onSelect,
                         onKick, onStatusChange }) {
  const s = STATUS_MAP[emp.status] || STATUS_MAP.unknown;
  const isOnline = emp.is_online;

  return React.createElement("div", {
    className: `nx-employee-card nx-card-enter ${
      emp.status === "onbreak" &&
      !emp.is_online ? "nx-card-break-exceeded" : ""}`,
    style: {
      borderColor: `${s.color}33`,
      cursor: "pointer"
    },
    onClick: onSelect
  },
    /* Avatar + Status */
    React.createElement("div", {
      className: "nx-employee-card-header"
    },
      React.createElement("div", {
        style: { position: "relative" }
      },
        React.createElement(NxAvatar, {
          user: emp, size: "md"
        }),
        React.createElement("span", {
          className: `status-dot ${s.css}`,
          style: {
            position: "absolute",
            bottom: 0, right: 0,
            width: 12, height: 12,
            background: s.color,
            border: "2px solid var(--card)"
          }
        })
      ),
      React.createElement("div", {
        className: "nx-employee-card-info"
      },
        React.createElement("div", {
          className: "nx-employee-name"
        }, emp.full_name),
        React.createElement("div", {
          style: {
            fontSize: 10,
            color: RC.color[emp.role],
            marginTop: 2
          }
        }, `${RC.icon[emp.role]} ${emp.role}`)
      ),

      /* Kick Button (Owner only) */
      RC.isOwner(user) && isOnline &&
      React.createElement("button", {
        className: "nx-btn nx-btn-danger nx-btn-icon-sm",
        onClick: e => {
          e.stopPropagation();
          onKick(emp);
        },
        title: "Instant Kick"
      }, "⚡")
    ),

    /* Status Badge */
    React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    },
      React.createElement("span", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          color: s.color
        }
      },
        React.createElement("span", {
          className: `status-dot ${s.css}`,
          style: {
            background: s.color,
            width: 8, height: 8
          }
        }),
        s.label
      ),
      React.createElement("span", {
        style: {
          fontSize: 10,
          color: "var(--text-muted)"
        }
      }, fmtRelative(emp.last_seen))
    ),

    /* Dept */
    emp.department &&
    React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)",
        marginTop: 4
      }
    }, `🏢 ${emp.department}`)
  );
}

/* Employee Detail Modal */
function EmployeeDetailModal({ emp, user, onClose,
                               onKick, onStatusChange }) {
  const s = STATUS_MAP[emp.status] || STATUS_MAP.unknown;

  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal nx-modal-sm",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", { className: "nx-modal-header" },
        React.createElement("span", {
          className: "nx-modal-title"
        }, "👤 Employee Details"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", { className: "nx-modal-body" },
        /* Avatar + Name */
        React.createElement("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            marginBottom: 20
          }
        },
          React.createElement(NxAvatar, {
            user: emp, size: "xl"
          }),
          React.createElement("div", {
            style: { textAlign: "center" }
          },
            React.createElement("h3", {
              style: {
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text)"
              }
            }, emp.full_name),
            React.createElement(RoleBadge,
              { role: emp.role }),
            emp.department &&
            React.createElement("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 4
              }
            }, `🏢 ${emp.department}`)
          )
        ),

        /* Status */
        React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "center",
            marginBottom: 16
          }
        },
          React.createElement(StatusBadge,
            { status: emp.status || "offline" })
        ),

        /* Info */
        React.createElement("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8
          }
        },
          [
            { label:"Last Seen",
              value: fmtRelative(emp.last_seen) },
            { label:"Online",
              value: emp.is_online ? "Yes ✅" : "No ❌" },
          ].map(item =>
            React.createElement("div", {
              key: item.label,
              style: {
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--card2)",
                borderRadius: "var(--radius-sm)"
              }
            },
              React.createElement("span", {
                style: {
                  fontSize: 12,
                  color: "var(--text-sub)"
                }
              }, item.label),
              React.createElement("span", {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text)"
                }
              }, item.value)
            )
          )
        ),

        /* Status Change (Manager) */
        RC.isMgr(user) &&
        React.createElement("div", {
          style: { marginTop: 16 }
        },
          React.createElement("label", {
            className: "nx-label",
            style: { marginBottom: 8, display: "block" }
          }, "Change Status"),
          React.createElement("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6
            }
          },
            Object.entries(STATUS_MAP)
              .filter(([k]) =>
                !["absent","unknown"].includes(k))
              .map(([k, v]) =>
                React.createElement("button", {
                  key: k,
                  className: `nx-btn nx-btn-sm ${
                    emp.status === k
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => {
                    onStatusChange(emp.id, k);
                    onClose();
                  },
                  style: { fontSize: 11 }
                },
                  `${v.icon} ${v.label}`
                )
              )
          )
        )
      ),

      React.createElement("div", { className: "nx-modal-footer" },
        RC.isOwner(user) && emp.is_online &&
        React.createElement("button", {
          className: "nx-btn nx-btn-danger",
          onClick: () => {
            onKick(emp);
            onClose();
          }
        }, "⚡ Instant Kick"),
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onClose
        }, "Close")
      )
    )
  );
}

/* ============================================================
   screens2.js — Part B
   SEC 12: BreakManagement
   SEC 13: MyBreakSchedule
   SEC 14: MyRequests
   SEC 15: ShiftHandover
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SEC 12 — BREAK MANAGEMENT
   ══════════════════════════════════════════════════════════ */
function BreakManagementPage({ user }) {
  const [breaks,      setBreaks]      = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [config,      setConfig]      = useState({
    max_break_minutes: 15,
    break_count_day:   2
  });
  const [now,         setNow]         = useState(new Date());
  const [filter,      setFilter]      = useState("active");
  const [deptFilter,  setDeptFilter]  = useState("all");
  const [depts,       setDepts]       = useState([]);

  /* تحديث الوقت كل ثانية */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadConfig();
    loadData();
    ChannelMgr.sub("break_mgmt", "breaks", null, loadData);
    return () => ChannelMgr.unsub("break_mgmt");
  }, []);

  async function loadConfig() {
    try {
      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", ["max_break_minutes","break_count_day"])
      );
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      setConfig({
        max_break_minutes: parseInt(map.max_break_minutes) || 15,
        break_count_day:   parseInt(map.break_count_day)   || 2
      });
    } catch(e) {}
  }

  async function loadData() {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [breaksRes, empsRes] = await Promise.all([
        withRetry(() =>
          sb.from("breaks")
            .select(`
              *,
              employee:employees!breaks_employee_id_fkey(
                id, full_name, role, department, avatar_url
              )
            `)
            .eq("date", today)
            .order("start_time", { ascending: false })
        ),
        withRetry(() =>
          sb.from("employees")
            .select("id, full_name, role, department, status, avatar_url")
            .eq("is_active", true)
            .eq("is_online", true)
            .order("full_name")
        )
      ]);

      setBreaks(breaksRes.data || []);
      setEmployees(empsRes.data || []);

      const uniqueDepts = [...new Set(
        (empsRes.data || [])
          .map(e => e.department)
          .filter(Boolean)
      )];
      setDepts(uniqueDepts);
    } catch(e) {
      showToast("Failed to load breaks", "error");
    } finally {
      setLoading(false);
    }
  }

  /* منح بريك */
  async function grantBreak(empId, empName) {
    try {
      const today = new Date().toISOString().split("T")[0];

      /* عدد البريكات اليوم */
      const todayBreaks = breaks.filter(
        b => b.employee_id === empId
      );
      if (todayBreaks.length >= config.break_count_day) {
        showToast(
          `${empName} has used all ${config.break_count_day} breaks today`,
          "warning"
        );
        return;
      }

      /* هل هناك بريك مفتوح؟ */
      const openBreak = todayBreaks.find(b => !b.end_time);
      if (openBreak) {
        showToast(`${empName} is already on break`, "warning");
        return;
      }

      const now = new Date().toISOString();

      await withRetry(() =>
        sb.from("breaks").insert({
          employee_id:  empId,
          date:         today,
          start_time:   now,
          end_time:     null,
          duration_minutes: null,
          granted_by:   user.id,
          status:       "active",
          created_at:   now
        })
      );

      /* تحديث حالة الموظف */
      await withRetry(() =>
        sb.from("employees")
          .update({ status: "onbreak" })
          .eq("id", empId)
      );

      await logAudit("GRANT_BREAK", empName, user.id, empId);
      showToast(`☕ Break granted to ${empName}`, "success");
    } catch(e) {
      showToast("Failed to grant break", "error");
    }
  }

  /* إنهاء بريك */
  async function endBreak(breakRecord) {
    try {
      const now      = new Date();
      const start    = new Date(breakRecord.start_time);
      const duration = Math.floor((now - start) / 60000);
      const exceeded = duration > config.max_break_minutes;

      await withRetry(() =>
        sb.from("breaks")
          .update({
            end_time:         now.toISOString(),
            duration_minutes: duration,
            status:           exceeded ? "exceeded" : "completed"
          })
          .eq("id", breakRecord.id)
      );

      /* إعادة حالة الموظف */
      await withRetry(() =>
        sb.from("employees")
          .update({ status: "online" })
          .eq("id", breakRecord.employee_id)
      );

      await logAudit(
        "END_BREAK",
        `${duration} min${exceeded ? " (EXCEEDED)" : ""}`,
        user.id,
        breakRecord.employee_id
      );

      if (exceeded) {
        showToast(
          `⚠️ Break exceeded by ${duration - config.max_break_minutes} min`,
          "warning"
        );
      } else {
        showToast("✅ Break ended", "success");
      }
    } catch(e) {
      showToast("Failed to end break", "error");
    }
  }

  /* حساب مدة البريك الحالية */
  function getBreakDuration(startTime) {
    return Math.floor(
      (now - new Date(startTime)) / 1000
    );
  }

  /* فلترة البريكات */
  const filteredBreaks = useMemo(() => {
    let list = breaks;
    if (filter === "active") {
      list = list.filter(b => !b.end_time);
    } else if (filter === "exceeded") {
      list = list.filter(b => b.status === "exceeded");
    } else if (filter === "completed") {
      list = list.filter(b => b.end_time);
    }
    if (deptFilter !== "all") {
      list = list.filter(b =>
        b.employee?.department === deptFilter
      );
    }
    return list;
  }, [breaks, filter, deptFilter]);

  /* الموظفون المتاحون للبريك */
  const availableEmps = useMemo(() =>
    employees.filter(e => {
      if (e.status === "onbreak") return false;
      const todayBreaks = breaks.filter(
        b => b.employee_id === e.id
      );
      return todayBreaks.length < config.break_count_day;
    }),
  [employees, breaks, config]);

  /* إحصائيات */
  const stats = useMemo(() => ({
    active:    breaks.filter(b => !b.end_time).length,
    exceeded:  breaks.filter(b => b.status === "exceeded").length,
    completed: breaks.filter(b => b.end_time).length,
    total:     breaks.length
  }), [breaks]);

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading break management..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Break Management",
      icon:  "☕",
      subtitle: `Max ${config.max_break_minutes} min × ${config.break_count_day}/day`
    }),

    /* Stats */
    React.createElement("div", {
      className: "nx-grid-4",
      style: { marginBottom: 20 }
    },
      [
        { label:"On Break",  value:stats.active,
          color:"#EAB308", icon:"☕" },
        { label:"Exceeded",  value:stats.exceeded,
          color:"#EF4444", icon:"⚠️" },
        { label:"Completed", value:stats.completed,
          color:"#22C55E", icon:"✅" },
        { label:"Total",     value:stats.total,
          color:"var(--primary)", icon:"📊" },
      ].map(s =>
        React.createElement("div", {
          key: s.label,
          className: "nx-stat-card"
        },
          React.createElement("div", {
            style: {
              display:"flex", justifyContent:"space-between"
            }
          },
            React.createElement("span", {
              className: "nx-stat-label"
            }, s.label),
            React.createElement("span", {
              style: { fontSize: 18 }
            }, s.icon)
          ),
          React.createElement("div", {
            className: "nx-stat-value",
            style: { color: s.color, fontSize: 24 }
          }, s.value)
        )
      )
    ),

    React.createElement("div", {
      className: "nx-grid-2",
      style: { gap: 20 }
    },

      /* Grant Break Panel */
      React.createElement("div", { className: "nx-card" },
        React.createElement(SectionHeader, {
          title: `✋ Grant Break (${availableEmps.length} available)`
        }),
        availableEmps.length === 0
          ? React.createElement("div", {
              style: {
                textAlign: "center",
                padding: "20px",
                color: "var(--text-muted)",
                fontSize: 13
              }
            }, "No employees available for break")
          : React.createElement("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 12,
                maxHeight: 320,
                overflowY: "auto"
              }
            },
              availableEmps
                .filter(e => deptFilter === "all" ||
                  e.department === deptFilter)
                .map(emp => {
                  const todayCount = breaks.filter(
                    b => b.employee_id === emp.id
                  ).length;
                  return React.createElement("div", {
                    key: emp.id,
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--card2)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)"
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
                            color: "var(--text-muted)"
                          }
                        },
                          `${todayCount}/${config.break_count_day} used`
                        )
                      )
                    ),
                    React.createElement("button", {
                      className: "nx-btn nx-btn-primary nx-btn-sm",
                      onClick: () => grantBreak(
                        emp.id, emp.full_name
                      )
                    }, "☕ Grant")
                  );
                })
            )
      ),

      /* Active Breaks Panel */
      React.createElement("div", { className: "nx-card" },
        React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12
          }
        },
          React.createElement("h3", {
            className: "nx-section-title"
          }, "⏱️ Active Breaks"),
          React.createElement("div", {
            style: { display: "flex", gap: 6 }
          },
            ["all","active","exceeded","completed"].map(f =>
              React.createElement("button", {
                key: f,
                className: `nx-btn nx-btn-sm ${
                  filter === f
                    ? "nx-btn-primary"
                    : "nx-btn-secondary"}`,
                onClick: () => setFilter(f),
                style: { fontSize: 10, padding: "4px 8px" }
              },
                f.charAt(0).toUpperCase() + f.slice(1)
              )
            )
          )
        ),

        filteredBreaks.length === 0
          ? React.createElement("div", {
              style: {
                textAlign: "center",
                padding: "20px",
                color: "var(--text-muted)",
                fontSize: 13
              }
            }, "No breaks to show")
          : React.createElement("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 320,
                overflowY: "auto"
              }
            },
              filteredBreaks.map(b => {
                const secs     = b.end_time
                  ? (b.duration_minutes || 0) * 60
                  : getBreakDuration(b.start_time);
                const exceeded = !b.end_time &&
                  secs > config.max_break_minutes * 60;
                const mins     = Math.floor(secs / 60);

                return React.createElement("div", {
                  key: b.id,
                  className: exceeded
                    ? "nx-card-break-exceeded" : "",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: exceeded
                      ? "rgba(248,81,73,0.08)"
                      : "var(--card2)",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${exceeded
                      ? "rgba(248,81,73,0.30)"
                      : "var(--border)"}`
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
                      user: b.employee, size: "xs"
                    }),
                    React.createElement("div", null,
                      React.createElement("div", {
                        style: {
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text)"
                        }
                      }, b.employee?.full_name || "—"),
                      React.createElement("div", {
                        style: {
                          fontSize: 10,
                          color: "var(--text-muted)"
                        }
                      }, fmtTime(b.start_time))
                    )
                  ),

                  React.createElement("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }
                  },
                    React.createElement(TimerDisplay, {
                      seconds: secs,
                      exceeded: exceeded
                    }),
                    !b.end_time &&
                    React.createElement("button", {
                      className: "nx-btn nx-btn-sm nx-btn-secondary",
                      onClick: () => endBreak(b)
                    }, "End")
                  )
                );
              })
            )
      )
    ),

    /* Dept Filter */
    depts.length > 0 &&
    React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 16,
        flexWrap: "wrap"
      }
    },
      React.createElement("button", {
        className: `nx-btn nx-btn-sm ${
          deptFilter === "all"
            ? "nx-btn-primary" : "nx-btn-secondary"}`,
        onClick: () => setDeptFilter("all")
      }, "All Depts"),
      depts.map(d =>
        React.createElement("button", {
          key: d,
          className: `nx-btn nx-btn-sm ${
            deptFilter === d
              ? "nx-btn-primary" : "nx-btn-secondary"}`,
          onClick: () => setDeptFilter(d)
        }, d)
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 13 — MY BREAK SCHEDULE
   ══════════════════════════════════════════════════════════ */
function MyBreakSchedulePage({ user }) {
  const [breaks,   setBreaks]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [config,   setConfig]   = useState({
    max_break_minutes: 15,
    break_count_day:   2
  });
  const [now,      setNow]      = useState(new Date());
  const [activeBreak, setActiveBreak] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadConfig();
    loadMyBreaks();
    ChannelMgr.sub(
      `my_breaks_${user.id}`,
      "breaks",
      `employee_id=eq.${user.id}`,
      loadMyBreaks
    );
    return () =>
      ChannelMgr.unsub(`my_breaks_${user.id}`);
  }, []);

  async function loadConfig() {
    try {
      const { data } = await withRetry(() =>
        sb.from("system_settings")
          .select("key, value")
          .in("key", ["max_break_minutes","break_count_day"])
      );
      const map = {};
      (data || []).forEach(r => { map[r.key] = r.value; });
      setConfig({
        max_break_minutes: parseInt(map.max_break_minutes) || 15,
        break_count_day:   parseInt(map.break_count_day)   || 2
      });
    } catch(e) {}
  }

  async function loadMyBreaks() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await withRetry(() =>
        sb.from("breaks")
          .select("*")
          .eq("employee_id", user.id)
          .eq("date", today)
          .order("start_time", { ascending: false })
      );
      setBreaks(data || []);
      const open = (data || []).find(b => !b.end_time);
      setActiveBreak(open || null);
    } catch(e) {} finally {
      setLoading(false);
    }
  }

  const todayCount    = breaks.length;
  const remaining     = config.break_count_day - todayCount;
  const canTakeBreak  = remaining > 0 && !activeBreak;

  const currentSecs   = activeBreak
    ? Math.floor(
        (now - new Date(activeBreak.start_time)) / 1000
      )
    : 0;

  const maxSecs       = config.max_break_minutes * 60;
  const remainingSecs = Math.max(0, maxSecs - currentSecs);
  const exceeded      = activeBreak && currentSecs > maxSecs;

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading your breaks..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "My Break Schedule",
      icon:  "☕",
      subtitle: `${config.max_break_minutes} min max × ${config.break_count_day} per day`
    }),

    /* Break Status Card */
    React.createElement("div", {
      className: "nx-card",
      style: { textAlign: "center", padding: "32px 24px" }
    },
      activeBreak
        ? React.createElement("div", null,
            React.createElement("div", {
              style: { fontSize: 48, marginBottom: 12 }
            }, exceeded ? "⚠️" : "☕"),
            React.createElement("h2", {
              style: {
                fontSize: 18,
                fontWeight: 800,
                color: exceeded
                  ? "var(--danger)" : "var(--warning)",
                marginBottom: 8
              }
            }, exceeded ? "Break Exceeded!" : "On Break"),
            React.createElement("div", {
              style: {
                fontSize: 40,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                marginBottom: 8
              }
            },
              React.createElement(TimerDisplay, {
                seconds:  currentSecs,
                exceeded: exceeded
              })
            ),
            !exceeded &&
            React.createElement("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 16
              }
            },
              `${Math.floor(remainingSecs/60)}:${
                String(remainingSecs%60).padStart(2,"0")
              } remaining`
            ),
            exceeded &&
            React.createElement("div", {
              style: {
                fontSize: 13,
                color: "var(--danger)",
                fontWeight: 600,
                marginBottom: 16,
                animation:
                  "criticalBlink 0.8s ease-in-out infinite"
              }
            },
              `⚠️ ${Math.floor(
                (currentSecs - maxSecs) / 60
              )} min over limit!`
            ),
            React.createElement("div", {
              className: "nx-progress-bar",
              style: { maxWidth: 300, margin: "0 auto 16px" }
            },
              React.createElement("div", {
                className: "nx-progress-fill",
                style: {
                  width: `${Math.min(
                    100,
                    (currentSecs / maxSecs) * 100
                  )}%`,
                  background: exceeded
                    ? "var(--danger)"
                    : currentSecs > maxSecs * 0.8
                    ? "var(--warning)"
                    : "var(--primary)",
                  transition: "width 1s linear"
                }
              })
            ),
            React.createElement("p", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 16
              }
            }, "Your break is being tracked. Please return on time.")
          )
        : React.createElement("div", null,
            React.createElement("div", {
              style: { fontSize: 48, marginBottom: 12 }
            },
              canTakeBreak ? "☕" : "🚫"
            ),
            React.createElement("h2", {
              style: {
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 8
              }
            },
              canTakeBreak
                ? "Ready for Break"
                : "No Breaks Remaining"
            ),
            React.createElement("p", {
              style: {
                fontSize: 13,
                color: "var(--text-sub)",
                marginBottom: 16
              }
            },
              canTakeBreak
                ? `You have ${remaining} break(s) remaining today`
                : `You've used all ${config.break_count_day} breaks today`
            )
          ),

      /* Break Indicators */
      React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: 16
        }
      },
        Array.from({ length: config.break_count_day },
          (_, i) => {
            const b = breaks[i];
            return React.createElement("div", {
              key: i,
              style: {
                width: 40, height: 40,
                borderRadius: "50%",
                background: b
                  ? b.status === "exceeded"
                    ? "rgba(248,81,73,0.20)"
                    : "rgba(63,185,80,0.20)"
                  : "var(--card2)",
                border: `2px solid ${b
                  ? b.status === "exceeded"
                    ? "var(--danger)"
                    : "var(--success)"
                  : "var(--border)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16
              }
            },
              b ? (b.status === "exceeded" ? "⚠️" : "✅") : "☕"
            );
          }
        )
      )
    ),

    /* Today's Break History */
    breaks.length > 0 &&
    React.createElement("div", {
      className: "nx-card",
      style: { marginTop: 20 }
    },
      React.createElement(SectionHeader, {
        title: "📋 Today's Breaks"
      }),
      React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 12
        }
      },
        breaks.map((b, i) =>
          React.createElement("div", {
            key: b.id,
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "var(--card2)",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${
                b.status === "exceeded"
                  ? "rgba(248,81,73,0.25)"
                  : "var(--border)"}`
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
                style: {
                  width: 24, height: 24,
                  borderRadius: "50%",
                  background: "var(--card3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-sub)"
                }
              }, i + 1),
              React.createElement("div", null,
                React.createElement("div", {
                  style: {
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text)"
                  }
                },
                  `${fmtTime(b.start_time)} → ${
                    b.end_time
                      ? fmtTime(b.end_time) : "Active"}`
                ),
                b.granted_by &&
                React.createElement("div", {
                  style: {
                    fontSize: 10,
                    color: "var(--text-muted)"
                  }
                }, "Granted by manager")
              )
            ),
            React.createElement("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8
              }
            },
              b.duration_minutes &&
              React.createElement("span", {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: b.status === "exceeded"
                    ? "var(--danger)" : "var(--success)"
                }
              }, `${b.duration_minutes} min`),
              React.createElement("span", {
                className: `nx-badge ${
                  b.status === "exceeded"
                    ? "nx-badge-danger"
                    : b.end_time
                    ? "nx-badge-success"
                    : "nx-badge-warning"}`
              },
                b.status === "exceeded" ? "Exceeded" :
                b.end_time ? "Done" : "Active"
              )
            )
          )
        )
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 14 — MY REQUESTS
   ══════════════════════════════════════════════════════════ */
function MyRequestsPage({ user }) {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [allReqs,    setAllReqs]    = useState([]);
  const isMgr = RC.isMgr(user);

  const REQUEST_TYPES = [
    { id:"leave",      label:"Leave",       icon:"✈️"  },
    { id:"wfh",        label:"WFH",         icon:"🏠" },
    { id:"overtime",   label:"Overtime",    icon:"⏰" },
    { id:"swap",       label:"Shift Swap",  icon:"🔄" },
    { id:"permission", label:"Permission",  icon:"📝" },
    { id:"other",      label:"Other",       icon:"📋" },
  ];

  useEffect(() => {
    loadRequests();
    ChannelMgr.sub(
      "requests",
      "requests",
      isMgr ? null : `employee_id=eq.${user.id}`,
      loadRequests
    );
    return () => ChannelMgr.unsub("requests");
  }, []);

  async function loadRequests() {
    try {
      let q = sb.from("requests")
        .select(`
          *,
          employee:employees!requests_employee_id_fkey(
            id, full_name, role, avatar_url
          ),
          reviewer:employees!requests_reviewed_by_fkey(
            id, full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (!isMgr) {
        q = q.eq("employee_id", user.id);
      }

      const { data } = await withRetry(() => q);
      setRequests(data || []);
      setAllReqs(data || []);
    } catch(e) {
      showToast("Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(reqId, status, note = "") {
    try {
      await withRetry(() =>
        sb.from("requests")
          .update({
            status,
            review_note:  note,
            reviewed_by:  user.id,
            reviewed_at:  new Date().toISOString()
          })
          .eq("id", reqId)
      );

      /* إشعار للموظف */
      const req = requests.find(r => r.id === reqId);
      if (req) {
        await sendNotification(
          req.employee_id,
          "request_update",
          `Request ${status}`,
          `Your ${req.type} request has been ${status}`,
          "My Requests"
        );
      }

      await logAudit(
        `REQUEST_${status.toUpperCase()}`,
        `Request #${reqId}`,
        user.id
      );
      showToast(`Request ${status}`, "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter(r => r.status === filter);
  }, [requests, filter]);

  const pendingCount = requests.filter(
    r => r.status === "pending"
  ).length;

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading requests..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "My Requests",
      icon:  "📤",
      subtitle: pendingCount > 0
        ? `${pendingCount} pending` : undefined,
      actions: React.createElement("button", {
        className: "nx-btn nx-btn-primary",
        onClick: () => setShowCreate(true)
      }, "+ New Request")
    }),

    /* Filter Tabs */
    React.createElement(Tabs, {
      tabs: [
        { id:"all",      label:"All" },
        { id:"pending",  label:`Pending (${pendingCount})` },
        { id:"approved", label:"Approved" },
        { id:"rejected", label:"Rejected" },
      ],
      active: filter,
      onChange: setFilter
    }),

    React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 16
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon: "📤",
            title: "No requests",
            desc: "Submit a new request using the button above"
          })
        : filtered.map(req => {
            const rType = REQUEST_TYPES.find(
              t => t.id === req.type
            ) || REQUEST_TYPES[5];

            return React.createElement("div", {
              key: req.id,
              className: "nx-card nx-card-enter"
            },
              React.createElement("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12
                }
              },
                React.createElement("div", {
                  style: {
                    display: "flex",
                    gap: 10,
                    flex: 1
                  }
                },
                  React.createElement("span", {
                    style: { fontSize: 24, flexShrink: 0 }
                  }, rType.icon),
                  React.createElement("div", {
                    style: { flex: 1 }
                  },
                    React.createElement("div", {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 4
                      }
                    },
                      isMgr && req.employee &&
                      React.createElement("span", {
                        style: {
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text)"
                        }
                      }, req.employee.full_name),
                      React.createElement("span", {
                        className: "nx-badge nx-badge-neutral"
                      }, rType.label),
                      React.createElement("span", {
                        className: `nx-badge ${
                          req.status === "approved"
                            ? "nx-badge-success"
                            : req.status === "rejected"
                            ? "nx-badge-danger"
                            : "nx-badge-warning"}`
                      }, req.status?.toUpperCase())
                    ),
                    React.createElement("p", {
                      style: {
                        fontSize: 13,
                        color: "var(--text-sub)",
                        lineHeight: 1.5
                      }
                    }, req.description),
                    req.date_from &&
                    React.createElement("div", {
                      style: {
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4
                      }
                    },
                      `📅 ${fmtDate(req.date_from)}${
                        req.date_to &&
                        req.date_to !== req.date_from
                          ? ` → ${fmtDate(req.date_to)}`
                          : ""}`
                    ),
                    req.review_note &&
                    React.createElement("div", {
                      style: {
                        fontSize: 11,
                        color: req.status === "approved"
                          ? "var(--success)" : "var(--danger)",
                        marginTop: 4,
                        fontStyle: "italic"
                      }
                    }, `💬 ${req.review_note}`)
                  )
                ),
                React.createElement("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)",
                    flexShrink: 0
                  }
                }, fmtRelative(req.created_at))
              ),

              /* Manager Actions */
              isMgr && req.status === "pending" &&
              React.createElement("div", {
                style: {
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)"
                }
              },
                React.createElement("button", {
                  className: "nx-btn nx-btn-success nx-btn-sm",
                  onClick: () => handleReview(
                    req.id, "approved"
                  )
                }, "✅ Approve"),
                React.createElement("button", {
                  className: "nx-btn nx-btn-danger nx-btn-sm",
                  onClick: () => handleReview(
                    req.id, "rejected"
                  )
                }, "❌ Reject")
              )
            );
          })
    ),

    /* Create Request Modal */
    showCreate && React.createElement(CreateRequestModal, {
      user,
      requestTypes: REQUEST_TYPES,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadRequests();
        showToast("Request submitted!", "success");
      }
    })
  );
}

/* Create Request Modal */
function CreateRequestModal({
  user, requestTypes, onClose, onCreated
}) {
  const [form, setForm] = useState({
    type:        "leave",
    description: "",
    date_from:   new Date().toISOString().split("T")[0],
    date_to:     new Date().toISOString().split("T")[0],
    priority:    "medium"
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.description.trim()) {
      showToast("Description required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("requests").insert({
          employee_id:  user.id,
          type:         form.type,
          description:  form.description.trim(),
          date_from:    form.date_from || null,
          date_to:      form.date_to   || null,
          priority:     form.priority,
          status:       "pending",
          created_at:   new Date().toISOString()
        })
      );

      /* إشعار للمديرين */
      const { data: mgrs } = await withRetry(() =>
        sb.from("employees")
          .select("id")
          .in("role", ["Team Leader","Shift Leader","Owner"])
          .eq("is_active", true)
      );

      for (const mgr of (mgrs || [])) {
        await sendNotification(
          mgr.id,
          "new_request",
          "New Request",
          `${user.full_name} submitted a ${form.type} request`,
          "My Requests"
        );
      }

      await logAudit("SUBMIT_REQUEST",
        form.type, user.id);
      onCreated();
    } catch(e) {
      showToast("Failed: " + e.message, "error");
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
      React.createElement("div", {
        className: "nx-modal-header"
      },
        React.createElement("span", {
          className: "nx-modal-title"
        }, "📤 New Request"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", {
        className: "nx-modal-body"
      },
        React.createElement("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 14
          }
        },
          /* Type */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label"
            }, "Request Type"),
            React.createElement("div", {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 6
              }
            },
              requestTypes.map(t =>
                React.createElement("button", {
                  key: t.id,
                  className: `nx-btn nx-btn-sm ${
                    form.type === t.id
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(p => ({
                    ...p, type: t.id
                  }))
                }, `${t.icon} ${t.label}`)
              )
            )
          ),

          /* Description */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label nx-label-required"
            }, "Description"),
            React.createElement("textarea", {
              className: "nx-textarea",
              placeholder: "Describe your request...",
              value: form.description,
              rows: 4,
              onChange: e => setForm(p => ({
                ...p, description: e.target.value
              }))
            })
          ),

          /* Dates */
          React.createElement("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10
            }
          },
            React.createElement("div", {
              className: "nx-form-group"
            },
              React.createElement("label", {
                className: "nx-label"
              }, "From Date"),
              React.createElement("input", {
                type: "date",
                className: "nx-input",
                value: form.date_from,
                onChange: e => setForm(p => ({
                  ...p, date_from: e.target.value
                }))
              })
            ),
            React.createElement("div", {
              className: "nx-form-group"
            },
              React.createElement("label", {
                className: "nx-label"
              }, "To Date"),
              React.createElement("input", {
                type: "date",
                className: "nx-input",
                value: form.date_to,
                onChange: e => setForm(p => ({
                  ...p, date_to: e.target.value
                }))
              })
            )
          ),

          /* Priority */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label"
            }, "Priority"),
            React.createElement("div", {
              style: { display: "flex", gap: 8 }
            },
              ["low","medium","high"].map(p =>
                React.createElement("button", {
                  key: p,
                  className: `nx-btn nx-btn-sm ${
                    form.priority === p
                      ? "nx-btn-primary"
                      : "nx-btn-secondary"}`,
                  onClick: () => setForm(prev => ({
                    ...prev, priority: p
                  }))
                },
                  p === "low"    ? "🟢 Low" :
                  p === "medium" ? "🟡 Medium" :
                  "🔴 High"
                )
              )
            )
          )
        )
      ),

      React.createElement("div", {
        className: "nx-modal-footer"
      },
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
          : "Submit Request")
      )
    )
  );
}

/* ══════════════════════════════════════════════════════════
   SEC 15 — SHIFT HANDOVER
   ══════════════════════════════════════════════════════════ */
function ShiftHandoverPage({ user }) {
  const [handovers,   setHandovers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [filter,      setFilter]      = useState("all");

  useEffect(() => {
    loadHandovers();
    ChannelMgr.sub(
      "handovers",
      "shift_handovers",
      null,
      loadHandovers
    );
    return () => ChannelMgr.unsub("handovers");
  }, []);

  async function loadHandovers() {
    try {
      const { data } = await withRetry(() =>
        sb.from("shift_handovers")
          .select(`
            *,
            from_emp:employees!shift_handovers_from_id_fkey(
              id, full_name, role, avatar_url
            ),
            to_emp:employees!shift_handovers_to_id_fkey(
              id, full_name, role, avatar_url
            )
          `)
          .order("created_at", { ascending: false })
          .limit(50)
      );
      setHandovers(data || []);
    } catch(e) {
      showToast("Failed to load handovers", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(id) {
    try {
      await withRetry(() =>
        sb.from("shift_handovers")
          .update({
            acknowledged:    true,
            acknowledged_by: user.id,
            acknowledged_at: new Date().toISOString()
          })
          .eq("id", id)
      );
      await logAudit("ACK_HANDOVER",
        `Handover #${id}`, user.id);
      showToast("✅ Handover acknowledged", "success");
    } catch(e) {
      showToast("Failed", "error");
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return handovers;
    if (filter === "mine") {
      return handovers.filter(h =>
        h.from_id === user.id || h.to_id === user.id
      );
    }
    if (filter === "pending") {
      return handovers.filter(h => !h.acknowledged);
    }
    return handovers;
  }, [handovers, filter, user.id]);

  if (loading) return React.createElement(LoadingPage,
    { message: "Loading handovers..." });

  return React.createElement("div", {
    className: "nx-page-enter"
  },
    React.createElement(PageHeader, {
      title: "Shift Handover",
      icon:  "🔄",
      subtitle: `${handovers.filter(h => !h.acknowledged).length} pending acknowledgment`,
      actions: React.createElement("button", {
        className: "nx-btn nx-btn-primary",
        onClick: () => setShowCreate(true)
      }, "+ New Handover")
    }),

    /* Filter */
    React.createElement(Tabs, {
      tabs: [
        { id:"all",     label:"All" },
        { id:"mine",    label:"Mine" },
        { id:"pending", label:"Pending" },
      ],
      active: filter,
      onChange: setFilter
    }),

    React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 16
      }
    },
      filtered.length === 0
        ? React.createElement(EmptyState, {
            icon: "🔄",
            title: "No handovers",
            desc: "Create a new shift handover above"
          })
        : filtered.map(h =>
            React.createElement("div", {
              key: h.id,
              className: "nx-card nx-card-enter",
              style: {
                borderLeft: `3px solid ${
                  h.acknowledged
                    ? "var(--success)"
                    : "var(--warning)"}`
              }
            },
              /* Header */
              React.createElement("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12
                }
              },
                React.createElement("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap"
                  }
                },
                  React.createElement(NxAvatar, {
                    user: h.from_emp, size: "xs"
                  }),
                  React.createElement("span", {
                    style: {
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)"
                    }
                  }, h.from_emp?.full_name || "—"),
                  React.createElement("span", {
                    style: {
                      fontSize: 16,
                      color: "var(--text-muted)"
                    }
                  }, "→"),
                  React.createElement(NxAvatar, {
                    user: h.to_emp, size: "xs"
                  }),
                  React.createElement("span", {
                    style: {
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)"
                    }
                  }, h.to_emp?.full_name || "—")
                ),
                React.createElement("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }
                },
                  React.createElement("span", {
                    className: `nx-badge ${
                      h.acknowledged
                        ? "nx-badge-success"
                        : "nx-badge-warning"}`
                  },
                    h.acknowledged ? "✅ Acked" : "⏳ Pending"
                  ),
                  React.createElement("span", {
                    style: {
                      fontSize: 11,
                      color: "var(--text-muted)"
                    }
                  }, fmtRelative(h.created_at))
                )
              ),

              /* Content Preview */
              React.createElement("p", {
                style: {
                  fontSize: 13,
                  color: "var(--text-sub)",
                  lineHeight: 1.6,
                  marginBottom: 8,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical"
                }
              }, h.notes || "No notes"),

              /* Priority */
              h.priority &&
              React.createElement(PriorityBadge, {
                priority: h.priority
              }),

              /* Actions */
              React.createElement("div", {
                style: {
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)"
                }
              },
                React.createElement("button", {
                  className: "nx-btn nx-btn-secondary nx-btn-sm",
                  onClick: () => setSelected(h)
                }, "👁️ View Details"),
                !h.acknowledged &&
                h.to_id === user.id &&
                React.createElement("button", {
                  className: "nx-btn nx-btn-success nx-btn-sm",
                  onClick: () => handleAcknowledge(h.id)
                }, "✅ Acknowledge")
              )
            )
          )
    ),

    /* Create Handover Modal */
    showCreate && React.createElement(CreateHandoverModal, {
      user,
      onClose: () => setShowCreate(false),
      onCreated: () => {
        setShowCreate(false);
        loadHandovers();
        showToast("Handover created!", "success");
      }
    }),

    /* View Handover Modal */
    selected && React.createElement(ViewHandoverModal, {
      handover: selected,
      user,
      onClose: () => setSelected(null),
      onAck: () => {
        handleAcknowledge(selected.id);
        setSelected(null);
      }
    })
  );
}

/* Create Handover Modal */
function CreateHandoverModal({ user, onClose, onCreated }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    to_id:    "",
    shift:    "morning",
    priority: "medium",
    notes:    "",
    pending_cases: "",
    important_info: ""
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
    if (!form.to_id || !form.notes.trim()) {
      showToast("Recipient and notes required", "warning");
      return;
    }
    setSaving(true);
    try {
      await withRetry(() =>
        sb.from("shift_handovers").insert({
          from_id:        user.id,
          to_id:          form.to_id,
          shift:          form.shift,
          priority:       form.priority,
          notes:          form.notes.trim(),
          pending_cases:  form.pending_cases.trim() || null,
          important_info: form.important_info.trim() || null,
          acknowledged:   false,
          created_at:     new Date().toISOString()
        })
      );

      await sendNotification(
        form.to_id,
        "handover",
        "Shift Handover",
        `${user.full_name} sent you a shift handover`,
        "Shift Handover"
      );

      await logAudit("CREATE_HANDOVER",
        `To: ${form.to_id}`, user.id);
      onCreated();
    } catch(e) {
      showToast("Failed: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal nx-modal-lg",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", {
        className: "nx-modal-header"
      },
        React.createElement("span", {
          className: "nx-modal-title"
        }, "🔄 New Shift Handover"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", {
        className: "nx-modal-body"
      },
        React.createElement("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 14
          }
        },
          /* To */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label nx-label-required"
            }, "Hand Over To"),
            React.createElement("select", {
              className: "nx-select",
              value: form.to_id,
              onChange: e => setForm(p => ({
                ...p, to_id: e.target.value
              }))
            },
              React.createElement("option", { value: "" },
                "Select employee..."),
              employees.map(e =>
                React.createElement("option", {
                  key: e.id, value: e.id
                }, `${RC.icon[e.role]} ${e.full_name}`)
              )
            )
          ),

          /* Shift + Priority */
          React.createElement("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10
            }
          },
            React.createElement("div", {
              className: "nx-form-group"
            },
              React.createElement("label", {
                className: "nx-label"
              }, "Shift"),
              React.createElement("select", {
                className: "nx-select",
                value: form.shift,
                onChange: e => setForm(p => ({
                  ...p, shift: e.target.value
                }))
              },
                ["morning","evening","night"].map(s =>
                  React.createElement("option", {
                    key: s, value: s
                  },
                    s.charAt(0).toUpperCase() + s.slice(1)
                  )
                )
              )
            ),
            React.createElement("div", {
              className: "nx-form-group"
            },
              React.createElement("label", {
                className: "nx-label"
              }, "Priority"),
              React.createElement("select", {
                className: "nx-select",
                value: form.priority,
                onChange: e => setForm(p => ({
                  ...p, priority: e.target.value
                }))
              },
                ["low","medium","high","critical"].map(p =>
                  React.createElement("option", {
                    key: p, value: p
                  },
                    p.charAt(0).toUpperCase() + p.slice(1)
                  )
                )
              )
            )
          ),

          /* Notes */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label nx-label-required"
            }, "Handover Notes"),
            React.createElement("textarea", {
              className: "nx-textarea",
              placeholder: "General shift notes...",
              value: form.notes,
              rows: 4,
              onChange: e => setForm(p => ({
                ...p, notes: e.target.value
              }))
            })
          ),

          /* Pending Cases */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label"
            }, "Pending Cases"),
            React.createElement("textarea", {
              className: "nx-textarea",
              placeholder: "List any pending cases...",
              value: form.pending_cases,
              rows: 3,
              onChange: e => setForm(p => ({
                ...p, pending_cases: e.target.value
              }))
            })
          ),

          /* Important Info */
          React.createElement("div", {
            className: "nx-form-group"
          },
            React.createElement("label", {
              className: "nx-label"
            }, "Important Information"),
            React.createElement("textarea", {
              className: "nx-textarea",
              placeholder: "Anything important to note...",
              value: form.important_info,
              rows: 3,
              onChange: e => setForm(p => ({
                ...p, important_info: e.target.value
              }))
            })
          )
        )
      ),

      React.createElement("div", {
        className: "nx-modal-footer"
      },
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
          : "🔄 Submit Handover")
      )
    )
  );
}

/* View Handover Modal */
function ViewHandoverModal({ handover: h, user, onClose, onAck }) {
  return React.createElement("div", {
    className: "nx-modal-backdrop",
    onClick: onClose
  },
    React.createElement("div", {
      className: "nx-modal nx-modal-lg",
      onClick: e => e.stopPropagation()
    },
      React.createElement("div", {
        className: "nx-modal-header"
      },
        React.createElement("span", {
          className: "nx-modal-title"
        }, "🔄 Shift Handover Details"),
        React.createElement("button", {
          className: "nx-btn nx-btn-ghost nx-btn-icon",
          onClick: onClose
        }, "✕")
      ),

      React.createElement("div", {
        className: "nx-modal-body"
      },
        /* From → To */
        React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginBottom: 20,
            padding: "16px",
            background: "var(--card2)",
            borderRadius: "var(--radius)"
          }
        },
          React.createElement("div", {
            style: { textAlign: "center" }
          },
            React.createElement(NxAvatar, {
              user: h.from_emp, size: "md"
            }),
            React.createElement("div", {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text)",
                marginTop: 6
              }
            }, h.from_emp?.full_name || "—"),
            React.createElement("div", {
              style: {
                fontSize: 10,
                color: "var(--text-muted)"
              }
            }, "FROM")
          ),
          React.createElement("div", {
            style: { fontSize: 24 }
          }, "→"),
          React.createElement("div", {
            style: { textAlign: "center" }
          },
            React.createElement(NxAvatar, {
              user: h.to_emp, size: "md"
            }),
            React.createElement("div", {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text)",
                marginTop: 6
              }
            }, h.to_emp?.full_name || "—"),
            React.createElement("div", {
              style: {
                fontSize: 10,
                color: "var(--text-muted)"
              }
            }, "TO")
          )
        ),

        /* Meta */
        React.createElement("div", {
          style: {
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16
          }
        },
          React.createElement("span", {
            className: "nx-badge nx-badge-neutral"
          }, `🌅 ${h.shift}`),
          React.createElement(PriorityBadge, {
            priority: h.priority
          }),
          React.createElement("span", {
            className: `nx-badge ${
              h.acknowledged
                ? "nx-badge-success"
                : "nx-badge-warning"}`
          },
            h.acknowledged ? "✅ Acknowledged" : "⏳ Pending"
          ),
          React.createElement("span", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)"
            }
          }, fmtDateTime(h.created_at))
        ),

        /* Sections */
        [
          { label:"📋 Notes",              value: h.notes },
          { label:"🗂️ Pending Cases",      value: h.pending_cases },
          { label:"⚠️ Important Info",     value: h.important_info },
        ].filter(s => s.value).map(s =>
          React.createElement("div", {
            key: s.label,
            style: { marginBottom: 16 }
          },
            React.createElement("label", {
              className: "nx-label",
              style: { marginBottom: 6, display: "block" }
            }, s.label),
            React.createElement("div", {
              style: {
                padding: "12px 14px",
                background: "var(--card2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: 13,
                color: "var(--text-sub)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap"
              }
            }, s.value)
          )
        )
      ),

      React.createElement("div", {
        className: "nx-modal-footer"
      },
        !h.acknowledged && h.to_id === user.id &&
        React.createElement("button", {
          className: "nx-btn nx-btn-success",
          onClick: onAck
        }, "✅ Acknowledge"),
        React.createElement("button", {
          className: "nx-btn nx-btn-secondary",
          onClick: onClose
        }, "Close")
      )
    )
  );
}

import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import ReactDOM from 'react-dom';
import { sb, showToast, useApp } from '../lib/config'; // قم بتحديث مسار الاستيراد حسب مشروعك

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToastEvent(e) {
      const id = Date.now() + Math.random();
      const { message, type, duration } = e.detail;
      setToasts(currentToasts => [...currentToasts, { id, message, type }]);
      setTimeout(() => {
        setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
      }, duration || 3500);
    }
    window.addEventListener('nx-toast', onToastEvent);
    return () => window.removeEventListener('nx-toast', onToastEvent);
  }, []);

  if (toasts.length === 0) return null;

  const colorMap = {
    success: "#22C55E",
    error: "#EF4444",
    warning: "#EAB308",
    info: "#3B82F6",
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 340,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} className="scale-in" style={{
          background: colorMap[t.type] || colorMap.info,
          borderRadius: 14,
          padding: '13px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(20px)',
          color: '#fff',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: 13,
          pointerEvents: 'auto',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>
            {t.type === "success"
              ? "✅"
              : t.type === "error"
              ? "❌"
              : t.type === "warning"
              ? "⚠️"
              : "ℹ️"}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => setToasts(toasts => toasts.filter(x => x.id !== t.id))} style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontSize: 18,
            flexShrink: 0,
            padding: 0,
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 'sm' }) {
  const dimensions = size === 'lg' ? 32 : size === 'md' ? 20 : 16;
  return (
    <div style={{
      width: dimensions,
      height: dimensions,
      border: '2px solid rgba(255,255,255,0.2)',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0
    }} />
  );
}

export function LoadingPage({ message = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 16
    }}>
      <Spinner size="lg" />
      <p style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>{message}</p>
    </div>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    low: { label: "Low", color: "#22C55E" },
    medium: { label: "Medium", color: "#EAB308" },
    high: { label: "High", color: "#EF4444" },
    urgent: { label: "Urgent", color: "#BE123C" }
  };
  const { label, color } = map[priority] || map.medium;
  return (
    <span style={{
      backgroundColor: color + "22",
      border: `1px solid ${color}44`,
      color: color,
      borderRadius: 20,
      padding: "2px 6px",
      fontWeight: 700,
      fontSize: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "'Space Grotesk', sans-serif"
    }}>
      {label}
    </span>
  );
}

export function EditCellModal({ cellEmp, date, day, shiftTypes, weekStart, onClose, onDone }) {
  const { showToast } = useApp();
  const [type, setType] = useState(day?.shift_type || "shift");
  const [shiftLabel, setShiftLabel] = useState(day?.shift_label || "");
  const [customStart, setCustomStart] = useState(day?.shift_start?.slice(0, 5) || "");
  const [customEnd, setCustomEnd] = useState(day?.shift_end?.slice(0, 5) || "");
  const [saving, setSaving] = useState(false);
  const dateStr = date.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
  const dateKey = date.toISOString().split("T")[0];
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  const ws = weekStart.toISOString().split("T")[0];
  const ct = document.documentElement.getAttribute("data-theme") || "dark";

  async function save() {
    setSaving(true);
    try {
      let schedId;
      const { data: ex } = await sb.from("schedules")
        .select("id")
        .eq("employee_id", cellEmp.id)
        .eq("week_start", ws)
        .single();
      if (ex) {
        schedId = ex.id;
      } else {
        const { data: ns } = await sb.from("schedules").insert({
          employee_id: cellEmp.id,
          week_start: ws,
          department: cellEmp.department
        }).select().single();
        schedId = ns.id;
      }

      let dayData = { schedule_id: schedId, day_date: dateKey, day_name: dayName };
      if (type === "shift") {
        if (shiftLabel) {
          const st = shiftTypes.find(s => s.label === shiftLabel);
          dayData = {
            ...dayData,
            shift_type: "shift",
            shift_label: shiftLabel,
            shift_start: st?.start_time || customStart + ":00",
            shift_end: st?.end_time || customEnd + ":00"
          };
        } else if (customStart && customEnd) {
          dayData = {
            ...dayData,
            shift_type: "shift",
            shift_label: customStart + "-" + customEnd,
            shift_start: customStart + ":00",
            shift_end: customEnd + ":00"
          };
        } else {
          showToast("Please select a shift or enter custom times", "warning");
          setSaving(false);
          return;
        }
      } else {
        dayData = { ...dayData, shift_type: type };
      }

      await sb.from("schedule_days").delete().eq("schedule_id", schedId).eq("day_date", dateKey);
      await sb.from("schedule_days").insert(dayData);
      onDone();
    } catch (err) {
      showToast(err.message || err, "error");
      setSaving(false);
    }
  }

  async function clearDay() {
    setSaving(true);
    try {
      const { data: ex } = await sb.from("schedules")
        .select("id")
        .eq("employee_id", cellEmp.id)
        .eq("week_start", ws)
        .single();
      if (ex) await sb.from("schedule_days").delete().eq("schedule_id", ex.id).eq("day_date", dateKey);
      onDone();
    } catch (err) {
      showToast(err.message || err, "error");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>✏️ Edit Schedule</h3>
            <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 3 }}>
              <b>{cellEmp.full_name}</b> · {dateStr}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ fontSize: 18 }}>×</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-sub)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            Day Type
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { v: "shift", l: "⏰ Shift", c: "#3B82F6" },
              { v: "WO", l: "🌴 Week Off", c: "#10B981" },
              { v: "Leave", l: "📋 Leave", c: "#F59E0B" },
              { v: "Holiday", l: "🎉 Holiday", c: "#EC4899" },
              { v: "Training", l: "📚 Training", c: "#8B5CF6" },
              { v: "Off", l: "⭕ Clear", c: "#64748B" }
            ].map(item => (
              <button
                key={item.v}
                onClick={() => setType(item.v)}
                style={{
                  background: type === item.v ? item.c + "20" : "var(--glass2)",
                  border: "1px solid " + (type === item.v ? item.c : "var(--border)"),
                  color: type === item.v ? item.c : "var(--text-sub)",
                  borderRadius: 10,
                  padding: "9px 6px",
                  fontSize: 12,
                  fontWeight: type === item.v ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: "all 0.2s"
                }}
              >
                {item.l}
              </button>
            ))}
          </div>
        </div>

        {type === "shift" && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-sub)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Select Shift
            </label>
            {shiftTypes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {shiftTypes.map(s => {
                  const sc = adaptColor(s.color, ct);
                  const sel = shiftLabel === s.label;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setShiftLabel(s.label); setCustomStart(s.start_time?.slice(0, 5)); setCustomEnd(s.end_time?.slice(0, 5)); }}
                      style={{
                        background: sel ? `color-mix(in srgb,${sc} 20%,transparent)` : "var(--glass2)",
                        border: "1px solid " + (sel ? sc : "var(--border)"),
                        color: sel ? sc : "var(--text-sub)",
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: sel ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ background: "var(--glass2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>Or custom times:</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Start</label>
                  <input type="time" className="input" value={customStart} onChange={e => { setCustomStart(e.target.value); setShiftLabel(""); }} style={{ padding: "8px 10px", fontSize: 13 }} />
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: 18, marginTop: 16 }}>→</span>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>End</label>
                  <input type="time" className="input" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setShiftLabel(""); }} style={{ padding: "8px 10px", fontSize: 13 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {day && (
            <button onClick={clearDay} disabled={saving} className="btn btn-danger" style={{ padding: "10px 16px", fontSize: 12 }}>
              🗑️ Clear
            </button>
          )}
          <button onClick={onClose} disabled={saving} className="btn btn-ghost" style={{ flex: 1 }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 14, border: "2px solid #ffffff40", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Saving...
              </span>
            ) : (
              "💾 Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UploadScheduleModal({ emp, weekStart, employees, shiftTypes, onClose, onDone }) {
  const { showToast } = useApp();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
}

export function ManageShiftsModal({ shiftTypes, onClose, onDone }) {
  const { showToast } = useApp();
  const [shifts, setShifts] = useState(shiftTypes);
  const [saving, setSaving] = useState(false);

  const add = () => setShifts(p => [...p, {
    id: "new_" + Date.now(),
    label: "08:00-17:00",
    start_time: "08:00:00",
    end_time: "17:00:00",
    color: "#3B82F6",
    is_active: true,
    is_new: true
  }]);

  const update = (id, key, value) => setShifts(p => p.map(s => s.id === id ? { ...s, [key]: value } : s));

  const remove = id => setShifts(p => p.filter(s => s.id !== id));

  async function save() {
    setSaving(true);
    try {
      const toInsert = shifts.filter(s => s.is_new).map(s => ({
        label: s.label,
        start_time: s.start_time,
        end_time: s.end_time,
        color: s.color,
        is_active: true
      }));
      const toUpdate = shifts.filter(s => !s.is_new);
      const toDelete = shiftTypes.filter(st => !shifts.find(s => s.id === st.id)).map(st => st.id);
      if (toInsert.length > 0) await sb.from("shift_types").insert(toInsert);
      for (const u of toUpdate)
        await sb.from("shift_types").update({
          label: u.label,
          start_time: u.start_time,
          end_time: u.end_time,
          color: u.color,
          is_active: u.is_active
        }).eq("id", u.id);
      if (toDelete.length > 0) await sb.from("shift_types").delete().in("id", toDelete);
      onDone();
    } catch (err) {
      showToast(err.message || err, "error");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>⚙️ Manage Shifts</h3>
          <button onClick={onClose} className="btn-icon" style={{ fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "50vh", overflowY: "auto", paddingRight: 4 }}>
          {shifts.map(s => (
            <div key={s.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--glass2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 10
            }}>
              <input type="color" value={s.color} onChange={e => update(s.id, "color", e.target.value)} style={{ width: 32, height: 32, padding: 0, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }} />
              <input className="input" value={s.label} onChange={e => update(s.id, "label", e.target.value)} style={{ flex: 1, padding: "6px 10px", fontSize: 12 }} />
              <input type="time" className="input" value={s.start_time?.slice(0, 5)} onChange={e => update(s.id, "start_time", e.target.value + ":00")} style={{ width: 100, padding: "6px 10px", fontSize: 12 }} />
              <span style={{ color: "var(--text-muted)" }}>-</span>
              <input type="time" className="input" value={s.end_time?.slice(0, 5)} onChange={e => update(s.id, "end_time", e.target.value + ":00")} style={{ width: 100, padding: "6px 10px", fontSize: 12 }} />
              <button onClick={() => remove(s.id)} className="btn-icon" style={{ width: 32, height: 32, color: "var(--danger)" }}>🗑️</button>
            </div>
          ))}
          <button onClick={add} className="btn btn-ghost" style={{ borderStyle: "dashed", padding: "12px" }}>
            + Add Shift Type
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 2 }}>
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

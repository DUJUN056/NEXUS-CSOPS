import React, { useState, useEffect } from 'react';
import { sb, showToast } from '../lib/config';
import { LoadingPage, PageHeader, EmptyState, SearchInput, StatusBadge, RoleBadge } from '../components/components';

export function AuditLogPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  function load() {
    sb.from("audit_log")
      .select("*,actor:employees!performed_by(full_name,role)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(r => setItems(r.data || []))
      .catch(() => showToast("Failed to load audit log", "error"))
      .finally(() => setLoading(false));
  }

  const filtered = items.filter(x =>
    !search ||
    (x.action && x.action.toLowerCase().includes(search.toLowerCase())) ||
    (x.page && x.page.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <LoadingPage message="Loading Audit Log..." />;

  return (
    <div className="nx-page-enter">
      <PageHeader title="Audit Log" icon="📋" subtitle={`${items.length} entries`} />
      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search actions..." />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No entries" />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(item => (
              <div key={item.id} className="nx-card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>{item.action}</span>
                    {item.page && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>[{item.page}]</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    {item.actor && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.actor.full_name}</span>
                        <RoleBadge role={item.actor.role} />
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export function ReportsNotesPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "note", title: "", content: "", department: "" });

  useEffect(() => { load(); }, []);

  function load() {
    sb.from("reports_notes")
      .select("*,author:employees!created_by(full_name,role)")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(r => setItems(r.data || []))
      .catch(() => showToast("Failed to load reports", "error"))
      .finally(() => setLoading(false));
  }

  function submit() {
    if (!form.title) {
      showToast("Title required", "warning");
      return;
    }
    sb.from("reports_notes").insert({
      type: form.type,
      title: form.title,
      content: form.content || null,
      department: form.department || null,
      created_by: user.id,
      is_shared: true
    }).then(() => {
      showToast("Added", "success");
      setShowForm(false);
      setForm({ type: "note", title: "", content: "", department: "" });
      load();
    }).catch(() => showToast("Failed", "error"));
  }

  if (loading) return <LoadingPage message="Loading Reports..." />;

  return (
    <div className="nx-page-enter">
      <PageHeader title="Reports & Notes" icon="📄" subtitle="Team reports"
        actions={<button className="nx-btn nx-btn-primary nx-btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Add"}</button>} />
      {showForm && (
        <div className="nx-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select className="nx-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="note">Note</option>
              <option value="report">Report</option>
              <option value="incident">Incident</option>
            </select>
            <input className="nx-input" placeholder="Title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="nx-input" placeholder="Content..." rows={3} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            <input className="nx-input" placeholder="Department (optional)..." value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            <button className="nx-btn nx-btn-primary" onClick={submit}>Add</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon="📄" title="No reports yet" desc="Reports will appear here" />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => (
              <div key={item.id} className="nx-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "var(--primary)",
                        background: "var(--primary)22", padding: "2px 8px",
                        borderRadius: 20, textTransform: "uppercase"
                      }}>{item.type || "note"}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</span>
                    </div>
                    {item.content && <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4, lineHeight: 1.6 }}>{item.content}</div>}
                    {item.department && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{item.department}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {item.author && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.author.full_name}</span>}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export function BreakManagementPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => { load(); }, []);

  function load() {
    sb.from("break_schedules").select("*,employee:employees!employee_id(full_name,role,avatar_url)")
      .eq("date", todayStr)
      .order("start_time", { ascending: true })
      .then(r => setItems(r.data || []))
      .catch(() => showToast("Failed to load breaks", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    ChannelMgr.sub("brkmgmt", "break_schedules", null, load);
    return () => ChannelMgr.unsub("brkmgmt");
  }, []);

  if (loading) return <LoadingPage message="Loading Break Management..." />;

  return (
    <div className="nx-page-enter">
      <PageHeader title="Break Management" icon="⏱️" subtitle={`${items.length} breaks today`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Today", value: items.length, color: "var(--primary)" },
          { label: "Morning", value: items.filter(b => b.break_type === "morning").length, color: "#22C55E" },
          { label: "Lunch", value: items.filter(b => b.break_type === "lunch").length, color: "#3B82F6" },
          { label: "Evening", value: items.filter(b => b.break_type === "evening").length, color: "#EAB308" }
        ].map(s => (
          <div key={s.label} className="nx-stat-card">
            <span className="nx-stat-label">{s.label}</span>
            <div className="nx-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon="☕" title="No breaks scheduled today" />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(b => (
              <div key={b.id} className="nx-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <NxAvatar user={b.employee} size="sm" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{b.employee?.full_name || "--"}</div>
                      <RoleBadge role={b.employee?.role} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{b.start_time || "--"} to {b.end_time || "--"}</span>
                    <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, textTransform: "capitalize" }}>{b.break_type || "break"}</span>
                    {b.department && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.department}</span>}
                  </div>
                </div>
                {b.notes && <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 8 }}>{b.notes}</div>}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default null;

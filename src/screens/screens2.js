import React, { useState, useEffect } from 'react';
import { sb, showToast } from '../lib/config';
import { LoadingPage, PageHeader, EmptyState, StatusBadge } from '../components/components';

export function MyBreakSchedulePage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  function load() {
    sb.from("break_schedules").select("*").eq("employee_id", user.id)
      .order("created_at", { ascending: false }).limit(30)
      .then(r => setItems(r.data || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }

  if (loading) return <LoadingPage message="Loading Breaks..." />;

  return (
    <div className="nx-page-enter">
      <PageHeader title="My Break Schedule" icon="☕" subtitle="Your break schedule" />
      {items.length === 0 ? (
        <EmptyState icon="☕" title="No breaks scheduled" desc="Your break schedule will appear here" />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(b => (
              <div key={b.id} className="nx-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{b.break_type || "Break"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{new Date(b.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 600 }}>
                      {(b.start_time || "--") + " to " + (b.end_time || "--")}
                    </span>
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

export function MyRequestsPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "leave", notes: "" });

  useEffect(() => { load(); }, []);

  function load() {
    sb.from("my_requests").select("*").eq("employee_id", user.id)
      .order("created_at", { ascending: false })
      .then(r => setItems(r.data || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }

  function submit() {
    if (!form.notes) {
      showToast("Details required", "warning");
      return;
    }
    sb.from("my_requests").insert({
      employee_id: user.id,
      type: form.type,
      notes: form.notes,
      status: "pending"
    }).then(() => {
      showToast("Submitted", "success");
      setShowForm(false);
      setForm({ type: "leave", notes: "" });
      load();
    }).catch(() => showToast("Failed", "error"));
  }

  if (loading) return <LoadingPage message="Loading Requests..." />;

  return (
    <div className="nx-page-enter">
      <PageHeader title="My Requests" icon="📋" subtitle={`${items.length} requests`}
        actions={<button className="nx-btn nx-btn-primary nx-btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New"}</button>} />
      {showForm && (
        <div className="nx-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select value={form.type} className="nx-input" onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="leave">Leave</option>
              <option value="wfh">WFH</option>
              <option value="swap">Shift Swap</option>
              <option value="other">Other</option>
            </select>
            <textarea placeholder="Details..." rows={3} className="nx-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <button className="nx-btn nx-btn-primary" onClick={submit}>Submit</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon="📋" title="No requests yet" />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(item => (
              <div key={item.id} className="nx-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, textTransform: "capitalize" }}>{item.type}</span>
                    {item.notes && <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4 }}>{item.notes}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <StatusBadge status={item.status} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export function ShiftHandoverPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ to_employee: "", notes: "" });
  const [emps, setEmps] = useState([]);

  useEffect(() => {
    load();
    loadEmps();
  }, []);

  function load() {
    sb.from("shift_handover")
      .select("*,from:employees!from_employee(full_name),to:employees!to_employee(full_name)")
      .order("created_at", { ascending: false }).limit(20)
      .then(r => setItems(r.data || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }

  function loadEmps() {
    sb.from("employees").select("id,full_name")
      .eq("is_active", true)
      .neq("id", user.id)
      .then(r => setEmps(r.data || []))
      .catch(() => { });
  }

  function submit() {
    if (!form.to_employee) {
      showToast("Select recipient", "warning");
      return;
    }
    sb.from("shift_handover").insert({
      from_employee: user.id,
      to_employee: form.to_employee,
      shift_date: new Date().toISOString().split("T")[0],
      notes: form.notes,
      open_cases: [],
      pending_tasks: [],
      status: "pending"
    }).then(() => {
      showToast("Submitted", "success");
      setShowForm(false);
      setForm({ to_employee: "", notes: "" });
      load();
    }).catch(() => showToast("Failed", "error"));
  }

  if (loading) return <LoadingPage message="Loading Handovers..." />;

  return (
    <div className="nx-page-enter">
      <PageHeader title="Shift Handover" icon="🔄" subtitle="Shift transitions"
        actions={<button className="nx-btn nx-btn-primary nx-btn-sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New"}</button>} />
      {showForm && (
        <div className="nx-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select className="nx-input" value={form.to_employee} onChange={e => setForm(f => ({ ...f, to_employee: e.target.value }))}>
              <option value="">Select recipient...</option>
              {emps.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
            <textarea placeholder="Notes..." rows={3} className="nx-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <button className="nx-btn nx-btn-primary" onClick={submit}>Submit</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon="🔄" title="No handovers yet" />
      ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(item => (
              <div key={item.id} className="nx-card" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {(item.from && item.from.full_name) || "--"} → {(item.to && item.to.full_name) || "--"}
                    </div>
                    {item.notes && <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 4 }}>{item.notes}</div>}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{new Date(item.shift_date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <StatusBadge status={item.status} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

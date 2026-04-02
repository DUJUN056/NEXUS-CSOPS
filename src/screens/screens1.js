import React, { useState, useEffect } from 'react';
import { sb, showToast, useApp } from '../lib/config';
import {
  LoadingPage,
  PageHeader,
  EmptyState,
  PriorityBadge,
  RoleBadge,
  DeptBadge,
  Portal,
  CreateFeedModal
} from '../components/components';

export function UpdatesFeed({ emp }) {
  const { showToast } = useApp();
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acks, setAcks] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const canCreate = ["Owner", "Team Leader", "Shift Leader", "SME"].includes(emp?.role);

  useEffect(() => {
    load();
    const ch = sb.channel("rt-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "updates_feed" }, load)
      .subscribe();
    return () => sb.removeChannel(ch);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await sb.from("updates_feed")
        .select("*,by:employees!updates_feed_created_by_fkey(full_name,role)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (data) {
        const filtered = data.filter(item => {
          if (item.expires_at && new Date(item.expires_at) < new Date()) return false;
          if (item.target_type === "all") return true;
          if (item.target_type === "role") {
            const roles = Array.isArray(item.target_roles) ? item.target_roles : [];
            return roles.includes(emp?.role);
          }
          if (item.target_type === "department") {
            return item.target_dept === emp?.department || emp?.department === "Both" || item.target_dept === "Both";
          }
          if (item.target_type === "specific") {
            const users = Array.isArray(item.target_users) ? item.target_users : [];
            return users.includes(emp?.id);
          }
          return true;
        });
        setFeeds(filtered);
      }
      const { data: ackData } = await sb.from("feed_acknowledgments")
        .select("feed_id,status")
        .eq("employee_id", emp?.id);
      if (ackData) {
        const ackMap = {};
        ackData.forEach(a => { ackMap[a.feed_id] = a.status; });
        setAcks(ackMap);
      }
    } catch (e) {
      showToast("Failed to load updates", "error");
    } finally {
      setLoading(false);
    }
  }

  async function ack(id, status = "read") {
    await sb.from("feed_acknowledgments").upsert(
      { feed_id: id, employee_id: emp?.id, status },
      { onConflict: "feed_id,employee_id" }
    );
    setAcks(prev => ({ ...prev, [id]: status }));
  }

  const typesConfig = {
    urgent: { c: "#EF4444", i: "🚨", l: "Urgent" },
    task: { c: "#3B82F6", i: "📌", l: "Task" },
    announcement: { c: "#8B5CF6", i: "📢", l: "Announcement" },
    update: { c: "#10B981", i: "📊", l: "Update" },
    document: { c: "#F59E0B", i: "📎", l: "Document" },
    appreciation: { c: "#EC4899", i: "🎉", l: "Appreciation" },
  };

  const filteredFeeds = filter === "all" ? feeds : feeds.filter(f => f.type === filter);

  if (loading) {
    return <LoadingPage message="Loading Updates Feed..." />;
  }

  return (
    <div className="page-enter">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.6px", marginBottom: 5 }}>
            {emp?.role === "Agent" ? "My Tasks" : "Updates Feed"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-sub)" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}{feeds.length} items
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Update
          </button>
        )}
      </div>

      {/* Stats for Managers */}
      {canCreate && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { l: "Total", v: feeds.length, c: "var(--primary)", i: "📋" },
            { l: "Urgent", v: feeds.filter(f => f.type === "urgent").length, c: "#EF4444", i: "🚨" },
            { l: "Tasks", v: feeds.filter(f => f.type === "task").length, c: "#3B82F6", i: "📌" },
            { l: "Pending", v: feeds.filter(f => !acks[f.id]).length, c: "var(--warning)", i: "🔔" },
          ].map(s => (
            <div key={s.l} className="card-stat">
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.l}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.c, letterSpacing: "-1px" }}>{s.v}</div>
              <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 22, opacity: 0.1 }}>{s.i}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "urgent", "task", "announcement", "update"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "var(--primary-glow)" : "var(--glass2)",
              border: "1px solid " + (filter === f ? "var(--primary)" : "var(--border)"),
              color: filter === f ? "var(--primary)" : "var(--text-sub)",
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Space Grotesk',sans-serif"
            }}
          >
            {f === "all" ? "All" : typesConfig[f] ? typesConfig[f].i + " " + typesConfig[f].l : f}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {filteredFeeds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 60, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>📭</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-sub)" }}>No updates found</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredFeeds.map((f, i) => {
            const tc = typesConfig[f.type] || typesConfig.update;
            const ackd = acks[f.id];
            return (
              <div
                key={f.id}
                className="card fade-in"
                style={{ borderLeft: "3px solid " + tc.c, opacity: ackd ? 0.8 : 1, position: "relative", animationDelay: i * 0.04 + "s" }}
              >
                {f.is_pinned && (
                  <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: "0 var(--radius-lg) 0 10px" }}>
                    📌 PINNED
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>

                  {/* Icon */}
                  <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: tc.c + "12", border: "1px solid " + tc.c + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {tc.i}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{f.title}</span>
                      <span className="badge" style={{ background: tc.c + "12", color: tc.c, border: "1px solid " + tc.c + "25" }}>{tc.l}</span>
                      {f.target_dept && f.target_dept !== "Both" && <DeptBadge dept={f.target_dept} />}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.65, marginBottom: 10 }}>
                      {f.content}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)" }}>
                      <span>{RC[f.by?.role]?.i} {f.by?.full_name || "System"} · {f.by?.role}</span>
                      <span>{new Date(f.created_at).toLocaleString()}</span>
                      {f.due_date && (
                        <span style={{ color: "var(--warning)", fontWeight: 600 }}>
                          ⏰ {new Date(f.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    {!ackd && (
                      <button className="btn btn-success" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => ack(f.id, "read")}>
                        ✓ Read
                      </button>
                    )}
                    {f.type === "task" && ackd !== "done" && (
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => ack(f.id, "done")}>
                        ✅ Done
                      </button>
                    )}
                    {ackd && (
                      <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 700 }}>
                        {ackd === "done" ? "✅ Done" : "✓ Read"}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <Portal>
          <CreateFeedModal
            emp={emp}
            onClose={() => setShowCreate(false)}
            onDone={() => { load(); setShowCreate(false); showToast("Update posted! ✅", "success"); }}
          />
        </Portal>
      )}
    </div>
  );
}

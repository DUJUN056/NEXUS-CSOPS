import React, { useState, useEffect, useRef } from 'react';
import { sb, showToast, useApp } from '../lib/config';
import { LoadingPage, PageHeader, EmptyState, NxAvatar, RoleBadge, StatusBadge, SearchInput } from '../components/components';

export function ChatPage({ user }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { loadConvos(); }, []);
  useEffect(() => { if (activeConvo) loadMsgs(activeConvo); }, [activeConvo]);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function loadConvos() {
    withRetry(() => sb.from("chat_conversations").select("*").order("created_at", { ascending: false }).limit(20))
      .then(r => {
        const list = r.data || [];
        setConvos(list);
        if (list.length > 0) setActiveConvo(list[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function loadMsgs(convoId) {
    setLoading(true);
    withRetry(() => sb.from("chat_messages")
      .select("*,sender:employees!sender_id(full_name,role,avatar_url)")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(100)
    )
      .then(r => setMsgs(r.data || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!activeConvo) return;
    ChannelMgr.sub("chat", "chat_messages", `conversation_id=eq.${activeConvo}`, () => loadMsgs(activeConvo));
    return () => ChannelMgr.unsub("chat");
  }, [activeConvo]);

  function send() {
    if (!text.trim() || !activeConvo) return;
    let t = text.trim();
    setText("");
    withRetry(() => sb.from("chat_messages").insert({
      sender_id: user.id,
      conversation_id: activeConvo,
      content: t,
      is_read: false
    })).catch(() => showToast("Failed to send", "error"));
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (loading) return <LoadingPage message="Loading Chat..." />;

  if (convos.length === 0) {
    return (
      <div className="nx-page-enter">
        <PageHeader title="Team Chat" icon="💬" subtitle="No conversations" />
        <EmptyState icon="💬" title="No conversations yet" desc="Conversations will appear here" />
      </div>
    );
  }

  return (
    <div className="nx-page-enter" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <PageHeader title="Team Chat" icon="💬" subtitle={`${convos.length} conversations`} />
      {convos.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {convos.map(c => (
            <button key={c.id} className={`nx-btn nx-btn-sm ${activeConvo === c.id ? "nx-btn-primary" : "nx-btn-secondary"}`} onClick={() => setActiveConvo(c.id)}>
              {c.name || "Chat"}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "4px 0", WebkitOverflowScrolling: "touch" }}>
        {msgs.map(m => {
          const isMe = m.sender_id === user.id;
          return (
            <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexDirection: isMe ? "row-reverse" : "row" }}>
              <NxAvatar user={m.sender} size="sm" />
              <div style={{ maxWidth: "70%" }}>
                <div style={{
                  fontSize: 10, color: "var(--text-muted)", marginBottom: 3,
                  textAlign: isMe ? "right" : "left"
                }}>
                  {(m.sender && m.sender.full_name) || "--"} {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div style={{
                  background: isMe ? "var(--primary)" : "var(--card2)",
                  color: isMe ? "#000" : "var(--text)",
                  padding: "10px 14px",
                  borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: "break-word"
                }}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <input
          className="nx-input"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          style={{ flex: 1 }}
        />
        <button className="nx-btn nx-btn-primary" onClick={send} disabled={!text.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

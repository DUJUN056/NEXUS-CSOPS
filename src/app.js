import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sb, showToast, Ctx, useApp } from './lib/config';
import { LoginPage } from './screens/LoginPage';
import { UpdatesFeed } from './screens/screens1';
import { SchedulePage } from './screens/screens1';
import { OwnerAnalytics } from './screens/OwnerAnalytics';
import { ToastContainer } from './components/components';

function App() {
  const [emp, setEmp] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("Updates Feed");
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [mustChange, setMustChange] = useState(false);

  const showToastFn = useCallback((msg, type = "info") => {
    const id = Date.now().toString();
    let finalMsg = msg;
    if (typeof msg === "object" && msg !== null) {
      if (msg.code === "23505") finalMsg = "❌ Duplicate record already exists.";
      else if (msg.code === "23503") finalMsg = "❌ Missing related data.";
      else if (msg.message) finalMsg = msg.message;
      else finalMsg = JSON.stringify(msg);
    }
    setToasts(p => [...p, { id, message: finalMsg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("nx_theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    sb.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadEmp(s.user.id);
      else setLoading(false);
    }).catch(console.error);
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadEmp(s.user.id);
      else { setEmp(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadEmp(uid) {
    const { data } = await sb.from("employees")
      .select("*")
      .eq("auth_user_id", uid)
      .eq("is_active", true)
      .single();
    if (data) {
      setEmp(data);
      setMustChange(!!data.must_change_password);
      if (data.is_owner && !localStorage.getItem("nx_theme")) {
        setTheme("pirateking");
        document.documentElement.setAttribute("data-theme", "pirateking");
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!emp) return;
    const ch = sb.channel("rt-notifs-" + emp.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "employee_id=eq." + emp.id }, () => setUnread(u => u + 1))
      .subscribe();
    return () => sb.removeChannel(ch);
  }, [emp]);

  const handleTheme = useCallback(t => {
    setTheme(t);
    localStorage.setItem("nx_theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const handleLogout = useCallback(async () => {
    await sb.auth.signOut();
    setEmp(null);
    setSession(null);
    setPage("Updates Feed");
    localStorage.removeItem("nx_theme");
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  function renderPage() {
    switch (page) {
      case "Updates Feed": return <UpdatesFeed emp={emp} />;
      case "Schedule": return <SchedulePage emp={emp} />;
      case "Owner Analytics": return <OwnerAnalytics emp={emp} />;
      default: return <div>Page Not Found</div>;
    }
  }

  if (loading) return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--gradient-primary)", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 28,
        boxShadow: "0 8px 32px var(--primary-glow)", animation: "glowPulse 2s ease-in-out infinite"
      }}>🎯</div>
      <div style={{
        width: 36, height: 36,
        border: "3px solid var(--border)", borderTopColor: "var(--primary)",
        borderRadius: "50%", animation: "spin 0.8s linear infinite"
      }} />
      <div style={{
        fontSize: 13,
        color: "var(--text-muted)",
        fontWeight: 600,
        letterSpacing: 1
      }}>Loading {APP}...</div>
    </div>
  );

  if (!session || !emp) {
    return (
      <Ctx.Provider value={{ showToast: showToastFn }}>
        <LoginPage onLogin={(e, s) => { setEmp(e); setSession(s); setMustChange(!!e.must_change_password); }} />
        <ToastContainer />
      </Ctx.Provider>
    );
  }

  if (mustChange) {
    return (
      <Ctx.Provider value={{ showToast: showToastFn }}>
        <ForcePasswordChange emp={emp} onComplete={() => { setMustChange(false); showToast("Password updated! Welcome 🎉", "success"); }} />
        <ToastContainer />
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={{ showToast: showToastFn }}>
      <div className="app-root">
        {/* Background */}
        <div className="app-bg" />

        {/* Header */}
        <Header
          emp={emp}
          onLogout={handleLogout}
          page={page}
          onNav={setPage}
          theme={theme}
          onTheme={handleTheme}
          unread={unread}
          onToggleSidebar={() => setSidebarOpen(s => !s)}
        />

        {/* Body */}
        <div className="app-body">
          <Sidebar
            emp={emp}
            page={page}
            onNav={p => { setPage(p); setSidebarOpen(false); }}
            theme={theme}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="app-main">
            {renderPage()}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <BottomNav emp={emp} page={page} onNav={setPage} theme={theme} />

        {/* Toasts */}
        <Toasts toasts={[]} remove={() => { }} />
      </div>
    </Ctx.Provider>
  );
}

export default App;

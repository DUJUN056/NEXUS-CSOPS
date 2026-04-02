import React, { useState } from 'react';
import { sb, showToast, Portal, ForcePasswordChange, APP, VER } from '../lib/config';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forcePwEmp, setForcePwEmp] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!email || !pw) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: ae } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: pw
      });
      if (ae) throw ae;
      if (data?.user) {
        const { data: emp } = await sb.from("employees")
          .select("*").eq("auth_user_id", data.user.id).single();
        if (emp) {
          if (emp.must_change_password)
            setForcePwEmp(emp);
          else
            onLogin(emp, data.session);
        }
      }
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  if (forcePwEmp)
    return (
      <ForcePasswordChange
        emp={forcePwEmp}
        onComplete={() => window.location.reload()}
      />
    );

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 20, position: "relative", overflow: "hidden"
    }}>
      {/* Background Glow */}
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,var(--primary-glow) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "radial-gradient(circle,var(--primary-glow) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 74, height: 74, borderRadius: 22, margin: "0 auto 16px", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, boxShadow: "0 16px 40px var(--primary-glow)" }}>
            🎯
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
            {APP}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 4 }}>
            Contact Center Operations System
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: 28, boxShadow: "var(--shadow-lg)" }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-sub)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                Email Address
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                style={{ fontSize: 15, padding: "12px 16px" }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 1 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  Forgot?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  className="input"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ fontSize: 15, padding: "12px 16px", paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 0 }}
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="scale-in" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#FCA5A5", marginBottom: 18, textAlign: "center" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "13px", fontSize: 15, fontWeight: 700, borderRadius: 12 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: "2px solid #ffffff40", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  Authenticating...
                </span>
              ) : (
                "Secure Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Version */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-muted)" }}>
          {APP} v{VER} · Powered by Friday Team
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <Portal>
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForgot(false)}>
            <div className="modal" style={{ maxWidth: 400 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>🔑 Reset Password</h3>
                <button onClick={() => setShowForgot(false)} className="btn-icon" style={{ fontSize: 18 }}>×</button>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 20, lineHeight: 1.6 }}>
                Enter your email. A reset request will be sent to your Team Leader.
              </p>

              <input
                type="email"
                className="input"
                id="resetInput"
                placeholder="your.email@example.com"
                style={{ marginBottom: 16 }}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowForgot(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const val = document.getElementById("resetInput").value.trim();
                    if (!val) return alert("Please enter your email");
                    const { data: user } = await sb.from("employees")
                      .select("id")
                      .eq("email", val)
                      .single();
                    if (user) {
                      await sb.from("password_requests").insert({ employee_id: user.id });
                      alert("✅ Request sent to your Team Leader!");
                    } else {
                      alert("❌ Email not found.");
                    }
                    setShowForgot(false);
                  }}
                  style={{ flex: 1 }}
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

export default LoginPage;

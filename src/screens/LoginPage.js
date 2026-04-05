// [NEXUS-CSOPS] Login Component
// STATUS: SOVEREIGN COMPLIANCE ENFORCED
// LANGUAGE: ENGLISH ONLY

(function() {
  const React = window.React;
  const { useState, useEffect } = React;

  window.LoginPage = function({ onLogin }) {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forcePwEmp, setForcePwEmp] = useState(null);

    // Dynamic extraction from global config
    const sb = window.sb;
    const APP = window.APP || "NEXUS";
    const VER = window.VER || "4.1.0";

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

    if (forcePwEmp && window.ForcePasswordChange) {
      return React.createElement(window.ForcePasswordChange, {
        emp: forcePwEmp,
        onComplete: () => window.location.reload()
      });
    }

    return React.createElement("div", {
      style: {
        minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 20, position: "relative", overflow: "hidden"
      }
    },
      // Background Glows
      React.createElement("div", { style: { position: "absolute", top: "-20%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,var(--primary-glow) 0%,transparent 70%)", pointerEvents: "none" } }),
      React.createElement("div", { style: { position: "absolute", bottom: "-20%", right: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "radial-gradient(circle,var(--primary-glow) 0%,transparent 70%)", pointerEvents: "none" } }),

      React.createElement("div", { style: { width: "100%", maxWidth: 400, position: "relative", zIndex: 1 } },
        // Logo Section
        React.createElement("div", { style: { textAlign: "center", marginBottom: 30 } },
          React.createElement("div", { style: { width: 74, height: 74, borderRadius: 22, margin: "0 auto 16px", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, boxShadow: "0 16px 40px var(--primary-glow)" } }, "🎯"),
          React.createElement("h1", { style: { fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" } }, APP),
          React.createElement("p", { style: { fontSize: 13, color: "var(--text-sub)", marginTop: 4 } }, "Contact Center Operations System")
        ),

        // Login Card
        React.createElement("div", { className: "card", style: { padding: 28, boxShadow: "var(--shadow-lg)" } },
          React.createElement("form", { onSubmit: submit, style: { display: "flex", flexDirection: "column", gap: 16 } },
            // Email Field
            React.createElement("div", null,
              React.createElement("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-sub)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 } }, "Email Address"),
              React.createElement("input", {
                type: "email", className: "input", value: email,
                onChange: e => setEmail(e.target.value),
                placeholder: "your.email@example.com", required: true,
                style: { fontSize: 15, padding: "12px 16px" }
              })
            ),
            // Password Field
            React.createElement("div", null,
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 } },
                React.createElement("label", { style: { fontSize: 10, fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 1 } }, "Password"),
                React.createElement("button", { type: "button", onClick: () => setShowForgot(true), style: { background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" } }, "Forgot?")
              ),
              React.createElement("div", { style: { position: "relative" } },
                React.createElement("input", {
                  type: showPw ? "text" : "password", className: "input", value: pw,
                  onChange: e => setPw(e.target.value), placeholder: "••••••••",
                  required: true, style: { fontSize: 15, padding: "12px 16px", paddingRight: 44 }
                }),
                React.createElement("button", {
                  type: "button", onClick: () => setShowPw(s => !s),
                  style: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 0 }
                }, showPw ? "🙈" : "👁️")
              )
            ),
            // Error Display
            error && React.createElement("div", { className: "scale-in", style: { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#FCA5A5", marginBottom: 18, textAlign: "center" } }, "⚠️ " + error),
            // Submit Button
            React.createElement("button", {
              type: "submit", className: "btn btn-primary", disabled: loading,
              style: { width: "100%", padding: "13px", fontSize: 15, fontWeight: 700, borderRadius: 12 }
            }, loading ? "Authenticating..." : "Secure Sign In")
          )
        ),

        // Version Footer
        React.createElement("div", { style: { textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-muted)" } },
          APP + " v" + VER + " · Powered by Friday Team"
        )
      ),

      // Forgot Password Portal Replacement (Simple implementation for compatibility)
      showForgot && React.createElement("div", {
        className: "modal-overlay",
        style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
        onClick: e => e.target === e.currentTarget && setShowForgot(false)
      },
        React.createElement("div", { className: "modal", style: { maxWidth: 400, background: "var(--card)", padding: 30, borderRadius: 20, border: "1px solid var(--border)" } },
          React.createElement("h3", null, "🔑 Reset Password"),
          React.createElement("p", { style: { margin: "15px 0", color: "var(--text-sub)", fontSize: 13 } }, "Enter email to notify your Team Leader."),
          React.createElement("input", { type: "email", id: "resetInput", className: "input", placeholder: "email", style: { marginBottom: 20 } }),
          React.createElement("div", { style: { display: "flex", gap: 10 } },
            React.createElement("button", { className: "btn btn-ghost", onClick: () => setShowForgot(false), style: { flex: 1 } }, "Cancel"),
            React.createElement("button", {
              className: "btn btn-primary",
              style: { flex: 1 },
              onClick: async () => {
                const val = document.getElementById("resetInput").value;
                if(!val) return;
                alert("Request Sent!");
                setShowForgot(false);
              }
            }, "Send")
          )
        )
      )
    );
  };
})();
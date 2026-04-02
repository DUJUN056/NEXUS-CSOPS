var SUPABASE_URL = "https://nrcnadkrnsjzbdzgrtgg.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY25hZGtybnNqemJkemdydGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDkzMjksImV4cCI6MjA5MDEyNTMyOX0.SLYEKj01VAbwnyEUNq6l2VUnfvoRs-zivplF01-oDLQ";
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } }
});
var RC = {
  icon: {
    "Owner": "👑",
    "Team Leader": "🎯",
    "Shift Leader": "🔷",
    "SME": "🧠",
    "Agent": "🎧"
  },
  color: {
    "Owner": "#EAB308",
    "Team Leader": "#8B5CF6",
    "Shift Leader": "#3B82F6",
    "SME": "#06B6D4",
    "Agent": "#10B981"
  },
  rank: {
    "Owner": 5,
    "Shift Leader": 4,
    "Team Leader": 3,
    "SME": 2,
    "Agent": 1
  },
  isOwner: function(u) { return u && u.role === "Owner"; },
  isMgr: function(u) {
    return u && ["Owner", "Shift Leader", "Team Leader"].indexOf(u.role) > -1;
  },
  isSME: function(u) { return u && u.role === "SME"; },
  canAccess: function(u, page) {
    if (!u) return false;
    if (u.role === "Owner") return true;
    if (["Owner Analytics"].indexOf(page) > -1) return false;
    if (["Break Management", "Audit Log", "Reports & Notes"].indexOf(page) > -1) {
      return ["Owner", "Shift Leader", "Team Leader"].indexOf(u.role) > -1;
    }
    return true;
  }
};
var STATUS_MAP = {
  online: { label: "Online", color: "#22C55E" },
  offline: { label: "Offline", color: "#6B7280" },
  onbreak: { label: "On Break", color: "#EAB308" },
  incall: { label: "In Call", color: "#3B82F6" },
  busy: { label: "Busy", color: "#EF4444" },
  away: { label: "Away", color: "#F97316" },
  training: { label: "Training", color: "#8B5CF6" },
  meeting: { label: "Meeting", color: "#06B6D4" },
  lunch: { label: "Lunch", color: "#84CC16" },
  coaching: { label: "Coaching", color: "#F59E0B" },
  wfh: { label: "WFH", color: "#10B981" },
  unknown: { label: "Unknown", color: "#6B7280" }
};
var ThemeMgr = {
  get: function() {
    try { return localStorage.getItem("nx_theme") || "dark"; } catch (e) { return "dark"; }
  },
  set: function(id) {
    try {
      localStorage.setItem("nx_theme", id);
      document.documentElement.setAttribute("data-theme", id);
    } catch (e) { }
  },
  getAvailable: function(userRole) {
    var all = [
      { id: "dark", label: "Dark", icon: "🌑", desc: "Deep Rich Slate", bg: "#00ff88" },
      { id: "light", label: "Light", icon: "☀️", desc: "Soft Pearl", bg: "#00aa55" },
      { id: "ocean", label: "Ocean", icon: "🌊", desc: "Deep Mariana Blue", bg: "#06B6D4" },
      { id: "midnight", label: "Midnight", icon: "⚡", desc: "Rich Dark Purple", bg: "#00ff88" },
      { id: "grandline", label: "Grand Line", icon: "✨", desc: "Elegant Gold", bg: "#D97706" },
      { id: "pirateking", label: "Pirate King", icon: "👑", desc: "Owner Exclusive", bg: "#EAB308", ownerOnly: true },
      { id: "cyberneon", label: "Cyber Neon", icon: "👾", desc: "High Contrast", bg: "#F012BE" },
      { id: "emerald", label: "Emerald", icon: "🌲", desc: "Calming Nature", bg: "#10b981" },
      { id: "bloodmoon", label: "Blood Moon", icon: "🩸", desc: "Executive Red", bg: "#E11D48" }
    ];
    return all.filter(function(t) {
      if (t.ownerOnly) return userRole === "Owner";
      return true;
    });
  }
};
var ChannelMgr = {
  channels: {},
  sub: function(name, table, filter, cb) {
    this.unsub(name);
    try {
      var ch = sb.channel("nx_" + name);
      var cfg = { event: "*", schema: "public", table: table };
      if (filter) cfg.filter = filter;
      ch = ch.on("postgres_changes", cfg, function() { try { cb(); } catch (e) {} });
      ch.subscribe();
      this.channels[name] = ch;
    } catch (e) {}
  },
  unsub: function(name) {
    try {
      if (this.channels[name]) {
        sb.removeChannel(this.channels[name]);
        delete this.channels[name];
      }
    } catch (e) {}
  },
  unsubAll: function() {
    try { Object.keys(this.channels).forEach(k => this.unsub(k)); } catch (e) {}
  }
};
function withRetry(fn, retries, delay) {
  retries = retries || 3;
  delay = delay || 800;
  function attempt(i) {
    return fn().then(r => {
      if (r && r.error) throw r.error;
      return r;
    }).catch(e => {
      if (i >= retries - 1) throw e;
      return new Promise(resolve => setTimeout(resolve, delay * (i + 1))).then(() => attempt(i + 1));
    });
  }
  return attempt(0);
}
function showToast(message, type, duration) {
  try {
    window.dispatchEvent(new CustomEvent("nx-toast", {
      detail: { message: message || "", type: type || "info", duration: duration || 3500 }
    }));
  } catch (e) { console.log(type, message); }
}
function logAudit(action, page, actorId, targetId) {
  try {
    sb.from("audit_log").insert({
      action: action,
      page: page || null,
      performed_by: actorId || null,
      target_user: targetId || null,
      created_at: new Date().toISOString()
    }).then(() => {}).catch(() => {});
  } catch (e) {}
}
function fmtDate(d) {
  if (!d) return "--";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    }).format(new Date(d));
  } catch (e) { return "--"; }
}
function fmtTime(d) {
  if (!d) return "--";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false
    }).format(new Date(d));
  } catch (e) { return "--"; }
}
function fmtRelative(d) {
  if (!d) return "--";
  try {
    const diff = Date.now() - new Date(d).getTime();
    if (isNaN(diff)) return "--";
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    if (hours < 24) return hours + "h ago";
    if (days < 7) return days + "d ago";
    return fmtDate(d);
  } catch (e) { return "--"; }
}
function fmtDuration(s) {
  if (s === null || s === undefined) return "--";
  try {
    const x = Math.abs(Math.floor(s));
    const h = Math.floor(x / 3600);
    const m = Math.floor((x % 3600) / 60);
    const sec = x % 60;
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    return m + ":" + String(sec).padStart(2, "0");
  } catch (e) { return "--"; }
}
function fmtNumber(n) {
  if (n === null || n === undefined) return "0";
  try {
    return Number(n).toLocaleString("en-US");
  } catch (e) { return String(n); }
}

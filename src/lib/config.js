/* NEXUS-CSOPS v4.2.0 — config.js */

const SUPABASE_URL = "https://nrcnadkrnsjzbdzgrtgg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY25hZGtybnNqemJkemdydGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDkzMjksImV4cCI6MjA5MDEyNTMyOX0.SLYEKj01VAbwnyEUNq6l2VUnfvoRs-zivplF01-oDLQ";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: { params: { eventsPerSecond: 10 } }
});

const useState    = React.useState;
const useEffect   = React.useEffect;
const useRef      = React.useRef;
const useMemo     = React.useMemo;
const useCallback = React.useCallback;
const useReducer  = React.useReducer;

const RC = {
  icon: {
    "Owner":        "👑",
    "Shift Leader": "🛡️",
    "Team Leader":  "⭐",
    "SME":          "🎯",
    "Agent":        "👤"
  },
  color: {
    "Owner":        "#FFD700",
    "Shift Leader": "#3B82F6",
    "Team Leader":  "#22C55E",
    "SME":          "#8B5CF6",
    "Agent":        "#94A3B8"
  },
  rank: {
    "Owner":        5,
    "Shift Leader": 4,
    "Team Leader":  3,
    "SME":          2,
    "Agent":        1
  },
  isOwner(user) {
    return user?.role === "Owner";
  },
  isMgr(user) {
    return ["Owner","Shift Leader","Team Leader"]
      .includes(user?.role);
  },
  isSME(user) {
    return user?.role === "SME";
  },
  canAccess(user, page) {
    if (!user) return false;
    if (user.role === "Owner") return true;
    const ownerOnly = ["Owner Analytics"];
    if (ownerOnly.includes(page)) return false;
    const mgrOnly = ["Break Management","Audit Log"];
    if (mgrOnly.includes(page)) {
      return ["Owner","Shift Leader","Team Leader"]
        .includes(user.role);
    }
    return true;
  }
};

const STATUS_MAP = {
  online:   { label:"Online",   icon:"🟢", color:"#22C55E" },
  offline:  { label:"Offline",  icon:"⚫", color:"#6B7280" },
  onbreak:  { label:"On Break", icon:"☕", color:"#EAB308" },
  incall:   { label:"In Call",  icon:"📞", color:"#3B82F6" },
  busy:     { label:"Busy",     icon:"🔴", color:"#EF4444" },
  away:     { label:"Away",     icon:"🟡", color:"#F97316" },
  training: { label:"Training", icon:"📚", color:"#8B5CF6" },
  meeting:  { label:"Meeting",  icon:"👥", color:"#06B6D4" },
  lunch:    { label:"Lunch",    icon:"🍽️", color:"#84CC16" },
  coaching: { label:"Coaching", icon:"🎯", color:"#F59E0B" },
  wfh:      { label:"WFH",      icon:"🏠", color:"#10B981" },
  unknown:  { label:"Unknown",  icon:"❓", color:"#6B7280" }
};

const ThemeMgr = {
  get(user) {
    try {
      return localStorage.getItem("nx_theme") || "nika";
    } catch(e) { return "nika"; }
  },
  set(themeId, user) {
    try {
      localStorage.setItem("nx_theme", themeId);
      document.documentElement
        .setAttribute("data-theme", themeId);
    } catch(e) {}
  },
  getAvailable(user) {
    return [
      { id:"nika",    label:"Nika",    bg:"#00ff88" },
      { id:"zoro",    label:"Zoro",    bg:"#22c55e" },
      { id:"porsche", label:"Porsche", bg:"#f97316" },
      { id:"raptor",  label:"Raptor",  bg:"#3b82f6" },
      { id:"dark",    label:"Dark",    bg:"#1a1a1a" }
    ];
  }
};

const ThemeImageMgr = {
  set(theme, page, url) {
    try {
      localStorage.setItem("nx_img_"+theme+"_"+page, url);
    } catch(e) {}
  },
  getSync(theme, page) {
    try {
      return localStorage.getItem(
        "nx_img_"+theme+"_"+page
      ) || null;
    } catch(e) { return null; }
  },
  remove(theme, page) {
    try {
      localStorage.removeItem("nx_img_"+theme+"_"+page);
    } catch(e) {}
  },
  clear() {
    try {
      Object.keys(localStorage)
        .filter(function(k) {
          return k.indexOf("nx_img_") === 0;
        })
        .forEach(function(k) {
          localStorage.removeItem(k);
        });
    } catch(e) {}
  }
};

const ChannelMgr = {
  channels: {},
  sub(name, table, filter, callback) {
    this.unsub(name);
    try {
      var ch  = sb.channel("nx_" + name);
      var cfg = {
        event: "*", schema: "public", table: table
      };
      if (filter) cfg.filter = filter;
      ch = ch.on("postgres_changes", cfg, function() {
        try { callback(); } catch(e) {}
      });
      ch.subscribe();
      this.channels[name] = ch;
    } catch(e) {}
  },
  unsub(name) {
    try {
      if (this.channels[name]) {
        sb.removeChannel(this.channels[name]);
        delete this.channels[name];
      }
    } catch(e) {}
  },
  unsubAll() {
    try {
      var self = this;
      Object.keys(this.channels).forEach(function(k) {
        self.unsub(k);
      });
    } catch(e) {}
  }
};

async function withRetry(fn, retries, delay) {
  retries = retries || 3;
  delay   = delay   || 800;
  for (var i = 0; i < retries; i++) {
    try {
      var result = await fn();
      if (result && result.error) throw result.error;
      return result;
    } catch(e) {
      if (i === retries - 1) throw e;
      await new Promise(function(r) {
        setTimeout(r, delay * (i + 1));
      });
    }
  }
}

async function logAudit(action, details, actorId, targetId) {
  try {
    await sb.from("audit_log").insert({
      action:     action,
      details:    details  || null,
      actor_id:   actorId  || null,
      target_id:  targetId || null,
      created_at: new Date().toISOString()
    });
  } catch(e) {}
}

async function sendNotification(userId, type, title, body, link) {
  try {
    await sb.from("notifications").insert({
      user_id:    userId,
      type:       type  || "system",
      title:      title || "Notification",
      body:       body  || null,
      link:       link  || null,
      is_read:    false,
      created_at: new Date().toISOString()
    });
  } catch(e) {}
}

function showToast(message, type, duration) {
  try {
    var event = new CustomEvent("nx-toast", {
      detail: {
        message:  message  || "",
        type:     type     || "info",
        duration: duration || 3500
      }
    });
    window.dispatchEvent(event);
  } catch(e) {
    console.log("[Toast] "+(type||"info")+": "+message);
  }
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day:"2-digit", month:"short", year:"numeric"
    });
  } catch(e) { return "—"; }
}

function fmtTime(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour:"2-digit", minute:"2-digit"
    });
  } catch(e) { return "—"; }
}

function fmtDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-GB", {
      day:"2-digit", month:"short",
      hour:"2-digit", minute:"2-digit"
    });
  } catch(e) { return "—"; }
}

function fmtRelative(dateStr) {
  if (!dateStr) return "—";
  try {
    var diff  = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return "—";
    var mins  = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days  = Math.floor(diff / 86400000);
    if (mins  <  1) return "Just now";
    if (mins  < 60) return mins  + "m ago";
    if (hours < 24) return hours + "h ago";
    if (days  <  7) return days  + "d ago";
    return fmtDate(dateStr);
  } catch(e) { return "—"; }
}

function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  try {
    var s   = Math.abs(Math.floor(seconds));
    var h   = Math.floor(s / 3600);
    var m   = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) {
      return h+":"+
        String(m).padStart(2,"0")+":"+
        String(sec).padStart(2,"0");
    }
    return m+":"+String(sec).padStart(2,"0");
  } catch(e) { return "—"; }
}

function fmtNumber(n) {
  if (n === null || n === undefined) return "0";
  try {
    return Number(n).toLocaleString("en-US");
  } catch(e) { return String(n); }
}

function haversine(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  try {
    var R    = 6371000;
    var dLat = (lat2-lat1) * Math.PI / 180;
    var dLon = (lon2-lon1) * Math.PI / 180;
    var a    =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1*Math.PI/180) *
      Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(
      Math.sqrt(a), Math.sqrt(1-a)
    );
    return Math.round(R * c);
  } catch(e) { return null; }
}

function adaptColor(color, theme) {
  if (!color) return "var(--primary)";
  return color;
}

function getSaudiPeriod() {
  try {
    var hour = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Riyadh",
      hour: "numeric", hour12: false
    });
    var h = parseInt(hour);
    if (h >= 5  && h < 12) return "Morning";
    if (h >= 12 && h < 17) return "Afternoon";
    if (h >= 17 && h < 21) return "Evening";
    return "Night";
  } catch(e) { return ""; }
}

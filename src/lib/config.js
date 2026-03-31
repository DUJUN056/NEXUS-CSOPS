/* ============================================================
   NEXUS-CSOPS v4.2.0
   config.js — Core Configuration & Utilities
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SUPABASE INIT
   ══════════════════════════════════════════════════════════ */
const SUPABASE_URL = "https://nrcnadkrnsjzbdzgrtgg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY25hZGtybnNqemJkemdydGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDkzMjksImV4cCI6MjA5MDEyNTMyOX0.SLYEKj01VAbwnyEUNq6l2VUnfvoRs-zivplF01-oDLQ";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});

/* ══════════════════════════════════════════════════════════
   ROLE CONTROL
   ══════════════════════════════════════════════════════════ */
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
    const role = user.role;

    /* Owner يصل لكل شيء */
    if (role === "Owner") return true;

    /* صفحات مقيدة بالـ Owner فقط */
    const ownerOnly = ["Owner Analytics"];
    if (ownerOnly.includes(page)) return false;

    /* صفحات المديرين */
    const mgrOnly = ["Break Management", "Audit Log"];
    if (mgrOnly.includes(page)) {
      return ["Owner","Shift Leader","Team Leader"]
        .includes(role);
    }

    /* باقي الصفحات متاحة للجميع */
    return true;
  }
};

/* ══════════════════════════════════════════════════════════
   THEME MANAGER
   ══════════════════════════════════════════════════════════ */
const ThemeMgr = {
  get(user) {
    try {
      const stored = localStorage.getItem("nx_theme");
      if (stored) return stored;
      return "nika";
    } catch(e) {
      return "nika";
    }
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
      { id:"dark",    label:"Dark",    bg:"#1a1a1a" },
    ];
  }
};

/* ══════════════════════════════════════════════════════════
   THEME IMAGE MANAGER
   ══════════════════════════════════════════════════════════ */
const ThemeImageMgr = {
  set(theme, page, url) {
    try {
      localStorage.setItem(`nx_img_${theme}_${page}`, url);
    } catch(e) {}
  },
  getSync(theme, page) {
    try {
      return localStorage.getItem(
        `nx_img_${theme}_${page}`
      ) || null;
    } catch(e) {
      return null;
    }
  },
  remove(theme, page) {
    try {
      localStorage.removeItem(`nx_img_${theme}_${page}`);
    } catch(e) {}
  },
  clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith("nx_img_"))
        .forEach(k => localStorage.removeItem(k));
    } catch(e) {}
  }
};

/* ══════════════════════════════════════════════════════════
   CHANNEL MANAGER (Realtime)
   ══════════════════════════════════════════════════════════ */
const ChannelMgr = {
  channels: {},
  sub(name, table, filter, callback) {
    this.unsub(name);
    try {
      let channel = sb.channel(`nx_${name}`);
      const config = {
        event:  "*",
        schema: "public",
        table
      };
      if (filter) config.filter = filter;
      channel = channel.on(
        "postgres_changes", config, () => callback()
      );
      channel.subscribe();
      this.channels[name] = channel;
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
      Object.keys(this.channels)
        .forEach(k => this.unsub(k));
    } catch(e) {}
  }
};

/* ══════════════════════════════════════════════════════════
   WITH RETRY
   ══════════════════════════════════════════════════════════ */
async function withRetry(fn, retries = 3, delay = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result?.error) throw result.error;
      return result;
    } catch(e) {
      if (i === retries - 1) throw e;
      await new Promise(r =>
        setTimeout(r, delay * (i + 1))
      );
    }
  }
}

/* ══════════════════════════════════════════════════════════
   LOG AUDIT
   ══════════════════════════════════════════════════════════ */
async function logAudit(action, details, actorId, targetId) {
  try {
    await sb.from("audit_log").insert({
      action,
      details:    details  || null,
      actor_id:   actorId  || null,
      target_id:  targetId || null,
      created_at: new Date().toISOString()
    });
  } catch(e) {}
}

/* ══════════════════════════════════════════════════════════
   SEND NOTIFICATION
   ══════════════════════════════════════════════════════════ */
async function sendNotification(
  userId, type, title, body, link
) {
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

/* ══════════════════════════════════════════════════════════
   TOAST SYSTEM
   ══════════════════════════════════════════════════════════ */
let _toastContainer = null;

function showToast(message, type = "info", duration = 3500) {
  try {
    const event = new CustomEvent("nx-toast", {
      detail: { message, type, duration }
    });
    window.dispatchEvent(event);
  } catch(e) {
    console.log(`[Toast] ${type}: ${message}`);
  }
}

/* ══════════════════════════════════════════════════════════
   FORMAT HELPERS
   ══════════════════════════════════════════════════════════ */
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
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return "—";
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return "Just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  <  7) return `${days}d ago`;
    return fmtDate(dateStr);
  } catch(e) { return "—"; }
}

function fmtDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  try {
    const s = Math.abs(Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    }
    return `${m}:${String(sec).padStart(2,"0")}`;
  } catch(e) { return "—"; }
}

function fmtNumber(n) {
  if (n === null || n === undefined) return "0";
  try {
    return Number(n).toLocaleString("en-US");
  } catch(e) { return String(n); }
}

/* ══════════════════════════════════════════════════════════
   HAVERSINE DISTANCE (meters)
   ══════════════════════════════════════════════════════════ */
function haversine(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  try {
    const R    = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  } catch(e) { return null; }
}

/* ══════════════════════════════════════════════════════════
   SAUDI TIME PERIOD
   ══════════════════════════════════════════════════════════ */
function getSaudiPeriod() {
  try {
    const hour = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Riyadh",
      hour: "numeric",
      hour12: false
    });
    const h = parseInt(hour);
    if (h >= 5  && h < 12) return "Morning";
    if (h >= 12 && h < 17) return "Afternoon";
    if (h >= 17 && h < 21) return "Evening";
    return "Night";
  } catch(e) { return ""; }
}

/* ══════════════════════════════════════════════════════════
   ADAPT COLOR (for themes)
   ══════════════════════════════════════════════════════════ */
function adaptColor(color, theme) {
  if (!color) return "var(--primary)";
  return color;
}

/* ══════════════════════════════════════════════════════════
   STATUS MAP
   ══════════════════════════════════════════════════════════ */
const STATUS_MAP = {
  online:    { label:"Online",     icon:"🟢", color:"#22C55E", css:"online"    },
  offline:   { label:"Offline",    icon:"⚫", color:"#6B7280", css:"offline"   },
  onbreak:   { label:"On Break",   icon:"☕", color:"#EAB308", css:"onbreak"   },
  incall:    { label:"In Call",    icon:"📞", color:"#3B82F6", css:"incall"    },
  busy:      { label:"Busy",       icon:"🔴", color:"#EF4444", css:"busy"      },
  away:      { label:"Away",       icon:"🟡", color:"#F97316", css:"away"      },
  training:  { label:"Training",   icon:"📚", color:"#8B5CF6", css:"training"  },
  meeting:   { label:"Meeting",    icon:"👥", color:"#06B6D4", css:"meeting"   },
  lunch:     { label:"Lunch",      icon:"🍽️", color:"#84CC16", css:"lunch"     },
  coaching:  { label:"Coaching",   icon:"🎯", color:"#F59E0B", css:"coaching"  },
  wfh:       { label:"WFH",        icon:"🏠", color:"#10B981", css:"wfh"       },
  unknown:   { label:"Unknown",    icon:"❓", color:"#6B7280", css:"offline"   },
};

/* ══════════════════════════════════════════════════════════
   REACT HOOKS SHORTCUTS
   ══════════════════════════════════════════════════════════ */
const {
  useState, useEffect, useRef,
  useMemo, useCallback, useReducer
} = React;

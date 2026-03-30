/* ============================================================
   NEXUS-CSOPS v4.2.0
   config.js — SEC 2
   Core Config + 6 Systems + Utilities
   Owner: Mohammed Nasser Althurwi
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   SUPABASE CONNECTION
   ══════════════════════════════════════════════════════════ */
const SURL = "https://nrcnadkrnsjzbdzgrtgg.supabase.co";
const SKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY25hZGtybnNqemJkemdydGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDkzMjksImV4cCI6MjA5MDEyNTMyOX0.SLYEKj01VAbwnyEUNq6l2VUnfvoRs-zivplF01-oDLQ";
const sb   = supabase.createClient(SURL, SKEY);

/* ══════════════════════════════════════════════════════════
   APP IDENTITY
   ══════════════════════════════════════════════════════════ */
const APP = "⚡ NEXUS-CSOPS";
const VER = "4.2.0";

/* ══════════════════════════════════════════════════════════
   ROLES CONFIG (5 أدوار)
   ══════════════════════════════════════════════════════════ */
const RC = {
  OWNER : "Owner",
  TL    : "Team Leader",
  SL    : "Shift Leader",
  SME   : "SME",
  AGENT : "Agent",

  icon: {
    "Owner"        : "👑",
    "Team Leader"  : "🎯",
    "Shift Leader" : "🛡️",
    "SME"          : "🧠",
    "Agent"        : "✈️"
  },

  color: {
    "Owner"        : "#EAB308",
    "Team Leader"  : "#3B82F6",
    "Shift Leader" : "#8B5CF6",
    "SME"          : "#10B981",
    "Agent"        : "#94A3B8"
  },

  cssClass: {
    "Owner"        : "owner",
    "Team Leader"  : "tl",
    "Shift Leader" : "sl",
    "SME"          : "sme",
    "Agent"        : "agent"
  },

  /* التحقق من الصلاحيات */
  isOwner : (u) => u?.is_owner === true,
  isMgr   : (u) => ["Owner","Team Leader","Shift Leader"]
                   .includes(u?.role),
  isSL    : (u) => ["Owner","Shift Leader"].includes(u?.role),
  isTL    : (u) => ["Owner","Team Leader","Shift Leader"]
                   .includes(u?.role),
  canBreakMgmt: (u) =>
    ["Owner","Team Leader","Shift Leader"].includes(u?.role),
  canSchedule : (u) =>
    u?.is_owner || ["Owner","Team Leader","Shift Leader"]
    .includes(u?.role),
};

/* ══════════════════════════════════════════════════════════
   STATUS MAP (11 حالة)
   ══════════════════════════════════════════════════════════ */
const STATUS_MAP = {
  online    : { label:"Online",     icon:"🟢", color:"#22C55E", css:"online"    },
  onbreak   : { label:"On Break",   icon:"🟡", color:"#EAB308", css:"onbreak"   },
  incall    : { label:"In Call",    icon:"🔵", color:"#3B82F6", css:"incall",
                effect:"callPulse"  },
  inmeeting : { label:"In Meeting", icon:"🔵", color:"#2563EB", css:"inmeeting" },
  prayer    : { label:"Prayer",     icon:"🕌", color:"#10B981", css:"prayer",
                effect:"prayerGlow" },
  training  : { label:"Training",   icon:"🟠", color:"#F97316", css:"training"  },
  coaching  : { label:"Coaching",   icon:"🟣", color:"#8B5CF6", css:"coaching"  },
  offline   : { label:"Offline",    icon:"🔴", color:"#EF4444", css:"offline"   },
  absent    : { label:"Absent",     icon:"⚫", color:"#6B7280", css:"absent"    },
  late      : { label:"Late",       icon:"🟤", color:"#78716C", css:"late"      },
  unknown   : { label:"Unknown",    icon:"⚪", color:"#94A3B8", css:"unknown"   },
};

/* ══════════════════════════════════════════════════════════
   THEMES CONFIG (13 ثيم)
   ══════════════════════════════════════════════════════════ */
const THEMES_ALL = [
  /* الـ 9 الأصلية */
  { id:"dark",       label:"Dark",        icon:"🌑", bg:"#0D1117" },
  { id:"light",      label:"Light",       icon:"☀️",  bg:"#F4F1EA" },
  { id:"ocean",      label:"Ocean",       icon:"🌊", bg:"#0A142F" },
  { id:"midnight",   label:"Midnight",    icon:"🌌", bg:"#0F0C1B" },
  { id:"grandline",  label:"Grand Line",  icon:"⚓", bg:"#16120E" },
  { id:"pirateking", label:"Pirate King", icon:"🏴‍☠️", bg:"#121212",
    ownerOnly: true },
  { id:"cyberneon",  label:"Cyber Neon",  icon:"💜", bg:"#050514" },
  { id:"emerald",    label:"Emerald",     icon:"💚", bg:"#021108" },
  { id:"bloodmoon",  label:"Blood Moon",  icon:"🩸", bg:"#140505" },
  /* الـ 4 الجديدة */
  { id:"nika",       label:"NIKA",        icon:"🌟", bg:"#080808",
    hasImage: true },
  { id:"zoro",       label:"ZORO",        icon:"⚔️",  bg:"#0A1A0A",
    hasImage: true },
  { id:"porsche",    label:"PORSCHE",     icon:"🏎️",  bg:"#0A0500",
    hasImage: true, perPage: true },
  { id:"raptor",     label:"RAPTOR",      icon:"🚙", bg:"#050A14",
    hasImage: true, perPage: true },
];

/* ══════════════════════════════════════════════════════════
   PAGE ACCESS (PA) — صلاحيات الصفحات
   ══════════════════════════════════════════════════════════ */
const PA = {
  "Updates Feed"     : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Announcements"    : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Notifications"    : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Schedule"         : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Attendance"       : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Live Floor"       : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Break Management" : ["Owner","Team Leader","Shift Leader"],
  "My Break Schedule": ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Shift Handover"   : ["Owner","Team Leader","Shift Leader"],
  "Performance"      : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Queue"            : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Gamification"     : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Surveys"          : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Case Handover"    : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "TT Tracker"       : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "My Requests"      : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Chat"             : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Reports & Notes"  : ["Owner","Team Leader","Shift Leader"],
  "My Profile"       : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "My Workspace"     : ["Owner","Team Leader","Shift Leader","SME","Agent"],
  "Audit Log"        : ["Owner","Team Leader","Shift Leader"],
  "Owner Analytics"  : ["Owner"],
};

/* ══════════════════════════════════════════════════════════
   PAGE ICONS (PI)
   ══════════════════════════════════════════════════════════ */
const PI = {
  "Updates Feed"     : "📋",
  "Announcements"    : "📢",
  "Notifications"    : "🔔",
  "Schedule"         : "📅",
  "Attendance"       : "✅",
  "Live Floor"       : "🖥️",
  "Break Management" : "☕",
  "My Break Schedule": "☕",
  "Shift Handover"   : "🔄",
  "Performance"      : "📊",
  "Queue"            : "🎧",
  "Gamification"     : "🎮",
  "Surveys"          : "📋",
  "Case Handover"    : "🗂️",
  "TT Tracker"       : "🎫",
  "My Requests"      : "📤",
  "Chat"             : "💬",
  "Reports & Notes"  : "📑",
  "My Profile"       : "👤",
  "My Workspace"     : "📓",
  "Audit Log"        : "🕐",
  "Owner Analytics"  : "👑",
};

/* ══════════════════════════════════════════════════════════
   NAV GROUPS (NAVG)
   ══════════════════════════════════════════════════════════ */
const NAVG = [
  {
    label: "MAIN",
    pages: ["Updates Feed","Announcements","Notifications"]
  },
  {
    label: "OPERATIONS",
    pages: ["Schedule","Attendance","Live Floor",
            "Break Management","My Break Schedule","Shift Handover"]
  },
  {
    label: "PERFORMANCE",
    pages: ["Performance","Queue","Gamification","Surveys"]
  },
  {
    label: "CASES & TRACKING",
    pages: ["Case Handover","TT Tracker","My Requests"]
  },
  {
    label: "COMMUNICATIONS",
    pages: ["Chat","Reports & Notes"]
  },
  {
    label: "PERSONAL",
    pages: ["My Profile","My Workspace"]
  },
  {
    label: "ADMIN",
    pages: ["Audit Log","Owner Analytics"]
  },
];

/* ══════════════════════════════════════════════════════════
   SAUDI PERIOD SYSTEM — getSaudiPeriod()
   محفوظة من v4.1 — لا تعديل
   ══════════════════════════════════════════════════════════ */
function getSaudiPeriod() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const saudiTime = new Date(utc + 3 * 3600000);
  const h = saudiTime.getHours();
  const m = saudiTime.getMinutes();
  const total = h * 60 + m;

  if (total >= 240 && total < 360)  return "fajr";    // 04:00-06:00
  if (total >= 360 && total < 720)  return "morning"; // 06:00-12:00
  if (total >= 720 && total < 900)  return "noon";    // 12:00-15:00
  if (total >= 900 && total < 1080) return "asr";     // 15:00-18:00
  if (total >= 1080 && total < 1200)return "maghrib"; // 18:00-20:00
  return "isha";                                       // 20:00-04:00
}

function applySaudiPeriod() {
  const period = getSaudiPeriod();
  document.documentElement.setAttribute("data-period", period);
}

/* ══════════════════════════════════════════════════════════
   HAVERSINE — GPS Distance
   ══════════════════════════════════════════════════════════ */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

/* ══════════════════════════════════════════════════════════
   WITH RETRY — استقرار الشبكة
   ══════════════════════════════════════════════════════════ */
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

/* ══════════════════════════════════════════════════════════
   CHANNEL MANAGER — Bug Fix: تسرب الذاكرة
   ══════════════════════════════════════════════════════════ */
const ChannelMgr = (() => {
  const channels = new Map();

  return {
    sub(key, table, filter, cb) {
      /* إغلاق القناة القديمة إذا كانت موجودة */
      if (channels.has(key)) {
        try { sb.removeChannel(channels.get(key)); }
        catch(e) {}
        channels.delete(key);
      }

      const ch = sb.channel(`nx_${key}_${Date.now()}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table, filter },
          cb
        )
        .subscribe();

      channels.set(key, ch);
      return ch;
    },

    unsub(key) {
      if (channels.has(key)) {
        try { sb.removeChannel(channels.get(key)); }
        catch(e) {}
        channels.delete(key);
      }
    },

    unsubAll() {
      channels.forEach((ch) => {
        try { sb.removeChannel(ch); } catch(e) {}
      });
      channels.clear();
    }
  };
})();

/* ══════════════════════════════════════════════════════════
   THEME IMAGE MANAGER
   ══════════════════════════════════════════════════════════ */
const ThemeImageMgr = {
  /* حفظ صورة */
  set(theme, page, url) {
    try {
      localStorage.setItem(
        `nx_img_${theme}_${page}`, url
      );
    } catch(e) {}
  },

  /* جلب صورة (sync) */
  getSync(theme, page) {
    try {
      const key = `nx_img_${theme}_${page}`;
      return localStorage.getItem(key) || null;
    } catch(e) {
      return null;
    }
  },

  /* حذف صورة */
  remove(theme, page) {
    try {
      localStorage.removeItem(
        `nx_img_${theme}_${page}`
      );
    } catch(e) {}
  },

  /* حذف كل الصور */
  clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith("nx_img_"))
        .forEach(k => localStorage.removeItem(k));
    } catch(e) {}
  }
};

/* ══════════════════════════════════════════════════════════
   IMAGE BACKGROUND MANAGER
   نظام الصور المتغيرة لكل صفحة
   ══════════════════════════════════════════════════════════ */

/* الصور الافتراضية */
const DEFAULT_IMAGES = {
  nika: {
    default: "https://wallpapercave.com/wp/wp11839441.jpg",
    fallback: "https://wallpapercave.com/wp/wp11839442.jpg"
  },
  zoro: {
    default: "https://wallpapercave.com/wp/wp3362749.jpg",
    fallback: "https://wallpapercave.com/wp/wp3362750.jpg"
  },
  porsche: {
    default:         "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1920&q=85&auto=format",
    "Updates Feed":  "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1920&q=85&auto=format",
    "Schedule":      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=85&auto=format",
    "Attendance":    "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920&q=85&auto=format",
    "Live Floor":    "https://images.unsplash.com/photo-1580274455191-1c62238fa333?w=1920&q=85&auto=format",
    "Performance":   "https://images.unsplash.com/photo-1611821064430-0d40291d0f0b?w=1920&q=85&auto=format",
    "Owner Analytics":"https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1920&q=85&auto=format",
  },
  raptor: {
    default:         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85&auto=format",
    "Updates Feed":  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=85&auto=format",
    "Schedule":      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1920&q=85&auto=format",
    "Attendance":    "https://images.unsplash.com/photo-1571987502227-9231b837d92a?w=1920&q=85&auto=format",
    "Live Floor":    "https://images.unsplash.com/photo-1563720223185-11003d516935?w=1920&q=85&auto=format",
    "Performance":   "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=1920&q=85&auto=format",
    "Owner Analytics":"https://images.unsplash.com/photo-1551830820-330a71b99659?w=1920&q=85&auto=format",
  }
};

/* اختبار تحميل الصورة */
function testImage(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    setTimeout(() => resolve(false), 5000);
    img.src = url;
  });
}

/* تطبيق الخلفية */
async function applyPageBackground(themeId, pageName) {
  const imageThemes = ["nika","zoro","porsche","raptor"];
  if (!imageThemes.includes(themeId)) {
    document.body.style.backgroundImage = "none";
    return;
  }

  const themeImgs = DEFAULT_IMAGES[themeId];
  if (!themeImgs) return;

  /* جلب الصورة المخصصة من Supabase أولاً */
  let customUrl = null;
  try {
    const key = `theme_img_${themeId}_${pageName || "default"}`;
    const { data } = await sb
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .single();
    if (data?.value) customUrl = data.value;
  } catch(e) {}

  /* قائمة الأولويات */
  const urls = [
    customUrl,
    themeImgs[pageName],
    themeImgs["default"],
    themeImgs["fallback"],
    null
  ].filter(Boolean);

  for (const url of urls) {
    const works = await testImage(url);
    if (works) {
      document.body.style.backgroundImage = `url('${url}')`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center center";
      return;
    }
  }

  /* Fallback نهائي: لون خالص */
  document.body.style.backgroundImage = "none";
}

/* ══════════════════════════════════════════════════════════
   AVATAR MANAGER
   ══════════════════════════════════════════════════════════ */
const AvatarMgr = {
  /* رفع الصورة الشخصية */
  async upload(file, userId) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowed = ["image/jpeg","image/png","image/webp","image/jpg"];

    if (file.size > maxSize) {
      throw new Error("Max file size is 5MB");
    }
    if (!allowed.includes(file.type)) {
      throw new Error("Only JPG, PNG, WEBP allowed");
    }

    const ext  = file.name.split(".").pop().toLowerCase();
    const path = `${userId}/avatar.${ext}`;

    const { error } = await sb.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600"
      });

    if (error) throw error;

    const { data } = sb.storage
      .from("avatars")
      .getPublicUrl(path);

    /* تحديث في جدول employees */
    await withRetry(() =>
      sb.from("employees")
        .update({ avatar_url: data.publicUrl + "?t=" + Date.now() })
        .eq("id", userId)
    );

    return data.publicUrl;
  },

  /* الحصول على الأحرف الأولى للاسم */
  initials(name) {
    if (!name) return "?";
    return name.trim().split(" ")
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join("");
  },

  /* لون الخلفية من الاسم */
  colorFromName(name) {
    const colors = [
      "#EF4444","#F97316","#EAB308","#22C55E",
      "#10B981","#3B82F6","#8B5CF6","#EC4899"
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
};

/* ══════════════════════════════════════════════════════════
   THEME IMAGE UPLOADER (Owner Analytics)
   ══════════════════════════════════════════════════════════ */
const ThemeImageMgr = {
  async upload(file, themeId, pageName, uploadedBy) {
    const maxSize = 5 * 1024 * 1024;
    const allowed = ["image/jpeg","image/png","image/webp","image/jpg"];

    if (file.size > maxSize) throw new Error("Max 5MB");
    if (!allowed.includes(file.type)) throw new Error("JPG/PNG/WEBP only");

    const ext  = file.name.split(".").pop().toLowerCase();
    const path = `${themeId}/${pageName || "default"}.${ext}`;

    const { error } = await sb.storage
      .from("theme-images")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = sb.storage
      .from("theme-images")
      .getPublicUrl(path);

    const url = data.publicUrl + "?t=" + Date.now();

    /* حفظ في system_settings */
    await withRetry(() =>
      sb.from("system_settings").upsert({
        key: `theme_img_${themeId}_${pageName || "default"}`,
        value: url,
        updated_by: uploadedBy,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" })
    );

    return url;
  },

  async setUrl(url, themeId, pageName, uploadedBy) {
    await withRetry(() =>
      sb.from("system_settings").upsert({
        key: `theme_img_${themeId}_${pageName || "default"}`,
        value: url,
        updated_by: uploadedBy,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" })
    );
    return url;
  },

  async reset(themeId, pageName) {
    await sb.from("system_settings")
      .delete()
      .eq("key", `theme_img_${themeId}_${pageName || "default"}`);
  }
};

/* ══════════════════════════════════════════════════════════
   FORMAT UTILITIES
   ══════════════════════════════════════════════════════════ */
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day:"2-digit", month:"short", year:"numeric"
  });
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour:"2-digit", minute:"2-digit"
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

function fmtDuration(seconds) {
  if (!seconds || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function fmtRelative(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return fmtDate(iso);
}

function fmtNumber(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("en-US");
}

/* ══════════════════════════════════════════════════════════
   COLOR ADAPTER — adaptColor() للجداول
   محفوظة من v4.0.0
   ══════════════════════════════════════════════════════════ */
function adaptColor(hex, theme) {
  if (!hex) return "#888";
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const brightness = (r*299 + g*587 + b*114) / 1000;

  if (theme === "light") {
    /* خفض السطوع لـ 38% */
    const factor = 0.38;
    const nr = Math.round(r * factor);
    const ng = Math.round(g * factor);
    const nb = Math.round(b * factor);
    return `rgb(${nr},${ng},${nb})`;
  } else {
    /* رفع السطوع لـ 75%+ */
    if (brightness < 128) {
      const factor = 2.2;
      const nr = Math.min(255, Math.round(r * factor));
      const ng = Math.min(255, Math.round(g * factor));
      const nb = Math.min(255, Math.round(b * factor));
      return `rgb(${nr},${ng},${nb})`;
    }
    return hex;
  }
}

/* ══════════════════════════════════════════════════════════
   AUDIT LOG HELPER
   ══════════════════════════════════════════════════════════ */
async function logAudit(action, details, userId, targetId = null) {
  try {
    await sb.from("audit_log").insert({
      action,
      details: typeof details === "object"
        ? JSON.stringify(details) : details,
      performed_by: userId,
      target_id: targetId,
      created_at: new Date().toISOString()
    });
  } catch(e) {
    console.warn("Audit log failed:", e.message);
  }
}

/* ══════════════════════════════════════════════════════════
   NOTIFICATION HELPER
   ══════════════════════════════════════════════════════════ */
async function sendNotification(toUserId, type, title, body, link = null) {
  try {
    await withRetry(() =>
      sb.from("notifications").insert({
        user_id: toUserId,
        type,
        title,
        body,
        link,
        is_read: false,
        created_at: new Date().toISOString()
      })
    );
  } catch(e) {
    console.warn("Notification failed:", e.message);
  }
}

/* ══════════════════════════════════════════════════════════
   DEBOUNCE & THROTTLE
   ══════════════════════════════════════════════════════════ */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, limit = 1000) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      fn(...args);
    }
  };
}

/* ══════════════════════════════════════════════════════════
   DETECT RTL (للـ Workspace)
   ══════════════════════════════════════════════════════════ */
function isRTL(text) {
  if (!text) return false;
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F]/;
  return rtlChars.test(text.substring(0, 50));
}

function getTextDir(text) {
  return isRTL(text) ? "rtl" : "ltr";
}

/* ══════════════════════════════════════════════════════════
   INIT — تهيئة النظام عند التحميل
   ══════════════════════════════════════════════════════════ */
(function initNexus() {
  /* تطبيق التوقيت السعودي */
  applySaudiPeriod();
  setInterval(applySaudiPeriod, 60000);
})();

# ⚡ NEXUS-CSOPS

> **CS Operations Management System**
> Version: 4.1.0
> Owner: Mohammed Nasser Althurwi

---

## 1. وصف النظام

NEXUS-CSOPS هو نظام إدارة عمليات خدمة العملاء.
يتيح للموظفين والمديرين متابعة الحضور والاستراحات
والتذاكر والأداء والتواصل في مكان واحد.

---

## 2. Tech Stack

| المكوّن | الإصدار | الوصف |
|---------|---------|-------|
| React | 18 (CDN) | واجهة المستخدم |
| Supabase JS | 2 (CDN) | قاعدة البيانات والمصادقة |
| Google Fonts | Space Grotesk | الخط الرسمي للنظام |
| HTML/CSS/JS | Vanilla | بدون Build Tools |

---

## 3. هيكل المجلدات والملفات

```
NEXUS-CSOPS/
│
├── index.html                  ← نقطة الدخول الرئيسية للنظام
│
└── src/
    ├── styles/
    │   ├── style1.css          ← CSS الأساسي: Layout + Sidebar + Mobile
    │   ├── style2.css          ← CSS المكوّنات: Buttons + Cards + Tables
    │   └── themes-live.css     ← الثيمات التسعة المعتمدة
    │
    ├── lib/
    │   └── config.js           ← Supabase Client + RC + ThemeMgr +
    │                              ChannelMgr + دوال المساعدة
    │
    ├── components/
    │   └── components.js       ← المكوّنات المشتركة:
    │                              Toast, Spinner, Avatar, Badges,
    │                              PageHeader, Tabs, OwnerAnalytics
    │
    ├── screens/
    │   ├── screens1.js         ← صفحات العمليات:
    │   │                          UpdatesFeed, Announcements,
    │   │                          Schedule, Attendance, LiveFloor
    │   │
    │   ├── screens2.js         ← صفحات أدوات الموظف:
    │   │                          MyBreaks, MyRequests,
    │   │                          ShiftHandover, CaseHandover,
    │   │                          TTTracker, Performance,
    │   │                          Queue, Gamification, Surveys
    │   │
    │   ├── screens3.js         ← صفحات التواصل والحساب:
    │   │                          Chat, Notifications,
    │   │                          MyProfile, MyWorkspace
    │   │
    │   └── screens4.js         ← صفحات الإدارة:
    │                              AuditLog, ReportsNotes,
    │                              BreakManagement
    │
    └── app.js                  ← التطبيق الرئيسي:
                                   Heartbeat, PageRouter,
                                   Sidebar, LoginPage, App
```

---

## 4. متطلبات التشغيل

```
- متصفح حديث يدعم ES6+
- اتصال بالإنترنت (CDN + Supabase)
- حساب في Supabase مع قاعدة البيانات المُعدّة
- لا يحتاج Node.js أو أي Build Tool
```

---

## 5. خطوات الإعداد والتشغيل المحلي

```
الخطوة 1: تحميل الملفات
  — نسخ كل الملفات كما هي في مجلد واحد

الخطوة 2: التحقق من config.js
  — تأكد أن SUPABASE_URL صحيح
  — تأكد أن SUPABASE_KEY صحيح

الخطوة 3: فتح index.html
  — افتح index.html في أي متصفح
  — أو استخدم Live Server في VS Code

الخطوة 4: تسجيل الدخول
  — أدخل البريد الإلكتروني وكلمة المرور
  — يجب أن يكون المستخدم موجوداً في
    جدول employees مع auth_id صحيح
```

---

## 6. متغيرات البيئة

```javascript
// ملف: src/lib/config.js
// السطران التاليان هما الإعدادات الوحيدة المطلوبة

var SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
var SUPABASE_KEY = "YOUR_ANON_KEY";
```

> **ملاحظة للمالك:**
> هذان المتغيران موجودان في لوحة Supabase
> تحت: Settings → API → Project URL & anon key

---

## 7. هيكل قاعدة البيانات (Supabase)

### الجداول الرئيسية

| الجدول | الوصف | الأعمدة الأساسية |
|--------|-------|-----------------|
| `employees` | بيانات الموظفين | id, auth_id, full_name, role, is_active, is_online, status, last_seen |
| `attendance` | سجل الحضور | id, employee_id, date, check_in, check_out, status |
| `schedules` | جداول العمل | id, employee_id, date, shift_type_id, is_day_off |
| `shift_types` | أنواع الشيفتات | id, name, start_time, end_time |
| `break_schedules` | جداول الاستراحات | id, employee_id, date, start_time, end_time, break_type, department |
| `updates_feed` | التحديثات والإعلانات | id, title, content, priority, created_by, target_type |
| `my_requests` | طلبات الموظفين | id, employee_id, type, notes, status |
| `shift_handover` | تسليم الشيفت | id, from_employee, to_employee, shift_date, notes, status |
| `case_handover` | تسليم الحالات | id, created_by, assigned_to, case_reference, priority, action_notes, status |
| `tt_tracker` | تتبع التذاكر | id, ticket_ref, priority, notes, created_by, assigned_to, status, resolved_at |
| `performance` | مؤشرات الأداء | id, employee_id, date, tickets_handled, csat, aht, quality_score |
| `queue_stats` | إحصائيات الطابور | id, waiting_count, active_agents, avg_wait_time, abandoned_count, recorded_at |
| `employee_points` | نقاط الموظفين | id, employee_id, total_points |
| `surveys` | الاستبيانات | id, title, is_active, created_by |
| `chat_conversations` | المحادثات | id, name |
| `chat_messages` | الرسائل | id, conversation_id, sender_id, content, is_read |
| `notifications` | الإشعارات | id, employee_id, title, body, is_read, read_at |
| `audit_log` | سجل العمليات | id, action, page, performed_by, target_user |
| `reports_notes` | التقارير والملاحظات | id, type, title, content, department, created_by, is_shared |

### ملاحظات قاعدة البيانات

```
- كل الأوقات تُخزَّن كـ timestamptz
- start_time و end_time في shift_types
  و break_schedules تُخزَّن بصيغة HH24:MI
- auth_id في employees يربط المستخدم
  بـ Supabase Auth
```

---

## 8. نظام الأدوار

```
5 أدوار فقط — لا زيادة ولا نقصان
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الدور          الأيقونة   اللون      الصلاحيات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owner          👑         #EAB308    كل الصفحات بما فيها
                                     Owner Analytics
                                     + Pirate King Theme

Shift Leader   🔷         #3B82F6    كل الصفحات عدا
                                     Owner Analytics

Team Leader    🎯         #8B5CF6    كل الصفحات عدا
                                     Owner Analytics

SME            🧠         #06B6D4    صفحات الموظف العادي
                                     بدون Management

Agent          🎧         #10B981    صفحات الموظف العادي
                                     بدون Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
صفحات الإدارة (Owner + Shift Leader + Team Leader فقط):
  - Audit Log
  - Reports & Notes
  - Break Management

صفحة المالك (Owner فقط):
  - Owner Analytics
```

---

## 9. قائمة الثيمات

```
9 ثيمات فقط — لا زيادة ولا نقصان
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID            الاسم         الأيقونة  الوصف
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
dark          Dark          🌑        Deep Space (الافتراضي)
light         Light         ☀️        Clean & Clear
ocean         Ocean         🌊        Deep Blue
midnight      Midnight      ⚡        Pure Black
grandline     Grand Line    ✨        Golden Age
pirateking    Pirate King   👑        Owner Exclusive ★
cyberneon     Cyber Neon    👾        High Contrast
emerald       Emerald       🌲        Calming Nature
bloodmoon     Blood Moon    🩸        Executive Red
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ Pirate King حصري للمالك فقط
  لا يظهر لأي دور آخر
```

---

## 10. قائمة الصفحات والميزات

```
22 صفحة — موزّعة على 5 مجموعات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Operations (للجميع):
  📢 Updates Feed      — تغذية التحديثات
  📣 Announcements     — الإعلانات
  📅 Schedule          — جدول العمل
  ✅ Attendance        — الحضور والانصراف
  🖥️ Live Floor        — الطابق المباشر

My Tools (للجميع):
  ☕ My Breaks         — جدول استراحاتي
  📋 My Requests       — طلباتي
  🔄 Shift Handover    — تسليم الشيفت
  📁 Case Handover     — تسليم الحالات
  🎫 TT Tracker        — تتبع التذاكر
  📊 Performance       — مؤشرات الأداء
  📞 Queue             — إحصائيات الطابور
  🏆 Gamification      — لوحة المتصدرين
  📝 Surveys           — الاستبيانات
  💬 Chat              — الدردشة الجماعية

Account (للجميع):
  🔔 Notifications     — الإشعارات
  👤 My Profile        — ملفي الشخصي
  🖥️ My Workspace      — مساحة العمل والثيمات

Management (إدارة فقط):
  📋 Audit Log         — سجل العمليات
  📄 Reports & Notes   — التقارير والملاحظات
  ⏱️ Break Management  — إدارة الاستراحات

Owner (مالك فقط):
  👑 Owner Analytics   — تحليلات المالك
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 11. سجل التغييرات

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v1.0.0 — الإصدار الأول
  - بناء النظام الأساسي
  - تسجيل الدخول والخروج
  - صفحة الحضور الأساسية

v2.0.0 — إضافة الأدوار
  - نظام الأدوار الخمسة
  - صفحات الإدارة
  - نظام الإشعارات

v3.0.0 — إضافة الميزات التشغيلية
  - TT Tracker
  - Case Handover
  - Shift Handover
  - Performance KPIs
  - Queue Stats
  - Gamification

v4.0.0 — إعادة البناء الكاملة
  - React 18
  - Supabase JS v2
  - Realtime عبر ChannelMgr
  - Heartbeat System
  - 9 ثيمات
  - Mobile Responsive كامل

v4.1.0 — الإصدار الحالي
  - إصلاح هوية النظام: ⚡ NEXUS-CSOPS
  - إعادة الأدوار الأصلية بأيقوناتها
  - إعادة الثيمات التسعة كاملة
  - Pirate King حصري للمالك
  - خط Space Grotesk في كل مكان
  - نظام 24 ساعة مضمون في كل مكان
  - hour12:false إلزامي في كل دالة وقت
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 12. الملكية وحقوق النظام

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
النظام: NEXUS-CSOPS
الإصدار: v4.1.0
المالك: Mohammed Nasser Althurwi
جميع الحقوق محفوظة © 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
أي تعديل على هذا النظام يستلزم
إذناً صريحاً من المالك
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
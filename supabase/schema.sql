-- ============================================================
-- CSOPS DATABASE SCHEMA v4.1.0
-- نظام الحصن - Mohammed Nasser Althurwi
-- ============================================================

-- ── Extensions ──
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: employees
-- ============================================================
create table if not exists employees (
  id                  uuid primary key
                      default uuid_generate_v4(),
  auth_user_id        uuid unique
                      references auth.users(id)
                      on delete cascade,
  full_name           text not null,
  email               text unique not null,
  phone               text,
  bio                 text,
  role                text not null
                      default 'Agent'
                      check (role in (
                        'Owner','Manager',
                        'Supervisor','Agent',
                        'Support','Trainer',
                        'QA','HR'
                      )),
  department          text not null
                      default 'KFOOD'
                      check (department in (
                        'KFOOD','MRSOOL',
                        'JAHEZ','HUNGER',
                        'NANA','ADMIN','HR',
                        'QA','TRAINING'
                      )),
  status              text not null
                      default 'Offline'
                      check (status in (
                        'Online','Offline',
                        'On Call','Break',
                        'Short Break','Lunch',
                        'Prayer','Busy',
                        'Meeting','Training',
                        'Away'
                      )),
  status_since        timestamptz
                      default now(),
  status_note         text,
  last_heartbeat      timestamptz,
  is_owner            boolean not null
                      default false,
  is_suspended        boolean not null
                      default false,
  suspension_reason   text,
  suspended_at        timestamptz,
  suspended_by        uuid
                      references employees(id)
                      on delete set null,
  must_change_password boolean not null
                      default false,
  avatar_url          text,
  theme_preference    text default 'dark',
  created_at          timestamptz not null
                      default now(),
  updated_at          timestamptz not null
                      default now()
);

-- ============================================================
-- TABLE: system_settings
-- ============================================================
create table if not exists system_settings (
  id          uuid primary key
              default uuid_generate_v4(),
  key         text unique not null,
  value       jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references employees(id)
              on delete set null
);

-- Default settings
insert into system_settings (key,value)
values
  ('freeze_mode',
   '{"active":false,"reason":null,
     "by":null,"by_name":null,"at":null}'),
  ('blank_slate_mode',
   '{"active":false}'),
  ('app_config',
   '{"version":"4.1.0","maintenance":false}')
on conflict (key) do nothing;

-- ============================================================
-- TABLE: page_permissions
-- ============================================================
create table if not exists page_permissions (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  page_name   text not null,
  is_visible  boolean not null default true,
  granted_by  uuid references employees(id)
              on delete set null,
  granted_at  timestamptz not null default now(),
  unique(employee_id, page_name)
);

-- ============================================================
-- TABLE: attendance
-- ============================================================
create table if not exists attendance (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  clock_in    timestamptz not null
              default now(),
  clock_out   timestamptz,
  duration_ms bigint
              generated always as (
                extract(epoch from
                  (clock_out - clock_in))*1000
              ) stored,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: schedules
-- ============================================================
create table if not exists schedules (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  shift_date  timestamptz not null,
  start_time  text not null,
  end_time    text not null,
  shift_type  text default 'Regular'
              check (shift_type in (
                'Regular','Morning','Evening',
                'Night','Split','Overtime'
              )),
  notes       text,
  created_by  uuid references employees(id)
              on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: performance_records
-- ============================================================
create table if not exists performance_records (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  metric_name text not null,
  score       integer not null
              check (score between 0 and 100),
  notes       text,
  recorded_by uuid references employees(id)
              on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: updates_feed
-- ============================================================
create table if not exists updates_feed (
  id          uuid primary key
              default uuid_generate_v4(),
  author_id   uuid references employees(id)
              on delete set null,
  title       text,
  content     text not null,
  category    text default 'update'
              check (category in (
                'update','announcement',
                'alert','info'
              )),
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
create table if not exists notifications (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  title       text not null,
  body        text,
  type        text default 'info'
              check (type in (
                'info','success','warning',
                'error','mention','system'
              )),
  is_read     boolean not null default false,
  action_url  text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: critical_alerts
-- ============================================================
create table if not exists critical_alerts (
  id           uuid primary key
               default uuid_generate_v4(),
  title_en     text not null,
  title_ar     text,
  body_en      text not null,
  body_ar      text,
  alert_type   text default 'critical'
               check (alert_type in (
                 'critical','warning','info'
               )),
  is_active    boolean not null default true,
  admin_close  boolean not null default true,
  dismissed_by uuid[] not null default '{}',
  created_by   uuid references employees(id)
               on delete set null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TABLE: queue_stats
-- ============================================================
create table if not exists queue_stats (
  id           uuid primary key
               default uuid_generate_v4(),
  queue_name   text unique not null,
  waiting      integer not null default 0,
  handling     integer not null default 0,
  avg_wait_sec integer not null default 0,
  sla_pct      integer not null default 100
               check (sla_pct between 0 and 100),
  updated_by   uuid references employees(id)
               on delete set null,
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- TABLE: workspace_notes
-- ============================================================
create table if not exists workspace_notes (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  title       text,
  content     text,
  color       text default '#3B82F6',
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLE: theme_delegations
-- ============================================================
create table if not exists theme_delegations (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  theme_id    text not null,
  granted_by  uuid references employees(id)
              on delete set null,
  granted_at  timestamptz not null default now(),
  is_active   boolean not null default true,
  unique(employee_id, theme_id)
);

-- ============================================================
-- TABLE: status_history
-- ============================================================
create table if not exists status_history (
  id          uuid primary key
              default uuid_generate_v4(),
  employee_id uuid not null
              references employees(id)
              on delete cascade,
  status      text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_ms bigint
              generated always as (
                extract(epoch from
                  (ended_at - started_at))*1000
              ) stored
);

-- ============================================================
-- INDEXES - تسريع الاستعلامات
-- ============================================================
create index if not exists idx_emp_auth
  on employees(auth_user_id);
create index if not exists idx_emp_status
  on employees(status);
create index if not exists idx_emp_dept
  on employees(department);
create index if not exists idx_emp_suspended
  on employees(is_suspended);
create index if not exists idx_emp_heartbeat
  on employees(last_heartbeat desc);

create index if not exists idx_att_emp
  on attendance(employee_id);
create index if not exists idx_att_date
  on attendance(clock_in desc);

create index if not exists idx_sched_emp
  on schedules(employee_id);
create index if not exists idx_sched_date
  on schedules(shift_date);

create index if not exists idx_perf_emp
  on performance_records(employee_id);
create index if not exists idx_perf_date
  on performance_records(created_at desc);

create index if not exists idx_notif_emp
  on notifications(employee_id);
create index if not exists idx_notif_unread
  on notifications(employee_id,is_read)
  where is_read=false;

create index if not exists idx_feed_date
  on updates_feed(created_at desc);

create index if not exists idx_perms_emp
  on page_permissions(employee_id);

create index if not exists idx_status_hist
  on status_history(employee_id,started_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table employees
  enable row level security;
alter table attendance
  enable row level security;
alter table schedules
  enable row level security;
alter table performance_records
  enable row level security;
alter table updates_feed
  enable row level security;
alter table notifications
  enable row level security;
alter table critical_alerts
  enable row level security;
alter table queue_stats
  enable row level security;
alter table workspace_notes
  enable row level security;
alter table theme_delegations
  enable row level security;
alter table page_permissions
  enable row level security;
alter table system_settings
  enable row level security;
alter table status_history
  enable row level security;

-- ── RLS Policies ──

-- employees: كل مستخدم مسجل يرى الجميع
create policy "employees_select" on employees
  for select to authenticated using (true);

create policy "employees_update_own" on employees
  for update to authenticated
  using (auth.uid()=auth_user_id);

create policy "employees_update_admin" on employees
  for update to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role in ('Manager','Supervisor'))
    )
  );

-- attendance: كل موظف يرى سجلاته
create policy "attendance_own" on attendance
  for all to authenticated
  using (
    employee_id in (
      select id from employees
      where auth_user_id=auth.uid()
    )
  );

create policy "attendance_admin" on attendance
  for select to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role in (
             'Manager','Supervisor','HR'
           ))
    )
  );

-- notifications: كل موظف يرى إشعاراته فقط
create policy "notif_own" on notifications
  for all to authenticated
  using (
    employee_id in (
      select id from employees
      where auth_user_id=auth.uid()
    )
  );

-- workspace_notes: خاصة بكل موظف
create policy "notes_own" on workspace_notes
  for all to authenticated
  using (
    employee_id in (
      select id from employees
      where auth_user_id=auth.uid()
    )
  );

-- system_settings: قراءة للجميع
create policy "settings_select" on system_settings
  for select to authenticated using (true);

create policy "settings_admin" on system_settings
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role='Manager')
    )
  );

-- page_permissions: قراءة للجميع
create policy "perms_select" on page_permissions
  for select to authenticated using (true);

create policy "perms_admin" on page_permissions
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and e.is_owner=true
    )
  );

-- updates_feed: قراءة للجميع
create policy "feed_select" on updates_feed
  for select to authenticated using (true);

create policy "feed_insert" on updates_feed
  for insert to authenticated
  with check (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role in ('Manager','Supervisor'))
    )
  );

-- critical_alerts: قراءة للجميع
create policy "alerts_select" on critical_alerts
  for select to authenticated using (true);

create policy "alerts_admin" on critical_alerts
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and e.is_owner=true
    )
  );

-- queue_stats: قراءة للجميع
create policy "queue_select" on queue_stats
  for select to authenticated using (true);

create policy "queue_admin" on queue_stats
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role in ('Manager','Supervisor'))
    )
  );

-- schedules: قراءة للجميع
create policy "sched_select" on schedules
  for select to authenticated using (true);

create policy "sched_admin" on schedules
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role in (
             'Manager','Supervisor','HR'
           ))
    )
  );

-- performance_records: قراءة للجميع
create policy "perf_select" on performance_records
  for select to authenticated using (true);

create policy "perf_admin" on performance_records
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and (e.is_owner=true
           or e.role in (
             'Manager','Supervisor','QA'
           ))
    )
  );

-- theme_delegations: قراءة للجميع
create policy "themes_select" on theme_delegations
  for select to authenticated using (true);

create policy "themes_admin" on theme_delegations
  for all to authenticated
  using (
    exists(
      select 1 from employees e
      where e.auth_user_id=auth.uid()
      and e.is_owner=true
    )
  );

-- status_history: قراءة للجميع
create policy "status_hist_select"
  on status_history
  for select to authenticated using (true);

create policy "status_hist_own"
  on status_history
  for insert to authenticated
  with check (
    employee_id in (
      select id from employees
      where auth_user_id=auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at=now();
  return new;
end;$$;

create trigger trg_emp_updated
  before update on employees
  for each row execute function update_updated_at();

create trigger trg_feed_updated
  before update on updates_feed
  for each row execute function update_updated_at();

create trigger trg_notes_updated
  before update on workspace_notes
  for each row execute function update_updated_at();

-- Auto-log status changes
create or replace function log_status_change()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    -- إغلاق السجل القديم
    update status_history
    set ended_at=now()
    where employee_id=old.id
    and ended_at is null;
    -- فتح سجل جديد
    insert into status_history(
      employee_id,status,started_at
    ) values (
      new.id,new.status,now()
    );
    new.status_since=now();
  end if;
  return new;
end;$$;

create trigger trg_status_log
  before update on employees
  for each row execute function log_status_change();

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
drop publication if exists supabase_realtime;
create publication supabase_realtime
  for table
    employees,
    system_settings,
    page_permissions,
    notifications,
    critical_alerts,
    updates_feed,
    queue_stats,
    attendance,
    schedules,
    performance_records,
    workspace_notes,
    theme_delegations,
    status_history;
-- Master Plan — Supabase schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query) after creating the project.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  role text not null check (role in ('user','admin','super')),
  pw_hash text not null,
  created_at date not null default current_date,
  created_by text
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references users(id) on delete set null,
  dl date,
  created_at date not null default current_date,
  created_by uuid references users(id) on delete set null,
  sheet_tab_name text
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  hm text default '',
  dv text default '',
  dl date,
  acc text default '',
  st text not null default 'Chưa bắt đầu' check (st in ('Chưa bắt đầu','Đang thực hiện','Hoàn thành')),
  gc text default '',
  sheet_row_uid text
);

create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  text text default '',
  dl date,
  acc text default '',
  st text not null default 'Chưa bắt đầu' check (st in ('Chưa bắt đầu','Đang thực hiện','Hoàn thành')),
  gc text default '',
  position int not null default 0
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  action_code text not null,
  actor_name text,
  actor_role text,
  target_name text,
  detail text
);

-- Next pass (Google Sheets sync) — created now so no later migration surprise.
create table if not exists pending_sheet_projects (
  id uuid primary key default gen_random_uuid(),
  source_tab_name text not null,
  source_row_snapshot jsonb,
  detected_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected'))
);

create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_subtasks_task_id on subtasks(task_id);
create index if not exists idx_projects_owner_id on projects(owner_id);
create index if not exists idx_logs_ts on logs(ts desc);

-- Google Sheets sync — run once in the Supabase SQL editor (after schema.sql).

-- Hash of the Sheet-side content at the last sync; lets a pull tell "Sheet changed"
-- apart from "only the app changed", so it never overwrites in-app edits with stale Sheet data.
alter table tasks add column if not exists sheet_hash text;

-- One Sheet row id can only map to one task.
create unique index if not exists uq_tasks_sheet_row_uid on tasks(sheet_row_uid) where sheet_row_uid is not null;

-- One project per Sheet tab.
create unique index if not exists uq_projects_sheet_tab on projects(sheet_tab_name) where sheet_tab_name is not null;

-- One open review item per Sheet tab.
create unique index if not exists uq_pending_tab on pending_sheet_projects(source_tab_name) where status = 'pending';

-- Small key/value store: last sync time, last result, run lock.
create table if not exists sync_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

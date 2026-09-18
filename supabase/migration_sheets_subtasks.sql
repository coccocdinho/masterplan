-- Each subtask now gets its own Sheet row, so it needs its own row id + content hash.
-- Run once in the Supabase SQL editor (after migration_sheets.sql).

alter table subtasks add column if not exists sheet_row_uid text;
alter table subtasks add column if not exists sheet_hash text;

create unique index if not exists uq_subtasks_sheet_row_uid on subtasks(sheet_row_uid) where sheet_row_uid is not null;

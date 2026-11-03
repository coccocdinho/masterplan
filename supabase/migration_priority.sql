-- Project-level priority classification. Run once in the Supabase SQL editor.

alter table projects add column if not exists priority text not null default 'Bình thường'
  check (priority in ('Bình thường', 'Khẩn', 'Hỏa tốc'));

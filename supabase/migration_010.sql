-- Optional link to a shared spreadsheet (e.g. Google Sheets).

alter table public.tasks
  add column if not exists sheets_url text;

-- Adds an optional call link to tasks.

alter table public.tasks
  add column if not exists call_url text;

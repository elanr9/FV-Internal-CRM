-- FV Internal CRM, migration 002
-- Adds roles, backlog status, bug flag, daily notes, engineering RLS.

-- 1. profile.role for engineering gating
alter table public.profiles
  add column if not exists role text not null default 'member';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('member', 'admin'));

update public.profiles
  set role = 'admin'
  where email in ('elan@fieldvisionai.com', 'gabe@fieldvisionai.com');

-- 2. Backlog status
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('backlog', 'todo', 'in_progress', 'in_review', 'done'));

-- 3. Bug flag on tasks
alter table public.tasks
  add column if not exists is_bug boolean not null default false;

create index if not exists tasks_is_bug_idx on public.tasks(is_bug) where is_bug = true;

-- 4. Replace task select policy so engineering is admin-only (with carve outs)
drop policy if exists "tasks select authenticated" on public.tasks;
drop policy if exists "tasks select" on public.tasks;
create policy "tasks select"
  on public.tasks for select
  to authenticated
  using (
    workflow <> 'engineering'
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 5. Daily notes table (per user per day free text)
create table if not exists public.daily_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_notes enable row level security;

drop policy if exists "daily_notes select own" on public.daily_notes;
create policy "daily_notes select own"
  on public.daily_notes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "daily_notes insert own" on public.daily_notes;
create policy "daily_notes insert own"
  on public.daily_notes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "daily_notes update own" on public.daily_notes;
create policy "daily_notes update own"
  on public.daily_notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_notes delete own" on public.daily_notes;
create policy "daily_notes delete own"
  on public.daily_notes for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_daily_notes()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_notes_touch on public.daily_notes;
create trigger daily_notes_touch
  before update on public.daily_notes
  for each row execute function public.touch_daily_notes();

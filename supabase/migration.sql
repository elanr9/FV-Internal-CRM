-- FV Internal CRM schema
-- Paste this entire file into Supabase SQL Editor and run once.

create extension if not exists "pgcrypto";

-- =============================================================
-- profiles: one row per team member, mirrors auth.users
-- =============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable to authenticated" on public.profiles;
create policy "profiles readable to authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Auto-create a profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- tasks
-- =============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  workflow text not null check (workflow in ('engineering', 'growth', 'content')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'epic')),
  due_date date,
  position integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_workflow_idx on public.tasks(workflow);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_status_idx on public.tasks(status);

alter table public.tasks enable row level security;

drop policy if exists "tasks select authenticated" on public.tasks;
create policy "tasks select authenticated"
  on public.tasks for select
  to authenticated
  using (true);

drop policy if exists "tasks insert authenticated" on public.tasks;
create policy "tasks insert authenticated"
  on public.tasks for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "tasks update authenticated" on public.tasks;
create policy "tasks update authenticated"
  on public.tasks for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "tasks delete authenticated" on public.tasks;
create policy "tasks delete authenticated"
  on public.tasks for delete
  to authenticated
  using (auth.uid() = created_by);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- =============================================================
-- task_comments
-- =============================================================
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx on public.task_comments(task_id);

alter table public.task_comments enable row level security;

drop policy if exists "comments select authenticated" on public.task_comments;
create policy "comments select authenticated"
  on public.task_comments for select
  to authenticated
  using (true);

drop policy if exists "comments insert authenticated" on public.task_comments;
create policy "comments insert authenticated"
  on public.task_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "comments delete own" on public.task_comments;
create policy "comments delete own"
  on public.task_comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- =============================================================
-- storage bucket for task attachments
-- =============================================================
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

drop policy if exists "task attachments authenticated read" on storage.objects;
create policy "task attachments authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'task-attachments');

drop policy if exists "task attachments public read" on storage.objects;
create policy "task attachments public read"
  on storage.objects for select
  to anon
  using (bucket_id = 'task-attachments');

drop policy if exists "task attachments authenticated upload" on storage.objects;
create policy "task attachments authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'task-attachments');

drop policy if exists "task attachments authenticated delete" on storage.objects;
create policy "task attachments authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'task-attachments');

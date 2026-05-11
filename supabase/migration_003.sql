-- Adds one-off team schedule status updates.

create table if not exists public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'away' check (status in ('away', 'focus', 'travel', 'offline')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index if not exists schedule_overrides_date_idx on public.schedule_overrides(date);
create index if not exists schedule_overrides_user_date_idx on public.schedule_overrides(user_id, date);

alter table public.schedule_overrides enable row level security;

drop policy if exists "schedule overrides readable" on public.schedule_overrides;
create policy "schedule overrides readable"
  on public.schedule_overrides for select
  to authenticated
  using (true);

drop policy if exists "schedule overrides insert own" on public.schedule_overrides;
create policy "schedule overrides insert own"
  on public.schedule_overrides for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "schedule overrides update own" on public.schedule_overrides;
create policy "schedule overrides update own"
  on public.schedule_overrides for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "schedule overrides delete own" on public.schedule_overrides;
create policy "schedule overrides delete own"
  on public.schedule_overrides for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_schedule_overrides()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists schedule_overrides_touch on public.schedule_overrides;
create trigger schedule_overrides_touch
  before update on public.schedule_overrides
  for each row execute function public.touch_schedule_overrides();

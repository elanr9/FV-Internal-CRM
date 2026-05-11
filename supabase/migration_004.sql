-- Adds multiple assignees for tasks.

alter table public.tasks
  add column if not exists assignee_ids uuid[] not null default '{}';

update public.tasks
  set assignee_ids = array[assigned_to]
  where assigned_to is not null
    and cardinality(assignee_ids) = 0;

create index if not exists tasks_assignee_ids_idx on public.tasks using gin(assignee_ids);

drop policy if exists "tasks select" on public.tasks;
create policy "tasks select"
  on public.tasks for select
  to authenticated
  using (
    workflow <> 'engineering'
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or auth.uid() = any(assignee_ids)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

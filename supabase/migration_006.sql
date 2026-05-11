-- Adds individual status tracking for each task assignee.

alter table public.tasks
  add column if not exists assignee_statuses jsonb not null default '{}'::jsonb;

update public.tasks
  set assignee_statuses = (
    select coalesce(jsonb_object_agg(assignee_id, status), '{}'::jsonb)
    from unnest(assignee_ids) as assignee_id
  )
  where assignee_statuses = '{}'::jsonb
    and cardinality(assignee_ids) > 0;

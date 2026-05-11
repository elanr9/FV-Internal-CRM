-- Adds a shared workflow for feature ideas.

alter table public.tasks drop constraint if exists tasks_workflow_check;
alter table public.tasks add constraint tasks_workflow_check
  check (workflow in ('engineering', 'growth', 'content', 'feature_ideas'));

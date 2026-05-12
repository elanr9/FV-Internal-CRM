-- Adds Trav workflow for role specific work.

alter table public.tasks drop constraint if exists tasks_workflow_check;
alter table public.tasks add constraint tasks_workflow_check
  check (workflow in ('engineering', 'growth', 'content', 'trav', 'feature_ideas'));

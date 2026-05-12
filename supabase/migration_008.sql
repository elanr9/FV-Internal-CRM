-- Engineering workflow: readable by all authenticated users; inserts/updates and
-- engineering task comments restricted to profiles whose emails match engineering board editors.

-- Task policies
drop policy if exists "tasks select" on public.tasks;
create policy "tasks select"
  on public.tasks for select
  to authenticated
  using (true);

drop policy if exists "tasks insert authenticated" on public.tasks;
create policy "tasks insert authenticated"
  on public.tasks for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and (
      workflow <> 'engineering'
      or coalesce(is_bug, false) = true
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and lower(trim(p.email)) = any (
            array[
              'founders@fieldvisionai.com'::text,
              'elan@fieldvisionai.com',
              'gdiaz0618@uchicago.edu',
              'gabe@fieldvisionai.com'
            ]
          )
      )
    )
  );

drop policy if exists "tasks update authenticated" on public.tasks;
create policy "tasks update authenticated"
  on public.tasks for update
  to authenticated
  using (
    workflow <> 'engineering'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.email)) = any (
          array[
            'founders@fieldvisionai.com'::text,
            'elan@fieldvisionai.com',
            'gdiaz0618@uchicago.edu',
            'gabe@fieldvisionai.com'
          ]
        )
    )
  )
  with check (
    workflow <> 'engineering'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.email)) = any (
          array[
            'founders@fieldvisionai.com'::text,
            'elan@fieldvisionai.com',
            'gdiaz0618@uchicago.edu',
            'gabe@fieldvisionai.com'
          ]
        )
    )
  );

drop policy if exists "tasks delete authenticated" on public.tasks;
create policy "tasks delete authenticated"
  on public.tasks for delete
  to authenticated
  using (
    (
      workflow <> 'engineering'
      and auth.uid() = created_by
    )
    or (
      workflow = 'engineering'
      and (
        auth.uid() = created_by
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(trim(p.email)) = any (
              array[
                'founders@fieldvisionai.com'::text,
                'elan@fieldvisionai.com',
                'gdiaz0618@uchicago.edu',
                'gabe@fieldvisionai.com'
              ]
            )
        )
      )
    )
  );

drop policy if exists "comments insert authenticated" on public.task_comments;
create policy "comments insert authenticated"
  on public.task_comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      not exists (
        select 1
        from public.tasks t
        where t.id = task_id
          and t.workflow = 'engineering'
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and lower(trim(p.email)) = any (
            array[
              'founders@fieldvisionai.com'::text,
              'elan@fieldvisionai.com',
              'gdiaz0618@uchicago.edu',
              'gabe@fieldvisionai.com'
            ]
          )
      )
    )
  );

drop policy if exists "comments delete own" on public.task_comments;
create policy "comments delete own"
  on public.task_comments for delete
  to authenticated
  using (
    auth.uid() = author_id
    and (
      not exists (
        select 1
        from public.tasks t
        where t.id = task_id
          and t.workflow = 'engineering'
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and lower(trim(p.email)) = any (
            array[
              'founders@fieldvisionai.com'::text,
              'elan@fieldvisionai.com',
              'gdiaz0618@uchicago.edu',
              'gabe@fieldvisionai.com'
            ]
          )
      )
    )
  );

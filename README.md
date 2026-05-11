# FieldVision Internal CRM

Internal task and workflow hub for the FieldVision AI team. Built on Next.js 14, TypeScript, Tailwind, and Supabase (Auth + Postgres + Storage).

Three workflow boards (Engineering, Growth, Content) with Monday-style grouped tables, inline editing, image attachments, threaded comments, and magic-link auth.

## 1. One-time database setup

The Supabase project is already created. Run the migration once:

1. Open https://supabase.com/dashboard/project/leqymixgcnbilfgyrxhs/sql
2. Paste the contents of `supabase/migration.sql`
3. Click **Run**

That creates:
- `profiles` (auto-populated on signup via a trigger on `auth.users`)
- `tasks`
- `task_comments`
- `task-attachments` storage bucket (public-read for image previews, authenticated upload)
- RLS policies on every table

## 2. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with your work email. Supabase sends a magic link.

## 3. Deploy to Vercel

```bash
npx vercel
```

Set these env vars in the Vercel project (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://leqymixgcnbilfgyrxhs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from .env.local>
```

In the Supabase dashboard, add the Vercel deployment URL to **Authentication → URL Configuration → Site URL** and **Redirect URLs** so magic links work in production.

## 4. Project layout

```
app/
  login/                  magic link sign-in
  auth/callback/          OTP exchange route
  (app)/
    board/[workflow]/     engineering | growth | content boards
    me/assigned/          tasks assigned to me
    me/created/           tasks I created
components/
  Sidebar, BoardView, TaskTable, TaskModal, MyTasksView, Avatar, NewTaskButton
lib/
  supabase/server.ts      server client
  supabase/client.ts      browser client
  types.ts                shared types and enums
middleware.ts             auth gate
supabase/migration.sql    one-shot DB schema
```

## 5. Data model quick reference

`tasks`
- `workflow`: engineering | growth | content
- `status`: todo | in_progress | in_review | done
- `difficulty`: easy | medium | hard | epic
- `created_by`, `assigned_to`: profile ids
- `images`: text[] of public URLs in the `task-attachments` bucket
- `due_date`, `description`, `position`, timestamps

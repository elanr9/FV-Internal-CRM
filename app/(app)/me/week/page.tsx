import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import WeekView from "@/components/WeekView";
import type { DailyNote, Profile, Task, TaskWithPeople } from "@/lib/types";

export const dynamic = "force-dynamic";

function startOfWeekISO(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function endOfWeekISO(start: string): string {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export default async function MyWeekPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weekStart = startOfWeekISO();
  const weekEnd = endOfWeekISO(weekStart);

  const [{ data: tasks }, { data: profiles }, { data: notes }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .or(`assigned_to.eq.${user.id},assignee_ids.cs.{${user.id}}`)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id, email, full_name, avatar_url, role"),
    supabase
      .from("daily_notes")
      .select("user_id, date, body, updated_at")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd)
  ]);

  const team = (profiles as Profile[]) ?? [];
  const profileById = new Map(team.map((p) => [p.id, p]));
  const me = team.find((p) => p.id === user.id) ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    avatar_url: null,
    role: "member" as const
  };

  const enriched: TaskWithPeople[] = ((tasks as Task[]) ?? [])
    .filter((t) => (t.assignee_statuses?.[user.id] ?? t.status) !== "done")
    .map((t) => {
      const assigneeIds = (t.assignee_ids ?? []).length > 0 ? t.assignee_ids : t.assigned_to ? [t.assigned_to] : [];
      return {
        ...t,
        creator: profileById.get(t.created_by) ?? null,
        assignee: t.assigned_to ? profileById.get(t.assigned_to) ?? null : null,
        assignees: assigneeIds
          .map((id) => profileById.get(id))
          .filter((p): p is Profile => Boolean(p))
      };
    });

  return (
    <WeekView
      me={me}
      team={team}
      tasks={enriched}
      notes={(notes as DailyNote[]) ?? []}
      weekStart={weekStart}
    />
  );
}

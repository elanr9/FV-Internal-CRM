import { redirect } from "next/navigation";
import TeamWeekView from "@/components/TeamWeekView";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Profile, Task, TaskWithPeople } from "@/lib/types";

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
  const date = new Date(start);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}

export default async function TeamWeekPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const weekStart = startOfWeekISO();
  const weekEnd = endOfWeekISO(weekStart);

  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .neq("status", "done")
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role")
      .order("full_name", { ascending: true })
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

  const enriched: TaskWithPeople[] = ((tasks as Task[]) ?? []).map((task) => {
    const assigneeIds =
      task.assignee_ids.length > 0 ? task.assignee_ids : task.assigned_to ? [task.assigned_to] : [];

    return {
      ...task,
      creator: profileById.get(task.created_by) ?? null,
      assignee: task.assigned_to ? profileById.get(task.assigned_to) ?? null : null,
      assignees: assigneeIds
        .map((id) => profileById.get(id))
        .filter((profile): profile is Profile => Boolean(profile))
    };
  });

  return <TeamWeekView me={me} team={team} tasks={enriched} weekStart={weekStart} />;
}

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import MyTasksView from "@/components/MyTasksView";
import type { Profile, Task, TaskWithPeople } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CreatedByMePage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, full_name, avatar_url, role")
  ]);

  const team = (profiles as Profile[]) ?? [];
  const profileById = new Map(team.map((p) => [p.id, p]));
  const me = team.find((p) => p.id === user.id) ?? null;

  const enriched: TaskWithPeople[] = ((tasks as Task[]) ?? []).map((t) => ({
    ...t,
    creator: profileById.get(t.created_by) ?? null,
    assignee: t.assigned_to ? profileById.get(t.assigned_to) ?? null : null
  }));

  return (
    <MyTasksView
      title="Created by me"
      subtitle="Tasks you have authored across every workflow."
      tasks={enriched}
      team={team}
      me={me}
    />
  );
}

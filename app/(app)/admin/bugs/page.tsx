import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import BugsView from "@/components/BugsView";
import type { Profile, Task, TaskWithPeople } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BugsPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!meProfile || meProfile.role !== "admin") redirect("/me/week");

  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("is_bug", true)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, full_name, avatar_url, role")
  ]);

  const team = (profiles as Profile[]) ?? [];
  const profileById = new Map(team.map((p) => [p.id, p]));
  const me = team.find((p) => p.id === user.id) ?? null;

  const enriched: TaskWithPeople[] = ((tasks as Task[]) ?? []).map((t) => {
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

  return <BugsView tasks={enriched} team={team} me={me} />;
}

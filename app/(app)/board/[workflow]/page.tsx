import { notFound, redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { WORKFLOWS, WORKFLOW_LABEL, type Profile, type Task, type TaskWithPeople, type Workflow } from "@/lib/types";
import BoardView from "@/components/BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: { workflow: string } }) {
  const workflow = params.workflow as Workflow;
  if (!WORKFLOWS.includes(workflow)) notFound();

  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (workflow === "engineering") {
    const { data: meProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    if (!meProfile || meProfile.role !== "admin") {
      redirect("/me/week");
    }
  }

  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("workflow", workflow)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, full_name, avatar_url, role")
  ]);

  const team = (profiles as Profile[]) ?? [];
  const profileById = new Map(team.map((p) => [p.id, p]));
  const me = team.find((p) => p.id === user?.id) ?? null;

  const enriched: TaskWithPeople[] = ((tasks as Task[]) ?? []).map((t) => ({
    ...t,
    creator: profileById.get(t.created_by) ?? null,
    assignee: t.assigned_to ? profileById.get(t.assigned_to) ?? null : null
  }));

  return (
    <BoardView
      workflow={workflow}
      title={WORKFLOW_LABEL[workflow]}
      tasks={enriched}
      team={team}
      me={me}
    />
  );
}

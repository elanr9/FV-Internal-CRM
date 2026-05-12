import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { WORKFLOWS, WORKFLOW_LABEL, type Profile, type Task, type TaskWithPeople, type Workflow } from "@/lib/types";
import BoardView from "@/components/BoardView";

export const dynamic = "force-dynamic";

/** Matches login / notify mapping so the Trav board lists every task Trav is on, not only workflow trav */
const TRAV_PROFILE_EMAIL = "danielguerrero0803@gmail.com";

export default async function BoardPage({ params }: { params: { workflow: string } }) {
  const workflow = params.workflow as Workflow;
  if (!WORKFLOWS.includes(workflow)) notFound();

  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const profilesQuery = supabase.from("profiles").select("id, email, full_name, avatar_url, role");
  const baseTasksQuery = () =>
    supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

  let tasks: Task[] | null;
  let profiles;

  if (workflow === "trav") {
    const profilesRes = await profilesQuery;
    profiles = profilesRes.data;
    const teamEarly = (profiles as Profile[]) ?? [];
    const travUserId = teamEarly.find((p) => p.email === TRAV_PROFILE_EMAIL)?.id;
    let q = baseTasksQuery();
    if (travUserId) {
      q = q.or(`workflow.eq.trav,assigned_to.eq.${travUserId},assignee_ids.cs.{${travUserId}}`);
    } else {
      q = q.eq("workflow", workflow);
    }
    const tasksRes = await q;
    tasks = tasksRes.data as Task[] | null;
  } else {
    const [tasksRes, profilesRes] = await Promise.all([
      baseTasksQuery().eq("workflow", workflow),
      profilesQuery
    ]);
    tasks = tasksRes.data as Task[] | null;
    profiles = profilesRes.data;
  }

  const team = (profiles as Profile[]) ?? [];
  const profileById = new Map(team.map((p) => [p.id, p]));
  const me = team.find((p) => p.id === user?.id) ?? null;

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

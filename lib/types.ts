export type Workflow = "engineering" | "growth" | "content" | "trav" | "feature_ideas";
export type Status = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type Difficulty = "easy" | "medium" | "hard" | "epic";
export type Role = "member" | "admin";
export type AssigneeStatuses = Partial<Record<string, Status>>;

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: Role;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  workflow: Workflow;
  status: Status;
  difficulty: Difficulty;
  due_date: string | null;
  call_url: string | null;
  sheets_url: string | null;
  position: number;
  created_by: string;
  assigned_to: string | null;
  assignee_ids: string[];
  assignee_statuses: AssigneeStatuses;
  images: string[];
  is_bug: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskWithPeople = Task & {
  creator: Profile | null;
  assignee: Profile | null;
  assignees: Profile[];
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
};

export const WORKFLOWS: Workflow[] = ["engineering", "growth", "content", "trav", "feature_ideas"];

export const WORKFLOW_LABEL: Record<Workflow, string> = {
  engineering: "Engineering",
  growth: "Growth",
  content: "Content",
  trav: "Trav",
  feature_ideas: "Feature Ideas"
};

export const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done"
};

export const STATUSES: Status[] = ["backlog", "todo", "in_progress", "in_review", "done"];

const STATUS_ORDER: Record<Status, number> = {
  backlog: 0,
  todo: 1,
  in_progress: 2,
  in_review: 3,
  done: 4
};

function bottleneckStatusValues(statuses: Status[]): Status {
  return statuses.reduce((min, s) => (STATUS_ORDER[s] < STATUS_ORDER[min] ? s : min));
}

export function taskAssigneeIds(task: Pick<Task, "assignee_ids" | "assigned_to">): string[] {
  if ((task.assignee_ids ?? []).length > 0) return task.assignee_ids;
  if (task.assigned_to) return [task.assigned_to];
  return [];
}

/** Column grouping: same rule as per assignee status cells (bottleneck when several people). */
export function boardSectionStatus(task: TaskWithPeople): Status {
  const ids = taskAssigneeIds(task);
  if (ids.length === 0) return task.status;
  const statuses = ids.map((id) => task.assignee_statuses?.[id] ?? task.status);
  return bottleneckStatusValues(statuses);
}

export function bottleneckAssigneeStatus(
  assigneeIds: string[],
  assigneeStatuses: AssigneeStatuses,
  fallbackStatus: Status
): Status {
  if (assigneeIds.length === 0) return fallbackStatus;
  const statuses = assigneeIds.map((id) => assigneeStatuses[id] ?? fallbackStatus);
  return bottleneckStatusValues(statuses);
}

export function taskStatusAfterAssigneePatch(
  task: Pick<Task, "status" | "assignee_ids" | "assigned_to" | "assignee_statuses">,
  nextAssigneeStatuses: AssigneeStatuses
): Status {
  const ids = taskAssigneeIds(task);
  if (ids.length === 0) return task.status;
  const statuses = ids.map(
    (id) => nextAssigneeStatuses[id] ?? task.assignee_statuses?.[id] ?? task.status
  );
  return bottleneckStatusValues(statuses);
}

export type DailyNote = {
  user_id: string;
  date: string;
  body: string;
  updated_at: string;
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  epic: "Epic"
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];

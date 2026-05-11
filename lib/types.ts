export type Workflow = "engineering" | "growth" | "content" | "feature_ideas";
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

export const WORKFLOWS: Workflow[] = ["engineering", "growth", "content", "feature_ideas"];

export const WORKFLOW_LABEL: Record<Workflow, string> = {
  engineering: "Engineering",
  growth: "Growth",
  content: "Content",
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

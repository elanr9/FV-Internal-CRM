"use client";

import { Code2, Search, Sparkles, Video } from "lucide-react";
import { useMemo, useState } from "react";
import {
  type Difficulty,
  type Profile,
  type Status,
  STATUSES,
  STATUS_LABEL,
  type TaskWithPeople,
  type Workflow
} from "@/lib/types";
import TaskTable from "./TaskTable";

const WORKFLOW_ICON = {
  engineering: Code2,
  growth: Sparkles,
  content: Video
} as const;

const WORKFLOW_ACCENT: Record<Workflow, string> = {
  engineering: "from-brand-500 to-brand-700",
  growth: "from-emerald-500 to-emerald-700",
  content: "from-fuchsia-500 to-fuchsia-700"
};

type FilterAssignee = "all" | "unassigned" | string;
type FilterDifficulty = "all" | Difficulty;

export default function BoardView({
  workflow,
  title,
  tasks,
  team,
  me
}: {
  workflow: Workflow;
  title: string;
  tasks: TaskWithPeople[];
  team: Profile[];
  me: Profile | null;
}) {
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<FilterAssignee>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<FilterDifficulty>("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (query) {
        const q = query.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      const assigneeIds = (t.assignee_ids ?? []).length > 0 ? t.assignee_ids : t.assigned_to ? [t.assigned_to] : [];
      if (assigneeFilter === "unassigned" && assigneeIds.length > 0) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && !assigneeIds.includes(assigneeFilter)) {
        return false;
      }
      if (difficultyFilter !== "all" && t.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [tasks, query, assigneeFilter, difficultyFilter]);

  const groups = useMemo(() => {
    return STATUSES.map((status) => ({
      status,
      label: STATUS_LABEL[status],
      tasks: filtered.filter((t) => t.status === status)
    }));
  }, [filtered]);

  const Icon = WORKFLOW_ICON[workflow];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-ink-100 bg-white px-8 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-card ${WORKFLOW_ACCENT[workflow]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
            <p className="text-sm text-ink-400">
              {tasks.length} task{tasks.length === 1 ? "" : "s"} across this workflow
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="input w-72 pl-9"
            />
          </div>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value as FilterAssignee)}
            className="input w-auto"
          >
            <option value="all">All people</option>
            <option value="unassigned">Unassigned</option>
            {team.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.email}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as FilterDifficulty)}
            className="input w-auto"
          >
            <option value="all">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="epic">Epic</option>
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-[1400px] space-y-8">
          {groups.map((group) => (
            <section key={group.status}>
              <div className="mb-2 flex items-center gap-3">
                <StatusGroupBadge status={group.status} count={group.tasks.length} />
              </div>
              <TaskTable
                tasks={group.tasks}
                team={team}
                me={me}
                workflow={workflow}
                defaultStatus={group.status}
                emptyHint={`No tasks in ${group.label.toLowerCase()}.`}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusGroupBadge({ status, count }: { status: Status; count: number }) {
  const styles: Record<Status, string> = {
    backlog: "bg-ink-200 text-ink-700",
    todo: "bg-ink-100 text-ink-700",
    in_progress: "bg-brand-100 text-brand-700",
    in_review: "bg-amber-100 text-amber-800",
    done: "bg-emerald-100 text-emerald-800"
  };
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${styles[status]}`}>
      <span>{STATUS_LABEL[status]}</span>
      <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold tabular-nums">
        {count}
      </span>
    </div>
  );
}

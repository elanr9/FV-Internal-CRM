"use client";

import { useState } from "react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import clsx from "clsx";
import {
  STATUSES,
  STATUS_LABEL,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Difficulty,
  type Profile,
  type Status,
  type TaskWithPeople,
  type Workflow
} from "@/lib/types";
import Avatar from "./Avatar";
import TaskModal from "./TaskModal";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Calendar, Paperclip, MessageSquare } from "lucide-react";

type Props = {
  tasks: TaskWithPeople[];
  team: Profile[];
  me: Profile | null;
  workflow?: Workflow;
  emptyHint?: string;
  showWorkflow?: boolean;
};

export default function TaskTable({ tasks, team, me, workflow, emptyHint, showWorkflow }: Props) {
  const [open, setOpen] = useState<TaskWithPeople | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="card flex items-center justify-center p-8 text-sm text-ink-400">
        {emptyHint ?? "No tasks yet."}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              <th className="w-1 border-b border-ink-100 px-4 py-3" />
              <th className="border-b border-ink-100 px-4 py-3 text-left">Task</th>
              {showWorkflow && (
                <th className="border-b border-ink-100 px-4 py-3 text-left">Workflow</th>
              )}
              <th className="border-b border-ink-100 px-4 py-3 text-left">Status</th>
              <th className="border-b border-ink-100 px-4 py-3 text-left">Owner</th>
              <th className="border-b border-ink-100 px-4 py-3 text-left">Difficulty</th>
              <th className="border-b border-ink-100 px-4 py-3 text-left">Due</th>
              <th className="border-b border-ink-100 px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                team={team}
                showWorkflow={showWorkflow}
                onOpen={() => setOpen(task)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {open && me && (
        <TaskModal
          mode="edit"
          task={open}
          team={team}
          me={me}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function TaskRow({
  task,
  team,
  showWorkflow,
  onOpen
}: {
  task: TaskWithPeople;
  team: Profile[];
  showWorkflow?: boolean;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(fields: Partial<TaskWithPeople>) {
    setBusy(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("tasks").update(fields).eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.refresh();
  }

  const due = task.due_date ? parseISO(task.due_date) : null;
  const hasAttachments = task.images.length > 0;

  return (
    <tr
      className={clsx(
        "group border-b border-ink-100 transition hover:bg-brand-50/40",
        busy && "opacity-60"
      )}
    >
      <td className="px-1">
        <StatusPill status={task.status} compact />
      </td>
      <td className="max-w-[480px] px-4 py-3">
        <button onClick={onOpen} className="flex w-full items-center gap-2.5 text-left">
          <span className="font-medium text-ink-900 group-hover:text-brand-700">
            {task.title}
          </span>
          <span className="flex items-center gap-1.5 text-ink-400">
            {hasAttachments && (
              <span className="inline-flex items-center gap-0.5 text-xs">
                <Paperclip className="h-3 w-3" />
                {task.images.length}
              </span>
            )}
          </span>
        </button>
        {task.description && (
          <div className="mt-0.5 line-clamp-1 text-xs text-ink-400">{task.description}</div>
        )}
      </td>
      {showWorkflow && (
        <td className="px-4 py-3">
          <WorkflowChip workflow={task.workflow} />
        </td>
      )}
      <td className="px-4 py-3">
        <StatusSelect
          value={task.status}
          onChange={(status) => patch({ status })}
        />
      </td>
      <td className="px-4 py-3">
        <AssigneeSelect
          value={task.assigned_to}
          team={team}
          onChange={(assigned_to) => patch({ assigned_to })}
        />
      </td>
      <td className="px-4 py-3">
        <DifficultySelect
          value={task.difficulty}
          onChange={(difficulty) => patch({ difficulty })}
        />
      </td>
      <td className="px-4 py-3">
        <DueDate
          value={task.due_date}
          onChange={(due_date) => patch({ due_date })}
        />
      </td>
      <td className="px-4 py-3 text-xs text-ink-400">
        {format(parseISO(task.created_at), "MMM d")}
      </td>
    </tr>
  );
}

function WorkflowChip({ workflow }: { workflow: Workflow }) {
  const map: Record<Workflow, string> = {
    engineering: "bg-brand-50 text-brand-700",
    growth: "bg-emerald-50 text-emerald-700",
    content: "bg-fuchsia-50 text-fuchsia-700"
  };
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize", map[workflow])}>
      {workflow}
    </span>
  );
}

function StatusPill({ status, compact }: { status: Status; compact?: boolean }) {
  const colors: Record<Status, string> = {
    backlog: "bg-ink-300",
    todo: "bg-ink-200",
    in_progress: "bg-brand-500",
    in_review: "bg-amber-500",
    done: "bg-emerald-500"
  };
  if (compact) {
    return <div className={clsx("ml-3 h-7 w-1.5 rounded-full", colors[status])} />;
  }
  return (
    <span className={clsx("h-2 w-2 rounded-full", colors[status])} />
  );
}

function StatusSelect({
  value,
  onChange
}: {
  value: Status;
  onChange: (v: Status) => void;
}) {
  const styles: Record<Status, string> = {
    backlog: "bg-ink-100 text-ink-600",
    todo: "bg-ink-100 text-ink-700",
    in_progress: "bg-brand-100 text-brand-700",
    in_review: "bg-amber-100 text-amber-800",
    done: "bg-emerald-100 text-emerald-800"
  };
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        className={clsx(
          "cursor-pointer appearance-none rounded-full px-3 py-1 pr-7 text-xs font-semibold outline-none",
          styles[value]
        )}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <Caret />
    </div>
  );
}

function DifficultySelect({
  value,
  onChange
}: {
  value: Difficulty;
  onChange: (v: Difficulty) => void;
}) {
  const styles: Record<Difficulty, string> = {
    easy: "bg-emerald-50 text-emerald-700",
    medium: "bg-brand-50 text-brand-700",
    hard: "bg-amber-50 text-amber-800",
    epic: "bg-rose-50 text-rose-700"
  };
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Difficulty)}
        className={clsx(
          "cursor-pointer appearance-none rounded-full px-3 py-1 pr-7 text-xs font-semibold outline-none",
          styles[value]
        )}
      >
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {DIFFICULTY_LABEL[d]}
          </option>
        ))}
      </select>
      <Caret />
    </div>
  );
}

function AssigneeSelect({
  value,
  team,
  onChange
}: {
  value: string | null;
  team: Profile[];
  onChange: (v: string | null) => void;
}) {
  const current = team.find((p) => p.id === value) ?? null;
  return (
    <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-full px-1 py-0.5 hover:bg-ink-50">
      <Avatar profile={current} size={26} />
      <span className="text-xs font-medium text-ink-700">
        {current ? current.full_name ?? current.email.split("@")[0] : "Unassigned"}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">Unassigned</option>
        {team.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name ?? p.email}
          </option>
        ))}
      </select>
    </label>
  );
}

function DueDate({
  value,
  onChange
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const date = value ? parseISO(value) : null;
  let label = "Set date";
  let tone = "text-ink-400 hover:text-ink-700";
  if (date) {
    if (isToday(date)) {
      label = "Today";
      tone = "text-amber-700 bg-amber-50";
    } else if (isTomorrow(date)) {
      label = "Tomorrow";
      tone = "text-brand-700 bg-brand-50";
    } else if (isPast(date)) {
      label = format(date, "MMM d");
      tone = "text-rose-700 bg-rose-50";
    } else {
      label = format(date, "MMM d");
      tone = "text-ink-700 bg-ink-50";
    }
  }
  return (
    <label className={clsx("relative inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      <Calendar className="h-3.5 w-3.5" />
      {label}
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function Caret() {
  return (
    <svg
      className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-current opacity-60"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path d="M3 4.5L6 8l3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

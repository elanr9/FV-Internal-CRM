"use client";

import { useRef, useState } from "react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import clsx from "clsx";
import {
  STATUSES,
  STATUS_LABEL,
  WORKFLOW_LABEL,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Difficulty,
  type Profile,
  type Status,
  type TaskWithPeople,
  type Workflow
} from "@/lib/types";
import Avatar, { profileColor } from "./Avatar";
import TaskModal from "./TaskModal";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Calendar, Paperclip, Plus } from "lucide-react";

const DATE_YEAR = "2026";
const MIN_DATE = `${DATE_YEAR}-01-01`;
const MAX_DATE = `${DATE_YEAR}-12-31`;

type Props = {
  tasks: TaskWithPeople[];
  team: Profile[];
  me: Profile | null;
  workflow?: Workflow;
  defaultStatus?: Status;
  emptyHint?: string;
  showWorkflow?: boolean;
};

export default function TaskTable({ tasks, team, me, workflow, defaultStatus = "todo", emptyHint, showWorkflow }: Props) {
  const [open, setOpen] = useState<TaskWithPeople | null>(null);
  const [creating, setCreating] = useState(false);
  const canAdd = Boolean(me && workflow);
  const isIdeaList = workflow === "feature_ideas" && !showWorkflow;
  const columnCount = isIdeaList ? 5 : showWorkflow ? 9 : 8;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ink-50/60 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              <th className="w-1 border-b border-ink-100 px-4 py-3" />
              <th className="border-b border-ink-100 px-4 py-3 text-left">{isIdeaList ? "Idea" : "Task"}</th>
              {!isIdeaList && showWorkflow && (
                <th className="border-b border-ink-100 px-4 py-3 text-left">Workflow</th>
              )}
              {!isIdeaList && <th className="border-b border-ink-100 px-4 py-3 text-left">Status</th>}
              <th className="border-b border-ink-100 px-4 py-3 text-left">Given by</th>
              {!isIdeaList && <th className="border-b border-ink-100 px-4 py-3 text-left">Assignees</th>}
              {!isIdeaList && <th className="border-b border-ink-100 px-4 py-3 text-left">Difficulty</th>}
              {!isIdeaList && <th className="border-b border-ink-100 px-4 py-3 text-left">Due</th>}
              <th className="border-b border-ink-100 px-4 py-3 text-left">Created</th>
              {isIdeaList && <th className="border-b border-ink-100 px-4 py-3 text-left">Action</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-sm text-ink-400">
                  {emptyHint ?? "No tasks yet."}
                </td>
              </tr>
            )}
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                me={me}
                showWorkflow={showWorkflow}
                ideaList={isIdeaList}
                onOpen={() => setOpen(task)}
              />
            ))}
            {canAdd && (
              <tr>
                <td className="px-1" />
                <td colSpan={columnCount - 1} className="px-4 py-2">
                  <button
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-400 transition hover:bg-ink-50 hover:text-brand-700"
                  >
                    <Plus className="h-4 w-4" />
                    {workflow === "feature_ideas" ? "Add idea" : "Add task"}
                  </button>
                </td>
              </tr>
            )}
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

      {creating && me && workflow && (
        <TaskModal
          mode="create"
          team={team}
          me={me}
          defaultWorkflow={workflow}
          defaultStatus={defaultStatus}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function TaskRow({
  task,
  me,
  showWorkflow,
  ideaList,
  onOpen
}: {
  task: TaskWithPeople;
  me: Profile | null;
  showWorkflow?: boolean;
  ideaList?: boolean;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(fields: Partial<TaskWithPeople>, successMessage?: string) {
    setBusy(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("tasks").update(fields).eq("id", task.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (successMessage) toast.success(successMessage);
    router.refresh();
  }

  function addToEngineeringBacklog() {
    patch(
      {
        workflow: "engineering",
        status: "backlog",
        assigned_to: null,
        assignee_ids: [],
        assignee_statuses: {},
        due_date: null
      },
      "Idea added to engineering backlog"
    );
  }

  function assigneeStatus(profileId: string): Status {
    return task.assignee_statuses?.[profileId] ?? task.status;
  }

  function patchAssigneeStatus(profileId: string, status: Status) {
    patch({
      assignee_statuses: {
        ...(task.assignee_statuses ?? {}),
        [profileId]: status
      }
    });
  }

  const due = task.due_date ? parseISO(task.due_date) : null;
  const hasAttachments = task.images.length > 0;
  const assignees = (task.assignees ?? []).length > 0 ? task.assignees : task.assignee ? [task.assignee] : [];

  if (ideaList) {
    return (
      <tr
        className={clsx(
          "group border-b border-ink-100 transition hover:bg-brand-50/40",
          busy && "opacity-60"
        )}
      >
        <td className="px-1" />
        <td className="max-w-[640px] px-4 py-3">
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
        <td className="px-4 py-3">
          <AssignorDisplay task={task} />
        </td>
        <td className="px-4 py-3 text-xs text-ink-400">
          {format(parseISO(task.created_at), "MMM d")}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={addToEngineeringBacklog}
            disabled={busy}
            className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add to engineering backlog
          </button>
        </td>
      </tr>
    );
  }

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
        <ProgressCell
          assignees={assignees}
          me={me}
          taskStatus={task.status}
          getStatus={assigneeStatus}
          onTaskStatusChange={(status) => patch({ status })}
          onAssigneeStatusChange={patchAssigneeStatus}
        />
      </td>
      <td className="px-4 py-3">
        <AssignorDisplay task={task} />
      </td>
      <td className="px-4 py-3">
        <AssigneesDisplay task={task} onClick={onOpen} />
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

function ProgressCell({
  assignees,
  me,
  taskStatus,
  getStatus,
  onTaskStatusChange,
  onAssigneeStatusChange
}: {
  assignees: Profile[];
  me: Profile | null;
  taskStatus: Status;
  getStatus: (profileId: string) => Status;
  onTaskStatusChange: (status: Status) => void;
  onAssigneeStatusChange: (profileId: string, status: Status) => void;
}) {
  if (assignees.length === 0) {
    return <StatusSelect value={taskStatus} onChange={onTaskStatusChange} />;
  }

  return (
    <div className="space-y-1.5">
      {assignees.map((profile) => {
        const status = getStatus(profile.id);
        const name = profile.full_name ?? profile.email.split("@")[0];
        return (
          <div key={profile.id} className="flex items-center gap-2">
            <Avatar profile={profile} size={22} />
            <span className="max-w-20 truncate text-xs font-semibold text-ink-600">{name}</span>
            {me?.id === profile.id ? (
              <StatusSelect value={status} onChange={(next) => onAssigneeStatusChange(profile.id, next)} />
            ) : (
              <StatusBadge status={status} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewTaskRow({
  team,
  me,
  workflow,
  defaultStatus,
  showWorkflow,
  onCancel,
  onCreated
}: {
  team: Profile[];
  me: Profile;
  workflow: Workflow;
  defaultStatus: Status;
  showWorkflow?: boolean;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [assignedTo, setAssignedTo] = useState<string | null>(me.id);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const creatingRef = useRef(false);

  async function createTask() {
    if (creatingRef.current) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      onCancel();
      return;
    }

    creatingRef.current = true;
    setBusy(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("tasks").insert({
      title: cleanTitle,
      description: null,
      workflow,
      status,
      difficulty,
      due_date: dueDate,
      assigned_to: assignedTo,
      assignee_ids: assignedTo ? [assignedTo] : [],
      assignee_statuses: assignedTo ? { [assignedTo]: status } : {},
      images: [],
      created_by: me.id
    });
    setBusy(false);

    if (error) {
      creatingRef.current = false;
      toast.error(error.message);
      return;
    }

    toast.success("Task created");
    onCreated();
    router.refresh();
  }

  return (
    <tr className={clsx("border-b border-ink-100 bg-brand-50/30", busy && "opacity-60")}>
      <td className="px-1">
        <StatusPill status={status} compact />
      </td>
      <td className="max-w-[480px] px-4 py-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={createTask}
          onKeyDown={(e) => {
            if (e.key === "Enter") createTask();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Task title"
          className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-ink-900 outline-none focus:border-brand-500"
          disabled={busy}
        />
      </td>
      {showWorkflow && (
        <td className="px-4 py-3">
          <WorkflowChip workflow={workflow} />
        </td>
      )}
      <td className="px-4 py-3">
        <StatusSelect value={status} onChange={setStatus} />
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-ink-500">
        You
      </td>
      <td className="px-4 py-3">
        <AssigneeSelect value={assignedTo} team={team} onChange={setAssignedTo} />
      </td>
      <td className="px-4 py-3">
        <DifficultySelect value={difficulty} onChange={setDifficulty} />
      </td>
      <td className="px-4 py-3">
        <DueDate value={dueDate} onChange={setDueDate} />
      </td>
      <td className="px-4 py-3 text-xs text-ink-400">
        New
      </td>
    </tr>
  );
}

function WorkflowChip({ workflow }: { workflow: Workflow }) {
  const map: Record<Workflow, string> = {
    engineering: "bg-brand-50 text-brand-700",
    growth: "bg-emerald-50 text-emerald-700",
    content: "bg-fuchsia-50 text-fuchsia-700",
    feature_ideas: "bg-amber-50 text-amber-700"
  };
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize", map[workflow])}>
      {WORKFLOW_LABEL[workflow]}
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

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    backlog: "bg-ink-100 text-ink-600",
    todo: "bg-ink-100 text-ink-700",
    in_progress: "bg-brand-100 text-brand-700",
    in_review: "bg-amber-100 text-amber-800",
    done: "bg-emerald-100 text-emerald-800"
  };
  return (
    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", styles[status])}>
      {STATUS_LABEL[status]}
    </span>
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
  const color = current ? profileColor(current) : null;
  return (
    <label
      className={clsx(
        "relative inline-flex cursor-pointer items-center gap-2 rounded-full px-1.5 py-0.5 transition",
        color ? `${color.soft} ${color.text}` : "hover:bg-ink-50"
      )}
    >
      <Avatar profile={current} size={26} />
      <span className="text-xs font-semibold">
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

function AssignorDisplay({ task }: { task: TaskWithPeople }) {
  const name = task.creator?.full_name ?? task.creator?.email.split("@")[0] ?? "Unknown";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar profile={task.creator} size={24} />
      <span className="max-w-24 truncate text-xs font-semibold text-ink-700">
        {name}
      </span>
    </span>
  );
}

function AssigneesDisplay({ task, onClick }: { task: TaskWithPeople; onClick: () => void }) {
  const assignees = (task.assignees ?? []).length > 0 ? task.assignees : task.assignee ? [task.assignee] : [];
  const firstName = assignees[0]?.full_name ?? assignees[0]?.email.split("@")[0];
  const label = assignees.length > 1 ? `${firstName} +${assignees.length - 1}` : firstName;
  if (assignees.length === 0) {
    return (
      <button onClick={onClick} className="text-xs font-semibold text-ink-400 hover:text-brand-700">
        No assignee
      </button>
    );
  }

  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-left">
      <span className="flex -space-x-1">
        {assignees.slice(0, 3).map((p) => (
          <span key={p.id} className="rounded-full ring-2 ring-white">
            <Avatar profile={p} size={26} />
          </span>
        ))}
      </span>
      <span className="max-w-32 truncate text-xs font-semibold text-ink-700">
        {label}
      </span>
      {assignees.length > 3 && (
        <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
          +{assignees.length - 3}
        </span>
      )}
    </button>
  );
}

function DueDate({
  value,
  onChange
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputValue = dateInCurrentYear(value ?? "");
  const date = inputValue ? parseISO(inputValue) : null;
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
        value={inputValue}
        min={MIN_DATE}
        max={MAX_DATE}
        onChange={(e) => onChange(dateInCurrentYear(e.target.value) || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function dateInCurrentYear(value: string) {
  if (!value) return "";
  const [, month, day] = value.split("-");
  if (!month || !day) return value;
  return `${DATE_YEAR}-${month}-${day}`;
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

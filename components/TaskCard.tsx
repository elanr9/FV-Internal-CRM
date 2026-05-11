"use client";

import clsx from "clsx";
import { format, isPast, isToday, parseISO } from "date-fns";
import { Calendar, Paperclip } from "lucide-react";
import type { Status, TaskWithPeople, Workflow } from "@/lib/types";
import Avatar from "./Avatar";

const WORKFLOW_DOT: Record<Workflow, string> = {
  engineering: "bg-brand-500",
  growth: "bg-emerald-500",
  content: "bg-fuchsia-500"
};

const STATUS_PILL: Record<Status, string> = {
  backlog: "bg-ink-100 text-ink-700",
  todo: "bg-ink-100 text-ink-700",
  in_progress: "bg-brand-100 text-brand-700",
  in_review: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800"
};

const STATUS_LABEL_SHORT: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done"
};

export default function TaskCard({
  task,
  onClick
}: {
  task: TaskWithPeople;
  onClick: () => void;
}) {
  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due ? isPast(due) && !isToday(due) && task.status !== "done" : false;

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col items-stretch rounded-2xl border border-ink-100 bg-white p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop"
    >
      <div className="flex items-start gap-2">
        <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", WORKFLOW_DOT[task.workflow])} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-semibold text-ink-900 group-hover:text-brand-700">
            {task.title}
          </div>
          {task.description && (
            <div className="mt-0.5 line-clamp-1 text-xs text-ink-400">{task.description}</div>
          )}
        </div>
        {task.assignee && <Avatar profile={task.assignee} size={22} />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={clsx("inline-flex rounded-full px-2 py-0.5 font-semibold", STATUS_PILL[task.status])}>
          {STATUS_LABEL_SHORT[task.status]}
        </span>
        {due && (
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              overdue
                ? "bg-rose-50 text-rose-700"
                : isToday(due)
                ? "bg-amber-50 text-amber-700"
                : "bg-ink-50 text-ink-700"
            )}
          >
            <Calendar className="h-3 w-3" />
            {format(due, "MMM d")}
          </span>
        )}
        {task.images.length > 0 && (
          <span className="inline-flex items-center gap-1 text-ink-400">
            <Paperclip className="h-3 w-3" />
            {task.images.length}
          </span>
        )}
        {task.is_bug && (
          <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
            Bug
          </span>
        )}
      </div>
    </button>
  );
}

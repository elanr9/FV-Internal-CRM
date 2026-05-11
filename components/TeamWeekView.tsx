"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { addDays, format, isToday, parseISO } from "date-fns";
import { Users } from "lucide-react";
import { STATUS_LABEL, type Profile, type Status, type TaskWithPeople, type Workflow } from "@/lib/types";
import Avatar from "./Avatar";
import TaskModal from "./TaskModal";

type Props = {
  me: Profile;
  team: Profile[];
  tasks: TaskWithPeople[];
  weekStart: string;
};

const WORKFLOW_DOT: Record<Workflow, string> = {
  engineering: "bg-brand-500",
  growth: "bg-emerald-500",
  content: "bg-fuchsia-500",
  feature_ideas: "bg-amber-500"
};

const STATUS_TONE: Record<Status, string> = {
  backlog: "bg-ink-100 text-ink-700",
  todo: "bg-ink-100 text-ink-700",
  in_progress: "bg-brand-100 text-brand-700",
  in_review: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800"
};

export default function TeamWeekView({ me, team, tasks, weekStart }: Props) {
  const [openTask, setOpenTask] = useState<TaskWithPeople | null>(null);

  const days = useMemo(() => {
    const start = parseISO(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const tasksByPersonAndDate = useMemo(() => {
    const map = new Map<string, Map<string, TaskWithPeople[]>>();

    for (const task of tasks) {
      if (!task.due_date) continue;

      const dateKey = task.due_date.slice(0, 10);
      const assigneeIds =
        task.assignee_ids.length > 0 ? task.assignee_ids : task.assigned_to ? [task.assigned_to] : [];

      for (const assigneeId of assigneeIds) {
        if ((task.assignee_statuses?.[assigneeId] ?? task.status) === "done") continue;
        if (!map.has(assigneeId)) map.set(assigneeId, new Map());
        const tasksByDate = map.get(assigneeId)!;
        if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, []);
        tasksByDate.get(dateKey)!.push(task);
      }
    }

    return map;
  }, [tasks]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-ink-100 bg-white px-8 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-brand-700 text-white shadow-card">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Team week</h1>
            <p className="text-sm text-ink-400">
              {format(days[0], "MMM d")} to {format(days[6], "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto min-w-[1100px] max-w-[1500px] space-y-4">
          <div className="grid grid-cols-[220px_repeat(7,minmax(120px,1fr))] gap-3">
            <div />
            {days.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={clsx(
                    "rounded-2xl border bg-white px-3 py-2 shadow-card",
                    today ? "border-brand-300 text-brand-700" : "border-ink-100 text-ink-700"
                  )}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    {format(day, "EEE")}
                  </div>
                  <div className="text-lg font-bold">{format(day, "d")}</div>
                </div>
              );
            })}
          </div>

          {team.map((person) => {
            const personTasks = tasksByPersonAndDate.get(person.id);
            return (
              <div
                key={person.id}
                className="grid grid-cols-[220px_repeat(7,minmax(120px,1fr))] gap-3 rounded-3xl bg-white p-3 shadow-card"
              >
                <div className="flex items-center gap-3 rounded-2xl bg-ink-50 px-3 py-3">
                  <Avatar profile={person} size={34} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink-900">
                      {person.full_name ?? person.email.split("@")[0]}
                    </div>
                    <div className="truncate text-xs text-ink-400">{person.email}</div>
                  </div>
                </div>

                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayTasks = personTasks?.get(key) ?? [];
                  return (
                    <div key={key} className="min-h-[118px] rounded-2xl border border-ink-100 bg-ink-50 p-2">
                      {dayTasks.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs font-medium text-ink-300">
                          No tasks
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {dayTasks.map((task) => (
                            <TeamTaskButton
                              key={`${person.id}-${key}-${task.id}`}
                              task={task}
                              personId={person.id}
                              onClick={() => setOpenTask(task)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {openTask && (
        <TaskModal mode="edit" task={openTask} team={team} me={me} onClose={() => setOpenTask(null)} />
      )}
    </div>
  );
}

function TeamTaskButton({
  task,
  personId,
  onClick
}: {
  task: TaskWithPeople;
  personId: string;
  onClick: () => void;
}) {
  const status = task.assignee_statuses?.[personId] ?? task.status;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-ink-100 bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-brand-300 hover:shadow-card"
    >
      <div className="flex items-start gap-2">
        <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", WORKFLOW_DOT[task.workflow])} />
        <span className="line-clamp-2 text-xs font-semibold text-ink-900">{task.title}</span>
      </div>
      <span className={clsx("mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_TONE[status])}>
        {STATUS_LABEL[status]}
      </span>
    </button>
  );
}

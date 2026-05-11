"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { addDays, format, isToday, parseISO } from "date-fns";
import { Calendar as CalIcon, Inbox, Plus } from "lucide-react";
import type { DailyNote, Profile, TaskWithPeople } from "@/lib/types";
import DailyNotes from "./DailyNotes";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";

type Props = {
  me: Profile;
  team: Profile[];
  tasks: TaskWithPeople[];
  notes: DailyNote[];
  weekStart: string;
};

export default function WeekView({ me, team, tasks, notes, weekStart }: Props) {
  const [openTask, setOpenTask] = useState<TaskWithPeople | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = parseISO(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithPeople[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, DailyNote>();
    for (const n of notes) map.set(n.date.slice(0, 10), n);
    return map;
  }, [notes]);

  const unscheduled = useMemo(() => tasks.filter((t) => !t.due_date), [tasks]);

  const todayKey = days.find((d) => isToday(d));
  const todayNote = todayKey ? notesByDate.get(format(todayKey, "yyyy-MM-dd")) : undefined;
  const todayTasks = todayKey ? tasksByDate.get(format(todayKey, "yyyy-MM-dd")) ?? [] : [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-ink-100 bg-white px-8 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
            <CalIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">My week</h1>
            <p className="text-sm text-ink-400">
              {format(days[0], "MMM d")} to {format(days[6], "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-[1400px] space-y-8">
          {todayKey && (
            <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-1 shadow-pop">
              <div className="rounded-[1.375rem] bg-white p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-brand-600">
                      Today
                    </div>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-900">
                      {format(todayKey, "EEEE, MMM d")}
                    </h2>
                  </div>
                  <button
                    onClick={() => setCreatingFor(format(todayKey, "yyyy-MM-dd"))}
                    className="btn-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add task for today
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      Assigned to you today
                    </div>
                    {todayTasks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-400">
                        Nothing scheduled for today. Breathe, focus, ship.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {todayTasks.map((t) => (
                          <TaskCard key={t.id} task={t} onClick={() => setOpenTask(t)} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      Today&apos;s notes
                    </div>
                    <DailyNotes
                      me={me}
                      date={format(todayKey, "yyyy-MM-dd")}
                      initial={todayNote?.body ?? ""}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-500">
              This week
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayTasks = tasksByDate.get(key) ?? [];
                const today = isToday(day);
                return (
                  <div
                    key={key}
                    className={clsx(
                      "card flex min-h-[180px] flex-col p-3",
                      today && "ring-2 ring-brand-500 ring-offset-2 ring-offset-ink-50"
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <div
                        className={clsx(
                          "text-[11px] font-bold uppercase tracking-wider",
                          today ? "text-brand-600" : "text-ink-400"
                        )}
                      >
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={clsx(
                          "text-lg font-bold",
                          today ? "text-brand-700" : "text-ink-900"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                    <div className="mt-2 flex-1 space-y-1.5">
                      {dayTasks.length === 0 ? (
                        <button
                          onClick={() => setCreatingFor(key)}
                          className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-ink-200 py-3 text-[11px] font-medium text-ink-400 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      ) : (
                        dayTasks.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setOpenTask(t)}
                            className="block w-full rounded-lg border border-ink-100 bg-white px-2 py-1.5 text-left transition hover:border-brand-300 hover:shadow-card"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={clsx(
                                  "h-1.5 w-1.5 shrink-0 rounded-full",
                                  t.workflow === "engineering" && "bg-brand-500",
                                  t.workflow === "growth" && "bg-emerald-500",
                                  t.workflow === "content" && "bg-fuchsia-500"
                                )}
                              />
                              <span className="line-clamp-1 text-xs font-medium text-ink-900">
                                {t.title}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">
                Unscheduled assigned to you
              </h3>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-500">
                {unscheduled.length}
              </span>
            </div>
            {unscheduled.length === 0 ? (
              <div className="card flex items-center justify-center p-8 text-sm text-ink-400">
                Everything on your plate has a date. Nicely done.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {unscheduled.map((t) => (
                  <TaskCard key={t.id} task={t} onClick={() => setOpenTask(t)} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {openTask && (
        <TaskModal
          mode="edit"
          task={openTask}
          team={team}
          me={me}
          onClose={() => setOpenTask(null)}
        />
      )}

      {creatingFor && (
        <TaskModal
          mode="create"
          team={team}
          me={me}
          defaultDueDate={creatingFor}
          defaultAssignedTo={me.id}
          onClose={() => setCreatingFor(null)}
        />
      )}
    </div>
  );
}

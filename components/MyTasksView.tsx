"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  WORKFLOWS,
  WORKFLOW_LABEL,
  type Profile,
  type TaskWithPeople,
  type Workflow
} from "@/lib/types";
import TaskTable from "./TaskTable";

export default function MyTasksView({
  title,
  subtitle,
  tasks,
  team,
  me
}: {
  title: string;
  subtitle: string;
  tasks: TaskWithPeople[];
  team: Profile[];
  me: Profile | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return tasks;
    const q = query.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tasks, query]);

  const groups = useMemo(
    () =>
      WORKFLOWS.map((workflow) => ({
        workflow,
        tasks: filtered.filter((t) => t.workflow === workflow)
      })).filter((g) => g.tasks.length > 0),
    [filtered]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-ink-100 bg-white px-4 pb-4 pt-4 md:px-8 md:pb-5 md:pt-7">
        <h1 className="text-xl font-bold tracking-tight text-ink-900 md:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-ink-400">{subtitle}</p>
        <div className="relative mt-4 md:mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks"
            className="input min-h-[44px] w-full pl-9 md:max-w-xs"
          />
        </div>
      </header>

      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto max-w-[1400px] space-y-8">
          {groups.length === 0 && (
            <div className="card flex items-center justify-center p-12 text-sm text-ink-400">
              Nothing here yet.
            </div>
          )}
          {groups.map((g) => (
            <section key={g.workflow}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-500">
                {WORKFLOW_LABEL[g.workflow as Workflow]}
              </h2>
              <TaskTable tasks={g.tasks} team={team} me={me} workflow={g.workflow} showWorkflow={false} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

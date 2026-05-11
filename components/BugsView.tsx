"use client";

import { useMemo, useState } from "react";
import { Bug, Search } from "lucide-react";
import type { Profile, TaskWithPeople } from "@/lib/types";
import TaskTable from "./TaskTable";

export default function BugsView({
  tasks,
  team,
  me
}: {
  tasks: TaskWithPeople[];
  team: Profile[];
  me: Profile | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return tasks;
    const q = query.toLowerCase();
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tasks, query]);

  const open = filtered.filter((t) => t.status !== "done");
  const resolved = filtered.filter((t) => t.status === "done");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-ink-100 bg-white px-8 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Bug reports</h1>
            <p className="text-sm text-ink-400">
              {open.length} open, {resolved.length} resolved
            </p>
          </div>
        </div>
        <div className="mt-5 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bug reports"
            className="input w-72 pl-9"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-[1400px] space-y-8">
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-500">
              Open bugs
            </h2>
            <TaskTable
              tasks={open}
              team={team}
              me={me}
              emptyHint="No open bugs. Beautiful."
            />
          </section>

          {resolved.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-500">
                Resolved
              </h2>
              <TaskTable tasks={resolved} team={team} me={me} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Status = "idle" | "saving" | "saved" | "error";

export default function DailyNotes({
  me,
  date,
  initial,
  compact
}: {
  me: Profile;
  date: string;
  initial: string;
  compact?: boolean;
}) {
  const supabase = getSupabaseBrowser();
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | null>(null);
  const lastSaved = useRef(initial);

  useEffect(() => {
    setValue(initial);
    lastSaved.current = initial;
    setStatus("idle");
  }, [initial, date]);

  function schedule(next: string) {
    if (timer.current) window.clearTimeout(timer.current);
    setStatus("saving");
    timer.current = window.setTimeout(() => save(next), 700);
  }

  async function save(next: string) {
    if (next === lastSaved.current) {
      setStatus("idle");
      return;
    }
    const { error } = await supabase.from("daily_notes").upsert(
      { user_id: me.id, date, body: next },
      { onConflict: "user_id,date" }
    );
    if (error) {
      setStatus("error");
      return;
    }
    lastSaved.current = next;
    setStatus("saved");
    window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          schedule(e.target.value);
        }}
        onBlur={() => save(value)}
        placeholder="Top focus, side tasks, ideas..."
        rows={compact ? 4 : 8}
        className={clsx(
          "w-full resize-y rounded-2xl border border-ink-100 bg-ink-50/50 p-4 text-sm leading-relaxed text-ink-900 placeholder-ink-300 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100",
          compact && "min-h-[120px]"
        )}
      />
      <div className="absolute right-3 top-3 text-[11px] font-medium">
        {status === "saving" && (
          <span className="inline-flex items-center gap-1 text-ink-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving
          </span>
        )}
        {status === "saved" && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        {status === "error" && <span className="text-rose-600">Retry</span>}
      </div>
    </div>
  );
}

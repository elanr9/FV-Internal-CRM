import TeamScheduleView from "@/components/TeamScheduleView";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { ScheduleOverride } from "@/components/TeamScheduleView";

export default async function TeamSchedulePage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const today = new Date();
  const weekStart = startOfWeek(today).toISOString().slice(0, 10);
  const weekEnd = addDays(startOfWeek(today), 6).toISOString().slice(0, 10);

  const [{ data: profiles }, { data: overrides }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role")
      .order("full_name", { ascending: true }),
    supabase
      .from("schedule_overrides")
      .select("id, user_id, date, start_time, end_time, status, note")
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
  ]);

  const team = (profiles as Profile[]) ?? [];
  const me = team.find((p) => p.id === user?.id) ?? {
    id: user?.id ?? "",
    email: user?.email ?? "",
    full_name: null,
    avatar_url: null,
    role: "member" as const
  };

  return <TeamScheduleView team={team} me={me} overrides={(overrides as ScheduleOverride[]) ?? []} />;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

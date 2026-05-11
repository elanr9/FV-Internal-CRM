"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CalendarPlus, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import Avatar, { profileColor } from "./Avatar";

type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type Status = "away" | "focus" | "travel" | "offline";

export type ScheduleOverride = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: Status;
  note: string | null;
};

type CalendarEvent = {
  id: string;
  userId: string;
  email: string;
  name: string;
  day: Day;
  date?: string;
  start: number;
  end: number;
  label: string;
  status: Status;
  note?: string | null;
  temporary?: boolean;
};

type PersonSchedule = {
  email: string;
  name: string;
  location?: string;
  blocks: Pick<CalendarEvent, "id" | "day" | "start" | "end" | "label">[];
};

const DAYS: { key: Day; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" }
];

const HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);
const DAY_START_MINUTES = HOURS[0] * 60;
const DAY_END_MINUTES = (HOURS[HOURS.length - 1] + 1) * 60;
const DATE_YEAR = "2026";
const MIN_DATE = `${DATE_YEAR}-01-01`;
const MAX_DATE = `${DATE_YEAR}-12-31`;

const TEAM_SCHEDULES: PersonSchedule[] = [
  { email: "elan@fieldvisionai.com", name: "Elan", blocks: [] },
  { email: "gabe@fieldvisionai.com", name: "Gabe", blocks: [] },
  { email: "tona@fieldvisionai.com", name: "Tona", location: "Barcelona", blocks: [] },
  {
    email: "lucho@fieldvisionai.com",
    name: "Lucho",
    blocks: [
      {
        id: "lucho-practice",
        day: "mon",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      },
      {
        id: "lucho-practice-tue",
        day: "tue",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      },
      {
        id: "lucho-practice-wed",
        day: "wed",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      },
      {
        id: "lucho-practice-thu",
        day: "thu",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      },
      {
        id: "lucho-practice-fri",
        day: "fri",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      },
      {
        id: "lucho-practice-sat",
        day: "sat",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      },
      {
        id: "lucho-practice-sun",
        day: "sun",
        start: 9 * 60 + 30,
        end: 11 * 60 + 30,
        label: "Practice"
      }
    ]
  },
  {
    email: "sebas@fieldvisionai.com",
    name: "Sebas",
    blocks: DAYS.slice(0, 5).map((day) => ({
      id: `sebas-training-${day.key}`,
      day: day.key,
      start: 18 * 60 + 30,
      end: 20 * 60 + 30,
      label: "USL 2 training"
    }))
  },
  {
    email: "fabri@fieldvisionai.com",
    name: "Fabri",
    blocks: [
      ...DAYS.slice(0, 5).map((day) => ({
        id: `fabri-practice-${day.key}`,
        day: day.key,
        start: 9 * 60,
        end: 12 * 60,
        label: "Soccer practice"
      })),
      {
        id: "fabri-baller",
        day: "thu" as Day,
        start: 16 * 60 + 30,
        end: 20 * 60,
        label: "Baller league"
      },
      {
        id: "fabri-game",
        day: "sat" as Day,
        start: 16 * 60 + 30,
        end: 23 * 60,
        label: "Game window"
      }
    ]
  }
];

export default function TeamScheduleView({
  team,
  me,
  overrides
}: {
  team: Profile[];
  me: Profile;
  overrides: ScheduleOverride[];
}) {
  const router = useRouter();
  const today = new Date();
  const weekStart = startOfWeek(today);
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(dateInCurrentYear(toDateInput(addDays(today, 1))));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [status, setStatus] = useState<Status>("away");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ id: string; startTime: string; endTime: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const profileByEmail = useMemo(
    () => new Map(team.map((p) => [p.email.toLowerCase(), p])),
    [team]
  );
  const profileById = useMemo(() => new Map(team.map((p) => [p.id, p])), [team]);

  const events = useMemo(() => {
    const recurring: CalendarEvent[] = TEAM_SCHEDULES.flatMap((person) => {
      const profile = profileByEmail.get(person.email);
      return person.blocks.map((block) => ({
        ...block,
        userId: profile?.id ?? person.email,
        email: person.email,
        name: person.name,
        status: "away" as Status
      }));
    });

    const temporary: CalendarEvent[] = overrides.flatMap((item) => {
      const profile = profileById.get(item.user_id);
      const day = dayFromDate(item.date);
      if (!profile || !day) return [];
      return [{
        id: item.id,
        userId: item.user_id,
        email: profile.email,
        name: profile.full_name ?? profile.email.split("@")[0],
        day,
        date: item.date,
        start: timeToMinutes(item.start_time),
        end: timeToMinutes(item.end_time),
        label: item.note || STATUS_LABEL[item.status],
        status: item.status,
        note: item.note,
        temporary: true
      }];
    });

    return [...recurring, ...temporary];
  }, [overrides, profileByEmail, profileById]);

  const currentEvents = events.filter((event) => isNow(event, today));

  async function saveStatus() {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      toast.error("End time must be after start time");
      return;
    }

    if (startMinutes < DAY_START_MINUTES || endMinutes > DAY_END_MINUTES) {
      toast.error("Choose a time between 7 AM and 11 PM");
      return;
    }

    setBusy(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("schedule_overrides").insert({
      user_id: me.id,
      date,
      start_time: startTime,
      end_time: endTime,
      status,
      note: note.trim() || null
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Status added");
    setFormOpen(false);
    setNote("");
    router.refresh();
  }

  async function removeStatus(id: string) {
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("schedule_overrides").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.refresh();
  }

  async function updateStatusTime() {
    if (!editingEvent) return;
    const startMinutes = timeToMinutes(editingEvent.startTime);
    const endMinutes = timeToMinutes(editingEvent.endTime);

    if (startMinutes >= endMinutes) {
      toast.error("End time must be after start time");
      return;
    }

    if (startMinutes < DAY_START_MINUTES || endMinutes > DAY_END_MINUTES) {
      toast.error("Choose a time between 7 AM and 11 PM");
      return;
    }

    setUpdatingId(editingEvent.id);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase
      .from("schedule_overrides")
      .update({ start_time: editingEvent.startTime, end_time: editingEvent.endTime })
      .eq("id", editingEvent.id)
      .eq("user_id", me.id);
    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEditingEvent(null);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-50">
      <header className="border-b border-ink-100 bg-white px-8 pb-4 pt-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Team schedule</h1>
            <p className="mt-1 text-sm text-ink-400">
              A weekly calendar for who is active, away, or unavailable.
            </p>
          </div>
          <button onClick={() => setFormOpen((v) => !v)} className="btn-primary">
            <CalendarPlus className="h-4 w-4" />
            Update status
          </button>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {TEAM_SCHEDULES.map((person) => {
            const profile = profileByEmail.get(person.email) ?? null;
            const activeEvent = currentEvents.find((event) => event.email === person.email);
            const color = profile ? profileColor(profile) : profileColor(person.email);

            return (
              <div key={person.email} className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-3 py-2 shadow-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar profile={profile} size={30} title={person.name} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink-900">{person.name}</div>
                    <div className="truncate text-xs text-ink-400">
                      {activeEvent ? activeEvent.label : person.location ? person.location : "Active"}
                    </div>
                  </div>
                </div>
                <span className={clsx("rounded-full px-2.5 py-1 text-xs font-bold", activeEvent ? statusClass(activeEvent.status) : `${color.soft} ${color.text}`)}>
                  {activeEvent ? STATUS_LABEL[activeEvent.status] : "Active"}
                </span>
              </div>
            );
          })}
        </div>

        {formOpen && (
          <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_120px_120px_130px_1.5fr_auto]">
              <input
                type="date"
                value={date}
                min={MIN_DATE}
                max={MAX_DATE}
                onChange={(e) => setDate(dateInCurrentYear(e.target.value))}
                className="input bg-white"
              />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input bg-white" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input bg-white" />
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input bg-white">
                <option value="away">Away</option>
                <option value="focus">Focus</option>
                <option value="travel">Travel</option>
                <option value="offline">Offline</option>
              </select>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Soccer, class, meeting..." className="input bg-white" />
              <button onClick={saveStatus} disabled={busy} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="mx-auto min-w-[1100px] max-w-[1500px] overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
          <div className="grid grid-cols-[72px_repeat(7,minmax(130px,1fr))] border-b border-ink-100 bg-white">
            <div className="border-r border-ink-100 p-3 text-xs font-semibold text-ink-400">Time</div>
            {DAYS.map((day, index) => (
              <div key={day.key} className="border-r border-ink-100 p-3 last:border-r-0">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-400">{day.label}</div>
                <div className="mt-0.5 text-lg font-bold text-ink-900">{formatDay(addDays(weekStart, index))}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(130px,1fr))]">
            <div className="border-r border-ink-100">
              {HOURS.map((hour) => (
                <div key={hour} className="h-20 border-b border-ink-100 px-3 py-2 text-xs font-medium text-ink-400">
                  {formatTime(hour * 60)}
                </div>
              ))}
            </div>

            {DAYS.map((day) => {
              const dayEvents = events
                .filter((event) => event.day === day.key && event.end > DAY_START_MINUTES && event.start < DAY_END_MINUTES)
                .sort((a, b) => a.start - b.start);

              return (
                <div key={day.key} className="relative overflow-hidden border-r border-ink-100 last:border-r-0">
                  {HOURS.map((hour) => (
                    <div key={hour} className="h-20 border-b border-ink-100 bg-white" />
                  ))}
                  {dayEvents.map((event) => {
                    const profile = profileByEmail.get(event.email) ?? profileById.get(event.userId) ?? null;
                    const color = profile ? profileColor(profile) : profileColor(event.email);
                    const visibleStart = Math.max(event.start, DAY_START_MINUTES);
                    const visibleEnd = Math.min(event.end, DAY_END_MINUTES);
                    const top = ((visibleStart - DAY_START_MINUTES) / 60) * 80;
                    const height = Math.max(((visibleEnd - visibleStart) / 60) * 80, 34);
                    const canEdit = event.temporary && event.userId === me.id;
                    const isEditing = editingEvent?.id === event.id;

                    return (
                      <div
                        key={`${event.id}-${event.day}`}
                        className={clsx(
                          "absolute left-2 right-2 overflow-hidden rounded-xl border px-2 py-1.5 text-xs shadow-sm",
                          event.temporary ? statusClass(event.status) : `${color.soft} ${color.text} border-current/10`
                        )}
                        style={{ top, height }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-bold">{event.name}</div>
                            <div className="truncate font-semibold">{event.label}</div>
                            {isEditing ? (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <input
                                  type="time"
                                  value={editingEvent.startTime}
                                  onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                                  className="w-[82px] rounded-md border border-current/20 bg-white/70 px-1 py-0.5 text-[11px]"
                                />
                                <input
                                  type="time"
                                  value={editingEvent.endTime}
                                  onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                                  className="w-[82px] rounded-md border border-current/20 bg-white/70 px-1 py-0.5 text-[11px]"
                                />
                                <button onClick={updateStatusTime} disabled={updatingId === event.id} className="rounded-md bg-white/70 px-1.5 py-0.5 font-bold">
                                  Save
                                </button>
                                <button onClick={() => setEditingEvent(null)} className="rounded-md bg-white/70 px-1.5 py-0.5 font-bold">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="opacity-80">
                                {formatTime(event.start)} to {formatTime(event.end)}
                              </div>
                            )}
                          </div>
                          {canEdit && !isEditing && (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                onClick={() =>
                                  setEditingEvent({
                                    id: event.id,
                                    startTime: minutesToTimeInput(event.start),
                                    endTime: minutesToTimeInput(event.end)
                                  })
                                }
                                className="rounded px-1 py-0.5 text-[11px] font-bold hover:bg-white/50"
                              >
                                Edit
                              </button>
                              <button onClick={() => removeStatus(event.id)} title="Remove status" className="rounded p-0.5 hover:bg-white/50">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-[1500px] rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-500 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-ink-400" />
            Tona is full time from Barcelona. The calendar is shown in Miami time.
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Status, string> = {
  away: "Away",
  focus: "Focus",
  travel: "Travel",
  offline: "Offline"
};

function statusClass(status: Status) {
  const styles: Record<Status, string> = {
    away: "border-amber-200 bg-amber-50 text-amber-800",
    focus: "border-brand-200 bg-brand-50 text-brand-700",
    travel: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    offline: "border-rose-200 bg-rose-50 text-rose-700"
  };
  return styles[status];
}

function isNow(event: CalendarEvent, now: Date) {
  const day = DAYS[(now.getDay() + 6) % 7].key;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return event.day === day && minutes >= event.start && minutes < event.end;
}

function dayFromDate(date: string): Day | null {
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  return DAYS[(value.getDay() + 6) % 7].key;
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

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateInCurrentYear(value: string) {
  if (!value) return "";
  const [, month, day] = value.split("-");
  if (!month || !day) return value;
  return `${DATE_YEAR}-${month}-${day}`;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTimeInput(minutes: number) {
  const hour = Math.floor(minutes / 60).toString().padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour}${minute ? `:${minute.toString().padStart(2, "0")}` : ""} ${suffix}`;
}

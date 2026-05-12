"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addDays, format, formatDistanceToNow, parseISO, startOfDay } from "date-fns";
import { X, Trash2, Upload, Loader2, Send, ExternalLink } from "lucide-react";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  STATUSES,
  STATUS_LABEL,
  WORKFLOWS,
  WORKFLOW_LABEL,
  type AssigneeStatuses,
  type Difficulty,
  type Profile,
  type Status,
  type TaskComment,
  type TaskWithPeople,
  type Workflow
} from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { canEditEngineeringBoard } from "@/lib/engineering-board";
import Avatar from "./Avatar";

const DATE_YEAR = "2026";

type Props =
  | {
      mode: "create";
      team: Profile[];
      me: Profile;
      task?: undefined;
      defaultWorkflow?: Workflow;
      defaultStatus?: Status;
      defaultDueDate?: string;
      defaultAssignedTo?: string;
      onClose: () => void;
    }
  | {
      mode: "edit";
      team: Profile[];
      me: Profile;
      task: TaskWithPeople;
      defaultWorkflow?: undefined;
      defaultStatus?: undefined;
      defaultDueDate?: undefined;
      defaultAssignedTo?: undefined;
      onClose: () => void;
    };

export default function TaskModal(props: Props) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.task : null;
  const engineeringViewOnly =
    isEdit && Boolean(initial?.workflow === "engineering" && !canEditEngineeringBoard(props.me));

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [workflow, setWorkflow] = useState<Workflow>(
    initial?.workflow ??
      props.defaultWorkflow ??
      (canEditEngineeringBoard(props.me) ? "engineering" : "growth")
  );
  const [status, setStatus] = useState<Status>(initial?.status ?? props.defaultStatus ?? "todo");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "medium");
  const [dueDate, setDueDate] = useState<string>(dateInCurrentYear(initial?.due_date ?? props.defaultDueDate ?? ""));
  const [callUrl, setCallUrl] = useState(initial?.call_url ?? "");
  const [sheetsUrl, setSheetsUrl] = useState(initial?.sheets_url ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    initial
      ? (initial.assignee_ids ?? []).length > 0
        ? initial.assignee_ids
        : initial.assigned_to
          ? [initial.assigned_to]
          : []
      : props.defaultWorkflow === "feature_ideas"
        ? []
        : [props.defaultAssignedTo ?? props.me.id].filter(Boolean)
  );
  const [assigneeStatuses, setAssigneeStatuses] = useState<AssigneeStatuses>(
    initial?.assignee_statuses ?? {}
  );
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFeatureIdea = workflow === "feature_ideas";

  const upcomingWeekDays = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  useEffect(() => {
    if (!isEdit || !initial) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("task_comments")
        .select("id, task_id, author_id, body, created_at, author:author_id ( id, email, full_name, avatar_url )")
        .eq("task_id", initial.id)
        .order("created_at", { ascending: true });
      if (!cancelled && data) {
        setComments(
          (data as unknown as TaskComment[]).map((c) => ({
            ...c,
            author: c.author ?? null
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, initial, supabase]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);

  async function save() {
    if (engineeringViewOnly) return;
    if (!title.trim()) {
      toast.error(isFeatureIdea ? "Give the idea a title." : "Give the task a title.");
      return;
    }
    setBusy(true);

    const nextAssigneeStatuses = Object.fromEntries(
      assigneeIds.map((id) => [id, assigneeStatuses[id] ?? status])
    ) as AssigneeStatuses;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      workflow,
      status,
      difficulty,
      due_date: dueDate || null,
      call_url: normalizeHttpUrl(callUrl),
      sheets_url: normalizeHttpUrl(sheetsUrl),
      assigned_to: assigneeIds[0] ?? null,
      assignee_ids: assigneeIds,
      assignee_statuses: nextAssigneeStatuses,
      images
    };

    if (isEdit && initial) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", initial.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success(isFeatureIdea ? "Idea updated" : "Task updated");
      const previous = new Set(
        (initial.assignee_ids ?? []).length > 0
          ? initial.assignee_ids
          : initial.assigned_to
            ? [initial.assigned_to]
            : []
      );
      assigneeIds
        .filter((id) => !previous.has(id))
        .forEach((assigneeId) => notify({ kind: "task_assigned", taskId: initial.id, assigneeId }));
    } else {
      const { data: created, error } = await supabase
        .from("tasks")
        .insert({ ...payload, created_by: props.me.id })
        .select("id")
        .single();
      setBusy(false);
      if (error || !created) return toast.error(error?.message ?? (isFeatureIdea ? "Failed to create idea" : "Failed to create task"));
      toast.success(isFeatureIdea ? "Idea created" : "Task created");
      notify({ kind: "task_created", taskId: created.id });
    }

    router.refresh();
    props.onClose();
  }

  function notify(payload: Record<string, unknown>) {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => {
      if (prev.includes(id)) return prev.filter((assigneeId) => assigneeId !== id);
      setAssigneeStatuses((current) => ({ ...current, [id]: status }));
      return [...prev, id];
    });
  }

  function setAssigneeStatus(id: string, nextStatus: Status) {
    setAssigneeStatuses((current) => ({ ...current, [id]: nextStatus }));
  }

  async function remove() {
    if (!isEdit || !initial || engineeringViewOnly) return;
    if (!confirm("Delete this task forever?")) return;
    setBusy(true);
    const { error } = await supabase.from("tasks").delete().eq("id", initial.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    router.refresh();
    props.onClose();
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0 || engineeringViewOnly) return;
    setUploading(true);
    const next: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${props.me.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("task-attachments").upload(path, file, {
        contentType: file.type || "image/png",
        upsert: false
      });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
      next.push(data.publicUrl);
    }
    setImages((prev) => [...prev, ...next]);
    setUploading(false);
  }

  async function postComment() {
    if (!isEdit || !initial || !newComment.trim() || engineeringViewOnly) return;
    setPostingComment(true);
    const body = newComment.trim();
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id: initial.id, author_id: props.me.id, body })
      .select("id, task_id, author_id, body, created_at")
      .single();
    setPostingComment(false);
    if (error || !data) return toast.error(error?.message ?? "Failed to post comment");
    setComments((prev) => [
      ...prev,
      { ...(data as TaskComment), author: props.me }
    ]);
    setNewComment("");
    toast.success("Comment posted");
    notify({ kind: "comment_posted", taskId: initial.id, commentBody: body });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-pop">
        <header className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="text-sm font-semibold text-ink-400">
            {isEdit ? (isFeatureIdea ? "Edit idea" : "Edit task") : isFeatureIdea ? "New idea" : "New task"}
          </div>
          <button onClick={props.onClose} className="rounded-full p-1.5 hover:bg-ink-100">
            <X className="h-4 w-4 text-ink-500" />
          </button>
        </header>

        <div className="grid max-h-[calc(100vh-200px)] grid-cols-1 overflow-y-auto md:grid-cols-[1fr_280px]">
          <div className="space-y-5 px-6 py-5">
            <input
              autoFocus={!engineeringViewOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={engineeringViewOnly}
              placeholder={isFeatureIdea ? "What should we build?" : "What needs to be done?"}
              className="w-full bg-transparent text-2xl font-bold tracking-tight text-ink-900 placeholder-ink-300 outline-none read-only:text-ink-700 read-only:pointer-events-none"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={engineeringViewOnly}
              placeholder={
                isFeatureIdea
                  ? "Add context, impact, links, or examples..."
                  : "Add description, context, links, acceptance criteria..."
              }
              rows={5}
              className="input min-h-[120px] resize-y read-only:pointer-events-none"
            />

            <div>
              <SectionLabel>Call link</SectionLabel>
              <input
                type="url"
                value={callUrl}
                onChange={(e) => setCallUrl(e.target.value)}
                readOnly={engineeringViewOnly}
                placeholder="Google Calendar or Zoom link"
                className="input read-only:pointer-events-none"
              />
              {normalizeHttpUrl(callUrl) && (
                <a
                  href={normalizeHttpUrl(callUrl) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open call link
                </a>
              )}
            </div>

            <div>
              <SectionLabel>Shared sheet</SectionLabel>
              <input
                type="url"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                readOnly={engineeringViewOnly}
                placeholder="Google Sheets link for the team"
                className="input read-only:pointer-events-none"
              />
              {normalizeHttpUrl(sheetsUrl) && (
                <a
                  href={normalizeHttpUrl(sheetsUrl) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open sheet
                </a>
              )}
            </div>

            <div>
              <SectionLabel>Attachments</SectionLabel>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((url, i) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-ink-100 bg-ink-50"
                  >
                    <img src={url} alt="attachment" className="h-full w-full object-cover" />
                    {!engineeringViewOnly && (
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 rounded-full bg-ink-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {!engineeringViewOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-ink-200 text-ink-400 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
                    >
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => uploadFiles(e.target.files)}
                    />
                  </>
                )}
              </div>
            </div>

            {isEdit && initial && (
              <div>
                <SectionLabel>Comments</SectionLabel>
                <p className="mb-3 text-xs text-ink-400">
                  Comments email the task owner and assignees.
                </p>
                <div className="space-y-3">
                  {comments.length === 0 && (
                    <div className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-xs text-ink-400">
                      No comments yet. Be the first to add one.
                    </div>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar profile={c.author} size={30} />
                      <div className="flex-1 rounded-xl bg-ink-50 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-ink-900">
                            {c.author?.full_name ?? c.author?.email ?? "Teammate"}
                          </div>
                          <div className="text-[11px] text-ink-400">
                            {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{c.body}</p>
                      </div>
                    </div>
                  ))}
                  {!engineeringViewOnly && (
                  <div className="flex gap-2">
                    <Avatar profile={props.me} size={30} />
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            postComment();
                          }
                        }}
                        placeholder="Write a comment..."
                        className="input"
                      />
                      <button
                        onClick={postComment}
                        disabled={postingComment || !newComment.trim()}
                        className="btn-primary px-3 py-2"
                      >
                        {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  )}
                  {engineeringViewOnly && (
                    <p className="text-xs text-ink-400">Only engineering editors can add comments.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4 border-t border-ink-100 bg-ink-50/40 px-6 py-5 md:border-l md:border-t-0">
            <Field label="Workflow">
              <select
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value as Workflow)}
                disabled={engineeringViewOnly}
                className="input disabled:cursor-not-allowed disabled:opacity-60"
              >
                {WORKFLOWS.filter(
                  (w) =>
                    w !== "engineering" ||
                    canEditEngineeringBoard(props.me) ||
                    workflow === "engineering"
                ).map((w) => (
                  <option key={w} value={w}>
                    {WORKFLOW_LABEL[w]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                disabled={engineeringViewOnly}
                className="input disabled:cursor-not-allowed disabled:opacity-60"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                disabled={engineeringViewOnly}
                className="input disabled:cursor-not-allowed disabled:opacity-60"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <SectionLabel>Assignees</SectionLabel>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-ink-100 bg-white p-2">
                {props.team.map((p) => (
                  <label
                    key={p.id}
                    className={clsx(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700",
                      engineeringViewOnly ? "cursor-default opacity-80" : "cursor-pointer hover:bg-ink-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(p.id)}
                      onChange={() => toggleAssignee(p.id)}
                      disabled={engineeringViewOnly}
                      className="h-4 w-4 rounded border-ink-300 text-brand-600 disabled:cursor-not-allowed"
                    />
                    <Avatar profile={p} size={24} />
                    <span className="truncate">{p.full_name ?? p.email}</span>
                  </label>
                ))}
                {props.team.length === 0 && (
                  <div className="px-2 py-3 text-sm text-ink-400">No teammates yet.</div>
                )}
              </div>
            </div>

            {assigneeIds.length > 0 && (
              <div>
                <SectionLabel>Progress</SectionLabel>
                <div className="space-y-2 rounded-xl border border-ink-100 bg-white p-2">
                  {assigneeIds.map((id) => {
                    const profile = props.team.find((p) => p.id === id) ?? null;
                    const currentStatus = assigneeStatuses[id] ?? status;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <Avatar profile={profile} size={24} />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-700">
                          {profile?.full_name ?? profile?.email ?? "Teammate"}
                        </span>
                        {props.me.id === id && !engineeringViewOnly ? (
                          <select
                            value={currentStatus}
                            onChange={(e) => setAssigneeStatus(id, e.target.value as Status)}
                            className="input w-auto py-1 text-xs"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
                            {STATUS_LABEL[currentStatus]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <SectionLabel>Due date</SectionLabel>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {upcomingWeekDays.map((day) => {
                  const value = dateInCurrentYear(format(day, "yyyy-MM-dd"));
                  const selected = Boolean(dueDate && dueDate === value);
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={engineeringViewOnly}
                      onClick={() => setDueDate(selected ? "" : value)}
                      title={format(day, "EEEE, MMMM d")}
                      className={clsx(
                        "flex min-h-[3rem] flex-col items-center justify-center rounded-full border px-0.5 py-1 text-center transition sm:min-h-[3.25rem]",
                        selected
                          ? "border-brand-500 bg-brand-600 text-white shadow-sm"
                          : "border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    >
                      <span
                        className={clsx(
                          "text-[8px] font-bold uppercase leading-none sm:text-[9px]",
                          selected ? "text-white/90" : "text-ink-400"
                        )}
                      >
                        {format(day, "EEE")}
                      </span>
                      <span className="mt-0.5 text-sm font-bold leading-none sm:text-base">{format(day, "d")}</span>
                    </button>
                  );
                })}
              </div>
              {dueDate &&
                !upcomingWeekDays.some(
                  (d) => dateInCurrentYear(format(d, "yyyy-MM-dd")) === dueDate
                ) &&
                !engineeringViewOnly && (
                  <p className="mt-2 text-[11px] text-ink-400">
                    Due date is outside this week. Pick a day above or save to keep it.
                  </p>
                )}
            </div>

            {isEdit && initial && (
              <div className="rounded-xl bg-white p-3 text-xs text-ink-500">
                <div className="flex items-center gap-2">
                  <Avatar profile={initial.creator} size={20} />
                  <span>
                    Given by{" "}
                    <span className="font-semibold text-ink-900">
                      {initial.creator?.full_name ?? initial.creator?.email ?? "Unknown"}
                    </span>
                  </span>
                </div>
                <div className="mt-1 text-ink-400">
                  {format(parseISO(initial.created_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            )}
          </aside>
        </div>

        <footer className="flex items-center justify-between border-t border-ink-100 bg-white px-6 py-3.5">
          <div>
            {isEdit && !engineeringViewOnly && (
              <button onClick={remove} className="btn-ghost text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={props.onClose} className="btn-secondary">
              {engineeringViewOnly ? "Close" : "Cancel"}
            </button>
            {!engineeringViewOnly && (
              <button onClick={save} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEdit ? "Save changes" : "Create task"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
      {children}
    </div>
  );
}

function dateInCurrentYear(value: string) {
  if (!value) return "";
  const [, month, day] = value.split("-");
  if (!month || !day) return value;
  return `${DATE_YEAR}-${month}-${day}`;
}

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

const FROM = "Field Vision <founders@fieldvisionai.com>";

const REAL_EMAIL_BY_HANDLE: Record<string, string> = {
  elan: "founders@fieldvisionai.com",
  founders: "founders@fieldvisionai.com",
  fabri: "fabri@fieldvisionai.com",
  gabe: "gdiaz0618@uchicago.edu",
  gaby: "gdiaz0618@uchicago.edu",
  tona: "tonasanchezboss@gmail.com",
  lucho: "founders@fieldvisionai.com",
  sebas: "founders@fieldvisionai.com",
  trav: "danielguerrero0803@gmail.com"
};

type TaskAssignedBody = {
  kind: "task_assigned";
  taskId: string;
  assigneeId: string;
};

type CommentPostedBody = {
  kind: "comment_posted";
  taskId: string;
  commentBody: string;
};

type TaskCreatedBody = {
  kind: "task_created";
  taskId: string;
};

type Body = TaskAssignedBody | CommentPostedBody | TaskCreatedBody;

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, skipped: "no_api_key" }, { status: 200 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { data: taskRow, error: taskErr } = await supabase
    .from("tasks")
    .select("id, title, description, workflow, due_date, assigned_to, assignee_ids, created_by")
    .eq("id", body.taskId)
    .maybeSingle();
  if (taskErr || !taskRow) {
    return NextResponse.json({ ok: false, error: "task_not_found" }, { status: 404 });
  }

  const { data: teamRaw } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url");
  const team: Profile[] = (teamRaw as Profile[]) ?? [];

  const me = team.find((p) => p.id === user.id) ?? null;
  const meName = me?.full_name || me?.email || "A teammate";

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, "");
  const link = `${appUrl}/board/${taskRow.workflow}`;

  const resend = new Resend(apiKey);
  const recipients = new Map<string, { profile: Profile; email: string }>();
  const add = (p: Profile | null | undefined) => {
    if (!p) return;
    if (p.id === user.id) return;
    const email = getDeliverableEmail(p);
    if (!email) return;
    recipients.set(email, { profile: p, email });
  };

  let subject = "";
  let intro = "";
  let snippet = "";
  let snippetLabel = "Description";

  if (body.kind === "task_assigned") {
    const assignee = team.find((p) => p.id === body.assigneeId);
    add(assignee);
    subject = `${meName} gave you a task: ${taskRow.title}`;
    intro = `${meName} gave you a task:`;
    snippet = taskRow.description ?? "";
  } else if (body.kind === "task_created") {
    const mentioned = findMentions(`${taskRow.title}\n${taskRow.description ?? ""}`, team);
    mentioned.forEach(add);
    getAssigneeIds(taskRow.assignee_ids, taskRow.assigned_to).forEach((id) => add(team.find((p) => p.id === id)));
    subject = `${meName} gave you a task: ${taskRow.title}`;
    intro = `${meName} gave you a task:`;
    snippet = taskRow.description ?? "";
  } else if (body.kind === "comment_posted") {
    const mentioned = findMentions(body.commentBody, team);
    mentioned.forEach(add);
    if (taskRow.created_by && taskRow.created_by !== user.id) {
      add(team.find((p) => p.id === taskRow.created_by));
    }
    getAssigneeIds(taskRow.assignee_ids, taskRow.assigned_to).forEach((id) => add(team.find((p) => p.id === id)));
    subject = `${meName} left a comment: ${taskRow.title}`;
    intro = `${meName} left a comment on a task you are part of.`;
    snippet = body.commentBody;
    snippetLabel = "Comment";
  } else {
    return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });
  }

  if (recipients.size === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const sends = Array.from(recipients.values()).map(async ({ profile, email }) => {
    const html = renderEmail({
      recipientName: profile.full_name || email,
      intro,
      title: taskRow.title,
      snippet,
      snippetLabel,
      dueDate: taskRow.due_date,
      link
    });
    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html,
        text: `${intro}\n\nTask: ${taskRow.title}\n${snippet ? `\n${snippetLabel}: ${snippet}\n` : ""}\nDue date: ${formatDueDate(taskRow.due_date)}\n\nOpen in CRM: ${link}`
      });
      return true;
    } catch (e) {
      console.error("resend send failed", e);
      return false;
    }
  });

  const results = await Promise.all(sends);
  return NextResponse.json({ ok: true, sent: results.filter(Boolean).length });
}

function getAssigneeIds(assigneeIds: string[] | null | undefined, assignedTo: string | null): string[] {
  if (assigneeIds && assigneeIds.length > 0) return assigneeIds;
  return assignedTo ? [assignedTo] : [];
}

function getDeliverableEmail(profile: Profile): string | null {
  const email = profile.email.toLowerCase();
  const handle = email.split("@")[0];
  const nameHandle = profile.full_name?.trim().split(/\s+/)[0]?.toLowerCase();
  if (nameHandle === "lucho" || nameHandle === "sebas") return "founders@fieldvisionai.com";
  const mappedEmail = REAL_EMAIL_BY_HANDLE[handle];
  if (mappedEmail) return mappedEmail;
  if (email.endsWith("@fieldvisionai.com")) return null;
  return profile.email;
}

function formatDueDate(dueDate: string | null | undefined) {
  if (!dueDate) return "No due date";
  const [year, month, day] = dueDate.split("-");
  if (!year || !month || !day) return dueDate;
  return `${month}/${day}/${year}`;
}

function findMentions(text: string, team: Profile[]): Profile[] {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z][a-zA-Z0-9._-]{1,30})/g);
  if (!matches) return [];
  const handles = Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
  const hits: Profile[] = [];
  for (const handle of handles) {
    const p = team.find((t) => {
      const name = (t.full_name || "").toLowerCase();
      const emailHandle = t.email.split("@")[0].toLowerCase();
      if (emailHandle === handle) return true;
      if (emailHandle.startsWith(handle)) return true;
      if (!name) return false;
      const tokens = name.split(/\s+/);
      return tokens.some((tok) => tok === handle || tok.startsWith(handle));
    });
    if (p && !hits.find((h) => h.id === p.id)) hits.push(p);
  }
  return hits;
}

function renderEmail({
  recipientName,
  intro,
  title,
  snippet,
  snippetLabel,
  dueDate,
  link
}: {
  recipientName: string;
  intro: string;
  title: string;
  snippet: string;
  snippetLabel: string;
  dueDate: string | null;
  link: string;
}) {
  const safeSnippet = snippet
    ? `<div style="font-size:12px;font-weight:700;color:#64748b;margin:18px 0 6px">${escapeHtml(
        snippetLabel
      )}</div><div style="padding:14px 16px;background:#f6f7fb;border-radius:12px;color:#374151;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(
        snippet
      )}</div>`
    : "";
  const safeDueDate = escapeHtml(formatDueDate(dueDate));
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,Inter,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 1px 2px rgba(15,23,42,0.04)">
    <div style="font-size:13px;color:#64748b;margin-bottom:8px">Field Vision</div>
    <div style="font-size:18px;font-weight:700;margin-bottom:4px">Hi ${escapeHtml(recipientName)}</div>
    <div style="font-size:14px;color:#475569;margin-bottom:18px">${escapeHtml(intro)}</div>
    <div style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 6px">Task</div>
    <div style="font-size:16px;font-weight:700;margin-bottom:4px;color:#0f172a">${escapeHtml(title)}</div>
    ${safeSnippet}
    <div style="font-size:12px;font-weight:700;color:#64748b;margin:18px 0 6px">Due date</div>
    <div style="font-size:14px;color:#0f172a;margin-bottom:20px">${safeDueDate}</div>
    <a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:10px;font-size:14px;font-weight:700">Open in CRM</a>
    <div style="margin-top:24px;font-size:12px;color:#94a3b8">You are receiving this because you were added to a Field Vision task.</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

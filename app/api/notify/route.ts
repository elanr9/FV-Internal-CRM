import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

const FROM = "Field Vision <founders@fieldvisionai.com>";

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
    .select("id, title, description, workflow, assigned_to, created_by")
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
  const recipients = new Map<string, Profile>();
  const add = (p: Profile | null | undefined) => {
    if (!p) return;
    if (p.id === user.id) return;
    if (!p.email) return;
    recipients.set(p.id, p);
  };

  let subject = "";
  let intro = "";
  let snippet = "";

  if (body.kind === "task_assigned") {
    const assignee = team.find((p) => p.id === body.assigneeId);
    add(assignee);
    subject = `${meName} assigned you: ${taskRow.title}`;
    intro = `${meName} assigned a task to you.`;
    snippet = taskRow.description ?? "";
  } else if (body.kind === "task_created") {
    const mentioned = findMentions(taskRow.description ?? "", team);
    mentioned.forEach(add);
    if (taskRow.assigned_to && taskRow.assigned_to !== user.id) {
      add(team.find((p) => p.id === taskRow.assigned_to));
    }
    subject = `${meName} created a task: ${taskRow.title}`;
    intro = `${meName} created a new task you are part of.`;
    snippet = taskRow.description ?? "";
  } else if (body.kind === "comment_posted") {
    const mentioned = findMentions(body.commentBody, team);
    mentioned.forEach(add);
    if (taskRow.created_by && taskRow.created_by !== user.id) {
      add(team.find((p) => p.id === taskRow.created_by));
    }
    if (taskRow.assigned_to && taskRow.assigned_to !== user.id) {
      add(team.find((p) => p.id === taskRow.assigned_to));
    }
    subject = `${meName} commented on: ${taskRow.title}`;
    intro = `${meName} added a comment on a task you are part of.`;
    snippet = body.commentBody;
  } else {
    return NextResponse.json({ ok: false, error: "bad_kind" }, { status: 400 });
  }

  if (recipients.size === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const sends = Array.from(recipients.values()).map(async (p) => {
    const html = renderEmail({
      recipientName: p.full_name || p.email,
      intro,
      title: taskRow.title,
      snippet,
      link
    });
    try {
      await resend.emails.send({
        from: FROM,
        to: p.email,
        subject,
        html,
        text: `${intro}\n\nTask: ${taskRow.title}\n${snippet ? `\n${snippet}\n` : ""}\nOpen: ${link}`
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
  link
}: {
  recipientName: string;
  intro: string;
  title: string;
  snippet: string;
  link: string;
}) {
  const safeSnippet = snippet
    ? `<div style="margin:16px 0;padding:14px 16px;background:#f6f7fb;border-radius:12px;color:#374151;font-size:14px;white-space:pre-wrap">${escapeHtml(
        snippet
      )}</div>`
    : "";
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,Inter,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;padding:28px;box-shadow:0 1px 2px rgba(15,23,42,0.04)">
    <div style="font-size:13px;color:#64748b;margin-bottom:8px">Field Vision</div>
    <div style="font-size:18px;font-weight:700;margin-bottom:4px">Hi ${escapeHtml(recipientName)}</div>
    <div style="font-size:14px;color:#475569;margin-bottom:18px">${escapeHtml(intro)}</div>
    <div style="font-size:16px;font-weight:600;margin-bottom:4px">${escapeHtml(title)}</div>
    ${safeSnippet}
    <a href="${link}" style="display:inline-block;margin-top:8px;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600">Open in CRM</a>
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

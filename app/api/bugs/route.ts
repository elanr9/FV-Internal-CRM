import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FROM = "Field Vision <founders@fieldvisionai.com>";

export async function POST(req: Request) {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title: string = (body.title ?? "").toString().trim();
  const description: string = (body.description ?? "").toString().trim();
  const screenshotUrl: string | null = body.screenshot_url ?? null;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const reporter = profile?.full_name ?? profile?.email ?? user.email ?? "Unknown";
  const images = screenshotUrl ? [screenshotUrl] : [];

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: `Bug: ${title}`,
      description: description || null,
      workflow: "engineering",
      status: "todo",
      difficulty: "medium",
      is_bug: true,
      created_by: user.id,
      images
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description || "(no details)");
    const safeReporter = escapeHtml(reporter);
    const screenshotBlock = screenshotUrl
      ? `<p style="margin:12px 0"><a href="${screenshotUrl}" style="color:#2563EB">View screenshot</a></p><p><img src="${screenshotUrl}" style="max-width:520px;border-radius:12px;border:1px solid #E2E8F0" /></p>`
      : "";
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;background:#F1F5F9;padding:24px">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:28px;border:1px solid #E2E8F0">
          <div style="display:inline-block;background:#FEE2E2;color:#B91C1C;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 10px;border-radius:999px">New bug report</div>
          <h1 style="margin:14px 0 8px;color:#0B1220;font-size:22px">${safeTitle}</h1>
          <p style="margin:0;color:#475569;font-size:13px">Reported by <b>${safeReporter}</b></p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:18px 0" />
          <div style="color:#1F2937;font-size:14px;line-height:1.6;white-space:pre-wrap">${safeDesc}</div>
          ${screenshotBlock}
          <p style="margin-top:24px;color:#94A3B8;font-size:12px">Task ID ${task.id}</p>
        </div>
      </div>
    `;

    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: FROM,
        to: ["founders@fieldvisionai.com"],
        subject: `[Bug] ${title}`,
        html,
        text: `Reported by ${reporter}\n\n${title}\n\n${description || ""}\n\n${screenshotUrl ? `Screenshot: ${screenshotUrl}\n\n` : ""}Task ID: ${task.id}`
      });
    } catch (err) {
      console.error("Resend error:", err);
    }
  }

  return NextResponse.json({ task_id: task.id });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

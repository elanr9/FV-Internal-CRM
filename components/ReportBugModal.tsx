"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bug, Loader2, Upload, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function ReportBugModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return toast.error("Please log in again.");
    }
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/bug-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("task-attachments")
      .upload(path, file, { contentType: file.type || "image/png" });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
    setScreenshotUrl(data.publicUrl);
    setUploading(false);
  }

  async function submit() {
    if (!title.trim()) return toast.error("Add a short title for the bug.");
    setSubmitting(true);
    const res = await fetch("/api/bugs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        screenshot_url: screenshotUrl
      })
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return toast.error(j.error ?? "Failed to submit");
    }
    toast.success("Bug reported, the team has been notified.");
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-pop">
        <header className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Bug className="h-4 w-4" />
            </div>
            <div className="text-sm font-bold text-ink-900">Report a bug</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-ink-100">
            <X className="h-4 w-4 text-ink-500" />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              What broke
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title, what went wrong"
              className="input"
            />
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Steps or details
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you doing? What did you expect? What happened?"
              rows={5}
              className="input min-h-[120px] resize-y"
            />
          </label>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Screenshot (optional)
            </div>
            {screenshotUrl ? (
              <div className="relative inline-block overflow-hidden rounded-xl border border-ink-100">
                <img src={screenshotUrl} alt="screenshot" className="max-h-48" />
                <button
                  onClick={() => setScreenshotUrl(null)}
                  className="absolute right-1 top-1 rounded-full bg-ink-900/70 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-4 py-6 text-sm font-medium text-ink-400 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Drop or pick a screenshot"}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink-100 px-6 py-3.5">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={submitting} className="btn-primary bg-rose-600 hover:bg-rose-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
            Send bug report
          </button>
        </footer>
      </div>
    </div>
  );
}

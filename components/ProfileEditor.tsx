"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import AvatarCropper from "./AvatarCropper";

export default function ProfileEditor({ me }: { me: Profile }) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(me.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url ?? "");
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (pickedSrc) URL.revokeObjectURL(pickedSrc);
    };
  }, [pickedSrc]);

  function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPickedSrc(url);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadCropped(blob: Blob) {
    setUploading(true);
    const path = `${me.id}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("task-attachments")
      .upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000"
      });
    if (upErr) {
      setUploading(false);
      toast.error(`Upload failed: ${upErr.message}`);
      return;
    }
    const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
    const { error: saveErr } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", me.id);
    if (saveErr) {
      setUploading(false);
      toast.error(`Save failed: ${saveErr.message}`);
      return;
    }
    setAvatarUrl(data.publicUrl);
    setPickedSrc(null);
    setUploading(false);
    toast.success("Photo updated");
    router.refresh();
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        avatar_url: avatarUrl || null
      })
      .eq("id", me.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    router.refresh();
  }

  const preview: Profile = { ...me, full_name: name || null, avatar_url: avatarUrl || null };

  return (
    <div className="card p-8">
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar profile={preview} size={96} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-card transition hover:bg-brand-700 disabled:opacity-60"
            title="Upload photo"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-ink-900">
            {name || "Add your name"}
          </div>
          <div className="truncate text-sm text-ink-400">{me.email}</div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Display name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="input"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Email
          </div>
          <input value={me.email} disabled className="input bg-ink-50 text-ink-400" />
        </label>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save profile
        </button>
      </div>

      {pickedSrc && (
        <AvatarCropper
          src={pickedSrc}
          onCancel={() => setPickedSrc(null)}
          onConfirm={uploadCropped}
        />
      )}
    </div>
  );
}

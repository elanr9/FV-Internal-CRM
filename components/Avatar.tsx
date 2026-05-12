"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

const PALETTE = [
  { bg: "bg-brand-600", border: "border-brand-600", soft: "bg-brand-50", text: "text-brand-700" },
  { bg: "bg-emerald-600", border: "border-emerald-600", soft: "bg-emerald-50", text: "text-emerald-700" },
  { bg: "bg-fuchsia-600", border: "border-fuchsia-600", soft: "bg-fuchsia-50", text: "text-fuchsia-700" },
  { bg: "bg-amber-500", border: "border-amber-500", soft: "bg-amber-50", text: "text-amber-800" },
  { bg: "bg-rose-500", border: "border-rose-500", soft: "bg-rose-50", text: "text-rose-700" },
  { bg: "bg-indigo-600", border: "border-indigo-600", soft: "bg-indigo-50", text: "text-indigo-700" },
  { bg: "bg-cyan-600", border: "border-cyan-600", soft: "bg-cyan-50", text: "text-cyan-700" }
];

const TEAM_COLOR_BY_EMAIL: Record<string, (typeof PALETTE)[number]> = {
  "elan@fieldvisionai.com": PALETTE[0],
  "gabe@fieldvisionai.com": PALETTE[1],
  "fabri@fieldvisionai.com": PALETTE[2],
  "tona@fieldvisionai.com": PALETTE[3],
  "sebas@fieldvisionai.com": PALETTE[4],
  "iad32@cornell.edu": PALETTE[5],
  "lucho@fieldvisionai.com": PALETTE[6]
};

export function profileColor(profile: Pick<Profile, "id" | "email"> | string) {
  if (typeof profile !== "string") {
    const fixed = TEAM_COLOR_BY_EMAIL[profile.email.toLowerCase()];
    if (fixed) return fixed;
  }
  const seed = typeof profile === "string" ? profile : profile.id;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(p: Profile | null | undefined) {
  if (!p) return "?";
  const base = p.full_name?.trim() || p.email;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function Avatar({
  profile,
  size = 32,
  title,
  ring = false
}: {
  profile: Profile | null | undefined;
  size?: number;
  title?: string;
  ring?: boolean;
}) {
  const seed = profile?.id ?? "x";
  const color = profile ? profileColor(profile) : profileColor(seed);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [profile?.avatar_url]);

  if (profile?.avatar_url && !broken) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        title={title ?? profile.full_name ?? profile.email}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className={clsx("rounded-full border-2 object-cover", color.border, ring && "ring-2 ring-white")}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      title={title ?? profile?.full_name ?? profile?.email ?? "Unassigned"}
      className={clsx(
        "flex items-center justify-center rounded-full text-white font-semibold",
        profile ? color.bg : "bg-ink-200 text-ink-500",
        ring && "ring-2 ring-white"
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
    >
      {profile ? initials(profile) : "?"}
    </div>
  );
}

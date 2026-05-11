"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

const PALETTE = [
  "bg-brand-600",
  "bg-emerald-600",
  "bg-fuchsia-600",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-600",
  "bg-cyan-600"
];

function colorFor(seed: string) {
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
        className={clsx("rounded-full object-cover", ring && "ring-2 ring-white")}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      title={title ?? profile?.full_name ?? profile?.email ?? "Unassigned"}
      className={clsx(
        "flex items-center justify-center rounded-full text-white font-semibold",
        profile ? colorFor(seed) : "bg-ink-200 text-ink-500",
        ring && "ring-2 ring-white"
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
    >
      {profile ? initials(profile) : "?"}
    </div>
  );
}

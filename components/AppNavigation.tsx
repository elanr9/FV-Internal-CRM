"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Compass, Lightbulb, Sparkles, Video, Calendar, User, ShieldAlert, Users } from "lucide-react";
import clsx from "clsx";
import type { Profile } from "@/lib/types";

type Props = {
  me: Profile;
  onNavigate?: () => void;
};

export default function AppNavigation({ me, onNavigate }: Props) {
  const pathname = usePathname();
  const isAdmin = me.role === "admin";

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-2">
      <SectionLabel>Workflows</SectionLabel>
      <ul className="space-y-0.5">
        <NavLink
          href="/board/engineering"
          label="Engineering"
          icon={Code2}
          accent="text-brand-600"
          active={pathname?.startsWith("/board/engineering") ?? false}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/board/growth"
          label="Growth"
          icon={Sparkles}
          accent="text-emerald-600"
          active={pathname?.startsWith("/board/growth") ?? false}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/board/content"
          label="Content"
          icon={Video}
          accent="text-fuchsia-600"
          active={pathname?.startsWith("/board/content") ?? false}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/board/trav"
          label="Trav"
          icon={Compass}
          accent="text-orange-600"
          active={pathname?.startsWith("/board/trav") ?? false}
          onNavigate={onNavigate}
        />
      </ul>

      <SectionLabel className="mt-6">Ideas</SectionLabel>
      <ul className="space-y-0.5">
        <NavLink
          href="/board/feature_ideas"
          label="Feature Ideas"
          icon={Lightbulb}
          accent="text-amber-600"
          active={pathname?.startsWith("/board/feature_ideas") ?? false}
          onNavigate={onNavigate}
        />
      </ul>

      <SectionLabel className="mt-6">Personal</SectionLabel>
      <ul className="space-y-0.5">
        <NavLink
          href="/me/week"
          label="My week"
          icon={Calendar}
          accent="text-ink-400"
          active={pathname === "/me/week"}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/me/created"
          label="Created by me"
          icon={User}
          accent="text-ink-400"
          active={pathname === "/me/created"}
          onNavigate={onNavigate}
        />
      </ul>

      <SectionLabel className="mt-6">Team</SectionLabel>
      <ul className="space-y-0.5">
        <NavLink
          href="/team/week"
          label="Team week"
          icon={Calendar}
          accent="text-cyan-600"
          active={pathname === "/team/week"}
          onNavigate={onNavigate}
        />
        <NavLink
          href="/team/schedule"
          label="Team schedule"
          icon={Users}
          accent="text-cyan-600"
          active={pathname === "/team/schedule"}
          onNavigate={onNavigate}
        />
      </ul>

      {isAdmin && (
        <>
          <SectionLabel className="mt-6">Admin</SectionLabel>
          <ul className="space-y-0.5">
            <NavLink
              href="/admin/bugs"
              label="Bug reports"
              icon={ShieldAlert}
              accent="text-rose-500"
              active={pathname?.startsWith("/admin/bugs") ?? false}
              onNavigate={onNavigate}
            />
          </ul>
        </>
      )}
    </nav>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400", className)}>
      {children}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  accent,
  onNavigate
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  accent: string;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={() => onNavigate?.()}
        className={clsx(
          "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition touch-manipulation",
          active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50"
        )}
      >
        <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-brand-600" : accent)} />
        {label}
      </Link>
    </li>
  );
}

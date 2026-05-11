"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Code2, Sparkles, Video, User, LogOut, Calendar, Bug, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import NewTaskButton from "./NewTaskButton";
import ReportBugButton from "./ReportBugButton";

type Props = {
  me: Profile;
  team: Profile[];
};

export default function Sidebar({ me, team }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const isAdmin = me.role === "admin";

  async function signOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-ink-100 bg-white">
      <div className="flex items-center gap-2.5 px-5 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
          <span className="text-sm font-extrabold tracking-tight">FV</span>
        </div>
        <div>
          <div className="text-sm font-bold leading-tight text-ink-900">FieldVision</div>
          <div className="text-xs font-medium leading-tight text-brand-600">Internal CRM</div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <NewTaskButton team={team} me={me} />
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-3 pb-2">
        <SectionLabel>Workflows</SectionLabel>
        <ul className="space-y-0.5">
          {isAdmin && (
            <SidebarLink
              href="/board/engineering"
              label="Engineering"
              icon={Code2}
              accent="text-brand-600"
              active={pathname?.startsWith("/board/engineering") ?? false}
            />
          )}
          <SidebarLink
            href="/board/growth"
            label="Growth"
            icon={Sparkles}
            accent="text-emerald-600"
            active={pathname?.startsWith("/board/growth") ?? false}
          />
          <SidebarLink
            href="/board/content"
            label="Content"
            icon={Video}
            accent="text-fuchsia-600"
            active={pathname?.startsWith("/board/content") ?? false}
          />
        </ul>

        <SectionLabel className="mt-6">Personal</SectionLabel>
        <ul className="space-y-0.5">
          <SidebarLink
            href="/me/week"
            label="My week"
            icon={Calendar}
            accent="text-ink-400"
            active={pathname === "/me/week"}
          />
          <SidebarLink
            href="/me/created"
            label="Created by me"
            icon={User}
            accent="text-ink-400"
            active={pathname === "/me/created"}
          />
        </ul>

        {isAdmin && (
          <>
            <SectionLabel className="mt-6">Admin</SectionLabel>
            <ul className="space-y-0.5">
              <SidebarLink
                href="/admin/bugs"
                label="Bug reports"
                icon={ShieldAlert}
                accent="text-rose-500"
                active={pathname?.startsWith("/admin/bugs") ?? false}
              />
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <ReportBugButton />

        <div className="mt-3 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Team
        </div>
        <div className="flex flex-wrap gap-1.5 px-2 pb-3">
          {team.slice(0, 12).map((p) => (
            <Avatar key={p.id} profile={p} size={26} title={p.full_name ?? p.email} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-ink-50"
          >
            <Avatar profile={me} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900">
                {me.full_name ?? me.email.split("@")[0]}
              </div>
              <div className="truncate text-xs text-ink-400">{me.email}</div>
            </div>
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            title="Sign out"
            className="rounded-xl p-2 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400", className)}>
      {children}
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  accent
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  accent: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className={clsx(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50"
        )}
      >
        <Icon className={clsx("h-4 w-4", active ? "text-brand-600" : accent)} />
        {label}
      </Link>
    </li>
  );
}

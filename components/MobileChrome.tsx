"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Menu, Plus, User, Users, X, LogOut } from "lucide-react";
import clsx from "clsx";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import AppNavigation from "./AppNavigation";
import ReportBugButton from "./ReportBugButton";
import TaskModal from "./TaskModal";
import Avatar from "./Avatar";

export default function MobileChrome({
  children,
  me,
  team
}: {
  children: React.ReactNode;
  me: Profile;
  team: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {children}

      <div
        className={clsx(
          "fixed inset-0 z-[90] bg-ink-900/40 backdrop-blur-sm transition md:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={clsx(
          "fixed bottom-0 left-0 top-0 z-[90] flex w-[min(100vw-3rem,20rem)] max-w-[20rem] flex-col border-r border-ink-100 bg-white shadow-pop transition duration-200 ease-out md:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
              <span className="text-sm font-extrabold tracking-tight">FV</span>
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-ink-900">FieldVision</div>
              <div className="text-xs font-medium leading-tight text-brand-600">Internal CRM</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-500 transition hover:bg-ink-50 touch-manipulation"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AppNavigation me={me} onNavigate={() => setMenuOpen(false)} />

        <div
          className="mt-auto border-t border-ink-100 p-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <ReportBugButton />
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="mt-3 flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2 transition hover:bg-ink-50 touch-manipulation"
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
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="mt-1 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-medium text-ink-500 transition hover:bg-ink-50 disabled:opacity-50 touch-manipulation"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-100 bg-white/95 px-2 pt-1 shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto flex max-w-lg items-end justify-around gap-1">
          <TabButton
            label="Menu"
            icon={Menu}
            active={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          />
          <TabLink href="/me/week" label="My week" icon={Calendar} active={pathname === "/me/week"} />
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="mb-1 flex h-14 w-14 shrink-0 -translate-y-2 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop transition active:scale-95 touch-manipulation"
            aria-label="New task"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
          <TabLink href="/team/week" label="Team" icon={Users} active={pathname === "/team/week"} />
          <TabLink href="/profile" label="You" icon={User} active={pathname === "/profile"} />
        </div>
      </nav>

      {newOpen && (
        <TaskModal mode="create" team={team} me={me} onClose={() => setNewOpen(false)} />
      )}
    </div>
  );
}

function TabButton({
  label,
  icon: Icon,
  active,
  onClick
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition touch-manipulation",
        active ? "text-brand-600" : "text-ink-400"
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50">
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition touch-manipulation",
        active ? "text-brand-600" : "text-ink-400 hover:text-ink-600"
      )}
    >
      <span
        className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          active ? "bg-brand-50" : "bg-ink-50"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </Link>
  );
}

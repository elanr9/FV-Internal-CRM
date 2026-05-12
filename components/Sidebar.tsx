"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";
import NewTaskButton from "./NewTaskButton";
import ReportBugButton from "./ReportBugButton";
import AppNavigation from "./AppNavigation";

type Props = {
  me: Profile;
  team: Profile[];
};

export default function Sidebar({ me, team }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-ink-100 bg-white">
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

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <AppNavigation me={me} />
      </div>

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

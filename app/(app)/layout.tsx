import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import MobileChrome from "@/components/MobileChrome";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meRaw } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  const me: Profile = meRaw ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    avatar_url: null,
    role: "member"
  };

  const { data: team } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role")
    .order("full_name", { ascending: true });

  const teamList = (team as Profile[]) ?? [];

  return (
    <div className="box-border flex h-[100dvh] w-full overflow-hidden bg-ink-50 pt-[env(safe-area-inset-top,0px)]">
      <Sidebar me={me} team={teamList} />
      <MobileChrome me={me} team={teamList}>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </MobileChrome>
    </div>
  );
}

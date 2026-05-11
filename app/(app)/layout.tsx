import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-50">
      <Sidebar me={me} team={(team as Profile[]) ?? []} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

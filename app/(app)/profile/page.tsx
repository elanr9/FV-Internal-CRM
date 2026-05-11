import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import ProfileEditor from "@/components/ProfileEditor";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = getSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const me: Profile = profile ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    avatar_url: null
  };

  return (
    <div className="h-full overflow-y-auto bg-ink-50">
      <div className="mx-auto max-w-2xl px-8 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Your profile</h1>
        <p className="mt-1 text-sm text-ink-400">
          Add a photo and your name so teammates know who is who.
        </p>
        <div className="mt-8">
          <ProfileEditor me={me} />
        </div>
      </div>
    </div>
  );
}

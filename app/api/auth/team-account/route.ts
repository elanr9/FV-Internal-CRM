import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const runtime = "nodejs";

type TeamAccount = {
  email: string;
  fullName: string;
  aliases: string[];
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

const TEAM_ACCOUNTS: Record<string, TeamAccount> = {
  elan: { email: "founders@fieldvisionai.com", fullName: "Elan", aliases: ["elan@fieldvisionai.com"] },
  fabri: { email: "fabri@fieldvisionai.com", fullName: "Fabri", aliases: [] },
  isaac: { email: "iad32@cornell.edu", fullName: "Isaac", aliases: ["isaac@fieldvisionai.com"] },
  sebas: { email: "sebasdlc704@gmail.com", fullName: "Sebas", aliases: ["sebas@fieldvisionai.com"] },
  lucho: { email: "lucho@fieldvisionai.com", fullName: "Lucho", aliases: [] },
  gaby: { email: "gdiaz0618@uchicago.edu", fullName: "Gaby", aliases: ["gabe@fieldvisionai.com"] },
  gabe: { email: "gdiaz0618@uchicago.edu", fullName: "Gaby", aliases: ["gabe@fieldvisionai.com"] },
  trav: { email: "danielguerrero0803@gmail.com", fullName: "Trav", aliases: [] },
  tona: { email: "tonasanchezboss@gmail.com", fullName: "Tona", aliases: ["tona@fieldvisionai.com"] }
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const account = TEAM_ACCOUNTS[username];

  if (!account) {
    return NextResponse.json({ error: "Ask Elan to add your login" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: "Auth is not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const existing = await findExistingUser(supabase, account);
  let userId = existing?.id ?? null;

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      email: account.email,
      email_confirm: true,
      password,
      user_metadata: { full_name: account.fullName }
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: account.fullName }
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: userId, email: account.email, full_name: account.fullName },
    { onConflict: "id" }
  );
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ email: account.email });
}

async function findExistingUser(
  supabase: SupabaseClient,
  account: TeamAccount
): Promise<User | null> {
  const emails = [account.email, ...account.aliases].map((email) => email.toLowerCase());
  const fullName = account.fullName.toLowerCase();

  const [{ data: usersData, error: usersError }, { data: profiles }] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("profiles").select("id, email, full_name")
  ]);

  if (usersError) throw usersError;

  const users = usersData.users;
  const profileRows = (profiles ?? []) as ProfileRow[];
  const matchingProfile = profileRows.find((profile) => {
    const email = String(profile.email ?? "").toLowerCase();
    const name = String(profile.full_name ?? "").toLowerCase();
    return emails.includes(email) || name === fullName;
  });

  return (
    users.find((user) => user.id === matchingProfile?.id) ??
    users.find((user) => {
      const email = user.email?.toLowerCase();
      const name = String(user.user_metadata?.full_name ?? "").toLowerCase();
      return Boolean((email && emails.includes(email)) || name === fullName);
    }) ??
    null
  );
}

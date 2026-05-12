import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PASSWORD = "FieldVision9";

const USERS = [
  { email: "founders@fieldvisionai.com", full_name: "Elan", aliases: ["elan@fieldvisionai.com"] },
  { email: "fabri@fieldvisionai.com", full_name: "Fabri", aliases: [] },
  { email: "gdiaz0618@uchicago.edu", full_name: "Gaby", aliases: ["gabe@fieldvisionai.com"] },
  { email: "tonasanchezboss@gmail.com", full_name: "Tona", aliases: ["tona@fieldvisionai.com"] },
  { email: "sebasdlc704@gmail.com", full_name: "Sebas", aliases: ["sebas@fieldvisionai.com"] },
  { email: "danielguerrero0803@gmail.com", full_name: "Trav", aliases: [] },
  { email: "iad32@cornell.edu", full_name: "Isaac", aliases: ["isaac@fieldvisionai.com"] }
];

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
  perPage: 200
});

if (listError) {
  console.error("Failed to list users: " + listError.message);
  process.exit(1);
}

const allUsers = existingUsers.users;

for (const u of USERS) {
  const names = [u.full_name.toLowerCase()];
  const emails = [u.email.toLowerCase(), ...u.aliases.map((email) => email.toLowerCase())];
  const existing = allUsers.find((x) => {
    const email = x.email?.toLowerCase();
    const name = String(x.user_metadata?.full_name ?? "").toLowerCase();
    return Boolean((email && emails.includes(email)) || (name && names.includes(name)));
  });

  let userId = existing?.id ?? null;

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: u.email,
      email_confirm: true,
      user_metadata: { full_name: u.full_name }
    });
    if (error) {
      console.error(`fail:    ${u.email} :: ${error.message}`);
      continue;
    }
    console.log(`updated: ${u.email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name }
    });

    if (error) {
      console.error(`fail:    ${u.email} :: ${error.message}`);
      continue;
    }

    userId = data?.user?.id ?? null;
    console.log(`created: ${u.email}`);
  }

  if (userId) {
    const { error: pErr } = await supabase.from("profiles").upsert(
      { id: userId, email: u.email, full_name: u.full_name },
      { onConflict: "id" }
    );
    if (pErr) console.error(`profile fail: ${u.email} :: ${pErr.message}`);
  }
}

console.log("\nDone. New accounts start with password: " + PASSWORD);

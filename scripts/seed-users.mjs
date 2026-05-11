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
  { email: "sebas@fieldvisionai.com", full_name: "Sebas" },
  { email: "lucho@fieldvisionai.com", full_name: "Lucho" },
  { email: "fabri@fieldvisionai.com", full_name: "Fabri" },
  { email: "isaac@fieldvisionai.com", full_name: "Isaac" },
  { email: "tona@fieldvisionai.com", full_name: "Tona" },
  { email: "gabe@fieldvisionai.com", full_name: "Gabe" },
  { email: "elan@fieldvisionai.com", full_name: "Elan" }
];

for (const u of USERS) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.full_name }
  });

  let userId = data?.user?.id ?? null;

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
      const existing = list?.users.find((x) => x.email === u.email);
      userId = existing?.id ?? null;
      if (userId) {
        await supabase.auth.admin.updateUserById(userId, {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: u.full_name }
        });
        console.log(`updated: ${u.email}`);
      } else {
        console.error(`fail:    ${u.email} :: ${error.message}`);
        continue;
      }
    } else {
      console.error(`fail:    ${u.email} :: ${error.message}`);
      continue;
    }
  } else {
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

console.log("\nDone. Password for all accounts: " + PASSWORD);

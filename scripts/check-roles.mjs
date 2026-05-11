import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText.split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data, error } = await supabase
  .from("profiles")
  .select("email, full_name, role")
  .order("email");

if (error) {
  console.error("error:", error.message);
  if (error.message.includes("role")) {
    console.error("\n=> The role column is missing. Migration 002 has not been run yet.");
  }
  process.exit(1);
}

console.table(data);

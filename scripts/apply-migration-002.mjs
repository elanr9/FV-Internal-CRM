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

const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = new URL(projectUrl).host.split(".")[0];

const sql = readFileSync(join(__dirname, "..", "supabase", "migration_002.sql"), "utf8");

// Try the undocumented pg-meta query endpoint that Supabase Studio uses.
const candidates = [
  `${projectUrl}/pg-meta/default/query`,
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`
];

for (const url of candidates) {
  console.log(`trying ${url} ...`);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql })
    });
    const text = await r.text();
    console.log(`  status: ${r.status}`);
    if (r.ok) {
      console.log(`  body: ${text.slice(0, 300)}`);
      console.log("\n=> SUCCESS");
      process.exit(0);
    } else {
      console.log(`  body: ${text.slice(0, 300)}\n`);
    }
  } catch (e) {
    console.log(`  error: ${e.message}\n`);
  }
}

console.log("\nNo working endpoint. Paste the SQL in the Supabase SQL Editor:");
console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new`);
process.exit(1);

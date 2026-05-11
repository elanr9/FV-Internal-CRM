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

const { data: buckets, error } = await supabase.storage.listBuckets();
if (error) {
  console.error("listBuckets error:", error.message);
  process.exit(1);
}

const target = buckets.find((b) => b.id === "task-attachments");
if (!target) {
  console.log("BUCKET MISSING: task-attachments does not exist. Run supabase/migration.sql in the SQL editor.");
  process.exit(1);
}

console.log("bucket:", target.id, "public:", target.public);

if (!target.public) {
  console.log("\nFix it: run this in the Supabase SQL editor:");
  console.log("  update storage.buckets set public = true where id = 'task-attachments';");
  process.exit(1);
}

const buf = Buffer.from("test", "utf-8");
const path = `__diag/${Date.now()}.txt`;
const { error: upErr } = await supabase.storage
  .from("task-attachments")
  .upload(path, buf, { contentType: "text/plain", upsert: true });
if (upErr) {
  console.error("upload error:", upErr.message);
  process.exit(1);
}
const { data: pub } = supabase.storage.from("task-attachments").getPublicUrl(path);
const res = await fetch(pub.publicUrl);
console.log("public URL:", pub.publicUrl);
console.log("public fetch status:", res.status);

await supabase.storage.from("task-attachments").remove([path]);
console.log("cleanup ok");

import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve("supabase/migrations");
const entries = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (entries.length === 0) {
  console.error("No migrations found.");
  process.exit(1);
}

const timestamps = entries.map((name) => name.split("_")[0]);
const unique = new Set(timestamps);

if (unique.size !== timestamps.length) {
  console.error("Duplicate migration timestamps detected.");
  process.exit(1);
}

const ordered = [...entries].sort();
if (ordered.join("\n") !== entries.join("\n")) {
  console.error("Migrations are not lexically ordered.");
  process.exit(1);
}

const required = [
  "20260326210000_growth_ops_extensions.sql",
  "20260326220000_self_marketing_onboarding.sql",
];

for (const filename of required) {
  if (!entries.includes(filename)) {
    console.error(`Required migration missing: ${filename}`);
    process.exit(1);
  }
}

console.log(`Migration check passed for ${entries.length} files.`);

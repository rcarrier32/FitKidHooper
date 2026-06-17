#!/usr/bin/env node
/**
 * Verify Supabase is configured and analytics tables/views exist.
 * Usage: node scripts/verify-supabase.mjs
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 */
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const fileEnv = loadEnvLocal();
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY;

const TABLES = ["athlete_profiles", "leaderboard_stats", "events", "athlete_analytics", "feedback"];
const VIEWS = ["analytics_dau", "analytics_athlete_summary", "feedback_summary"];

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

if (!url || !key || url.includes("YOUR_PROJECT")) {
  fail(
    "Missing Supabase credentials.\n\n" +
      "1. Copy .env.example → .env.local\n" +
      "2. Paste your Project URL and anon key from Supabase → Settings → API\n" +
      "3. Run: node scripts/verify-supabase.mjs"
  );
}

const sb = createClient(url, key);

console.log("\nFKH Supabase verification\n");
console.log(`Project: ${url}\n`);

let errors = 0;

for (const table of TABLES) {
  const { error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) {
    console.error(`❌ Table "${table}" — ${error.message}`);
    if (error.message.includes("does not exist") || error.code === "42P01") {
      console.error(`   → Run supabase/schema.sql and/or supabase/analytics.sql in SQL Editor`);
    }
    errors++;
  } else {
    ok(`Table "${table}" exists`);
  }
}

for (const view of VIEWS) {
  const { error } = await sb.from(view).select("*").limit(1);
  if (error) {
    console.error(`❌ View "${view}" — ${error.message}`);
    errors++;
  } else {
    ok(`View "${view}" exists`);
  }
}

// Test insert + delete on events (proves RLS insert works)
const testId = crypto.randomUUID();
const { error: insertErr } = await sb.from("events").insert({
  athlete_id: testId,
  event_name: "setup_verification",
  properties: { source: "verify-supabase.mjs" },
  app_version: "setup",
  age_group: "unknown",
});

if (insertErr) {
  console.error(`❌ Event insert test — ${insertErr.message}`);
  console.error("   → Check RLS policies in analytics.sql");
  errors++;
} else {
  ok("Event insert works (RLS OK)");
  await sb.from("events").delete().eq("athlete_id", testId).eq("event_name", "setup_verification");
}

console.log("");
if (errors) {
  console.error(`${errors} issue(s) found. Fix SQL migrations, then re-run this script.\n`);
  process.exit(1);
}

console.log("All checks passed! Next steps:");
console.log("  • Local dev:  npm run dev");
console.log("  • Production: add GitHub secrets, then git push origin main");
console.log("  • Admin dash: http://localhost:5173/FitKidHooper/?admin=1\n");

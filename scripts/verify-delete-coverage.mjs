#!/usr/bin/env node
/**
 * Guards that every table holding a child's data is actually deleted when a
 * parent asks for their account to be removed.
 *
 * This exists because the failure is silent and keeps happening. Three times in
 * one session a new athlete-keyed table was added, and each time
 * delete_athlete_via_consent had to be remembered by hand. Once it was not:
 * feed_comments and feed_reactions were missing for as long as the function
 * existed, so a deleted child's comments stayed visible to other children under
 * their name. Nothing anywhere would have reported that — the function returns
 * ok:true either way, and the rows it forgets are exactly the ones nobody looks
 * for again.
 *
 * Deliberately static: it reads the SQL files rather than the live database, so
 * it runs in CI with no credentials and fails on the commit that introduces the
 * table, not weeks later.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SQL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const DELETE_FN_FILE = "parent_delete_account.sql";

/** Columns that mean "this row belongs to, or names, an athlete". */
const ATHLETE_KEYS = [
  "athlete_id", "user_id", "requester_id", "target_id", "sender_id",
  "recipient_id", "athlete_a", "athlete_b", "host_id", "guest_id",
  "coach_id", "author_id", "actor_id",
];

/**
 * Tables deliberately NOT deleted, with the reason. Operational lists that hold
 * an id and nothing else: no name, no content, nothing that identifies a child
 * to another child. Adding to this list is a decision — say why.
 */
const INTENTIONALLY_EXCLUDED = {
  admin_allowlist: "operators, not athletes",
  analytics_excluded_athletes: "id-only QA exclusion list; no personal data",
  analytics_qa_athletes: "id-only QA list; no personal data",
  parent_consent_requests: "status-updated to 'deleted' rather than removed, so the request survives as the record of why",
};

const files = readdirSync(SQL_DIR).filter(f => f.endsWith(".sql"));
const deleteFn = readFileSync(join(SQL_DIR, DELETE_FN_FILE), "utf8");

// Every `create table [if not exists] public.name (...)` across the schema.
const found = new Map();
for (const file of files) {
  const sql = readFileSync(join(SQL_DIR, file), "utf8");
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\n\s*\);/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const [, table, body] = m;
    const keys = ATHLETE_KEYS.filter(k => new RegExp(`(^|[\\s,(])${k}\\s`, "i").test(body));
    if (keys.length) found.set(table, { file, keys });
  }
}

const missing = [];
for (const [table, meta] of found) {
  if (table in INTENTIONALLY_EXCLUDED) continue;
  // The delete function must name the table explicitly. Cascades are not
  // enough: this function deletes by list precisely so a changed foreign key
  // cannot quietly stop removing a child's data.
  if (!new RegExp(`delete\\s+from\\s+public\\.${table}\\b`, "i").test(deleteFn)) {
    missing.push({ table, ...meta });
  }
}

if (missing.length) {
  console.error(`verify-delete-coverage: ${missing.length} table(s) hold athlete data but are never deleted.\n`);
  for (const { table, file, keys } of missing) {
    console.error(`  ${table}  (${file}, keyed by ${keys.join(", ")})`);
  }
  console.error(`\nA parent asking for deletion would leave these rows behind.`);
  console.error(`Add a delete to ${DELETE_FN_FILE}, or — if the table genuinely holds`);
  console.error(`no personal data — add it to INTENTIONALLY_EXCLUDED with a reason.`);
  process.exit(1);
}

const covered = [...found.keys()].filter(t => !(t in INTENTIONALLY_EXCLUDED));
console.log(`verify-delete-coverage: OK (${covered.length} athlete-keyed tables, ${Object.keys(INTENTIONALLY_EXCLUDED).length} excluded by decision)`);

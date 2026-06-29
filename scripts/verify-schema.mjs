#!/usr/bin/env node
/**
 * Pre-deploy guard: live Supabase must expose every table column and RPC in
 * scripts/schema-manifest.json (seeded from app .from() / .rpc() usage).
 *
 * LIMIT: catches missing columns/tables/RPCs (PGRST204 / PGRST202). Does NOT
 * catch RLS-policy gaps on writes (42501) — those need owner-scoped SELECT
 * policies on upsert targets, not anon-side probes.
 *
 * Usage: VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/verify-schema.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(ROOT, "scripts/schema-manifest.json");

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
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

function loadManifest() {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const { tables = {}, rpcs = [] } = raw;
  return { tables, rpcs };
}

function restHeaders(anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };
}

async function parseJsonBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/** GET select=col1,col2&limit=0 — 200 means columns exist; 400 → PGRST204. */
async function verifyTable(baseUrl, anonKey, table, columns) {
  const select = columns.join(",");
  const url = `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=0`;
  const res = await fetch(url, { headers: restHeaders(anonKey) });
  if (res.ok) return { ok: true };

  const body = await parseJsonBody(res);
  const message = body.message || body.hint || body.error || res.statusText;
  const code = body.code || String(res.status);
  return { ok: false, message: `${code}: ${message}` };
}

/**
 * Probe RPC without executing side effects when possible.
 * OPTIONS first; fall back to POST {} — PGRST202 / 404 means missing function.
 */
async function verifyRpc(baseUrl, anonKey, fn) {
  const url = `${baseUrl}/rest/v1/rpc/${encodeURIComponent(fn)}`;
  const headers = { ...restHeaders(anonKey), "Content-Type": "application/json" };

  const opt = await fetch(url, { method: "OPTIONS", headers });
  if (opt.ok && opt.status !== 404) {
    return { ok: true, method: "OPTIONS" };
  }

  const res = await fetch(url, { method: "POST", headers, body: "{}" });
  const body = await parseJsonBody(res);

  if (res.status === 404 || body.code === "PGRST202") {
    return { ok: false, message: body.message || `RPC ${fn} not found (PGRST202)` };
  }

  // 200, 401, 403, or param/type errors mean the function resolved in schema cache.
  return { ok: true, method: "POST" };
}

function pad(str, len) {
  return String(str).padEnd(len);
}

async function main() {
  const fileEnv = loadEnvLocal();
  const url = (process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("YOUR_PROJECT")) {
    console.log("verify-schema: SKIP — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set");
    process.exit(0);
  }

  const { tables, rpcs } = loadManifest();
  const results = [];
  const failures = [];

  console.log(`verify-schema: checking ${Object.keys(tables).length} tables, ${rpcs.length} RPCs against ${url}\n`);

  for (const [table, columns] of Object.entries(tables)) {
    const result = await verifyTable(url, anonKey, table, columns);
    const label = `table ${table}`;
    results.push({ label, ...result });
    if (!result.ok) failures.push({ label, message: result.message });
  }

  for (const fn of rpcs) {
    const result = await verifyRpc(url, anonKey, fn);
    const label = `rpc ${fn}`;
    results.push({ label, ...result });
    if (!result.ok) failures.push({ label, message: result.message });
  }

  const nameWidth = Math.max(...results.map(r => r.label.length), 12);
  for (const r of results) {
    const status = r.ok ? "PASS" : "FAIL";
    const detail = r.ok && r.method ? ` (${r.method})` : r.ok ? "" : ` — ${r.message}`;
    console.log(`${pad(r.label, nameWidth)}  ${status}${detail}`);
  }

  if (failures.length) {
    console.error(`\nverify-schema: ${failures.length} mismatch(es) — live DB is behind scripts/schema-manifest.json`);
    console.error("Add/run the matching supabase/*.sql migration, then notify pgrst reload.\n");
    for (const f of failures) {
      console.error(`  • ${f.label}: ${f.message}`);
    }
    process.exit(1);
  }

  console.log("\nverify-schema: OK");
}

main().catch(err => {
  console.error("verify-schema: fatal", err);
  process.exit(1);
});

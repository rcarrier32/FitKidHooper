/**
 * Cloud ledger sync — the achievement ledger + equipped identity in Supabase.
 *
 * Local is the working cache (canonical save key `fkh-achievements`); cloud is
 * the cross-user source of truth that Boards, Community Feed, and Coach read.
 * No-ops cleanly when signed out or unconfigured (offline-first preserved).
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { getEffectiveAthleteId } from "./auth.js";
import { parseStoredObject, readStoredObject } from "./storageParse.js";

const LEDGER_KEY = "fkh-achievements";

/** Local ledger cache: { [achievement_id]: { kind, family, earned_at, context } }. */
export function readLocalLedger() {
  return readStoredObject(LEDGER_KEY);
}

export function writeLocalLedger(ledger) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger || {}));
  } catch {}
}

export function ledgerIdSet(ledger) {
  return new Set(Object.keys(ledger || {}));
}

/** Merge new entries into the local ledger (keeps earliest earned_at). Returns next ledger. */
export function mergeIntoLocalLedger(entries) {
  const ledger = readLocalLedger();
  let changed = false;
  for (const e of entries || []) {
    const existing = ledger[e.achievement_id];
    if (!existing) {
      ledger[e.achievement_id] = { kind: e.kind, family: e.family, earned_at: e.earned_at, context: e.context || {} };
      changed = true;
    }
  }
  if (changed) writeLocalLedger(ledger);
  return ledger;
}

/** Pull the cloud ledger for the signed-in athlete and merge it into local. */
export async function pullLedger() {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };
  const sb = getSupabaseClient();
  const athleteId = await getEffectiveAthleteId();
  if (!sb || !athleteId) return { ok: false, reason: "no_id" };

  const { data, error } = await sb
    .from("athlete_achievements")
    .select("achievement_id, kind, family, earned_at, context")
    .eq("athlete_id", athleteId);

  if (error) return { ok: false, error: error.message };
  const entries = (data || []).map(r => ({
    achievement_id: r.achievement_id, kind: r.kind, family: r.family,
    earned_at: r.earned_at, context: r.context || {},
  }));
  mergeIntoLocalLedger(entries);
  return { ok: true, count: entries.length };
}

/** Push newly-granted ledger entries to the cloud (idempotent — ignores dupes). */
export async function pushLedgerEntries(entries) {
  if (!entries?.length) return { ok: true, count: 0 };
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };
  const sb = getSupabaseClient();
  const athleteId = await getEffectiveAthleteId();
  if (!sb || !athleteId) return { ok: false, reason: "no_id" };

  const rows = entries.map(e => ({
    athlete_id: athleteId,
    achievement_id: e.achievement_id,
    kind: e.kind,
    family: e.family,
    earned_at: e.earned_at,
    context: e.context || {},
  }));

  const { error } = await sb
    .from("athlete_achievements")
    .upsert(rows, { onConflict: "athlete_id,achievement_id", ignoreDuplicates: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, count: rows.length };
}

/** Push equipped identity (active title + cosmetics) to the athlete's profile. */
export async function pushEquippedIdentity({ activeTitle, equipped }) {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };
  const sb = getSupabaseClient();
  const athleteId = await getEffectiveAthleteId();
  if (!sb || !athleteId) return { ok: false, reason: "no_id" };

  const { error } = await sb
    .from("athlete_profiles")
    .update({ active_title: activeTitle || null, equipped: equipped || {} })
    .eq("id", athleteId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Benchmarks — record measured accuracy tests. Personal bests are cached locally
 * (canonical save key `fkh-benchmarks`); the append-only series is stored in the
 * cloud `benchmark_results` table (powers improvement-over-time + future Coach).
 * Certifications earned by crossing a threshold flow through the achievement ledger.
 */
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { getEffectiveAthleteId } from "./auth.js";

const PB_KEY = "fkh-benchmarks"; // { [benchmarkId]: bestValue }

export function readLocalPBs() {
  try {
    return JSON.parse(localStorage.getItem(PB_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Update the local personal best if the new value beats it. Returns the PB map. */
export function recordLocalPB(benchmarkId, value) {
  const pbs = readLocalPBs();
  if (value > (pbs[benchmarkId] ?? -Infinity)) {
    pbs[benchmarkId] = value;
    try { localStorage.setItem(PB_KEY, JSON.stringify(pbs)); } catch {}
  }
  return readLocalPBs();
}

/** Append a benchmark result to the cloud series. No-op when signed out. */
export async function recordBenchmark(benchmarkId, value) {
  if (!isSupabaseConfigured()) return { ok: false, reason: "not_configured" };
  const sb = getSupabaseClient();
  const athleteId = await getEffectiveAthleteId();
  if (!sb || !athleteId) return { ok: false, reason: "no_id" };
  const { error } = await sb
    .from("benchmark_results")
    .insert({ athlete_id: athleteId, benchmark_id: benchmarkId, value });
  return error ? { ok: false, error: error.message } : { ok: true };
}

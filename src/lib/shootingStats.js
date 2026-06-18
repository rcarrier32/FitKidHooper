/**
 * Shooting accuracy from shot_log_v2 (entries: { type, location, made }).
 * Surfaces make % — not just raw makes — overall, this week, and by zone.
 */
import { getPeriodRange } from "./periodStats.js";

const ZONE_OF = {
  layup: "rim", rev_layup: "rim", block_bank: "rim",
  mid_bank: "mid", mid: "mid", mid_baseline: "mid",
  three_corner: "three", three_wing: "three", three_slot: "three", three_center: "three",
  free_throw: "ft",
};

export const ZONES = [
  { id: "rim", label: "At Rim", emoji: "🏃" },
  { id: "mid", label: "Mid-Range", emoji: "🎯" },
  { id: "three", label: "3-Point", emoji: "🌧️" },
  { id: "ft", label: "Free Throw", emoji: "🆓" },
];

function pct(m, a) { return a ? Math.round((100 * m) / a) : null; }

/** { makes, attempts, pct, zones:{rim,mid,three,ft:{m,a,pct}} } for a date range. */
export function computeShootingStats(shotLog, { start = null, end = null } = {}) {
  const zones = { rim: { m: 0, a: 0 }, mid: { m: 0, a: 0 }, three: { m: 0, a: 0 }, ft: { m: 0, a: 0 } };
  let m = 0, a = 0;
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (start && date < start) continue;
    if (end && date > end) continue;
    for (const s of shots || []) {
      const made = s.made !== false;
      a += 1; if (made) m += 1;
      const z = ZONE_OF[s.type];
      if (z) { zones[z].a += 1; if (made) zones[z].m += 1; }
    }
  }
  for (const k of Object.keys(zones)) zones[k].pct = pct(zones[k].m, zones[k].a);
  return { makes: m, attempts: a, pct: pct(m, a), zones };
}

/** Convenience: all-time + this-week accuracy from the raw localStorage log. */
export function shootingSnapshot(shotLog) {
  const { start, end } = getPeriodRange("week");
  return {
    allTime: computeShootingStats(shotLog),
    week: computeShootingStats(shotLog, { start, end: end || null }),
  };
}

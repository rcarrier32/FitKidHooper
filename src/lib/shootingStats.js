/**
 * Shooting accuracy from shot_log_v2 (entries: { type, location, made, style? }).
 * Surfaces make % — not just raw makes — overall, this week, by zone and shot style.
 */
import { getPeriodRange } from "./periodStats.js";
import { SHOT_STYLES, normalizeShotStyle } from "./shotStyles.js";

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

const TYPE_LABEL = {
  layup: "Layup", rev_layup: "Reverse Layup", block_bank: "Block Area",
  mid_bank: "Elbow Shot", mid: "Wing (Mid)", mid_baseline: "Baseline (Mid)",
  free_throw: "Free Throw",
  three_corner: "Corner 3", three_wing: "Wing 3", three_slot: "Slot 3", three_center: "Top 3",
};

function pct(m, a) { return a ? Math.round((100 * m) / a) : null; }

function tallyShots(shotLog, { start = null, end = null } = {}) {
  const zones = { rim: { m: 0, a: 0 }, mid: { m: 0, a: 0 }, three: { m: 0, a: 0 }, ft: { m: 0, a: 0 } };
  const styles = Object.fromEntries(SHOT_STYLES.map(s => [s.id, { m: 0, a: 0 }]));
  let m = 0, a = 0;
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (start && date < start) continue;
    if (end && date > end) continue;
    const list = Array.isArray(shots) ? shots : [];
    for (const s of list) {
      if (!s || typeof s !== "object") continue;
      const made = s.made !== false;
      a += 1; if (made) m += 1;
      const z = ZONE_OF[s.type];
      if (z) { zones[z].a += 1; if (made) zones[z].m += 1; }
      const styleId = normalizeShotStyle(s.style);
      if (styleId && styles[styleId]) {
        styles[styleId].a += 1; if (made) styles[styleId].m += 1;
      }
    }
  }
  for (const k of Object.keys(zones)) zones[k].pct = pct(zones[k].m, zones[k].a);
  for (const s of SHOT_STYLES) styles[s.id].pct = pct(styles[s.id].m, styles[s.id].a);
  return { makes: m, attempts: a, pct: pct(m, a), zones, styles };
}

/** { makes, attempts, pct, zones, styles } for a date range. */
export function computeShootingStats(shotLog, { start = null, end = null } = {}) {
  return tallyShots(shotLog, { start, end });
}

/** Per-spot accuracy (type + location), most-attempted first. For the drill-down. */
export function computeSpotStats(shotLog, { start = null, end = null } = {}) {
  const map = {};
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (start && date < start) continue;
    if (end && date > end) continue;
    const list = Array.isArray(shots) ? shots : [];
    for (const s of list) {
      if (!s || typeof s !== "object") continue;
      const key = `${s.type}|${s.location || ""}`;
      if (!map[key]) {
        const zone = ZONE_OF[s.type] || null;
        const label = s.location
          ? (zone === "three" ? `${s.location} 3` : s.location)
          : (TYPE_LABEL[s.type] || s.type);
        map[key] = { key, zone, label, m: 0, a: 0 };
      }
      map[key].a += 1; if (s.made !== false) map[key].m += 1;
    }
  }
  const rows = Object.values(map);
  for (const r of rows) r.pct = pct(r.m, r.a);
  rows.sort((a, b) => b.a - a.a);
  return rows;
}

/** Per-location accuracy (named court spots), most-attempted first. */
export function computeLocationStats(shotLog, { start = null, end = null } = {}) {
  const map = {};
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (start && date < start) continue;
    if (end && date > end) continue;
    const list = Array.isArray(shots) ? shots : [];
    for (const s of list) {
      if (!s || typeof s !== "object") continue;
      const label = s.location || TYPE_LABEL[s.type] || s.type;
      if (!map[label]) map[label] = { label, m: 0, a: 0 };
      map[label].a += 1;
      if (s.made !== false) map[label].m += 1;
    }
  }
  const rows = Object.values(map);
  for (const r of rows) r.pct = pct(r.m, r.a);
  rows.sort((a, b) => b.a - a.a);
  return rows;
}

/** Per court-zone (layup, corner 3, etc.) accuracy. */
export function computeZoneTypeStats(shotLog, { start = null, end = null } = {}) {
  const map = {};
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (start && date < start) continue;
    if (end && date > end) continue;
    const list = Array.isArray(shots) ? shots : [];
    for (const s of list) {
      if (!s || typeof s !== "object" || !s.type) continue;
      const label = TYPE_LABEL[s.type] || s.type;
      if (!map[s.type]) map[s.type] = { id: s.type, label, m: 0, a: 0 };
      map[s.type].a += 1;
      if (s.made !== false) map[s.type].m += 1;
    }
  }
  const rows = Object.values(map);
  for (const r of rows) r.pct = pct(r.m, r.a);
  rows.sort((a, b) => b.a - a.a);
  return rows;
}

/** Convenience: all-time + this-week accuracy from the raw localStorage log. */
export function shootingSnapshot(shotLog) {
  const { start, end } = getPeriodRange("week");
  return {
    allTime: computeShootingStats(shotLog),
    week: computeShootingStats(shotLog, { start, end: end || null }),
  };
}

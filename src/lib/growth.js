/**
 * Growth / PHV tracking. A monthly height log → growth-velocity estimate → gentle
 * load-awareness around the growth spurt (Peak Height Velocity), the highest
 * injury-risk window for ages 8–14. Local-first (synced via canonical save).
 *
 * Heights are stored in total inches. Velocity is annualized inches/year.
 */
const KEY = "fkh-growth";

export function readGrowthLog() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Add/replace today's height entry (one per day). Returns the updated log. */
export function addGrowthEntry(heightIn, date = new Date().toLocaleDateString("en-CA")) {
  const h = Number(heightIn);
  if (!Number.isFinite(h) || h <= 0) return readGrowthLog();
  const log = readGrowthLog().filter(e => e.date !== date);
  log.push({ date, h });
  log.sort((a, b) => (a.date < b.date ? -1 : 1));
  try { localStorage.setItem(KEY, JSON.stringify(log)); } catch {}
  return log;
}

export function formatHeight(inches) {
  if (!inches) return "—";
  let ft = Math.floor(inches / 12);
  let inch = Math.round((inches - ft * 12) * 2) / 2; // nearest half inch
  if (inch >= 12) { ft += 1; inch -= 12; } // roll over (e.g. 59.8" → 5'0")
  return `${ft}'${inch}"`;
}

function annualize(h2, h1, d2, d1) {
  const yrs = (new Date(d2) - new Date(d1)) / (365.25 * 86400000);
  return yrs > 0 ? (h2 - h1) / yrs : null;
}

/**
 * Status from recent growth velocity (in/yr), comparing the latest entry to the
 * most recent earlier entry at least ~6 weeks back (for a stable rate).
 * spurt ≥ 3.3"/yr · growing ≥ 2.6 · steady otherwise.
 */
export function computeGrowth(log) {
  const e = [...(log || [])].filter(x => x && x.h > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!e.length) return { status: "none", latest: null };
  const latest = e[e.length - 1];
  let prev = null;
  for (let i = e.length - 2; i >= 0; i--) {
    const gapDays = (new Date(latest.date) - new Date(e[i].date)) / 86400000;
    if (gapDays >= 42) { prev = e[i]; break; }
  }
  if (!prev) return { status: "logging", latest, count: e.length };
  const velocity = annualize(latest.h, prev.h, latest.date, prev.date);
  let status = "steady";
  if (velocity >= 3.3) status = "spurt";
  else if (velocity >= 2.6) status = "growing";
  return { status, latest, prev, velocity, count: e.length };
}

export const GROWTH_UI = {
  none:    { emoji: "📏", color: "#64748b", title: "Track your growth",
    msg: "Add your height to start tracking. Logging it once a month shows how fast you're growing — and when to train extra-smart." },
  logging: { emoji: "📏", color: "#38bdf8", title: "Keep logging",
    msg: "Log your height again in a few weeks and we'll show your growth rate." },
  steady:  { emoji: "✅", color: "#22c55e", title: "Steady growth",
    msg: "Growing at a steady pace. Keep warming up before you train and getting good rest." },
  growing: { emoji: "📈", color: "#f59e0b", title: "Growing fast",
    msg: "You're growing quickly. Always warm up, work on landing and balance, and don't pile up max-effort jumping in any one week." },
  spurt:   { emoji: "🚀", color: "#f43f5e", title: "Big growth spurt",
    msg: "Your body is changing fast right now — this is when injuries happen most. Warm up EVERY time, prioritize landing & balance work, keep your rest days, and ease back on heavy jumping volume for a while." },
};

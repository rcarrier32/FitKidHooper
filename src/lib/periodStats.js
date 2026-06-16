/** Youth age brackets for leaderboard grouping. */
export const AGE_GROUPS = [
  { id: "u10", label: "U10 (9–10)", min: 9, max: 10 },
  { id: "u12", label: "U12 (11–12)", min: 11, max: 12 },
  { id: "u14", label: "U14 (13–14)", min: 13, max: 14 },
  { id: "u17", label: "U15+ (15–17)", min: 15, max: 17 },
  { id: "unknown", label: "Unlisted age", min: 0, max: 0 },
];

export const LEADERBOARD_PERIODS = [
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "ytd", label: "YTD" },
  { id: "all_time", label: "All Time" },
];

export function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function getAgeGroup(dob) {
  const age = calcAge(dob);
  if (age == null) return "unknown";
  if (age <= 10) return "u10";
  if (age <= 12) return "u12";
  if (age <= 14) return "u14";
  return "u17";
}

export function getAgeGroupLabel(id) {
  return AGE_GROUPS.find(g => g.id === id)?.label || id;
}

const todayKey = () => new Date().toLocaleDateString("en-CA");

function dateInRange(dateStr, start, end) {
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

/** Calendar ranges for leaderboard periods (ISO dates, en-CA). Week starts Monday. */
export function getPeriodRange(periodId) {
  const end = todayKey();
  const now = new Date();

  if (periodId === "week") {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return { start: d.toLocaleDateString("en-CA"), end };
  }
  if (periodId === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: d.toLocaleDateString("en-CA"), end };
  }
  if (periodId === "ytd") {
    return { start: `${now.getFullYear()}-01-01`, end };
  }
  return { start: null, end };
}

function parseCompletedKey(key) {
  const parts = key.split("-");
  if (parts.length < 4) return null;
  const date = parts.slice(0, 3).join("-");
  const exId = parts.slice(3).join("-");
  return { date, exId };
}

function countShotsInRange(shotLog, start, end) {
  let makes = 0;
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (!dateInRange(date, start, end)) continue;
    makes += (shots || []).filter(s => s.made !== false).length;
  }
  return makes;
}

function computeStreakEndingToday(completed, start, end) {
  const days = new Set();
  for (const [key, done] of Object.entries(completed || {})) {
    if (!done) continue;
    const parsed = parseCompletedKey(key);
    if (!parsed) continue;
    if (!dateInRange(parsed.date, start, end)) continue;
    days.add(parsed.date);
  }
  if (!days.has(todayKey())) return 0;

  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const k = d.toLocaleDateString("en-CA");
    if (days.has(k)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

/**
 * XP-style score for a date range — mirrors in-app XP rules (filtered by dates).
 * @param {Object} opts
 * @param {Record<string, boolean>} opts.completed
 * @param {Record<string, Array>} opts.shotLog
 * @param {Record<string, {claimed?: boolean, bonusXP?: number}>} opts.missionLog
 * @param {(exId: string) => string|undefined} opts.getCategory
 * @param {string|null} opts.start - inclusive YYYY-MM-DD, null = all time
 * @param {string|null} opts.end - inclusive YYYY-MM-DD
 */
export function computePeriodStats({ completed, shotLog, missionLog, getCategory, start, end }) {
  let exXP = 0;
  let workoutXP = 0;
  let missionXP = 0;
  const dayMap = {};
  const trainingDays = new Set();

  for (const [key, done] of Object.entries(completed || {})) {
    if (!done) continue;
    const parsed = parseCompletedKey(key);
    if (!parsed) continue;
    if (!dateInRange(parsed.date, start, end)) continue;

    exXP += 5;
    trainingDays.add(parsed.date);
    if (!dayMap[parsed.date]) dayMap[parsed.date] = { count: 0, cats: new Set() };
    dayMap[parsed.date].count++;
    const cat = getCategory?.(parsed.exId);
    if (cat) dayMap[parsed.date].cats.add(cat);
  }

  for (const info of Object.values(dayMap)) {
    if (info.count >= 3 && info.cats.size >= 2) workoutXP += 25;
  }

  for (const [date, entry] of Object.entries(missionLog || {})) {
    if (!entry?.claimed) continue;
    if (!dateInRange(date, start, end)) continue;
    missionXP += entry.bonusXP || 50;
  }

  const shotsMade = countShotsInRange(shotLog, start, end);
  const shotXP = Math.floor(shotsMade / 50);

  let streakXP = 0;
  const sortedDays = [...trainingDays].sort();
  let st = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) st = 1;
    else {
      const diff = (new Date(sortedDays[i] + "T12:00:00") - new Date(sortedDays[i - 1] + "T12:00:00")) / 86400000;
      if (diff <= 1.5) st++;
      else st = 1;
    }
    if (st >= 3) streakXP += 2;
  }

  const streak = computeStreakEndingToday(completed, start, end);
  const xp = exXP + workoutXP + missionXP + shotXP + streakXP;

  return {
    xp,
    shotsMade,
    trainingDays: trainingDays.size,
    streak,
    exXP,
    workoutXP,
    missionXP,
    shotXP,
    streakXP,
  };
}

export function computeAllPeriodStats({ completed, shotLog, missionLog, getCategory }) {
  const out = {};
  for (const { id } of LEADERBOARD_PERIODS) {
    const { start, end } = getPeriodRange(id);
    out[id] = computePeriodStats({ completed, shotLog, missionLog, getCategory, start, end: end || null });
  }
  return out;
}

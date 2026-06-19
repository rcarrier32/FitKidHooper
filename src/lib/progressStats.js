/** Shared progress primitives — used by History, Report, Home, and Boards. */

import { getPeriodRange } from "./periodStats.js";

export function parseCompletedKey(key) {
  const parts = key.split("-");
  if (parts.length < 4) return null;
  return { date: parts.slice(0, 3).join("-"), exId: parts.slice(3).join("-") };
}

/**
 * Training streak with rest-grace: a single rest day between sessions doesn't
 * break the streak (rest is good — and the growth-spurt window is when injuries
 * cluster). Two missed days in a row ends it. Only active days count toward the
 * number, so today not being done *yet* won't drop you to 0.
 */
export function getStreak(completed, { graceDays = 1 } = {}) {
  const keys = Object.keys(completed || {});
  const active = (k) => keys.some(c => c.startsWith(k) && completed[c]);
  let streak = 0;
  let missesInARow = 0;
  const d = new Date();
  for (let i = 0; i < 90; i++) {
    const k = d.toLocaleDateString("en-CA");
    if (active(k)) {
      streak++;
      missesInARow = 0;
    } else {
      missesInARow++;
      if (missesInARow > graceDays) break; // 2 missed days in a row ends the streak
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function countShots(shotLog, { start = null, end = null } = {}) {
  let makes = 0;
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if (start && date < start) continue;
    if (end && date > end) continue;
    makes += (shots || []).filter(s => s.made !== false).length;
  }
  return makes;
}

export function getTrainingDays(completed, { start = null, end = null } = {}) {
  const days = new Set();
  for (const key of Object.keys(completed || {})) {
    if (!completed[key]) continue;
    const p = parseCompletedKey(key);
    if (!p) continue;
    if (start && p.date < start) continue;
    if (end && p.date > end) continue;
    days.add(p.date);
  }
  return days.size;
}

/** Distinct calendar days with any drill check-off or logged shots (all-time). */
export function getAllTrainingDayCount(completed, shotLog) {
  const days = new Set();
  for (const key of Object.keys(completed || {})) {
    if (!completed[key]) continue;
    const p = parseCompletedKey(key);
    if (p) days.add(p.date);
  }
  for (const [date, shots] of Object.entries(shotLog || {})) {
    if ((shots || []).length > 0) days.add(date);
  }
  return days.size;
}

export function getCategoryBreakdown(completed, getCategory, { start = null, end = null } = {}) {
  const counts = {};
  for (const key of Object.keys(completed || {})) {
    if (!completed[key]) continue;
    const p = parseCompletedKey(key);
    if (!p) continue;
    if (start && p.date < start) continue;
    if (end && p.date > end) continue;
    const cat = getCategory?.(p.exId) || "other";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function getWeekShotGoal() {
  try {
    return parseInt(localStorage.getItem("shot_week_goal") || localStorage.getItem("fkh-shot-goal") || "100", 10);
  } catch {
    return 100;
  }
}

export function setWeekShotGoal(n) {
  const v = String(n);
  try {
    localStorage.setItem("shot_week_goal", v);
    localStorage.setItem("fkh-shot-goal", v);
  } catch {}
}

export function getProgressSnapshot({ completed, shotLog, getCategory, period = "all_time" } = {}) {
  const range = period === "all_time" ? { start: null, end: null } : getPeriodRange(period);
  return {
    streak: getStreak(completed),
    trainingDays: getTrainingDays(completed, range),
    shotsMade: countShots(shotLog, range),
    categoryBreakdown: getCategoryBreakdown(completed, getCategory, range),
    period,
  };
}

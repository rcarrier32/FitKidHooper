/** Shared progress primitives — used by History, Report, Home, and Boards. */

import { getPeriodRange } from "./periodStats.js";

export function parseCompletedKey(key) {
  const parts = key.split("-");
  if (parts.length < 4) return null;
  return { date: parts.slice(0, 3).join("-"), exId: parts.slice(3).join("-") };
}

export function getStreak(completed) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const k = d.toLocaleDateString("en-CA");
    if (Object.keys(completed || {}).some(c => c.startsWith(k) && completed[c])) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
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

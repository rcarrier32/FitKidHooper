import { BADGES_DEF } from "./badges.js";
import { CATS } from "./categories.js";

/** Build training history aggregates for HistoryView. */
export function buildHistoryData(completed, badgeDates, allExercises = {}) {
  const dayExMap = {};
  for (const [k, v] of Object.entries(completed)) {
    if (!v) continue;
    const date = k.split("-").slice(0, 3).join("-");
    const exId = k.split("-").slice(3).join("-");
    if (!dayExMap[date]) dayExMap[date] = [];
    dayExMap[date].push(exId);
  }

  const sortedDays = Object.keys(dayExMap).sort();

  const totalWorkoutDays = sortedDays.length;
  let totalExercises = 0;
  let totalMinutes = 0;
  for (const [, exIds] of Object.entries(dayExMap)) {
    totalExercises += exIds.length;
    for (const exId of exIds) {
      totalMinutes += Math.round((allExercises[exId]?.meta?.estimatedDuration || 180) / 60);
    }
  }

  const todayStr = new Date().toLocaleDateString("en-CA");
  const yestD = new Date(); yestD.setDate(yestD.getDate() - 1);
  const yestStr = yestD.toLocaleDateString("en-CA");

  let currentStreak = 0;
  const csStart = new Date();
  if (!dayExMap[todayStr]) csStart.setDate(csStart.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const ds = csStart.toLocaleDateString("en-CA");
    if (dayExMap[ds]) { currentStreak++; csStart.setDate(csStart.getDate() - 1); }
    else break;
  }
  if (!dayExMap[todayStr] && !dayExMap[yestStr]) currentStreak = 0;

  let longestStreak = 0;
  let runStreak = 0;
  let prevDate = null;
  for (const d of sortedDays) {
    if (!prevDate) { runStreak = 1; }
    else {
      const prev = new Date(prevDate + "T12:00:00");
      prev.setDate(prev.getDate() + 1);
      if (prev.toLocaleDateString("en-CA") === d) { runStreak++; }
      else { runStreak = 1; }
    }
    if (runStreak > longestStreak) longestStreak = runStreak;
    prevDate = d;
  }

  const dayStreakMap = {};
  let rs2 = 0; let pd2 = null;
  for (const d of sortedDays) {
    if (!pd2) { rs2 = 1; }
    else {
      const prev = new Date(pd2 + "T12:00:00");
      prev.setDate(prev.getDate() + 1);
      rs2 = prev.toLocaleDateString("en-CA") === d ? rs2 + 1 : 1;
    }
    dayStreakMap[d] = rs2;
    pd2 = d;
  }

  let totalShots = 0;
  try {
    const sl = JSON.parse(localStorage.getItem("shot_log_v2") || "{}");
    totalShots = Object.values(sl).flatMap(v => v || []).filter(s => s.made !== false).length;
  } catch { totalShots = 0; }

  function getMonWeek(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d); mon.setDate(d.getDate() + diff);
    return mon.toLocaleDateString("en-CA");
  }

  const weekMap = {};
  for (const [date, exIds] of Object.entries(dayExMap)) {
    const wk = getMonWeek(date);
    if (!weekMap[wk]) weekMap[wk] = { workouts: 0, exercises: 0, minutes: 0 };
    weekMap[wk].workouts++;
    weekMap[wk].exercises += exIds.length;
    for (const exId of exIds) {
      weekMap[wk].minutes += Math.round((allExercises[exId]?.meta?.estimatedDuration || 180) / 60);
    }
  }

  const thisMonday = getMonWeek(todayStr);
  const weeklyData = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMonday + "T12:00:00");
    d.setDate(d.getDate() - i * 7);
    const wkStr = d.toLocaleDateString("en-CA");
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const info = weekMap[wkStr] || { workouts: 0, exercises: 0, minutes: 0 };
    weeklyData.push({ label, weekStart: wkStr, ...info });
  }

  const catRaw = {};
  for (const [date, exIds] of Object.entries(dayExMap)) {
    const catsThisDay = new Set();
    for (const exId of exIds) {
      const cat = allExercises[exId]?._cat;
      if (!cat) continue;
      if (!catRaw[cat]) catRaw[cat] = { count: 0, sessionDays: 0, lastDate: null, days: new Set() };
      catRaw[cat].count++;
      catsThisDay.add(cat);
      if (!catRaw[cat].lastDate || date > catRaw[cat].lastDate) catRaw[cat].lastDate = date;
    }
    for (const cat of catsThisDay) {
      catRaw[cat].days.add(date);
    }
  }
  const categoryStats = Object.entries(catRaw)
    .map(([cat, v]) => [cat, { count: v.count, sessionDays: v.days.size, lastDate: v.lastDate }])
    .sort((a, b) => b[1].count - a[1].count);

  const recentActivity = [];
  for (const [date, exIds] of Object.entries(dayExMap)) {
    const cats = [...new Set(exIds.map(id => allExercises[id]?._cat).filter(Boolean))];
    recentActivity.push({ type: "workout", date, exCount: exIds.length, cats, key: `workout-${date}` });
  }
  if (badgeDates) {
    for (const [badgeId, dateStr] of Object.entries(badgeDates)) {
      const badge = BADGES_DEF.find(b => b.id === badgeId);
      if (badge && dateStr) {
        recentActivity.push({ type: "badge", date: dateStr, badge, key: `badge-${badgeId}` });
      }
    }
  }
  recentActivity.sort((a, b) => b.date.localeCompare(a.date));
  const recentActivitySliced = recentActivity.slice(0, 25);

  const coachInsights = [];
  const todayD = new Date(todayStr + "T12:00:00");

  if (categoryStats.length > 0) {
    const [topCat, topInfo] = categoryStats[0];
    const catLabel = CATS[topCat]?.label || topCat;
    coachInsights.push({ emoji: CATS[topCat]?.emoji || "🏋️", text: `${catLabel} is your most completed category with ${topInfo.count} sessions.` });
  }

  for (const [cat, info] of categoryStats) {
    if (coachInsights.length >= 5) break;
    if (!info.lastDate) continue;
    const lastD = new Date(info.lastDate + "T12:00:00");
    const daysDiff = Math.floor((todayD - lastD) / 86400000);
    if (daysDiff >= 8) {
      const catLabel = CATS[cat]?.label || cat;
      coachInsights.push({ emoji: CATS[cat]?.emoji || "📅", text: `You haven't trained ${catLabel} in ${daysDiff} days.` });
      break;
    }
  }

  if (currentStreak >= 3) {
    coachInsights.push({ emoji: "🔥", text: `You're on a ${currentStreak}-day streak! Consistency is what separates good athletes from great ones.` });
  }
  if (currentStreak === 0 && totalWorkoutDays > 0) {
    coachInsights.push({ emoji: "💪", text: `You've trained ${totalWorkoutDays} days total. Lace up and start a new streak today.` });
  }

  const bestWeek = [...weeklyData].sort((a, b) => b.exercises - a.exercises)[0];
  if (bestWeek && bestWeek.exercises > 0) {
    coachInsights.push({ emoji: "⭐", text: `Your best week was the one starting ${bestWeek.label} with ${bestWeek.exercises} exercises completed.` });
  }

  return {
    totalWorkoutDays,
    totalExercises,
    totalMinutes,
    currentStreak,
    longestStreak,
    totalShots,
    weeklyData,
    categoryStats,
    recentActivity: recentActivitySliced,
    coachInsights: coachInsights.slice(0, 5),
    dayExMap,
    dayStreakMap,
  };
}

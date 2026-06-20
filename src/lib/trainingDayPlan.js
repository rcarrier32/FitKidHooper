import {
  programSessionScheduleDays,
  isProgramSessionComplete,
  programWeekForDate,
} from "./programProgress.js";

/** Weekday index Mon=0 … Sun=6 from YYYY-MM-DD. */
export function weekdayIndexFromDate(dateStr) {
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  return dow === 0 ? 6 : dow - 1;
}

/** Calendar dates Mon→Sun for the week containing todayStr. */
export function currentWeekDates(todayStr) {
  const today = new Date(`${todayStr}T12:00:00`);
  const mondayOffset = weekdayIndexFromDate(todayStr);
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString("en-CA");
  });
}

/** Program session scheduled on dateStr, if any. */
export function programSessionOnDate(program, enrollment, programProgress, dateStr) {
  if (!enrollment?.startDate || dateStr < enrollment.startDate) return null;

  const week = programWeekForDate(enrollment.startDate, program.duration, dateStr);
  if (!week) return null;
  const weekData = program.weeks.find(w => w.week === week);
  if (!weekData) return null;

  const enrollStart = new Date(`${enrollment.startDate}T00:00:00`);
  const daysSinceStart = Math.floor(
    (new Date(`${dateStr}T12:00:00`).getTime() - enrollStart.getTime()) / 86400000
  );
  const dayInWeek = ((daysSinceStart % 7) + 7) % 7;
  const scheduleDays = programSessionScheduleDays(weekData.sessions.length);
  const sessionIdx = scheduleDays.indexOf(dayInWeek);
  if (sessionIdx < 0) return null;

  const session = weekData.sessions[sessionIdx];
  return {
    week,
    sessionIdx,
    session,
    done: isProgramSessionComplete(program, programProgress, week, sessionIdx),
  };
}

/** General weekly plan + enrolled program sessions for one calendar day. */
export function buildTrainingDayPlan(dateStr, schedule, programs, enrolledPrograms, programProgress) {
  const scheduleDay = schedule[weekdayIndexFromDate(dateStr)] || { day: "?", cats: [], label: "Rest" };

  const programSessions = [];
  for (const prog of programs || []) {
    const enrollment = enrolledPrograms?.[prog.id];
    if (!enrollment) continue;
    const onDate = programSessionOnDate(prog, enrollment, programProgress, dateStr);
    if (onDate) programSessions.push({ program: prog, ...onDate });
  }

  return {
    dateStr,
    scheduleDay,
    programSessions,
    isRestDay: scheduleDay.cats.length === 0 && programSessions.length === 0,
  };
}

/** Suggested exercise ids from general schedule categories (for mission bonus tasks). */
export function scheduleCategoryExerciseIds(scheduleDay, workouts, maxPerCat = 2, cap = 6) {
  if (!scheduleDay?.cats?.length) return [];
  const ids = scheduleDay.cats.flatMap(cat =>
    (workouts[cat] || []).slice(0, maxPerCat).map(e => e.id)
  );
  return ids.slice(0, cap);
}

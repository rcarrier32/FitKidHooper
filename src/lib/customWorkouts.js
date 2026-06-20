const KEY = "fkh-custom-workouts";

export const WEEK_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const WEEK_DAY_LABELS = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export function emptyWeekDays() {
  return Object.fromEntries(WEEK_DAY_KEYS.map(k => [k, []]));
}

export function getTodayWeekDayKey() {
  const idx = new Date().getDay();
  return WEEK_DAY_KEYS[(idx + 6) % 7];
}

export function readCustomWorkouts() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeCustomWorkouts(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export const CUSTOM_WORKOUTS_KEY = KEY;

export function saveCustomWorkout({ name, exerciseIds, emoji = "🏋️", type = "day", days = null }) {
  const workouts = readCustomWorkouts();
  const id = `cw-${Date.now()}`;
  const entry = {
    id,
    name: name?.trim() || (type === "week" ? "My Week" : "My Workout"),
    emoji: type === "week" ? "📅" : emoji,
    type,
    exerciseIds: type === "day" ? [...(exerciseIds || [])] : undefined,
    days: type === "week" ? { ...emptyWeekDays(), ...days } : undefined,
    createdAt: Date.now(),
  };
  writeCustomWorkouts([entry, ...workouts]);
  return entry;
}

export function exerciseIdsForCustomWorkout(entry, dayKey = getTodayWeekDayKey()) {
  if (!entry) return [];
  if (entry.type === "week" && entry.days) {
    const today = entry.days[dayKey] || [];
    if (today.length) return today;
    for (const key of WEEK_DAY_KEYS) {
      if (entry.days[key]?.length) return entry.days[key];
    }
    return [];
  }
  return entry.exerciseIds || [];
}

export function countCustomWorkoutExercises(entry) {
  if (!entry) return 0;
  if (entry.type === "week" && entry.days) {
    return WEEK_DAY_KEYS.reduce((n, k) => n + (entry.days[k]?.length || 0), 0);
  }
  return entry.exerciseIds?.length || 0;
}

export function activeDaysInWeekPlan(entry) {
  if (entry?.type !== "week" || !entry.days) return 0;
  return WEEK_DAY_KEYS.filter(k => entry.days[k]?.length > 0).length;
}

export function deleteCustomWorkout(id) {
  writeCustomWorkouts(readCustomWorkouts().filter(w => w.id !== id));
}

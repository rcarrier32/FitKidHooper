const KEY = "fkh-custom-workouts";

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

export function saveCustomWorkout({ name, exerciseIds, emoji = "🏋️" }) {
  const workouts = readCustomWorkouts();
  const id = `cw-${Date.now()}`;
  const entry = { id, name: name?.trim() || "My Workout", emoji, exerciseIds: [...exerciseIds], createdAt: Date.now() };
  writeCustomWorkouts([entry, ...workouts]);
  return entry;
}

export function deleteCustomWorkout(id) {
  writeCustomWorkouts(readCustomWorkouts().filter(w => w.id !== id));
}

import { isHighImpactDay } from "./warmup.js";

/** Reliable warm-up drills — always available, kid-friendly, low equipment. */
const WARMUP_PICK_ORDER = [
  "jumping-jacks",
  "high-knees",
  "fast-feet",
  "pogo-hops",
  "glute-bridge",
  "carioca",
  "rhythm-line-hops",
  "cross-body-toe-taps",
];

function findExercise(workouts, id) {
  for (const list of Object.values(workouts || {})) {
    const ex = (list || []).find(e => e.id === id);
    if (ex) return ex;
  }
  return null;
}

function enrichExercise(ex, exerciseMeta) {
  const meta = exerciseMeta?.[ex.id] || ex.meta || {};
  return {
    ...ex,
    meta,
    role: "warmup",
    _warmupBlock: true,
    sets: ex.sets || "2x30 s",
  };
}

export function isWarmupExercise(ex) {
  return !!(ex?.role === "warmup" || ex?._warmupBlock);
}

export function sessionAlreadyHasWarmup(exerciseList) {
  return (exerciseList || []).some(
    ex => isWarmupExercise(ex) || (ex.meta?.workoutRole || []).includes("warmup")
  );
}

/** Pick 2–3 dynamic warm-up drills to open every session. */
export function pickSessionWarmupExercises(workouts, exerciseMeta, { count = 2, categories = [] } = {}) {
  const want = isHighImpactDay(categories) ? Math.max(count, 3) : count;
  const pool = [];
  const seen = new Set();

  for (const id of WARMUP_PICK_ORDER) {
    if (pool.length >= want) break;
    const ex = findExercise(workouts, id);
    if (!ex || seen.has(id)) continue;
    pool.push(enrichExercise(ex, exerciseMeta));
    seen.add(id);
  }

  if (pool.length < want) {
    const cats = categories.length ? categories : Object.keys(workouts || {});
    for (const cat of cats) {
      for (const ex of workouts[cat] || []) {
        if (pool.length >= want) break;
        const roles = exerciseMeta?.[ex.id]?.workoutRole || [];
        if (!roles.includes("warmup")) continue;
        if (seen.has(ex.id)) continue;
        pool.push(enrichExercise(ex, exerciseMeta));
        seen.add(ex.id);
      }
    }
  }

  return pool;
}

export function categoriesFromExercises(exerciseList, allExercises = {}) {
  const cats = new Set();
  for (const ex of exerciseList || []) {
    const cat = ex._cat || allExercises[ex.id]?._cat;
    if (cat) cats.add(cat);
  }
  return [...cats];
}

/** Prepend warm-up drills when the list does not already include them. */
export function withSessionWarmup(exerciseList, workouts, exerciseMeta, options = {}) {
  const main = exerciseList || [];
  if (sessionAlreadyHasWarmup(main)) return main;
  const existing = new Set(main.map(e => e.id));
  const warmups = pickSessionWarmupExercises(workouts, exerciseMeta, options)
    .filter(w => !existing.has(w.id));
  return warmups.length ? [...warmups, ...main] : main;
}

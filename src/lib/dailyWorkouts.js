const STORE_KEY = "fkh-daily-workouts";

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

/** True when every exercise in the generated quick workout has been checked off (any date). */
export function isQuickWorkoutComplete(workout, completed) {
  if (!workout?.exercises?.length) return false;
  return workout.exercises.every(ex =>
    Object.keys(completed || {}).some(k => k.endsWith(`-${ex.id}`) && completed[k])
  );
}

/** True when every exercise in today's generated quick workout is checked off today. */
export function isQuickWorkoutCompleteToday(workout, completed, today) {
  if (!workout?.exercises?.length || !today) return false;
  return workout.exercises.every(ex => !!completed[`${today}-${ex.id}`]);
}

/**
 * On a new calendar day: drop completed workouts (fresh shuffle on next access).
 * Incomplete workouts carry over so athletes can finish them.
 */
export function readDailyWorkoutStore() {
  return readStore();
}

export function applyDayRollover(store, today, completed) {
  if (!store) {
    return { activeDate: today, selectedTemplate: null, coachBasisTemplate: null, workouts: {} };
  }
  if (store.activeDate === today) return store;

  const workouts = {};
  for (const [key, workout] of Object.entries(store.workouts || {})) {
    if (!isQuickWorkoutComplete(workout, completed)) {
      workouts[key] = workout;
    }
  }

  return {
    activeDate: today,
    selectedTemplate: store.selectedTemplate,
    coachBasisTemplate: store.selectedTemplate || null,
    workouts,
  };
}

export function loadDailyWorkoutStore(today, completed) {
  const store = applyDayRollover(readStore(), today, completed);
  writeStore(store);
  return store;
}

export function saveDailyWorkoutStore(store) {
  writeStore(store);
}

export function getCachedWorkout(store, templateKey) {
  return store?.workouts?.[templateKey] || null;
}

export function setCachedWorkout(store, templateKey, workout) {
  const next = {
    ...store,
    workouts: { ...(store.workouts || {}), [templateKey]: workout },
  };
  writeStore(next);
  return next;
}

export function setSelectedTemplateInStore(store, templateKey) {
  const next = { ...store, selectedTemplate: templateKey };
  writeStore(next);
  return next;
}

export function getOrCreateWorkout({
  store,
  templateKey,
  settings,
  recentExIds,
  generateWorkout,
  forceRegenerate = false,
}) {
  if (!forceRegenerate) {
    const cached = getCachedWorkout(store, templateKey);
    if (cached) return { workout: cached, store };
  }

  const workout = generateWorkout(settings, templateKey, recentExIds);
  if (!workout) return { workout: null, store };

  const nextStore = setCachedWorkout(store, templateKey, workout);
  return { workout, store: nextStore };
}

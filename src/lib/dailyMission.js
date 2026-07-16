/**
 * Persist today's Daily Mission once — same idea as fkh-daily-workouts.
 * Progress still reads live completed/programProgress; only the definition is frozen.
 */

export function isValidCachedMission(mission, today) {
  return !!(
    mission
    && mission.date === today
    && Array.isArray(mission.tasks)
    && mission.tasks.length > 0
    && typeof mission.title === "string"
  );
}

/** Exercise ids required by today's frozen mission (for anti-repeat exclusion). */
export function missionExerciseIds(mission) {
  const ids = new Set();
  for (const task of mission?.tasks || []) {
    for (const id of task.exercises || []) {
      if (id) ids.add(id);
    }
  }
  return ids;
}

/**
 * Read a cached mission from missionLog[today].mission, or generate + return
 * a patch to merge into missionLog. Does not write — caller persists.
 */
export function getOrCreateDailyMission({
  missionLog,
  today,
  generate,
}) {
  const entry = missionLog?.[today];
  if (isValidCachedMission(entry?.mission, today)) {
    return { mission: entry.mission, logPatch: null };
  }
  const mission = generate();
  if (!isValidCachedMission(mission, today)) {
    return { mission, logPatch: null };
  }
  return {
    mission,
    logPatch: {
      ...entry,
      mission,
    },
  };
}

/**
 * Build a one-off workout list from today's daily mission tasks.
 */
export function generateWorkoutFromMission(mission, allExercises) {
  if (!mission?.tasks?.length) return null;

  const ids = [];
  const seen = new Set();
  for (const task of mission.tasks) {
    for (const exId of task.exercises || []) {
      if (!seen.has(exId) && allExercises[exId]) {
        seen.add(exId);
        ids.push(exId);
      }
    }
  }
  if (!ids.length) return null;

  const exercises = ids.map(id => ({ ...allExercises[id], role: "main" }));
  return {
    templateKey: "mission",
    templateName: mission.title || "Today's Mission",
    templateEmoji: "🎯",
    templateDesc: "Drills pulled from your daily mission goals.",
    exercises,
    fromMission: true,
    generatedAt: Date.now(),
  };
}

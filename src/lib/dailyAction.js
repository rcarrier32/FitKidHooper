/**
 * Daily action resolver — unifies mission, workout template hint, and challenge nudge.
 * Mission generation stays in SummerTrainingApp; this layer composes outputs.
 */

const CHALLENGE_TEMPLATE_MAP = {
  "jump-5": "jump",
  "shots-50": "shooting",
  "handles-5": "handles",
  "speed-5": "quickFeet",
  "coord-5": "quickFeet",
};

export function pickChallengeNudge(challenges, getChallengeProgress, completed, threshold = 0.6) {
  if (!challenges?.length || !getChallengeProgress) return null;
  let best = null;
  let bestPct = 0;
  for (const def of challenges) {
    const { cur, target } = getChallengeProgress(def, completed);
    if (target <= 0 || cur >= target) continue;
    const pct = cur / target;
    if (pct >= threshold && pct > bestPct) {
      best = { ...def, cur, target, pct };
      bestPct = pct;
    }
  }
  return best;
}

export function resolveDailyAction({
  mission,
  enrolledPrograms,
  programProgress,
  todayStr,
  challenges,
  getChallengeProgress,
  completed,
  coachTemplateKey,
  activeProgram,
  dueSession,
}) {
  const challengeNudge = pickChallengeNudge(challenges, getChallengeProgress, completed);
  let workoutTemplate = coachTemplateKey || null;
  if (challengeNudge && CHALLENGE_TEMPLATE_MAP[challengeNudge.id]) {
    workoutTemplate = CHALLENGE_TEMPLATE_MAP[challengeNudge.id];
  }

  const programWidget = activeProgram && dueSession
    ? { program: activeProgram, session: dueSession.session, week: dueSession.week, sessionIdx: dueSession.sessionIdx }
    : null;

  const hasProgramTask = mission?.tasks?.some(t => t.type === "program");
  const requiredDone = mission?.tasks?.filter(t => t.required).every(() => false); // filled by caller

  return {
    mission,
    workoutTemplate,
    programWidget,
    challengeNudge,
    primaryCTA: hasProgramTask
      ? { label: "Continue program session", focus: "program" }
      : { label: "Start today's mission", focus: "mission" },
    showQuickWorkoutLink: true,
    requiredDone,
  };
}

export { CHALLENGE_TEMPLATE_MAP };

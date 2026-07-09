/**
 * Coach agent — grounded retrieval + adaptation (no LLM required).
 * Edge function and in-app coach call these helpers; LLM layer only explains citations.
 */
import { ALL_EXERCISES, EXERCISE_META, PROGRAMS } from "../data/trainingCatalog.js";
import { getSkill, SKILL_AREAS, skillTier, TIER_META } from "./skillGraph.js";
import {
  auditExerciseSkillCoverage,
  buildExerciseSkillIndex,
  exercisesForSkill,
  programsCoveringSkill,
  skillsForExercise,
} from "./exerciseSkills.js";
import {
  adaptDevelopmentPlan,
  DEVELOPMENT_PATHWAYS,
  DEVELOPMENT_TIERS,
  selectPathway,
} from "./developmentPathways.js";

let _indexCache = null;

function enrichProgramIds(ids) {
  return (ids || []).map((id) => {
    const p = PROGRAMS.find((x) => x.id === id);
    return p ? { id: p.id, name: p.name, emoji: p.emoji } : { id };
  });
}

export function getExerciseSkillIndex() {
  if (!_indexCache) _indexCache = buildExerciseSkillIndex(ALL_EXERCISES, EXERCISE_META);
  return _indexCache;
}

export function clearCoachKnowledgeCache() {
  _indexCache = null;
}

export const COACH_INTENTS = [
  "pathway_adapt",
  "recommend_program",
  "explain_drill",
  "explain_skill",
  "gap_analysis",
  "search_exercises",
];

/** Route a natural-language message to a structured intent (rule-based; LLM can override later) */
export function routeCoachIntent(message = "") {
  const m = message.toLowerCase();
  if (/what (program|plan)|recommend|should i (do|start|enroll)/.test(m)) return "recommend_program";
  if (/why|what does|explain.*(drill|exercise)/.test(m)) return "explain_drill";
  if (/skill|work on|improve|weak/.test(m)) return "gap_analysis";
  if (/pathway|development plan|long.?term/.test(m)) return "pathway_adapt";
  if (/find|search|drill for/.test(m)) return "search_exercises";
  if (/what is|explain/.test(m)) return "explain_skill";
  return "pathway_adapt";
}

export function buildAthleteContext({
  settings = {},
  completed = {},
  enrolledProgramIds = [],
  age,
}) {
  const athleteAge = age ?? (settings.dateOfBirth ? calcAgeFromDob(settings.dateOfBirth) : 12);
  const index = getExerciseSkillIndex();
  const plan = adaptDevelopmentPlan({
    age: athleteAge,
    experience: settings.experience || "beginner",
    goals: settings.goals || [],
    playStyle: settings.playStyle || "any",
    completed,
    enrolledProgramIds,
    exerciseSkillIndex: index,
  });
  return { athleteAge, exerciseSkillIndex: index, developmentPlan: plan, settings };
}

function calcAgeFromDob(dob) {
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.min(17, Math.max(9, age));
}

export function explainExercise(exerciseId) {
  const ex = ALL_EXERCISES[exerciseId];
  if (!ex) return null;
  const index = getExerciseSkillIndex();
  const mapping = index[exerciseId];
  const meta = EXERCISE_META[exerciseId] || ex.meta || {};
  const skills = (mapping?.skills || []).map((id) => {
    const sk = getSkill(id);
    return sk ? { id, name: sk.name, area: sk.area, tier: skillTier(id) } : { id };
  });
  const programs = PROGRAMS.filter((p) =>
    (p.weeks || []).some((w) => (w.sessions || []).some((s) => (s.exercises || []).includes(exerciseId))),
  ).map((p) => ({ id: p.id, name: p.name }));

  return {
    exerciseId,
    name: ex.name,
    category: ex._cat,
    desc: ex.desc,
    coachNotes: ex.coachNotes,
    skills,
    areas: mapping?.areas || [],
    tier: mapping?.tier,
    basketballTransfer: meta.basketballTransfer,
    programs,
    citations: [
      { type: "exercise", id: exerciseId },
      ...skills.map((s) => ({ type: "skill", id: s.id })),
    ],
  };
}

export function explainSkill(skillId) {
  const sk = getSkill(skillId);
  if (!sk) return null;
  const index = getExerciseSkillIndex();
  const exercises = exercisesForSkill(skillId, index).slice(0, 8).map((e) => {
    const ex = ALL_EXERCISES[e.exerciseId];
    return { id: e.exerciseId, name: ex?.name || e.exerciseId, tier: e.tier };
  });
  const programs = programsCoveringSkill(skillId, PROGRAMS, index).map((p) => ({ id: p.id, name: p.name }));

  return {
    skillId,
    name: sk.name,
    area: sk.area,
    areaLabel: SKILL_AREAS[sk.area]?.label,
    tier: skillTier(skillId),
    tierLabel: TIER_META[skillTier(skillId)]?.label,
    exercises,
    programs,
    citations: [{ type: "skill", id: skillId }, ...exercises.map((e) => ({ type: "exercise", id: e.id }))],
  };
}

export function searchExercisesForSkill(skillId, { maxTier = 3, limit = 12 } = {}) {
  const index = getExerciseSkillIndex();
  return exercisesForSkill(skillId, index)
    .filter((e) => !e.tier || e.tier <= maxTier)
    .slice(0, limit)
    .map((e) => {
      const ex = ALL_EXERCISES[e.exerciseId];
      return { id: e.exerciseId, name: ex?.name, tier: e.tier, areas: e.areas };
    });
}

export function runGapAnalysis(ctx) {
  const { developmentPlan } = buildAthleteContext(ctx);
  const index = getExerciseSkillIndex();
  const coverage = auditExerciseSkillCoverage(ALL_EXERCISES, EXERCISE_META);

  return {
    pathway: { id: developmentPlan.pathwayId, name: developmentPlan.pathwayName },
    targetTier: developmentPlan.targetTier,
    tierLabel: developmentPlan.tierLabel,
    skillGaps: developmentPlan.skillGaps,
    weakAreas: developmentPlan.weakAreas,
    recommendedPrograms: developmentPlan.recommendedPrograms.map((id) => {
      const p = PROGRAMS.find((x) => x.id === id);
      return p ? { id: p.id, name: p.name, emoji: p.emoji } : { id };
    }),
    catalogCoverage: {
      mapped: coverage.withSkills,
      total: coverage.total,
      unmappedCount: coverage.unmapped.length,
    },
    citations: developmentPlan.skillGaps.map((g) => ({ type: "skill", id: g.id })),
  };
}

export function recommendProgram(ctx) {
  const analysis = runGapAnalysis(ctx);
  const top = analysis.recommendedPrograms[0];
  return {
    ...analysis,
    primaryRecommendation: top,
    message: top
      ? `Based on your ${analysis.tierLabel} phase, start with ${top.emoji || ""} ${top.name}.`
      : "You're enrolled in the right programs for your current phase — keep stacking sessions.",
  };
}

/**
 * Main coach agent entry — structured response for UI or edge function.
 * LLM layer receives this payload and rewrites `message` in coach voice.
 */
export function handleCoachRequest({
  intent,
  message = "",
  exerciseId,
  skillId,
  athleteContext = {},
}) {
  const resolvedIntent = intent || routeCoachIntent(message);
  const ctx = athleteContext;

  switch (resolvedIntent) {
    case "explain_drill":
      return {
        intent: resolvedIntent,
        data: explainExercise(exerciseId) || explainExercise(findExerciseIdFromMessage(message)),
        message: null,
      };
    case "explain_skill":
      return {
        intent: resolvedIntent,
        data: explainSkill(skillId) || explainSkill(findSkillIdFromMessage(message)),
        message: null,
      };
    case "search_exercises":
      return {
        intent: resolvedIntent,
        data: searchExercisesForSkill(skillId || findSkillIdFromMessage(message)),
        message: null,
      };
    case "recommend_program": {
      const rec = recommendProgram(ctx);
      return { intent: resolvedIntent, data: rec, message: rec.message };
    }
    case "gap_analysis": {
      const gaps = runGapAnalysis(ctx);
      return {
        intent: resolvedIntent,
        data: gaps,
        message: gaps.skillGaps.length
          ? `Focus next on: ${gaps.skillGaps.slice(0, 3).map((g) => g.name).join(", ")}.`
          : "Your skill targets for this phase are on track.",
      };
    }
    case "pathway_adapt":
    default: {
      const { developmentPlan } = buildAthleteContext(ctx);
      const pathway = DEVELOPMENT_PATHWAYS.find((p) => p.id === developmentPlan.pathwayId);
      const programs = enrichProgramIds(developmentPlan.recommendedPrograms);
      return {
        intent: "pathway_adapt",
        data: { ...developmentPlan, recommendedPrograms: programs, pathwayDescription: pathway?.description, tiers: DEVELOPMENT_TIERS },
        message: `${developmentPlan.pathwayName} · ${developmentPlan.tierLabel} phase. ${programs.length ? `Next program: ${programs[0].emoji || ""} ${programs[0].name || programs[0].id}.` : "Stay consistent with your current plan."}`,
      };
    }
  }
}

function findExerciseIdFromMessage(message) {
  const m = message.toLowerCase();
  for (const [id, ex] of Object.entries(ALL_EXERCISES)) {
    if (m.includes(id.replace(/-/g, " ")) || m.includes((ex.name || "").toLowerCase())) return id;
  }
  return null;
}

function findSkillIdFromMessage(message) {
  const m = message.toLowerCase();
  for (const sk of Object.values(SKILL_AREAS)) {
    if (m.includes(sk.label.toLowerCase())) return null;
  }
  const keywords = [
    ["crossover", "cross"], ["handles", "pound"], ["shooting", "catch_shoot"],
    ["finish", "layup"], ["defense", "def_stance"], ["rebound", "reb_ready"],
  ];
  for (const [kw, id] of keywords) {
    if (m.includes(kw)) return id;
  }
  return null;
}

export { skillsForExercise, DEVELOPMENT_PATHWAYS, adaptDevelopmentPlan, selectPathway };

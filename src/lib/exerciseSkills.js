/**
 * Exercise → skill-graph bridge.
 * Maps every catalog exercise to skillGraph areas/skills/tiers for retrieval and agent grounding.
 */
import { areaForCategory, getSkill, skillTier, SKILLS } from "./skillGraph.js";

/** basketballTransfer tag → skillGraph skill ids */
export const TRANSFER_TO_SKILL = {
  footwork: ["jump_stop_skill", "front_pivot_skill"],
  quickness: ["speed_gather", "jab_go"],
  defense: ["def_stance", "slide"],
  cutting: ["jab_go", "cross"],
  shooting: ["catch_shoot", "spot_up"],
  "first-step": ["speed_gather", "jab_go"],
  rebounding: ["reb_ready", "reb_pursuit"],
  stability: ["jump_stop_skill"],
  speed: ["speed_gather"],
  sprinting: ["speed_gather"],
  running: ["speed_gather"],
  finishing: ["layup", "scoop"],
  "contact-finishing": ["layup", "power_gather"],
  "post-footwork": ["front_pivot_skill", "reverse_pivot_skill"],
  "post-position": ["power_gather"],
  "power-move": ["power_gather", "layup"],
  sealing: ["power_gather"],
  "post-shooting": ["catch_shoot"],
  touch: ["floater", "scoop"],
  "shot-fake": ["shot_fake_drive"],
  reaction: ["hesitation", "containment"],
  landing: ["jump_stop_skill"],
  power: ["power_gather"],
  explosion: ["speed_gather"],
  jumping: ["speed_gather"],
  conditioning: [],
  strength: [],
  all: [],
};

/** When no skill match, one foundational skill per area */
export const AREA_FALLBACK_SKILLS = {
  handles: ["pound"],
  shooting: ["catch_shoot"],
  finishing: ["layup"],
  footwork: ["jump_stop_skill"],
  passing: ["chest"],
  defense: ["def_stance"],
  rebounding: ["reb_ready"],
  athleticism: [],
};

export const DIFFICULTY_TIER = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/** [RegExp, skillIds] — tested against exercise id + name */
export const ID_SKILL_RULES = [
  [/\bcross/i, ["cross"]],
  [/\bbtl\b|between.?the.?leg/i, ["between"]],
  [/\bbehind/i, ["behind"]],
  [/\beuro/i, ["euro"]],
  [/step.?back|stepback/i, ["step_back"]],
  [/\bfloater/i, ["floater"]],
  [/\blayup/i, ["layup"]],
  [/\bhook\b/i, ["up_under"]],
  [/\bspin\b/i, ["spin"]],
  [/\bhesi/i, ["hesitation"]],
  [/\bpound/i, ["pound"]],
  [/\bretreat/i, ["retreat"]],
  [/\bpullup|pull.?up/i, ["pullup_1"]],
  [/\bcatch.?shoot/i, ["catch_shoot"]],
  [/\bspot.?up/i, ["spot_up"]],
  [/\bcloseout/i, ["closeout"]],
  [/\bslide/i, ["slide"]],
  [/\bcontest/i, ["contest"]],
  [/\bbox.?out|reb-|rebound/i, ["reb_ready", "reb_pursuit"]],
  [/\boutlet/i, ["outlet", "reb_outlet"]],
  [/\bputback|put.?back/i, ["reb_putback"]],
  [/\bchest.?pass/i, ["chest"]],
  [/\bbounce.?pass/i, ["bounce"]],
  [/\bpocket.?pass|pnr/i, ["pocket"]],
  [/\bcurl/i, ["curl"]],
  [/\bflare/i, ["flare"]],
  [/\bpin.?down/i, ["pin_down"]],
  [/^bh-/, ["pound", "cross"]],
  [/^gh-/, ["cross", "hesitation"]],
  [/^fin-/, ["speed_gather", "layup"]],
  [/^sh-/, ["catch_shoot"]],
  [/^pm-/, ["power_gather", "up_under"]],
  [/^def-/, ["def_stance", "slide"]],
  [/^reb-/, ["reb_ready"]],
];

/**
 * Curated overrides for exercises where heuristics are weak.
 * skills: skillGraph ids; tier: optional override.
 */
export const EXERCISE_SKILL_OVERRIDES = {
  "bh-pound": { skills: ["pound"] },
  "bh-crossover": { skills: ["cross"] },
  "bh-btl": { skills: ["between"] },
  "bh-in-out": { skills: ["in_out"] },
  "bh-retreat": { skills: ["retreat"] },
  "bh-combo": { skills: ["cross", "behind"] },
  "bh-attack-cross": { skills: ["cross", "speed_gather"] },
  "weak-hand": { skills: ["pound"] },
  "two-ball": { skills: ["pound", "between"] },
  "tennis-dribble": { skills: ["pound"] },
  "gh-stationary-cross": { skills: ["cross"] },
  "gh-change-pace": { skills: ["hesitation", "cross"] },
  "gh-dribble-drive": { skills: ["cross", "speed_gather"] },
  "gh-cross-btl": { skills: ["cross", "between"] },
  "gh-behind-back": { skills: ["behind"] },
  "sackmann-hesi": { skills: ["hesitation", "cross"] },
  "relph-twoball": { skills: ["pound", "between"] },
  "fin-power-layup": { skills: ["layup", "power_gather"] },
  "fin-mikan": { skills: ["layup", "scoop"] },
  "fin-euro": { skills: ["euro"] },
  "fin-pro-hop": { skills: ["pro_hop"] },
  "pm-drop-step": { skills: ["power_gather"], tier: 2 },
  "pm-hook": { skills: ["up_under"] },
  "pm-up-under": { skills: ["up_under"] },
  "pm-spin": { skills: ["spin", "power_gather"] },
  "def-slide": { skills: ["slide", "def_stance"] },
  "def-closeout": { skills: ["closeout"] },
  "def-mirror": { skills: ["containment"] },
  "pogo-jumps": { skills: [], tier: 1 },
  "squat-jumps": { skills: [], tier: 2 },
  "drop-jump": { skills: [], tier: 3 },
  "iq-read-def": { skills: ["containment", "def_stance"], tier: 2 },
  "iq-spacing": { skills: ["spot_up"], tier: 2 },
  "iq-transition": { skills: ["speed_gather", "outlet"], tier: 2 },
  "pg-partner-pass": { skills: ["chest", "bounce"], tier: 1 },
  "pg-1v1": { skills: ["cross", "layup"], tier: 2 },
  "pg-2v2": { skills: ["catch_shoot", "closeout"], tier: 2 },
  "pg-3v3": { skills: ["kick_out", "containment"], tier: 3 },
};

/**
 * Resolve skills for one exercise.
 * @returns {{ exerciseId: string, areas: string[], skills: string[], tier: number|null, sources: string[] }}
 */
export function resolveExerciseSkills(exerciseId, exercise, meta = {}) {
  const areas = new Set();
  const skills = new Set();
  const sources = [];

  const area = areaForCategory(exercise?._cat);
  if (area) areas.add(area);

  const override = EXERCISE_SKILL_OVERRIDES[exerciseId];
  if (override?.skills) {
    override.skills.forEach((s) => skills.add(s));
    sources.push("override");
  }

  for (const tag of meta.basketballTransfer || []) {
    const mapped = TRANSFER_TO_SKILL[tag];
    if (!mapped?.length) continue;
    mapped.forEach((s) => skills.add(s));
    sources.push(`transfer:${tag}`);
  }

  const label = `${exerciseId} ${exercise?.name || ""}`;
  for (const [re, skillIds] of ID_SKILL_RULES) {
    if (re.test(label)) {
      skillIds.forEach((s) => skills.add(s));
      sources.push(`rule:${re.source}`);
    }
  }

  if (skills.size === 0 && area && AREA_FALLBACK_SKILLS[area]) {
    AREA_FALLBACK_SKILLS[area].forEach((s) => skills.add(s));
    sources.push("area-fallback");
  }

  let tier = override?.tier ?? (meta.difficulty ? DIFFICULTY_TIER[meta.difficulty] : null);
  if (tier == null && skills.size) {
    const tiers = [...skills].map(skillTier).filter(Boolean);
    tier = tiers.length ? Math.max(...tiers) : null;
  }

  return {
    exerciseId,
    areas: [...areas],
    skills: [...skills].filter((id) => getSkill(id)),
    tier,
    sources: [...new Set(sources)],
  };
}

/** Build index: exerciseId → resolved entry */
export function buildExerciseSkillIndex(allExercises, exerciseMeta = {}) {
  const index = {};
  for (const [id, ex] of Object.entries(allExercises || {})) {
    index[id] = resolveExerciseSkills(id, ex, exerciseMeta[id] || ex.meta || {});
  }
  return index;
}

export function skillsForExercise(exerciseId, index) {
  return index[exerciseId]?.skills || [];
}

export function exercisesForSkill(skillId, index) {
  return Object.values(index).filter((e) => e.skills.includes(skillId));
}

export function exercisesForArea(area, index) {
  return Object.values(index).filter((e) => e.areas.includes(area));
}

/** Programs whose session exercises touch a skill */
export function programsCoveringSkill(skillId, programs, index) {
  return (programs || []).filter((prog) =>
    (prog.weeks || []).some((w) =>
      (w.sessions || []).some((s) =>
        (s.exercises || []).some((exId) => index[exId]?.skills?.includes(skillId)),
      ),
    ),
  );
}

/** Aggregate skill coverage stats for audits */
export function auditExerciseSkillCoverage(allExercises, exerciseMeta = {}) {
  const index = buildExerciseSkillIndex(allExercises, exerciseMeta);
  const entries = Object.values(index);
  const withSkills = entries.filter((e) => e.skills.length > 0);
  const athleticOnly = entries.filter((e) => e.areas.includes("athleticism") && e.skills.length === 0);
  const unmapped = entries.filter((e) => e.skills.length === 0 && !e.areas.includes("athleticism"));

  const skillCounts = {};
  for (const s of SKILLS) skillCounts[s.id] = 0;
  for (const e of withSkills) {
    for (const s of e.skills) skillCounts[s] = (skillCounts[s] || 0) + 1;
  }
  const orphanSkills = SKILLS.filter((s) => !skillCounts[s.id]).map((s) => s.id);

  const areaCounts = {};
  for (const area of ["handles", "shooting", "finishing", "footwork", "passing", "defense", "rebounding", "athleticism"]) {
    areaCounts[area] = exercisesForArea(area, index).length;
  }

  return {
    total: entries.length,
    withSkills: withSkills.length,
    athleticOnly: athleticOnly.length,
    unmapped: unmapped.map((e) => e.exerciseId),
    orphanSkills,
    skillCounts,
    areaCounts,
    index,
  };
}

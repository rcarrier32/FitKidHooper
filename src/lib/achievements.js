/**
 * Progression framework — ONE catalog, ONE ledger, ONE grant path.
 *
 * Everything a player can earn is an entry here: legacy badges, mastery-journey
 * milestones, the Titles and Cosmetics those milestones unlock, and (later)
 * challenge/community recognition. Future systems (Challenges, Community Feed,
 * Coach) consume this — they never add a parallel earn/own system.
 *
 * Design notes:
 *  - The catalog lives in CODE (stable ids, like drill ids). No DB catalog table.
 *  - Unlock evaluation runs in app code against stats we ALREADY compute.
 *  - A "mastery track" is just a named family of milestones in a journey order.
 *  - Milestones GRANT a Title and/or Cosmetic — those are their own catalog rows,
 *    so equipping and cross-user display look them up by id.
 */

/* ── Category buckets (raw exercise categories → a journey's skill area) ───── */
const BUCKETS = {
  handles:   ["handles", "ballhandling", "game_handles"],
  defense:   ["deceleration", "athletic"],
  explosion: ["explosion"],
  finishing: ["finishing", "finishing_school", "footwork", "footwork_lab"],
  midrange:  ["shooting_lab", "shootingdrills", "footwork_lab"],
  touch:     ["finishing", "finishing_school"],
};

function bucketSum(catCounts, keys) {
  return keys.reduce((n, k) => n + (catCounts?.[k] || 0), 0);
}

/* ── Mastery Tracks — multi-stage named journeys (aspiration > certification) ─
 * Each stage is a cooler identity than the last. Stages unlock an equippable
 * Title and a Cosmetic. Gates run on existing signals (makes, streak, category
 * reps, completed programs) so this ships with no new tracking.
 */
/* A journey rung carries BOTH an original identity (the owned, equippable Title —
 * legally clean, brandable, cooler to wear) and an optional `inspo` legend used as
 * the recognizable RANK label and homage (text only — no logos/jerseys/images).
 * The peak rung is a "Conquest": a feat you complete, not an identity you claim.
 * Legend rungs can be globally hidden via SHOW_LEGEND_NAMES. */
export const SHOW_LEGEND_NAMES = true;

export const MASTERY_TRACKS = [
  {
    id: "shooter", name: "Shooting", emoji: "🎯", archetype: "The Shooter",
    theme: "From open looks to limitless range — walk the line of the greatest shooters ever.",
    favoritePlayerKeys: ["curry","steph","allen","ray","miller","reggie","thompson","klay","bird","durant","kd","lillard","dame","korver","maravich","pistol"],
    stages: [
      { id: "shooter-1", name: "Spot-Up Kid", emoji: "🎯", flavor: "You knock down the open ones.",
        color: "#60a5fa", rarity: "common",
        gate: c => c.makes >= 100 },
      { id: "shooter-2", name: "Knockdown", inspo: "Ray Allen", emoji: "🎯", flavor: "Catch, rise, splash — textbook form.",
        color: "#38bdf8", rarity: "rare",
        title: { id: "title-knockdown", label: "Knockdown" },
        cosmetic: { id: "cos-splash-silver", label: "Silver Splash Frame", slot: "frame", emoji: "💧" },
        gate: c => c.makes >= 750 },
      { id: "shooter-3", name: "Microwave", inspo: "Reggie Miller", emoji: "🔥", flavor: "You heat up in a hurry.",
        color: "#a78bfa", rarity: "epic",
        title: { id: "title-microwave", label: "Microwave" },
        cosmetic: { id: "cos-scope-gold", label: "Gold Scope Frame", slot: "frame", emoji: "🔭" },
        gate: c => c.makes >= 2000 },
      { id: "shooter-4", name: "Splash Brother", inspo: "Klay Thompson", emoji: "🌊", flavor: "Quick trigger, no conscience.",
        color: "#c084fc", rarity: "epic",
        title: { id: "title-splash-bro", label: "Splash Brother" },
        cosmetic: { id: "cos-splash-blue", label: "Blue Splash Frame", slot: "frame", emoji: "💦" },
        gate: c => c.makes >= 4000 },
      { id: "shooter-5", name: "Splash God", inspo: "Curry Conquest", emoji: "👑", flavor: "Range? Unlimited. The summit of shooting.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-splash-god", label: "Splash God" },
        cosmetic: { id: "cos-splash-anim", label: "Animated Splash Frame", slot: "frame", emoji: "🌊" },
        unlockNote: "Earn Range Certified (33% from 3) to unlock",
        gate: c => c.makes >= 5000 && c.ledgerIds.has("title-range-certified") },
    ],
  },
  {
    id: "midrange", name: "Mid-Range", emoji: "🎯", archetype: "The Mid-Range Maestro",
    theme: "The lost art — come off the screen, rise from the elbow, bury it. Own the in-between game.",
    favoritePlayerKeys: ["hamilton","rip","cade","cunningham","derozan","demar","dirk","nowitzki","midrange","mid-range","pullup","pull-up","elbow"],
    stages: [
      { id: "midrange-1", name: "Pull-Up Kid", emoji: "🎯", flavor: "One dribble into a clean look.",
        color: "#60a5fa", rarity: "common",
        gate: c => c.buckets.midrange >= 15 },
      { id: "midrange-2", name: "Curl Specialist", inspo: "Rip Hamilton", emoji: "🏃", flavor: "Off the screen, catch, rise — never stops moving.",
        color: "#38bdf8", rarity: "rare",
        title: { id: "title-curl-specialist", label: "Curl Specialist" },
        cosmetic: { id: "cos-motion-frame", label: "Motion Frame", slot: "frame", emoji: "🏃" },
        gate: c => c.buckets.midrange >= 40 },
      { id: "midrange-3", name: "The Surgeon", inspo: "Cade Cunningham", emoji: "🔪", flavor: "Big guard, slow heartbeat, surgical pull-up.",
        color: "#a78bfa", rarity: "epic",
        title: { id: "title-surgeon", label: "The Surgeon" },
        cosmetic: { id: "cos-scalpel", label: "Scalpel Emote", slot: "emote", emoji: "🔪" },
        gate: c => c.buckets.midrange >= 80 },
      { id: "midrange-4", name: "Mid-Range Assassin", inspo: "DeRozan Conquest", emoji: "🎯", flavor: "From the elbow, it's automatic. The peak of the in-between game.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-midrange-assassin", label: "Mid-Range Assassin" },
        cosmetic: { id: "cos-bullseye-frame", label: "Bullseye Frame", slot: "frame", emoji: "🎯" },
        unlockNote: "Earn Elbow Money (40% mid-range) to unlock",
        gate: c => c.buckets.midrange >= 90 && c.ledgerIds.has("title-elbow-money") },
    ],
  },
  {
    id: "maestro", name: "Playmaking", emoji: "🧠", archetype: "The Maestro",
    theme: "Make the defense dance and your team better — in the lineage of the great floor generals.",
    favoritePlayerKeys: ["stockton","magic","johnson","nash","kidd","paul","cp3","rondo","point","haliburton","assist"],
    stages: [
      { id: "maestro-1", name: "Floor Spacer", emoji: "🤲", flavor: "The ball's on a string.",
        color: "#22d3ee", rarity: "common",
        gate: c => c.buckets.handles >= 10 },
      { id: "maestro-2", name: "Pure Point", inspo: "John Stockton", emoji: "🎯", flavor: "Fundamentals on a string — always the right read.",
        color: "#06b6d4", rarity: "rare",
        title: { id: "title-pure-point", label: "Pure Point" },
        cosmetic: { id: "cos-dimes", label: "Dimes Sticker", slot: "avatar_gear", emoji: "💎" },
        gate: c => c.buckets.handles >= 35 },
      { id: "maestro-3", name: "The Maestro", inspo: "Steve Nash", emoji: "🪄", flavor: "You orchestrate the whole floor.",
        color: "#818cf8", rarity: "epic",
        title: { id: "title-maestro", label: "The Maestro" },
        cosmetic: { id: "cos-wizard", label: "Wizard Hat", slot: "avatar_gear", emoji: "🪄" },
        gate: c => c.buckets.handles >= 70 },
      { id: "maestro-4", name: "Floor General", inspo: "Magic Conquest", emoji: "🎖️", flavor: "You see the play before it happens. The peak of playmaking.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-floor-general", label: "Floor General" },
        cosmetic: { id: "cos-chevron", label: "General's Chevron Frame", slot: "frame", emoji: "🎖️" },
        gate: c => c.buckets.handles >= 110 && c.earnedBadgeIds.has("pgm-guard-handles") },
    ],
  },
  {
    id: "lockdown", name: "Defense", emoji: "🛡️", archetype: "The Lockdown",
    theme: "Nobody scores on you twice. Follow the path of the greatest stoppers.",
    favoritePlayerKeys: ["payton","glove","pippen","jordan","mj","kawhi","leonard","garnett","kg","rodman","mutombo","wallace","defense","stopper"],
    stages: [
      { id: "lockdown-1", name: "Ball Hawk", emoji: "🐝", flavor: "You're a problem out there.",
        color: "#86efac", rarity: "common",
        gate: c => c.buckets.defense >= 15 },
      { id: "lockdown-2", name: "The Glove", inspo: "Gary Payton", emoji: "🧤", flavor: "You clamp up the best guard on the floor.",
        color: "#22c55e", rarity: "rare",
        title: { id: "title-glove", label: "The Glove" },
        cosmetic: { id: "cos-wall-frame", label: "Brick Wall Frame", slot: "frame", emoji: "🧱" },
        gate: c => c.buckets.defense >= 40 },
      { id: "lockdown-3", name: "Wing Stopper", inspo: "Scottie Pippen", emoji: "🛑", flavor: "Long, switchable, relentless.",
        color: "#16a34a", rarity: "epic",
        title: { id: "title-wing-stopper", label: "Wing Stopper" },
        cosmetic: { id: "cos-cuffs", label: "Handcuffs Emote", slot: "emote", emoji: "🔒" },
        gate: c => c.buckets.defense >= 80 },
      { id: "lockdown-4", name: "The Lockdown", emoji: "🔒", flavor: "Welcome to jail. Defensive Player of the Year.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-lockdown", label: "The Lockdown" },
        cosmetic: { id: "cos-vault-frame", label: "Vault Frame", slot: "frame", emoji: "🔐" },
        gate: c => c.buckets.defense >= 120 },
    ],
  },
  {
    id: "finisher", name: "Slashing", emoji: "⚡", archetype: "The Finisher",
    theme: "Live in the paint and finish through anything — channel the most electric scorers.",
    favoritePlayerKeys: ["wade","flash","iverson","ai","erving","doctor","rose","harden","kyrie","irving","finisher","slash"],
    stages: [
      { id: "finisher-1", name: "Downhill", emoji: "🏃", flavor: "First step's got juice.",
        color: "#fcd34d", rarity: "common",
        gate: c => c.buckets.finishing >= 15 },
      { id: "finisher-2", name: "The Acrobat", inspo: "Dr. J", emoji: "🤸", flavor: "Body control nobody can teach.",
        color: "#fbbf24", rarity: "rare",
        title: { id: "title-acrobat", label: "The Acrobat" },
        cosmetic: { id: "cos-bucket", label: "Bucket Sticker", slot: "avatar_gear", emoji: "🪣" },
        gate: c => c.buckets.finishing >= 40 },
      { id: "finisher-3", name: "Flash", inspo: "Dwyane Wade", emoji: "⚡", flavor: "Too quick, too strong, too late.",
        color: "#f59e0b", rarity: "epic",
        title: { id: "title-flash", label: "Flash" },
        cosmetic: { id: "cos-blur", label: "Blur Frame", slot: "frame", emoji: "⚡" },
        gate: c => c.buckets.finishing >= 80 },
      { id: "finisher-4", name: "Bucket Getter", inspo: "Bucket Conquest", emoji: "🪣", flavor: "You just get buckets. The summit of scoring.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-bucket-getter", label: "Bucket Getter" },
        cosmetic: { id: "cos-flame-trail", label: "Flame Trail", slot: "emote", emoji: "🔥" },
        unlockNote: "Earn Finisher Certified (15 layups in a row) to unlock",
        gate: c => c.buckets.finishing >= 90 && c.ledgerIds.has("title-finisher-certified") },
    ],
  },
  {
    id: "floater", name: "Floater", emoji: "🌧️", archetype: "The Floater",
    theme: "The runner in the lane — drop the teardrop over the big and walk away cool.",
    favoritePlayerKeys: ["parker","tony","teardrop","floater","trae","gervin","iceman","runner"],
    stages: [
      { id: "floater-1", name: "Teardrop Kid", emoji: "💧", flavor: "Soft touch over the first big.",
        color: "#60a5fa", rarity: "common",
        gate: c => c.buckets.touch >= 15 },
      { id: "floater-2", name: "The Runner", inspo: "Trae Young", emoji: "🌧️", flavor: "Floats it up before the help even arrives.",
        color: "#38bdf8", rarity: "rare",
        title: { id: "title-runner", label: "The Runner" },
        cosmetic: { id: "cos-teardrop", label: "Teardrop Emote", slot: "emote", emoji: "💧" },
        gate: c => c.buckets.touch >= 35 && c.makes >= 300 },
      { id: "floater-3", name: "Soft Touch", inspo: "Kyrie Irving", emoji: "☁️", flavor: "Impossible angles, feather touch.",
        color: "#a78bfa", rarity: "epic",
        title: { id: "title-soft-touch", label: "Soft Touch" },
        cosmetic: { id: "cos-cloud-frame", label: "Cloud Frame", slot: "frame", emoji: "☁️" },
        gate: c => c.buckets.touch >= 70 && c.makes >= 800 },
      { id: "floater-4", name: "The Teardrop", inspo: "Tony Parker Conquest", emoji: "🌊", flavor: "The teardrop is automatic. Nobody floats it like you.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-teardrop", label: "The Teardrop" },
        cosmetic: { id: "cos-rain-frame", label: "Rainmaker Frame", slot: "frame", emoji: "🌧️" },
        unlockNote: "Earn FT Sniper (70% free throws) to unlock",
        gate: c => c.buckets.touch >= 90 && c.ledgerIds.has("title-ft-sniper") },
    ],
  },
  {
    id: "skywalker", name: "Athleticism", emoji: "💥", archetype: "Above the Rim",
    theme: "Play above the rim — rise with the greatest leapers the game has seen.",
    favoritePlayerKeys: ["carter","vince","lavine","griffin","lebron","james","ja","morant","dunk","westbrook","zion","hops"],
    stages: [
      { id: "skywalker-1", name: "Springs", emoji: "🌀", flavor: "Off the floor in a hurry.",
        color: "#fda4af", rarity: "common",
        gate: c => c.buckets.explosion >= 15 },
      { id: "skywalker-2", name: "Above the Rim", inspo: "Vince Carter", emoji: "🦅", flavor: "Half-man, half-amazing.",
        color: "#fb7185", rarity: "rare",
        title: { id: "title-above-rim", label: "Above the Rim" },
        cosmetic: { id: "cos-hops-trail", label: "Hops Trail", slot: "emote", emoji: "🦘" },
        gate: c => c.buckets.explosion >= 40 },
      { id: "skywalker-3", name: "Rim Wrecker", inspo: "Dunk Conquest", emoji: "💥", flavor: "Get out the way. The peak of bounce.",
        color: "#f59e0b", rarity: "legendary", conquest: true,
        title: { id: "title-rim-wrecker", label: "Rim Wrecker" },
        cosmetic: { id: "cos-rim-shake", label: "Rim-Shake Frame", slot: "frame", emoji: "💥" },
        gate: c => c.buckets.explosion >= 80 && c.earnedBadgeIds.has("pgm-jump-higher") },
    ],
  },
];

/* ── Meta track — the multi-year north star, gated on the other journeys ───── */
const CORE_TRACK_IDS = MASTERY_TRACKS.map(t => t.id);

export const META_TRACK = {
  id: "legacy", name: "The Franchise", emoji: "🏆",
  theme: "The face of the program.",
  stages: [
    { id: "legacy-1", name: "Two-Way Threat", emoji: "🔁", flavor: "You do it on both ends.",
      color: "#a78bfa", rarity: "epic",
      title: { id: "title-two-way", label: "Two-Way Threat" },
      // ≥2 core tracks reached at least their 2nd stage
      metaGate: reached => CORE_TRACK_IDS.filter(t => (reached[t] || 0) >= 2).length >= 2 },
    { id: "legacy-2", name: "The Franchise", emoji: "🏆", flavor: "They build the team around you.",
      color: "#f59e0b", rarity: "legendary",
      title: { id: "title-franchise", label: "The Franchise" },
      cosmetic: { id: "cos-legend-frame", label: "Legend Frame", slot: "frame", emoji: "🏆" },
      metaGate: reached => CORE_TRACK_IDS.filter(t => isTrackComplete(t, reached)).length >= 3 },
    { id: "legacy-3", name: "Hall of Famer", emoji: "🏛️", flavor: "First ballot. No debate.",
      color: "#fde68a", rarity: "legendary",
      title: { id: "title-hof", label: "Hall of Famer" },
      cosmetic: { id: "cos-hof-jacket", label: "HOF Jacket", slot: "avatar_gear", emoji: "🧥" },
      metaGate: reached => CORE_TRACK_IDS.every(t => isTrackComplete(t, reached)) },
  ],
};

function trackById(id) {
  return MASTERY_TRACKS.find(t => t.id === id);
}
function isTrackComplete(trackId, reached) {
  const t = trackById(trackId);
  return t ? (reached[trackId] || 0) >= t.stages.length : false;
}

/* ── Challenge rewards — granted server-side via the same ledger (kind=cosmetic
 * so they're equippable). Not part of a mastery track; their own `challenge` family. */
export const CHALLENGE_REWARDS = [
  { id: "cos-weekly-flame", kind: "cosmetic", family: "challenge", slot: "emote",
    name: "Flame Trail", emoji: "🔥", color: "#f97316", rarity: "rare" },
];

/* ── Benchmarks — measured accuracy tests. Crossing a threshold earns a
 * certification, which IS an equippable title in the ledger (reward real accuracy,
 * not just volume). The append-only result series lives in `benchmark_results`. */
// Kid-reasonable thresholds: achievable for a dedicated youth player with practice
// (FT 70%, a 1-of-3 three-point clip, etc.) — meaningful, not pro-level.
export const BENCHMARKS = [
  { id: "ft_pct",       label: "Free Throw %", unit: "%", threshold: 70, emoji: "🎯",
    color: "#38bdf8", title: { id: "title-ft-sniper",      label: "FT Sniper" } },
  { id: "spot3_pct",    label: "Spot 3PT %",   unit: "%", threshold: 33, emoji: "🌧️",
    color: "#a78bfa", title: { id: "title-range-certified", label: "Range Certified" } },
  { id: "midrange_pct", label: "Mid-Range %",  unit: "%", threshold: 40, emoji: "🔪",
    color: "#f59e0b", title: { id: "title-elbow-money",     label: "Elbow Money" } },
  { id: "layups_row",   label: "Layups in a Row", unit: "", threshold: 15, emoji: "🏁",
    color: "#22c55e", title: { id: "title-finisher-certified", label: "Finisher Certified" } },
];

export function getBenchmark(id) {
  return BENCHMARKS.find(b => b.id === id) || null;
}
/** Title id earned if a benchmark value meets its threshold, else null. */
export function benchmarkCertTitle(benchmark, value) {
  if (!benchmark || value == null) return null;
  return value >= benchmark.threshold ? benchmark.title.id : null;
}

/* ── Flattened catalog (id → metadata) for display, equip, and ledger kinds ── */
function buildCatalog() {
  const cat = {};
  const addStageRows = (track) => {
    track.stages.forEach((s, i) => {
      cat[s.id] = {
        id: s.id, kind: "milestone", family: track.id, sequence: i + 1,
        name: s.name, emoji: s.emoji, flavor: s.flavor, color: s.color, rarity: s.rarity,
        trackName: track.name, conquest: !!s.conquest, inspo: s.inspo || null,
        unlockNote: s.unlockNote || null,
      };
      if (s.title) {
        cat[s.title.id] = {
          id: s.title.id, kind: "title", family: track.id,
          name: s.title.label, emoji: s.emoji, color: s.color, rarity: s.rarity,
          fromMilestone: s.id,
        };
      }
      if (s.cosmetic) {
        cat[s.cosmetic.id] = {
          id: s.cosmetic.id, kind: "cosmetic", family: track.id, slot: s.cosmetic.slot,
          name: s.cosmetic.label, emoji: s.cosmetic.emoji, color: s.color, rarity: s.rarity,
          fromMilestone: s.id,
        };
      }
    });
  };
  MASTERY_TRACKS.forEach(t => addStageRows(t));
  addStageRows(META_TRACK);
  for (const r of CHALLENGE_REWARDS) cat[r.id] = { ...r };
  for (const b of BENCHMARKS) {
    cat[b.title.id] = {
      id: b.title.id, kind: "title", family: "benchmark", name: b.title.label,
      emoji: b.emoji, color: b.color, rarity: "epic", fromBenchmark: b.id,
    };
  }
  return cat;
}

export const CATALOG = buildCatalog();

export const TITLES = Object.values(CATALOG).filter(a => a.kind === "title");
export const COSMETICS = Object.values(CATALOG).filter(a => a.kind === "cosmetic");
export const COSMETIC_SLOTS = ["frame", "avatar_gear", "emote"];

export function getAchievementMeta(id) {
  return CATALOG[id] || null;
}
export function titleLabel(id) {
  return CATALOG[id]?.name || null;
}
/** Kind of any ledger id — catalog rows, else a legacy badge. */
export function kindOf(id) {
  return CATALOG[id]?.kind || "badge";
}
export function familyOf(id) {
  return CATALOG[id]?.family || null;
}

/* ── Category counts from completion history (uses the app's category resolver) */
export function computeCatCounts(completed, getCategory) {
  const counts = {};
  for (const key of Object.keys(completed || {})) {
    if (!completed[key]) continue;
    const exId = key.split("-").slice(3).join("-");
    const cat = getCategory?.(exId);
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

/* ── Evaluation ─────────────────────────────────────────────────────────────
 * ctx: { earnedBadgeIds:Set, makes, accuracy, maxStreak, catCounts }
 * Returns the full set of earned achievement ids: milestones + the titles and
 * cosmetics they grant + the meta-track results. Legacy badges are layered in
 * by the caller (they already have ids from getEarnedBadges).
 */
/** Normalize raw stats into the gate-evaluation context (adds skill buckets). */
export function buildEvalCtx(ctxIn) {
  return {
    earnedBadgeIds: ctxIn.earnedBadgeIds || new Set(),
    ledgerIds: ctxIn.ledgerIds || new Set(),
    makes: ctxIn.makes || 0,
    accuracy: ctxIn.accuracy ?? null,
    maxStreak: ctxIn.maxStreak || 0,
    buckets: {
      handles: bucketSum(ctxIn.catCounts, BUCKETS.handles),
      defense: bucketSum(ctxIn.catCounts, BUCKETS.defense),
      explosion: bucketSum(ctxIn.catCounts, BUCKETS.explosion),
      finishing: bucketSum(ctxIn.catCounts, BUCKETS.finishing),
      midrange: bucketSum(ctxIn.catCounts, BUCKETS.midrange),
      touch: bucketSum(ctxIn.catCounts, BUCKETS.touch),
    },
  };
}

export function evaluateEarned(ctxIn) {
  const ctx = buildEvalCtx(ctxIn);

  const earned = new Set();
  const reached = {}; // trackId → highest consecutive stage number reached

  for (const track of MASTERY_TRACKS) {
    let stageNum = 0;
    for (const stage of track.stages) {
      if (!stage.gate(ctx)) break;      // journeys are sequential — stop at first unmet gate
      earned.add(stage.id);
      if (stage.title) earned.add(stage.title.id);
      if (stage.cosmetic) earned.add(stage.cosmetic.id);
      stageNum += 1;
    }
    reached[track.id] = stageNum;
  }

  // Meta track depends on the core tracks' progress.
  for (const stage of META_TRACK.stages) {
    if (!stage.metaGate(reached)) break;
    earned.add(stage.id);
    if (stage.title) earned.add(stage.title.id);
    if (stage.cosmetic) earned.add(stage.cosmetic.id);
  }

  return earned;
}

/* ── Grant path ─────────────────────────────────────────────────────────────
 * The ONLY way a row enters the ledger. Diffs earned-vs-owned and returns the
 * new ledger entries (cloud + local share this shape). Future Challenges and
 * Benchmarks call grantEntries() too — never a parallel writer.
 */
export function grantEntries(earnedIds, ownedIds, { earnedAt, context = {} } = {}) {
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || []);
  const when = earnedAt || new Date().toISOString();
  const out = [];
  for (const id of earnedIds) {
    if (owned.has(id)) continue;
    out.push({
      achievement_id: id,
      kind: kindOf(id),
      family: familyOf(id),
      earned_at: when,
      context,
    });
  }
  return out;
}

/* ── Backfill — turn an existing player's current state into ledger rows once,
 * preserving historical badge dates where we have them. */
export function backfillEntries({ earnedBadgeIds, trackEarnedIds, badgeDates = {}, ownedIds = new Set() }) {
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || []);
  const out = [];
  const push = (id, dateStr) => {
    if (owned.has(id)) return;
    out.push({
      achievement_id: id,
      kind: kindOf(id),
      family: familyOf(id),
      earned_at: dateStr ? new Date(dateStr + "T12:00:00").toISOString() : new Date().toISOString(),
      context: { backfilled: true },
    });
  };
  for (const id of earnedBadgeIds || []) push(id, badgeDates[id]);
  for (const id of trackEarnedIds || []) push(id, null);
  return out;
}

/* ── Equip system ───────────────────────────────────────────────────────────
 * Ownership is the ledger; equipped state is identity (settings/profile).
 * One active title; one cosmetic per slot. Everything validated against owned.
 */
export function ownedTitleIds(ledgerIds) {
  return [...(ledgerIds || [])].filter(id => kindOf(id) === "title");
}
export function ownedCosmeticIds(ledgerIds) {
  return [...(ledgerIds || [])].filter(id => kindOf(id) === "cosmetic");
}
export function isOwned(ledgerIds, id) {
  return (ledgerIds instanceof Set ? ledgerIds : new Set(ledgerIds || [])).has(id);
}

/** Validate/repair equipped identity against what's actually owned. */
export function sanitizeEquip(settings, ledgerIds) {
  const owned = ledgerIds instanceof Set ? ledgerIds : new Set(ledgerIds || []);
  const out = { activeTitle: settings.activeTitle || null, equipped: { ...(settings.equipped || {}) } };
  if (out.activeTitle && !owned.has(out.activeTitle)) out.activeTitle = null;
  for (const slot of Object.keys(out.equipped)) {
    if (!owned.has(out.equipped[slot])) delete out.equipped[slot];
  }
  return out;
}

export function equipTitle(settings, titleId, ledgerIds) {
  if (titleId && !isOwned(ledgerIds, titleId)) return settings;
  return { ...settings, activeTitle: titleId || null };
}

export function equipCosmetic(settings, cosmeticId, ledgerIds) {
  const meta = CATALOG[cosmeticId];
  if (!meta || meta.kind !== "cosmetic" || !isOwned(ledgerIds, cosmeticId)) return settings;
  return { ...settings, equipped: { ...(settings.equipped || {}), [meta.slot]: cosmeticId } };
}

export function unequipSlot(settings, slot) {
  const next = { ...(settings.equipped || {}) };
  delete next[slot];
  return { ...settings, equipped: next };
}

/* ── Journey progress + personalization ─────────────────────────────────────── */

/** The label a rung shows as your "rank": the legend homage if enabled, else identity. */
export function rungLabel(stage) {
  if (SHOW_LEGEND_NAMES && stage?.inspo) return stage.inspo;
  return stage?.name || "";
}

/** Where an athlete stands on a track: current rung, next goal, % complete. */
export function trackRankInfo(track, ctxIn) {
  const ctx = buildEvalCtx(ctxIn);
  let reached = 0;
  for (const stage of track.stages) {
    if (stage.gate(ctx)) reached += 1;
    else break;
  }
  const current = reached > 0 ? track.stages[reached - 1] : null;
  const next = reached < track.stages.length ? track.stages[reached] : null;
  return {
    reached,
    total: track.stages.length,
    current,
    next,
    complete: reached === track.stages.length,
    pct: Math.round((reached / track.stages.length) * 100),
    currentRank: current ? rungLabel(current) : "Unranked",
    nextGoal: next ? rungLabel(next) : null,
  };
}

/**
 * Map a favorite player to the track that best fits their game. Accepts a plain
 * string or a settings object — for an object, "who they want to play like" is the
 * strongest signal, then their current favorite, then all-time, then legacy field.
 */
export function recommendTrackForFavorite(favorite) {
  const raw = typeof favorite === "string"
    ? favorite
    : (favorite?.favoritePlayLike || favorite?.favoriteCurrent
       || favorite?.favoriteAllTime || favorite?.favoritePlayer || "");
  const q = raw.toLowerCase().trim();
  if (!q) return null;
  for (const track of MASTERY_TRACKS) {
    if ((track.favoritePlayerKeys || []).some(k => q.includes(k))) return track.id;
  }
  return null;
}

export function getTrack(trackId) {
  return MASTERY_TRACKS.find(t => t.id === trackId) || null;
}

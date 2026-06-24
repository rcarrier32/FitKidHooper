/**
 * Linear exercise progression chains — step unlocks based on completion counts.
 * Step 0 is always unlocked; each step's `unlocksAt` gates the next.
 */

export const PROGRESSION_CHAINS = [
  {
    id:"pogo-mastery", name:"Pogo Mastery", emoji:"🦘", cat:"explosion",
    steps:[
      { exId:"pogo-jumps",        unlocksAt:3 },
      { exId:"reactive-pogos",    unlocksAt:3 },
      { exId:"pogo-hops",         unlocksAt:5 },
      { exId:"tuck-jumps",        unlocksAt:5 },
    ]
  },
  {
    id:"jump-power", name:"Jump Power", emoji:"💥", cat:"explosion",
    steps:[
      { exId:"snap-downs",        unlocksAt:3 },
      { exId:"broad-jump-stick",  unlocksAt:3 },
      { exId:"squat-jumps",       unlocksAt:3 },
      { exId:"box-jump",          unlocksAt:5 },
      { exId:"drop-jump",         unlocksAt:5 },
    ]
  },
  {
    id:"landing-control", name:"Landing Control", emoji:"🛑", cat:"deceleration",
    steps:[
      { exId:"jump-stop-hold",        unlocksAt:3 },
      { exId:"drop-athletic-stance",  unlocksAt:3 },
      { exId:"sl-stick-landing",      unlocksAt:5 },
      { exId:"depth-landing-hold",    unlocksAt:5 },
      { exId:"sprint-to-stick",       unlocksAt:5 },
    ]
  },
  {
    id:"single-leg", name:"Single-Leg Strength", emoji:"🦵", cat:"balance",
    steps:[
      { exId:"sl-hold",           unlocksAt:3 },
      { exId:"sl-balance-reach",  unlocksAt:3 },
      { exId:"sl-squat",          unlocksAt:5 },
      { exId:"triple-lat-hops",   unlocksAt:5 },
    ]
  },
  {
    id:"strength-found", name:"Strength Foundation", emoji:"💪", cat:"strength",
    steps:[
      { exId:"bw-squats",   unlocksAt:3 },
      { exId:"goblet-sq",   unlocksAt:3 },
      { exId:"split-sq",    unlocksAt:5 },
      { exId:"db-deadlift", unlocksAt:5 },
    ]
  },
  {
    id:"footwork-found", name:"Footwork Foundation", emoji:"👟", cat:"coordination",
    steps:[
      { exId:"rhythm-line-hops",       unlocksAt:3 },
      { exId:"alternating-line-hops",  unlocksAt:3 },
      { exId:"quick-step-matrix",      unlocksAt:5 },
      { exId:"carioca",                unlocksAt:5 },
    ]
  },
  {
    id:"agility-speed", name:"Agility Speed", emoji:"⚡", cat:"speed",
    steps:[
      { exId:"ladder",    unlocksAt:3 },
      { exId:"cone-cod",  unlocksAt:3 },
      { exId:"def-slide", unlocksAt:5 },
      { exId:"5-10-5",    unlocksAt:5 },
      { exId:"lat-bounds",unlocksAt:5 },
    ]
  },
  {
    id:"defensive-movement", name:"Defensive Movement", emoji:"🛡️", cat:"athletic",
    steps:[
      { exId:"defensive-hip-flip",    unlocksAt:3 },
      { exId:"retreat-sprint",        unlocksAt:3 },
      { exId:"backpedal-sprint",      unlocksAt:5 },
      { exId:"lateral-sprint-combo",  unlocksAt:5 },
      { exId:"defensive-recovery",    unlocksAt:5 },
    ]
  },
  {
    id:"step-back-mastery", name:"Step-Back Mastery", emoji:"↩️", cat:"shootingdrills",
    steps:[
      { exId:"sb-hop-shoot",     unlocksAt:3 },
      { exId:"sb-dribble-step",  unlocksAt:3 },
      { exId:"sb-drive-step",    unlocksAt:5 },
    ]
  },
];

export function getCompletionCount(exId, completed) {
  return Object.entries(completed)
    .filter(([k, v]) => v && k.split("-").slice(3).join("-") === exId)
    .length;
}

export function getChainForExercise(exId) {
  return PROGRESSION_CHAINS.find(c => c.steps.some(s => s.exId === exId)) || null;
}

/** @param {Record<string, object>} [allExercises] flat exercise lookup */
export function getChainStatus(chain, completed, allExercises = {}) {
  const counts = chain.steps.map(s => getCompletionCount(s.exId, completed));

  const steps = chain.steps.map((step, i) => {
    const count   = counts[i];
    const ex      = allExercises[step.exId];
    const unlocked = i === 0 || counts[i - 1] >= chain.steps[i - 1].unlocksAt;
    const mastered = count >= step.unlocksAt;
    return { ...step, count, ex, unlocked, mastered };
  });

  const progress = steps.filter(s => s.mastered).length;
  return { steps, progress, total: steps.length };
}

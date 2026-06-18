/**
 * Dynamic warm-up + rest guidance. Evidence-based injury prevention for ages
 * 8–14: a short dynamic warm-up before training (especially high-impact days),
 * and gentle encouragement to rest — recovery is when the body adapts and the
 * growth-spurt window is when injuries cluster.
 */
export const WARMUP_ROUTINE = [
  { name: "Light jog or jumping jacks", secs: 60, cue: "Get the blood flowing and heart rate up" },
  { name: "Arm circles", secs: 20, cue: "Forward, then backward" },
  { name: "Leg swings", secs: 30, cue: "Front-to-back, then side-to-side — each leg" },
  { name: "Walking lunges", secs: 30, cue: "Tall chest, knee tracks over the toe" },
  { name: "Ankle pogo hops", secs: 20, cue: "Small, quick, soft landings" },
  { name: "High skips", secs: 20, cue: "Drive the knee up, land soft and quiet" },
];

// Days with jumping/sprinting/cutting need the warm-up most.
export const HIGH_IMPACT_CATS = ["explosion", "deceleration", "speed", "athletic", "skywalker"];

export function isHighImpactDay(cats) {
  return (cats || []).some(c => HIGH_IMPACT_CATS.includes(c));
}

/** A rest/recovery reminder, escalated during a growth spurt. */
export function restGuidance({ growthStatus } = {}) {
  if (growthStatus === "spurt") {
    return {
      tone: "spurt",
      text: "You're in a growth spurt — take rest days when you're sore or tired, and go easy on heavy jumping. Resting now protects your knees and ankles.",
    };
  }
  return {
    tone: "normal",
    text: "Rest days make you stronger — your body builds on a day off. Aim to take at least one each week.",
  };
}

/**
 * Running a single exercise: set/rep prescriptions, bilateral sides, rest
 * parsing, and the countdown timer's cues and speech.
 */
export const TIMER_PREP_SECS = 5;
export const TIMER_WARN_SECS = 5;
export const TIMER_REST_WARN_SECS = 15;
export const TIMER_SWITCH_SECS = 3;

export function exerciseSideLabel(prescription, sideIdx) {
  if (!prescription?.bilateral) return null;
  const side = sideIdx === 0 ? "Right" : "Left";
  const u = prescription.bilateral.unit;
  return u === "side" ? `${side} side` : `${side} ${u}`;
}

export function switchSpeechFor(prescription, nextSideIdx) {
  const label = exerciseSideLabel(prescription, nextSideIdx);
  if (!label) return "Switch";
  const u = prescription.bilateral.unit;
  if (u === "hand") return `Switch hands — ${label}`;
  if (u === "leg") return `Switch legs — ${label}`;
  return `Switch — ${label}`;
}

/** Parse "3x10", "3x30s", "3x10-15 reps", "3x30 s each hand" into structured set prescription. */
export function parseExerciseSets(setsStr) {
  if (!setsStr || /follow video|as directed|dedicated/i.test(setsStr)) return null;
  let s = setsStr.trim();
  let bilateral = null;
  const bilMatch = s.match(/\s+each\s+(hand|leg|side)\b/i);
  if (bilMatch) {
    bilateral = { unit: bilMatch[1].toLowerCase() };
    s = s.replace(/\s+each\s+(hand|leg|side)\b.*$/i, "").trim();
  }
  const withBilateral = base => (bilateral ? { ...base, bilateral } : base);
  let m = s.match(/^(\d+)\s*[x×]\s*(\d+)\s*(?:reps?)?$/i);
  if (m) return withBilateral({ count:+m[1], type:"reps", value:+m[2] });
  m = s.match(/^(\d+)\s*[x×]\s*(\d+)\s*-\s*(\d+)\s*(?:reps?|s(?:ec(?:onds?)?)?)?(?:\s+each)?$/i);
  if (m) return withBilateral({ count:+m[1], type:/s(?:ec)?/i.test(m[0].split("-")[1]||"")?"time":"reps", value:+m[2], maxValue:+m[3] });
  m = s.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*-\s*(\d+))?\s*s(?:ec(?:onds?)?)?(?:\s+each)?$/i);
  if (m) return withBilateral({ count:+m[1], type:"time", value:+m[2], maxValue:m[3]?+m[3]:null });
  m = s.match(/^(\d+)\s*[x×]\s*(\d+)(?:\s*-\s*(\d+))?\s*(?:reps?)?(?:\s+each\b.*)?$/i);
  if (m && !/s(?:ec)?/i.test(s)) return withBilateral({ count:+m[1], type:"reps", value:+m[2], maxValue:m[3]?+m[3]:null });
  m = s.match(/^(\d+)\s*rounds?$/i);
  if (m) return withBilateral({ count:+m[1], type:"rounds", value:null });
  m = s.match(/^(\d+)\s*[x×]/i);
  if (m) return withBilateral({ count:+m[1], type:"generic", value:null });
  return null;
}

export function bilateralModeLabel(unit, enabled) {
  if (!enabled) return "One side";
  if (unit === "hand") return "Both hands";
  if (unit === "leg") return "Each leg";
  return "Both sides";
}

export function isBilateralEnabled(bilateralPrefs, exId, prescription) {
  const pref = bilateralPrefs?.[exId];
  if (pref !== undefined) return !!pref.on;
  return !!prescription?.bilateral;
}

export function resolvePrescription(prescription, bilateralPrefs, exId) {
  if (!prescription) return null;
  const enabled = isBilateralEnabled(bilateralPrefs, exId, prescription);
  if (!enabled) return { ...prescription, bilateral: undefined };
  const unit = bilateralPrefs?.[exId]?.unit || prescription.bilateral?.unit || "hand";
  return { ...prescription, bilateral: { unit } };
}

export function parseRestSeconds(restStr) {
  if (!restStr || restStr==="N/A") return 60;
  const m = String(restStr).match(/(\d+)/);
  return m ? +m[1] : 60;
}

export function setLogKey(exerciseId, today, programContext) {
  if (programContext) {
    const { programId, week, sessionIdx } = programContext;
    return `pg:${programId}:${week}:${sessionIdx}:${exerciseId}`;
  }
  return `${today}-${exerciseId}`;
}

/** Haptic + beep + voice for timer alerts (best-effort on mobile). */
export function timerAlert(kind, countValue) {
  const isBegin = kind === "go" || kind === "begin";
  try { if (navigator.vibrate) navigator.vibrate(isBegin ? [80,40,80] : [40]); } catch { /* ignore */ }
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = isBegin ? 880 : kind === "warn" ? 660 : 520;
    gain.gain.value = 0.12;
    osc.start();
    osc.stop(ctx.currentTime + (isBegin ? 0.25 : 0.12));
  } catch { /* ignore */ }
  const speech =
    kind === "rest" ? "Rest"
    : isBegin ? "Begin"
    : kind === "switch" ? (typeof countValue === "string" ? countValue : "Switch")
    : kind === "count" ? String(countValue)
    : null;
  if (!speech) return;
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(speech);
    u.rate = 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function announceCountdown(secs, delayMs = 0) {
  if (secs < 1 || secs > TIMER_WARN_SECS) return;
  const speak = () => timerAlert("count", secs);
  if (delayMs > 0) setTimeout(speak, delayMs);
  else speak();
}

export function fmtTimerSecs(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return s >= 60 ? `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}` : `${s}`;
}

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import HistoryView from "./components/HistoryView.jsx";
import BadgesView from "./components/BadgesView.jsx";
import AuthSheet from "./components/AuthSheet.jsx";
import NotificationSettings from "./components/NotificationSettings.jsx";
import OnboardingSheet from "./components/OnboardingSheet.jsx";
import FeedbackCenter from "./components/FeedbackCenter.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useSquadNotifications } from "./hooks/useSquadNotifications.js";
import GuideNavButton from "./components/GuideNavButton.jsx";
import ShotTrackerErrorBoundary from "./components/ShotTrackerErrorBoundary.jsx";
import ViewErrorBoundary from "./components/ViewErrorBoundary.jsx";
import { readShotLog, normalizeShotLog, writeShotLog, countShotMakes } from "./lib/shotLog.js";
import { computeShotStyleMakes, SHOT_STYLES, getShotStyle, getLastShotStyle, setLastShotStyle } from "./lib/shotStyles.js";
import { getAgeGroup, getAgeGroupLabel } from "./lib/periodStats.js";
import { exportCanonicalSave, importCanonicalSave } from "./lib/canonicalSave.js";
import { recoverFromSyncBackupIfNeeded } from "./lib/syncBackup.js";
import { withStoredAvatar, writeStoredAvatar, readStoredAvatar, stripAvatarForCloud } from "./lib/avatarStorage.js";
import { safePersistKey } from "./lib/dataSafety.js";
import { readStoredObject, parseStoredObject, repairStoredObjectKeys } from "./lib/storageParse.js";
import { mergeUserSettings } from "./lib/settingsMerge.js";
import { persistHydratedSettings, normalizeProfileFields, fetchAthleteProfilePatch, mergeProfilePatch } from "./lib/profileHydrate.js";
import { syncAvatarToCloud, restoreLocalAvatarFromCloud } from "./lib/avatarCloud.js";
import { getEffectiveAthleteId, hasStoredAuthSession } from "./lib/auth.js";
import { CATS, CAT_DOT_COLORS } from "./lib/categories.js";
import { BADGES_DEF, BADGE_CATS, getEarnedBadges, getBadgeProgress } from "./lib/badges.js";
import { PROGRESSION_CHAINS, getChainForExercise, getChainStatus } from "./lib/progressionChains.js";
import { claimChallengeRewards } from "./lib/challengesApi.js";
import {
  evaluateEarned, computeCatCounts, grantEntries, getAchievementMeta,
  equipTitle, equipCosmetic, unequipSlot,
  getBenchmark, benchmarkCertTitle,
  recommendProgramsForFavorite, PATHS, trackStageProgress,
} from "./lib/achievements.js";
import { computeExCounts, getSignatureProgress } from "./lib/pathSignatures.js";
import { recordBenchmark, recordLocalPB, readLocalPBs } from "./lib/benchmarksApi.js";
import { readGrowthLog, addGrowthEntry } from "./lib/growth.js";
import {
  readLocalLedger, ledgerIdSet, mergeIntoLocalLedger, pushLedgerEntries, pullLedger,
  pushEquippedIdentity,
} from "./lib/achievementsApi.js";
import { getStreak, getTrainingDays, getWeekShotGoal, getMonthShotGoal, setWeekShotGoal, setMonthShotGoal, getShotGoalPeriod, setShotGoalPeriod, getWeekMakesFromLog, getMonthMakesFromLog, daysLeftInWeek, daysLeftInMonth } from "./lib/progressStats.js";
import { computeShootingStats, computeSpotStats, computeLocationStats, computeZoneTypeStats } from "./lib/shootingStats.js";
import { resolveDailyAction, pickChallengeNudge } from "./lib/dailyAction.js";
import {
  consumeInviteDeepLink,
  consumeMissionDeepLink,
  consumeNavigationDeepLink,
  scheduleMissionReminder,
  dismissNotificationPrompt,
  needsNotificationSubscription,
  subscribeToPush,
} from "./lib/notifications.js";
import {
  readDailyWorkoutStore,
  getOrCreateWorkout,
  setSelectedTemplateInStore,
  applyDayRollover,
  saveDailyWorkoutStore,
  isQuickWorkoutCompleteToday,
} from "./lib/dailyWorkouts.js";
import { useWakeLock } from "./lib/useWakeLock.js";
import {
  getLastPushTime,
  isLeaderboardConfigured,
  maybeAutoSyncLeaderboard,
  canAutoSyncLeaderboard,
} from "./lib/boardsApi.js";
import {
  initAnalytics,
  setAnalyticsAgeGroup,
  track,
  trackScreen,
  trackExerciseComplete,
  trackShotSession,
  trackChallengeIfNew,
  trackProgramSessionIfNew,
  trackWorkoutCompleteIfNew,
  ANALYTICS_EVENTS,
} from "./lib/analytics.js";
import {
  THEME_PRESETS,
  applyThemePreset,
  getTabHSL,
  patchTabHSL,
  brightnessMaxForTab,
  MAIN_THEME_TABS,
  ADVANCED_THEME_TABS,
  tabPreviewLabel,
  migrateThemeSettings,
} from "./lib/theme.js";
import WhatsNewSheet from "./components/WhatsNewSheet.jsx";
import { shouldShowWhatsNew, markWhatsNewSeen, WHATS_NEW_EVENT } from "./lib/changelog.js";
import SettingsSheet from "./components/SettingsSheet.jsx";
import HighlightVideoSheet from "./components/HighlightVideoSheet.jsx";
import {
  hsl, pri, sec, bg, btn, surf, nav, textPri, textMuted, str3,
  chipStyle, actionBtnStyle, hexToHsl, contrastOn,
} from "./lib/themeColors.js";
import GuideSheet from "./components/GuideSheet.jsx";
import OnboardingTour from "./components/OnboardingTour.jsx";
import { TOUR_STEPS, applyTourStep, markTourComplete, shouldShowTourPrompt, dismissTourPrompt } from "./lib/onboardingTour.js";
import BoardView from "./components/BoardView.jsx";
import ProgressionView from "./components/ProgressionView.jsx";
import ProgramWeekStrip from "./components/ProgramWeekStrip.jsx";
import { CHALLENGES_DEF, getChallengeProgress, buildPersonalChallenges } from "./lib/personalChallenges.js";
import {
  programSessionSlot,
  programEnrollmentAnchor,
  readProgramExerciseMark,
  isProgramExerciseDone,
  isProgramSessionComplete,
  countProgramSessionsDone,
  computeProgramProgress,
  programCurrentWeek,
  programWeekDayIndex,
  programSessionScheduleDays,
  getProgramSessionCompletionDate,
  wasProgramSessionCompletedOnDate,
  findDueProgramSession,
  getActiveProgramScheduleStatus,
  buildProgramWeekPlan,
  rehydrateProgramProgressFromCompleted,
} from "./lib/programProgress.js";
import TodayView from "./views/TodayView.jsx";
import ProgramsView from "./views/ProgramsView.jsx";
import MeView from "./views/MeView.jsx";
import SquadView from "./views/SquadView.jsx";
import ChallengesView from "./views/ChallengesView.jsx";
import DayPlanPanel from "./components/DayPlanPanel.jsx";
import { buildTrainingDayPlan, currentWeekDates, scheduleCategoryExerciseIds, weekdayIndexFromDate } from "./lib/trainingDayPlan.js";
import {
  getProgramKind,
  programKindLabel,
  sortDueProgramEntries,
  missionTitleForDuePrograms,
} from "./lib/programKind.js";


/* ═══════════════════════════════════════════════════════════════
   SETTINGS & COLOR HELPERS
═══════════════════════════════════════════════════════════════ */
const DEFAULT = {
  primaryHue:38, primarySat:92, primaryLight:55,
  secondaryHue:245, secondarySat:80, secondaryLight:60,
  bgHue:222, bgSat:47, bgLight:10,
  surfaceHue:222, surfaceSat:37, surfaceLight:15,
  buttonHue:222, buttonSat:38, buttonLight:20,
  textHue:210, textSat:25, textLight:94,
  accentHue:158, accentSat:85, accentLight:50,
  customSecondary:false,
  athleteName:"Champ", lastName:"", avatar:null,
  jerseyNumber:null, favoritePlayer:"", favoriteCurrent:"", favoriteAllTime:"", favoritePlayLike:"",
  dateOfBirth:null, experience:"beginner", goals:[], playStyle:"any",
  workoutTimers:true,
  leaderboardSharing:true,
};

const TIMER_PREP_SECS = 5;
const TIMER_WARN_SECS = 5;
const TIMER_REST_WARN_SECS = 15;
const TIMER_SWITCH_SECS = 3;

function exerciseSideLabel(prescription, sideIdx) {
  if (!prescription?.bilateral) return null;
  const side = sideIdx === 0 ? "Right" : "Left";
  const u = prescription.bilateral.unit;
  return u === "side" ? `${side} side` : `${side} ${u}`;
}

function switchSpeechFor(prescription, nextSideIdx) {
  const label = exerciseSideLabel(prescription, nextSideIdx);
  if (!label) return "Switch";
  const u = prescription.bilateral.unit;
  if (u === "hand") return `Switch hands — ${label}`;
  if (u === "leg") return `Switch legs — ${label}`;
  return `Switch — ${label}`;
}

/** Parse "3x10", "3x30s", "3x10-15 reps", "3x30 s each hand" into structured set prescription. */
function parseExerciseSets(setsStr) {
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

function bilateralModeLabel(unit, enabled) {
  if (!enabled) return "One side";
  if (unit === "hand") return "Both hands";
  if (unit === "leg") return "Each leg";
  return "Both sides";
}

function isBilateralEnabled(bilateralPrefs, exId, prescription) {
  const pref = bilateralPrefs?.[exId];
  if (pref !== undefined) return !!pref.on;
  return !!prescription?.bilateral;
}

function resolvePrescription(prescription, bilateralPrefs, exId) {
  if (!prescription) return null;
  const enabled = isBilateralEnabled(bilateralPrefs, exId, prescription);
  if (!enabled) return { ...prescription, bilateral: undefined };
  const unit = bilateralPrefs?.[exId]?.unit || prescription.bilateral?.unit || "hand";
  return { ...prescription, bilateral: { unit } };
}

function parseRestSeconds(restStr) {
  if (!restStr || restStr==="N/A") return 60;
  const m = String(restStr).match(/(\d+)/);
  return m ? +m[1] : 60;
}

function setLogKey(exerciseId, today, programContext) {
  if (programContext) {
    const { programId, week, sessionIdx } = programContext;
    return `pg:${programId}:${week}:${sessionIdx}:${exerciseId}`;
  }
  return `${today}-${exerciseId}`;
}

/** Haptic + beep + voice for timer alerts (best-effort on mobile). */
function timerAlert(kind, countValue) {
  const isBegin = kind === "go" || kind === "begin";
  try { if (navigator.vibrate) navigator.vibrate(isBegin ? [80,40,80] : [40]); } catch {}
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = isBegin ? 880 : kind === "warn" ? 660 : 520;
    gain.gain.value = 0.12;
    osc.start();
    osc.stop(ctx.currentTime + (isBegin ? 0.25 : 0.12));
  } catch {}
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
  } catch {}
}

function announceCountdown(secs, delayMs = 0) {
  if (secs < 1 || secs > TIMER_WARN_SECS) return;
  const speak = () => timerAlert("count", secs);
  if (delayMs > 0) setTimeout(speak, delayMs);
  else speak();
}

function fmtTimerSecs(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return s >= 60 ? `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}` : `${s}`;
}

/**
 * Calculate current age from an ISO date-of-birth string ("YYYY-MM-DD").
 * Returns 12 when dob is absent (safe fallback for new/migrated profiles).
 * Age updates automatically every time the function is called — no manual updates needed.
 */
function calcAge(dob) {
  if (!dob) return 12;
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** True only on the athlete's birthday. */
function isBirthday(dob) {
  if (!dob) return false;
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
}
/* ═══════════════════════════════════════════════════════════════
   WORKOUT DATA
═══════════════════════════════════════════════════════════════ */
const W_SPEED = [
  { id:"ladder",    name:"Agility Ladder Drills",    tag:"Foundation", sets:"3 rounds", rest:"45 s",
    desc:"Two feet in each box, lateral icky shuffle, one-foot hops. Light feet — not stomping.",
    cues:["Stay on balls of feet","Arms drive the rhythm","Eyes forward, not at ladder"],
    videoId:"_3J1tzI63b4", videoTitle:"Agility Ladder Drills for Kids" },
  { id:"cone-cod",  name:"Cone Change of Direction", tag:"COD",        sets:"5x each dir", rest:"30 s",
    desc:"3 cones 5 yds apart. Sprint, plant outside foot, drive back. Deceleration habit is injury prevention.",
    cues:["Sink hips on plant — not just ankles","Short chop steps before cut","Explode out of the break"],
    videoId:"WK5XFcmxS7A", videoTitle:"Agility & Defense Cone Drills" },
  { id:"5-10-5",    name:"Pro Agility 5-10-5",       tag:"Speed",      sets:"4-6 reps", rest:"60 s",
    desc:"Gold standard lateral test. Touch the line each cut. Time yourself weekly.",
    cues:["Low start position","Touch line with inside hand","Push off ground — not just turn"],
    videoId:"SBx-chygCdE", videoTitle:"Pro Agility Drill (5-10-5)" },
  { id:"lat-bounds",name:"Lateral Bounds to Sprint",  tag:"Power",      sets:"3x5 each side", rest:"45 s",
    desc:"Bound sideways 3-5 times then explode into a forward sprint. Lateral power tied to acceleration.",
    cues:["Stick each landing before next bound","Drive knee up on sprint","Long powerful bounds"],
    videoId:"TWAPkD1smq4", videoTitle:"Lateral Bound Progressions" },
  { id:"def-slide", name:"Defensive Slide + Sprint",  tag:"Basketball", sets:"3x full court", rest:"60 s",
    desc:"Defensive slide sideline to sideline, then drop step and sprint. Direct court transfer.",
    cues:["Stay wide — feet never touch","Hips low throughout","Head stays at same height"],
    videoId:"Vu-2wL-dt7Q", videoTitle:"Lateral Shuffle to Sprint — Simple Speed Coach" },
];

const W_BALANCE = [
  { id:"sl-hold",   name:"Single Leg Balance Hold",  tag:"Foundation", sets:"3x30-45s each", rest:"15 s",
    desc:"Start flat. Progress: eyes closed, pillow, catch a ball. Number one injury prevention at this age.",
    cues:["Micro-bend in standing knee","Squeeze glute of standing leg","Eyes fixed or close them"],
    videoId:"Z9_ThjKQyOg", videoTitle:"Single Leg Balance — Childrens Hospital Colorado" },
  { id:"bosu-sq",   name:"BOSU Squats",               tag:"Balance",    sets:"3x8", rest:"45 s",
    desc:"Flat side up on BOSU or a folded towel. Adds a stabilization challenge to the squat pattern.",
    cues:["Same squat cues apply — chest up, knees track toes","Engage core before lowering","Control the wobble — do not fight it, work with it"],
    videoId:"h-Wh6dNHq8I", videoTitle:"Top 7 Single Leg Plyometric Drills" },
  { id:"sl-ball",   name:"Single-Leg Balance Toss",   tag:"Reactive",   sets:"3x30s each", rest:"15 s",
    desc:"Stand single-leg, have someone toss a ball to catch and return. Reactive balance is real-world stability.",
    cues:["Keep standing knee slightly bent","Do not let hip drop on catching side","Eyes closed for 10s intervals to level up"],
    videoId:"Z9_ThjKQyOg", videoTitle:"Single Leg Balance — Childrens Hospital Colorado" },
  { id:"sl-squat",  name:"Single Leg Squat (Box)",    tag:"Strength",   sets:"3x8 each", rest:"30 s",
    desc:"Sit back to a box. Powers every jump and cut.",
    cues:["Knee tracks over second toe","Chest up, slight forward lean","Touch box lightly — do not crash"],
    videoId:"uJ4eA2wUXdw", videoTitle:"Single-Leg Squat To Box — Exercise Guide" },
  { id:"lat-stick", name:"Lateral Bounds — Stick It", tag:"Power Ctrl", sets:"3x6 each leg", rest:"30 s",
    desc:"Jump laterally, land and FREEZE 2 full seconds. Teaches force control for cutting and landing.",
    cues:["Soft landing — ankle to knee to hip","Freeze means FREEZE — 2 full seconds","Progress to landing on grass"],
    videoId:"XDBHOQoAa3w", videoTitle:"Lateral Bound with Stick Landing" },
  { id:"triple-lat-hops", name:"Triple Lateral Hops", tag:"Reactive Balance", sets:"3x5 each side", rest:"45 s",
    desc:"Three consecutive lateral hops on one foot, then stick and hold the final landing for 2 seconds. Builds balance, landing control, and ankle strength together.",
    cues:["Same foot for all three hops","Stick the final landing HARD — no extra steps","Soft landing on each hop — absorb","Eyes forward, not down at feet"],
    videoId:"AezzGLeOTss", videoTitle:"Triple Lateral Hops — Lateral Bound & Stick" },
  { id:"pogo-hops", name:"Pogo Hops", tag:"Reactive Balance", sets:"3x15 reps", rest:"45 s",
    desc:"Single-leg rapid pogo hops. Combines ankle stiffness training with single-leg balance and reactive movement.",
    cues:["Stay on ball of foot — heels barely graze the floor","Stiff ankle — spring, do not collapse","Small quick hops first, build rhythm","Switch legs every set"],
    videoId:"j0nl5dWuqN4", videoTitle:"Pogo Jump Tutorial — Proper Form" },
  { id:"sl-balance-reach",  name:"Single Leg Balance Reach",       tag:"Proprioception", sets:"3x8 each leg", rest:"20 s",
    desc:"Stand single-leg, reach the free leg in multiple directions while keeping balance. Trains proprioception and ankle stability.",
    cues:["Slight bend in standing knee","Hip stays level — do not let it drop","Reach far in each direction","Eyes can be open then closed to level up"],
    videoId:"TShLyAkKU9c", videoTitle:"Single Leg Balance and Reach" },
];

const W_STRENGTH = [
  { id:"goblet-sq",   name:"Goblet Squat",            tag:"Day 1 Squat",      sets:"3x10", rest:"60 s",
    desc:"Hold 5-10 lb at chest. Forces an upright torso automatically — the safest teaching squat for youth.",
    cues:["Elbows drive INSIDE knees at bottom","Chest tall throughout","Heels flat","Full depth if mobility allows"],
    videoId:"CkFzgR55gho", videoTitle:"How to Perform the Goblet Squat" },
  { id:"pushup",      name:"Push-Ups",                 tag:"Day 1 Push",       sets:"3x10-15", rest:"60 s",
    desc:"Wall to incline to floor progression. Only move to next level when every rep is clean.",
    cues:["Body is a rigid plank — no sagging hips","Elbows at 45 degrees","3-second lowering builds control","Chest touches, full lockout at top"],
    videoId:"c-lBErfxszs", videoTitle:"Perfect Push-Ups (Chest to Floor)" },
  { id:"tricep-dips", name:"Tricep Dips", tag:"Day 1 Push", sets:"3x10-12", rest:"45 s",
    desc:"Hands on a sturdy bench or chair behind you, lower until your elbows hit 90°, then press back up. Builds the arm and shoulder strength behind your shot.",
    cues:["Elbows point straight back — not flared out","Lower under control — 2 seconds down","Keep your hips close to the bench","Press all the way up to a tall lockout"],
    videoId:"N3hB8rDErZI", videoTitle:"Tricep Dips" },
  { id:"step-ups",    name:"Step-Ups",                 tag:"Day 1 Single Leg", sets:"3x8 each", rest:"45 s",
    desc:"Use a sturdy box or step about knee height. Add light dumbbells when bodyweight feels easy.",
    cues:["Drive through the heel of the top foot","Full hip extension at top — stand tall","Control the lowering — do not drop"],
    videoId:"aKj-6hgiViA", videoTitle:"How to Properly Perform Dumbbell Step-Ups" },
  { id:"db-rows",     name:"Dumbbell Rows",            tag:"Day 1 Pull",       sets:"3x10 each", rest:"60 s",
    desc:"One hand on a bench, row dumbbell to hip. The pull complement to push-ups.",
    cues:["Elbow drives back past the hip — not out to the side","Squeeze lat at top — hold 1 second","Do not rotate torso to get the weight up"],
    videoId:"Fl0UMfdEzsE", videoTitle:"Inverted Rows — Beginner to Advanced" },
  { id:"plank-hold",  name:"Plank Hold",               tag:"Day 1 Core",       sets:"3x45s", rest:"30 s",
    desc:"The foundation of all core work. Progress by adding shoulder taps when 45s feels easy.",
    cues:["Squeeze glutes AND abs","Hips level — do not sag or pike","Breathe — do not hold breath","Eyes slightly forward"],
    videoId:"pSHjTRCQxIw", videoTitle:"Plank Hold — Proper Form" },
  { id:"walk-lunge",  name:"Walking Lunges",           tag:"Day 2 Lunge",      sets:"3x10 each", rest:"45 s",
    desc:"Bodyweight first — add light dumbbells when form is automatic.",
    cues:["Front shin stays vertical","Tall torso — do not lean forward","Back knee lightly touches floor","Step long enough for parallel thigh"],
    videoId:"L8fvypPrzzs", videoTitle:"Walking Lunges — Proper Form" },
  { id:"glute-bridge",name:"Glute Bridges",            tag:"Day 2 Hinge",      sets:"3x12", rest:"30 s",
    desc:"Lie on back, feet flat, drive hips to ceiling. Hip extension that transfers to sprinting and jumping.",
    cues:["Drive through HEELS — not balls of feet","Squeeze glutes hard at top — hold 2 seconds","Do not hyperextend the lower back","Progress: single-leg bridge"],
    videoId:"wPM8icPu6H8", videoTitle:"Glute Bridge — How To" },
  { id:"side-plank",  name:"Side Plank",               tag:"Day 2 Core",       sets:"3x20s each", rest:"20 s",
    desc:"Lateral core stability — resists sideways forces of cutting and landing.",
    cues:["Hip stacked — do not let it sag","Body is a straight line head to feet","Breathe normally throughout"],
    videoId:"m8lSq4SC_eM", videoTitle:"Beginner Core — Plank Side Plank Dead Bug" },
  { id:"box-jump",    name:"Box Jumps",                tag:"Day 3 Power",      sets:"3x5", rest:"90 s",
    desc:"Jump to box, step down. Land mechanics more important than height at this age.",
    cues:["Swing arms back then up","Land in athletic stance — not feet together","STEP down — do not jump down","Quiet landing = good absorption"],
    videoId:"kNIInK_Le8I", videoTitle:"How to Do Beginner Box Jumps" },
  { id:"db-deadlift", name:"Dumbbell Deadlift",        tag:"Day 3 Hinge",      sets:"3x8", rest:"60 s",
    desc:"Dumbbells at sides, hip hinge to mid-shin. Foundation of all pulling strength.",
    cues:["Push the floor away — do not think pull up","Stay close to legs throughout","Hips and shoulders rise together","Stand completely tall at top"],
    videoId:"-FN9IgWFiTU", videoTitle:"RDL Hip Hinge Pattern Development" },
  { id:"ohp",         name:"Overhead Press",           tag:"Day 3 Push",       sets:"3x8", rest:"60 s",
    desc:"Dumbbells at shoulders, press overhead. Builds shoulder strength for all overhead movement.",
    cues:["Brace the core before pressing","Press straight up — not forward","Lock out fully at top","Control the lowering — 2 seconds down"],
    videoId:"LmrjCwMo1ZQ", videoTitle:"Basketball Upper Body Strength — Coach Kyle" },
  { id:"split-sq",    name:"Split Squats",             tag:"Day 3 Single Leg", sets:"3x6 each", rest:"60 s",
    desc:"Static lunge position, lower straight down. Builds single-leg strength and hip flexibility.",
    cues:["Back knee drops straight down — not forward","Front shin stays vertical","Tall torso — resist leaning","90 and 90 at the bottom"],
    videoId:"Wcmg-3iHwjQ", videoTitle:"Dumbbell Split Squat" },
  { id:"hollow-hold", name:"Hollow Body Hold",         tag:"Day 3 Core",       sets:"3x hold to fatigue", rest:"30 s",
    desc:"Arms overhead, legs extended, lower back pressed flat. Builds full-body tension — foundation of all athletic movement.",
    cues:["Lower back MUST stay pressed into the floor","Chin tucked — look at your belly","Arms by ears — reach long","Start with knees bent if needed"],
    videoId:"0yPin8hSc8o", videoTitle:"Hollow Body Hold — Proper Form Tutorial" },
  { id:"dead-bug", name:"Dead Bug", tag:"Day 1 Core", sets:"3x6 each side", rest:"30 s",
    desc:"Lie on back, arms up, knees at 90°. Lower opposite arm and leg while keeping lower back pressed FLAT. The gold standard anti-rotation core exercise for youth athletes.",
    cues:["Lower back MUST stay glued to the floor — no gap","Breathe out as you lower the limbs","Move SLOW — 3 seconds down, 2 seconds hold","Only lower as far as your back stays flat"],
    videoId:"bxn9FBrt4-A", videoTitle:"Dead Bug Exercise — Proper Form | NASM" },
  { id:"v-ups", name:"V-Ups", tag:"Day 2 Core", sets:"3x10-12", rest:"30 s",
    desc:"Lie flat, then lift your arms and legs up to meet in a V over your hips. A dynamic core builder for your whole midsection.",
    cues:["Reach your hands toward your toes — touch if you can","Move with control — don't flop back down","Keep legs straight if you can, bend the knees if you need to","Breathe out as you crunch up"],
    videoId:"Wks3wpNJqTg", videoTitle:"V-Ups" },
  { id:"reverse-lunge",    name:"Reverse Lunges",                  tag:"Day 2 Lunge",    sets:"3x10 each leg", rest:"45 s",
    desc:"Step backward into the lunge. Easier on the knee than forward lunges — great starting point for lunge pattern.",
    cues:["Back knee drops straight down","Front shin stays vertical","Tall torso — do not lean","Push through front heel to return"],
    videoId:"3XDriUn0udo", videoTitle:"Reverse Lunges — Proper Form" },
  { id:"bw-squats",        name:"Bodyweight Squats",                tag:"Day 1 Squat",    sets:"3x15", rest:"45 s",
    desc:"The foundational movement pattern. Perfect these before adding any weight. Every jumping, cutting, and landing skill starts here.",
    cues:["Feet shoulder-width, toes slightly out","Sit back and down — not forward","Chest tall throughout","Stand fully at the top — squeeze glutes"],
    videoId:"aclHkVaku9U", videoTitle:"Bodyweight Squats — How To" },
  { id:"str-full",    name:"Youth Strength Full Session",tag:"Full Workout",   sets:"Follow video", rest:"As directed",
    desc:"Complete guided session covering all the key strength and power patterns for young athletes.",
    cues:["Form first — pause and reset any rep that feels wrong","Never grind — if form breaks, set is done","Full rest between rounds"],
    videoId:"3shedfyWTho", videoTitle:"Strength and Power Exercises for Youth Athletes" },
];

const W_STRENGTH_EXTRA = [
  { id:"bear-crawl",  name:"Bear Crawl",               tag:"Bonus Movement", sets:"3x20 yards", rest:"30 s",
    desc:"On all fours, knees hovering 1 inch off the ground. Looks silly, builds serious coordination and full-body stability.",
    cues:["Knees stay 1 inch off the floor — do not let them touch","Opposite arm and leg move together","Hips stay LOW and level — do not rock side to side","Breathe steadily"],
    videoId:"U3Y58Kyw7Xw", videoTitle:"Bear Crawl Exercise — Tutorial" },
  { id:"broad-jump",  name:"Broad Jumps",               tag:"Bonus Power",    sets:"3x5", rest:"60 s",
    desc:"Two-foot takeoff, jump as far forward as possible, stick the landing. Horizontal power transfers to first-step explosiveness.",
    cues:["Load the hips — bend knees and swing arms back before launch","Drive arms forward aggressively","Land SOFT — absorb toes to ankles to knees to hips","Measure distance and try to beat it each week"],
    videoId:"4e-5E2J0j8o", videoTitle:"Continuous Broad Jumps" },
  { id:"skater-jumps",name:"Skater Jumps",              tag:"Bonus Lateral",  sets:"3x10 each side", rest:"45 s",
    desc:"Bound laterally from one foot to the other like a speed skater. Same movement as a hard defensive slide or step-back jumper.",
    cues:["Reach trailing leg BEHIND landing foot — big lateral distance","Soft landing","Pause 1 second on each landing","Add a dribble on landing for basketball-specific training"],
    videoId:"qM5jviFhw9U", videoTitle:"Skater Jumps" },
  { id:"farmers-carry",name:"Farmer Carry",            tag:"Bonus Carry",    sets:"3x30 yards", rest:"45 s",
    desc:"Walk with a dumbbell in each hand, standing as tall as possible. Builds grip, core, and posture simultaneously.",
    cues:["Stand TALL — do not lean to either side","Shoulders packed down — do not shrug","Normal gait — heel to toe","Single dumbbell suitcase carry challenges anti-lateral bending"],
    videoId:"DxUNi119Qzs", videoTitle:"Dumbbell Farmer Carry — How To" },
  { id:"jump-rope",   name:"Jump Rope",                 tag:"Bonus Conditioning",sets:"5x1 min", rest:"30 s",
    desc:"The most underrated athletic training tool. Builds foot speed, coordination, rhythm, and calf strength simultaneously.",
    cues:["Land on balls of feet — not flat-footed","Small quick jumps — just enough clearance","Wrists do the work — arms stay at sides","Progress to alternating feet then double unders"],
    videoId:"xVM5s3DdE24", videoTitle:"Youth Speed and Agility Training — Ages 8-10" },
];

const W_EXPLOSION = [
  { id:"pogo-jumps", name:"Pogo Jumps", tag:"PJF Elasticity", sets:"3x20 reps", rest:"60 s",
    desc:"Two-foot rapid ground contacts — minimal time on the floor. Trains ankle stiffness and elasticity that powers your first step.",
    cues:["Stay on balls of feet — heels barely touch","Think spring, not squat","Keep knees slightly bent and stiff","Arms help rhythm — small pumps"],
    trainer:"PJF Performance", videoId:"-dNKKNwYTM8", videoTitle:"Pogo Jumps — PJF Performance" },
  { id:"jump-lunge", name:"Jumping Lunges", tag:"Plyo Power", sets:"3x8 each leg", rest:"60 s",
    desc:"Explosive lunge — jump and switch legs in the air, landing soft in the opposite lunge. Builds single-leg power and landing control.",
    cues:["Land SOFT — absorb through the whole leg","Front knee tracks over the toes — don't let it cave in","Drive the arms up to jump higher","Quality over speed — clean reps only"],
    videoId:"acLvV5Gwi7o", videoTitle:"Jumping Lunges" },
  { id:"single-leg-hops", name:"Single Leg Hops", tag:"PJF Reactive", sets:"3x8 each leg", rest:"60 s",
    desc:"Hop forward on one foot and stick each landing for 2 seconds before next hop. Builds reactive strength and jumping mechanics.",
    cues:["Absorb landing through ankle, knee, hip","Freeze on every landing — 2 full counts","Drive knee up on the hop","Eyes forward, not down"],
    trainer:"PJF Performance", videoId:"7WgzHOQGgYw", videoTitle:"Single Leg Hops — PJF Performance" },
  { id:"lateral-bounds-pjf", name:"Lateral Bounds", tag:"PJF Lateral", sets:"3x8 each side", rest:"60 s",
    desc:"Bound sideways off one foot, land and stick on the other. Directly trains the lateral explosiveness used in defensive slides and drives.",
    cues:["Push off the full foot — not just the toes","Reach as far laterally as possible","Soft landing — absorb the energy","Pause 1 second on each landing"],
    trainer:"PJF Performance", videoId:"gjiZLF5S6aA", videoTitle:"Lateral Bounds — PJF Performance" },
  { id:"reactive-pogos", name:"Reactive Pogos", tag:"PJF Reactive", sets:"3x15 reps", rest:"60 s",
    desc:"Faster-paced pogo jumps with a direction change cue. React and redirect on each rep — trains the nervous system, not just the muscle.",
    cues:["React immediately — no hesitation","Stay low and springy","Quick ground contacts","Eyes up for the cue"],
    trainer:"PJF Performance", videoId:"lz6BM6WyJ0k", videoTitle:"Reactive Pogos — PJF Performance" },
  { id:"broad-jump-stick", name:"Broad Jump Stick Landing", tag:"PJF Power", sets:"3x5", rest:"90 s",
    desc:"Two-foot takeoff, jump as far forward as possible, STICK and hold the landing for 3 seconds. Builds horizontal power and landing control.",
    cues:["Load hips — arm swing back before launch","Reach arms forward aggressively on takeoff","Soft landing: toes → ankles → knees → hips","Hold the landing completely still"],
    trainer:"PJF Performance", videoId:"QOVaHwm-Q6U", videoTitle:"Broad Jump Stick Landing — PJF Performance" },
  { id:"squat-jumps", name:"Squat Jumps", tag:"PJF Power", sets:"3x8", rest:"90 s",
    desc:"Squat to parallel, explode up as high as possible, land soft. Classic vertical power builder.",
    cues:["Full squat before each jump","Maximum effort every rep — jump as HIGH as possible","Land quiet — absorb through the legs","Reset fully before next rep"],
    trainer:"PJF Performance", videoId:"U4s4mEQ5VqU", videoTitle:"Squat Jumps — PJF Performance" },
  { id:"tuck-jumps", name:"Tuck Jumps", tag:"PJF Power", sets:"3x6", rest:"90 s",
    desc:"Jump and pull knees to chest at the top. Builds explosive power and body control in the air.",
    cues:["Explode UP first — height before tuck","Pull knees fast at peak","Land and immediately soften","Arms drive the jump — not just legs"],
    trainer:"PJF Performance", videoId:"IcfbOBftn5c", videoTitle:"Pogo Jump to Tuck Jump — PJF Performance" },
  { id:"snap-downs", name:"Snap Downs", tag:"PJF Landing", sets:"3x8", rest:"60 s",
    desc:"From standing tall, snap down into a quarter squat athletic position as fast as possible. Trains the ability to decelerate — essential for cutting and landing safely.",
    cues:["Start tall, feet together","Snap down FAST — like a controlled fall","Land in wide athletic stance","Absorb through hips, not knees"],
    trainer:"PJF Performance", videoId:"fXWPPaRdybI", videoTitle:"Snap Downs — PJF Performance" },
  { id:"depth-drop", name:"Depth Drop Landing", tag:"PJF Landing", sets:"3x6", rest:"60 s",
    desc:"Step off a low box, land and absorb as quietly as possible. Teaches proper force absorption — most important injury-prevention drill.",
    cues:["Step off — do not jump off","Land SOFT and absorb completely","Toes to ankles to knees to hips","Hold landing 2 seconds before moving"],
    trainer:"PJF Performance", videoId:"ol4VhEANoQs", videoTitle:"Depth Drop Landing — Landing Mechanics" },
  { id:"lateral-line-hops", name:"Lateral Line Hops", tag:"PJF Elasticity", sets:"3x20 s", rest:"45 s",
    desc:"Rapid two-foot hops side to side over a line on the floor. Trains foot speed, lateral quickness, and ankle elasticity.",
    cues:["Stay on balls of feet — fast contacts","Keep feet together","Hips stay level — no side lean","Go as fast as you can maintain rhythm"],
    trainer:"PJF Performance", videoId:"dZKEw4zDL_c", videoTitle:"Lateral Line Hops — PJF Performance" },
  { id:"pogo-tutorial",     name:"Pogo Jump Tutorial",             tag:"PJF Technique",  sets:"2x20 reps", rest:"60 s",
    desc:"Step-by-step pogo jump form breakdown. Master the technique before adding speed or volume.",
    cues:["Minimal knee bend — ankles do the work","Arms stay at sides, small pumps","Think bounce, not jump","Heels barely touch the ground"],
    trainer:"PJF Performance", videoId:"j0nl5dWuqN4", videoTitle:"Pogo Jump Tutorial" },
  { id:"single-leg-pogo",   name:"Single Leg Pogo Jumps",         tag:"PJF Elasticity", sets:"3x12 each leg", rest:"60 s",
    desc:"One-foot rapid pogo hops. The single-leg version is harder and more sport-specific — every cut, drive, and jump happens on one leg.",
    cues:["Same cues as two-foot pogo — stiff ankle, ball of foot","Keep hopping foot directly under hip","Use arms for rhythm and balance","Start slow, build speed over sets"],
    trainer:"PJF Performance", videoId:"48hYRGlXvHw", videoTitle:"Single Leg Pogo Jumps" },
  { id:"lat-skater-hops",   name:"Lateral Skater Hops",           tag:"PJF Lateral",    sets:"3x10 each side", rest:"60 s",
    desc:"Speed-skater style lateral bounds. Trains the exact lateral power used in crossovers, defensive slides, and drive-and-kick movements.",
    cues:["Reach trailing leg far behind","Soft landing — absorb through the whole leg","Pause one second on each landing","Build distance, not just speed"],
    trainer:"PJF Performance", videoId:"gS4F_YrwZVs", videoTitle:"Lateral Skater Hops" },
  { id:"power-bounds-series", name:"Power Bounds Series", tag:"Horizontal Power", sets:"3×3 bounds", rest:"90 s",
    desc:"Take 3 (or 4) consecutive broad jumps with no pause between landings — absorb and immediately explode forward. Cover as much ground as possible. Mark your spot and try to beat it next session.",
    cues:["Two-foot takeoff and two-foot landing every rep","Land softly and GO — no pause at all","Arms swing back to front hard — use them for distance","Mark where your heels land and beat it next time"],
    coachNotes:"This is your distance challenge. No pausing between jumps — land and immediately load into the next one. The goal is to cover as much ground as possible in 3 jumps. Beat your mark every session.",
    commonMistakes:["Pausing too long between jumps — this removes the reactive element completely","Under-swinging arms — the arm drive adds 10–15% to your distance","Jumping vertical instead of horizontal — think long, not high"],
    progressionTips:["Start with 3 bounds, advance to 4 when you can land each one controlled","Add a short sprint out of the final landing once the pattern is clean","Try single-leg power bounds (one foot to same foot) when ready for the advanced version"],
    trainer:"PJF Performance", videoId:"p24gY-uIlz4", videoTitle:"Broad Jumps + Bounds + Sprint" },
  { id:"broad-bounds-sprint", name:"Broad Jumps + Bounds + Sprint", tag:"PJF Combo",    sets:"3 rounds", rest:"90 s",
    desc:"Broad jump, then lateral bounds, then sprint. Combines horizontal power, lateral explosiveness, and acceleration in one drill.",
    cues:["Full effort on every component","Reset between jumps — quality over speed","Stick each broad jump landing before bounding","Explode into the sprint"],
    trainer:"PJF Performance", videoId:"p24gY-uIlz4", videoTitle:"Broad Jumps + Bounds + Sprint" },
  { id:"drop-jump",         name:"Drop Jump",                      tag:"PJF Reactive",   sets:"3x6", rest:"90 s",
    desc:"Step off a box, land, and immediately jump as high as possible. Trains the stretch-shortening cycle — the key to reactive jumping power.",
    cues:["Step off — do not jump off the box","Minimal ground contact time — land and GO","Think of the floor as hot","Arms drive hard on the jump"],
    trainer:"PJF Performance", videoId:"LrZuW-sJPBo", videoTitle:"Drop Jump Exercise" },
  { id:"snap-down-prog",    name:"Snap Down Progression",          tag:"PJF Landing",    sets:"3x8", rest:"60 s",
    desc:"Progressive snap-down drill — start with quarter squat, advance to full athletic landing. Builds deceleration skill safely.",
    cues:["Each level must be clean before advancing","Land WIDE — feet outside hips","Eyes forward — not down","Hold each landing completely still"],
    trainer:"PJF Performance", videoId:"_YudFDcW_Iw", videoTitle:"Snap Down Progression" },
  { id:"pogo-to-tuck",      name:"Pogo Jump to Tuck Jump",         tag:"PJF Combo",      sets:"3x6 combos", rest:"90 s",
    desc:"Several rapid pogos, then explode into a max tuck jump. Combines elastic energy with vertical power in one sequence.",
    cues:["Pogos are fast and light — conserve energy","The tuck jump is MAX effort","Pull knees to chest at the peak","Land soft after the tuck"],
    trainer:"PJF Performance", videoId:"IcfbOBftn5c", videoTitle:"Pogo Jump to Tuck Jump" },
  { id:"vj-progression",    name:"Vertical Jump Progression",      tag:"PJF Program",    sets:"Follow video", rest:"As directed",
    desc:"Structured plyometric progression for building vertical jump height. Covers foundational to advanced movements in sequence.",
    cues:["Follow the order — it is a progression","Do not skip levels","Track your vertical jump weekly","Rest days matter as much as training days"],
    trainer:"Plyomorph", videoId:"ihapleg--po", videoTitle:"Home Plyometrics Vertical Jump Workout" },
  { id:"full-plyo-workout",  name:"Full Plyometric Workout",        tag:"PJF Program",    sets:"Follow video", rest:"As directed",
    desc:"Complete guided plyometric session. Use this as a standalone workout on explosion days.",
    cues:["Warm up before starting","Full rest between rounds — quality matters","Form first, then add speed","Track how you feel after each session"],
    trainer:"PJF Performance", videoId:"MNUxK3mbL0c", videoTitle:"Full Plyometric Workout" },
  { id:"dunk-training",      name:"Dunk Training Plyometrics",      tag:"PJF Hoops",      sets:"Follow video", rest:"As directed",
    desc:"Basketball-specific plyometric session focused on vertical jump and explosiveness for dunking and shot-blocking.",
    cues:["Apply every rep to your basketball game","Visualize jumping for a ball on every rep","Track your standing reach weekly","Patience — vertical gains take 6-8 weeks minimum"],
    trainer:"The Lost Breed", videoId:"QRN1Yzo0hjU", videoTitle:"3 Exercises To Increase Your Vertical" },
];

const W_HANDLES = [
  { id:"tennis-dribble", name:"Tennis Ball Toss + Dribble", tag:"Hand-Eye",
    sets:"3x60s each hand", rest:"20 s",
    desc:"Dribble basketball with one hand while tossing and catching a tennis ball with the other. Forces eyes up and builds true ball feel.",
    cues:["Start slow — dribble stays at hip height","Toss tennis ball at eye level","Progress: dribble between legs while doing the toss","No peeking at the basketball — trust your hands"],
    trainer:"RTG Backyard Series", videoId:"nozHTvLyL0o", videoTitle:"Tennis Ball Basketball Dribbling — 4 Variations" },
  { id:"tennis-wall",    name:"Tennis Ball Wall Toss",       tag:"Reaction",
    sets:"3x45s", rest:"20 s",
    desc:"Bounce a tennis ball off a wall and catch it while simultaneously dribbling a basketball. Trains reaction time and hand independence.",
    cues:["Stand 3-4 feet from wall","Throw with one hand, catch with same or switch","Dribble hand stays independent — do not pause it","Level up: throw from behind your back"],
    trainer:"NewAge Elite Sports", videoId:"Tq1wIt3cZK0", videoTitle:"Tennis Ball Ball-Handling Drills" },
  { id:"weak-hand",      name:"Weak Hand Development",        tag:"Off-Hand",
    sets:"10 min dedicated left hand", rest:"N/A",
    desc:"Dominant hand OFF. The single most impactful thing a 10-year-old can do to become a skilled ball handler.",
    cues:["Start with simple stationary pound dribbles — master before moving","No using the strong hand as a crutch","Dribble while watching TV or walking around","Patience — it will feel terrible before it feels okay"],
    trainer:"Get Handles Basketball", videoId:"O4x_AQVZ_nI", videoTitle:"Weak Hand Workout: Dribbling & Layups" },
  { id:"two-ball",       name:"Two Ball Dribbling",            tag:"Coordination",
    sets:"3x45s each drill", rest:"20 s",
    desc:"Both hands simultaneously — simultaneous pound, alternating, staggered. Fastest way to develop ambidexterity.",
    cues:["Shoulders relaxed — do not tense up trying to control both","Both balls at same height","Eyes forward — especially on alternating variation","Start slow. Speed is earned"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"3N92fry2Jdw", videoTitle:"Two Ball Dribble Challenge — DJ Sackmann" },
  { id:"sackmann-hesi",   name:"Hesitation Move Breakdown",    tag:"DJ Sackmann",
    sets:"5 reps each variation each side", rest:"30 s",
    desc:"DJ Sackmann breaks down the hesitation using a 3-cone drill. The hesi is the most useful move in basketball — every guard needs to own it.",
    cues:["Slow-slow-FAST — sell the slowdown before the burst","Eyes stay up — look at the rim to freeze the defender","Inside shoulder drops before the step — that is the sell"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"j4opotx5ZQI", videoTitle:"Hesitation Drill Breakdown — DJ Sackmann" },
  { id:"relph-twoball",   name:"Two Ball Combo Move",           tag:"Tyler Relph",
    sets:"3x45s", rest:"20 s",
    desc:"Tyler Relph advanced two-ball combo: simultaneous dribble while performing specific hand movement patterns. Trains hand independence.",
    cues:["Each hand has its own rhythm — do not sync them","Keep both balls at the same height","If you lose one, reset — do not try to save a bad rep"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"fR6O8m48sg0", videoTitle:"Advanced Two Ball Drill — Tyler Relph" },
];

const W_CONDITIONING = [
  { id:"down-ups",         name:"Down Ups",                        tag:"Conditioning",   sets:"3x10", rest:"30 s",
    desc:"Drop to the ground and get back up as fast as possible. Simulates getting up after diving for a loose ball — conditioning meets competition.",
    cues:["Full body hits the floor — chest down","Explode up immediately","Arms push first, then hips","Keep moving — no pausing at the top or bottom"],
    videoId:"Au8-FTy1smY", videoTitle:"Down Ups — Get Up Fast Exercise" },
  { id:"burpees",          name:"Burpee Progression",              tag:"Conditioning",   sets:"3x8", rest:"45 s",
    desc:"The complete conditioning drill — squat, plank, push-up, jump. Build from half-burpee to full with jump.",
    cues:["Plank position must be solid — no sagging hips","Push-up is optional until upper body is ready","Jump at top — arms overhead","Land soft — right back into the squat"],
    videoId:"TU8QYVW0gDU", videoTitle:"Burpee Progression" },
  { id:"mountain-climbers", name:"Mountain Climbers",              tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"In a plank, drive knees to chest alternately. Builds core stability, hip flexor strength, and conditioning simultaneously.",
    cues:["Hips stay level — do not bounce them","Shoulders directly over hands","Drive knee toward same-side elbow","Keep moving — no pausing"],
    videoId:"nmwgirgXLYM", videoTitle:"Mountain Climbers — Cross Body" },
  { id:"cross-mt-climbers", name:"Cross-Body Mountain Climbers",   tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"Drive each knee toward the OPPOSITE elbow. Adds rotational core challenge — transfers to crossover moves and defensive rotations.",
    cues:["Rotate from the core — not just the hip","Keep the plank solid","Slower than regular mountain climbers — control the rotation","Both shoulders stay square to the floor"],
    videoId:"nmwgirgXLYM", videoTitle:"Cross Body Mountain Climbers" },
  { id:"high-knees",       name:"High Knees",                      tag:"Conditioning",   sets:"3x20 s", rest:"30 s",
    desc:"Run in place driving knees above waist height. Builds hip flexor strength, leg turnover speed, and conditioning.",
    cues:["Drive knee UP — not just forward","Pump arms: opposite arm to opposite leg","Stay on balls of feet","Go as fast as you can maintain form"],
    videoId:"h-lqIgLaEFA", videoTitle:"High Knees — Proper Form & Technique" },
  { id:"fast-feet",        name:"Fast Feet Drill",                 tag:"Quickness",      sets:"3x15 s", rest:"30 s",
    desc:"Rapid short steps in place, then react to a signal. Directly trains the foot speed and reaction time needed for defense.",
    cues:["Barely lift feet off the ground — fast touches","Stay low in athletic stance","Weight on balls of feet","React to the signal — do not anticipate"],
    videoId:"RvYB5qI8Urk", videoTitle:"Fast Feet — Top 5 Foot Speed Drills" },
  { id:"crab-walks",       name:"Crab Walks",                      tag:"Full Body",      sets:"3x20 yards", rest:"30 s",
    desc:"On hands and feet facing up, walk forward and backward. Builds posterior shoulder strength, hip extension, and full-body coordination.",
    cues:["Hips up — not sagging toward the floor","Walk opposite hand and foot together","Eyes up — not at the ground","Keep hips level throughout"],
    videoId:"oNUJek2xixA", videoTitle:"Crab Walk Exercise — Proper Form" },
  { id:"frog-jumps",       name:"Frog Jumps",                      tag:"Power + Cardio", sets:"3x8", rest:"60 s",
    desc:"Deep squat, then explode upward and forward, land back in the squat. Builds hip power and conditions the legs simultaneously.",
    cues:["Deep squat before each jump","Explode from the bottom — no pause","Swing arms forward on takeoff","Land in squat — immediately go again"],
    videoId:"GvTeWVyJKNE", videoTitle:"Frog Jumps — Plyometric Exercise" },
  { id:"plank-jacks",      name:"Plank Jacks",                     tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"In a plank, jump feet out and in like a jumping jack. Core stability under movement — harder than it looks.",
    cues:["Hips stay level — do not rise or dip","Shoulders stay over hands","Land soft with each hop","Breathe steadily throughout"],
    videoId:"8Do3ssZ23Mc", videoTitle:"Plank Jacks — Proper Form" },
  { id:"speed-skaters",    name:"Speed Skaters",                   tag:"Lateral Power",  sets:"3x30 s", rest:"45 s",
    desc:"Lateral bounds alternating feet — like a speed skater. Builds the same lateral explosiveness as defensive slides but with more power.",
    cues:["Reach trailing leg far behind","Pause one second on each landing","Drive forward and lateral — not just sideways","Build distance over time"],
    videoId:"9_jLW6VkU8A", videoTitle:"Speed Skaters Exercise — Proper Form" },
  { id:"shuffle-sprint",   name:"Shuffle + Sprint Drill",          tag:"Basketball",     sets:"5 rounds", rest:"30 s",
    desc:"Defensive shuffle sideways, then explode into a forward sprint. The exact movement pattern of switching from help defense to chase-down pursuit.",
    cues:["Low and wide on the shuffle — never let feet touch","Drop step to transition to sprint","First sprint step is the longest","Eyes forward on the sprint"],
    videoId:"zHirJs7syAI", videoTitle:"Shuffle + Sprint Drill" },
  { id:"quick-feet-cones", name:"Quick Feet Cone Drill",           tag:"Agility",        sets:"5 rounds", rest:"30 s",
    desc:"Navigate through cones with rapid short steps. Trains the foot quickness and spatial awareness needed for dribbling and defending in traffic.",
    cues:["Short choppy steps — do not overreach","Stay low throughout","Eyes up — anticipate the next cone","Speed comes after consistency is built"],
    videoId:"OkOGTjWodHM", videoTitle:"Basketball Agility & Quickness Drills" },
  { id:"wall-sit",         name:"Wall Sit + Calf Raises",          tag:"Strength/Mental", sets:"3x30-45 s", rest:"45 s",
    desc:"Thighs parallel, back flat against the wall — then add calf raises by lifting your heels up and down while you hold. Builds quad and calf endurance plus mental toughness.",
    cues:["Thighs parallel to floor — not higher","Back flat against the wall","Lift the heels slow and controlled for the calf raises","Breathe through the burn — it's mental too"],
    videoId:"BLw3aPUi0k8", videoTitle:"Wall Sit + Calf Raises" },
  { id:"jumping-jacks",    name:"Jumping Jacks",                   tag:"Warm-Up",        sets:"3x30 s", rest:"15 s",
    desc:"Classic warm-up movement. Elevates heart rate, activates the whole body, and improves coordination. Use to open every session.",
    cues:["Full arm extension overhead","Land softly — balls of feet","Steady rhythm — not frantic","Use as a warm-up, not a main exercise"],
    videoId:"c4DAnQ6DtF8", videoTitle:"Jumping Jacks" },
  { id:"squat-jacks",      name:"Squat Jacks",                     tag:"Power + Cardio", sets:"3x15", rest:"45 s",
    desc:"Jump feet wide into a squat, then jump back together. Combines leg power with conditioning — harder and more effective than jumping jacks.",
    cues:["Land in a real squat — thighs parallel","Jump from the squat — do not stand first","Stay low throughout","Chest tall in every squat position"],
    videoId:"U4s4mEQ5VqU", videoTitle:"Squat Jacks Exercise" },
  { id:"push-shoulder-taps", name:"Push-Up Shoulder Taps",         tag:"Upper Body Core", sets:"3x10 each side", rest:"45 s",
    desc:"Do a push-up, then tap each shoulder alternately while in the top position. Adds anti-rotation challenge to the push-up.",
    cues:["Hips do not rotate — resist the rotation","Wide stance helps — feet hip-width or wider","Slow on the taps — control beats speed","Full push-up between each set of taps"],
    videoId:"kF9X6PKVysc", videoTitle:"Push-Up Shoulder Taps — Proper Form" },
];

const W_COORDINATION = [
  { id:"carioca",             name:"Carioca Drill",               tag:"Footwork",          sets:"3x20 yards", rest:"30 s",
    desc:"Crossover running laterally — alternating front and back crosses. The foundation of hip mobility and lateral coordination.",
    cues:["Stay low and light on your feet","Drive hips through each cross","Arms stay relaxed at sides","Speed comes from rhythm, not force"],
    videoId:"R3__Q_SulyM", videoTitle:"Carioca Drill — Lateral Footwork" },
  { id:"lateral-carioca",     name:"Lateral Carioca",             tag:"Footwork",          sets:"3x15 yards each dir", rest:"30 s",
    desc:"Side-to-side carioca focusing on hip rotation and ground contact rhythm.",
    cues:["Rotate hips fully on each cross","Light foot contacts","Keep shoulders square and level","Build speed over each rep"],
    videoId:"R3__Q_SulyM", videoTitle:"Lateral Carioca" },
  { id:"rhythm-line-hops",    name:"Rhythm Line Hops",            tag:"Rhythm",            sets:"3x20 s", rest:"30 s",
    desc:"Two-foot hops in a rhythmic pattern over a line. Builds timing, coordination, and foot-speed rhythm.",
    cues:["Stay on balls of feet","Keep a consistent rhythm — like a metronome","Small hops — clearance only","Eyes forward, not down"],
    videoId:"dJI2q9TPdig", videoTitle:"Line Hops Drill — Jr. NBA at Home" },
  { id:"quick-step-matrix",   name:"Quick Step Matrix",           tag:"Multi-Direction",   sets:"3 rounds", rest:"45 s",
    desc:"Multi-directional quick steps in a grid or box pattern. Trains the ability to change direction and foot placement rapidly.",
    cues:["Short choppy steps","Stay in an athletic base — do not stand tall","Each direction gets equal attention","Speed comes after pattern is memorized"],
    videoId:"zt3_P2PyVco", videoTitle:"Lateral Step Matrix Footwork Drill" },
  { id:"sl-rhythm-hops",      name:"Single Leg Rhythm Hops",      tag:"Single Leg Coord",  sets:"3x12 each leg", rest:"30 s",
    desc:"Rhythmic hops on one foot in a controlled pattern. Combines single-leg stability with coordination timing.",
    cues:["Stay on ball of foot","Find the rhythm before adding speed","Soft landings throughout","Switch legs and notice the difference"],
    videoId:"kehkiqjFQdw", videoTitle:"Single Leg Hop Agility Drill" },
  { id:"cross-body-toe-taps", name:"Cross Body Toe Taps",         tag:"Cross-Body",        sets:"3x20 s", rest:"20 s",
    desc:"Alternate tapping each foot across the midline on a line or cone. Trains cross-body coordination and hip mobility simultaneously.",
    cues:["Reach across the midline on each tap","Stay upright — do not lean","Alternate at a consistent rhythm","Add a bounce between taps to level up"],
    videoId:"ZcFcjTON42I", videoTitle:"Cross Body Toe Taps" },
  { id:"reactive-cone-calls", name:"Reactive Cone Calls",         tag:"Reaction",          sets:"3x45 s", rest:"30 s",
    desc:"React to called cone colors or numbers and sprint to touch. Trains eyes-up awareness and reactive movement together.",
    cues:["Stay in ready position between cues","First step is an explosive push — not a lean","React, do not anticipate","Eyes on the caller, not the cones"],
    videoId:"LKLlDnisYZo", videoTitle:"Cone Reaction Drill" },
  { id:"partner-mirror",      name:"Partner Mirror Drill",        tag:"Reaction",          sets:"3x30 s", rest:"30 s",
    desc:"Mirror your partner's movements in real time. The most game-realistic agility drill — you must read and react, not predict.",
    cues:["Stay in low athletic stance","Eyes on partner's hips — hips tell you direction before feet do","Do not let your partner get past you","Compete — this is a game"],
    videoId:"yIPGMB-crog", videoTitle:"Youth Defensive Mirror Drill" },
  { id:"tennis-reaction-catch",name:"Tennis Ball Reaction Catch", tag:"Hand-Eye",          sets:"3x45 s", rest:"20 s",
    desc:"Drop or toss a tennis ball off a wall and react to catch it. Trains reaction time and hand-eye coordination simultaneously.",
    cues:["Start in ready position — weight on balls of feet","Move first — do not wait to see where it goes","Try to catch it as low as possible","Toss at different angles each rep"],
    videoId:"kzn5mwP2J7c", videoTitle:"Basketball Tennis Ball Reaction Drill" },
  { id:"alternating-line-hops",name:"Alternating Line Hops",     tag:"Rhythm",            sets:"3x20 s", rest:"20 s",
    desc:"Hop side to side over a line alternating the lead foot each rep. Adds a coordination layer to standard line hops.",
    cues:["Lead with a different foot each hop","Stay light — fast contacts","Consistent rhythm over maximum speed","Add forward/backward hops to progress"],
    videoId:"H0lpcLJ94dk", videoTitle:"Alternating Line Hops Agility Drill" },
  { id:"hip-flip-footwork",   name:"Hip Flip Footwork",          tag:"Hip Mobility",      sets:"3x10 each dir", rest:"30 s",
    desc:"Open and close the hips rapidly while moving laterally. The hip flip is the foundation of changing direction without crossing your feet on defense.",
    cues:["Pivot from the hip — not the ankle","Stay low throughout","Plant the pivot foot firmly","Used on every defensive rotation — make it automatic"],
    videoId:"mZVvoGEuBIA", videoTitle:"Defensive Hip Flip — Basketball Drill" },
  { id:"fast-feet-turn",      name:"Fast Feet + Turn",           tag:"Quickness",         sets:"3x15 s", rest:"30 s",
    desc:"Rapid feet-in-place, then explode into a 180-degree turn on a signal. Combines foot speed with hip rotation and reaction.",
    cues:["Fast feet stay low — barely off the floor","Turn is explosive — full commitment","Land in athletic stance on the turn","React to the signal — do not anticipate it"],
    videoId:"z_WsDDyU258", videoTitle:"Fast Feet + Turn — Defensive Footwork Drill" },
  { id:"sl-snap-down-coord",  name:"Single Leg Snap Down",       tag:"Landing Coord",     sets:"3x8 each leg", rest:"45 s",
    desc:"Snap down onto a single leg from a standing position. Trains single-leg deceleration and landing control at a coordination level.",
    cues:["Snap FAST — then absorb completely","Soft landing — no loud contact","Hold every landing for 2 full counts","Progress: start from a box for extra height"],
    videoId:"Wh4oGVLbewE", videoTitle:"Single Leg Snap Down — Landing Control" },
  { id:"lateral-step-matrix", name:"Lateral Step Matrix",        tag:"Multi-Direction",   sets:"3 rounds", rest:"45 s",
    desc:"Lateral step pattern through a grid — forward, back, diagonals. The most complete footwork coordination drill.",
    cues:["Never let feet touch","Short choppy steps","Eyes up throughout the pattern","Memorize the pattern then add speed"],
    videoId:"zt3_P2PyVco", videoTitle:"Lateral Step Matrix" },
  { id:"crossover-footwork",  name:"Crossover Footwork Patterns",tag:"Crossover",         sets:"3x each pattern", rest:"30 s",
    desc:"Structured crossover step sequences for basketball-specific footwork. Covers the exact foot patterns used in crossover dribbles and cuts.",
    cues:["Each pattern is a basketball move — visualize the defender","Plant foot firm before each crossover","Eyes up on every rep","Slow and clean beats fast and sloppy"],
    videoId:"btWfFkTUHog", videoTitle:"Crossover Run — Footwork Drill" },
];

const W_DECELERATION = [
  { id:"jump-stop-hold",       name:"Jump Stop Hold",            tag:"Landing",           sets:"3x8", rest:"45 s",
    desc:"Two-foot jump stop and FREEZE. The pivot foot foundation of every legal basketball move — master this before any other footwork.",
    cues:["Both feet land simultaneously","Freeze on every single landing — 2 full counts","Wide stance — not feet together","This is the most important basketball footwork drill"],
    videoId:"WjssoRn7GcU", videoTitle:"Jump Stop — Two Foot Snap Down & Hold" },
  { id:"sl-stick-landing",     name:"Single Leg Stick Landing",  tag:"Single Leg",        sets:"3x8 each leg", rest:"45 s",
    desc:"Hop and land on one foot, absorb and hold completely still. Teaches the single-leg control that prevents ACL injuries.",
    cues:["Absorb through ankle, knee, and hip","Freeze completely — no extra steps","Knee tracks over second toe — it must NOT cave in","Hold 3 full counts before releasing"],
    videoId:"7WgzHOQGgYw", videoTitle:"Single Leg Stick Landing" },
  { id:"lateral-stick-landing",name:"Lateral Stick Landing",     tag:"Lateral",           sets:"3x8 each side", rest:"45 s",
    desc:"Bound laterally and stick the landing. Directly trains the deceleration needed after a drive, crossover, or defensive cut.",
    cues:["Reach as far as possible before landing","Land soft — toe to heel absorption","Hold every landing completely still","Progress: increase the bound distance"],
    videoId:"AezzGLeOTss", videoTitle:"Lateral Stick Landing" },
  { id:"drop-athletic-stance", name:"Drop To Athletic Stance",   tag:"Deceleration",      sets:"3x10", rest:"30 s",
    desc:"From standing, drop into a low athletic stance as quickly as possible. Trains the ability to decelerate instantly — essential for defensive positioning.",
    cues:["Drop fast — not slow","Land wide — feet outside hips","Hips back and low — not just bent knees","Hold the stance before rising"],
    videoId:"WmcEiWGOiPg", videoTitle:"Reactive Landing Drill — Landing Mechanics" },
  { id:"sprint-to-stick",      name:"Sprint To Stick",           tag:"Deceleration",      sets:"3x5", rest:"60 s",
    desc:"Sprint full speed, then stick a two-foot landing on a line. Teaches the most important skill young athletes lack — decelerating at full speed.",
    cues:["Sprint at TRUE full speed — not 80%","Chop steps approaching the line","Two-foot plant — both feet hit together","Hold the landing for 3 seconds"],
    videoId:"sdgPBkKNO4Y", videoTitle:"Sprint to Stick Landing — Deceleration" },
  { id:"decel-shuffle",        name:"Deceleration Shuffle",      tag:"Lateral Decel",     sets:"3x5 each dir", rest:"45 s",
    desc:"Full-speed defensive shuffle, then stop and hold. Trains lateral deceleration — the stopping skill used every defensive possession.",
    cues:["Shuffle at true speed — not jogging","Chop the last 2 steps to decelerate","Wide athletic stance on the stop","Hold position — do not fall forward"],
    videoId:"ADDEtPq6c_s", videoTitle:"Lateral Shuffle — Deceleration Drill" },
  { id:"snap-down-to-hold",    name:"Snap Down To Hold",         tag:"Deceleration",      sets:"3x8", rest:"60 s",
    desc:"Snap down into a quarter squat and hold completely still. Builds the deceleration mechanics needed to stop after any explosive movement.",
    cues:["Snap down FAST — like cutting off your momentum","Land wide — feet outside hip width","Hold every rep for 3 counts","Build from quarter squat to full athletic stance over sets"],
    videoId:"_YudFDcW_Iw", videoTitle:"Snap Down To Hold" },
  { id:"broad-jump-stick-dec", name:"Broad Jump Stick",          tag:"Horizontal Power",  sets:"3x5", rest:"90 s",
    desc:"Jump as far forward as possible and stick the landing completely. Combines horizontal power with deceleration — the most complete landing drill.",
    cues:["Maximum distance takeoff","Absorb completely on landing — toes to ankles to knees to hips","Hold 3 seconds — completely still","Measure distance each week"],
    videoId:"QOVaHwm-Q6U", videoTitle:"Broad Jump Stick" },
  { id:"lateral-bound-stick",  name:"Lateral Bound Stick",       tag:"Lateral Power",     sets:"3x8 each side", rest:"60 s",
    desc:"Powerful lateral bound and stick the landing on one foot. Trains lateral power and single-leg deceleration together.",
    cues:["Maximum lateral distance","Land soft — absorb the energy","Stick and hold — 3 full counts","Progress: increase the bound distance weekly"],
    videoId:"gjiZLF5S6aA", videoTitle:"Lateral Bound Stick" },
  { id:"split-stance-absorb",  name:"Split Stance Absorption",   tag:"Staggered",         sets:"3x10", rest:"30 s",
    desc:"In a split stance, absorb force drops by bending into the position. Trains deceleration with staggered feet — common landing position in games.",
    cues:["Front shin stays vertical","Back heel can come up slightly","Absorb through BOTH legs","Hold each position before releasing"],
    videoId:"f2-mg9EghpI", videoTitle:"Hop Hop Stick — Plyometric Landing" },
  { id:"hop-hop-stick",        name:"Hop-Hop-Stick",             tag:"Reactive Landing",  sets:"3x6 each leg", rest:"45 s",
    desc:"Two small hops followed by a maximum effort stick landing. Trains the ability to absorb force after repeated ground contacts.",
    cues:["First two hops are light and rhythmic","Third contact is a FULL stick — maximum absorption","No extra steps or hops after the stick","Hold the stick for 2 full counts"],
    videoId:"f2-mg9EghpI", videoTitle:"Hop-Hop-Stick" },
  { id:"reactive-landing",     name:"Reactive Landing Drill",    tag:"Reactive",          sets:"3x8", rest:"45 s",
    desc:"Jump or bound, react to a direction signal, and stick the landing in that direction. Combines reactive movement with deceleration control.",
    cues:["React to the signal at peak height","Land in the called direction","Absorb completely — do not let momentum continue","The faster the reaction, the better the landing"],
    videoId:"WmcEiWGOiPg", videoTitle:"Reactive Landing Drill" },
  { id:"sl-snap-down-dec",     name:"Single Leg Snap Down",      tag:"Single Leg Decel",  sets:"3x8 each leg", rest:"45 s",
    desc:"Snap down onto a single leg and hold. The hardest deceleration skill — trains the single-leg control that protects the knee on every cut and landing.",
    cues:["Land on ball of foot first","Drive heel down to absorb","Knee tracks straight — NEVER caves in","Hold completely still for 3 counts"],
    videoId:"Wh4oGVLbewE", videoTitle:"Single Leg Snap Down — Landing Control" },
  { id:"depth-landing-hold",   name:"Depth Landing Hold",        tag:"Depth",             sets:"3x6", rest:"60 s",
    desc:"Step off a low box and absorb into a held landing. The most controlled way to build landing mechanics — gravity does the work.",
    cues:["Step off — never jump off","Absorb completely before any movement","As quiet as possible — loud = poor absorption","Progress: increase box height slowly"],
    videoId:"WmcEiWGOiPg", videoTitle:"Depth Landing Hold — Landing Mechanics" },
  { id:"closeout-decel",       name:"Closeout Deceleration",     tag:"Basketball",        sets:"3x8", rest:"45 s",
    desc:"Sprint out to a shooter and decelerate with controlled footwork. The exact defensive skill used on every perimeter closeout.",
    cues:["Sprint is full speed to start","Chop steps at 6-8 feet — not earlier","Wide stance on arrival — ready to slide","Hand up and contest — this is a full defensive rep"],
    videoId:"6mzS2sVhcdg", videoTitle:"Closeout Deceleration — Basketball Defense" },
];

const W_ATHLETIC = [
  { id:"hip-turns",            name:"Hip Turns",                 tag:"Hip Mobility",      sets:"3x10 each dir", rest:"30 s",
    desc:"Open and close the hips while moving — the foundation of athletic movement. Every cut, drive, and defensive slide starts with the hips.",
    cues:["Pivot from the hip — not the foot","Full range of motion each rep","Stay low throughout","Fast hips, controlled torso"],
    trainer:"Brian McCormick", videoId:"q5z-WcLbCso", videoTitle:"Hip Turn & Drop Step — Defensive Footwork" },
  { id:"defensive-hip-flip",   name:"Defensive Hip Flip",        tag:"Defense",           sets:"3x10 each dir", rest:"30 s",
    desc:"Flip the hips from front-facing to side-facing while in a defensive stance. The key movement for transitioning from man defense to help defense.",
    cues:["Plant the pivot foot firmly","Hips open fully — not halfway","Stay in athletic stance throughout","Eyes up on every rep — practice seeing the court"],
    videoId:"mZVvoGEuBIA", videoTitle:"Defensive Hip Flip" },
  { id:"retreat-sprint",       name:"Retreat Sprint",            tag:"Backpedal",         sets:"3x5", rest:"45 s",
    desc:"Backpedal 5-8 yards, then turn and sprint. The exact movement pattern of getting beaten off the dribble and recovering.",
    cues:["Backpedal low — do not stand tall","Head stays still on the turn","Sprint is FULL effort — not 80%","Turn toward your strong side first"],
    videoId:"zj5ReqFvKEQ", videoTitle:"Retreat Sprint — Defensive Footwork Drill" },
  { id:"closeout-footwork",    name:"Closeout Footwork",         tag:"Defense",           sets:"3x8", rest:"30 s",
    desc:"Sprint to a closeout position with controlled footwork. The most-used defensive movement in basketball — done every possession.",
    cues:["Sprint hard to start","Chop steps at 5-6 feet from shooter","Wide base on arrival","Hand up, stay balanced — do not fly by"],
    videoId:"aXGENfO9lPg", videoTitle:"Closeout Footwork — Basketball Defense" },
  { id:"shuffle-shuffle-sprint",name:"Shuffle Shuffle Sprint",   tag:"Transition",        sets:"5 rounds", rest:"30 s",
    desc:"Defensive shuffle then explode into a sprint. Trains the transition from defensive positioning to pursuit — used every time you run the floor.",
    cues:["Shuffle stays low — no bouncing","Drop step to trigger the sprint","First sprint step is the longest","Eyes up throughout"],
    videoId:"zHirJs7syAI", videoTitle:"Shuffle Shuffle Sprint" },
  { id:"backpedal-sprint",     name:"Backpedal To Sprint",       tag:"Transition",        sets:"3x5", rest:"45 s",
    desc:"Backpedal then plant and sprint forward. Trains the transition skill used when a defense collapses or you switch from zone to man.",
    cues:["Backpedal with purpose — stay low","Plant is an aggressive step — drive off it","Sprint straight ahead — do not drift","Speed of the turn determines the effectiveness"],
    videoId:"vYnnIZZ91fI", videoTitle:"Defensive Recovery Run — Reaction Drill" },
  { id:"sprint-float-sprint",  name:"Sprint Float Sprint",       tag:"Speed Variation",   sets:"3x1", rest:"60 s",
    desc:"Full sprint, float at 60% to recover, then explode back to full speed. Trains the ability to vary speeds — crucial for basketball where effort levels constantly change.",
    cues:["Full sprint means 100% — do not hold back","Float is recovery — relax your arms and face","Transition back to sprint is IMMEDIATE — no wind-up","This replicates full-court basketball exactly"],
    videoId:"qF88X_wLGlg", videoTitle:"Sprint Float Sprint — Speed Variation" },
  { id:"reactive-slide",       name:"Reactive Slide Drill",      tag:"Defense",           sets:"3x30 s", rest:"30 s",
    desc:"Defensive slide, react to a signal and change direction. The most game-realistic defensive drill — you must read and react.",
    cues:["Stay low and wide throughout","React immediately — no hesitation","Feet never touch in the slide","Eyes on the signal, not the floor"],
    videoId:"XDhHu6YxmFo", videoTitle:"Reactive Slide — Defensive Shuffle Drill" },
  { id:"crossover-run",        name:"Crossover Run",             tag:"Footwork",          sets:"3x20 yards", rest:"30 s",
    desc:"Running with crossover steps — trains the hip coordination and balance needed for offensive and defensive movement at full speed.",
    cues:["Cross over in FRONT — not behind","Stay low throughout","Build speed over the distance","Arms counter-rotate for balance"],
    videoId:"btWfFkTUHog", videoTitle:"Crossover Run" },
  { id:"acceleration-starts",  name:"Acceleration Starts",       tag:"Speed",             sets:"5x10 yards", rest:"45 s",
    desc:"Explosive starts from various positions — standing, crouching, on the ground. Builds first-step power from any position.",
    cues:["Lean into the first step — not just stand up","Drive the knee hard on the first step","Arms drive the speed","First 3 steps determine your acceleration"],
    videoId:"bIsKXTp3nA0", videoTitle:"Sprinter Acceleration Drills" },
  { id:"three-step-burst",     name:"3-Step Burst",              tag:"Explosion",         sets:"3x8 each dir", rest:"30 s",
    desc:"3 explosive steps in a direction then stop. Trains the short-burst acceleration used in every basketball cut — the same pattern as a V-cut or curl.",
    cues:["First step is the longest and hardest","Each step builds on the last — it is an acceleration","Stop is controlled — decelerate into athletic stance","Direction can be forward, lateral, or diagonal"],
    videoId:"0aFbY3lg2kw", videoTitle:"3-Step Burst — Sprint Acceleration Drill" },
  { id:"drop-step-sprint",     name:"Drop Step Sprint",          tag:"Transition",        sets:"3x5 each side", rest:"30 s",
    desc:"Drop step then sprint in that direction. The exact movement used to transition from defensive slide to full sprint pursuit.",
    cues:["Drop step is decisive — commit fully","Drive off the drop step foot hard","Sprint is full speed immediately","This is a transition — not a separate movement"],
    videoId:"XXjV6wYmQKE", videoTitle:"Drop Step Sprint — Basketball Transition" },
  { id:"defensive-recovery",   name:"Defensive Recovery Run",    tag:"Defense",           sets:"3x full court", rest:"60 s",
    desc:"Sprint back on defense at full speed while reading the offense ahead. Trains the defensive transition skill — getting back before the other team scores.",
    cues:["Sprint back at TRUE full speed — not jogging","Eyes on the ball — track the transition","Find your player early","Get between your player and the basket"],
    videoId:"vYnnIZZ91fI", videoTitle:"Defensive Recovery Run" },
  { id:"lateral-sprint-combo", name:"Lateral Sprint Combo",      tag:"Multi-Direction",   sets:"4 rounds", rest:"45 s",
    desc:"Lateral shuffle into a sprint into a defensive slide. Combines three movement patterns in one drill — the sequence of movements used on every possession.",
    cues:["Each transition is SHARP — no slowing down between","Stay low throughout all three phases","Eyes up — see the floor","Full effort on every rep"],
    videoId:"rrImTQmO31E", videoTitle:"Lateral Sprint Combo" },
  { id:"reaction-sprint",      name:"Reaction Sprint Drill",     tag:"Reactive",          sets:"5 rounds", rest:"30 s",
    desc:"Sprint on an audio or visual signal. Trains pure reaction time and first-step quickness — the most important athletic quality in basketball.",
    cues:["Start in ready position — weight forward","React immediately — do not hesitate","First step is an explosive push","Track your reaction time over weeks"],
    videoId:"CmisKok_aiI", videoTitle:"The X-Drill — Reaction & Agility" },
];

const W_SHOOTING = [
  { id:"sackmann-range", name:"Extend Your Shooting Range",       tag:"DJ Sackmann",
    sets:"50 makes progressive distance", rest:"N/A",
    desc:"DJ Sackmann range-building drill. Start close, make 5, step back 2 feet, repeat. Naturally develops more power through mechanics.",
    cues:["Make 5 from each spot before stepping back","If form breaks at any distance, stay there until it is clean","Range comes from legs — get your legs under you"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"aJLFNkb7QA4", videoTitle:"Extend Your Shooting Range — DJ Sackmann" },
  { id:"relph-5spot",    name:"5-Spot Make Drill",                 tag:"Tyler Relph",
    sets:"5 of 6 from each of 5 spots", rest:"N/A",
    desc:"Tyler Relph 5-spot drill with different footwork at each position. Make 5 of 6 before you move.",
    cues:["Do not move to the next spot until you hit 5 of 6","Different footwork each spot: hop, step-in, pivot","Compete against yourself — track your best score"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"qwhx3s8LVnA", videoTitle:"5 Spot Shooting Drill — Tyler Relph" },
  { id:"relph-42pt",     name:"42-Point Shooting Competition",     tag:"Tyler Relph",
    sets:"Full round — track your score", rest:"N/A",
    desc:"Tyler Relph favorite: 3-pointer = 3 pts, pull-up = 2 pts, layup = 1 pt. Closest thing to game pressure in solo practice.",
    cues:["Play it like a game — not just a drill","Mix your shot selection","Track your score every session and try to beat it"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"X9PMRvGxelc", videoTitle:"42-Point Shooting Competition — Tyler Relph" },
  { id:"sackmann-hesi-shot", name:"Shoot Out of Hesitations",     tag:"DJ Sackmann",
    sets:"5 reps each variation each side", rest:"30 s",
    desc:"DJ Sackmann drill connecting ball handling to shooting — hesitate the defender then rise for the shot.",
    cues:["The hesitation earns the shot — do not skip the setup","One foot anchored on the gather — do not drift","Balance on the catch: weight centered, ready to shoot"],
    trainer:"Shot Science Basketball", videoId:"EyYbMJzrKYs", videoTitle:"Hesitation Dribble Attack" },
];

/* ═══════════════════════════════════════════════════════════════
   BASKETBALL SKILL LIBRARY — Ball Handling, Footwork, Finishing,
   Shooting Drills. videoUrl:"" — videos to be sourced separately.
═══════════════════════════════════════════════════════════════ */

const W_BALL_HANDLING = [
  { id:"bh-pound",        name:"Pound Dribble",           tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:90,
    sets:"3x30 s each hand", rest:"15 s",
    transferTags:["ball-control","off-hand","touch"],
    progressionTrack:"Step 1 — Ball Handling Foundation",
    desc:"The absolute starting point. Hip-height stationary dribble with each hand, fingertips only, eyes up. Every elite ball handler still does this daily.",
    cues:["Fingertips — never the palm","Dribble at hip height, not knee or ankle","Push the ball, do not slap it","Eyes forward — trust your hands"],
    trainer:"Pure Sweat Basketball", videoId:"xaOeh5CEc68", videoTitle:"Pound Dribbles — Pure Sweat Basketball" },

  { id:"bh-crossover",    name:"Crossovers",              tag:"Basic Moves",     difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:90,
    sets:"3x20 reps", rest:"20 s",
    transferTags:["attacking","change-of-direction","handles"],
    progressionTrack:"Step 2 — Basic Move Package",
    desc:"Bounce the ball low and fast across the body from hand to hand. The first move every defender has to respect — the foundation of every combo.",
    cues:["Keep the ball BELOW the knee — high crossovers get stolen","Eyes up, sell with your shoulder first","Snap it across — not a lazy float","Alternate slow-to-fast rhythm"],
    trainer:"Kids Basketball Training", videoId:"7kFuB5Wc970", videoTitle:"How To Crossover For Beginners" },

  { id:"bh-btl",          name:"Between Legs",            tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3x30 s alternating", rest:"20 s",
    transferTags:["ball-protection","handles","creativity"],
    progressionTrack:"Step 3 — Advanced Stationary Moves",
    desc:"Dribble the ball through the legs while stationary or on the move. Protects the ball from a reaching defender and sets up combo moves.",
    cues:["Wide stance — ball needs space to fit through","Lead with the receiving hand reaching across","Don't rush — clean slow reps beat sloppy fast","Build to walking, then running"],
    trainer:"Cramer Basketball", videoId:"Y7PjqLcIhXw", videoTitle:"Between Your Legs Dribble — Cramer Basketball" },

  { id:"bh-in-out",       name:"In & Out Dribble",        tag:"Basic Moves",     difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3x20 reps each hand", rest:"20 s",
    transferTags:["change-of-pace","deception","handles"],
    progressionTrack:"Step 2 — Basic Move Package",
    desc:"Attack toward the defender, dip the ball inside as if crossing, then pull it back out in the original direction. The sell makes this move — not the hands.",
    cues:["Sell with your eyes AND shoulder — look where you are faking","Dip the ball inside sharply — half-measure fakes do not work","Snap back out of it: change of pace — slow to FAST","Stay low throughout"],
    trainer:"Cramer Basketball", videoId:"LMy9MUEd0Q0", videoTitle:"V Dribble Series — Cramer Basketball" },

  { id:"bh-retreat",      name:"Retreat Dribble",         tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:90,
    sets:"3x8 reps each direction", rest:"30 s",
    transferTags:["pressure-handling","decision-making","spacing"],
    progressionTrack:"Step 3 — Advanced Stationary Moves",
    desc:"Step backward one or two dribbles while keeping the ball alive — creates space against aggressive defenders. The escape move that resets possessions.",
    cues:["Keep the dribble on the outside foot — away from pressure","Stay low as you retreat — do not stand up","Chin stays down, eyes find the court","Two retreat dribbles MAX — then make a decision"],
    trainer:"Jr. NBA", videoId:"LY31S_8yyOA", videoTitle:"Fundamentals of the Retreat Dribble" },

  { id:"bh-attack-cross", name:"Attack Cross",            tag:"Advanced Moves",  difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:120,
    sets:"3x8 reps each direction", rest:"30 s",
    transferTags:["attacking","change-of-direction","scoring"],
    progressionTrack:"Step 4 — Combo Moves",
    desc:"Hard attack dribble in one direction to draw the defender's momentum, then explode across with a full-speed crossover. The most direct path to getting past a defender.",
    cues:["Attack with purpose — make the defender commit","Time the cross to their weight shift — that is the moment","Cross LOW and fast — do not give them time to recover","Finish with a hard first step through the lane"],
    trainer:"ShotMechanics", videoId:"WokdWEYZ7GU", videoTitle:"Kyrie Irving Dribbling Drills — ShotMechanics" },

  { id:"bh-combo",        name:"Combo Series",            tag:"Advanced Moves",  difficulty:"advanced",     ageRange:[11,14], funScore:10, estimatedDuration:120,
    sets:"3x5 full combos each side", rest:"45 s",
    transferTags:["game-moves","creativity","handles"],
    progressionTrack:"Step 5 — Game-Speed Combos",
    desc:"Two or three moves chained together at full pace — crossover to between-legs, hesi to in-and-out to crossover. This is what defenders see in games.",
    cues:["Each move sets up the next — they are not random","Stay in a low athletic position the entire combo","Speed up across the combo — setup move is slower, finish is explosive","Make one move when one works — do not over-dribble"],
    trainer:"Pro Skills Basketball", videoId:"xyZNJoctA9w", videoTitle:"Best Fun Youth Basketball Drill — Improve Dribbling" },
];

const W_FOOTWORK = [
  { id:"fw-jump-stop",    name:"Jump Stop",               tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:90,
    sets:"3x10 reps", rest:"20 s",
    transferTags:["pivoting","post-moves","legal-play"],
    progressionTrack:"Step 1 — Movement Foundation",
    desc:"Catch or gather into a two-foot simultaneous landing — establishes the pivot foot and legal basketball play. The most important skill in basketball that no one teaches.",
    cues:["Both feet land at the SAME TIME — not one then the other","Land wide with knees bent — athletic base","Freeze completely on landing before any movement","Either foot can become the pivot foot on a jump stop"],
    trainer:"Jr. NBA", videoId:"jgqdv9ySjYM", videoTitle:"Jump Stop, Pivot & Pass Drill — Jr. NBA" },

  { id:"fw-front-pivot",  name:"Front Pivot",             tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:60,
    sets:"3x10 each foot", rest:"15 s",
    transferTags:["post-moves","creation","footwork"],
    progressionTrack:"Step 2 — Pivot Mastery",
    desc:"Step forward with the non-pivot foot, rotating to face a new direction. Opens the ball-handler toward the basket or a passing lane — used on nearly every post touch.",
    cues:["Pivot foot stays planted — zero lift","Swing the free foot forward and around","Stay low through the entire pivot — do not rise up","End in a new triple-threat facing a new direction"],
    trainer:"Jr. NBA", videoId:"3GPNfqIzs9Y", videoTitle:"Forward Pivot Drill — Jr. NBA" },

  { id:"fw-rev-pivot",    name:"Reverse Pivot",           tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:6,  estimatedDuration:60,
    sets:"3x10 each foot", rest:"15 s",
    transferTags:["post-moves","pressure-escape","footwork"],
    progressionTrack:"Step 2 — Pivot Mastery",
    desc:"Step backward with the non-pivot foot to turn away from pressure. Shields the ball from defenders and is the foundation of the drop step and post backing-down.",
    cues:["Swing the free foot backward — not sideways","Keep the ball protected close to your body","Stay low — never rise on a pivot","Eyes over the shoulder — locate the defense"],
    trainer:"Jr. NBA", videoId:"5DgXrx7ZkHU", videoTitle:"Reverse Pivot Drill — Jr. NBA" },

  { id:"fw-triple-threat", name:"Triple Threat",          tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:60,
    sets:"Hold 5 s x 10 reps", rest:"10 s",
    transferTags:["shot-creation","ball-fake","decision-making"],
    progressionTrack:"Step 1 — Movement Foundation",
    desc:"Ball cocked at the hip, knees bent, weight on balls of feet — simultaneously threatening to shoot, pass, or drive. Every catch should land here automatically.",
    cues:["Ball at the hip — not the chest, not the shoulder","Knees bent, hips back — ready to explode","Eyes read the defense: gap? shoot. sagging? drive.","Chin stays level — do not look at the ball"],
    trainer:"Cramer Basketball", videoId:"dg9y9-PuQNE", videoTitle:"Triple Threat Combo Shot Fake Jab Step — Cramer Basketball" },

  { id:"fw-jab-series",   name:"Jab Step Series",         tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3x5 each variation each foot", rest:"30 s",
    transferTags:["shot-creation","driving","footwork"],
    progressionTrack:"Step 3 — Off-The-Dribble Moves",
    desc:"One aggressive step toward the defender to read their reaction: if they back up, pull back and shoot; if they hold, drive past their foot; if they reach, shoot over the retreat.",
    cues:["Jab step is SHARP and aggressive — tentative jabs get ignored","Read the defender's feet: did they move back? Did they reach?","Jab and go: your first dribble is past their front foot","Jab and shoot: pull back into your shot pocket in one motion"],
    trainer:"ShotMechanics", videoId:"eE2Vp10Sqko", videoTitle:"Stephen Curry Jab Step Back Move — ShotMechanics" },

  { id:"fw-rip-through",  name:"Rip Through",             tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:90,
    sets:"3x8 each side", rest:"30 s",
    transferTags:["drawing-fouls","driving","ball-security"],
    progressionTrack:"Step 3 — Off-The-Dribble Moves",
    desc:"Swing the ball in a low arc from one side of the body to the other to rip through an outstretched defender arm — initiates contact and creates driving lanes.",
    cues:["Ball path goes LOW — through the defender's arms, not over them","Rip with both hands — do not let go with the guide hand until through","Lead with the elbow to clear the path","Immediately attack off the rip — do not reset"],
    trainer:"Teach Hoops", videoId:"7dxMH7aP6_Y", videoTitle:"Rip Through & Drive — Great Basketball Moves" },

  { id:"fw-sweep-go",     name:"Sweep & Go",              tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:90,
    sets:"3x8 each direction", rest:"30 s",
    transferTags:["ball-security","driving","transition"],
    progressionTrack:"Step 3 — Off-The-Dribble Moves",
    desc:"Sweep the ball from one side of the body to the other in a protective motion paired with an explosive first step — protects the ball while immediately attacking the defense.",
    cues:["Sweep low and fast — keep the ball protected close to the body","First step is simultaneous with the sweep — not after","Eyes on the rim or defender — not the ball","Use when the defender's hands are active and reaching"],
    trainer:"Basketball HQ", videoId:"gzdweY9uYA8", videoTitle:"1 Minute Basketball Drills: Sweep and Go" },

  { id:"fw-shot-fake",    name:"Shot Fake Series",         tag:"Advanced",        difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3x8 each variation", rest:"30 s",
    transferTags:["shot-creation","drawing-fouls","basketball-IQ"],
    progressionTrack:"Step 4 — Game Skill Integration",
    desc:"Lift the ball as if shooting to get the defender airborne, then attack past them or rise for a real shot over their recovery. Requires patience — do not rush after the fake.",
    cues:["Sell the shot completely — knees bend, ball rises, eyes go to rim","WAIT for the defender to leave their feet — patient players draw fouls","Attack the moment they land — do not hesitate","Shot fake to drive, shot fake to shoot, shot fake to pass — know all three"],
    trainer:"Basketball HQ", videoId:"CGnkzd9wV6g", videoTitle:"How To Use The Shot Fake To Score More Points In Basketball" },
];

const W_FINISHING = [
  { id:"fin-mikan",       name:"Mikan Drill",             tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:9,  estimatedDuration:120,
    sets:"3x20 reps (10 each side)", rest:"30 s",
    transferTags:["layups","timing","basket-finishing"],
    progressionTrack:"Step 1 — Basket Finishing Foundation",
    desc:"Alternate-side baby hooks under the basket — catch on the right, hook left, catch on the left, hook right without letting the ball touch the ground. The greatest finishing drill ever invented.",
    cues:["Ball comes off the glass directly — no floor bounces","High release point — shoot up and over the rim, not at it","Two-foot gather on each catch — then one-foot finish","Rhythm is everything — find the timing before adding speed"],
    trainer:"Pro Skills Basketball", videoId:"3ZVV7aN1F-A", videoTitle:"PSB Drills & Skills — Mikan Drill" },

  { id:"fin-rev-mikan",   name:"Reverse Mikan",           tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3x16 reps (8 each side)", rest:"30 s",
    transferTags:["reverse-layup","backboard-touch","finishing"],
    progressionTrack:"Step 2 — Reverse Side Finishing",
    desc:"Same alternating rhythm as the Mikan drill but finishing on the back-side of the backboard — extends touch range, teaches how to use the glass from unusual angles.",
    cues:["Approach from underneath — step backward through the lane","Release against the near side of the backboard square","Soft touch — high arc, not a power move","Same timing as regular Mikan — just the direction changes"],
    trainer:"CoachMcGannon", videoId:"RZCwpSgNeXo", videoTitle:"The Reverse Mikan Drill" },

  { id:"fin-power-layup", name:"Power Layups",            tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3x10 each side", rest:"30 s",
    transferTags:["contact-finishing","strength","rebounding-position"],
    progressionTrack:"Step 1 — Basket Finishing Foundation",
    desc:"Two-foot gather and two-foot jump to finish — the most reliable finish through contact for young players. Used on drives when defenders are in the lane.",
    cues:["Gather on TWO feet — wide base","Jump straight up — do not lean into the defender","Release the ball at the peak — do not rush","Land in the same spot you took off from"],
    trainer:"Baller Bootcamp", videoId:"treZvJON-xM", videoTitle:"How To Shoot A Power Layup In Basketball" },

  { id:"fin-reverse",     name:"Reverse Layups",          tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3x10 each side", rest:"30 s",
    transferTags:["defender-avoidance","finishing","creativity"],
    progressionTrack:"Step 2 — Reverse Side Finishing",
    desc:"Drive past the block line and use the backboard from the other side — takes away the shot blocker's angle completely. Every youth player needs this in their bag.",
    cues:["Drive PAST the block — do not stop under the rim","Reach the ball out to the far side of the backboard","Soft touch on the glass — high arc","Chin stays up — look at where you are aiming, not at the defender"],
    trainer:"ExpertVillage", videoId:"R0rI1rW7boE", videoTitle:"Basketball Reverse Layup" },

  { id:"fin-floater",     name:"Floater Series",          tag:"Advanced",        difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3x8 each hand", rest:"45 s",
    transferTags:["anti-block","spacing","shot-creation"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"One or two dribble pull-up with a high-arc shot that floats over the outstretched arms of a shot-blocking big man. The signature scoring move of every great guard.",
    cues:["Release early — before you reach the defender, not after","Arc is EVERYTHING — this is not a regular layup","One-foot take-off gives you more separation than two","Soft wrist: imagine dropping the ball over a fence"],
    trainer:"ShotMechanics", videoId:"FtT0iQsl890", videoTitle:"Floater Secrets — 3 Simple Keys to Scoring the Floater" },

  { id:"fin-euro",        name:"Euro Step",               tag:"Advanced",        difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:120,
    sets:"3x8 each direction", rest:"45 s",
    transferTags:["avoiding-contact","finishing","creativity"],
    progressionTrack:"Step 3 — Advanced Footwork Finishes",
    desc:"Gather the ball on one foot stepping one direction, then take the legal second step in the opposite direction — steps completely around the defender's body.",
    cues:["Gather foot steps BIG in one direction to commit the defender","Second step sweeps HARD in the other direction","Ball is protected throughout — under arm, not extended","Finish soft — this is a touch finish, not power"],
    trainer:"ShotMechanics", videoId:"-7ONK1hiZ2A", videoTitle:"How To Euro Step The Safe Way — ShotMechanics" },

  { id:"fin-pro-hop",     name:"Pro Hop Finish",          tag:"Advanced",        difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3x8 each side", rest:"45 s",
    transferTags:["balance","finishing","space-creation"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"Gather on one foot, then jump off that foot to land on two feet before finishing — creates extra space and balance against closing defenders. The most versatile finish.",
    cues:["The hop creates the space — land wide before you finish","Two-foot landing gives you options: shoot, pass, or reset","Stay balanced on the landing — do not drift toward the defender","Practice the footwork without a ball first"],
    trainer:"ShotMechanics", videoId:"pt4i4fzXcSk", videoTitle:"How to Pro Hop Basketball Moves — ShotMechanics" },

  { id:"fin-wrong-foot",  name:"Wrong Foot Layup",        tag:"Elite",           difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3x8 each side", rest:"45 s",
    transferTags:["deception","shot-creation","basketball-IQ"],
    progressionTrack:"Step 5 — Elite Finishing",
    desc:"Finish off the unexpected foot — right-hand layup from the left foot — completely freezes the shot-blocker whose instincts tell them when to jump based on your footwork.",
    cues:["The whole point is surprise — sell the standard footwork first","Jump off the non-dominant foot on the finish","Ball still goes up with the dominant hand — just the take-off foot changes","Film yourself to confirm you are actually switching feet"],
    trainer:"GetHandles", videoId:"vIfDkyZf52s", videoTitle:"Why You SHOULD Take Wrong Foot Layups — GetHandles" },
];

const W_SHOOTING_DRILLS = [
  { id:"sh-form",         name:"Form Shooting",           tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:300,
    sets:"50 makes from 3–5 feet", rest:"N/A",
    transferTags:["mechanics","muscle-memory","shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"BEEF at close range: Balance, Eyes, Elbow, Follow-through. The only drill where repetition of perfect form creates the neuromuscular pattern that lasts forever. Do not move back until form is automatic.",
    cues:["Ball at the forehead — shooting pocket on the way up","Elbow under the ball — not flaring out to the side","Eyes on the back of the rim — not the whole basket","Hold follow-through until the ball hits the net — every single rep"],
    trainer:"CoachUp", videoId:"E4O2JeAYg5Q", videoTitle:"The Form Shooting Drill" },

  { id:"sh-one-hand",     name:"One Hand Form Shooting",  tag:"Foundation",      difficulty:"intermediate", ageRange:[10,14], funScore:5,  estimatedDuration:180,
    sets:"30 makes from 3–5 feet", rest:"N/A",
    transferTags:["mechanics","touch","shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Guide hand removed from the ball — strong hand only shoots and follows through. Immediately exposes any compensation in the mechanics. If it looks different with one hand, the form has a flaw.",
    cues:["Guide hand comes completely off before the shot begins","Strong hand: elbow lines up with the basket","Wrist flicks through completely — full follow-through","If the ball goes anywhere but straight: diagnose the flaw and fix it"],
    trainer:"Pro Skills Basketball", videoId:"drjHBtMgbF4", videoTitle:"One Hand Form Shot — PSB Drills & Skills" },

  { id:"sh-spot",         name:"Spot Shooting",           tag:"Volume",          difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:600,
    sets:"10 makes x 5 spots", rest:"Move between spots",
    transferTags:["game-spots","consistency","range"],
    progressionTrack:"Step 2 — Range Extension",
    desc:"5 marked spots around the arc — left corner, left wing, top of key, right wing, right corner. 10 makes from each before moving. Track total makes per session.",
    cues:["Feet set before the catch — not after","Same shot every time: same pocket, same rhythm, same follow-through","Track your makes — improvement is the measure, not just attempts","Closest spot before you earn the farther spots"],
    trainer:"Basketball Drills", videoId:"1RQPTBFduwc", videoTitle:"7 Spot Basketball Shooting Drill" },

  { id:"sh-atw",          name:"Around The World",        tag:"Game",            difficulty:"beginner",     ageRange:[9,14],  funScore:10, estimatedDuration:300,
    sets:"1–3 full rounds", rest:"Between rounds",
    transferTags:["shooting","pressure","competition"],
    progressionTrack:"Step 2 — Range Extension",
    desc:"7 classic spots in sequence from right corner to left corner. Make it to move on, miss twice and go back to start (or stay on that spot). The timeless youth shooting game that never gets old.",
    cues:["Set your feet before every single shot — no rush","Each spot has the same form — do not adjust based on angle","Call your score out loud — makes it a competition even solo","Try to beat your personal best number of makes per round"],
    trainer:"Teach Hoops", videoId:"KCJHGqWZRLU", videoTitle:"Around the World Basketball Shooting Drill — Teach Hoops" },

  { id:"sh-ft-routine",   name:"Free Throw Routine",      tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:300,
    sets:"Shoot until 10 in a row", rest:"N/A",
    transferTags:["free-throws","routine","pressure-shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Build and repeat a locked pre-shot routine: same number of dribbles, same ball spin, same breath, then shoot. The routine removes the thinking so the mechanics can execute.",
    cues:["Same routine — EXACTLY the same — every single rep","1 or 2 dribbles max: more is a distraction, not a help","Deep breath out before the shot — releases tension","10 in a row is the standard: 9 then a miss means start over"],
    trainer:"PGC Basketball", videoId:"0kj_B1za0U0", videoTitle:"Make More Free Throws — PGC Basketball" },

  { id:"sh-beat-pro",     name:"Beat The Pro",            tag:"Game",            difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:300,
    sets:"5–10 rounds", rest:"Between rounds",
    transferTags:["competition","pressure-shooting","shooting"],
    progressionTrack:"Step 3 — Game-Speed Shooting",
    desc:"You need to score more than an imaginary pro player over a round of shooting. Make = 1 point for you; miss = 1 point for the Pro. First to 7 wins. Develops clutch shooting under self-imposed pressure.",
    cues:["Treat every shot like it matters — because in this game it does","If the Pro is winning, feel that pressure — that is the whole point","Shoot at the same pace you would in a game — no slow-down to aim","Track your win/loss record over weeks — improvement is the trend"],
    trainer:"PGC Basketball", videoId:"LlPdpW6l1SQ", videoTitle:"Beat the Pro — PGC Basketball" },

  { id:"sh-knee-roll",    name:"Knee Roll Ups",              tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:6,  estimatedDuration:120,
    sets:"3x20 makes", rest:"N/A",
    transferTags:["mechanics","wrist","muscle-memory"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Start kneeling on your shooting-side knee with the off-foot planted flat — ball in the shooting pocket, guide hand off. Roll up from the knee to standing, releasing at the top of the rise. Eliminates leg power entirely to isolate wrist and hand mechanics. Created by Miami Heat shooting coach Rob Fodor.",
    cues:["Shooting-side knee down, off-foot flat — keep your back straight","Ball stays in the pocket through the roll — never drop it on the way up","Guide hand completely off from the start — strong hand only","Release at the peak of the rise and hold the follow-through"],
    trainer:"Basketball Immersion", videoId:"cpWL5s5XG0g", videoTitle:"Roll Ups — Beyond Static Form Shooting Drills" },

  { id:"sh-hop-shot",     name:"2 Hop Shots",                tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:120,
    sets:"3x20 reps", rest:"N/A",
    transferTags:["footwork","rhythm","catch-and-shoot"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Toss the ball out to yourself, catch it mid-air and land on both feet simultaneously in a small hop-gather — knees loaded — then rise immediately into your shot. Trains the rhythm and balance of the hop footwork used in catch-and-shoot situations. The hop keeps your body square and loads your legs faster than a 1-2 step.",
    cues:["Hop is SMALL — 2 inches off the ground, not a jump","Both feet land at the exact same time — simultaneous, not one then the other","Knees load on the landing — use that energy straight into the shot","Catch the ball before you land — hands ready in the air"],
    trainer:"HoopsKing", videoId:"uxkg9NJfBFo", videoTitle:"1-2 Step vs. Hop Step Shooting Footwork" },

  { id:"sb-hop-shoot",    name:"Hop Back Balance Shot",       tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:120,
    sets:"3×8 each foot", rest:"30 s",
    transferTags:["balance","step-back","shot-creation"],
    progressionTrack:"Step-Back Level 1 — Hop & Land",
    desc:"Start on one foot. Hop straight backward, stick the landing on that same foot, pause one beat, then shoot. This is Level 1 of the Step Back Legends chain — balance and landing before you ever add a dribble.",
    cues:["Start on your shooting-side foot — knee soft, chest tall","Hop straight back — small hop, not a leap away from the basket","Stick the landing on the ball of your foot before you rise","Shoot only after you're balanced — no falling backward"],
    trainer:"ShotMechanics", videoId:"RD0tviQ3dh4", videoTitle:"One Foot Balance Shooting Drill" },

  { id:"sb-dribble-step", name:"Dribble Step-Back",           tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["step-back","shot-creation","separation"],
    progressionTrack:"Step-Back Level 2 — Dribble Separation",
    desc:"Level 2: one hard dribble with your left hand, push off your right foot into a step-back jumper (train the mirror pattern on the other side too). The Harden/Luka pattern — sell the drive, create space, rise clean.",
    cues:["One hard dribble — low and tight, not a carry","Left-hand version: left dribble, right-foot push into the step-back","Land with knees bent — balanced, not leaning back","Eyes on the rim through the whole move"],
    trainer:"Jr. NBA", videoId:"fFL-PugpRS8", videoTitle:"Elena Delle Donne Teaches the Step-Back" },

  { id:"sb-drive-step",   name:"Drive-to Step-Back",          tag:"Advanced",        difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3×8 each side", rest:"45 s",
    transferTags:["step-back","shot-creation","separation"],
    progressionTrack:"Step-Back Level 3 — Game Speed",
    desc:"Level 3: attack the paint at game speed with one or two dribbles, then snap into a step-back when the defender cuts you off. Full shot-creation — the move you use when the lane closes.",
    cues:["First dribble must threaten the rim — sell the drive","When they cut you off, push back on the dribble-side foot","Gather high — ball protected on the step-back","Same balance and release as Levels 1 and 2"],
    trainer:"ILoveBasketballTV", videoId:"eE2Vp10Sqko", videoTitle:"How to Shoot a Step Back Jumper — ILoveBasketballTV" },

  { id:"sh-single-leg",   name:"Single Leg Hop & Step Back", tag:"Advanced",        difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"3x10 each leg", rest:"30 s",
    transferTags:["balance","off-dribble","step-back"],
    progressionTrack:"Step 3 — Game-Speed Shooting",
    desc:"Advanced balance work after the Step-Back Level 1 hop drill — step back on one leg, land balanced, hold briefly, then shoot from a single-leg support. Builds elite one-leg stability for contested step-backs.",
    cues:["Step back far enough to feel the balance challenge — not a tiny step","Land on the ball of the foot — not the heel — and absorb the landing","Hold the single-leg balance for a full beat before shooting — no rushing","Eyes on the rim the entire time — not watching your feet"],
    trainer:"ShotMechanics", videoId:"RD0tviQ3dh4", videoTitle:"One Foot Balance Shooting Drill" },

  { id:"sh-jab-reset",    name:"Jab Step Reset & Shoot",     tag:"Game",            difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"3x10 each side", rest:"30 s",
    transferTags:["shot-creation","footwork","decision-making"],
    progressionTrack:"Step 3 — Game-Speed Shooting",
    desc:"From triple threat, jab hard toward the defender to read their reaction. If they stand their ground and do not retreat — pull the jab back, reset your feet square to the basket, and shoot. This is the most common shot-creation sequence in half-court basketball and the foundation of every great mid-range scorer.",
    cues:["Jab must be sharp and long — a soft jab is not a threat and will be ignored","Read the feet: if they do not move, shoot; if they back up, go","Reset is ONE motion — back foot comes in, weight loads forward, shot releases","Hold the follow-through — you are shooting over a defender who is standing still"],
    trainer:"Ryan Razooky", videoId:"bmUmNPRfrWo", videoTitle:"Basketball Shooting Drills: Jab Step Series — Ryan Razooky" },
];

const W_POST_MOVES = [
  { id:"pm-seal",        name:"Post Seal & Get Position",      tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:6,  estimatedDuration:150,
    sets:"3×30 s holds", rest:"30 s",
    transferTags:["post-position","sealing","body-control"],
    progressionTrack:"Step 1 — Post Fundamentals",
    desc:"The seal is the foundation of every post move — without deep position, nothing else works. Practice getting and holding the block using your backside, forearm, and wide base to pin the defender behind you. Work both the left and right block.",
    cues:["Wide base — feet outside shoulder width, knees bent deep and loaded","Pin with the hip and forearm — not the hands (that's a foul)","Keep eyes on the ball — call for it with your target hand extended","Stay low throughout the hold — the defender wants to push you baseline or middle"],
    trainer:"Shot Science Basketball", videoId:"t2dJ6EpQIgk", videoTitle:"Sealing in the Post (Like Shaq and Yao Ming) — Shot Science Basketball" },

  { id:"pm-drop-step",   name:"Drop Step",                     tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:150,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["post-footwork","finishing","power-move"],
    progressionTrack:"Step 2 — Post Moves Basics",
    desc:"The most fundamental post move in basketball. Catch on the block, feel where the defender's body is, then swing one foot decisively toward the baseline or middle — that single explosive step clears space and puts you on a straight line to the rim for a power layup or hook shot.",
    cues:["Catch and feel the defender — where are their feet and hips before you move?","Drop step is ONE explosive foot swing — not a shuffle or a bounce","Same-side shoulder drives through on the drop — turn your whole body, not just the foot","Chin up, two hands on the ball as you finish — don't lose it in traffic"],
    trainer:"Howcast", videoId:"kcwCvwCBU-A", videoTitle:"How to Do a Drop-Step | Basketball Moves — Howcast" },

  { id:"pm-hook",        name:"Jump Hook Shot",                 tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:150,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["finishing","post-shooting","touch"],
    progressionTrack:"Step 2 — Post Moves Basics",
    desc:"The hook shot is the most unguardable finish in basketball. Catch near the block, take one gather step toward the lane, jump off the inside foot, and release high over the defender's reach with a soft wrist flip. Practice from both sides until both hands feel comfortable.",
    cues:["Jump off the foot closest to the basket — drive that knee up for height","Shooting arm extends full — elbow to the ceiling, ball as far from the defender as possible","Soft wrist flip at the peak — this is a touch shot, not a power throw","Inside hip swings away from the defender as you go up — create space with your body"],
    trainer:"Shot Science Basketball", videoId:"Oq2V-7cv0R4", videoTitle:"JUMP HOOK Basketball Shot! Low Post Move Tutorial — Shot Science Basketball" },

  { id:"pm-up-under",    name:"Up and Under",                  tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:150,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["footwork","finishing","shot-fake"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"A two-move sequence that rewards reading your defender. Catch on the block, go up convincingly for your shot fake — when the defender jumps or steps in to contest, swing the ball under their outstretched arms and step through for an easy finish at the rim. Requires a patient, convincing fake.",
    cues:["Fake must be a real shot — weight shifts up on your toes, ball rises to chin or forehead, eyes look at the rim","Wait for the defender to go UP — step through the instant you feel their momentum leave the floor","Step through with the outside foot to swing your body past theirs","Stay low through the step — go straight to the glass or finish with a hook"],
    trainer:"Grizzlies Youth Basketball", videoId:"PIqvdG1HpoA", videoTitle:"Master The Up & Under Post Move — Grizzlies Youth Basketball" },

  { id:"pm-spin",        name:"Post Spin Move",                 tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:150,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["footwork","finishing","post-footwork"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"When the defender is pressing hard into your back, use their pressure against them. Plant the inside foot, reverse pivot explosively to spin away from their body, and attack straight to the basket for a power layup or hook. The spin is a counter move — it only works when the defender is pushing.",
    cues:["Plant foot is your pivot foot — never lift it before the spin is complete","Shoulder leads the spin — get your chest through first, the rest of the body follows","Ball stays tight to your chest during the spin — protect it with both hands, elbows out","Come out of the spin low and in attack mode — don't pop upright before you finish"],
    trainer:"ShotMechanics", videoId:"Ug3uvtnC8KI", videoTitle:"How To Perfect the Spin Move: Basketball Moves Mastery — ShotMechanics" },

  { id:"pm-face-up",     name:"Face-Up from the Post",         tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:150,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["footwork","shot-creation","decision-making"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"Catch with your back to the basket, then pivot quickly to face up and read the defender in one smooth motion. If they give space, shoot. If they crowd you, drive baseline or middle. This is the move that separates post players who can only score on their back from post players who can score from anywhere.",
    cues:["Choose your pivot foot before you turn — commit immediately on the catch","Face up quickly — don't let the defender recover position while you're still spinning","Read their stance: sag = catch-and-shoot, crowd = drive to the open side","Land in triple threat when you face up — ball ready to shoot, pass, or drive instantly"],
    trainer:"IMG Academy", videoId:"bfmADWVQp3o", videoTitle:"Facing Up — Post Offensive Skills" },

  { id:"pm-step-through", name:"Shot Fake & Step Through",     tag:"Game",            difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["shot-fake","finishing","footwork"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"A deliberate, high shot fake from any post position draws the defender into the air — then one long step through their body creates a clear path to the basket. Works from the low block, mid-post, or even facing up on the elbow. Patience is the key: you must wait for the defender to fully commit before you step.",
    cues:["Shot fake is SLOW and HIGH — ball rises all the way up, eyes look at the rim, body rises on toes","Wait — you must actually wait long enough for the defender to react and jump","Step through WIDE and decisive — a small shuffle won't clear their body","Protect the ball with your off-arm as you step through — they will swipe at it"],
    trainer:"ShotMechanics", videoId:"Y36J42YAaMg", videoTitle:"Step Through Post Move (LeBron James)" },

  { id:"pm-saddi-combo",  name:"Post Moves Combo (Saddi Washington)", tag:"Game",     difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:180,
    sets:"2 rounds each side", rest:"60 s",
    transferTags:["post-footwork","finishing","post-shooting","decision-making"],
    progressionTrack:"Step 4 — Full Post Game",
    desc:"Full post move sequencing drill from University of Michigan coach Saddi Washington. Catch, seal, and attack in rotation — mixing drop steps, hooks, spins, and up-unders so you're reading and reacting, not just running one pattern. This is game-realistic post play, not just isolated reps.",
    cues:["Every catch starts with a read — feel where the defender is before you move","Vary the move on every rep — don't just do drop steps every time you touch it","Finish every move completely, including when you miss — pursue the rebound","Start at 60% speed and earn your way to full speed over multiple rounds"],
    trainer:"Saddi Washington / My Basketball", videoId:"GOqBvniupY4", videoTitle:"Post Moves with Saddi Washington — Univ. of Michigan" },
];

/* ═══════════════════════════════════════════════════════════════
   FINISHING SCHOOL — Verified layup + finishing curriculum
═══════════════════════════════════════════════════════════════ */
const W_FINISHING_SCHOOL = [
  { id:"fs-power-finish",  name:"Two-Foot Power Finish",      tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["contact-finishing","strength","drawing-fouls"],
    progressionTrack:"Step 1 — Close-Range Foundation",
    desc:"Jump-stop gather on both feet before going up — adds balance, strength, and the ability to draw contact at the rim. The most reliable finish under pressure for youth players.",
    cues:["Jump stop with both feet simultaneously","Use two-foot power to absorb contact","Keep eyes on the target through the finish","Land in the same spot you took off from"],
    trainer:"TeachHoops", videoId:"YzSXr6uNNVQ", videoTitle:"Basketball Drill for Better Layups - Play Off Two Feet" },

  { id:"fs-hop-step",      name:"Hop Step (Pro Hop)",          tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"3×8 each side", rest:"45 s",
    transferTags:["balance","finishing","space-creation"],
    progressionTrack:"Step 3 — Advanced Footwork Finishes",
    desc:"Gather on one foot then hop into a two-foot landing before finishing — creates extra space and balance against closing defenders. The most versatile finish for any position.",
    cues:["The hop creates space — land wide before you finish","Two-foot landing gives options: shoot, pass, or reset","Stay balanced on landing — don't drift toward the defender","Practice the footwork without a ball first"],
    trainer:"TeachHoops", videoId:"p88Tll8I_Tk", videoTitle:"Step-Hop to Layup: Basketball Finishing Drill" },

  { id:"fs-contact-finish",name:"Finish Through Contact",      tag:"Advanced",    difficulty:"advanced",     ageRange:[11,14], funScore:8,  estimatedDuration:120,
    sets:"3×10 reps", rest:"45 s",
    transferTags:["contact-finishing","drawing-fouls","toughness"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"Three moves specifically designed to convert layups when defenders make contact — stay strong through it rather than avoiding it. Learning this directly converts more attempts into made baskets and free-throw opportunities.",
    cues:["Expect contact — stay strong through it, not around it","Use a low, protected dribble into the lane","Extend fully on the finish even when hit","Keep the elbow in — don't lose ball control on contact"],
    trainer:"Breakthrough Basketball", videoId:"6lyBb7u7SAg", videoTitle:"1v1 Finishing Drill From The Corner" },

  /* ── Redistributed from Basketball Skills ── */
  { id:"relph-scoop",    name:"Scoop Layups",                    tag:"Advanced",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"10 each side", rest:"20 s",
    transferTags:["finishing","layups","anti-block"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"Tyler Relph scoop layup breakdown — most underused finishing move, especially effective against taller defenders. Release point is out in front, not overhead, so it floats over shot-blockers.",
    cues:["Release point is out in front — not above your head","Soft touch — not power","Reach under and through the contact","Use off the glass or directly for different angles"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"J3RYUety18M", videoTitle:"Scoop Layups — Tyler Relph Hoop Dynamic" },

  { id:"sackmann-finish", name:"Footwork and Finishes",          tag:"Advanced",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:180,
    sets:"5 reps each finish each side", rest:"30 s",
    transferTags:["finishing","footwork","creativity"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"DJ Sackmann covering layup footwork and finishing variations. Two-step, Euro step, and one-foot gather — each has a specific situation where it's the right choice.",
    cues:["Footwork first — get the steps right before the finish","Euro step: big step away, gather, finish opposite","Each finish has a situation — learn which to use when"],
    trainer:"Jr. NBA", videoId:"QSzapEqhOaE", videoTitle:"V-Cut Layup Drill" },

];

/* ═══════════════════════════════════════════════════════════════
   FOOTWORK LAB — Verified footwork and move curriculum
═══════════════════════════════════════════════════════════════ */
const W_FOOTWORK_LAB = [
  { id:"flab-triple-threat",name:"Triple Threat + Jab",        tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:6,  estimatedDuration:90,
    sets:"5×10 reps each option", rest:"20 s",
    transferTags:["shot-creation","driving","triple-threat"],
    progressionTrack:"Step 1 — Movement Foundation",
    desc:"Ball at the hip, knees bent, weight on the balls of the feet — simultaneously threatening to shoot, pass, or drive. The jab step freezes the defender so you can read their reaction and attack.",
    cues:["Stay on the balls of your feet in triple threat","Jab step decisively — a soft jab gets ignored","Keep eyes up and read the defense's reaction","Every catch should land in triple threat automatically"],
    trainer:"Baller Boot Camp", videoId:"pjV78JTtqI0", videoTitle:"Basketball Fundamentals and Tips - How To Triple Threat | Jab Step | Footwork | Offense" },

  { id:"flab-jab-series",  name:"Full Jab Step Series",        tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3×5 each variation each foot", rest:"30 s",
    transferTags:["shot-creation","driving","footwork"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"Three jab options chained from the same setup — jab and shoot, jab and drive, jab and spin. A complete jab series gives perimeter players three distinct attack paths, making them much harder to guard.",
    cues:["Make the jab sharp and low to threaten the defender","Read whether they step back (shoot) or hold (drive)","Chain the full series — jab, drive, spin are all connected","First dribble goes past their front foot on the drive"],
    trainer:"Basketball HQ", videoId:"IZWZIIiqQ-4", videoTitle:"Basketball Footwork - Jab Series" },

  { id:"flab-shot-fake",   name:"Shot Fake + 1-Dribble Pull-Up",tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["drawing-fouls","shot-creation","basketball-IQ"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"Sell the shot fake all the way up — wait for the defender to leave their feet — take exactly one hard dribble and stop into a balanced jump stop for the pull-up. A high-percentage mid-range weapon that exploits over-contesting defenders.",
    cues:["Bring the ball all the way up to sell the fake","Wait for the defender to LEAVE their feet — patience wins","Take exactly one dribble and stop balanced","Hold the follow-through on every make"],
    trainer:"Jr. NBA feat. C.J. McCollum", videoId:"Auzwv0cDHIc", videoTitle:"The Shot Fake 1-Dribble Pull-Up Drill" },

  { id:"flab-step-through", name:"Step-Through Move",           tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["drawing-fouls","post-footwork","finishing"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"After a convincing shot fake, step through on the side the defender's arm went up — converting the fake into an easy basket. Especially useful when shot-blockers overreact to fakes in the post or mid-range.",
    cues:["Shot fake must be completely convincing — full lift","Step through on the side their arm goes up","Keep low and protect the ball throughout","Finish with a power layup or two-foot stop"],
    trainer:"General Coaching", videoId:"McDPlk1DaRc", videoTitle:"Must Have Basketball Footwork: The Step Through" },

  { id:"flab-duck-in",     name:"Duck-In & Seal",               tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"3×30 s holds each side", rest:"30 s",
    transferTags:["post-position","sealing","body-control"],
    progressionTrack:"Step 3 — Post & Interior Footwork",
    desc:"Time the duck-in when the defender is in help position, then use your backside to seal and create deep post position. Getting deep position is what separates players who score in the post from those who receive the ball too far from the basket.",
    cues:["Time the duck-in when the defender loses sight of you","Use your backside to seal — not your hands (foul)","Call for the ball with a high target hand","Stay low throughout the hold — wide base"],
    trainer:"Pro Tips by DICK'S Sporting Goods", videoId:"dTzfpwqW8Yo", videoTitle:"The Fundamentals of the Duck In and Seal" },

  { id:"flab-rocker-step", name:"Rocker Step",                   tag:"Advanced",    difficulty:"intermediate", ageRange:[11,14], funScore:8,  estimatedDuration:90,
    sets:"3×5 each direction", rest:"30 s",
    transferTags:["shot-creation","driving","footwork"],
    progressionTrack:"Step 4 — Advanced Perimeter Moves",
    desc:"Quick forward-back rocking motion in triple threat gets the defender shifting — then attack in the opposite direction of their lean. The most deceptive triple-threat move without picking up the dribble.",
    cues:["Use a quick forward-back rock to get the defender moving","Stay in triple threat throughout the whole sequence","Attack opposite the direction the defender leans","Inside shoulder drops before the explosion step"],
    trainer:"Pro Training Basketball", videoId:"NbOqnSj6lN8", videoTitle:"Rocker Step - Shiftiest Move Ever (Footwork Mastery)" },

  /* ── Redistributed from Basketball Skills ── */
  { id:"sackmann-footwork", name:"Footwork Foundation",           tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:6,  estimatedDuration:180,
    sets:"3x each pattern", rest:"30 s",
    transferTags:["footwork","handles","attacking"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"DJ Sackmann breaks down drop-step footwork that gives more attacking options off the dribble — the fundamental patterns behind all perimeter creation.",
    cues:["Drop means the heel drops — not the whole foot","Stay low through the drop","Speed of thought before speed of feet"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"Y3RZTBlAT_E", videoTitle:"Basketball Footwork Focus — DJ Sackmann" },
];

/* ═══════════════════════════════════════════════════════════════
   GAME HANDLES — Verified ball-handling drill curriculum
═══════════════════════════════════════════════════════════════ */
const W_GAME_HANDLES = [
  { id:"gh-stationary-cross",name:"Stationary Crossover",      tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3×30 s", rest:"15 s",
    transferTags:["crossover","change-of-direction","ball-handling"],
    progressionTrack:"Step 1 — Ball Control Foundation",
    desc:"Controlled alternating crossover dribbles at below-knee height — pushes through the ball rather than slapping it. Builds the hand strength and coordination that makes live-dribble crossovers quick and deceptive.",
    cues:["Keep the dribble BELOW the knee","Push through — don't slap — on the crossover","Stay in an athletic stance with knees bent throughout","Eyes up the entire time"],
    trainer:"Jr. NBA", videoId:"fuCNf4nmDpM", videoTitle:"Stationary Crossover Drill" },

  { id:"gh-change-pace",   name:"Change-of-Pace Dribble",      tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:90,
    sets:"5×full court or 5 reps", rest:"20 s",
    transferTags:["deception","first-step","attacking"],
    progressionTrack:"Step 2 — Attacking Moves",
    desc:"Drive hard, then slow to near-stop to freeze the defender, then explode out of the pause. Defenders can't react to bursts they didn't see coming — changing pace is the most deceptive weapon a ball-handler has.",
    cues:["Drive hard first — the slowdown is only valuable after you've shown speed","Stay LOW during the hesitation — don't rise up","Explode out of the pause — don't just jog","Eyes on the rim to sell the threat"],
    trainer:"Howcast", videoId:"0Wwv5nDpL6k", videoTitle:"How to Do a Change-of-Pace Dribble | Basketball Moves" },

  { id:"gh-cross-btl",     name:"Crossover + Between-the-Legs",tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:90,
    sets:"3×45 s", rest:"20 s",
    transferTags:["crossover","between-the-legs","combo-moves"],
    progressionTrack:"Step 2 — Attacking Moves",
    desc:"Learn both fundamental change-of-direction moves in one drill. Mastering these in combination builds the two foundational skills that underpin all advanced ball-handling sequences.",
    cues:["Learn each move in isolation before combining","Stagger the feet properly for between-the-legs","Keep the ball at an angle — don't reach back for it","Clean slow beats sloppy fast"],
    trainer:"Hawks Basketball Academy", videoId:"h7s31K0kPh4", videoTitle:"Stationary Crossover & Between the Legs (Beginner Dribble Moves)" },

  { id:"gh-behind-back",   name:"Behind-the-Back Dribble",     tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3×60 s", rest:"20 s",
    transferTags:["behind-the-back","deception","change-of-direction"],
    progressionTrack:"Step 3 — Advanced Moves",
    desc:"Step the lead foot forward as you wrap the ball behind your back — receive on the other side with fingers pointing down. A deceptive direction change that keeps defenders off-balance, particularly when changing speed during a drive.",
    cues:["Step the lead foot forward as you wrap","Receive with fingers pointing DOWN on the other side","Practice slowly before adding speed","Don't rush the receive — control beats speed early on"],
    trainer:"Jr. NBA", videoId:"cGQ7dXW0jCA", videoTitle:"Behind The Back Wrap Breakdown Drill" },

  { id:"gh-dribble-drive", name:"Dribble-Drive Attack",         tag:"Advanced",    difficulty:"intermediate", ageRange:[11,14], funScore:9,  estimatedDuration:90,
    sets:"5 reps each side", rest:"30 s",
    transferTags:["attacking","first-step","scoring"],
    progressionTrack:"Step 4 — Game-Speed Attacking",
    desc:"Attack the defender's front foot to force them to give ground — stay low and use your body to protect the ball, make your decision at the rim before you get there. The most direct route to the basket.",
    cues:["Attack the defender's front foot — force them to give ground","Stay low and protect the ball with your body","Make your rim decision BEFORE you arrive — not at the last second","Explode out of your dribble move — don't coast"],
    trainer:"General Coaching", videoId:"w7Vkpj88edI", videoTitle:"Dribble Drive Attack Basketball Drill" },

  /* ── Redistributed from Basketball Skills ── */
  { id:"gethandles-combo", name:"Combo Crossover — Beat Defenders", tag:"Advanced",    difficulty:"advanced",     ageRange:[11,14], funScore:7,  estimatedDuration:180,
    sets:"5 reps each combo each side", rest:"30 s",
    transferTags:["attacking","change-of-direction","game-moves"],
    progressionTrack:"Step 4 — Game-Speed Attacking",
    desc:"Jesse Muench breaks down between-legs into behind-back combo — go-to sequence for breaking down an aggressive defender. Two-move chain that works because each move sets up the next.",
    cues:["Set up the combo with a hard drive the opposite direction first","Between legs is the fake — behind back is the attack","Do not telegraph — same speed on setup as the move"],
    trainer:"Get Handles · Jesse Muench", videoId:"i1bQI_esIIw", videoTitle:"Combo Crossover Beat Defenders — Get Handles" },

];

/* ═══════════════════════════════════════════════════════════════
   SHOOTING LAB — Verified shooting drill curriculum
═══════════════════════════════════════════════════════════════ */
const W_SHOOTING_LAB = [
  { id:"slab-ft-routine",  name:"Free Throw Routine",           tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:300,
    sets:"Shoot until 10 in a row", rest:"N/A",
    transferTags:["free-throws","routine","pressure-shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Build and lock in a consistent pre-shot routine — same number of dribbles, same spin, same breath — then shoot. The routine removes thinking so mechanics can execute. Games are regularly decided at the charity stripe.",
    cues:["Same routine EXACTLY the same every single rep","1–2 dribbles max — more is a distraction","Deep breath out before the shot to release tension","Align your shooting foot with the nail in the floor"],
    trainer:"TeachHoops", videoId:"upNWZsCtGE8", videoTitle:"Basketball Free Throw Drill" },

  { id:"slab-catch-shoot", name:"Catch-and-Shoot",              tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:180,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["catch-and-shoot","spacing","team-shooting"],
    progressionTrack:"Step 2 — Catch & Shoot",
    desc:"Get your feet set BEFORE the catch — don't adjust after receiving. Square your shoulders as you catch and release immediately without extra dribbles. One of the most valuable skills in modern basketball.",
    cues:["Feet set before the catch — not after","Square shoulders to the basket as you receive","Shoot immediately — no extra dribbles","Come off a screen or jog to a spot to simulate game conditions"],
    trainer:"Jr. NBA", videoId:"O5b5HaxCE3U", videoTitle:"Catch, Turn, & Shoot Drill" },

  { id:"slab-curl-cut",    name:"Shot Off a Screen (Curl Cut)",  tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3×10 each option", rest:"30 s",
    transferTags:["coming-off-screens","team-offense","catch-and-shoot"],
    progressionTrack:"Step 2 — Catch & Shoot",
    desc:"Read the defender's position to decide whether to curl, pop, or flare off the screen. Keep the ball at chin level as you come off. Coming off screens is how players get open in half-court sets.",
    cues:["Read whether to curl, pop, or flare based on defender's position","Keep ball at chin level as you come off the screen","Catch ready to shoot — hands up before the ball arrives","Feet square to the basket before the catch lands"],
    trainer:"Jr. NBA", videoId:"kWEiiUfGqYM", videoTitle:"Fundamentals Of The Curl Cut" },

  { id:"slab-pullup",      name:"1-Dribble Pull-Up",             tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["off-the-dribble","mid-range","pull-up"],
    progressionTrack:"Step 3 — Off-the-Dribble",
    desc:"One hard dribble, then jump stop with feet aligned — square up in the air and don't drift sideways. One of the highest-value mid-range shots in the game because it's efficient, hard to contest, and usable at every position.",
    cues:["One HARD dribble — not a soft push","Jump stop with feet aligned to the basket","Square up in the air — don't drift sideways","Land in the same spot you jumped from"],
    trainer:"TeachHoops", videoId:"i3Cq0s2pnWY", videoTitle:"One Dribble Pull-Up Drill - Basketball Shooting" },

  { id:"slab-elbow",       name:"Elbow Mid-Range",               tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"10 makes each elbow", rest:"30 s",
    transferTags:["mid-range","elbow","half-court"],
    progressionTrack:"Step 3 — Off-the-Dribble",
    desc:"Arrive at the elbow on the move and catch ready to shoot — elbow in, not flared, and shoot with arc aimed at the back of the rim. The most reliable pull-up shot in the half-court — mastering it from both elbows gives you a high-percentage option whenever defenses sag off.",
    cues:["Arrive at the elbow moving — not stationary","Elbow in, not flared — keeps the shot straight","Shoot with arc — aim for the back of the rim at this distance","10 makes each elbow before moving"],
    trainer:"Basketball Shooting Drills", videoId:"ajOtGtnuYks", videoTitle:"Basketball Shooting Drill: Elbow Jump Shots | Improve Your Mid Range Game (Pt 2)" },

  { id:"slab-corner-3",    name:"Corner Three Mechanics",        tag:"Intermediate",difficulty:"intermediate", ageRange:[11,14], funScore:8,  estimatedDuration:120,
    sets:"10 makes each corner", rest:"30 s",
    transferTags:["three-point","corner","team-shooting"],
    progressionTrack:"Step 4 — Range Extension",
    desc:"Square your feet to the basket from the corner angle and catch with your feet already set. The corner three is the highest-value shot in modern basketball by points-per-shot math — mastering it pays dividends at every level of play.",
    cues:["Square your feet to the BASKET — not the sideline","Catch with feet already set toward your target","Keep elbow in and use full wrist snap","Set your feet before the catch — same as all catch-and-shoot situations"],
    trainer:"LethalShooter", videoId:"BjOGkKeZVi4", videoTitle:"The Art of Shooting Lesson #3 (Corner 3)" },

  { id:"slab-step-back",   name:"Step-Back Jumper Basics",       tag:"Advanced",    difficulty:"advanced",     ageRange:[12,14], funScore:9,  estimatedDuration:120,
    sets:"3×8 each side", rest:"45 s",
    transferTags:["step-back","shot-creation","separation"],
    progressionTrack:"Step 5 — Step-Back & Separation",
    desc:"Attack hard first so the step-back is believable — push back on the same foot as the dribble hand and land balanced with knees bent, not falling backward. Creates built-in separation from the defender and is one of the most common ways elite guards create their own shot.",
    cues:["Attack hard FIRST — the step-back is only effective after you've shown drive","Push back on the same foot as your dribble hand","Land balanced with knees bent — not falling backward","Eyes on the rim through the entire sequence"],
    trainer:"Jr. NBA", videoId:"fFL-PugpRS8", videoTitle:"Elena Delle Donne Teaches the Step-Back" },
];

/* ═══════════════════════════════════════════════════════════════
   BASKETBALL IQ — Decision-making, reads, spacing, and awareness.
   Teaches the mental layer of the game solo players can study
   and immediately apply in practice and games.
═══════════════════════════════════════════════════════════════ */
const W_BASKETBALL_IQ = [
  { id:"iq-closeout",    name:"Attack the Closeout",              tag:"Reads",       difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:120,
    sets:"5 reps each read (shoot / drive / reset)", rest:"30 s",
    transferTags:["decision-making","shot-creation","basketball-IQ"],
    progressionTrack:"Step 1 — Read & React",
    desc:"When a defender sprints to close you out, you have three options based on their momentum: shoot if they're airborne, drive the side they're vacating, or reset if they recover. This is the most common scoring opportunity in basketball — learning to read it in real time separates players who score from players who pass back.",
    cues:["Read the momentum: which direction is the defender moving?","Feet leave the floor = shoot immediately — do not hesitate","Defender sprinting past you = drive the opposite direction","Defender recovers well = pull back to triple threat and read again"],
    trainer:"Basketball Education", videoId:"FqF7sq6fe8k", videoTitle:"Basketball Education: Attack Closeout" },

  { id:"iq-shot-drive",  name:"Shot or Drive Read",               tag:"Reads",       difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:120,
    sets:"3×8 reads — shoot reps AND drive reps", rest:"30 s",
    transferTags:["decision-making","shooting","attacking","basketball-IQ"],
    progressionTrack:"Step 1 — Read & React",
    desc:"From triple threat, read the defender's distance before making any move. Arm's length or more of space = shoot. Defender crowding tight = drive their front foot. This single read should happen every time you catch the ball — before any dribble. Players who skip this read waste possessions.",
    cues:["Arms-length gap or more = immediate shot — don't hesitate","Defender within arm's length = attack their front foot","Eyes on the defender's feet — weight tells you where to attack","Make ONE decision and commit — do not change your mind mid-rep"],
    trainer:"Championship Productions", videoId:"Dupz4awdQGI", videoTitle:"Improve Your Offense by Learning to Read the Defender!" },

  { id:"iq-read-def",    name:"Reading Defensive Positioning",    tag:"Reads",       difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"Concept study — 3 read situations × 5 reps", rest:"30 s",
    transferTags:["decision-making","basketball-IQ","spacing","passing"],
    progressionTrack:"Step 2 — Off-Ball Intelligence",
    desc:"Elite defenders use gap positioning — they sit between you and the ball to deny passes AND help on drives. Understanding WHERE defenders set up tells you where the open player is, when a drive will succeed, and when to cut. Every smart offensive decision comes from reading the defense first.",
    cues:["Identify: is your defender in deny or gap coverage?","Gap defender = you are open for a backdoor cut — go immediately","Ball-side defender sagging = catch and shoot before they close","Head on a swivel on every possession — never watch just one spot"],
    trainer:"Basketball IQ", videoId:"jnJHFtUgO58", videoTitle:"Basketball Training: Close Out to Attack Drill" },

  { id:"iq-spacing",     name:"Floor Spacing Basics",             tag:"Concepts",    difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:120,
    sets:"Concept study + court walkthrough", rest:"N/A",
    transferTags:["spacing","basketball-IQ","team-offense","off-ball"],
    progressionTrack:"Step 2 — Off-Ball Intelligence",
    desc:"Where you stand when you do NOT have the ball is as important as what you do with it. Spread to corners and wings — never bunch around the ball. When your teammate drives, stay wide or cut to the basket. Good spacing makes drives easier, passes cleaner, and defenses miserable.",
    cues:["Ball-handler's rule: give them room — spread to a corner or wing","Never stand next to the player with the ball — you eliminate their driving lane","When the driver penetrates, spot up for a catch-and-shoot or cut baseline","One simple standard: every player should be 12–15 feet from every other player"],
    trainer:"JP Productions", videoId:"ySbLZmFWnSw", videoTitle:"Basketball Spacing Made For Beginners! *Learn How To Space The Floor*" },

  { id:"iq-help-side",   name:"Help Side Defense Principles",     tag:"Concepts",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"Concept study + solo shadow reps", rest:"N/A",
    transferTags:["defense","basketball-IQ","help-defense","team-defense"],
    progressionTrack:"Step 3 — Defensive IQ",
    desc:"The most important defensive skill nobody teaches: where to be when the ball is NOT near you. Learn the ball-you-man triangle — always see both the ball and your player. Know when to step into the lane to stop a drive and when to recover to your assignment.",
    cues:["See the ball AND your player at all times — head on a swivel","One pass away: deny your player from catching","Two passes away: move to the help line so you can see both ball and your player","Call 'Help!' when stepping up to stop the drive — then sprint back"],
    trainer:"Upward Sports", videoId:"ES7MVSegkSs", videoTitle:"Help Side Defense Principle" },

  { id:"iq-transition",  name:"Transition Decision-Making",       tag:"Concepts",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"Concept study + visualization", rest:"N/A",
    transferTags:["transition","basketball-IQ","decision-making","team-offense"],
    progressionTrack:"Step 3 — Defensive IQ",
    desc:"The best scoring chances in basketball happen in transition — but only for players making fast, smart decisions. Learn: when to push vs. when to set up, how to fill the correct lane, and how to read numbers advantages to get the right shot every time.",
    cues:["After a stop: outlet to the guard immediately, then sprint to fill a wing lane","Run WIDE — stay outside the three-point line to stretch the defense","2-on-1: attack hard to make the defender commit, then decide: score or pass","3-on-2: middle ball-handler draws both defenders, wings get open layups"],
    trainer:"Smart Offense Basketball", videoId:"1LxBSNKO26o", videoTitle:"Using The Whole Floor In Transition | Smart Offense for Basketball Coaches" },
];

/* ── Passing (solo — wall + footwork; the missing fundamental, trainable alone) ── */
const W_PASSING = [
  { id:"pass-wall-chest", name:"Wall Chest Pass", tag:"Passing", setup:"solo",
    sets:"3x20", rest:"20 s",
    desc:"Two-hand chest passes into a wall target. Builds a snappy, accurate chest pass you can do alone.",
    cues:["Step into the pass","Thumbs down on the follow-through","Hit the same spot every time","Catch with soft hands, fire it right back"] },
  { id:"pass-wall-bounce", name:"Wall Bounce Pass", tag:"Passing", setup:"solo",
    sets:"3x20", rest:"20 s",
    desc:"Bounce pass off the floor into the wall so it comes back to your hips. Trains the bounce-pass angle.",
    cues:["Aim the bounce about two-thirds of the way to the wall","Push through with the thumbs","Keep it crisp — no rainbow","Receive at hip height"] },
  { id:"pass-one-hand", name:"One-Hand Push Pass", tag:"Passing", setup:"solo",
    sets:"3x15 each hand", rest:"20 s",
    desc:"Push pass to a wall target with one hand. Develops the off-the-dribble pass guards use to hit cutters.",
    cues:["Push from the shoulder, not a throw","Work both hands equally","Step in the direction of the pass","Eyes on the target the whole time"] },
  { id:"pass-pivot", name:"Pivot & Pass", tag:"Footwork", setup:"solo",
    sets:"3x10 each side", rest:"25 s",
    desc:"Catch off the wall, land in a jump stop, pivot, and fire the next pass. Links footwork to passing.",
    cues:["Jump stop on the catch — establish your pivot foot","Pivot, then pass — don't drift","Stay low and balanced","Both pivot directions"] },
  { id:"pass-off-dribble", name:"Pass Off the Dribble", tag:"Game Pass", setup:"solo",
    sets:"3x12 each hand", rest:"25 s",
    desc:"Take one dribble, then snap a pass to a wall spot without picking the ball up first. The live-action pass.",
    cues:["Pass straight out of the dribble — no gather","Keep your eyes up, not on the ball","Both hands","Make the target small"] },
];

/* ── Rebounding (solo — self-toss + box-out footwork) ── */
const W_REBOUNDING = [
  { id:"reb-self-toss", name:"Self-Toss Rebound", tag:"Rebounding", setup:"solo",
    sets:"3x10", rest:"30 s",
    desc:"Toss the ball off the backboard, jump and grab it at its highest point, and chin it strong.",
    cues:["Catch it at the peak — go get it, don't wait","Chin the ball — elbows out","Land balanced on two feet","Go right back up or pivot out"] },
  { id:"reb-tips", name:"Tip Drill", tag:"Touch", setup:"solo",
    sets:"3x8 each hand", rest:"30 s",
    desc:"Tip the ball off the backboard repeatedly with one hand, then finish. Builds soft touch and timing up high.",
    cues:["Fingertips, not palm","Keep the arm extended up high","Control the tip — don't slap","Finish the last one"] },
  { id:"reb-boxout", name:"Box-Out Footwork", tag:"Fundamentals", setup:"solo",
    sets:"3x8 each side", rest:"20 s",
    desc:"Pivot, make contact, and seal — the box-out footwork, drilled solo so the movement is automatic in a game.",
    cues:["Reverse pivot into the box-out","Wide base, butt low, forearms ready","Hold the seal for two seconds","Then go get the ball"] },
  { id:"reb-outlet", name:"Rebound & Outlet", tag:"Transition", setup:"solo",
    sets:"3x10", rest:"30 s",
    desc:"Grab a self-toss rebound, turn, and fire an outlet pass to a wall target to start the break.",
    cues:["Secure first, then turn","Turn to the sideline","Strong, accurate outlet","Quick — beat the defense down the floor"] },
  { id:"reb-power", name:"Power Rebound Finish", tag:"Finishing", setup:"solo",
    sets:"3x8", rest:"30 s",
    desc:"Rebound a miss off the glass and go straight back up strong with two feet. Putbacks win games.",
    cues:["Two feet, two hands","Chin it — don't bring it down","Go up strong and tall","Finish high off the glass"] },
];

/* ── Partner & Games (needs a teammate/defender — opt-in, not in solo missions) ── */
const W_PARTNER_GAMES = [
  { id:"pg-partner-pass", name:"Partner Passing", tag:"Passing", setup:"partner",
    sets:"3x1 min", rest:"30 s",
    desc:"Chest, bounce, and overhead passes with a partner — on the move and on the spot.",
    cues:["Lead your partner — pass to where they're going","Call for it with a target hand","Crisp, catchable passes","Mix in bounce and overhead"] },
  { id:"pg-closeout-read", name:"Closeout Read", tag:"Decision", setup:"partner",
    sets:"5 reps each read", rest:"30 s",
    desc:"Partner closes out; you read it — shoot if they're late, drive the side they over-run, reset if they're square.",
    cues:["Make the read BEFORE you catch","Shoot the open one with confidence","Drive past a flying closeout","One dribble, then decide"] },
  { id:"pg-1v1", name:"1v1 — Read the Defender", tag:"Game", setup:"partner",
    sets:"Play to 5, 3 rounds", rest:"60 s",
    desc:"Live 1v1 from the wing. The whole point: read the defender and pick the right move in real time.",
    cues:["Attack the front foot","Change speeds — don't go 100% the whole way","Finish through contact","Defense: stay in a stance, no reaching"] },
  { id:"pg-boxout-live", name:"Live Box-Out", tag:"Rebounding", setup:"partner",
    sets:"3x6 each", rest:"30 s",
    desc:"One shoots/tosses a miss; you box out your partner and go get the board. Real contact, real timing.",
    cues:["Find your partner, then find the ball","Make contact and seal","Hold, then pursue","Chin every rebound"] },
  { id:"pg-2v2", name:"2v2 Small-Sided", tag:"Team", setup:"group",
    sets:"Play to 7, 2 rounds", rest:"90 s",
    desc:"2v2 half-court. Space the floor, cut, and read help — where the game really clicks.",
    cues:["Space out — don't crowd your teammate","Cut when you pass","Talk on defense","Help and recover"] },
  { id:"pg-3v3", name:"3v3 Half-Court", tag:"Team", setup:"group",
    sets:"Play to 11, 1+ rounds", rest:"as needed",
    desc:"3v3 — the closest thing to the real game. Spacing, cutting, screening, and live decisions all at once.",
    cues:["Keep good spacing — fill the open spots","Screen for a teammate","Read help defense before you drive","Communicate every possession"] },
];

const WORKOUTS = {
  speed:        W_SPEED,
  balance:      W_BALANCE,
  strength:     [...W_STRENGTH, ...W_STRENGTH_EXTRA],
  explosion:    W_EXPLOSION,
  conditioning: W_CONDITIONING,
  coordination: W_COORDINATION,
  deceleration: W_DECELERATION,
  athletic:     W_ATHLETIC,
  handles:      W_HANDLES,
  shooting:     W_SHOOTING,
  ballhandling: W_BALL_HANDLING,
  footwork:     W_FOOTWORK,
  finishing:    W_FINISHING,
  shootingdrills: W_SHOOTING_DRILLS,
  postmoves:      W_POST_MOVES,
  finishing_school: W_FINISHING_SCHOOL,
  footwork_lab:     W_FOOTWORK_LAB,
  game_handles:     W_GAME_HANDLES,
  shooting_lab:     W_SHOOTING_LAB,
  basketball_iq:    W_BASKETBALL_IQ,
  passing:          W_PASSING,
  rebounding:       W_REBOUNDING,
  partner_games:    W_PARTNER_GAMES,
};



const SCHEDULE = [
  { day:"Mon", cats:["explosion","deceleration","balance"],   label:"Explosion + Landing + Foundation" },
  { day:"Tue", cats:["strength","conditioning","handles"],    label:"Strength + Conditioning + Handles" },
  { day:"Wed", cats:["balance","coordination"],               label:"Foundation + Coordination" },
  { day:"Thu", cats:["shooting","handles"],                   label:"Shots + Ball Handling 🏀" },
  { day:"Fri", cats:["speed","athletic"],                     label:"Speed + Athletic Movement" },
  { day:"Sat", cats:["strength","shooting"],                  label:"Strength + Full Court" },
  { day:"Sun", cats:[],                                       label:"Rest & Recovery 😴" },
];

const STR_DAYS = {
  "Day 1": { label:"Day 1 — Strength / Core",    ids:["goblet-sq","pushup","step-ups","db-rows","plank-hold"] },
  "Day 2": { label:"Day 2 — Balance / Movement", ids:["walk-lunge","glute-bridge","bosu-sq","sl-ball","side-plank"] },
  "Day 3": { label:"Day 3 — Power / Athletic",   ids:["box-jump","db-deadlift","ohp","split-sq","hollow-hold"] },
};



/* ═══════════════════════════════════════════════════════════════
   EXERCISE METADATA — difficulty, impact, age range, equipment.
   Keyed by exercise id. Powers age-aware workout generation.
═══════════════════════════════════════════════════════════════ */
const EXERCISE_META = {
  /* ─── SPEED ─── */
  "ladder":              { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","coordination"],    basketballTransfer:["footwork","quickness"],     equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "cone-cod":            { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["cutting","defense"],        equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "5-10-5":              { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["speed","cutting"],          equipment:"cones",        spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "lat-bounds":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["explosion","speed"],        equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "def-slide":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","speed"],          equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:120, funScore:6, workoutRole:["main"] },
  /* ─── BALANCE ─── */
  "sl-hold":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["ankles","core","feet"],            basketballTransfer:["defense","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:2, workoutRole:["warmup","recovery"] },
  "bosu-sq":             { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["legs","ankles","core"],            basketballTransfer:["jumping","landing"],        equipment:"bosu",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:5, workoutRole:["main"] },
  "sl-ball":             { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["ankles","core","coordination"],    basketballTransfer:["defense","reaction"],       equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "sl-squat":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","ankles"],         basketballTransfer:["jumping","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:4, workoutRole:["main"] },
  "lat-stick":           { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "triple-lat-hops":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","core"],          basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "pogo-hops":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","feet"],          basketballTransfer:["jumping","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:8, workoutRole:["warmup","main"] },
  "sl-balance-reach":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["ankles","hips","core"],            basketballTransfer:["defense","stability"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:3, workoutRole:["recovery"] },
  /* ─── STRENGTH main ─── */
  "goblet-sq":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","core"],           basketballTransfer:["jumping","power"],          equipment:"dumbbells",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "pushup":              { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["chest","shoulders","core"],        basketballTransfer:["strength","all"],           equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "step-ups":            { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes"],                  basketballTransfer:["jumping","first-step"],     equipment:"box",          spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "db-rows":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["back","biceps"],                   basketballTransfer:["strength","rebounding"],    equipment:"dumbbells",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:3, workoutRole:["main"] },
  "plank-hold":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core"],                            basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:2, workoutRole:["recovery"] },
  "walk-lunge":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","hamstrings"],     basketballTransfer:["running","cutting"],        equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "glute-bridge":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"strength",     bodyFocus:["glutes","hamstrings","core"],      basketballTransfer:["jumping","sprinting"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:3, workoutRole:["warmup","recovery"] },
  "side-plank":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core","obliques"],                 basketballTransfer:["cutting","defense"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:2, workoutRole:["recovery"] },
  "box-jump":            { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["jumping","explosion"],      equipment:"box",          spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "db-deadlift":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["hamstrings","glutes","back"],      basketballTransfer:["jumping","sprinting"],      equipment:"dumbbells",    spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:3, workoutRole:["main"] },
  "ohp":                 { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["shoulders","triceps","core"],      basketballTransfer:["shooting","strength"],      equipment:"dumbbells",    spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:4, workoutRole:["main"] },
  "split-sq":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","hips"],           basketballTransfer:["cutting","jumping"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:4, workoutRole:["main"] },
  "hollow-hold":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core"],                            basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:2, workoutRole:["recovery"] },
  "dead-bug":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core"],                            basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:3, workoutRole:["recovery"] },
  "reverse-lunge":       { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","hamstrings"],     basketballTransfer:["running","cutting"],        equipment:"none",         spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "bw-squats":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","core"],           basketballTransfer:["jumping","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:4, workoutRole:["main"] },
  "str-full":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["full-body"],                       basketballTransfer:["strength","all"],           equipment:"dumbbells",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:1500, funScore:5, workoutRole:["main","finisher"] },
  /* ─── STRENGTH extra ─── */
  "bear-crawl":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["shoulders","core","coordination"], basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup","main"] },
  "broad-jump":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["jumping","first-step"],     equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "skater-jumps":        { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","explosion"],      equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "farmers-carry":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["grip","core","traps"],             basketballTransfer:["strength","all"],           equipment:"dumbbells",    spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:120, funScore:4, workoutRole:["main"] },
  "jump-rope":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["calves","ankles","coordination"],  basketballTransfer:["footwork","conditioning"],  equipment:"jump_rope",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:300, funScore:7, workoutRole:["warmup","main"] },
  /* ─── EXPLOSION ─── */
  "pogo-jumps":          { difficulty:"beginner",     impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","feet"],          basketballTransfer:["jumping","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["warmup","main"] },
  "single-leg-hops":     { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","quads"],         basketballTransfer:["jumping","cutting"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "lateral-bounds-pjf":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","explosion"],      equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "reactive-pogos":      { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves"],                 basketballTransfer:["jumping","reaction"],       equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  "broad-jump-stick":    { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["jumping","power"],          equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "squat-jumps":         { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes"],                   basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "tuck-jumps":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","core"],                     basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:10, workoutRole:["main"] },
  "snap-downs":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "depth-drop":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["landing","safety"],         equipment:"box",          spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "lateral-line-hops":   { difficulty:"beginner",     impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","feet"],          basketballTransfer:["quickness","footwork"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:9, workoutRole:["warmup","main"] },
  "pogo-tutorial":       { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"elastic",      bodyFocus:["ankles","calves"],                 basketballTransfer:["jumping","technique"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["warmup"] },
  "single-leg-pogo":     { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves"],                 basketballTransfer:["jumping","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  "lat-skater-hops":     { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","explosion"],      equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "power-bounds-series": { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","glutes","ankles"],      basketballTransfer:["explosion","first-step","jumping"], equipment:"none", spaceRequired:"large", ageRange:[10,17], estimatedDuration:120, funScore:10, workoutRole:["main","finisher"] },
  "broad-bounds-sprint": { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","ankles"],              basketballTransfer:["explosion","speed"],        equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:150, funScore:9, workoutRole:["main","finisher"] },
  "drop-jump":           { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","ankles","tendons"],         basketballTransfer:["jumping","power"],          equipment:"box",          spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "snap-down-prog":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "pogo-to-tuck":        { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["legs","ankles","core"],            basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:10, workoutRole:["main","finisher"] },
  "vj-progression":      { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["full-legs"],                       basketballTransfer:["jumping"],                  equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:1200, funScore:8, workoutRole:["main"] },
  "full-plyo-workout":   { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","core"],                basketballTransfer:["explosion","jumping"],      equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:1500, funScore:9, workoutRole:["main","finisher"] },
  "dunk-training":       { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","core"],                basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:1500, funScore:10, workoutRole:["main","finisher"] },
  /* ─── CONDITIONING ─── */
  "down-ups":            { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"conditioning", bodyFocus:["full-body"],                       basketballTransfer:["conditioning","toughness"], equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:4, workoutRole:["finisher"] },
  "burpees":             { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"conditioning", bodyFocus:["full-body"],                       basketballTransfer:["conditioning","strength"],  equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:3, workoutRole:["finisher"] },
  "mountain-climbers":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["core","shoulders"],                basketballTransfer:["conditioning","core"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "cross-mt-climbers":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["core","obliques","shoulders"],     basketballTransfer:["conditioning","core"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "high-knees":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["legs","hips","core"],              basketballTransfer:["speed","conditioning"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:6, workoutRole:["warmup","main"] },
  "fast-feet":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["feet","ankles","legs"],            basketballTransfer:["defense","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:45,  funScore:9, workoutRole:["warmup"] },
  "crab-walks":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"strength",     bodyFocus:["shoulders","hips","core"],         basketballTransfer:["conditioning","strength"],  equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:5, workoutRole:["main"] },
  "frog-jumps":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["legs","glutes","core"],            basketballTransfer:["jumping","conditioning"],   equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["finisher"] },
  "plank-jacks":         { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["core","shoulders","legs"],         basketballTransfer:["conditioning","core"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "speed-skaters":       { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","conditioning"],   equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "shuffle-sprint":      { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","conditioning"],   equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "quick-feet-cones":    { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","coordination"],    basketballTransfer:["defense","quickness"],      equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:9, workoutRole:["warmup","main"] },
  "wall-sit":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"high",   movementType:"strength",     bodyFocus:["quads","glutes"],                  basketballTransfer:["strength","toughness"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:2, workoutRole:["finisher"] },
  "jumping-jacks":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"conditioning", bodyFocus:["full-body"],                       basketballTransfer:["conditioning","warmup"],    equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:6, workoutRole:["warmup"] },
  "squat-jacks":         { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["legs","glutes"],                   basketballTransfer:["jumping","conditioning"],   equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["finisher"] },
  "push-shoulder-taps":  { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["chest","shoulders","core"],        basketballTransfer:["strength","stability"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:5, workoutRole:["main"] },
  /* ─── COORDINATION ─── */
  "carioca":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["warmup"] },
  "lateral-carioca":     { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["warmup"] },
  "rhythm-line-hops":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["feet","ankles"],                   basketballTransfer:["footwork","quickness"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:7, workoutRole:["warmup"] },
  "quick-step-matrix":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","legs"],            basketballTransfer:["footwork","quickness"],     equipment:"cones",        spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "sl-rhythm-hops":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["ankles","calves","core"],          basketballTransfer:["footwork","balance"],       equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "cross-body-toe-taps": { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","core","coordination"],     basketballTransfer:["footwork","handles"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:6, workoutRole:["warmup"] },
  "reactive-cone-calls": { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["full-body","reaction"],            basketballTransfer:["defense","reaction"],       equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:10, workoutRole:["main"] },
  "partner-mirror":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["full-body","reaction"],            basketballTransfer:["defense","reaction"],       equipment:"partner",      spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:10, workoutRole:["main"] },
  "tennis-reaction-catch":{ difficulty:"beginner",    impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","eyes","reaction"],         basketballTransfer:["ball-handling","reaction"], equipment:"tennis_ball",  spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:9, workoutRole:["warmup","main"] },
  "alternating-line-hops":{ difficulty:"beginner",    impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["feet","ankles"],                   basketballTransfer:["footwork","coordination"],  equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:8, workoutRole:["warmup"] },
  "hip-flip-footwork":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "fast-feet-turn":      { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","hips"],            basketballTransfer:["defense","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:8, workoutRole:["warmup","main"] },
  "sl-snap-down-coord":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["landing","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "lateral-step-matrix": { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","hips"],            basketballTransfer:["footwork","defense"],       equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "crossover-footwork":  { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","hips","ankles"],            basketballTransfer:["handles","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  /* ─── DECELERATION ─── */
  "jump-stop-hold":      { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","core"],            basketballTransfer:["footwork","post-moves"],    equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "sl-stick-landing":    { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["landing","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "lateral-stick-landing":{ difficulty:"intermediate",impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["cutting","defense"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "drop-athletic-stance":{ difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"deceleration", bodyFocus:["legs","hips","core"],              basketballTransfer:["defense","reaction"],       equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["warmup"] },
  "sprint-to-stick":     { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"deceleration", bodyFocus:["full-legs","ankles","core"],       basketballTransfer:["defense","stopping"],       equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:8, workoutRole:["main","finisher"] },
  "decel-shuffle":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","hips"],                     basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "snap-down-to-hold":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "broad-jump-stick-dec":{ difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["full-legs","ankles"],              basketballTransfer:["jumping","landing"],        equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "lateral-bound-stick": { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","defense"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "split-stance-absorb": { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["landing","balance"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:4, workoutRole:["main"] },
  "hop-hop-stick":       { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","calves","core"],          basketballTransfer:["landing","jumping"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "reactive-landing":    { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["full-legs","ankles","reaction"],   basketballTransfer:["landing","defense"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "sl-snap-down-dec":    { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "depth-landing-hold":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["landing","safety"],         equipment:"box",          spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "closeout-decel":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","hips","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  /* ─── ATHLETIC MOVEMENT ─── */
  "hip-turns":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet"],                     basketballTransfer:["defense","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup"] },
  "defensive-hip-flip":  { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "retreat-sprint":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","speed"],          equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "closeout-footwork":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "shuffle-shuffle-sprint":{ difficulty:"beginner",   impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","transition"],     equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "backpedal-sprint":    { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","speed"],          equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "sprint-float-sprint": { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"conditioning", bodyFocus:["full-legs","lungs"],               basketballTransfer:["conditioning","speed"],     equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:150, funScore:6, workoutRole:["finisher"] },
  "reactive-slide":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["defense","reaction"],       equipment:"cones",        spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  "crossover-run":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["footwork","cutting"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup","main"] },
  "acceleration-starts": { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["speed","first-step"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "three-step-burst":    { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["speed","cutting"],          equipment:"none",         spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "drop-step-sprint":    { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","transition"],     equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "defensive-recovery":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"athletic",     bodyFocus:["legs","lungs"],                    basketballTransfer:["defense","conditioning"],   equipment:"none",         spaceRequired:"full_court", ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["finisher"] },
  "lateral-sprint-combo":{ difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"athletic",     bodyFocus:["full-legs","hips"],                basketballTransfer:["defense","conditioning"],   equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main","finisher"] },
  "reaction-sprint":     { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","reaction"],          basketballTransfer:["speed","defense"],          equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  /* ─── HANDLES ─── */
  "tennis-dribble":      { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","eyes","coordination"],     basketballTransfer:["ball-handling","reaction"], equipment:"tennis_ball",  spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "tennis-wall":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","eyes","reaction"],         basketballTransfer:["ball-handling","reaction"], equipment:"tennis_ball",  spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "weak-hand":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists"],                  basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:600, funScore:5, workoutRole:["main"] },
  "two-ball":            { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball_x2",spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "sackmann-hesi":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"cones",        spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "relph-twoball":       { difficulty:"advanced",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball_x2",spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  /* ─── BASKETBALL SKILLS (redistributed) ─── */
  "sackmann-footwork":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips"],                     basketballTransfer:["footwork","handles"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:180, funScore:6, workoutRole:["main"] },
  "relph-scoop":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["finishing","layups"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "sackmann-finish":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hands","coordination"],     basketballTransfer:["finishing","footwork"],     equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  "gethandles-combo":    { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  /* ─── SHOOTING ─── */
  "sackmann-range":      { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "relph-5spot":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "relph-42pt":          { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet","hips"],    basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "sackmann-hesi-shot":  { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  /* ─── BALL HANDLING MOVES ─── */
  "bh-pound":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","fingers"],        basketballTransfer:["ball-control","off-hand","touch"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:5,  workoutRole:["warmup","main"], progressionTrack:"Step 1 — Ball Handling Foundation" },
  "bh-crossover":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["attacking","change-of-direction","handles"],  equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8,  workoutRole:["warmup","main"], progressionTrack:"Step 2 — Basic Move Package" },
  "bh-btl":              { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","hips"],           basketballTransfer:["ball-protection","handles","creativity"],     equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Advanced Stationary Moves" },
  "bh-in-out":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","shoulders"],      basketballTransfer:["change-of-pace","deception","handles"],       equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:7,  workoutRole:["warmup","main"], progressionTrack:"Step 2 — Basic Move Package" },
  "bh-retreat":          { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["pressure-handling","decision-making","spacing"],equipment:"basketball",  spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Advanced Stationary Moves" },
  "bh-attack-cross":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["attacking","change-of-direction","scoring"],   equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:10, workoutRole:["main"],          progressionTrack:"Step 4 — Combo Moves" },
  "bh-combo":            { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["game-moves","creativity","handles"],           equipment:"basketball",   spaceRequired:"medium",     ageRange:[11,14], estimatedDuration:120, funScore:10, workoutRole:["main"],          progressionTrack:"Step 5 — Game-Speed Combos" },
  /* ─── FOOTWORK ─── */
  "fw-jump-stop":        { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","ankles","core"],            basketballTransfer:["pivoting","post-moves","legal-play"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:5,  workoutRole:["warmup","main"], progressionTrack:"Step 1 — Movement Foundation" },
  "fw-front-pivot":      { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["feet","hips","legs"],              basketballTransfer:["post-moves","creation","footwork"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5,  workoutRole:["warmup","main"], progressionTrack:"Step 2 — Pivot Mastery" },
  "fw-rev-pivot":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["feet","hips","legs"],              basketballTransfer:["post-moves","pressure-escape","footwork"],    equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:60,  funScore:6,  workoutRole:["main"],          progressionTrack:"Step 2 — Pivot Mastery" },
  "fw-triple-threat":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","hips","core"],              basketballTransfer:["shot-creation","ball-fake","decision-making"], equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5,  workoutRole:["warmup"],        progressionTrack:"Step 1 — Movement Foundation" },
  "fw-jab-series":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips","legs"],              basketballTransfer:["shot-creation","driving","footwork"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8,  workoutRole:["main"],          progressionTrack:"Step 3 — Off-The-Dribble Moves" },
  "fw-rip-through":      { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","shoulders","hips"],        basketballTransfer:["drawing-fouls","driving","ball-security"],    equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Off-The-Dribble Moves" },
  "fw-sweep-go":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["ball-security","driving","transition"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Off-The-Dribble Moves" },
  "fw-shot-fake":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","legs","core"],             basketballTransfer:["shot-creation","drawing-fouls","basketball-IQ"],equipment:"basketball", spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9,  workoutRole:["main"],          progressionTrack:"Step 4 — Game Skill Integration" },
  /* ─── FINISHING ─── */
  "fin-mikan":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["layups","timing","basket-finishing"],         equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 1 — Basket Finishing Foundation" },
  "fin-rev-mikan":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["reverse-layup","backboard-touch","finishing"], equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Reverse Side Finishing" },
  "fin-power-layup":     { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","hands","core"],             basketballTransfer:["contact-finishing","strength","rebounding"],  equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 1 — Basket Finishing Foundation" },
  "fin-reverse":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["defender-avoidance","finishing","creativity"], equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Reverse Side Finishing" },
  "fin-floater":         { difficulty:"advanced",     impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["anti-block","spacing","shot-creation"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 4 — Advanced Finishes" },
  "fin-euro":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips","coordination"],      basketballTransfer:["avoiding-contact","finishing","creativity"],   equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:10, workoutRole:["main"],          progressionTrack:"Step 3 — Advanced Footwork Finishes" },
  "fin-pro-hop":         { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","coordination"],      basketballTransfer:["balance","finishing","space-creation"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 4 — Advanced Finishes" },
  "fin-wrong-foot":      { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","legs","coordination"],      basketballTransfer:["deception","shot-creation","basketball-IQ"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 5 — Elite Finishing" },
  /* ─── SHOOTING DRILLS ─── */
  "sh-form":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","shoulders"],      basketballTransfer:["mechanics","muscle-memory","shooting"],       equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:300, funScore:5,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-one-hand":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hand","wrist","shoulder"],         basketballTransfer:["mechanics","touch","shooting"],               equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:180, funScore:5,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-spot":             { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet","legs"],    basketballTransfer:["game-spots","consistency","range"],           equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:600, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Range Extension" },
  "sh-atw":              { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting","pressure","competition"],          equipment:"basketball",   spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:300, funScore:10, workoutRole:["main"],          progressionTrack:"Step 2 — Range Extension" },
  "sh-ft-routine":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["free-throws","routine","pressure-shooting"],  equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:300, funScore:5,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-beat-pro":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet","mind"],    basketballTransfer:["competition","pressure-shooting","shooting"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:300, funScore:10, workoutRole:["main","finisher"],progressionTrack:"Step 3 — Game-Speed Shooting" },
  "sh-knee-roll":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","fingers"],        basketballTransfer:["mechanics","wrist","muscle-memory"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:6,  workoutRole:["warmup","main"],  progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-hop-shot":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","feet","hands"],             basketballTransfer:["footwork","rhythm","catch-and-shoot"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sb-hop-shoot":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","core","feet"],              basketballTransfer:["balance","step-back","shot-creation"],          equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step-Back Level 1 — Hop & Land" },
  "sb-dribble-step":     { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hands"],             basketballTransfer:["step-back","shot-creation","separation"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:8,  workoutRole:["main"],          progressionTrack:"Step-Back Level 2 — Dribble Separation" },
  "sb-drive-step":       { difficulty:"advanced",     impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hands","mind"],      basketballTransfer:["step-back","shot-creation","separation"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step-Back Level 3 — Game Speed" },
  "sh-single-leg":       { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","core","feet"],              basketballTransfer:["balance","off-dribble","step-back"],           equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Game-Speed Shooting" },
  "sh-jab-reset":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hands","mind"],      basketballTransfer:["shot-creation","footwork","decision-making"],  equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Game-Speed Shooting" },

  "pm-seal":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hips","legs","core","back"],       basketballTransfer:["post-position","sealing","body-control"],      equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:150, funScore:6,  workoutRole:["warmup","main"],  progressionTrack:"Step 1 — Post Fundamentals" },
  "pm-drop-step":        { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","hips","core"],              basketballTransfer:["post-footwork","finishing","power-move"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:150, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Post Moves Basics" },
  "pm-hook":             { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","arms","wrists","hands"],    basketballTransfer:["finishing","post-shooting","touch"],            equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:150, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Post Moves Basics" },
  "pm-up-under":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","core","arms"],       basketballTransfer:["footwork","finishing","shot-fake"],             equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:150, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-spin":             { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","hips","core","shoulders"],  basketballTransfer:["footwork","finishing","post-footwork"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:150, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-face-up":          { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hips","mind"],       basketballTransfer:["footwork","shot-creation","decision-making"],   equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:150, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-step-through":     { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hands","mind"],      basketballTransfer:["shot-fake","finishing","footwork"],             equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-saddi-combo":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"high",   movementType:"skill",        bodyFocus:["legs","feet","core","arms","mind"],basketballTransfer:["post-footwork","finishing","post-shooting","decision-making"], equipment:"basketball", spaceRequired:"medium", ageRange:[10,14], estimatedDuration:180, funScore:10, workoutRole:["main","finisher"],progressionTrack:"Step 4 — Full Post Game" },
  /* ─── BASKETBALL IQ ─── */
  "iq-closeout":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","hands"],             basketballTransfer:["decision-making","shot-creation","basketball-IQ"], equipment:"basketball", spaceRequired:"medium", ageRange:[9,14],  estimatedDuration:120, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 1 — Read & React" },
  "iq-shot-drive":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","hands"],             basketballTransfer:["decision-making","shooting","attacking","basketball-IQ"], equipment:"basketball", spaceRequired:"medium", ageRange:[9,14], estimatedDuration:120, funScore:8, workoutRole:["main"],           progressionTrack:"Step 1 — Read & React" },
  "iq-read-def":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","eyes","coordination"],      basketballTransfer:["decision-making","basketball-IQ","spacing","passing"], equipment:"basketball", spaceRequired:"medium", ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"],           progressionTrack:"Step 2 — Off-Ball Intelligence" },
  "iq-spacing":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","coordination"],      basketballTransfer:["spacing","basketball-IQ","team-offense","off-ball"], equipment:"basketball",  spaceRequired:"large",  ageRange:[9,14],  estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 2 — Off-Ball Intelligence" },
  "iq-help-side":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","coordination"],      basketballTransfer:["defense","basketball-IQ","help-defense","team-defense"], equipment:"none",      spaceRequired:"large",  ageRange:[10,14], estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Defensive IQ" },
  "iq-transition":       { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","coordination"],      basketballTransfer:["transition","basketball-IQ","decision-making","team-offense"], equipment:"basketball", spaceRequired:"large", ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"],           progressionTrack:"Step 3 — Defensive IQ" },
};

/* Age-based workout generation rules */
const AGE_RULES = {
  9:  { maxMinutes:12, maxExercises:4, maxHighImpact:1, focus:["coordination","balance","fun","skill"] },
  10: { maxMinutes:15, maxExercises:5, maxHighImpact:2, focus:["coordination","balance","elastic","skill"] },
  11: { maxMinutes:18, maxExercises:6, maxHighImpact:2, focus:["elastic","coordination","skill","strength"] },
  12: { maxMinutes:20, maxExercises:7, maxHighImpact:3, focus:["elastic","strength","skill","athletic"] },
  13: { maxMinutes:25, maxExercises:8, maxHighImpact:4, focus:["explosion","speed","conditioning","strength"] },
  14: { maxMinutes:30, maxExercises:9, maxHighImpact:5, focus:["explosion","speed","conditioning","strength"] },
};

/* ═══════════════════════════════════════════════════════════════
   POSITION PROFILES
   Guard / Wing / Post — each defines score boosts + spotlight IDs
═══════════════════════════════════════════════════════════════ */
const POSITION_PROFILES = {
  guard: {
    label:"Guard", emoji:"🏃",
    desc:"Handle pressure, attack off the dribble, and hit shots off movement.",
    boostCats:["ballhandling","shootingdrills","footwork","speed"],
    boostTags:["ball-handling","attacking","change-of-direction","shot-creation","handles",
               "quickness","footwork","change-of-pace","pressure-handling","off-dribble"],
    spotlight:["bh-attack-cross","sh-jab-reset","fw-jab-series","sh-beat-pro","bh-combo"],
  },
  wing: {
    label:"Wing", emoji:"🏀",
    desc:"Score in transition, finish at the rim, and knock down catch-and-shoot looks.",
    boostCats:["finishing","footwork","shootingdrills","explosion"],
    boostTags:["finishing","cutting","layups","shot-creation","explosion","jumping",
               "catch-and-shoot","euro","avoiding-contact","balance","anti-block"],
    spotlight:["fin-euro","fin-floater","fw-rip-through","sh-spot","fin-pro-hop"],
  },
  post: {
    label:"Post", emoji:"💪",
    desc:"Get deep position, use your body, and finish over defenders at the rim.",
    boostCats:["postmoves","finishing","footwork","strength"],
    boostTags:["post-footwork","post-position","finishing","power-move","sealing","strength",
               "rebounding","contact-finishing","post-shooting","touch","shot-fake"],
    spotlight:["pm-drop-step","pm-hook","pm-up-under","fin-power-layup","pm-spin"],
  },
  any: {
    label:"All-Around", emoji:"⭐",
    desc:"Balanced training across all skills.",
    boostCats:[],
    boostTags:[],
    spotlight:[],
  },
};

/* ═══════════════════════════════════════════════════════════════
   WORKOUT TEMPLATES + GENERATOR
═══════════════════════════════════════════════════════════════ */
const WORKOUT_TEMPLATES = {
  jump:      { name:"Jump Workout",      emoji:"💥", desc:"Explosive power and landing control.",     cats:["explosion","deceleration","balance"],      structure:{warmup:1,main:3,finisher:1,recovery:0}, ageMin:10 },
  quickFeet: { name:"Quick Feet",        emoji:"⚡", desc:"Foot speed, agility, and reaction time.",  cats:["speed","coordination","athletic"],          structure:{warmup:2,main:3,finisher:1,recovery:0}, ageMin:9  },
  fullBody:  { name:"Full Body Athlete", emoji:"🏃", desc:"Strength, speed, and conditioning.",       cats:["strength","conditioning","athletic"],       structure:{warmup:1,main:3,finisher:1,recovery:1}, ageMin:9  },
  recovery:  { name:"Recovery Day",      emoji:"🔄", desc:"Light movement, balance, and mobility.",   cats:["balance","coordination"],                   structure:{warmup:2,main:2,finisher:0,recovery:2}, ageMin:9  },
  handles:   { name:"Ball Handling",     emoji:"🤲", desc:"Dribbling, footwork, and court IQ.",       cats:["handles","game_handles","coordination"],    structure:{warmup:1,main:4,finisher:1,recovery:0}, ageMin:9  },
  shooting:  { name:"Shooting Session",  emoji:"🎯", desc:"Form, range, and shooting consistency.",   cats:["shooting","shooting_lab"],                  structure:{warmup:1,main:3,finisher:1,recovery:0}, ageMin:9  },
};

const SCHED_TO_TEMPLATE = { explosion:"jump",deceleration:"jump",speed:"quickFeet",coordination:"quickFeet",athletic:"quickFeet",strength:"fullBody",conditioning:"fullBody",balance:"recovery",handles:"handles",game_handles:"handles",basketball_iq:"handles",shooting:"shooting",shooting_lab:"shooting" };

function generateWorkout(settings, templateKey, recentIds=[]) {
  const tmpl = WORKOUT_TEMPLATES[templateKey];
  if (!tmpl) return null;
  const age    = Math.min(14, Math.max(9, calcAge(settings.dateOfBirth)));
  const rule   = AGE_RULES[age];
  const dRank  = {beginner:0,intermediate:1,advanced:2};
  const pRank  = dRank[settings.experience||"beginner"]??0;
  const goals  = settings.goals||[];
  const posProfile = POSITION_PROFILES[settings.playStyle||"any"] || POSITION_PROFILES.any;
  const posCats = new Set(posProfile.boostCats);
  const posTags = new Set(posProfile.boostTags);

  // Build pool from template categories, enrich with metadata
  const pool = tmpl.cats.flatMap(cat =>
    (WORKOUTS[cat]||[]).map(ex => ({ ...ex, _cat:cat, meta:EXERCISE_META[ex.id]||{} }))
  );

  // Filter: age range + difficulty (allow one level stretch for challenge)
  const eligible = pool.filter(ex => {
    const m = ex.meta;
    if (m.ageRange && age < m.ageRange[0]) return false;
    return (dRank[m.difficulty]??0) <= pRank + 1;
  });

  // Score: funScore + goal match + position fit + anti-repeat + randomness
  const scored = eligible.map(ex => {
    const m = ex.meta;
    let s = m.funScore || 5;
    if (goals.some(g => (m.basketballTransfer||[]).includes(g))) s += 2;
    if (posCats.has(ex._cat)) s += 2.5;                                          // position cat boost
    if ((m.basketballTransfer||[]).some(t => posTags.has(t))) s += 1.5;          // position tag boost
    if (age <= 11) s += (m.funScore||5) * 0.15; // weight fun more for young athletes
    if (recentIds.includes(ex.id)) s -= 4;
    s += Math.random() * 1.8;
    return { ...ex, _score:s };
  }).sort((a,b) => b._score - a._score);

  let highImpact = 0, totalSecs = 0;
  const maxSecs = rule.maxMinutes * 60 * 1.1;
  const used = new Set();
  const slots = { warmup:[], main:[], finisher:[], recovery:[] };

  const pick = (role, n, test) => {
    const out = [];
    for (const ex of scored) {
      if (out.length >= n) break;
      if (used.has(ex.id)) continue;
      const m = ex.meta, roles = m.workoutRole||[];
      if (!roles.some(r => test(r))) continue;
      if (m.impactLevel==="high") { if (highImpact >= rule.maxHighImpact) continue; highImpact++; }
      const dur = m.estimatedDuration || 90;
      if (totalSecs + dur > maxSecs) continue;
      totalSecs += dur;
      used.add(ex.id);
      out.push(ex);
    }
    return out;
  };

  slots.warmup   = pick("warmup",   tmpl.structure.warmup,   r => r==="warmup");
  slots.main     = pick("main",     tmpl.structure.main,     r => r==="main");
  slots.finisher = pick("finisher", tmpl.structure.finisher, r => r==="finisher");
  slots.recovery = pick("recovery", tmpl.structure.recovery, r => r==="recovery"||r==="warmup");

  const exercises = [
    ...slots.warmup.map(e=>({...e,role:"warmup"})),
    ...slots.main.map(e=>({...e,role:"main"})),
    ...slots.finisher.map(e=>({...e,role:"finisher"})),
    ...slots.recovery.map(e=>({...e,role:"recovery"})),
  ];

  return { templateKey, templateName:tmpl.name, templateEmoji:tmpl.emoji, templateDesc:tmpl.desc, exercises, totalSecs, generatedAt:Date.now() };
}

/* ═══════════════════════ XP + LEVELS + BADGES ═══════════════ */

const LEVELS = [
  { rank:1, name:"Rookie",       emoji:"🌱", xpMin:0,     xpNext:1000  },
  { rank:2, name:"Starter",      emoji:"⭐", xpMin:1000,  xpNext:2500  },
  { rank:3, name:"All-Star",     emoji:"🌟", xpMin:2500,  xpNext:5000  },
  { rank:4, name:"Varsity",      emoji:"🏆", xpMin:5000,  xpNext:10000 },
  { rank:5, name:"Elite Hooper", emoji:"👑", xpMin:10000, xpNext:null  },
];

function getLevel(xp) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xpMin) lv = l; }
  return lv;
}



function computeXP(completed, programProgress={}, missionLog={}) {
  let exXP=0, workoutXP=0, challengeXP=0, shotXP=0, streakXP=0, badgeXP=0, missionXP=0;

  // Exercise XP (5 per) + workout completion bonus (25 per qualifying day)
  const dayMap = {};
  for (const [k,v] of Object.entries(completed)) {
    if (!v) continue;
    const date = k.split("-").slice(0,3).join("-");
    const exId = k.split("-").slice(3).join("-");
    exXP += 5;
    if (!dayMap[date]) dayMap[date] = { count:0, cats:new Set() };
    dayMap[date].count++;
    const cat = (ALL_EXERCISES[exId]||{})._cat;
    if (cat) dayMap[date].cats.add(cat);
  }
  for (const info of Object.values(dayMap)) {
    if (info.count >= 3 && info.cats.size >= 2) workoutXP += 25;
  }

  // Challenge completion XP (100 per)
  for (const def of CHALLENGES_DEF) {
    const { cur, target } = getChallengeProgress(def, completed, WORKOUTS);
    if (cur >= target) challengeXP += 100;
  }

  // Shot XP — minimal contribution (1 XP per 50 makes)
  shotXP = Math.floor(countShotMakes(readShotLog()) / 50);

  // Badge XP (50 per earned badge) — rewards meaningful milestones
  const earnedIds = getEarnedBadges(completed, programProgress, PROGRAMS);
  badgeXP = earnedIds.length * 50;

  // Streak bonus (2 XP per consecutive day when streak ≥ 3)
  const days = [...new Set(
    Object.keys(completed).filter(k=>completed[k]).map(k=>k.split("-").slice(0,3).join("-"))
  )].sort();
  let st=0;
  for (let i=0; i<days.length; i++) {
    if (i===0) { st=1; }
    else {
      const diff=(new Date(days[i]+"T12:00:00")-new Date(days[i-1]+"T12:00:00"))/86400000;
      if(diff<=1.5) st++; else st=1;
    }
    if(st>=3) streakXP+=2;
  }

  // Mission bonus XP (claimed missions)
  for (const m of Object.values(missionLog)) {
    if (m?.claimed) missionXP += (m.bonusXP || 50);
  }

  return { total:exXP+workoutXP+challengeXP+shotXP+streakXP+badgeXP+missionXP, exXP, workoutXP, challengeXP, shotXP, streakXP, badgeXP, missionXP };
}

/* ═══════════════════════ CALENDAR DATA ══════════════════════ */

function buildCalendarData(completed) {
  const dayMap = {};

  // Group completed exercises by date
  for (const [k, v] of Object.entries(completed)) {
    if (!v) continue;
    const date  = k.split("-").slice(0,3).join("-");
    const exId  = k.split("-").slice(3).join("-");
    if (!dayMap[date]) dayMap[date] = { exs:[], cats:new Set(), shots:0 };
    const ex = ALL_EXERCISES[exId];
    if (ex) {
      dayMap[date].exs.push(ex);
      dayMap[date].cats.add(ex._cat);
    } else {
      dayMap[date].exs.push({ id:exId, name:exId, _cat:"unknown" });
    }
  }

  // Layer in shot data
  try {
    const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
    for (const [date, shots] of Object.entries(sl)) {
      const makes = (shots||[]).filter(s=>s.made!==false).length;
      if (makes === 0) continue;
      if (!dayMap[date]) dayMap[date] = { exs:[], cats:new Set(), shots:0 };
      dayMap[date].shots  = makes;
      dayMap[date].cats.add("shooting");
    }
  } catch {}

  // Compute per-day XP and finalise cats → array
  for (const [, data] of Object.entries(dayMap)) {
    data.cats      = [...data.cats];
    const exXP     = data.exs.length * 5;
    const wBonus   = data.exs.length >= 3 && data.cats.length >= 2 ? 25 : 0;
    const shotXP   = Math.floor((data.shots||0)/10) * 5;
    data.xp        = exXP + wBonus + shotXP;
    data.totalDrills = data.exs.length;
  }

  // Compute running streak per day
  const sorted = Object.keys(dayMap).sort();
  let streak = 0;
  for (let i=0; i<sorted.length; i++) {
    if (i===0) { streak=1; }
    else {
      const diff=(new Date(sorted[i]+"T12:00:00")-new Date(sorted[i-1]+"T12:00:00"))/86400000;
      if(diff<=1.5) streak++; else streak=1;
    }
    dayMap[sorted[i]].streakDay = streak;
  }

  return dayMap;
}

/* ═══════════════════════ BENEFIT MAP ════════════════════════ */
// Maps basketballTransfer ids → user-facing labels for the detail view
const BENEFIT_MAP = {
  jumping:       { label:"Jump Higher",        emoji:"💥" },
  quickness:     { label:"Quicker First Step", emoji:"⚡" },
  defense:       { label:"Better Defense",     emoji:"🛡" },
  cutting:       { label:"Sharper Cuts",       emoji:"🔪" },
  "first-step":  { label:"Explosive First Step",emoji:"⚡"},
  landing:       { label:"Safe Landings",      emoji:"🛑" },
  footwork:      { label:"Elite Footwork",     emoji:"👟" },
  stability:     { label:"Solid Balance",      emoji:"🎯" },
  strength:      { label:"Body Strength",      emoji:"💪" },
  conditioning:  { label:"Game Fitness",       emoji:"🔥" },
  speed:         { label:"Top Speed",          emoji:"💨" },
  rebounding:    { label:"Grab More Boards",   emoji:"🏀" },
  reaction:      { label:"React Faster",       emoji:"⚡" },
  all:           { label:"Complete Athlete",   emoji:"🏃" },
  shooting:      { label:"Better Shooting",    emoji:"🎯" },
  power:         { label:"Explosive Power",    emoji:"💥" },
  explosion:     { label:"Pure Explosion",     emoji:"💥" },
  safety:        { label:"Stay Healthy",       emoji:"🛡" },
  sprinting:     { label:"Sprint Faster",      emoji:"💨" },
  running:       { label:"Better Running",     emoji:"🏃" },
};

// Flat lookup: exerciseId → { ...exercise, _cat, meta }
const ALL_EXERCISES = Object.fromEntries(
  Object.entries(WORKOUTS).flatMap(([cat, exs]) =>
    exs.map(ex => [ex.id, { ...ex, _cat:cat, meta:EXERCISE_META[ex.id]||{} }])
  )
);

function buildCoachMessage(completed, xpData, earnedBadges, programProgress) {
  const todayKey = new Date().toLocaleDateString("en-CA");
  const streak = (() => {
    let s = 0, d = new Date();
    for (let i = 0; i < 60; i++) {
      const k = d.toLocaleDateString("en-CA");
      if (Object.keys(completed).some(c => c.startsWith(k) && completed[c])) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  })();
  const nextLv = LEVELS.find(l => l.xpMin > xpData.total) || null;
  const xpLeft = nextLv ? nextLv.xpMin - xpData.total : 0;
  const allUnearned = BADGES_DEF.filter(b => !earnedBadges.includes(b.id))
    .map(b => { const { cur, target } = getBadgeProgress(b, completed, programProgress, PROGRAMS); return { ...b, cur, target, pct: cur / target }; })
    .sort((a, b) => b.pct - a.pct || a.target - b.target);
  const nextBadge = allUnearned[0] || null;
  const doneToday = Object.keys(completed).filter(k => k.startsWith(todayKey) && completed[k]).length;

  const bballGapCheck = [
    { key:"game_handles", label:"Game Handles" }, { key:"footwork_lab", label:"Footwork Lab" },
    { key:"finishing_school", label:"Finishing School" }, { key:"shooting_lab", label:"Shooting Lab" },
    { key:"post_moves", label:"Post Moves" }, { key:"basketball_iq", label:"Basketball IQ" },
  ];
  let gapCat = null;
  const nowMs = Date.now();
  for (const { key, label } of bballGapCheck) {
    const ids = new Set((WORKOUTS[key] || []).map(e => e.id));
    const lastMs = Object.keys(completed).filter(k => completed[k] && [...ids].some(id => k.includes(id)))
      .map(k => new Date(k.split("-").slice(0, 3).join("-") + "T12:00:00").getTime()).sort((a, b) => b - a)[0] || 0;
    if ((nowMs - lastMs) / 86400000 >= 7) { gapCat = label; break; }
  }

  const closeChallenge = CHALLENGES_DEF
    .map(def => { const { cur, target } = getChallengeProgress(def, completed, WORKOUTS); return { ...def, cur, target, pct: cur / target }; })
    .filter(c => c.pct < 1 && c.pct >= 0.6).sort((a, b) => b.pct - a.pct)[0] || null;

  const catDoneCount = (keys) => keys.flatMap(k => (WORKOUTS[k] || []).filter(e => Object.keys(completed).some(c => completed[c] && c.includes(e.id)))).length;
  const handlesDone = catDoneCount(["handles", "game_handles", "ballhandling"]);
  const shootingDone = catDoneCount(["shooting", "shooting_lab", "shootingdrills"]);
  let balanceMsg = null;
  if (handlesDone >= 3 && shootingDone < 2) balanceMsg = "Your ball handling is ahead — get some shooting reps to balance your game. 🎯";
  else if (shootingDone >= 3 && handlesDone < 2) balanceMsg = "Your shooting is ahead — your weak-hand development needs attention. 🤲";

  if (streak >= 3 && doneToday === 0) return `Keep your ${streak}-day streak alive — train today! 🔥`;
  if (doneToday === 0 && streak === 0) return "Every champion started at zero. Let's get your first rep in. 🏀";
  if (nextBadge && nextBadge.target - nextBadge.cur === 1) return `One more and you unlock the ${nextBadge.name} badge! 🏆`;
  if (nextLv && xpLeft <= 20) return `Only ${xpLeft} XP away from ${nextLv.name}. Finish strong! 🌟`;
  if (closeChallenge) return `Only ${closeChallenge.target - closeChallenge.cur} more to complete ${closeChallenge.name}. 🎯`;
  if (gapCat && doneToday === 0) return `You haven't trained ${gapCat} in a week — today's the day. 🏀`;
  if (balanceMsg) return balanceMsg;
  if (doneToday >= 3) return `${doneToday} drills today — you're locked in. Keep stacking! 🔥`;
  if (doneToday >= 1) return "Good start today. One more session makes the difference. 💪";
  return "Stay consistent. Every rep builds the player you're becoming. 📈";
}

function searchExercises(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return Object.values(ALL_EXERCISES).filter(ex => {
    const hay = `${ex.name} ${ex.tag || ""} ${ex.desc || ""} ${CATS[ex._cat]?.label || ""} ${ex.trainer || ""}`.toLowerCase();
    return hay.includes(q);
  }).slice(0, limit);
}

/* ═══════════════════════ TRAINING PROGRAMS ═════════════════ */

const PROGRAMS = [
  {
    id:"jump-higher", name:"Jump Higher", emoji:"⬆️", color:"#f97316",
    badgeId:"pgm-jump-higher", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"A 4-week plyometric plan to add inches to your vertical and build explosive first-step power.",
    weeks:[
      { week:1, goal:"Build ankle stiffness and landing control — the foundation of every jump.",
        sessions:[
          { day:"Session 1", focus:"Elasticity Foundation",  exercises:["pogo-jumps","lateral-line-hops","depth-drop"] },
          { day:"Session 2", focus:"Single-Leg Control",     exercises:["sl-hold","sl-squat","sl-stick-landing"] },
          { day:"Session 3", focus:"Power Introduction",     exercises:["squat-jumps","snap-downs","broad-jump-stick"] },
        ]},
      { week:2, goal:"Develop horizontal and lateral power while reinforcing landing mechanics.",
        sessions:[
          { day:"Session 1", focus:"Reactive Elasticity",    exercises:["reactive-pogos","lateral-line-hops","single-leg-hops"] },
          { day:"Session 2", focus:"Lateral Power",          exercises:["lateral-bounds-pjf","lat-skater-hops","lateral-stick-landing"] },
          { day:"Session 3", focus:"Power Development",      exercises:["tuck-jumps","broad-jump-stick-dec","pogo-tutorial"] },
        ]},
      { week:3, goal:"Reactive power and stretch-shortening cycle training — where vertical gains come from.",
        sessions:[
          { day:"Session 1", focus:"Reactive Training",      exercises:["drop-jump","pogo-to-tuck","single-leg-pogo"] },
          { day:"Session 2", focus:"Combo Power",            exercises:["power-bounds-series","broad-bounds-sprint","lat-skater-hops"] },
          { day:"Session 3", focus:"Full Plyometric",        exercises:["vj-progression","snap-down-prog","lateral-bounds-pjf"] },
        ]},
      { week:4, goal:"Peak power expression — max effort on every rep. Measure your vertical this week.",
        sessions:[
          { day:"Session 1", focus:"Max Vertical",           exercises:["drop-jump","squat-jumps","pogo-to-tuck"] },
          { day:"Session 2", focus:"Full Expression",        exercises:["full-plyo-workout","single-leg-pogo","broad-bounds-sprint"] },
          { day:"Session 3", focus:"Peak Performance",       exercises:["dunk-training","vj-progression","lateral-line-hops"] },
        ]},
    ],
  },

  {
    id:"guard-handles", name:"Handle Like a Guard", emoji:"🎮", color:"#06b6d4",
    badgeId:"pgm-guard-handles", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"Build elite ball-handling skills from stationary foundation through full game-speed combo moves.",
    weeks:[
      { week:1, goal:"Master the foundation — ball feel, weak hand, and basic stationary control.",
        sessions:[
          { day:"Session 1", focus:"Ball Control",           exercises:["bh-pound","gh-stationary-cross","weak-hand"] },
          { day:"Session 2", focus:"Hand-Eye",               exercises:["tennis-dribble","tennis-wall","bh-in-out"] },
          { day:"Session 3", focus:"Foundation Review",      exercises:["bh-pound","bh-crossover","gh-change-pace"] },
        ]},
      { week:2, goal:"Learn the core change-of-direction moves — crossover, between legs, and change of pace.",
        sessions:[
          { day:"Session 1", focus:"Crossover Mastery",      exercises:["bh-crossover","gh-stationary-cross","gh-cross-btl"] },
          { day:"Session 2", focus:"Advanced Moves",         exercises:["bh-btl","gh-change-pace","two-ball"] },
          { day:"Session 3", focus:"Combo Foundation",       exercises:["bh-crossover","bh-in-out","sackmann-hesi"] },
        ]},
      { week:3, goal:"Add behind-the-back, hesitation, and two-ball coordination.",
        sessions:[
          { day:"Session 1", focus:"Behind the Back",        exercises:["gh-behind-back","bh-btl","relph-twoball"] },
          { day:"Session 2", focus:"Hesitation Game",        exercises:["sackmann-hesi","bh-retreat","gh-change-pace"] },
          { day:"Session 3", focus:"Advanced Coordination",  exercises:["two-ball","relph-twoball","bh-combo"] },
        ]},
      { week:4, goal:"Game-speed combos, driving attacks, and defeating defenders.",
        sessions:[
          { day:"Session 1", focus:"Attack Moves",           exercises:["bh-attack-cross","gh-dribble-drive","bh-retreat"] },
          { day:"Session 2", focus:"Combo Sequences",        exercises:["bh-combo","gethandles-combo","sackmann-hesi"] },
          { day:"Session 3", focus:"Full Guard Skills",      exercises:["gh-dribble-drive","bh-attack-cross","bh-combo"] },
        ]},
    ],
  },

  {
    id:"step-back-legends", name:"Step Back Legends", emoji:"↩️", color:"#7c3aed",
    badgeId:"pgm-step-back-legends", duration:2, daysPerWeek:3, ageRange:[10,17],
    desc:"Three levels — hop balance, dribble separation, drive-and-step — built for the Step-Back legend path.",
    weeks:[
      { week:1, goal:"Levels 1 & 2 — hop back on one foot, then dribble step-back separation.",
        sessions:[
          { day:"Session 1", focus:"Level 1 — Hop & Land",     exercises:["sb-hop-shoot","sh-form","sh-one-hand"] },
          { day:"Session 2", focus:"Level 2 — Dribble Step",   exercises:["sb-dribble-step","sb-hop-shoot","slab-elbow"] },
          { day:"Session 3", focus:"Combine L1 + L2",            exercises:["sb-hop-shoot","sb-dribble-step","sh-beat-pro"] },
        ]},
      { week:2, goal:"Level 3 — game-speed drive into step-back, then run the full chain.",
        sessions:[
          { day:"Session 1", focus:"Level 3 — Drive & Step",   exercises:["sb-drive-step","sb-dribble-step","sh-jab-reset"] },
          { day:"Session 2", focus:"Full 3-Level Chain",       exercises:["sb-hop-shoot","sb-dribble-step","sb-drive-step"] },
          { day:"Session 3", focus:"Compete & Log",            exercises:["sb-drive-step","sh-beat-pro","slab-step-back"] },
        ]},
    ],
  },

  {
    id:"become-shooter", name:"Become a Shooter", emoji:"🎯", color:"#8b5cf6",
    badgeId:"pgm-become-shooter", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"Fix your mechanics, build shot consistency, and earn the reputation as the player who never misses.",
    weeks:[
      { week:1, goal:"Lock in your shooting mechanics — form shooting, wrist, and free throw routine.",
        sessions:[
          { day:"Session 1", focus:"BEEF Mechanics",         exercises:["sh-form","sh-one-hand","sh-knee-roll"] },
          { day:"Session 2", focus:"Free Throws",            exercises:["slab-ft-routine","sh-ft-routine","sh-hop-shot"] },
          { day:"Session 3", focus:"Catch & Shoot",          exercises:["slab-catch-shoot","sh-form","sh-atw"] },
        ]},
      { week:2, goal:"Extend range and build volume shooting from game spots.",
        sessions:[
          { day:"Session 1", focus:"Spot Shooting",          exercises:["sh-spot","sh-atw","slab-catch-shoot"] },
          { day:"Session 2", focus:"Screen Actions",         exercises:["slab-curl-cut","sh-hop-shot","slab-ft-routine"] },
          { day:"Session 3", focus:"Pressure Reps",          exercises:["sh-beat-pro","sh-spot","sh-atw"] },
        ]},
      { week:3, goal:"Off-the-dribble shooting — pull-ups, mid-range, and game-like situations.",
        sessions:[
          { day:"Session 1", focus:"Pull-Up Game",           exercises:["slab-pullup","slab-elbow","sh-jab-reset"] },
          { day:"Session 2", focus:"Mid-Range",              exercises:["slab-elbow","sh-beat-pro","slab-pullup"] },
          { day:"Session 3", focus:"Game Shots",             exercises:["sh-jab-reset","slab-curl-cut","sh-single-leg"] },
        ]},
      { week:4, goal:"Separation shots, corner threes, and step-backs — the complete shooting game.",
        sessions:[
          { day:"Session 1", focus:"Range Extension",        exercises:["slab-corner-3","sb-drive-step","sh-spot"] },
          { day:"Session 2", focus:"Step Back Legends",    exercises:["sb-hop-shoot","sb-dribble-step","sb-drive-step"] },
          { day:"Session 3", focus:"Compete",                exercises:["sh-beat-pro","slab-corner-3","sb-drive-step"] },
        ]},
    ],
  },

  {
    id:"first-step-explosion", name:"First Step Explosion", emoji:"⚡", color:"#f43f5e",
    badgeId:"pgm-first-step", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"Build the footwork, pivots, and finishing moves that let you attack the basket with confidence every possession.",
    weeks:[
      { week:1, goal:"Establish the movement foundation — triple threat, jump stop, and basic finishing.",
        sessions:[
          { day:"Session 1", focus:"Triple Threat & Jump Stop", exercises:["fw-jump-stop","fw-triple-threat","flab-triple-threat"] },
          { day:"Session 2", focus:"Layup Foundation",          exercises:["fin-power-layup","fin-mikan","fs-power-finish"] },
          { day:"Session 3", focus:"First Steps",               exercises:["fw-triple-threat","fw-jab-series","flab-jab-series"] },
        ]},
      { week:2, goal:"Pivot mastery and reverse finishing — create angles the defense can't cover.",
        sessions:[
          { day:"Session 1", focus:"Pivot Work",              exercises:["fw-front-pivot","fw-rev-pivot","fin-rev-mikan"] },
          { day:"Session 2", focus:"Reverse Finishing",       exercises:["fin-reverse","fs-hop-step","fin-rev-mikan"] },
          { day:"Session 3", focus:"Jab Series",              exercises:["fw-jab-series","flab-jab-series","fin-mikan"] },
        ]},
      { week:3, goal:"Rip through, shot fakes, and step-through moves — counter every defender.",
        sessions:[
          { day:"Session 1", focus:"Rip & Drive",             exercises:["fw-rip-through","fw-sweep-go","flab-shot-fake"] },
          { day:"Session 2", focus:"Shot Fakes",              exercises:["flab-shot-fake","flab-step-through","fw-shot-fake"] },
          { day:"Session 3", focus:"Counter Moves",           exercises:["fw-sweep-go","fin-euro","fs-contact-finish"] },
        ]},
      { week:4, goal:"Advanced finishes and full-speed integration — score from anywhere in the paint.",
        sessions:[
          { day:"Session 1", focus:"Advanced Finishes",       exercises:["fin-floater","fin-euro","fin-pro-hop"] },
          { day:"Session 2", focus:"Elite Moves",             exercises:["fin-wrong-foot","fin-floater","flab-rocker-step"] },
          { day:"Session 3", focus:"Complete Attack",         exercises:["fin-pro-hop","fin-euro","sackmann-finish"] },
        ]},
    ],
  },

  {
    id:"complete-hooper", name:"Complete Hooper", emoji:"🏆", color:"#f59e0b",
    badgeId:"pgm-complete-hooper", duration:6, daysPerWeek:4, ageRange:[10,17],
    desc:"The full development system — 6 weeks covering handles, footwork, finishing, shooting, post play, and basketball IQ.",
    weeks:[
      { week:1, goal:"Foundation week — ball control, triple threat, shot mechanics, and athletic base.",
        sessions:[
          { day:"Session 1", focus:"Ball Handling Base",     exercises:["bh-pound","gh-stationary-cross","weak-hand"] },
          { day:"Session 2", focus:"Shooting Mechanics",     exercises:["sh-form","sh-one-hand","slab-ft-routine"] },
          { day:"Session 3", focus:"Footwork Foundation",    exercises:["fw-jump-stop","fw-triple-threat","fin-power-layup"] },
          { day:"Session 4", focus:"Athletic Base",          exercises:["pogo-jumps","squat-jumps","sl-hold"] },
        ]},
      { week:2, goal:"Expand your arsenal — add moves in all skill areas simultaneously.",
        sessions:[
          { day:"Session 1", focus:"Crossover & Drives",     exercises:["bh-crossover","bh-in-out","gh-change-pace"] },
          { day:"Session 2", focus:"Spot Shooting",          exercises:["sh-spot","slab-catch-shoot","sh-hop-shot"] },
          { day:"Session 3", focus:"Pivots & Layups",        exercises:["fw-front-pivot","fw-rev-pivot","fin-mikan"] },
          { day:"Session 4", focus:"Explosion",              exercises:["single-leg-hops","lateral-bounds-pjf","snap-downs"] },
        ]},
      { week:3, goal:"Intermediate skill week — game-like reps in handles, shooting, and IQ.",
        sessions:[
          { day:"Session 1", focus:"Intermediate Handles",   exercises:["bh-btl","gh-cross-btl","sackmann-hesi"] },
          { day:"Session 2", focus:"Off-Dribble Shooting",   exercises:["slab-pullup","slab-elbow","sh-beat-pro"] },
          { day:"Session 3", focus:"Attack Moves",           exercises:["fw-jab-series","flab-shot-fake","fin-euro"] },
          { day:"Session 4", focus:"Court Vision",           exercises:["iq-closeout","iq-shot-drive","iq-spacing"] },
        ]},
      { week:4, goal:"Advanced moves — step back, combo handles, post plays, and defensive reads.",
        sessions:[
          { day:"Session 1", focus:"Advanced Handles",       exercises:["gh-behind-back","bh-attack-cross","gethandles-combo"] },
          { day:"Session 2", focus:"Advanced Shooting",      exercises:["sh-jab-reset","slab-step-back","slab-corner-3"] },
          { day:"Session 3", focus:"Post Fundamentals",      exercises:["pm-seal","pm-drop-step","pm-hook"] },
          { day:"Session 4", focus:"Defensive IQ",           exercises:["iq-help-side","iq-read-def","iq-transition"] },
        ]},
      { week:5, goal:"Combo sequences and situational scoring — put it all together.",
        sessions:[
          { day:"Session 1", focus:"Handle Combos",          exercises:["bh-combo","relph-twoball","gh-dribble-drive"] },
          { day:"Session 2", focus:"Full Shooting",          exercises:["slab-step-back","sh-single-leg","sh-beat-pro"] },
          { day:"Session 3", focus:"Advanced Post",          exercises:["pm-up-under","pm-spin","pm-face-up"] },
          { day:"Session 4", focus:"Finishing School",        exercises:["fin-floater","fin-pro-hop","fin-wrong-foot"] },
        ]},
      { week:6, goal:"Peak week — compete at full speed in every area. You're a Complete Hooper.",
        sessions:[
          { day:"Session 1", focus:"Elite Handles",          exercises:["bh-combo","gethandles-combo","sackmann-hesi"] },
          { day:"Session 2", focus:"Shot Creation",          exercises:["slab-step-back","sh-jab-reset","slab-corner-3"] },
          { day:"Session 3", focus:"Post Game",              exercises:["pm-saddi-combo","pm-step-through","pm-face-up"] },
          { day:"Session 4", focus:"Full Integration",       exercises:["iq-closeout","fin-floater","bh-combo"] },
        ]},
    ],
  },

  {
    id:"bodyweight-beast", name:"Bodyweight Beast", emoji:"💪", color:"#22c55e",
    badgeId:"pgm-bodyweight", duration:3, daysPerWeek:3, ageRange:[9,15],
    desc:"No hoop, no weights, no problem. A 3-week full-body program you can do anywhere — get stronger, springier, and tougher using just your bodyweight.",
    weeks:[
      { week:1, goal:"Build the foundation — master clean bodyweight form before adding speed.",
        sessions:[
          { day:"Session 1", focus:"Lower Body & Core",  exercises:["bw-squats","glute-bridge","plank-hold"] },
          { day:"Session 2", focus:"Upper Body & Core",  exercises:["pushup","tricep-dips","dead-bug"] },
          { day:"Session 3", focus:"Full-Body Holds",    exercises:["wall-sit","push-shoulder-taps","v-ups"] },
        ]},
      { week:2, goal:"Add power — start jumping and landing with control.",
        sessions:[
          { day:"Session 1", focus:"Legs & Plyo",        exercises:["reverse-lunge","jump-lunge","skater-jumps"] },
          { day:"Session 2", focus:"Push & Core",        exercises:["pushup","tricep-dips","hollow-hold"] },
          { day:"Session 3", focus:"Power Circuit",      exercises:["squat-jumps","broad-jump","v-ups"] },
        ]},
      { week:3, goal:"Put it all together — full-speed power, strength, and core.",
        sessions:[
          { day:"Session 1", focus:"Lower Power",        exercises:["jump-lunge","skater-jumps","wall-sit"] },
          { day:"Session 2", focus:"Upper & Core",       exercises:["pushup","tricep-dips","side-plank"] },
          { day:"Session 3", focus:"Beast Circuit",      exercises:["broad-jump","jump-lunge","v-ups"] },
        ]},
    ],
  },
];

/* ═══════════════════════ PROGRESS REPORT ════════════════════ */

function computePeriodXP(periodEntries) {
  // periodEntries = [[key, true], ...] filtered to a date range
  const dayMap = {};
  let exXP = 0;
  for (const [k] of periodEntries) {
    exXP += 5;
    const date = k.split("-").slice(0,3).join("-");
    const exId = k.split("-").slice(3).join("-");
    if (!dayMap[date]) dayMap[date] = { count:0, cats:new Set() };
    dayMap[date].count++;
    const cat = ALL_EXERCISES[exId]?._cat;
    if (cat) dayMap[date].cats.add(cat);
  }
  let workoutXP = 0;
  for (const info of Object.values(dayMap)) {
    if (info.count >= 3 && info.cats.size >= 2) workoutXP += 25;
  }
  return exXP + workoutXP;
}

function buildReport(period, completed, badgeDatesMap, enrolledPrograms, favorites, programProgress={}) {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA");
  const periodStart = period==="7d"
    ? new Date(now.getTime()-7*86400000).toLocaleDateString("en-CA")
    : period==="30d"
    ? new Date(now.getTime()-30*86400000).toLocaleDateString("en-CA")
    : "2000-01-01";
  const inPeriod = d => d>=periodStart && d<=todayStr;

  // Period-filtered completed entries
  const periodEntries = Object.entries(completed).filter(([k,v])=>{
    if (!v) return false;
    return inPeriod(k.split("-").slice(0,3).join("-"));
  });

  // Group by date
  const dayExMap = {};
  for (const [k] of periodEntries) {
    const date = k.split("-").slice(0,3).join("-");
    const exId = k.split("-").slice(3).join("-");
    if (!dayExMap[date]) dayExMap[date] = [];
    dayExMap[date].push(exId);
  }

  const trainingDays = Object.keys(dayExMap).length;
  const totalExercises = periodEntries.length;
  const totalMinutes = periodEntries.reduce((sum,[k])=>{
    const ex = ALL_EXERCISES[k.split("-").slice(3).join("-")];
    return sum + Math.round((ex?.meta?.estimatedDuration||180)/60);
  }, 0);

  // Shots
  let shotTotal=0, shotBestDay=0, shotBestDayDate=null;
  const shotDayTotals = {};
  try {
    const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
    for (const [date, shots] of Object.entries(sl)) {
      if (!inPeriod(date)) continue;
      const makes = (shots||[]).filter(s=>s.made!==false).length;
      shotTotal += makes;
      shotDayTotals[date] = (shotDayTotals[date]||0) + makes;
    }
    for (const [date, count] of Object.entries(shotDayTotals)) {
      if (count>shotBestDay) { shotBestDay=count; shotBestDayDate=date; }
    }
  } catch {}
  const shotActiveDays = Object.keys(shotDayTotals).filter(d=>shotDayTotals[d]>0).length;
  const shotAverage = shotActiveDays>0 ? Math.round(shotTotal/shotActiveDays) : 0;

  // Streaks
  const allDays = [...new Set(
    Object.entries(completed).filter(([,v])=>v).map(([k])=>k.split("-").slice(0,3).join("-"))
  )].sort();
  let currentStreak=0;
  { let d=new Date(now); for(let i=0;i<365;i++){const k=d.toLocaleDateString("en-CA"); if(allDays.includes(k)){currentStreak++;d.setDate(d.getDate()-1);}else break;} }
  const periodDays = allDays.filter(d=>inPeriod(d));
  let longestStreak=0, stk=0;
  for(let i=0;i<periodDays.length;i++){
    if(i===0){stk=1;}else{const diff=(new Date(periodDays[i]+"T12:00:00")-new Date(periodDays[i-1]+"T12:00:00"))/86400000; if(diff<=1.5)stk++;else stk=1;}
    longestStreak=Math.max(longestStreak,stk);
  }

  // Categories
  const REPORT_CATS = [
    {key:"ballhandling",  label:"Ball Handling Foundations",emoji:"🤲"},
    {key:"game_handles",  label:"Game Handles",            emoji:"🎮"},
    {key:"footwork_lab",  label:"Footwork Lab",            emoji:"👟"},
    {key:"finishing_school",label:"Finishing School",      emoji:"🏁"},
    {key:"finishing",     label:"Finishing",               emoji:"🏀"},
    {key:"shooting_lab",  label:"Shooting Lab",            emoji:"🎯"},
    {key:"postmoves",     label:"Post Moves",              emoji:"🏋️"},
    {key:"basketball_iq", label:"Basketball IQ",           emoji:"🧠"},
  ];
  const catCounts = {};
  for(const [k] of periodEntries){
    const cat = ALL_EXERCISES[k.split("-").slice(3).join("-")]?._cat;
    if(cat) catCounts[cat]=(catCounts[cat]||0)+1;
  }
  const categories = REPORT_CATS.map(c=>({
    ...c, count:catCounts[c.key]||0,
    pct: totalExercises>0 ? Math.round(((catCounts[c.key]||0)/totalExercises)*100) : 0,
  }));

  // Period XP
  const periodXP = computePeriodXP(periodEntries);

  // Badges earned in period
  const badgesInPeriod = Object.entries(badgeDatesMap)
    .filter(([,date])=>inPeriod(date))
    .map(([id])=>BADGES_DEF.find(b=>b.id===id))
    .filter(Boolean);

  // Completed programs (all time — no timestamp available)
  const completedPrograms = PROGRAMS.filter(p=>computeProgramProgress(p, programProgress||{})>=1);

  // Completed challenges (all time)
  const completedChallenges = CHALLENGES_DEF.filter(def=>{
    const {cur,target}=getChallengeProgress(def,completed,WORKOUTS); return cur>=target;
  });

  // Most completed exercise (all time)
  const exCounts = {};
  for(const [k,v] of Object.entries(completed)){
    if(!v) continue;
    const exId=k.split("-").slice(3).join("-");
    exCounts[exId]=(exCounts[exId]||0)+1;
  }
  const mostCompletedId = Object.entries(exCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const mostCompleted = mostCompletedId ? {...(ALL_EXERCISES[mostCompletedId]||{}), count:exCounts[mostCompletedId]} : null;

  // Most completed in period
  const periodExCounts = {};
  for(const [k] of periodEntries){
    const exId=k.split("-").slice(3).join("-");
    periodExCounts[exId]=(periodExCounts[exId]||0)+1;
  }
  const periodMostId = Object.entries(periodExCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const periodMostCompleted = periodMostId ? {...(ALL_EXERCISES[periodMostId]||{}), count:periodExCounts[periodMostId]} : null;

  // Starred favorites
  const favExId = Object.entries(favorites.exercises||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const favWorkoutKey = Object.entries(favorites.workouts||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const favProgId = Object.entries(favorites.programs||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];

  return {
    period, periodStart,
    training:{ days:trainingDays, exercises:totalExercises, minutes:totalMinutes },
    shots:{ total:shotTotal, average:shotAverage, bestDay:shotBestDay, bestDayDate:shotBestDayDate },
    streaks:{ current:currentStreak, longest:longestStreak, days:trainingDays },
    periodXP,
    categories,
    badges:badgesInPeriod,
    completedPrograms,
    completedChallenges,
    mostCompleted,
    periodMostCompleted,
    favExercise: favExId ? ALL_EXERCISES[favExId] : null,
    favWorkout: favWorkoutKey ? WORKOUT_TEMPLATES[favWorkoutKey] : null,
    favProgram: favProgId ? PROGRAMS.find(p=>p.id===favProgId) : null,
  };
}

function generateInsights(report, period, currentLevel) {
  const pLabel = period==="7d"?"week":period==="30d"?"month":"all time";
  const insights = [];
  const activeCats = [...report.categories].filter(c=>c.count>0).sort((a,b)=>b.count-a.count);

  if(activeCats.length>0) insights.push(`Your strongest area this ${pLabel} was ${activeCats[0].label}. ${activeCats[0].emoji}`);
  if(activeCats.length>=2){
    const ratio=Math.round(activeCats[0].count/activeCats[activeCats.length-1].count);
    if(ratio>=2) insights.push(`You trained ${activeCats[0].label} ${ratio}× more than ${activeCats[activeCats.length-1].label}. 📊`);
  }
  if(report.streaks.current>=3) insights.push(`You're on a ${report.streaks.current}-day streak — keep stacking! 🔥`);
  else if(report.streaks.longest>=3) insights.push(`Your longest streak this ${pLabel} was ${report.streaks.longest} days. Build on that. 🔥`);
  if(report.shots.total>=50) insights.push(`You made ${report.shots.total.toLocaleString()} shots this ${pLabel}. ${report.shots.bestDay>0?`Best day: ${report.shots.bestDay} makes.`:""} 🎯`);
  if(report.completedPrograms.length>0) insights.push(`You completed the ${report.completedPrograms[0].name} program — ${report.completedPrograms[0].emoji}`);
  if(period==="7d"&&report.training.days>0) insights.push(`You trained ${report.training.days} out of 7 days this week. 📅`);
  else if(period==="30d"&&report.training.days>=3){
    const avg=Math.round(report.training.days/4.3);
    insights.push(`You averaged ${avg} training session${avg!==1?"s":""} per week this month. 📅`);
  }
  if(report.periodXP>=100) insights.push(`You earned ${report.periodXP} XP this ${pLabel}. ⭐`);
  if(report.training.exercises===0) insights.push(`No training logged this ${pLabel} yet — every journey starts with one drill. 🏀`);

  return insights.slice(0,3);
}

/* ═══════════════════════ DAILY MISSION SYSTEM ══════════════ */

const MAX_DAILY_MISSION_TASKS = 5;

/**
 * Deterministically generates one mission per day based on user state.
 * Priority: active program → underworked skill category → day-of-week rotation.
 * Capped at MAX_DAILY_MISSION_TASKS — no unlimited stacking.
 */
function generateDailyMission(todayStr, settings, completed, enrolledPrograms, programProgress={}) {
  const age = calcAge(settings.dateOfBirth);
  const cutoff = new Date(Date.now()-3*86400000).toLocaleDateString("en-CA");
  const recentCats = new Set(
    Object.keys(completed)
      .filter(k=>{ const d=k.split("-").slice(0,3).join("-"); return d>=cutoff&&completed[k]; })
      .map(k=>ALL_EXERCISES[k.split("-").slice(3).join("-")]?._cat)
      .filter(Boolean)
  );

  const tasks = [];
  let title = "Daily Training";
  let bonusXP = 50;

  /* ── Due program session(s) — all enrolled plans due today, strength before skill ── */
  const enrolledList = PROGRAMS.filter(p => enrolledPrograms[p.id]);
  const dueEntries = [];
  for (const prog of enrolledList) {
    const enrollment = enrolledPrograms[prog.id];
    const due = findDueProgramSession(prog, enrollment, programProgress, todayStr);
    if (due) dueEntries.push({ prog, due });
  }
  const sortedDue = sortDueProgramEntries(dueEntries);
  let task1Cat = null;
  if (sortedDue.length > 0) {
    title = missionTitleForDuePrograms(sortedDue);
    task1Cat = ALL_EXERCISES[sortedDue[0].due.session.exercises[0]]?._cat || null;
    bonusXP = sortedDue.length > 1 ? 100 : 75;
    for (const { prog, due } of sortedDue) {
      const { session, sessionIdx, week } = due;
      tasks.push({
        id: `task-prog-${prog.id}`,
        type: "program",
        label: `${prog.emoji} ${prog.name}: ${session.focus}`,
        kind: getProgramKind(prog.id),
        kindLabel: programKindLabel(prog.id),
        exercises: session.exercises,
        target: session.exercises.length,
        required: true,
        programId: prog.id,
        week,
        sessionIdx,
        programColor: prog.color,
      });
    }
    if (sortedDue.length === 1) {
      const dayIdx = weekdayIndexFromDate(todayStr);
      const dayPlan = SCHEDULE[dayIdx];
      if (dayPlan?.cats?.length) {
        const scheduleExs = scheduleCategoryExerciseIds(dayPlan, WORKOUTS, 2, 6);
        if (scheduleExs.length > 0) {
          tasks.push({
            id: "task-schedule",
            type: "category",
            label: `Also today: ${dayPlan.label}`,
            exercises: scheduleExs,
            target: Math.min(3, scheduleExs.length),
            required: false,
            optional: true,
          });
        }
      }
    }
  }
  if (tasks.length===0) {
    const bbCats = ["ballhandling","footwork","finishing","game_handles","shooting_lab","footwork_lab","shootingdrills","passing","rebounding"];
    const daySeed = new Date(todayStr+"T12:00:00").getDay();
    const underworked = bbCats.find(c=>!recentCats.has(c));
    const fallbackCat = underworked || bbCats[daySeed % bbCats.length];
    const catExs = (WORKOUTS[fallbackCat]||[]).slice(0,3).map(e=>e.id);
    const catInfo = CATS[fallbackCat]||{label:fallbackCat,emoji:"🏀"};
    title = `${catInfo.emoji} ${catInfo.label} Day`;
    task1Cat = fallbackCat;
    tasks.push({
      id:"task-workout", type:"category",
      label:`Complete 3 ${catInfo.label} exercises`,
      exercises: catExs,
      target: Math.min(3, catExs.length),
      required: true,
      category: fallbackCat,
    });
  }

  /* ── Task 2: Complementary skill (skip when following a program — keep mission lean) ── */
  const hasProgramTask = tasks.some(t => t.type === "program");
  if (!hasProgramTask) {
    const skillCats = ["ballhandling","footwork","finishing","game_handles","basketball_iq","shooting_lab","footwork_lab","shootingdrills","postmoves","passing","rebounding"];
    const dayOffset = new Date(todayStr+"T12:00:00").getDay();
    const available = skillCats.filter(c=>c!==task1Cat&&(WORKOUTS[c]||[]).length>=2);
    const skillCat = available.find(c=>!recentCats.has(c)) || available[(dayOffset+1)%available.length];
    if (skillCat) {
      const catExs = (WORKOUTS[skillCat]||[]).slice(0,2).map(e=>e.id);
      const catInfo = CATS[skillCat]||{label:skillCat,emoji:"🏀"};
      tasks.push({
        id:"task-skill", type:"category",
        label:`Do 2 ${catInfo.label} exercises`,
        exercises: catExs,
        target: 2,
        required: true,
        category: skillCat,
      });
    }
  }

  /* ── Task 3: Optional shot goal (age-scaled) ── */
  const shotTarget = age>=13 ? 50 : age>=11 ? 25 : 15;
  tasks.push({
    id:"task-shots", type:"shots",
    label:`Make ${shotTarget} shots`,
    target: shotTarget,
    required: false,
    optional: true,
  });

  return { date:todayStr, title, tasks: tasks.slice(0, MAX_DAILY_MISSION_TASKS), bonusXP };
}

/** Live progress for a single mission task. */
function getMissionTaskProgress(task, completed, todayStr, programProgress={}) {
  if (task.type==="shots") {
    try {
      const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
      const makes = (sl[todayStr]||[]).filter(s=>s.made!==false).length;
      return { cur:makes, target:task.target };
    } catch { return { cur:0, target:task.target }; }
  }
  if (task.type==="program" && task.programId != null) {
    const prog = PROGRAMS.find(p=>p.id===task.programId);
    if (prog) {
      const done = (task.exercises||[]).filter(exId =>
        isProgramExerciseDone(programProgress, task.programId, task.week, task.sessionIdx, exId)
      ).length;
      return { cur:done, target:task.target };
    }
  }
  // category tasks: count exercises done today
  const done = (task.exercises||[]).filter(exId => !!completed[`${todayStr}-${exId}`]).length;
  return { cur:done, target:task.target };
}



/* ═══════════════════════ RECOMMENDATION ENGINE ══════════════ */

// What template naturally follows each template (recovery rotation)
const RECOVERY_AFTER = {
  jump:      "recovery",
  quickFeet: "handles",
  fullBody:  "shooting",
  recovery:  "quickFeet",
  handles:   "jump",
  shooting:  "fullBody",
};

// Which challenge urgency maps to which template
const CHALLENGE_TEMPLATE_MAP = {
  "jump-5":    "jump",
  "shots-50":  "shooting",
  "handles-5": "handles",
  "speed-5":   "quickFeet",
  "coord-5":   "quickFeet",
};

// Goal → template preference
const GOAL_TEMPLATE_MAP = {
  jump_higher:  "jump",
  quickness:    "quickFeet",
  handles:      "handles",
  shooting:     "shooting",
  get_stronger: "fullBody",
  conditioning: "fullBody",
};

const GOAL_NAMES = {
  jump_higher:"Jump Higher", quickness:"Get Quicker", handles:"Ball Handling",
  shooting:"Shooting", get_stronger:"Get Stronger", conditioning:"Conditioning",
};

function computeRecommendation(settings, completed, currentTemplate) {
  const age   = calcAge(settings.dateOfBirth);
  const goals = settings.goals || [];
  const today = new Date().toLocaleDateString("en-CA");

  // ── How many days since last training session ──────────────────
  let daysSinceTrained = 0;
  const checkD = new Date(); checkD.setDate(checkD.getDate() - 1);
  for (let i = 0; i < 7; i++) {
    const k = checkD.toLocaleDateString("en-CA");
    if (Object.keys(completed).some(c => c.startsWith(k) && completed[c])) break;
    daysSinceTrained++;
    checkD.setDate(checkD.getDate() - 1);
  }

  // ── Current streak ─────────────────────────────────────────────
  let streak = 0;
  const sd = new Date();
  for (let i = 0; i < 14; i++) {
    const k = sd.toLocaleDateString("en-CA");
    if (Object.keys(completed).some(c => c.startsWith(k) && completed[c])) {
      streak++; sd.setDate(sd.getDate() - 1);
    } else break;
  }

  // ── Which challenge is most urgently close to completion ───────
  let urgentChallenge = null, urgentTemplate = null;
  // Sort by (cur/target) descending so the "closest" one wins
  const sorted = [...CHALLENGES_DEF]
    .filter(d => CHALLENGE_TEMPLATE_MAP[d.id])
    .map(d => ({ def:d, ...getChallengeProgress(d, completed, WORKOUTS) }))
    .sort((a,b) => (b.cur/b.target) - (a.cur/a.target));
  for (const { def, cur, target } of sorted) {
    const pct = cur / target;
    if (pct >= 0.4 && pct < 1) {
      urgentChallenge = def;
      urgentTemplate  = CHALLENGE_TEMPLATE_MAP[def.id];
      break;
    }
  }

  // ── Decision tree ──────────────────────────────────────────────
  let recommendedTemplate = RECOVERY_AFTER[currentTemplate] || "quickFeet";
  const reasons = [];

  // Priority 1 — close to completing a challenge
  if (urgentChallenge && urgentTemplate) {
    const { cur, target } = getChallengeProgress(urgentChallenge, completed, WORKOUTS);
    const remaining = target - cur;
    recommendedTemplate = urgentTemplate;
    const word = remaining === 1 ? "1 more session" : `${remaining} more`;
    reasons.push(`You're ${word} away from completing "${urgentChallenge.name}" — let's finish it.`);
  }

  // Priority 2 — recovery after a hard session
  if (!reasons.length && currentTemplate === "jump") {
    recommendedTemplate = "recovery";
    reasons.push("You trained explosion yesterday — today's recovery work protects your joints and keeps you fresh.");
  }
  if (!reasons.length && currentTemplate === "fullBody") {
    recommendedTemplate = "shooting";
    reasons.push("Skill work the day after strength training is the perfect combo — let your muscles recover while your game grows.");
  }

  // Priority 3 — coming back from a gap
  if (!reasons.length && daysSinceTrained >= 2) {
    recommendedTemplate = age <= 11 ? "quickFeet" : "handles";
    const dayWord = daysSinceTrained + 1 === 3 ? "3 days" : `${daysSinceTrained + 1} days`;
    reasons.push(`It's been ${dayWord} — a short, high-energy session is the perfect way to get back in rhythm.`);
  }

  // Priority 4 — streak maintenance
  if (!reasons.length && streak >= 2) {
    reasons.push(`You're on a ${streak}-day streak — keep the momentum going today.`);
  }

  // Priority 5 — goal alignment
  if (!reasons.length && goals.length > 0) {
    const matchedGoal = goals.find(g => GOAL_TEMPLATE_MAP[g]);
    if (matchedGoal) {
      recommendedTemplate = GOAL_TEMPLATE_MAP[matchedGoal];
      reasons.push(`This workout targets your "${GOAL_NAMES[matchedGoal]}" goal — stay locked in.`);
    }
  }

  // Priority 6 — age-based variety / focus
  if (!reasons.length) {
    if (age <= 10) {
      const funOpts = ["quickFeet","handles","recovery"];
      recommendedTemplate = funOpts[new Date().getDay() % funOpts.length];
      reasons.push("Mix it up and keep it fun — variety is the secret weapon at your age.");
    } else if (age >= 13) {
      const hardOpts = ["jump","fullBody","quickFeet"];
      recommendedTemplate = hardOpts[new Date().getDay() % hardOpts.length];
      reasons.push("Consistent, progressive training is how the best get better.");
    } else {
      reasons.push("A balanced session today keeps your body developing from every angle.");
    }
  }

  const tmpl = WORKOUT_TEMPLATES[recommendedTemplate] || WORKOUT_TEMPLATES.quickFeet;
  return {
    templateKey:   recommendedTemplate,
    templateName:  tmpl.name,
    templateEmoji: tmpl.emoji,
    templateDesc:  tmpl.desc,
    reason:        reasons[0] || "Let's level up today.",
  };
}

/* ═══════════════════════ SHOT TRACKER DATA ═══════════════════ */
const SHOT_TYPES = [
  { id:"layup",        label:"Layup",          emoji:"🏃", locations:null },
  { id:"rev_layup",    label:"Reverse Layup",  emoji:"🔄", locations:null },
  { id:"block_bank",   label:"Block Area",     emoji:"📐", locations:["Left Block","Right Block"] },
  { id:"mid_bank",     label:"Elbow Shot",    emoji:"💫", locations:["Left Elbow","Right Elbow"] },
  { id:"mid",          label:"Wing (Mid)",     emoji:"🎯", locations:["Left Wing","Right Wing"] },
  { id:"mid_baseline", label:"Baseline (Mid)", emoji:"🎯", locations:["Left Baseline","Right Baseline"] },
  { id:"free_throw",   label:"Free Throw",     emoji:"🆓", locations:null },
  { id:"three_corner", label:"Corner 3",       emoji:"📐", locations:["Left Corner","Right Corner"] },
  { id:"three_wing",   label:"Wing 3",         emoji:"↗️", locations:["Left Wing","Right Wing"] },
  { id:"three_slot",   label:"Slot 3",         emoji:"↗️", locations:["Left Slot","Right Slot"] },
  { id:"three_center", label:"Top 3",          emoji:"🎯", locations:null },
];
const SHOT_COLORS = {
  layup:"#34d399", rev_layup:"#6ee7b7", block_bank:"#60a5fa",
  mid_bank:"#93c5fd", mid:"#a78bfa", mid_baseline:"#c4b5fd", free_throw:"#fbbf24",
  three_corner:"#f87171", three_wing:"#fb923c", three_slot:"#f472b6", three_center:"#f43f5e",
};


/* True 2D hue×saturation disc: angle = hue, radius = saturation, at a fixed
   lightness. One drag sets both hue and sat → onChange(hue, sat). The disc
   bitmap only redraws when lightness/size change; the selection ring is a DOM
   element so dragging never re-renders the canvas. */
/* ═══════════════════════ SHOT TRACKER HELPERS ═══════════════ */
const todayKey = () => new Date().toLocaleDateString("en-CA");
const offsetDateKey = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};
const fmtDate  = k => new Date(k+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const dayLabel = k => ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(k+"T00:00:00").getDay()];

function StackedBars({ data, priColor, height=104, selDate, onSelect }) {
  const maxT = Math.max(1, ...data.map(d=>d.total));
  return (
    <div style={{ display:"flex",alignItems:"flex-end",gap:data.length>21?2:4,height }}>
      {data.map((d,i) => {
        const colH = Math.max(3,(d.total/maxT)*(height-20));
        const isSel = d.key===selDate, isToday = d.key===todayKey();
        return (
          <div key={i} onClick={()=>onSelect(d.key)} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer" }}>
            <div style={{ fontSize:8,fontFamily:"'DM Mono',monospace",color:d.total>0?priColor:"#334155",minHeight:11 }}>{d.total>0?d.total:""}</div>
            <div style={{ width:"100%",height:colH,borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse",
              outline:isSel?`2px solid ${priColor}`:"none",filter:isSel?"brightness(1.2)":"none" }}>
              {SHOT_TYPES.map(t => {
                const cnt = d.byShotType[t.id]||0; if (!cnt) return null;
                return <div key={t.id} style={{ width:"100%",height:(cnt/d.total)*colH,background:SHOT_COLORS[t.id],flexShrink:0 }}/>;
              })}
              {d.total===0 && <div style={{ width:"100%",height:"100%",background:"rgba(255,255,255,0.05)" }}/>}
            </div>
            {data.length<=21 && <div style={{ fontSize:8,color:isToday?priColor:"#334155" }}>{d.label}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Spark({ data, color, w=80, h=26 }) {
  if (!data||data.length<2) return <div style={{ width:w,height:h }}/>;
  const mx = Math.max(1,...data);
  const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-(v/mx)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}28`} stroke="none"/>
    </svg>
  );
}

function Donut({ data, size=128 }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={size/2-10} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18"/>
      <text x={size/2} y={size/2+4} textAnchor="middle" style={{ fill:"#334155",fontSize:10,fontFamily:"DM Mono" }}>No data</text>
    </svg>
  );
  const r = size/2-10, circ = 2*Math.PI*r;
  let off = 0;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      {data.filter(d=>d.value>0).map((d,i)=>{
        const dash=(d.value/total)*circ, gap=circ-dash;
        const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off} strokeLinecap="butt"/>;
        off+=dash; return el;
      })}
      <circle cx={size/2} cy={size/2} r={r-9} fill="#060b14"/>
    </svg>
  );
}

function CourtMap({ priColor, onZoneSelect, lastShot }) {
  // Label-free colored zones. Color + position identify each spot; the
  // color-matched Quick Tap list below acts as the legend, and each zone
  // carries a hover <title> for the name.
  const zones = [
    // ── Rim (smallest) ────────────────────────────────────────────
    {id:"layup",        label:"Layup",          loc:null, x:113, y:38,  r:11},
    {id:"block_bank",   label:"Left Block",     loc:"Left Block",     x:70,  y:48,  r:8},
    {id:"block_bank",   label:"Right Block",    loc:"Right Block",    x:156, y:48,  r:8},
    // ── Mid-range: baseline (short corner, inside the corner-3) ────
    {id:"mid_baseline", label:"Left Baseline",  loc:"Left Baseline",  x:45,  y:58,  r:9},
    {id:"mid_baseline", label:"Right Baseline", loc:"Right Baseline", x:181, y:58,  r:9},
    // ── 3pt: corner (on the corner line, down by the baseline) ────
    {id:"three_corner", label:"Left Corner",    loc:"Left Corner",    x:18,  y:48,  r:9},
    {id:"three_corner", label:"Right Corner",   loc:"Right Corner",   x:208, y:48,  r:9},
    // ── 3pt: wing (up the corner line, mid-height) ────────────────
    {id:"three_wing",   label:"Left Wing 3",    loc:"Left Wing",      x:18,  y:96,  r:9},
    {id:"three_wing",   label:"Right Wing 3",   loc:"Right Wing",     x:208, y:96,  r:9},
    // ── Mid-range: wing (inside the arc, off the sideline) ────────
    {id:"mid",          label:"Left Wing",      loc:"Left Wing",      x:48,  y:100, r:9},
    {id:"mid",          label:"Right Wing",     loc:"Right Wing",     x:178, y:100, r:9},
    // ── Mid-range: elbows + free throw ────────────────────────────
    {id:"mid_bank",     label:"Left Elbow",     loc:"Left Elbow",     x:74,  y:118, r:9},
    {id:"mid_bank",     label:"Right Elbow",    loc:"Right Elbow",    x:152, y:118, r:9},
    {id:"free_throw",   label:"Free Throw",     loc:null,             x:113, y:120, r:11},
    // ── 3pt: slot (upper, on the arc toward the top) ──────────────
    {id:"three_slot",   label:"Left Slot",      loc:"Left Slot",      x:33,  y:146, r:9},
    {id:"three_slot",   label:"Right Slot",     loc:"Right Slot",     x:193, y:146, r:9},
    // ── 3pt: top of the key (arc apex) ────────────────────────────
    {id:"three_center", label:"Top 3",          loc:null,             x:113, y:166, r:11},
  ];
  return (
    <svg viewBox="0 0 226 200" style={{ width:"100%",maxWidth:348,display:"block",margin:"0 auto" }}>
      <rect x="2" y="2" width="222" height="196" rx="8" fill="#0f1e35" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <rect x="72" y="2" width="82" height="120" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
      <circle cx="113" cy="122" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      {/* 3-point arc — radius 150 centered on basket (113,20), bulging AWAY from the
          basket (apex at y≈170, near Top-3). sweep-flag 0 makes it curve outward. */}
      <path d="M 18 136 A 150 150 0 0 0 207 136" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" strokeDasharray="4 3"/>
      {/* Corner 3 straight portions — from baseline down to where arc begins */}
      <line x1="18" y1="2" x2="18" y2="136" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="207" y1="2" x2="207" y2="136" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <circle cx="113" cy="20" r="4" fill="none" stroke={priColor} strokeWidth="2"/>
      <circle cx="113" cy="20" r="1.8" fill={priColor}/>
      <line x1="96" y1="16" x2="130" y2="16" stroke={priColor} strokeWidth="2.5" strokeLinecap="round"/>
      {zones.map((z,i) => {
        const col = SHOT_COLORS[z.id];
        const hit = lastShot && lastShot.type === z.id && (z.loc == null || lastShot.location === z.loc);
        return (
          <g key={i} onClick={()=>onZoneSelect(z.id, z.loc)} style={{ cursor:"pointer" }}>
            <title>{z.label}</title>
            {/* Label-free marker: translucent disc + colored ring + center dot. */}
            <circle cx={z.x} cy={z.y} r={z.r} fill={hit?col:`${col}30`} stroke={col} strokeWidth={hit?2.5:1.5}/>
            <circle cx={z.x} cy={z.y} r={2} fill={hit?"#000":col} pointerEvents="none"/>
          </g>
        );
      })}
      <text x="113" y="195" textAnchor="middle" style={{ fontSize:7,fill:"rgba(255,255,255,0.18)",fontFamily:"DM Mono,monospace" }}>TAP ZONE TO LOG SHOTS</text>
    </svg>
  );
}

/* ═══════════════════════ SHOT TRACKER ═══════════════════════ */
function ShotTracker({ P, S, BG, athleteName, settings, onLogChange, onOpenGuide }) {
  const [log, setLog] = useState(() => readShotLog());
  const [view, setView] = useState("log");
  const [activeType, setActiveType] = useState(null);
  const [activeLoc, setActiveLoc] = useState(null);
  const [lastShot, setLastShot] = useState(null);
  const [selDate, setSelDate] = useState(todayKey());
  const [logDate, setLogDate] = useState(todayKey());
  const [range, setRange] = useState(14);
  const [useCustom, setUseCustom] = useState(false);
  const [custStart, setCustStart] = useState("");
  const [custEnd, setCustEnd] = useState("");
  const [shotCount, setShotCount] = useState({made:0, missed:0});
  const [shotStyle, setShotStyle] = useState(() => getLastShotStyle());
  const [weekGoal, setWeekGoal] = useState(() => getWeekShotGoal());
  const [monthGoal, setMonthGoal] = useState(() => getMonthShotGoal());
  const [goalPeriod, setGoalPeriod] = useState(() => getShotGoalPeriod());
  const [editingGoal, setEditingGoal] = useState(false);

  const save = nl => {
    const normalized = writeShotLog(nl);
    setLog(normalized);
    onLogChange?.();
  };

  const saveGoal = g => {
    const v = Math.max(1, parseInt(g, 10) || 100);
    if (goalPeriod === "month") {
      setMonthGoal(v);
      setMonthShotGoal(v);
    } else {
      setWeekGoal(v);
      setWeekShotGoal(v);
    }
  };

  const switchGoalPeriod = period => {
    setGoalPeriod(period);
    setShotGoalPeriod(period);
    setEditingGoal(false);
  };

  const pickShotStyle = (id) => {
    setShotStyle(id);
    setLastShotStyle(id);
  };

  const logBatch = (tid, loc, made, missed) => {
    if (made + missed === 0) return;
    const k = logDate;
    const isToday = k === todayKey();
    const ts = isToday ? Date.now() : new Date(`${k}T12:00:00`).getTime();
    const style = shotStyle;
    const entries = [
      ...Array(made).fill(null).map((_,i)  => ({ type:tid, location:loc||null, ts:ts+i,   made:true,  style })),
      ...Array(missed).fill(null).map((_,i) => ({ type:tid, location:loc||null, ts:ts+made+i, made:false, style })),
    ];
    const last = entries[entries.length-1];
    save({...log, [k]:[...(log[k]||[]), ...entries]});
    trackShotSession({ makes: made, misses: missed, shotType: tid, usedCourtMap: Boolean(loc && loc !== "__noloc__") });
    setLastShotStyle(style);
    setLastShot(last);
    setActiveType(null); setActiveLoc(null); setShotCount({made:0, missed:0});
  };

  const pickLogDate = (key) => {
    if (!key || key > todayKey()) return;
    setLogDate(key);
    setActiveType(null);
    setActiveLoc(null);
    setShotCount({ made:0, missed:0 });
    setLastShot(null);
  };

  const addShot = (tid, loc, made) => logBatch(tid, loc, made?1:0, made?0:1);

  const selectZone = (tid, courtLoc = undefined) => {
    const st = SHOT_TYPES.find(s => s.id === tid);
    setActiveType(tid);
    if (!st?.locations) {
      setActiveLoc("__noloc__");
    } else if (courtLoc && st.locations.includes(courtLoc)) {
      setActiveLoc(courtLoc);
    } else {
      setActiveLoc(null);
    }
    setShotCount({ made:0, missed:0 });
  };

  const undo = () => {
    const k = logDate;
    if (!(log[k]?.length)) return;
    save({ ...log, [k]: log[k].slice(0, -1) });
    setLastShot(null);
  };

  const todayShots = log[todayKey()]||[];
  const logDayShots = log[logDate]||[];
  const logDayLabel = logDate === todayKey() ? "Today" : fmtDate(logDate);
  const logDayTotal = logDayShots.length;
  const allFlat = useMemo(()=>Object.values(log).flat(),[log]);
  const allByType = useMemo(()=>{ const c={}; allFlat.forEach(s=>{c[s.type]=(c[s.type]||0)+1}); return c; },[allFlat]);
  const allTotal = allFlat.length;
  const allTimeStats = useMemo(() => computeShootingStats(log), [log]);
  const styleAccuracy = useMemo(() => allTimeStats.styles, [allTimeStats]);
  const locationStats = useMemo(() => computeLocationStats(log), [log]);
  const zoneTypeStats = useMemo(() => computeZoneTypeStats(log), [log]);
  const spotStats = useMemo(() => computeSpotStats(log), [log]);
  const streak = useMemo(()=>{ let s=0,d=new Date(); while(true){const k=d.toLocaleDateString("en-CA");if((log[k]||[]).length>0){s++;d.setDate(d.getDate()-1)}else break} return s; },[log]);
  const todayTotal = todayShots.length;
  const todayMade = useMemo(()=>todayShots.filter(s=>s.made!==false).length,[todayShots]);
  const todayPct = todayTotal>0 ? Math.round((todayMade/todayTotal)*100) : 0;

  // Period makes: week (Mon→today) or month (1st→today)
  const periodMakes = useMemo(() => (
    goalPeriod === "month" ? getMonthMakesFromLog(log) : getWeekMakesFromLog(log)
  ), [log, goalPeriod]);
  const periodGoal = goalPeriod === "month" ? monthGoal : weekGoal;
  const daysLeftInPeriod = goalPeriod === "month" ? daysLeftInMonth() : daysLeftInWeek();

  const histData = useMemo(()=>{
    const days=[];
    if (useCustom && custStart && custEnd) {
      let d = new Date(custStart+"T00:00:00"), end = new Date(custEnd+"T00:00:00");
      while (d<=end) {
        const k=d.toLocaleDateString("en-CA"), sh=log[k]||[], bst={};
        sh.forEach(s=>{bst[s.type]=(bst[s.type]||0)+1});
        days.push({key:k,label:dayLabel(k),total:sh.length,byShotType:bst});
        d.setDate(d.getDate()+1);
      }
    } else {
      for (let i=range-1;i>=0;i--) {
        const d=new Date(); d.setDate(d.getDate()-i);
        const k=d.toLocaleDateString("en-CA"), sh=log[k]||[], bst={};
        sh.forEach(s=>{bst[s.type]=(bst[s.type]||0)+1});
        days.push({key:k,label:dayLabel(k),total:sh.length,byShotType:bst});
      }
    }
    return days;
  },[log,range,useCustom,custStart,custEnd]);

  const selShots = log[selDate]||[];
  const lbl = { fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}80`,marginBottom:10,textTransform:"uppercase" };
  const bd = "rgba(255,255,255,0.07)";
  const sf = "rgba(255,255,255,0.028)";

  const TABS = [{id:"log",label:"📍 Log"},{id:"history",label:"📈 History"},{id:"breakdown",label:"🍩 Stats"}];

  return (
    <div style={{ background:BG,color:"var(--fkh-text)",maxWidth:680,margin:"0 auto",minHeight:"100vh",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))",fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <div style={{ padding:"22px 20px 14px",borderBottom:`1px solid ${P}18` }}>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"#334155",marginBottom:5 }}>SHOT TRACKER</div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
          <h2 style={{ fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.02em" }}>{athleteName}'s <span style={{ color:P }}>Shots</span></h2>
          <div style={{ display:"flex",alignItems:"flex-end",gap:10 }}>
            {onOpenGuide && <GuideNavButton compact onClick={onOpenGuide} />}
            <div style={{ display:"flex",gap:14 }}>
            {[[todayMade,"TODAY",P],[`${todayPct}%`,"FG%",S],[streak,"STREAK","#34d399"]].map(([n,l,c])=>(
              <div key={l} style={{ textAlign:"right" }}>
                <div style={{ fontSize:22,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:8,color:"#334155",letterSpacing:"0.06em" }}>{l}</div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
      {/* ── Weekly Goal Widget ───────────────────────────────── */}
      {(()=>{
        const pct      = Math.min(1, periodMakes / periodGoal);
        const reached  = periodMakes >= periodGoal;
        const barColor = reached
          ? "linear-gradient(90deg,#22c55e,#16a34a)"
          : pct >= 0.75
            ? `linear-gradient(90deg,${P},#22c55e)`
            : pct >= 0.4
              ? `linear-gradient(90deg,${P},${S})`
              : `linear-gradient(90deg,${P}cc,${P})`;
        const glowColor = reached ? "#22c55e" : P;
        const numColor  = reached ? "#22c55e" : pct >= 0.75 ? "#86efac" : "var(--fkh-text)";
        const periodLabel = goalPeriod === "month" ? "month" : "week";
        const goalPresets = goalPeriod === "month"
          ? [200, 400, 600, 800, 1000, 1500]
          : [50, 100, 150, 200, 300, 500];

        return (
          <div style={{ padding:"12px 16px 10px",borderBottom:`1px solid ${bd}` }}>
            {/* Top row: counter + period toggle + set-goal */}
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:9,gap:8 }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:6,minWidth:0,flex:1 }}>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:30,fontWeight:800,
                  color:numColor,lineHeight:1,
                  textShadow:reached?`0 0 20px #22c55e80`:pct>0.4?`0 0 16px ${P}60`:"none",
                  transition:"color 0.4s,text-shadow 0.4s" }}>
                  {periodMakes}
                </span>
                <span style={{ fontSize:13,color:"#475569",paddingBottom:2 }}>
                  / {periodGoal} makes this {periodLabel}
                </span>
                {reached && (
                  <span style={{ fontSize:12,animation:"fkh-bounce 0.5s ease-out both" }}>🎯</span>
                )}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
                <div style={{ display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${bd}` }}>
                  {["week", "month"].map(p => (
                    <button key={p} type="button" onClick={() => switchGoalPeriod(p)}
                      style={{
                        padding:"5px 9px", border:"none", cursor:"pointer", fontSize:10, fontWeight:700,
                        textTransform:"capitalize",
                        background: goalPeriod === p ? `${P}22` : "transparent",
                        color: goalPeriod === p ? P : "#64748b",
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setEditingGoal(e=>!e)}
                  style={{ fontSize:10,color:editingGoal?P:"#475569",
                    background:editingGoal?`${P}14`:"transparent",
                    border:`1px solid ${editingGoal?P+"40":"rgba(255,255,255,0.1)"}`,
                    borderRadius:8,padding:"5px 11px",cursor:"pointer",fontWeight:600,
                    transition:"all 0.2s" }}>
                  {editingGoal ? "Done ✓" : "Set Goal"}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ position:"relative",height:10,background:"rgba(255,255,255,0.06)",
              borderRadius:99,overflow:"visible",marginBottom:6 }}>
              <div style={{ height:"100%",borderRadius:99,
                background:barColor,
                width:`${pct*100}%`,
                transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)",
                boxShadow:`0 0 12px ${glowColor}70`,
                position:"relative",overflow:"hidden" }}>
                {/* Shimmer when not complete */}
                {!reached && pct>0.05 && (
                  <div style={{ position:"absolute",inset:0,
                    background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)",
                    backgroundSize:"200% 100%",
                    animation:"fkh-shimmer 2s linear infinite" }}/>
                )}
              </div>
            </div>

            {/* Sub-row: % + pace */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,
                  fontWeight:700,color:glowColor }}>
                  {Math.round(pct*100)}%
                </span>
                {!reached && periodMakes>0 && (
                  <span style={{ fontSize:10,color:"#334155" }}>
                    · {periodGoal-periodMakes} to go
                  </span>
                )}
                {reached && (
                  <span style={{ fontSize:10,color:"#22c55e",fontWeight:600 }}>
                    · Goal smashed! 🏀
                  </span>
                )}
              </div>
              <span style={{ fontSize:10,color:"#334155",fontFamily:"'DM Mono',monospace" }}>
                {daysLeftInPeriod}d left in {periodLabel}
              </span>
            </div>

            {/* Goal presets (shown when editing) */}
            {editingGoal && (
              <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:9,color:"#475569",letterSpacing:"0.1em",
                  textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:8 }}>
                  {goalPeriod === "month" ? "Monthly" : "Weekly"} makes target
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {goalPresets.map(n=>(
                    <button key={n} onClick={()=>{ saveGoal(n); setEditingGoal(false); }}
                      style={{ padding:"6px 13px",borderRadius:9,cursor:"pointer",fontSize:13,
                        fontWeight:periodGoal===n?800:500,
                        boxShadow:periodGoal===n?`0 0 8px ${P}40`:"none",
                        transition:"all 0.15s",
                        ...chipStyle(settings, periodGoal===n, P) }}>
                      {n}
                    </button>
                  ))}
                  {/* Custom input */}
                  <div style={{ display:"flex",alignItems:"center",gap:4,borderRadius:9,padding:"0 8px",...actionBtnStyle(settings) }}>
                    <input
                      type="number" inputMode="numeric" min="1"
                      placeholder="Custom"
                      style={{ width:60,background:"transparent",border:"none",outline:"none",
                        color:"var(--fkh-text-muted)",fontSize:13,padding:"6px 0",
                        WebkitAppearance:"none",MozAppearance:"textfield" }}
                      onKeyDown={e=>{
                        if (e.key==="Enter" && e.target.value) {
                          const v = Math.max(1, parseInt(e.target.value)||100);
                          saveGoal(v); setEditingGoal(false); e.target.value="";
                        }
                      }}
                    />
                    <span style={{ fontSize:9,color:"#334155" }}>↵</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display:"flex",padding:"10px 14px",gap:6,borderBottom:`1px solid ${bd}` }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{ flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${view===t.id?P:bd}`,background:view===t.id?`${P}18`:"transparent",color:view===t.id?P:"#475569",fontSize:11,fontWeight:600,cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {view==="log" && (
        <div style={{ padding:"14px 16px 0" }}>
          <div style={{
            display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
            marginBottom:12, padding:"8px 10px", borderRadius:10,
            background: logDate !== todayKey() ? `${P}10` : "transparent",
            border:`1px solid ${logDate !== todayKey() ? `${P}28` : bd}`,
          }}>
            <span style={{ fontSize:10, fontWeight:700, color:"#64748b" }}>📅</span>
            {[["Today", todayKey()], ["Yesterday", offsetDateKey(-1)]].map(([label, key]) => (
              <button key={label} type="button" onClick={() => pickLogDate(key)} style={{
                padding:"5px 10px", borderRadius:99, fontSize:10, fontWeight:700, cursor:"pointer",
                border:`1px solid ${logDate === key ? P : bd}`,
                background: logDate === key ? `${P}20` : "transparent",
                color: logDate === key ? P : "#64748b",
              }}>{label}</button>
            ))}
            <input
              type="date"
              value={logDate}
              max={todayKey()}
              onChange={e => pickLogDate(e.target.value)}
              style={{
                flex:"1 1 120px", minWidth:120, background:"rgba(255,255,255,0.05)",
                border:`1px solid ${bd}`, borderRadius:8, padding:"5px 8px",
                color:"var(--fkh-text)", fontSize:11, outline:"none",
              }}
            />
          </div>

          <div style={{ background:sf, border:`1px solid ${P}22`, borderRadius:14, padding:"12px 12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:800, color:"var(--fkh-text)", marginBottom:4 }}>Log Shots</div>
            <div style={{ fontSize:11, color:"#64748b", marginBottom:12, lineHeight:1.45 }}>
              Tap a spot on the court → pick how you shot → log makes and misses. FG% is calculated for you.
            </div>

            <CourtMap priColor={P} onZoneSelect={selectZone} lastShot={lastShot}/>

            {activeType && !activeLoc && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${bd}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:P, marginBottom:8 }}>
                  {SHOT_TYPES.find(s=>s.id===activeType)?.emoji}{" "}
                  {SHOT_TYPES.find(s=>s.id===activeType)?.label} — pick side
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {SHOT_TYPES.find(s=>s.id===activeType)?.locations?.map(loc=>(
                    <button key={loc} type="button" onClick={()=>setActiveLoc(loc)} style={{
                      padding:"7px 12px", borderRadius:10, border:`1px solid ${P}40`,
                      background:`${P}18`, color:P, fontSize:11, fontWeight:600, cursor:"pointer",
                    }}>{loc}</button>
                  ))}
                  <button type="button" onClick={()=>{ setActiveType(null); setActiveLoc(null); }} style={{
                    padding:"7px 10px", borderRadius:10, border:`1px solid ${bd}`,
                    background:"transparent", color:"#64748b", fontSize:11, cursor:"pointer",
                  }}>✕</button>
                </div>
              </div>
            )}

            {activeType && activeLoc && (() => {
              const st = SHOT_TYPES.find(s=>s.id===activeType);
              const loc = activeLoc === "__noloc__" ? null : activeLoc;
              const total = shotCount.made + shotCount.missed;
              const spotLabel = loc ? `${st?.label} · ${loc}` : st?.label;
              const stepBtn = (style) => ({
                width:40, height:40, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)",
                background:"rgba(255,255,255,0.06)", color:"var(--fkh-text)", fontSize:20,
                fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                ...style,
              });
              return (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${bd}` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:10 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:P }}>{st?.emoji} {spotLabel}</div>
                    <button type="button" onClick={()=>{ setActiveType(null); setActiveLoc(null); setShotCount({ made:0, missed:0 }); }}
                      style={{ background:"transparent", border:"none", color:"#64748b", fontSize:11, cursor:"pointer", padding:0 }}>
                      Change spot
                    </button>
                  </div>

                  <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:14 }}>
                    {SHOT_STYLES.map(sty => (
                      <button key={sty.id} type="button" title={sty.label} onClick={() => pickShotStyle(sty.id)}
                        style={{
                          width:46, height:46, borderRadius:12, cursor:"pointer",
                          border:`1.5px solid ${shotStyle === sty.id ? P : bd}`,
                          background: shotStyle === sty.id ? `${P}22` : "rgba(255,255,255,0.04)",
                          fontSize:20, lineHeight:1,
                        }}>
                        {sty.emoji}
                      </button>
                    ))}
                  </div>

                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#22c55e", width:62 }}>Made</span>
                    <button type="button" style={stepBtn()} onClick={()=>setShotCount(c=>({...c,made:Math.max(0,c.made-1)}))}>−</button>
                    <input
                      type="number" inputMode="numeric" min="0"
                      value={shotCount.made}
                      onChange={e=>setShotCount(c=>({...c,made:Math.max(0,parseInt(e.target.value)||0)}))}
                      onFocus={e=>e.target.select()}
                      style={{ width:48, textAlign:"center", fontSize:24, fontWeight:800, color:"#22c55e",
                        fontFamily:"'DM Mono',monospace", background:"transparent", border:"none",
                        outline:"none", WebkitAppearance:"none", MozAppearance:"textfield", padding:0 }}
                    />
                    <button type="button" style={stepBtn({ background:"#22c55e22", borderColor:"#22c55e44" })}
                      onClick={()=>setShotCount(c=>({...c,made:c.made+1}))}>+</button>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#ef4444", width:62 }}>Miss</span>
                    <button type="button" style={stepBtn()} onClick={()=>setShotCount(c=>({...c,missed:Math.max(0,c.missed-1)}))}>−</button>
                    <input
                      type="number" inputMode="numeric" min="0"
                      value={shotCount.missed}
                      onChange={e=>setShotCount(c=>({...c,missed:Math.max(0,parseInt(e.target.value)||0)}))}
                      onFocus={e=>e.target.select()}
                      style={{ width:48, textAlign:"center", fontSize:24, fontWeight:800, color:"#ef4444",
                        fontFamily:"'DM Mono',monospace", background:"transparent", border:"none",
                        outline:"none", WebkitAppearance:"none", MozAppearance:"textfield", padding:0 }}
                    />
                    <button type="button" style={stepBtn({ background:"#ef444422", borderColor:"#ef444444" })}
                      onClick={()=>setShotCount(c=>({...c,missed:c.missed+1}))}>+</button>
                  </div>
                  <button
                    type="button"
                    disabled={total===0}
                    onClick={()=>logBatch(activeType, loc, shotCount.made, shotCount.missed)}
                    style={{ width:"100%", padding:"12px", borderRadius:10, border:`1px solid ${P}44`,
                      background:total>0?`${P}22`:"rgba(255,255,255,0.04)",
                      color:total>0?P:"#334155", fontSize:13, fontWeight:700,
                      cursor:total>0?"pointer":"default" }}>
                    {total>0 ? `Log ${total} shot${total!==1?"s":""} ✓` : "Add makes or misses above"}
                  </button>
                </div>
              );
            })()}

            {!activeType && (
              <div style={{ textAlign:"center", fontSize:11, color:"#475569", marginTop:12, paddingTop:4 }}>
                Tap a zone on the court to start
              </div>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={lbl}>{logDayLabel}'s log ({logDayTotal})</div>
            {logDayTotal>0 && (
              <button type="button" onClick={undo} style={{
                padding:"5px 12px", borderRadius:8, border:"1px solid rgba(239,68,68,0.25)",
                background:"rgba(239,68,68,0.08)", color:"#f87171", fontSize:11, fontWeight:600, cursor:"pointer",
              }}>↩ Undo</button>
            )}
          </div>
          {logDayShots.length===0
            ? <div style={{ textAlign:"center", padding:"16px 0", color:"#334155", fontSize:12 }}>No shots for {logDayLabel.toLowerCase()} yet 🏀</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:200, overflowY:"auto", marginBottom:14 }}>
                {[...logDayShots].reverse().map((s,i)=>{ const def=SHOT_TYPES.find(t=>t.id===s.type),c=SHOT_COLORS[s.type]; const sty=getShotStyle(s.style); return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:sf, borderRadius:8, border:`1px solid ${c}1a` }}>
                    <span style={{ fontSize:13 }}>{def?.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, color:c, fontWeight:600 }}>{def?.label}{s.location?` · ${s.location}`:""}</div>
                      <div style={{ fontSize:10, color:"#64748b" }}>{sty.emoji} {sty.short}</div>
                    </div>
                    <span style={{ fontSize:12 }}>{s.made===false?"❌":"✅"}</span>
                  </div>
                );})}
              </div>
          }
        </div>
      )}

      {view==="history" && (
        <div style={{ padding:"14px 16px 0" }}>
          <div style={{ display:"flex",gap:5,marginBottom:10,flexWrap:"wrap" }}>
            {[7,14,30,60,90].map(n=>(
              <button key={n} onClick={()=>{setRange(n);setUseCustom(false);}} style={{ padding:"7px 12px",borderRadius:10,border:`1px solid ${!useCustom&&range===n?P:bd}`,background:!useCustom&&range===n?`${P}18`:"transparent",color:!useCustom&&range===n?P:"#475569",fontSize:12,fontWeight:600,cursor:"pointer" }}>{n}D</button>
            ))}
            <button onClick={()=>setUseCustom(v=>!v)} style={{ padding:"7px 12px",borderRadius:10,border:`1px solid ${useCustom?S:bd}`,background:useCustom?`${S}18`:"transparent",color:useCustom?S:"#475569",fontSize:12,fontWeight:600,cursor:"pointer" }}>📅 Custom</button>
          </div>
          {useCustom&&(
            <div style={{ display:"flex",gap:8,marginBottom:12,alignItems:"center" }}>
              <input type="date" value={custStart} onChange={e=>setCustStart(e.target.value)} style={{ flex:1,background:sf,border:`1px solid ${bd}`,borderRadius:8,padding:"7px 10px",color:"var(--fkh-text)",fontSize:12,outline:"none" }}/>
              <span style={{ color:"#334155" }}>→</span>
              <input type="date" value={custEnd} onChange={e=>setCustEnd(e.target.value)} style={{ flex:1,background:sf,border:`1px solid ${bd}`,borderRadius:8,padding:"7px 10px",color:"var(--fkh-text)",fontSize:12,outline:"none" }}/>
            </div>
          )}
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px 12px",marginBottom:14 }}>
            <div style={{ ...lbl,marginBottom:12 }}>Daily Makes — Stacked by Shot Type</div>
            <StackedBars data={histData} priColor={P} height={160} selDate={selDate} onSelect={setSelDate}/>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:12 }}>
              {SHOT_TYPES.filter(t=>histData.some(d=>(d.byShotType[t.id]||0)>0)).map(t=>(
                <div key={t.id} style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <div style={{ width:9,height:9,borderRadius:2,background:SHOT_COLORS[t.id],flexShrink:0 }}/>
                  <span style={{ fontSize:10,fontWeight:600,color:P }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:`${P}08`,border:`1px solid ${P}1e`,borderRadius:14,padding:"14px",marginBottom:14 }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"#334155",marginBottom:6 }}>{selDate===todayKey()?"TODAY":fmtDate(selDate).toUpperCase()}</div>
            {(() => {
              const attempts = selShots.length;
              const makes = selShots.filter(s => s.made !== false).length;
              const fg = attempts ? Math.round((makes / attempts) * 100) : 0;
              return (
                <>
                  <div style={{ fontSize:22,fontWeight:800,color:P,fontFamily:"'DM Mono',monospace",marginBottom:4 }}>
                    {fg}% <span style={{ fontSize:12,fontWeight:400,color:"#475569" }}>FG</span>
                  </div>
                  <div style={{ fontSize:11,color:"#64748b",marginBottom:10 }}>{makes}/{attempts} on this day</div>
                </>
              );
            })()}
            {selShots.length===0
              ? <div style={{ color:"#334155",fontSize:12 }}>No shots on this day</div>
              : <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {SHOT_TYPES.map(t=>{ const cnt=selShots.filter(s=>s.type===t.id).length; if(!cnt) return null;
                    const locs=[...new Set(selShots.filter(s=>s.type===t.id&&s.location).map(s=>s.location))];
                    return (<div key={t.id} style={{ padding:"6px 10px",borderRadius:10,background:`${SHOT_COLORS[t.id]}14`,border:`1px solid ${SHOT_COLORS[t.id]}28` }}>
                      <span style={{ fontSize:13 }}>{t.emoji}</span><span style={{ fontSize:12,fontWeight:700,color:SHOT_COLORS[t.id],marginLeft:5 }}>{cnt}</span>
                      {locs.length>0&&<div style={{ fontSize:9,color:"#475569",marginTop:2 }}>{locs.join(", ")}</div>}
                    </div>);
                  })}
                </div>
            }
          </div>
          <div style={lbl}>Per-Type Trends</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {SHOT_TYPES.map(t=>{ const sp=histData.map(d=>(d.byShotType[t.id]||0)); if(sp.every(v=>v===0)) return null; return (
              <div key={t.id} style={{ background:sf,border:`1px solid ${SHOT_COLORS[t.id]}1e`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:18 }}>{t.emoji}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:SHOT_COLORS[t.id],marginBottom:3 }}>{t.label}</div>
                  <Spark data={sp} color={SHOT_COLORS[t.id]} w={80} h={24}/>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:SHOT_COLORS[t.id],lineHeight:1 }}>{allByType[t.id]||0}</div>
                  <div style={{ fontSize:8,color:"#334155" }}>all time</div>
                </div>
              </div>
            );})}
          </div>
        </div>
      )}

      {view==="breakdown" && (
        <div style={{ padding:"14px 16px 0" }}>
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"16px",marginBottom:14,display:"flex",gap:16,alignItems:"center" }}>
            <Donut size={128} data={SHOT_TYPES.map(t=>({value:allByType[t.id]||0,color:SHOT_COLORS[t.id]}))}/>
            <div style={{ flex:1 }}>
              <div style={lbl}>Overall</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:800,color:P,lineHeight:1,marginBottom:2 }}>
                {allTimeStats.pct != null ? `${allTimeStats.pct}%` : "—"}
              </div>
              <div style={{ fontSize:10,color:"#475569",marginBottom:8 }}>
                {allTimeStats.makes}/{allTimeStats.attempts} all-time FG%
              </div>
              <div style={{ fontSize:10,color:"#475569" }}>{allTotal} attempts logged</div>
            </div>
          </div>
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px",marginBottom:14 }}>
            <div style={lbl}>By creation type</div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {SHOT_STYLES.map(st => {
                const s = styleAccuracy[st.id];
                const has = s?.a > 0;
                return (
                  <div key={st.id} style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:13,width:18 }}>{st.emoji}</span>
                    <span style={{ fontSize:11,color:"var(--fkh-text-muted)",width:96,flexShrink:0 }}>{st.label}</span>
                    <div style={{ flex:1,height:6,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                      <div style={{ width:`${has ? s.pct : 0}%`,height:"100%",background:P }} />
                    </div>
                    <span style={{ fontSize:11,fontWeight:800,color:has?P:"#475569",fontFamily:"'DM Mono',monospace",width:72,textAlign:"right" }}>
                      {has ? `${s.pct}%` : "—"}
                    </span>
                    <span style={{ fontSize:10,color:"#475569",width:36,textAlign:"right" }}>{has ? `${s.m}/${s.a}` : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px",marginBottom:14 }}>
            <div style={lbl}>By court zone</div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {zoneTypeStats.length === 0
                ? <div style={{ color:"#334155",fontSize:12,textAlign:"center",padding:"8px 0" }}>Log shots from the court map</div>
                : zoneTypeStats.map(z => {
                  const c = SHOT_COLORS[z.id] || P;
                  return (
                    <div key={z.id} style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:11,color:"var(--fkh-text-muted)",flex:1,minWidth:0 }}>{z.label}</span>
                      <div style={{ width:56,height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                        <div style={{ width:`${z.pct || 0}%`,height:"100%",background:c }} />
                      </div>
                      <span style={{ fontSize:11,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace",width:44,textAlign:"right" }}>{z.pct}%</span>
                      <span style={{ fontSize:10,color:"#475569",width:40,textAlign:"right" }}>{z.m}/{z.a}</span>
                    </div>
                  );
                })}
            </div>
          </div>
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px",marginBottom:14 }}>
            <div style={lbl}>By location</div>
            {locationStats.length === 0
              ? <div style={{ color:"#334155",fontSize:12,textAlign:"center",padding:"12px 0" }}>Locations appear when you tap specific court zones</div>
              : <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {locationStats.map(loc => (
                    <div key={loc.label} style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ fontSize:11,color:"var(--fkh-text-muted)",flex:1,minWidth:0 }}>{loc.label}</div>
                      <div style={{ width:56,height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                        <div style={{ width:`${loc.pct || 0}%`,height:"100%",background:S }} />
                      </div>
                      <span style={{ fontSize:11,fontWeight:800,color:S,fontFamily:"'DM Mono',monospace",width:44,textAlign:"right" }}>{loc.pct}%</span>
                      <span style={{ fontSize:10,color:"#475569",width:40,textAlign:"right" }}>{loc.m}/{loc.a}</span>
                    </div>
                  ))}
                </div>
            }
          </div>
          {spotStats.length > 1 && (
            <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px",marginBottom:14 }}>
              <div style={lbl}>Spot detail</div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {spotStats.slice(0, 12).map(s => (
                  <div key={s.key} style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:11,color:"var(--fkh-text-muted)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.label}</span>
                    <span style={{ fontSize:11,fontWeight:800,color:P,fontFamily:"'DM Mono',monospace" }}>{s.pct}%</span>
                    <span style={{ fontSize:10,color:"#475569" }}>{s.m}/{s.a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={lbl}>7-day volume by zone</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {SHOT_TYPES.map(t=>{ const total=allByType[t.id]||0,pct=allTotal>0?Math.round((total/allTotal)*100):0;
              const wk7=Array.from({length:7}).map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return(log[d.toLocaleDateString("en-CA")]||[]).filter(s=>s.type===t.id).length;});
              return (<div key={t.id} style={{ background:`${SHOT_COLORS[t.id]}0a`,border:`1px solid ${SHOT_COLORS[t.id]}20`,borderRadius:12,padding:"12px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div><div style={{ fontSize:18,marginBottom:2 }}>{t.emoji}</div><div style={{ fontSize:11,fontWeight:700,color:SHOT_COLORS[t.id],lineHeight:1.2 }}>{t.label}</div></div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:800,color:SHOT_COLORS[t.id],lineHeight:1 }}>{total}</div>
                    <div style={{ fontSize:9,color:"#334155" }}>{pct}% of all</div>
                  </div>
                </div>
                <Spark data={wk7} color={SHOT_COLORS[t.id]} w={120} h={22}/>
                <div style={{ fontSize:8,color:"#334155",marginTop:3,fontFamily:"'DM Mono',monospace" }}>7-DAY TREND</div>
              </div>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ BADGE CELEBRATION ════════════════ */
function BadgeCelebration({ badge, onDismiss }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",
      justifyContent:"center",padding:24,
      background:"radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, rgba(6,11,20,0.92) 60%)" }}>
      {/* click backdrop to dismiss */}
      <div onClick={onDismiss} style={{ position:"absolute",inset:0 }}/>

      <div style={{ position:"relative",textAlign:"center",maxWidth:320,width:"100%",zIndex:1,
        animation:"fkh-scale-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>

        {/* Pulse rings */}
        <div style={{ position:"relative",display:"inline-block",marginBottom:16 }}>
          <div style={{ position:"absolute",inset:"-20px",borderRadius:"50%",
            border:`2px solid ${badge.color}`,
            animation:"fkh-pulse-ring 1.2s ease-out 0.3s infinite",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",inset:"-10px",borderRadius:"50%",
            border:`2px solid ${badge.color}88`,
            animation:"fkh-pulse-ring 1.2s ease-out 0.6s infinite",pointerEvents:"none" }}/>
          <div style={{ width:96,height:96,borderRadius:"50%",
            background:`${badge.color}20`,border:`3px solid ${badge.color}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:48,animation:"fkh-bounce 0.6s ease-out 0.3s 2 both" }}>
            {badge.emoji}
          </div>
        </div>

        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginBottom:8,
          animation:"fkh-fade-up 0.4s ease 0.5s both" }}>
          <div style={{ fontSize:badge.conquest?13:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.3em",
            color:badge.color,textTransform:"uppercase",fontWeight:badge.conquest?800:400 }}>
            {badge.conquest ? "🏆 Conquest Complete!" : badge.kind==="milestone" ? "Rank Up!" : "Badge Unlocked!"}
          </div>
          {badge.cat && BADGE_CATS[badge.cat] && (
            <div style={{ fontSize:9,color:"#64748b",fontFamily:"'DM Mono',monospace",
              letterSpacing:"0.15em",textTransform:"uppercase" }}>
              {BADGE_CATS[badge.cat].emoji} {BADGE_CATS[badge.cat].label}
            </div>
          )}
          {badge.inspo && (
            <div style={{ fontSize:10,color:"#94a3b8",fontStyle:"italic" }}>
              in the lineage of {badge.inspo}
            </div>
          )}
        </div>
        <div style={{ fontSize:26,fontWeight:800,color:"var(--fkh-text)",marginBottom:8,lineHeight:1.2,
          animation:"fkh-fade-up 0.4s ease 0.6s both" }}>
          {badge.name}
        </div>
        <div style={{ fontSize:13,color:"var(--fkh-text-muted)",marginBottom:28,lineHeight:1.5,
          animation:"fkh-fade-up 0.4s ease 0.7s both" }}>
          {badge.desc}
        </div>

        <button onClick={onDismiss}
          style={{ padding:"14px 36px",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",
            background:badge.color,border:"none",color:"#000",
            animation:"fkh-fade-up 0.4s ease 0.8s both",
            boxShadow:`0 0 24px ${badge.color}55` }}>
          Awesome! 🎉
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ MISSION CELEBRATIONS ═══════════════ */

function MissionCelebration({ title, bonusXP, color, onDismiss }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",
      justifyContent:"center",padding:24,
      background:"radial-gradient(ellipse at center, rgba(249,115,22,0.22) 0%, rgba(6,11,20,0.94) 60%)" }}>
      <div onClick={onDismiss} style={{ position:"absolute",inset:0 }}/>
      <div style={{ position:"relative",textAlign:"center",maxWidth:320,width:"100%",zIndex:1,
        animation:"fkh-scale-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{ position:"relative",display:"inline-block",marginBottom:16 }}>
          <div style={{ position:"absolute",inset:"-20px",borderRadius:"50%",
            border:`2px solid ${color}`,animation:"fkh-pulse-ring 1.2s ease-out 0.3s infinite",pointerEvents:"none" }}/>
          <div style={{ width:96,height:96,borderRadius:"50%",
            background:`${color}20`,border:`3px solid ${color}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:44,animation:"fkh-bounce 0.6s ease-out 0.3s 2 both" }}>
            🎯
          </div>
        </div>
        <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.28em",
          color,textTransform:"uppercase",marginBottom:8 }}>
          Daily Mission Complete!
        </div>
        <div style={{ fontSize:22,fontWeight:800,color:"var(--fkh-text)",marginBottom:8,lineHeight:1.25 }}>
          {title}
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:36,fontWeight:800,color,marginBottom:8,lineHeight:1 }}>
          +{bonusXP} XP
        </div>
        <div style={{ fontSize:13,color:"var(--fkh-text-muted)",marginBottom:28,lineHeight:1.5 }}>
          Nice work today — your XP total just went up!
        </div>
        <button onClick={onDismiss}
          style={{ padding:"14px 36px",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",
            background:color,border:"none",color:"#000",boxShadow:`0 0 24px ${color}55` }}>
          Let's Go! 🏀
        </button>
      </div>
    </div>
  );
}

function MissionTaskToast({ label, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position:"fixed",top:"calc(12px + env(safe-area-inset-top, 0px))",left:"50%",
      transform:"translateX(-50%)",zIndex:550,width:"min(340px, calc(100% - 32px))",
      animation:"fkh-fade-up 0.35s ease both" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:14,
        background:"rgba(15,23,42,0.96)",border:"1px solid rgba(34,197,94,0.35)",
        boxShadow:"0 8px 32px rgba(0,0,0,0.45)" }}>
        <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:"rgba(34,197,94,0.15)",
          border:"1.5px solid rgba(34,197,94,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
          ✓
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:9,fontWeight:800,color:"#22c55e",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:2 }}>
            Mission Step Done
          </div>
          <div style={{ fontSize:12,fontWeight:700,color:"var(--fkh-text)",lineHeight:1.35 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ CALENDAR VIEW ═════════════════════ */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_HEADERS = ["M","T","W","T","F","S","S"];

function CalendarView({
  completed, P, S, BG, SF, bd, lbl,
  schedule, programs, enrolledPrograms, programProgress,
  cats, allExercises, workouts,
  onOpenCategory, onOpenExercise,
}) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(()=>new Date(now.getFullYear(),now.getMonth(),1));
  const [selDate,  setSelDate]  = useState(now.toLocaleDateString("en-CA"));

  const calData = useMemo(()=>buildCalendarData(completed),[completed]);

  const year = viewDate.getFullYear();
  const mon  = viewDate.getMonth();
  const monthKey = `${year}-${String(mon+1).padStart(2,"0")}`;

  // Mon-first calendar cells
  const firstDow   = new Date(year,mon,1).getDay();         // 0=Sun
  const startPad   = (firstDow+6)%7;                        // Mon=0 offset
  const daysInMon  = new Date(year,mon+1,0).getDate();
  const cells = [];
  for (let i=0;i<startPad;i++) cells.push(null);
  for (let d=1;d<=daysInMon;d++) cells.push(d);

  const todayStr = now.toLocaleDateString("en-CA");

  // Month-level stats
  const monthEntries = Object.entries(calData).filter(([d])=>d.startsWith(monthKey));
  const monthXP      = monthEntries.reduce((s,[,v])=>s+v.xp,0);
  const monthDays    = monthEntries.length;
  const monthDrills  = monthEntries.reduce((s,[,v])=>s+v.totalDrills,0);
  const monthMaxStr  = monthEntries.length>0 ? Math.max(...monthEntries.map(([,v])=>v.streakDay||0)) : 0;

  const selData      = calData[selDate];
  const selInMonth   = selDate.startsWith(monthKey);
  const isNowMonth   = year===now.getFullYear() && mon===now.getMonth();
  const dayPlan      = useMemo(
    () => buildTrainingDayPlan(selDate, schedule, programs, enrolledPrograms, programProgress, workouts),
    [selDate, schedule, programs, enrolledPrograms, programProgress, workouts]
  );
  const isFutureDay  = new Date(`${selDate}T12:00:00`) > now;

  const monthPlanMap = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMon; d++) {
      const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      map[dateStr] = buildTrainingDayPlan(dateStr, schedule, programs, enrolledPrograms, programProgress, workouts);
    }
    return map;
  }, [year, mon, daysInMon, schedule, programs, enrolledPrograms, programProgress, workouts]);

  const startSession = (exercises, ctx) => {
    if (exercises?.[0]) onOpenExercise?.(exercises[0], exercises, ctx);
  };

  // intensity → opacity suffix (same pattern used app-wide)
  const intensityBg = (count) => {
    if (count===0) return "rgba(255,255,255,0.03)";
    if (count<=2)  return "rgba(255,255,255,0.07)";
    if (count<=5)  return "rgba(255,255,255,0.12)";
    return "rgba(255,255,255,0.20)";
  };

  return (
    <div style={{ padding:"4px 20px 20px" }}>

      {/* ── Month nav ──────────────────────────────────────────── */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
        <button onClick={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}
          style={{ width:36,height:36,borderRadius:8,border:`1px solid ${bd}`,
            background:"transparent",color:"#64748b",fontSize:20,cursor:"pointer",fontWeight:300 }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:16,fontWeight:800,color:"var(--fkh-text)" }}>{MONTH_NAMES[mon]}</div>
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>{year}</div>
        </div>
        <button onClick={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}
          disabled={isNowMonth}
          style={{ width:36,height:36,borderRadius:8,border:`1px solid ${bd}`,
            background:"transparent",color:isNowMonth?"#1e293b":"#64748b",
            fontSize:20,cursor:isNowMonth?"default":"pointer",fontWeight:300 }}>›</button>
      </div>

      {/* ── Day headers ───────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4 }}>
        {DOW_HEADERS.map((d,i)=>(
          <div key={i} style={{ textAlign:"center",fontSize:9,fontWeight:700,
            color:"#334155",fontFamily:"'DM Mono',monospace",padding:"3px 0",letterSpacing:"0.06em" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ fontSize:9, color:"#475569", marginBottom:8, textAlign:"center" }}>
        <span style={{ color:P }}>●</span> planned · colored dots = logged
      </div>

      {/* ── Calendar grid ─────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:14 }}>
        {cells.map((day,i)=>{
          if (!day) return <div key={`p${i}`}/>;
          const dateStr = `${year}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const data    = calData[dateStr];
          const isToday = dateStr===todayStr;
          const isFuture= new Date(dateStr+"T12:00:00")>now;
          const isSel   = dateStr===selDate && selInMonth;
          const cnt     = data?.totalDrills||0;
          const dayPlanCell = monthPlanMap[dateStr];
          const hasPlan = dayPlanCell && !dayPlanCell.isRestDay;

          return (
            <div key={i} onClick={()=> setSelDate(dateStr)}
              style={{
                borderRadius:8,padding:"5px 3px 4px",
                minHeight:54,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"space-between",
                background: isSel ? `${P}28` : intensityBg(cnt),
                border:`1.5px solid ${isSel?P:isToday?`${P}60`:hasPlan?`${P}30`:"transparent"}`,
                cursor:"pointer",
                opacity:isFuture && !hasPlan ? 0.45 : 1,
                transition:"background 0.15s, border 0.15s",
              }}>

              {/* Day number */}
              <div style={{ fontSize:11,fontWeight:isToday?800:500,lineHeight:1,
                color:isSel?P:isToday?P:cnt>0?"var(--fkh-text)":"#475569" }}>
                {day}
              </div>

              {/* Plan + log indicators */}
              <div style={{ display:"flex", gap:2, flexWrap:"wrap", justifyContent:"center", minHeight:10 }}>
                {hasPlan && (
                  <div title="Training planned" style={{ width:5, height:5, borderRadius:"50%", background:P, flexShrink:0 }} />
                )}
                {data?.cats.length>0 && data.cats.slice(0,3).map((cat,ci)=>(
                  <div key={ci} style={{ width:5,height:5,borderRadius:"50%",
                    background:CAT_DOT_COLORS[cat]||"#64748b",flexShrink:0 }}/>
                ))}
              </div>

              {/* XP micro-label */}
              {data?.xp>0&&(
                <div style={{ fontSize:7,fontFamily:"'DM Mono',monospace",
                  color:isSel?P:"#475569",lineHeight:1,marginTop:1 }}>
                  {data.xp}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Month summary ─────────────────────────────────────── */}
      {monthDays>0&&(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
          {[
            { v:monthDays,   l:"Days" },
            { v:monthDrills, l:"Drills" },
            { v:monthXP,     l:"XP" },
            { v:monthMaxStr>0?`${monthMaxStr}🔥`:"—", l:"Best Streak" },
          ].map(({ v,l })=>(
            <div key={l} style={{ background:SF,border:`1px solid ${bd}`,borderRadius:10,
              padding:"9px 6px",textAlign:"center" }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:800,
                color:P,lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:8,color:"#334155",marginTop:3,
                textTransform:"uppercase",letterSpacing:"0.07em" }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Selected day: plan + history ──────────────────────── */}
      {selInMonth && (
        <DayPlanPanel
          plan={dayPlan}
          history={isFutureDay ? null : (selData || null)}
          cats={cats}
          allExercises={allExercises}
          P={P}
          SF={SF}
          bd={bd}
          onOpenCategory={onOpenCategory}
          onOpenExercise={onOpenExercise}
          onStartProgramSession={(exs, ctx) => startSession(exs, ctx)}
          onStartCustomWorkout={startSession}
        />
      )}

      {/* ── Empty month state ─────────────────────────────────── */}
      {monthDays===0&&(
        <div style={{ textAlign:"center",padding:"36px 0" }}>
          <div style={{ fontSize:36,marginBottom:12 }}>📅</div>
          <div style={{ fontSize:14,fontWeight:600,color:"#475569",marginBottom:4 }}>
            No workouts logged this month
          </div>
          <div style={{ fontSize:12,color:"#334155" }}>
            Complete exercises to build your training history.
          </div>
        </div>
      )}
    </div>
  );
}



/* ═══════════════════════ PROFILE VIEW ══════════════════════ */


/* Rich stats panel — lives in Progress → Stats (the single stats home). */
function ProgressStatsPanel({ totalXP, xpData, currentLevel, P, ST, SF, bd, lbl }) {
  const nextLevel = LEVELS.find(l=>l.rank===currentLevel.rank+1);
  const xpInLevel  = totalXP - currentLevel.xpMin;
  const xpSpan     = nextLevel ? nextLevel.xpMin - currentLevel.xpMin : 500;
  const pct        = nextLevel ? Math.min(1, xpInLevel / xpSpan) : 1;
  const xpRows = [
    { label:"Exercises completed", value:xpData.exXP,       unit:`${xpData.exXP/5} × 5 XP` },
    { label:"Workouts completed",  value:xpData.workoutXP,  unit:`${xpData.workoutXP/25} × 25 XP` },
    { label:"Challenges cleared",  value:xpData.challengeXP,unit:`${xpData.challengeXP/100} × 100 XP` },
    { label:"Badges earned",       value:xpData.badgeXP,    unit:`${Math.round(xpData.badgeXP/50)} × 50 XP` },
    { label:"Streak bonus",        value:xpData.streakXP,   unit:"consistency bonus" },
    { label:"Shots made",          value:xpData.shotXP,     unit:`${xpData.shotXP*50} makes → ${xpData.shotXP} XP` },
  ].filter(r=>r.value>0);

  return (
    <>
      {/* Level meter */}
      <div style={{ background:`${P}0d`,border:`1px solid ${P}22`,borderRadius:16,padding:"18px 18px",marginBottom:16 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:800,color:P,lineHeight:1 }}>{totalXP.toLocaleString()}</div>
            <div style={{ fontSize:10,color:"#475569",marginTop:3,letterSpacing:"0.08em" }}>TOTAL XP</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12,fontWeight:700,color:"var(--fkh-text-muted)" }}>{nextLevel ? `→ ${nextLevel.name}` : "Max Level 👑"}</div>
            {nextLevel && <div style={{ fontSize:10,color:"#475569",marginTop:2 }}>{(nextLevel.xpMin-totalXP).toLocaleString()} XP to go</div>}
          </div>
        </div>
        <div style={{ height:10,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden",marginBottom:8 }}>
          <div style={{ height:"100%",borderRadius:99,transition:"width 1s ease",width:`${pct*100}%`,
            background:pct>=1 ? `linear-gradient(90deg,${P},${ST})` : `linear-gradient(90deg,${P}aa,${P})` }}/>
        </div>
        <div style={{ display:"flex",gap:4,marginTop:12,justifyContent:"center" }}>
          {LEVELS.map(l=>{
            const earned = totalXP >= l.xpMin;
            const isCurrent = l.rank === currentLevel.rank;
            const ring = contrastOn(P);
            return (
              <div key={l.rank} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                <div style={{ width:28,height:28,borderRadius:"50%",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
                  background:earned?(isCurrent?`linear-gradient(135deg,${P},${ST})`:P):"rgba(255,255,255,0.04)",
                  border:earned?`2px solid ${isCurrent?ring:`${ring}55`}`:"2px solid rgba(255,255,255,0.07)" }}>
                  {earned?l.emoji:<span style={{ fontSize:9,color:"#334155" }}>?</span>}
                </div>
                <div style={{ fontSize:7,color:earned?P:"#334155",textAlign:"center",fontWeight:isCurrent?800:400,fontFamily:"'DM Mono',monospace",lineHeight:1.2 }}>
                  {l.name.split(" ").map((w,i)=><div key={i}>{w}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shooting milestones */}
      {(()=>{
        const SHOT_TIERS = [
          { name:"100 Makes Club", emoji:"🏀", target:100,   color:"#60a5fa" },
          { name:"1K Shooter",     emoji:"🎯", target:1000,  color:"#f43f5e" },
          { name:"2.5K Shooter",   emoji:"🔮", target:2500,  color:"#8b5cf6" },
          { name:"5K Shooter",     emoji:"🌠", target:5000,  color:"#06b6d4" },
          { name:"10K Shooter",    emoji:"🏆", target:10000, color:"#f97316" },
        ];
        let allMakes = 0;
        try { const sl=JSON.parse(localStorage.getItem("shot_log_v2")||"{}"); allMakes=Object.values(sl).flatMap(v=>v).filter(s=>s.made!==false).length; } catch {}
        const tierIdx = SHOT_TIERS.filter(t=>allMakes>=t.target).length - 1;
        const curTier = tierIdx>=0 ? SHOT_TIERS[tierIdx] : null;
        const nxtTier = SHOT_TIERS[tierIdx+1] || null;
        const pctShot = nxtTier ? Math.min(1,(allMakes-(curTier?.target||0))/(nxtTier.target-(curTier?.target||0))) : 1;
        const tColor = curTier?.color || "#60a5fa";
        return (
          <div style={{ background:`${tColor}0d`,border:`1px solid ${tColor}22`,borderRadius:16,padding:"18px 18px",marginBottom:16 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:800,color:tColor,lineHeight:1 }}>{allMakes.toLocaleString()}</div>
                <div style={{ fontSize:10,color:"#475569",marginTop:3,letterSpacing:"0.08em" }}>SHOTS MADE</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13,fontWeight:700,color:curTier?tColor:"#475569" }}>{curTier ? `${curTier.emoji} ${curTier.name}` : "🏀 Shooting Beginner"}</div>
                {nxtTier && <div style={{ fontSize:10,color:"#475569",marginTop:2 }}>{(nxtTier.target-allMakes).toLocaleString()} makes to {nxtTier.name}</div>}
              </div>
            </div>
            <div style={{ height:8,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden",marginBottom:8 }}>
              <div style={{ height:"100%",borderRadius:99,transition:"width 1s ease",width:`${pctShot*100}%`,background:`linear-gradient(90deg,${tColor}aa,${tColor})` }}/>
            </div>
            <div style={{ display:"flex",gap:4,marginTop:12,justifyContent:"center" }}>
              {SHOT_TIERS.map(t=>(
                <div key={t.name} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
                    background:allMakes>=t.target?`${t.color}22`:"rgba(255,255,255,0.04)",
                    border:`2px solid ${allMakes>=t.target?t.color:"rgba(255,255,255,0.07)"}` }}>
                    {allMakes>=t.target?t.emoji:<span style={{ fontSize:9,color:"#334155" }}>?</span>}
                  </div>
                  <div style={{ fontSize:6,color:allMakes>=t.target?t.color:"#334155",textAlign:"center",fontFamily:"'DM Mono',monospace",lineHeight:1.2 }}>
                    {t.name.split(" ").map((w,i)=><div key={i}>{w}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* XP sources */}
      {xpRows.length>0&&(
        <div style={{ background:SF,border:`1px solid ${bd}`,borderRadius:14,padding:"14px 16px",marginBottom:16 }}>
          <div style={lbl}>XP Breakdown</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {xpRows.map(({ label,value,unit })=>(
              <div key={label} style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ flex:1,fontSize:12,color:"var(--fkh-text-muted)" }}>{label}</div>
                <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>{unit}</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:800,color:P,minWidth:48,textAlign:"right" }}>+{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════ SET TRACKER & WORKOUT TIMER ═══════ */

function ExerciseSetTracker({
  exercise, color, SF,
  prescription, restSecs,
  sets, onSetsChange,
  timersEnabled,
  maxReps, onMaxRepsChange,
  onAllSetsComplete,
  bilateralOn, bilateralUnit, onBilateralChange,
}) {
  const [timerPhase, setTimerPhase] = useState(null); // prep | work | switch | rest
  const [timerSecs, setTimerSecs] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(null);
  const [activeSideIdx, setActiveSideIdx] = useState(0);
  const [liveReps, setLiveReps] = useState(0);
  const liveRepsRef = useRef(0);
  const warnedRef = useRef({ fifteen:false });
  const phaseRef = useRef(null);
  const setIdxRef = useRef(null);
  const sideIdxRef = useRef(0);
  const isBilateral = !!prescription.bilateral;

  const resetSide = useCallback(() => {
    sideIdxRef.current = 0;
    setActiveSideIdx(0);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerPhase(null);
    setActiveSetIdx(null);
    phaseRef.current = null;
    setIdxRef.current = null;
    resetSide();
  }, [resetSide]);

  useEffect(() => { stopTimer(); }, [isBilateral, stopTimer]);

  const completeSet = useCallback((idx, reps=null) => {
    const finalReps = reps ?? liveRepsRef.current;
    const next = sets.map((s, i) => i===idx ? { ...s, done:true, reps:finalReps ?? s.reps, sidesDone:isBilateral ? [true, true] : s.sidesDone } : s);
    onSetsChange(next);
    if (finalReps != null && finalReps > (maxReps||0)) onMaxRepsChange(finalReps);
    const allDone = next.every(s => s.done);
    if (allDone) {
      stopTimer();
      onAllSetsComplete?.();
      return;
    }
    if (timersEnabled && idx < prescription.count - 1) {
      phaseRef.current = "rest";
      setIdxRef.current = idx;
      setActiveSetIdx(idx);
      setTimerPhase("rest");
      setTimerSecs(restSecs);
      warnedRef.current = { fifteen:false };
      resetSide();
      timerAlert("rest");
      announceCountdown(restSecs, restSecs <= TIMER_WARN_SECS ? 900 : 0);
    } else {
      stopTimer();
    }
  }, [sets, onSetsChange, maxReps, onMaxRepsChange, timersEnabled, restSecs, prescription.count, onAllSetsComplete, stopTimer, isBilateral, resetSide]);

  const armWorkInterval = useCallback((idx, sideIdx) => {
    sideIdxRef.current = sideIdx;
    setActiveSideIdx(sideIdx);
    phaseRef.current = "work";
    setIdxRef.current = idx;
    setActiveSetIdx(idx);
    setTimerPhase("work");
    setLiveReps(0);
    liveRepsRef.current = 0;
    const workDur = prescription.value || 30;
    announceCountdown(workDur, workDur <= TIMER_WARN_SECS ? 900 : 0);
    return workDur;
  }, [prescription.value]);

  const armSwitchInterval = useCallback(() => {
    sideIdxRef.current = 1;
    setActiveSideIdx(1);
    phaseRef.current = "switch";
    setTimerPhase("switch");
    timerAlert("switch", switchSpeechFor(prescription, 1));
    return TIMER_SWITCH_SECS;
  }, [prescription]);

  const finishWorkInterval = useCallback((idx, reps=null) => {
    if (isBilateral && sideIdxRef.current === 0) {
      setTimerSecs(TIMER_SWITCH_SECS);
      armSwitchInterval();
      return;
    }
    completeSet(idx, reps);
  }, [isBilateral, armSwitchInterval, completeSet]);

  useEffect(() => {
    if (!timerPhase) return;
    phaseRef.current = timerPhase;
    const id = setInterval(() => {
      setTimerSecs(prev => {
        const next = prev - 1;
        const phase = phaseRef.current;
        const idx = setIdxRef.current;

        if (phase === "prep") {
          if (next >= 1 && next <= TIMER_WARN_SECS) timerAlert("count", next);
          if (next <= 0) {
            timerAlert("begin");
            if (prescription.type === "time") return armWorkInterval(idx, 0);
            stopTimer();
            return 0;
          }
          return next;
        }
        if (phase === "switch") {
          if (next >= 1 && next <= TIMER_WARN_SECS) timerAlert("count", next);
          if (next <= 0) {
            timerAlert("begin");
            return armWorkInterval(idx, 1);
          }
          return next;
        }
        if (phase === "work") {
          if (next >= 1 && next <= TIMER_WARN_SECS) timerAlert("count", next);
          if (next <= 0) {
            if (isBilateral && sideIdxRef.current === 0) return armSwitchInterval();
            completeSet(idx, liveRepsRef.current);
            return 0;
          }
          return next;
        }
        if (phase === "rest") {
          if (next === TIMER_REST_WARN_SECS && !warnedRef.current.fifteen) {
            warnedRef.current.fifteen = true;
            timerAlert("warn");
          }
          if (next >= 1 && next <= TIMER_WARN_SECS) timerAlert("count", next);
          if (next <= 0) {
            const nextIdx = idx + 1;
            timerAlert("begin");
            if (timersEnabled && prescription.type === "time") {
              resetSide();
              return armWorkInterval(nextIdx, 0);
            }
            stopTimer();
            return 0;
          }
          return next;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerPhase, prescription, timersEnabled, isBilateral, armWorkInterval, armSwitchInterval, completeSet, stopTimer, resetSide]);

  useEffect(() => { liveRepsRef.current = liveReps; }, [liveReps]);

  useEffect(() => () => stopTimer(), [exercise?.id, stopTimer]);

  const startTimedSet = idx => {
    if (sets[idx]?.done) return;
    if (!timersEnabled) {
      toggleRepSet(idx);
      return;
    }
    resetSide();
    setIdxRef.current = idx;
    setActiveSetIdx(idx);
    setLiveReps(sets[idx]?.reps || 0);
    liveRepsRef.current = sets[idx]?.reps || 0;
    phaseRef.current = "prep";
    setTimerPhase("prep");
    setTimerSecs(TIMER_PREP_SECS);
    announceCountdown(TIMER_PREP_SECS);
  };

  const toggleRepSet = idx => {
    const s = sets[idx];
    if (!s) return;
    if (s.done) {
      onSetsChange(sets.map((x, i) => i===idx ? { ...x, done:false, sidesDone:isBilateral ? [false, false] : x.sidesDone } : x));
      stopTimer();
    } else if (isBilateral && !(s.sidesDone?.[0] && s.sidesDone?.[1])) {
      const sidesDone = s.sidesDone || [false, false];
      if (!sidesDone[0]) {
        onSetsChange(sets.map((x, i) => i===idx ? { ...x, sidesDone:[true, false] } : x));
        timerAlert("switch", switchSpeechFor(prescription, 1));
      } else {
        const reps = s.reps || 0;
        const next = sets.map((x, i) => i===idx ? { ...x, done:true, sidesDone:[true, true], reps } : x);
        onSetsChange(next);
        if (reps > (maxReps||0)) onMaxRepsChange(reps);
        if (next.every(x => x.done)) onAllSetsComplete?.();
        else if (timersEnabled && idx < prescription.count - 1) {
          setIdxRef.current = idx;
          setActiveSetIdx(idx);
          phaseRef.current = "rest";
          setTimerPhase("rest");
          setTimerSecs(restSecs);
          warnedRef.current = { fifteen:false };
          resetSide();
          timerAlert("rest");
          announceCountdown(restSecs, restSecs <= TIMER_WARN_SECS ? 900 : 0);
        }
      }
    } else {
      const next = sets.map((x, i) => i===idx ? { ...x, done:true } : x);
      onSetsChange(next);
      if (next.every(x => x.done)) onAllSetsComplete?.();
      else if (timersEnabled && idx < prescription.count - 1) {
        setIdxRef.current = idx;
        setActiveSetIdx(idx);
        phaseRef.current = "rest";
        setTimerPhase("rest");
        setTimerSecs(restSecs);
        warnedRef.current = { fifteen:false };
        resetSide();
        timerAlert("rest");
        announceCountdown(restSecs, restSecs <= TIMER_WARN_SECS ? 900 : 0);
      }
    }
  };

  const isTimed = prescription.type === "time";
  const baseTargetLabel = isTimed
    ? `${prescription.value}${prescription.maxValue ? `–${prescription.maxValue}` : ""}s`
    : prescription.value
      ? `${prescription.value}${prescription.maxValue ? `–${prescription.maxValue}` : ""} reps`
      : "complete";
  const targetLabel = isBilateral
    ? `${baseTargetLabel} each ${prescription.bilateral.unit}`
    : baseTargetLabel;

  const timerPhaseLabel = () => {
    if (timerPhase === "rest") return "Rest";
    if (timerPhase === "switch") return switchSpeechFor(prescription, activeSideIdx);
    const setNum = (activeSetIdx ?? 0) + 1;
    const side = exerciseSideLabel(prescription, activeSideIdx);
    if (timerPhase === "prep") return side ? `Set ${setNum} — ${side} — Get Ready` : `Set ${setNum} — Get Ready`;
    if (timerPhase === "work") return side ? `Set ${setNum} — ${side} — Go!` : `Set ${setNum} — Go!`;
    return "";
  };

  const timerPhaseStyle = timerPhase === "work" ? color : timerPhase === "rest" ? "#3b82f6" : timerPhase === "switch" ? "#f59e0b" : "rgba(255,255,255,0.12)";

  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
        <span style={{ fontSize:15 }}>📋</span>
        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
          Sets
        </span>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:8 }}>
          {onBilateralChange && (
            <button type="button" onClick={()=>onBilateralChange(!bilateralOn)} aria-pressed={bilateralOn}
              title={bilateralOn ? "Right then left before rest — tap to do one side per set" : "Tap for right then left before rest"}
              style={{ padding:"4px 9px",borderRadius:999,flexShrink:0,
                border:`1px solid ${bilateralOn ? `${color}66` : "rgba(255,255,255,0.14)"}`,
                background:bilateralOn ? `${color}18` : "rgba(255,255,255,0.04)",
                color:bilateralOn ? color : "#64748b",
                fontSize:10,fontWeight:700,cursor:"pointer",
                display:"flex",alignItems:"center",gap:4,lineHeight:1 }}>
              <span style={{ fontSize:11,opacity:bilateralOn ? 1 : 0.55 }}>{bilateralOn ? "↔" : "•"}</span>
              {bilateralModeLabel(bilateralUnit, bilateralOn)}
            </button>
          )}
          {maxReps > 0 && isTimed && (
            <span style={{ fontSize:10,fontWeight:700,color:"#fbbf24",whiteSpace:"nowrap" }}>
              🏆 Best: {maxReps} reps
            </span>
          )}
        </div>
      </div>

      {timerPhase && (
        <div style={{ marginBottom:12,padding:"14px",borderRadius:12,textAlign:"center",
          background:timerPhase==="work" ? `${color}18` : timerPhase==="rest" ? "rgba(59,130,246,0.12)" : timerPhase==="switch" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
          border:`1.5px solid ${timerPhaseStyle}` }}>
          <div style={{ fontSize:10,fontWeight:700,color:"var(--fkh-text-muted)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4 }}>
            {timerPhaseLabel()}
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:42,fontWeight:800,color:timerPhase==="work"?color:"var(--fkh-text)",lineHeight:1 }}>
            {fmtTimerSecs(timerSecs)}
          </div>
          {timerPhase==="work" && isTimed && (
            <div style={{ marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:12 }}>
              <button onClick={()=>setLiveReps(r=>{ const n=Math.max(0,r-1); liveRepsRef.current=n; return n; })}
                style={{ width:40,height:40,borderRadius:10,border:`1px solid ${color}44`,background:"rgba(0,0,0,0.2)",color:"#fff",fontSize:20,cursor:"pointer" }}>−</button>
              <div style={{ textAlign:"center",minWidth:70 }}>
                <div style={{ fontSize:24,fontWeight:800,color }}>{liveReps}</div>
                <div style={{ fontSize:9,color:"#64748b" }}>reps</div>
              </div>
              <button onClick={()=>setLiveReps(r=>{ const n=r+1; liveRepsRef.current=n; return n; })}
                style={{ width:40,height:40,borderRadius:10,border:"none",background:color,color:"#000",fontSize:20,fontWeight:800,cursor:"pointer" }}>+</button>
            </div>
          )}
          {timerPhase==="work" && (
            <button onClick={()=>finishWorkInterval(activeSetIdx, liveReps)}
              style={{ marginTop:10,padding:"8px 16px",borderRadius:8,border:`1px solid ${color}44`,background:"transparent",color,fontSize:11,fontWeight:700,cursor:"pointer" }}>
              {isBilateral && activeSideIdx === 0 ? "Finish Side Early" : "Finish Set Early"}
            </button>
          )}
          <button onClick={stopTimer}
            style={{ marginTop:8,padding:"6px 12px",borderRadius:6,border:"none",background:"rgba(255,255,255,0.08)",color:"#64748b",fontSize:10,cursor:"pointer" }}>
            Stop Timer
          </button>
        </div>
      )}

      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {Array.from({ length: prescription.count }, (_, idx) => {
          const s = sets[idx] || { done:false };
          const isActive = activeSetIdx === idx && timerPhase;
          const sidesDone = s.sidesDone || [false, false];
          return (
            <div key={idx} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,
              background:s.done ? "rgba(34,197,94,0.08)" : isActive ? `${color}10` : SF,
              border:`1px solid ${s.done ? "rgba(34,197,94,0.25)" : isActive ? `${color}44` : "rgba(255,255,255,0.07)"}`,
              opacity:s.done ? 0.85 : 1 }}>
              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:800,color:"#475569",width:20 }}>{idx+1}</span>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:12,fontWeight:600,color:s.done?"#22c55e":"var(--fkh-text)" }}>{targetLabel}</span>
                {isBilateral && !s.done && (sidesDone[0] || sidesDone[1]) && (
                  <div style={{ fontSize:9,color:"#64748b",marginTop:2 }}>
                    {exerciseSideLabel(prescription, 0)} {sidesDone[0] ? "✓" : "○"} · {exerciseSideLabel(prescription, 1)} {sidesDone[1] ? "✓" : "○"}
                  </div>
                )}
              </div>
              {s.reps != null && s.done && isTimed && (
                <span style={{ fontSize:10,fontWeight:700,color:"#fbbf24" }}>{s.reps} reps</span>
              )}
              {isTimed ? (
                s.done ? (
                  <button onClick={()=>toggleRepSet(idx)}
                    style={{ width:32,height:32,borderRadius:8,border:"1px solid #22c55e",background:"#22c55e",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer" }}>✓</button>
                ) : timersEnabled ? (
                  <button onClick={()=>startTimedSet(idx)} disabled={!!timerPhase}
                    style={{ padding:"6px 12px",borderRadius:8,border:"none",background:timerPhase?`${color}44`:color,color:timerPhase?"#64748b":"#000",fontSize:11,fontWeight:800,cursor:timerPhase?"default":"pointer" }}>
                    ▶ Start
                  </button>
                ) : (
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <button onClick={()=>{ const r=Math.max(0,(s.reps||0)-1); onSetsChange(sets.map((x,i)=>i===idx?{...x,reps:r}:x)); }}
                      style={{ width:26,height:26,borderRadius:6,border:`1px solid ${color}44`,background:"transparent",color,fontSize:14,cursor:"pointer" }}>−</button>
                    <span style={{ fontSize:12,fontWeight:700,color,minWidth:16,textAlign:"center" }}>{s.reps||0}</span>
                    <button onClick={()=>{ const r=(s.reps||0)+1; onSetsChange(sets.map((x,i)=>i===idx?{...x,reps:r}:x)); }}
                      style={{ width:26,height:26,borderRadius:6,border:"none",background:color,color:"#000",fontSize:14,fontWeight:800,cursor:"pointer" }}>+</button>
                    <button onClick={()=>{
                      const r=s.reps||0;
                      const next=sets.map((x,i)=>i===idx?{...x,done:true,reps:r,sidesDone:isBilateral?[true,true]:x.sidesDone}:x);
                      onSetsChange(next);
                      if (r>(maxReps||0)) onMaxRepsChange(r);
                      if (next.every(x=>x.done)) onAllSetsComplete?.();
                    }}
                      style={{ width:32,height:32,borderRadius:8,border:`1.5px solid ${color}60`,background:"transparent",color,fontSize:14,fontWeight:800,cursor:"pointer" }}>○</button>
                  </div>
                )
              ) : (
                <button onClick={()=>toggleRepSet(idx)}
                  title={isBilateral && sidesDone[0] && !sidesDone[1] ? `Mark ${exerciseSideLabel(prescription, 1)} done` : isBilateral ? `Mark ${exerciseSideLabel(prescription, 0)} done` : undefined}
                  style={{ width:32,height:32,borderRadius:8,border:`1.5px solid ${s.done?"#22c55e":sidesDone[0]&&!s.done?`${color}aa`:color+"60"}`,background:s.done?"#22c55e":sidesDone[0]&&!s.done?`${color}33`:"transparent",color:s.done?"#fff":color,fontSize:14,fontWeight:800,cursor:"pointer" }}>
                  {s.done?"✓":sidesDone[0]&&!s.done?"½":"○"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════ EXERCISE DETAIL SHEET ════════════ */
function ExerciseDetailSheet({ exercise, color, bg2, brd, BG, SF, isDone, onToggle, onClose, onNext, completed, favored, onToggleFav, navLabel,
  programContext, setLog, onSetLogChange, maxRepsMap, onMaxRepsChange, bilateralPrefs, onBilateralPrefChange, settings, today }) {
  useWakeLock(true);

  const meta      = exercise.meta || {};
  const cat       = exercise._cat || "speed";
  const catInfo   = CATS[cat] || { label:cat, emoji:"⚡" };

  /* Progress from completed ─────────────────────────────── */
  const timesCompleted = Object.keys(completed).filter(k => {
    const exId = k.split("-").slice(3).join("-");
    return exId === exercise.id && completed[k];
  }).length;

  const lastDate = Object.keys(completed)
    .filter(k => { const exId = k.split("-").slice(3).join("-"); return exId === exercise.id && completed[k]; })
    .map(k => k.split("-").slice(0,3).join("-"))
    .sort().at(-1);

  const fmtLast = lastDate
    ? new Date(lastDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})
    : null;

  const level = timesCompleted >= 10 ? "Advanced" : timesCompleted >= 4 ? "Building" : "Learning";

  /* Video player ─────────────────────────────────────────── */
  const [videoPlaying, setVideoPlaying] = useState(false);
  useEffect(() => { setVideoPlaying(false); }, [exercise?.id]);
  useEffect(() => {
    if (!videoPlaying || !exercise?.id) return;
    track(ANALYTICS_EVENTS.VIDEO_PLAY, {
      exercise_id: exercise.id,
      source: exercise.videoSource === "fkh" ? "fkh" : "youtube",
    });
  }, [videoPlaying, exercise?.id, exercise?.videoSource]);

  /* Progression chain ────────────────────────────────────── */
  const chain       = getChainForExercise(exercise.id);
  const chainStatus = chain ? getChainStatus(chain, completed, ALL_EXERCISES) : null;

  /* Badges / labels ─────────────────────────────────────── */
  const diffColor = { beginner:"#22c55e", intermediate:"#f59e0b", advanced:"#ef4444" }[meta.difficulty] || "#64748b";
  const diffLabel = { beginner:"Beginner", intermediate:"Intermediate", advanced:"Advanced" }[meta.difficulty] || "All Levels";
  const mins      = meta.estimatedDuration ? Math.max(1,Math.round(meta.estimatedDuration/60)) : null;
  const eqLabel   = { none:"No Equipment", cones:"Cones", dumbbells:"Dumbbells", box:"Box / Step", bosu:"BOSU", jump_rope:"Jump Rope", ball:"Basketball", basketball:"Basketball", tennis_ball:"Tennis Ball", basketball_x2:"Two Basketballs", partner:"Partner", resistance_band:"Band" }[meta.equipment] || meta.equipment || "None";
  const spLabel   = { small:"Small Space", medium:"Medium Space", large:"Open Space" }[meta.spaceRequired] || meta.spaceRequired || "";

  const benefits = [...new Set(meta.basketballTransfer||[])].map(b=>BENEFIT_MAP[b]).filter(Boolean);

  /* Set tracking ─────────────────────────────────────────── */
  const rawPrescription = parseExerciseSets(exercise.sets);
  const bilateralOn = isBilateralEnabled(bilateralPrefs, exercise.id, rawPrescription);
  const bilateralUnit = bilateralPrefs?.[exercise.id]?.unit || rawPrescription?.bilateral?.unit || "hand";
  const prescription = resolvePrescription(rawPrescription, bilateralPrefs, exercise.id);
  const restSecs = parseRestSeconds(exercise.rest);
  const logKey = setLogKey(exercise.id, today, programContext);
  const currentSets = setLog?.[logKey]?.sets || [];
  const maxReps = maxRepsMap?.[exercise.id] || 0;
  const timersEnabled = settings?.workoutTimers !== false;

  const handleBilateralToggle = on => {
    onBilateralPrefChange?.(exercise.id, on, bilateralUnit);
  };

  const handleSetsChange = newSets => {
    onSetLogChange?.(logKey, { sets: newSets });
  };

  const handleAllSetsComplete = () => {
    if (!isDone) onToggle();
    if (onNext) setTimeout(() => onNext(), 600);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,backdropFilter:"blur(3px)" }}/>

      {/* Panel */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:680,height:"93vh",zIndex:201,
        display:"flex",flexDirection:"column",
        borderRadius:"20px 20px 0 0",background:BG,
        border:`1px solid ${color}22`,overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",gap:10,
          padding:"14px 16px",borderBottom:`1px solid ${color}20`,
          background:BG,flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:"6px 12px",borderRadius:8,border:`1px solid ${color}30`,
              background:`${color}14`,color,fontSize:12,fontWeight:700,cursor:"pointer" }}>
            ← Back
          </button>
          <span style={{ flex:1,fontSize:12,fontWeight:700,color:`${color}cc`,
            textAlign:"center",letterSpacing:"0.02em" }}>
            {navLabel || `${catInfo.emoji} ${catInfo.label}`}
          </span>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            {onToggleFav&&(
              <button onClick={onToggleFav}
                style={{ padding:"4px 9px",borderRadius:8,
                  border:`1px solid ${favored?"rgba(250,204,21,0.45)":"rgba(250,204,21,0.22)"}`,
                  background:favored?"rgba(250,204,21,0.12)":"transparent",
                  color:favored?"#fbbf24":"rgba(250,204,21,0.5)",
                  fontSize:15,cursor:"pointer",lineHeight:1 }}>
                {favored?"⭐":"☆"}
              </button>
            )}
            {isDone
              ? <button onClick={onToggle} title="Tap to undo" style={{ fontSize:11,fontWeight:800,color:"#22c55e",
                  padding:"6px 12px",background:"rgba(34,197,94,0.12)",cursor:"pointer",
                  border:"1px solid rgba(34,197,94,0.3)",borderRadius:20,whiteSpace:"nowrap" }}>✓ Done</button>
              : <button onClick={onToggle} style={{ fontSize:12,fontWeight:800,color:"#0b1220",
                  padding:"7px 14px",background:"#22c55e",border:"none",borderRadius:20,cursor:"pointer",whiteSpace:"nowrap" }}>✓ Mark Done</button>}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>

          {/* Video — inline player or thumbnail tap-to-play (only when a video exists) */}
          {(exercise.videoId || exercise.videoSource === "fkh") && (videoPlaying ? (
            /* ── Active Player ── */
            <div style={{ position:"relative",background:"#000",aspectRatio:"16/9",overflow:"hidden" }}>
              {exercise.videoSource === "fkh" ? (
                /* FKH / Supabase native video */
                <video
                  src={exercise.videoUrl}
                  controls autoPlay playsInline
                  style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }}
                />
              ) : (
                /* YouTube iframe embed */
                <iframe
                  src={`https://www.youtube.com/embed/${exercise.videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={exercise.videoTitle || exercise.name}
                  style={{ width:"100%",height:"100%",border:"none",display:"block" }}
                />
              )}
              <button
                onClick={() => setVideoPlaying(false)}
                aria-label="Close video player"
                style={{ position:"absolute",top:8,left:8,background:"rgba(0,0,0,0.65)",
                  border:"none",color:"#fff",borderRadius:6,padding:"5px 11px",
                  fontSize:11,cursor:"pointer",fontWeight:700,lineHeight:1.4,zIndex:10 }}>
                ✕ Close
              </button>
            </div>
          ) : exercise.videoSource === "fkh" ? (
            /* ── FKH Thumbnail (tap to play inline) ── */
            <div onClick={() => setVideoPlaying(true)}
              role="button" tabIndex={0} aria-label={`Play ${exercise.name}`}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setVideoPlaying(true); }}
              style={{ display:"block",position:"relative",background:"#000",aspectRatio:"16/9",overflow:"hidden",cursor:"pointer" }}>
              {exercise.thumbnailUrl
                ? <img src={exercise.thumbnailUrl} alt={exercise.name}
                    style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
                : <div style={{ width:"100%",height:"100%",background:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:48 }}>🏀</span>
                  </div>
              }
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 55%)",pointerEvents:"none" }}/>
              <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                width:64,height:64,borderRadius:"50%",background:"rgba(0,0,0,0.72)",border:`2.5px solid ${color}`,
                display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
                <span style={{ color,fontSize:24,marginLeft:5 }}>▶</span>
              </div>
              <div style={{ position:"absolute",top:10,right:10,
                background:"linear-gradient(135deg,#16a34a,#15803d)",
                color:"#fff",fontSize:9,fontWeight:800,letterSpacing:"0.12em",
                padding:"4px 9px",borderRadius:6,textTransform:"uppercase",
                boxShadow:"0 2px 8px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",pointerEvents:"none" }}>
                ✦ FKH Original
              </div>
              <div style={{ position:"absolute",bottom:10,left:12,right:12,
                fontSize:11,color:"rgba(255,255,255,0.9)",fontWeight:600,
                textShadow:"0 1px 3px rgba(0,0,0,0.9)",pointerEvents:"none" }}>
                🎬 {exercise.name}
              </div>
            </div>
          ) : (
            /* ── YouTube Thumbnail (tap to play inline) ── */
            <div onClick={() => setVideoPlaying(true)}
              role="button" tabIndex={0} aria-label={`Play ${exercise.videoTitle || exercise.name}`}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setVideoPlaying(true); }}
              style={{ display:"block",position:"relative",background:"#000",aspectRatio:"16/9",overflow:"hidden",cursor:"pointer" }}>
              <img src={`https://img.youtube.com/vi/${exercise.videoId}/hqdefault.jpg`}
                alt={exercise.videoTitle}
                style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",pointerEvents:"none" }}/>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 55%)",pointerEvents:"none" }}/>
              <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
                width:64,height:64,borderRadius:"50%",background:"rgba(0,0,0,0.72)",border:`2.5px solid ${color}`,
                display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
                <span style={{ color,fontSize:24,marginLeft:5 }}>▶</span>
              </div>
              <div style={{ position:"absolute",bottom:10,left:12,right:12,
                fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:600,
                textShadow:"0 1px 3px rgba(0,0,0,0.9)",pointerEvents:"none" }}>
                📺 {exercise.videoTitle}
              </div>
            </div>
          ))}

          <div style={{ padding:"18px 18px 8px" }}>

            {/* Title + badges */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:8,flexWrap:"wrap" }}>
                <span style={{ fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:800,
                  background:`${color}18`,color,border:`1px solid ${color}30` }}>
                  {exercise.tag}
                </span>
                <span style={{ fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:700,
                  background:`${diffColor}16`,color:diffColor,border:`1px solid ${diffColor}30` }}>
                  {diffLabel}
                </span>
                {mins&&<span style={{ fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:700,
                  background:"rgba(255,255,255,0.06)",color:"var(--fkh-text-muted)",border:"1px solid rgba(255,255,255,0.1)" }}>
                  🕐 {mins} min
                </span>}
              </div>
              <h2 style={{ fontSize:22,fontWeight:800,color:"var(--fkh-text)",margin:0,lineHeight:1.2 }}>
                {exercise.name}
              </h2>
            </div>

            {/* Stat chips */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:18 }}>
              {[
                { label:"Sets",  value:exercise.sets },
                { label:"Rest",  value:exercise.rest==="N/A"?"None":exercise.rest },
                { label:"Gear",  value:eqLabel },
                { label:"Space", value:spLabel },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:SF,borderRadius:10,padding:"10px 6px",
                  textAlign:"center",border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize:8,color:"#475569",fontFamily:"'DM Mono',monospace",
                    letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:10,fontWeight:700,color:"var(--fkh-text)",lineHeight:1.3 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Set tracker */}
            {prescription && onSetLogChange && (
              <ExerciseSetTracker
                exercise={exercise}
                color={color}
                SF={SF}
                prescription={prescription}
                restSecs={restSecs}
                sets={currentSets.length === prescription.count
                  ? currentSets
                  : Array.from({ length: prescription.count }, (_, i) => currentSets[i] || { done:false })}
                onSetsChange={handleSetsChange}
                timersEnabled={timersEnabled}
                maxReps={maxReps}
                onMaxRepsChange={v => onMaxRepsChange?.(exercise.id, v)}
                onAllSetsComplete={handleAllSetsComplete}
                bilateralOn={bilateralOn}
                bilateralUnit={bilateralUnit}
                onBilateralChange={handleBilateralToggle}
              />
            )}

            {/* Description */}
            {exercise.desc&&(
              <p style={{ fontSize:13,color:"var(--fkh-text-muted)",lineHeight:1.65,margin:"0 0 18px" }}>
                {exercise.desc}
              </p>
            )}

            {/* Coach FKH Tips */}
            {exercise.cues?.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>🎓</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                    Coach FKH Tips
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:9,
                  background:bg2,borderRadius:12,padding:"13px 14px",border:`1px solid ${brd}` }}>
                  {exercise.cues.map((cue,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ color,fontWeight:800,fontSize:13,flexShrink:0,lineHeight:1.55 }}>→</span>
                      <span style={{ fontSize:13,color:"var(--fkh-text)",lineHeight:1.55,fontWeight:500 }}>{cue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coach Tips (coachNotes — FKH first-party string) */}
            {exercise.coachNotes&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>💡</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                    Coach Tips
                  </span>
                </div>
                <div style={{ background:`${color}0d`,borderRadius:12,padding:"13px 14px",
                  border:`1px solid ${color}28`,borderLeft:`3px solid ${color}` }}>
                  <p style={{ margin:0,fontSize:13,color:"var(--fkh-text)",lineHeight:1.65,fontWeight:500 }}>
                    {exercise.coachNotes}
                  </p>
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {exercise.commonMistakes?.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>⚠️</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:"#f59e0b80",textTransform:"uppercase" }}>
                    Common Mistakes
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:9,
                  background:"rgba(245,158,11,0.05)",borderRadius:12,padding:"13px 14px",
                  border:"1px solid rgba(245,158,11,0.18)" }}>
                  {exercise.commonMistakes.map((m,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ color:"#f59e0b",fontWeight:800,fontSize:13,flexShrink:0,lineHeight:1.55 }}>✕</span>
                      <span style={{ fontSize:13,color:"#fcd34d",lineHeight:1.55,fontWeight:500 }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How To Progress */}
            {exercise.progressionTips?.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>🚀</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:"#a78bfa80",textTransform:"uppercase" }}>
                    How To Progress
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:9,
                  background:"rgba(167,139,250,0.06)",borderRadius:12,padding:"13px 14px",
                  border:"1px solid rgba(167,139,250,0.2)" }}>
                  {exercise.progressionTips.map((tip,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ color:"#a78bfa",fontWeight:800,fontSize:13,flexShrink:0,lineHeight:1.55 }}>→</span>
                      <span style={{ fontSize:13,color:"#c4b5fd",lineHeight:1.55,fontWeight:500 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Athlete Benefits */}
            {benefits.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>⚡</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                    Athlete Benefits
                  </span>
                </div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:7 }}>
                  {benefits.map((b,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:6,
                      padding:"7px 13px",borderRadius:20,
                      background:`${color}10`,border:`1px solid ${color}28` }}>
                      <span style={{ fontSize:14 }}>{b.emoji}</span>
                      <span style={{ fontSize:12,fontWeight:700,color }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress tracking */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                <span style={{ fontSize:15 }}>📈</span>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                  letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                  Your Progress
                </span>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                {[
                  { label:"Times Done", value:timesCompleted>0?`${timesCompleted}×`:"—" },
                  { label:"Last Done",  value:fmtLast||"—" },
                  { label:"Level",      value:level },
                ].map(({ label, value })=>(
                  <div key={label} style={{ background:SF,borderRadius:10,padding:"12px 8px",
                    textAlign:"center",border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:800,color,lineHeight:1 }}>
                      {value}
                    </div>
                    <div style={{ fontSize:8,color:"#334155",marginTop:4,
                      textTransform:"uppercase",letterSpacing:"0.08em" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progression Track */}
            {chain && chainStatus ? (
              <div style={{ marginBottom:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                  <span style={{ fontSize:15 }}>{chain.emoji}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:"#475569",textTransform:"uppercase" }}>
                    {chain.name}
                  </span>
                  <span style={{ marginLeft:"auto",fontSize:9,color:"#334155",
                    fontFamily:"'DM Mono',monospace" }}>
                    {chainStatus.progress}/{chainStatus.total}
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {chainStatus.steps.map((step, i) => {
                    const isThis   = step.exId === exercise.id;
                    const lockPct  = step.unlocksAt > 0 ? Math.min(1, step.count / step.unlocksAt) : 1;
                    const stepName = step.ex?.name || step.exId;
                    return (
                      <div key={step.exId} style={{
                        borderRadius:10,padding:"10px 12px",
                        border: isThis ? `1.5px solid ${color}55`
                              : step.unlocked ? "1px solid rgba(255,255,255,0.08)"
                              : "1px dashed rgba(255,255,255,0.04)",
                        background: isThis ? `${color}0e`
                                  : step.unlocked ? "rgba(255,255,255,0.025)"
                                  : "rgba(0,0,0,0.2)",
                        opacity: step.unlocked ? 1 : 0.4,
                        transition:"all 0.2s",
                      }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:9 }}>
                          <span style={{ fontSize:14,lineHeight:1.4,flexShrink:0 }}>
                            {!step.unlocked ? "🔒"
                              : step.mastered ? "✅"
                              : isThis ? "▶"
                              : "○"}
                          </span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                              <span style={{ fontSize:12,fontWeight:700,lineHeight:1.25,
                                color: isThis ? color
                                     : step.mastered ? "#22c55e"
                                     : step.unlocked ? "var(--fkh-text)"
                                     : "#475569" }}>
                                {stepName}
                              </span>
                              {isThis && (
                                <span style={{ fontSize:9,color,fontFamily:"'DM Mono',monospace",
                                  background:`${color}15`,padding:"1px 7px",borderRadius:20 }}>
                                  you are here
                                </span>
                              )}
                            </div>
                            {step.unlocked && !step.mastered && (
                              <div style={{ marginTop:6 }}>
                                <div style={{ height:3,background:"rgba(255,255,255,0.07)",
                                  borderRadius:99,overflow:"hidden",marginBottom:3 }}>
                                  <div style={{ height:"100%",borderRadius:99,
                                    background:isThis ? color : "#475569",
                                    width:`${lockPct*100}%`,transition:"width 0.6s ease" }}/>
                                </div>
                                <div style={{ fontSize:9,color:"#475569",
                                  fontFamily:"'DM Mono',monospace" }}>
                                  {step.count}/{step.unlocksAt} sessions → unlocks next
                                </div>
                              </div>
                            )}
                            {step.mastered && (
                              <div style={{ fontSize:9,color:"#22c55e",marginTop:2,
                                fontFamily:"'DM Mono',monospace" }}>
                                ✓ {step.count} sessions complete
                              </div>
                            )}
                            {!step.unlocked && (
                              <div style={{ fontSize:9,color:"#334155",marginTop:2 }}>
                                Complete the previous exercise to unlock
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ borderRadius:12,border:"1px dashed rgba(255,255,255,0.07)",
                background:"rgba(255,255,255,0.02)",padding:"11px 14px",opacity:0.5,marginBottom:6 }}>
                <div style={{ fontSize:10,color:"#334155" }}>
                  📈 This exercise isn't part of a tracked progression track yet.
                </div>
              </div>
            )}

          </div>
          <div style={{ height:20 }}/>
        </div>

        {/* Sticky footer */}
        <div style={{ padding:"12px 16px",
          paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",
          borderTop:`1px solid ${color}20`,background:BG,
          display:"flex",gap:10,flexShrink:0 }}>
          <button onClick={onToggle}
            style={{ flex:1,padding:"13px",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer",
              background:isDone?"rgba(34,197,94,0.12)":color,
              border:isDone?"1px solid rgba(34,197,94,0.3)":"none",
              color:isDone?"#22c55e":"#000",transition:"all 0.2s" }}>
            {isDone?"✓ Completed — Undo?":"Mark Complete ✓  +5 XP"}
          </button>
          <button onClick={onNext||onClose}
            style={{ padding:"13px 18px",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",
              background:SF,border:"1px solid rgba(255,255,255,0.09)",color:"var(--fkh-text-muted)" }}>
            {onNext?"Next →":"Close"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════ DRILL CARD ═══════════════════════ */
function DrillCard({ w, color, bg2, brd, isDone, onToggle, onViewDetail, favored, onFav }) {
  // color-derived helpers local to this card
  const metaBg  = `${color}12`;
  const metaBrd = `${color}28`;
  const cueTxt  = `${color}cc`;
  return (
    <div onClick={onViewDetail}
      style={{ background:`${color}08`,border:`1px solid ${isDone?color:metaBrd}`,borderRadius:16,overflow:"hidden",marginBottom:14,display:"flex",transition:"border-color 0.2s",cursor:onViewDetail?"pointer":"default" }}>
      <div onClick={onViewDetail}
        style={{ flexShrink:0,width:128,position:"relative",display:"block",background:"#0f172a",cursor:"pointer" }}>
        <img src={w.videoSource==="fkh"&&w.thumbnailUrl ? w.thumbnailUrl : `https://img.youtube.com/vi/${w.videoId}/mqdefault.jpg`}
          alt="" style={{ width:128,height:90,objectFit:"cover",display:"block" }}/>
        <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-55%)",width:26,height:26,borderRadius:"50%",background:`${color}cc`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:700,border:`1px solid ${color}` }}>▶</div>
        {w.videoSource==="fkh"&&<div style={{ position:"absolute",top:4,right:4,background:"#15803d",color:"#fff",fontSize:7,fontWeight:800,padding:"2px 5px",borderRadius:4,letterSpacing:"0.06em" }}>✦ FKH</div>}
      </div>
      <div style={{ flex:1,padding:"11px 13px",minWidth:0 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6 }}>
          <div>
            <span style={{ fontSize:9,padding:"2px 8px",borderRadius:20,fontWeight:800,display:"inline-block",marginBottom:4,background:bg2,color,border:`1px solid ${brd}`,letterSpacing:"0.04em" }}>{w.tag}</span>
            {w.trainer && <span style={{ fontSize:9,padding:"2px 8px",borderRadius:20,display:"inline-block",marginBottom:4,marginLeft:4,background:metaBg,color,border:`1px solid ${metaBrd}`,opacity:0.8 }}>📹 {w.trainer}</span>}
            <div style={{ fontSize:13,fontWeight:700,color:"var(--fkh-text)",lineHeight:1.2 }}>{w.name}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
            {onFav&&<button onClick={e=>{e.stopPropagation();onFav();}}
              style={{ width:30,height:30,borderRadius:8,
                border:`1px solid ${favored?"rgba(250,204,21,0.45)":"rgba(250,204,21,0.22)"}`,
                background:favored?"rgba(250,204,21,0.1)":"transparent",
                color:favored?"#fbbf24":"rgba(250,204,21,0.5)",
                fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              {favored?"⭐":"☆"}
            </button>}
            <button onClick={e=>{e.stopPropagation();onToggle();}} style={{ width:44,height:44,borderRadius:"50%",border:`2px solid ${isDone?color:metaBrd}`,background:isDone?color:metaBg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,fontWeight:800,color:isDone?"#000":color }}>
              {isDone?"✓":"○"}
            </button>
          </div>
        </div>
        <div style={{ display:"flex",gap:5,marginBottom:8,flexWrap:"wrap" }}>
          <span style={{ fontSize:10,padding:"3px 8px",background:metaBg,borderRadius:6,fontFamily:"'DM Mono',monospace",color,border:`1px solid ${metaBrd}`,fontWeight:600 }}>{w.sets}</span>
          {w.rest!=="N/A"&&<span style={{ fontSize:10,padding:"3px 8px",background:metaBg,borderRadius:6,fontFamily:"'DM Mono',monospace",color,border:`1px solid ${metaBrd}`,fontWeight:600 }}>Rest {w.rest}</span>}
        </div>
        <p style={{ fontSize:12,color:`${color}bb`,lineHeight:1.55,margin:"0 0 8px" }}>{w.desc}</p>
        <div style={{ display:"flex",flexDirection:"column",gap:4,marginBottom:10,paddingLeft:2 }}>
          {w.cues.map((c,i)=>(
            <div key={i} style={{ fontSize:11,color:cueTxt,display:"flex",lineHeight:1.45,gap:5 }}>
              <span style={{ color,fontWeight:700,flexShrink:0 }}>→</span>{c}
            </div>
          ))}
        </div>
        <button onClick={e=>{e.stopPropagation();onViewDetail();}}
          style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,padding:"7px 12px",borderRadius:10,fontWeight:700,background:bg2,color,border:`1px solid ${brd}`,letterSpacing:"0.01em",cursor:"pointer",width:"100%",textAlign:"left" }}>
          <span style={{ fontSize:13 }}>▶</span> {w.videoTitle || w.name}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA MIGRATION LAYER
   ───────────────────────────────────────────────────────────────
   A kid's progress (s_done, fkh-programs, badges, shot logs, …) lives
   in localStorage. App updates only swap the JS bundle — they never
   touch localStorage — so progress already survives updates by default.

   The ONE thing that can still break is changing the *shape* of a
   stored object. When you do that, add a migration here instead of
   risking a broken read. GOLDEN RULE: migrations transform data
   forward, they NEVER delete a kid's progress.

   To add a migration: append a function to MIGRATIONS that upgrades
   storage by one version, then bump DATA_VERSION to match the new
   length. MIGRATIONS[0] runs to reach v1, MIGRATIONS[1] to reach v2…
═══════════════════════════════════════════════════════════════ */
const DATA_VERSION_KEY = "fkh-data-version";

const MIGRATIONS = [
  // ── v0 → v1: baseline ──────────────────────────────────────────
  () => {},
  // ── v1 → v2: enable workout timers for existing installs ───────
  () => {
    try {
      const raw = JSON.parse(localStorage.getItem("s_settings") || "{}");
      if (raw.workoutTimers === undefined) {
        raw.workoutTimers = true;
        localStorage.setItem("s_settings", JSON.stringify(raw));
      }
    } catch {}
  },
  // ── v2 → v3: program progress only counts after Start Program ───
  () => {
    try {
      const enrolled = JSON.parse(localStorage.getItem("fkh-programs") || "{}");
      let progress = JSON.parse(localStorage.getItem("fkh-program-progress") || "{}");
      let progChanged = false;
      let enrollChanged = false;

      for (const progId of Object.keys(progress)) {
        if (!enrolled[progId]) {
          delete progress[progId];
          progChanged = true;
        }
      }

      for (const [progId, enr] of Object.entries(enrolled)) {
        const startDate = enr.startDate;
        if (!startDate) continue;
        const startedAt = enr.startedAt
          ?? new Date(startDate + "T12:00:00").getTime();
        if (!enr.startedAt) {
          enrolled[progId] = { ...enr, startedAt };
          enrollChanged = true;
        }

        const existing = progress[progId] || {};
        const anchor = existing._meta?.enrollmentStartedAt ?? startedAt;
        const cleaned = { _meta: { enrollmentStartedAt: anchor } };

        for (const [slot, exs] of Object.entries(existing)) {
          if (slot === "_meta" || typeof exs !== "object" || !exs) continue;
          const kept = {};
          for (const [exId, mark] of Object.entries(exs)) {
            // Drop legacy string marks (preview-before-enroll); keep timestamped marks.
            if (typeof mark === "object" && mark?.d && mark.t >= anchor) {
              kept[exId] = mark;
            }
          }
          if (Object.keys(kept).length) cleaned[slot] = kept;
        }

        progress[progId] = cleaned;
        progChanged = true;
      }

      if (progChanged) localStorage.setItem("fkh-program-progress", JSON.stringify(progress));
      if (enrollChanged) localStorage.setItem("fkh-programs", JSON.stringify(enrolled));
    } catch {}
  },
  // ── v3 → v4: recover program progress wiped by v3 migration or sync ──
  // Rebuilds session marks from s_done — never deletes existing marks.
  () => {
    try {
      persistProgramProgressRecovery();
    } catch (e) {
      console.error("[fkh] program progress recovery failed", e);
    }
  },
  // ── v4 → v5: legacy favoritePlayer → split Settings fields ─────
  () => {
    try {
      const raw = JSON.parse(localStorage.getItem("s_settings") || "{}");
      const next = normalizeProfileFields(raw);
      if (JSON.stringify(next) !== JSON.stringify(raw)) {
        localStorage.setItem("s_settings", JSON.stringify(next));
      }
    } catch { /* ignore */ }
  },
  // ── v5 → v6: signed-in athletes skip onboarding after app updates ──
  () => {
    try {
      if (localStorage.getItem("s_onboarded")) return;
      if (hasStoredAuthSession()) {
        localStorage.setItem("s_onboarded", "1");
        return;
      }
      const hasUsername = Boolean(localStorage.getItem("fkh-last-username"));
      const hasCloudSave = parseInt(localStorage.getItem("fkh-cloud-version") || "0", 10) > 0;
      if (hasUsername && hasCloudSave) {
        localStorage.setItem("s_onboarded", "1");
      }
    } catch { /* ignore */ }
  },
  // ── v6 → v7: normalize shot_log_v2 (fixes Shots tab white-screen) ──
  () => {
    try {
      const normalized = normalizeShotLog(readStoredObject("shot_log_v2"));
      localStorage.setItem("shot_log_v2", JSON.stringify(normalized));
    } catch { /* ignore */ }
  },
  // ── v7 → v8: repair null / array poison in object-shaped localStorage keys ──
  () => {
    repairStoredObjectKeys();
  },
];

const DATA_VERSION = MIGRATIONS.length; // keep in lock-step automatically

/** Rebuild fkh-program-progress from s_done when session marks were lost. */
function persistProgramProgressRecovery() {
  try {
    const enrolled = readStoredObject("fkh-programs");
    const progress = readStoredObject("fkh-program-progress");
    const completed = readStoredObject("s_done");
    const next = rehydrateProgramProgressFromCompleted({
      programs: PROGRAMS,
      enrolledPrograms: enrolled,
      programProgress: progress,
      completed,
    });
    if (next === progress) return false;
    safePersistKey("fkh-program-progress", next);
    return true;
  } catch {
    return false;
  }
}

// Keys that indicate a real, pre-existing install (vs. a fresh device).
const KNOWN_DATA_KEYS = ["s_settings", "s_done", "fkh-programs", "shot_log_v2"];
const hasExistingData = () => KNOWN_DATA_KEYS.some(k => localStorage.getItem(k) != null);

function runDataMigrations() {
  let stored;
  try { stored = localStorage.getItem(DATA_VERSION_KEY); }
  catch { return; } // localStorage blocked (private mode, etc.) — nothing to do

  // Fresh install: no version stamp and no app data. Stamp the current
  // version and skip legacy migrations — they assume old shapes that a
  // brand-new device never had.
  if (stored == null && !hasExistingData()) {
    try { localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION)); } catch {}
    return;
  }

  const from = parseInt(stored || "0", 10) || 0;
  if (from >= DATA_VERSION) return;

  for (let v = from; v < DATA_VERSION; v++) {
    try {
      MIGRATIONS[v]?.();
    } catch (e) {
      // Stop and do NOT stamp the version, so it retries on the next
      // load rather than silently skipping a failed upgrade.
      console.error(`[fkh] data migration to v${v + 1} failed — left at v${v}`, e);
      return;
    }
  }
  try { localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION)); } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   ID-STABILITY GUARD (dev only)
   ───────────────────────────────────────────────────────────────
   Progress is keyed by exercise id (s_done) and program id
   (fkh-programs). If an update renames or removes an id that stored
   progress points to, that history silently orphans — checkmarks
   vanish, a kid loses their place. This warns loudly in the dev
   console so an accidental rename is caught before it ships.
   Completely inert in production builds.
═══════════════════════════════════════════════════════════════ */
function checkIdStability() {
  if (!(import.meta.env && import.meta.env.DEV)) return;
  try {
    const knownEx  = new Set(Object.keys(ALL_EXERCISES));
    const knownPgm = new Set(PROGRAMS.map(p => p.id));

    // Exercise ids referenced by completion history (s_done):
    const done = JSON.parse(localStorage.getItem("s_done") || "{}");
    const orphanEx = new Set();
    for (const key of Object.keys(done)) {
      if (!done[key]) continue;
      const exId = key.split("-").slice(3).join("-"); // strip the YYYY-MM-DD prefix
      if (exId && !knownEx.has(exId)) orphanEx.add(exId);
    }

    // Program ids referenced by enrollment (fkh-programs):
    const enrolled = JSON.parse(localStorage.getItem("fkh-programs") || "{}");
    const orphanPgm = Object.keys(enrolled).filter(id => !knownPgm.has(id));

    if (orphanEx.size || orphanPgm.length) {
      console.warn(
        "%c⚠ [fkh] ID-stability guard: stored progress references ids missing from the current bundle.\n" +
        "This history will NOT map onto the new plans. Did an id get renamed or removed?",
        "color:#f97316;font-weight:bold;"
      );
      if (orphanEx.size)  console.warn("  Orphaned exercise ids:", [...orphanEx]);
      if (orphanPgm.length) console.warn("  Orphaned program ids:", orphanPgm);
      console.warn("  Fix: keep the original id and edit name/desc/etc. instead — or add a migration to remap the old id.");
    }
  } catch (e) {
    console.warn("[fkh] ID-stability guard failed to run", e);
  }
}

// Run once at module load — before the component mounts and before any
// useState initializer reads localStorage.
recoverFromSyncBackupIfNeeded();
runDataMigrations();
persistProgramProgressRecovery();
checkIdStability();

function loadSettingsFromStorage(defaults) {
  try {
    const raw = readStoredObject("s_settings");
    if (raw.athleteAge && !raw.dateOfBirth) {
      const year = new Date().getFullYear() - Number(raw.athleteAge);
      raw.dateOfBirth = `${year}-06-15`;
    }
    delete raw.athleteAge;
    const merged = mergeUserSettings(raw, {});
    return withStoredAvatar(migrateIdentitySettings(migrateThemeSettings({ ...defaults, ...merged })));
  } catch {
    return { ...defaults };
  }
}

/* ═══════════════════════ MAIN APP ═══════════════════════ */
export default function FitKidHooperApp() {
  const [settings, setSettings] = useState(() => loadSettingsFromStorage(DEFAULT));
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayLikePicker, setShowPlayLikePicker] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState("signin");
  const [inviteCode, setInviteCode] = useState(() => consumeInviteDeepLink());
  const [missionDeepLink, setMissionDeepLink] = useState(() => consumeMissionDeepLink());
  const [navDeepLink, setNavDeepLink] = useState(() => consumeNavigationDeepLink());
  const [openMessagesInbox, setOpenMessagesInbox] = useState(false);
  const auth = useAuth(settings);
  const { squadNotifications, unreadMessages, friendRequests, feedActivity, challengeActivity, markSquadTabSeen, refreshSquadNotifications } = useSquadNotifications(auth.isSignedIn, auth.username);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideMode, setGuideMode] = useState("explore");
  const [shotLogTick, setShotLogTick] = useState(0);
  const [view, setView] = useState("home");
  const [prevView, setPrevView] = useState("home");
  const [activeCat, setActiveCat] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
  const [detailList, setDetailList] = useState([]);
  const [schedTab, setSchedTab] = useState("week");
  const [scheduleDetailDate, setScheduleDetailDate] = useState(null);
  const [celebratedBadges, setCelebratedBadges] = useState(()=>{
    try{return new Set(JSON.parse(localStorage.getItem("fkh-celebrated-badges")||"[]"));}catch{return new Set();}
  });
  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const [ledger, setLedger] = useState(()=>readLocalLedger());
  const [benchmarkPBs, setBenchmarkPBs] = useState(()=>readLocalPBs());
  const [growthLog, setGrowthLog] = useState(()=>readGrowthLog());
  const handleLogHeight = useCallback(h=>setGrowthLog(addGrowthEntry(h)),[]);
  const [progressTab, setProgressTab] = useState("overview");
  const [programSegment, setProgramSegment] = useState(() => {
    try {
      return Object.keys(readStoredObject("fkh-programs")).length ? "myPlan" : "forYou";
    } catch { return "forYou"; }
  });
  const [programsHubSection, setProgramsHubSection] = useState("plans");
  const [lockerBadgesOpen, setLockerBadgesOpen] = useState(true);
  const [showFindDrills, setShowFindDrills] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(() => {
    try { return localStorage.getItem("fkh-workout-open") === "1"; } catch { return false; }
  });
  const [templateScrolledEnd, setTemplateScrolledEnd] = useState(false);
  const [friendsFocusTick, setFriendsFocusTick] = useState(0);
  const [playerHighlight, setPlayerHighlight] = useState(null);

  const openPlayerHighlight = useCallback(({ videoId, title }) => {
    setPlayerHighlight({ videoId, title });
  }, []);

  useEffect(() => {
    if (view === "profile") {
      setProgressTab("overview");
      setView("progress");
    }
  }, [view]);

  useEffect(() => {
    try { localStorage.setItem("fkh-workout-open", workoutOpen ? "1" : "0"); } catch {}
  }, [workoutOpen]);

  const focusSquad = useCallback(() => {
    setView("squad");
    setFriendsFocusTick(t => t + 1);
  }, []);

  const navigateToMessages = useCallback(() => {
    setView("squad");
    setOpenMessagesInbox(true);
    setFriendsFocusTick(t => t + 1);
  }, []);

  const openLegendsJourney = useCallback(() => {
    setView("boards");
  }, []);

  const openProgramsSection = useCallback((section = "plans") => {
    setProgramsHubSection(section);
    setView("programs");
  }, []);
  const [badgeDates, setBadgeDates] = useState(() => readStoredObject("fkh-badge-dates"));
  const [lastEarnedBadge, setLastEarnedBadge] = useState(null);
  const [completed, setCompleted] = useState(() => readStoredObject("s_done"));
  const [programProgress, setProgramProgress] = useState(() => readStoredObject("fkh-program-progress"));
  const [setLog, setSetLog] = useState(() => readStoredObject("fkh-set-log"));
  const [maxRepsMap, setMaxRepsMap] = useState(() => readStoredObject("fkh-max-reps"));
  const [bilateralPrefs, setBilateralPrefs] = useState(() => readStoredObject("fkh-bilateral-prefs"));
  const [detailContext, setDetailContext] = useState(null);
  const [enrolledPrograms, setEnrolledPrograms] = useState(() => readStoredObject("fkh-programs"));
  const [selectedProgram, setSelectedProgram] = useState(null); // programId string when drill-in open
  const [missionLog, setMissionLog] = useState(() => readStoredObject("fkh-missions"));
  const [missionCelebration, setMissionCelebration] = useState(null);
  const [missionTaskToast, setMissionTaskToast] = useState(null);
  const celebratedMissionTasksRef = useRef(new Set());
  const [favorites, setFavorites] = useState(() => readStoredObject("fkh-favs", { exercises: {}, workouts: {}, programs: {} }));
  const reloadAthleteStateFromStorage = useCallback(() => {
    persistProgramProgressRecovery();
    setSettings(loadSettingsFromStorage(DEFAULT));
    setCompleted(readStoredObject("s_done"));
    setProgramProgress(readStoredObject("fkh-program-progress"));
    setEnrolledPrograms(readStoredObject("fkh-programs"));
    setMissionLog(readStoredObject("fkh-missions"));
    setFavorites(readStoredObject("fkh-favs", { exercises: {}, workouts: {}, programs: {} }));
    setSetLog(readStoredObject("fkh-set-log"));
    setMaxRepsMap(readStoredObject("fkh-max-reps"));
    setBadgeDates(readStoredObject("fkh-badge-dates"));
    setStrDay(localStorage.getItem("s_strday") || "Day 1");
    setLedger(readLocalLedger());
    setBenchmarkPBs(readLocalPBs());
    setGrowthLog(readGrowthLog());
  }, []);

  const hydrateProfileIntoState = useCallback(async (userId) => {
    if (!userId) return;
    if (!readStoredAvatar()) {
      await restoreLocalAvatarFromCloud(userId);
    }
    const patch = await fetchAthleteProfilePatch(userId);
    setSettings(prev => {
      const next = withStoredAvatar(migrateThemeSettings(
        mergeProfilePatch(normalizeProfileFields(prev), patch)
      ));
      persistHydratedSettings(next, prev);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, []);

  const applyCloudSync = useCallback(async () => {
    const result = await auth.syncNow();
    persistProgramProgressRecovery();
    reloadAthleteStateFromStorage();
    if (auth.user?.id) await hydrateProfileIntoState(auth.user.id);
    if (result?.ok) refreshSquadNotifications();
    return result;
  }, [auth.syncNow, auth.user?.id, reloadAthleteStateFromStorage, hydrateProfileIntoState, refreshSquadNotifications]);
  const [reportPeriod, setReportPeriod] = useState("30d");
  const [strDay, setStrDay] = useState(()=>localStorage.getItem('s_strday')||'Day 1');
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (localStorage.getItem("s_onboarded")) return false;
    if (hasStoredAuthSession()) return false;
    return settings.athleteName === DEFAULT.athleteName;
  });
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourStepRef = useRef(0);
  tourStepRef.current = tourStep;
  const [showTourPrompt, setShowTourPrompt] = useState(() => shouldShowTourPrompt());
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [homeMissionFocus, setHomeMissionFocus] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState(null);
  const openSchedule = useCallback((returnView = "home", tab = "calendar") => {
    setPrevView(returnView);
    setSchedTab(tab);
    setScheduleDetailDate(null);
    setView("schedule");
  }, []);

  const finishTour = useCallback(() => {
    markTourComplete();
    setTourActive(false);
    setTourStep(0);
    setShowTourPrompt(false);
    document.body.style.overflow = "";
    track(ANALYTICS_EVENTS.ONBOARDING_TOUR_COMPLETE, {});
  }, []);

  const tourHandlersRef = useRef({ setView, setProgressTab, setProgramsHubSection, setSelectedProgram });
  tourHandlersRef.current = { setView, setProgressTab, setProgramsHubSection, setSelectedProgram };

  const goToTourStep = useCallback((index) => {
    const step = TOUR_STEPS[index];
    if (!step) return;
    applyTourStep(step, tourHandlersRef.current);
    setTourStep(index);
  }, []);

  const advanceTour = useCallback(() => {
    const prev = tourStepRef.current;
    if (prev >= TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    goToTourStep(prev + 1);
  }, [finishTour, goToTourStep]);

  const backTour = useCallback(() => {
    const prev = tourStepRef.current;
    if (prev <= 0) return;
    goToTourStep(prev - 1);
  }, [goToTourStep]);

  const openGuide = useCallback((mode = "explore") => {
    setGuideMode(mode);
    setShowGuide(true);
  }, []);

  const startTour = useCallback(() => {
    setShowGuide(false);
    setShowSettings(false);
    setShowTourPrompt(false);
    setTourActive(true);
    goToTourStep(0);
  }, [goToTourStep]);

  const dismissTourPromptBanner = useCallback(() => {
    dismissTourPrompt();
    setShowTourPrompt(false);
  }, []);

  const dismissNotificationPromptBanner = useCallback(() => {
    dismissNotificationPrompt();
    setShowNotificationPrompt(false);
  }, []);

  const enableNotificationsFromPrompt = useCallback(async () => {
    if (!auth.isSignedIn) return { ok: false, reason: "not_signed_in" };
    const result = await subscribeToPush();
    if (result.ok) setShowNotificationPrompt(false);
    return result;
  }, [auth.isSignedIn]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isSignedIn) return;
    localStorage.setItem("s_onboarded", "1");
    setShowOnboarding(false);
  }, [auth.loading, auth.isSignedIn]);

  useEffect(() => {
    if (!auth.isSignedIn || tourActive || showOnboarding) {
      setShowNotificationPrompt(false);
      return undefined;
    }
    let cancelled = false;
    needsNotificationSubscription().then(need => {
      if (!cancelled) setShowNotificationPrompt(need);
    });
    return () => { cancelled = true; };
  }, [auth.isSignedIn, tourActive, showOnboarding]);

  useEffect(() => {
    if (tourActive || showOnboarding) return;
    setShowTourPrompt(shouldShowTourPrompt());
  }, [tourActive, showOnboarding]);

  useEffect(() => {
    const onShow = () => setShowWhatsNew(true);
    window.addEventListener(WHATS_NEW_EVENT, onShow);
    return () => window.removeEventListener(WHATS_NEW_EVENT, onShow);
  }, []);

  useEffect(() => {
    if (showOnboarding || tourActive || auth.loading) return;
    if (!shouldShowWhatsNew()) return;
    const t = setTimeout(() => setShowWhatsNew(true), 800);
    return () => clearTimeout(t);
  }, [showOnboarding, tourActive, auth.loading]);

  const getExerciseCategory = useCallback(exId => (ALL_EXERCISES[exId] || {})._cat, []);

  const syncLeaderboard = useCallback(async ({ force = false } = {}) => {
    const result = await maybeAutoSyncLeaderboard({
      settings,
      completed,
      missionLog,
      getCategory: getExerciseCategory,
      force,
    });
    if (result.ok) {
      track(ANALYTICS_EVENTS.LEADERBOARD_PUSH, { success: true, auto: !force });
    } else if (result.error) {
      track(ANALYTICS_EVENTS.LEADERBOARD_PUSH, { success: false, auto: !force, error: result.error });
    }
    return result;
  }, [settings, completed, missionLog, getExerciseCategory]);

  const syncLeaderboardRef = useRef(syncLeaderboard);
  syncLeaderboardRef.current = syncLeaderboard;

  useEffect(() => {
    const run = () => syncLeaderboardRef.current();
    run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!canAutoSyncLeaderboard(settings)) return;
    const timer = setTimeout(() => syncLeaderboardRef.current(), 90_000);
    return () => clearTimeout(timer);
  }, [completed, missionLog, settings.athleteName]);

  const handlePushStats = useCallback(async ({ goToRanks = false } = {}) => {
    setPushBusy(true);
    setPushError(null);
    try {
      const result = await syncLeaderboard({ force: true });
      if (!result.ok) throw new Error(result.error || "Sync failed");
      if (goToRanks) setView("boards");
    } catch (e) {
      const msg = e.message || "Sync failed";
      setPushError(msg);
      if (goToRanks) alert(msg);
    } finally {
      setPushBusy(false);
    }
  }, [syncLeaderboard]);


  const calcWeek = startDate => {
    if (!startDate) return null;
    const start = new Date(startDate+'T00:00:00'), now = new Date();
    return Math.max(1, Math.floor((now-start)/(7*24*60*60*1000))+1);
  };
  const trainingWeek = calcWeek(settings.startDate);

  useEffect(() => {
    if (settings.avatar) writeStoredAvatar(settings.avatar);
    safePersistKey("s_settings", stripAvatarForCloud(settings));
  }, [settings]);

  const avatarSyncRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const athleteId = await getEffectiveAthleteId();
      if (cancelled || !athleteId) return;
      const localAvatar = settings.avatar || readStoredAvatar();
      if (!localAvatar) return;
      if (avatarSyncRef.current === localAvatar) return;
      avatarSyncRef.current = localAvatar;
      await syncAvatarToCloud(localAvatar, athleteId);
    })();
    return () => { cancelled = true; };
  }, [settings.avatar]);
  useEffect(()=>{
    const bgColor = bg(settings);
    const bgL = Number(settings.bgLight);
    const textL = Number(settings.textLight);
    const textHue = Number(settings.textHue);
    const textSat = Number(settings.textSat);
    const safeBgL = Number.isFinite(bgL) ? bgL : 8;
    const safeTextL = Number.isFinite(textL) ? textL : 94;
    const safeTextHue = Number.isFinite(textHue) ? textHue : 210;
    const safeTextSat = Number.isFinite(textSat) ? textSat : 25;
    const safeText = Math.abs(safeTextL - safeBgL) < 28
      ? hsl(safeTextHue, safeTextSat, safeBgL < 50 ? 92 : 14)
      : textPri(settings);
    const safeMuted = Math.abs(safeTextL - safeBgL) < 28
      ? hsl(safeTextHue, Math.max(safeTextSat - 10, 0), safeBgL < 50 ? 62 : 38)
      : textMuted(settings);
    document.documentElement.style.setProperty("--fkh-bg", bgColor);
    document.documentElement.style.setProperty("--fkh-text", safeText);
    document.documentElement.style.setProperty("--fkh-text-muted", safeMuted);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bgColor);
  }, [settings.bgHue, settings.bgSat, settings.bgLight, settings.textHue, settings.textSat, settings.textLight]);
  useEffect(()=>{ safePersistKey("s_done", completed); },[completed]);
  useEffect(()=>{ safePersistKey("fkh-program-progress", programProgress); },[programProgress]);
  useEffect(()=>{ safePersistKey("fkh-set-log", setLog); },[setLog]);
  useEffect(()=>{ safePersistKey("fkh-max-reps", maxRepsMap); },[maxRepsMap]);
  useEffect(()=>{ safePersistKey("fkh-bilateral-prefs", bilateralPrefs); },[bilateralPrefs]);
  useEffect(()=>{ safePersistKey("fkh-programs", enrolledPrograms); },[enrolledPrograms]);
  useEffect(()=>{ safePersistKey("fkh-missions", missionLog); },[missionLog]);
  useEffect(()=>{ safePersistKey("fkh-favs", favorites); },[favorites]);

  const isFav      = (type, id) => !!(favorites[type]||{})[id];
  const toggleFav  = (type, id) => setFavorites(prev=>{
    const sec = { ...(prev[type]||{}) };
    if (sec[id]) delete sec[id]; else sec[id] = Date.now();
    return { ...prev, [type]:sec };
  });

  const today = todayKey();
  const P = pri(settings), S = sec(settings), BG = bg(settings), ST = str3(settings), BTN = btn(settings);
  const NV = nav(settings), SF = surf(settings);

  const isDone  = id => !!completed[`${today}-${id}`];
  const toggle  = useCallback((id, source) => {
    const key = `${today}-${id}`;
    const src = source || view;
    if (!completed[key]) trackExerciseComplete(id, src);
    setCompleted(p => ({ ...p, [key]: !p[key] }));
  }, [today, completed, view]);

  const markProgramExercise = useCallback((ctx, exId) => {
    const { programId, week, sessionIdx } = ctx;
    if (!enrolledPrograms[programId]) return;
    const anchor = programEnrollmentAnchor(programProgress, programId);
    if (!anchor) return;
    const slot = programSessionSlot(week, sessionIdx);
    const date = todayKey();
    const at = Date.now();
    setProgramProgress(prev => ({
      ...prev,
      [programId]: {
        ...(prev[programId] || {}),
        _meta: prev[programId]?._meta,
        [slot]: {
          ...(prev[programId]?.[slot] || {}),
          [exId]: { d: date, t: at },
        },
      },
    }));
  }, [enrolledPrograms, programProgress]);

  const toggleProgramExercise = useCallback((ctx, exId) => {
    const { programId, week, sessionIdx } = ctx;
    if (!enrolledPrograms[programId]) return;
    const slot = programSessionSlot(week, sessionIdx);
    const done = isProgramExerciseDone(programProgress, programId, week, sessionIdx, exId);
    if (done) {
      setProgramProgress(prev => {
        const next = { ...prev };
        const slotData = { ...(next[programId]?.[slot] || {}) };
        delete slotData[exId];
        next[programId] = { ...(next[programId] || {}), _meta: next[programId]?._meta, [slot]: slotData };
        return next;
      });
    } else {
      markProgramExercise(ctx, exId);
      const day = todayKey();
      trackExerciseComplete(exId, "program", { program_id: programId, week: ctx.week, session_idx: ctx.sessionIdx });
      setCompleted(p => p[`${day}-${exId}`] ? p : { ...p, [`${day}-${exId}`]: true });
    }
  }, [enrolledPrograms, programProgress, markProgramExercise]);

  const handleSetLogChange = useCallback((key, data) => {
    setSetLog(prev => ({ ...prev, [key]: { ...prev[key], ...data } }));
  }, []);

  const handleMaxRepsChange = useCallback((exId, reps) => {
    setMaxRepsMap(prev => reps > (prev[exId] || 0) ? { ...prev, [exId]: reps } : prev);
  }, []);

  const handleBilateralPrefChange = useCallback((exId, on, unit = "hand") => {
    setBilateralPrefs(prev => ({ ...prev, [exId]: { on, unit } }));
  }, []);
  const setStrDayPersist = day => { setStrDay(day); localStorage.setItem('s_strday',day); };
  const doneCnt = Object.keys(completed).filter(k=>k.startsWith(today)).length;

  /* Exercise Detail helpers ────────────────────────────────── */
  const openDetail = useCallback((ex, list=[], context=null) => {
    const enrich = e => ({ ...e, _cat:e._cat||"speed", meta:e.meta||EXERCISE_META[e.id]||{} });
    setActiveExercise(enrich(ex));
    setDetailList(list.map(enrich));
    setDetailContext(context);
  }, []);
  const detailIdx  = activeExercise ? detailList.findIndex(e=>e.id===activeExercise.id) : -1;
  const nextExDetail = detailIdx>=0 && detailIdx<detailList.length-1 ? detailList[detailIdx+1] : null;
  const closeDetail  = () => { setActiveExercise(null); setDetailContext(null); };

  const detailSheetProps = {
    programContext: detailContext,
    setLog, onSetLogChange: handleSetLogChange,
    maxRepsMap, onMaxRepsChange: handleMaxRepsChange,
    bilateralPrefs, onBilateralPrefChange: handleBilateralPrefChange,
    settings, today,
  };

  const todayIdx  = new Date().getDay()===0?6:new Date().getDay()-1;
  const todayPlan = SCHEDULE[todayIdx];

  /* Workout generator ──────────────────────────────────────────── */
  const defaultTmpl = todayPlan.cats.map(c=>SCHED_TO_TEMPLATE[c]).find(Boolean)||"quickFeet";
  const workoutStoreRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTmpl);
  const [coachBasisTemplate, setCoachBasisTemplate] = useState(null);
  const [todaysWorkout, setTodaysWorkout] = useState(null);

  const recentExIds = useMemo(()=>{
    const cutoff = new Date(Date.now()-3*86400000).toLocaleDateString("en-CA");
    return Object.keys(completed)
      .filter(k=>{ const d=k.split("-").slice(0,3).join("-"); return d>=cutoff && completed[k]; })
      .map(k=>k.split("-").slice(3).join("-"));
  },[completed]);

  const loadWorkoutForTemplate = useCallback((templateKey, { forceRegenerate = false } = {}) => {
    if (!workoutStoreRef.current) {
      const raw = readDailyWorkoutStore();
      workoutStoreRef.current = applyDayRollover(raw, today, completed);
      saveDailyWorkoutStore(workoutStoreRef.current);
    }
    const { workout, store } = getOrCreateWorkout({
      store: workoutStoreRef.current,
      templateKey,
      settings,
      recentExIds,
      generateWorkout,
      forceRegenerate,
    });
    workoutStoreRef.current = store;
    setTodaysWorkout(workout);
    return workout;
  }, [today, completed, settings, recentExIds]);

  // Restore cached workouts on mount — auto-pick coach recommendation on new day
  const workoutInitRef = useRef(false);
  useEffect(() => {
    if (workoutInitRef.current) return;
    workoutInitRef.current = true;
    const raw = readDailyWorkoutStore();
    const didRollover = raw && raw.activeDate !== today;
    const rolled = applyDayRollover(raw, today, completed);
    let store = rolled;
    let tmpl;

    if (didRollover) {
      const basis = rolled.coachBasisTemplate || defaultTmpl;
      const rec = computeRecommendation(settings, completed, basis);
      tmpl = rec.templateKey;
      store = setSelectedTemplateInStore(rolled, tmpl);
    } else {
      tmpl = rolled.selectedTemplate || defaultTmpl;
    }

    saveDailyWorkoutStore(store);
    workoutStoreRef.current = store;
    setCoachBasisTemplate(store.coachBasisTemplate ?? null);
    setSelectedTemplate(tmpl);
    loadWorkoutForTemplate(tmpl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount init only
  }, []);

  // New calendar day while app is open: apply coach pick and refresh workout
  useEffect(() => {
    if (!workoutInitRef.current) return;
    const prev = workoutStoreRef.current;
    const rolled = applyDayRollover(prev, today, completed);
    if (prev && rolled.activeDate !== prev.activeDate) {
      const basis = rolled.coachBasisTemplate || defaultTmpl;
      const rec = computeRecommendation(settings, completed, basis);
      const store = setSelectedTemplateInStore(rolled, rec.templateKey);
      workoutStoreRef.current = store;
      saveDailyWorkoutStore(store);
      setCoachBasisTemplate(store.coachBasisTemplate ?? null);
      setSelectedTemplate(rec.templateKey);
      loadWorkoutForTemplate(rec.templateKey);
    }
  }, [today, completed, settings, defaultTmpl, loadWorkoutForTemplate]);

  const selectTemplate = useCallback((templateKey) => {
    setSelectedTemplate(templateKey);
    if (!workoutStoreRef.current) {
      const raw = readDailyWorkoutStore();
      workoutStoreRef.current = applyDayRollover(raw, today, completed);
    }
    workoutStoreRef.current = setSelectedTemplateInStore(workoutStoreRef.current, templateKey);
    loadWorkoutForTemplate(templateKey);
  }, [today, completed, loadWorkoutForTemplate]);

  const refreshWorkout = useCallback(() => {
    loadWorkoutForTemplate(selectedTemplate, { forceRegenerate: true });
  }, [selectedTemplate, loadWorkoutForTemplate]);

  const startQuickWorkout = useCallback((templateKey) => {
    selectTemplate(templateKey);
    const w = loadWorkoutForTemplate(templateKey);
    const exs = (w?.exercises || []).map(e => ({ ...e, meta: e.meta || EXERCISE_META[e.id] || {} }));
    if (exs[0]) openDetail(exs[0], exs);
  }, [selectTemplate, loadWorkoutForTemplate, openDetail]);

  const quickWorkoutComplete = useMemo(
    () => isQuickWorkoutCompleteToday(todaysWorkout, completed, today),
    [todaysWorkout, completed, today]
  );

  const openSettingsTab = useCallback(() => {
    setShowSettings(false);
    setView("progress");
    setProgressTab("settings");
  }, []);

  const openFeedback = useCallback(() => {
    setShowSettings(false);
    setShowGuide(false);
    setShowFeedback(true);
  }, []);

  const openWhatsNew = useCallback(() => {
    setShowSettings(false);
    setShowGuide(false);
    setShowWhatsNew(true);
  }, []);

  const dismissWhatsNew = useCallback(() => {
    markWhatsNewSeen();
    setShowWhatsNew(false);
  }, []);

  const settingsSheet = showSettings ? (
    <SettingsSheet settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} onOpenFeedback={openFeedback}
      onOpenWhatsNew={openWhatsNew}
      onOpenAuth={() => { setShowSettings(false); setShowAuth(true); }}
      onOpenGuide={() => { setShowSettings(false); openGuide("tour"); }}
      isSignedIn={auth.isSignedIn}
      signedInUsername={auth.username}
      onCloudSync={applyCloudSync}
      cloudSyncStatus={auth.syncStatus}
      cloudSyncDetail={auth.syncDetail}
      onLogout={async () => { await auth.logout(); }} />
  ) : null;

  const authSheet = showAuth ? (
    <AuthSheet
      P={pri(settings)}
      SF={surf(settings)}
      zIndex={showOnboarding ? 450 : 350}
      initialMode={authInitialMode}
      onClose={() => { setShowAuth(false); setAuthInitialMode("signin"); }}
      onSignedIn={async () => {
        await applyCloudSync();
        setShowAuth(false);
        setAuthInitialMode("signin");
        if (showOnboarding) {
          localStorage.setItem("s_onboarded", "1");
          track(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, {});
          setShowOnboarding(false);
          startTour();
        }
      }}
    />
  ) : null;

  const feedbackSheet = showFeedback ? (
    <FeedbackCenter settings={settings} onClose={() => setShowFeedback(false)} />
  ) : null;

  const navigateFromGuide = useCallback((dest) => {
    setShowGuide(false);
    switch (dest) {
      case "today": setView("home"); break;
      case "squad": setView("squad"); break;
      case "shots": setView("shots"); break;
      case "programs": setView("programs"); break;
      case "boards": setView("boards"); break;
      case "paths": setView("boards"); break;
      case "progress": setView("progress"); setProgressTab("overview"); break;
      case "badges": setView("progress"); setProgressTab("locker"); break;
      case "stats": setView("progress"); setProgressTab("stats"); break;
      case "history": setPrevView("progress"); setView("history"); break;
      case "playlike": setShowPlayLikePicker(true); break;
      case "settings": openSettingsTab(); break;
      case "account": setShowAuth(true); break;
      case "guide": openGuide("explore"); break;
      case "whatsnew": openWhatsNew(); break;
      default: break;
    }
  }, [openGuide, openWhatsNew, openSettingsTab]);

  const guideSheet = showGuide ? (
    <GuideSheet P={P} SF={SF} initialMode={guideMode} onClose={() => setShowGuide(false)}
      onNavigate={navigateFromGuide} onStartTour={startTour}
      onOpenFeedback={openFeedback} onOpenWhatsNew={openWhatsNew} />
  ) : null;

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    return initAnalytics({ ageGroup: getAgeGroup(settings.dateOfBirth), isStandalone });
  }, []);

  useEffect(() => {
    setAnalyticsAgeGroup(getAgeGroup(settings.dateOfBirth));
  }, [settings.dateOfBirth]);

  useEffect(() => {
    let screen = view;
    if (view === "programs" && selectedProgram) screen = "program_detail";
    else if (view === "cat" && activeCat) screen = `cat_${activeCat}`;
    else if (view === "schedule") screen = `schedule_${schedTab}`;
    trackScreen(screen);
  }, [view, selectedProgram, activeCat, schedTab]);

  const prevWorkoutCompleteRef = useRef(false);
  useEffect(() => {
    if (quickWorkoutComplete && !prevWorkoutCompleteRef.current) {
      trackWorkoutCompleteIfNew(selectedTemplate, today);
    }
    prevWorkoutCompleteRef.current = quickWorkoutComplete;
  }, [quickWorkoutComplete, selectedTemplate, today]);

  useEffect(() => {
    for (const def of CHALLENGES_DEF) {
      const { cur, target } = getChallengeProgress(def, completed, WORKOUTS);
      trackChallengeIfNew(def.id, cur >= target);
    }
  }, [completed]);

  useEffect(() => {
    for (const programId of Object.keys(enrolledPrograms)) {
      const prog = PROGRAMS.find(p => p.id === programId);
      if (!prog) continue;
      for (const week of prog.weeks) {
        for (let si = 0; si < week.sessions.length; si++) {
          if (isProgramSessionComplete(prog, programProgress, week.week, si)) {
            trackProgramSessionIfNew(programId, week.week, si);
          }
        }
      }
    }
  }, [enrolledPrograms, programProgress]);

  const coachRec = useMemo(() =>
    computeRecommendation(settings, completed, coachBasisTemplate ?? defaultTmpl),
  [settings, completed, coachBasisTemplate, defaultTmpl]);

  /* XP / Level / Badges ──────────────────────────────────── */
  const xpData = useMemo(() => computeXP(completed, programProgress, missionLog), [completed, programProgress, missionLog]);
  const currentLevel = useMemo(() => getLevel(xpData.total), [xpData.total]);
  const prevLevelRankRef = useRef(currentLevel.rank);
  useEffect(() => {
    if (currentLevel.rank > prevLevelRankRef.current) {
      track(ANALYTICS_EVENTS.LEVEL_UP, {
        level: currentLevel.rank,
        level_name: currentLevel.name,
        total_xp: xpData.total,
      });
    }
    prevLevelRankRef.current = currentLevel.rank;
  }, [currentLevel, xpData.total]);
  const earnedBadges = useMemo(() => getEarnedBadges(completed, programProgress, PROGRAMS), [completed, programProgress]);
  const personalChallenges = useMemo(() => buildPersonalChallenges(completed, WORKOUTS), [completed]);
  const recommendedProgramIds = useMemo(() => recommendProgramsForFavorite(settings), [settings]);
  const totalBadges = BADGES_DEF.length;
  const totalTracks = PATHS.length;
  const coachMsg = useMemo(
    () => buildCoachMessage(completed, xpData, earnedBadges, programProgress),
    [completed, xpData, earnedBadges, programProgress]
  );
  // Detect newly unlocked badges → queue celebration + record dates
  useEffect(()=>{
    const newBadges = earnedBadges.filter(id=>!celebratedBadges.has(id));
    if (newBadges.length===0) return;
    const defs = newBadges.map(id=>BADGES_DEF.find(b=>b.id===id)).filter(Boolean);
    for (const id of newBadges) track(ANALYTICS_EVENTS.BADGE_EARN, { badge_id: id });
    setCelebrationQueue(q=>[...q,...defs]);
    if (defs.length>0) setLastEarnedBadge(defs[defs.length-1]);
    const updated = new Set([...celebratedBadges,...newBadges]);
    setCelebratedBadges(updated);
    try { localStorage.setItem("fkh-celebrated-badges",JSON.stringify([...updated])); } catch {}
    // Record earn date for each new badge (first-time only)
    const today = new Date().toLocaleDateString("en-CA");
    setBadgeDates(prev=>{
      const next={...prev};
      for (const id of newBadges) { if (!next[id]) next[id]=today; }
      try{ localStorage.setItem("fkh-badge-dates",JSON.stringify(next)); }catch{}
      return next;
    });
  },[earnedBadges]);

  // Shared progression context — drives both the grant ledger and the journey UI.
  const progressCtx = useMemo(()=>{
    try {
      const sl = readShotLog();
      const makes = countShotMakes(sl);
      const maxStreak = earnedBadges.includes("streak-30") ? 30
        : earnedBadges.includes("streak-14") ? 14
        : earnedBadges.includes("streak-7") ? 7 : 0;
      return {
        earnedBadgeIds: new Set(earnedBadges),
        ledgerIds: new Set(Object.keys(ledger)),
        makes,
        maxStreak,
        catCounts: computeCatCounts(completed, getExerciseCategory),
        exCounts: computeExCounts(completed),
        styleMakes: computeShotStyleMakes(sl),
      };
    } catch (e) {
      console.error("[fkh] progress context failed", e);
      return {
        earnedBadgeIds: new Set(earnedBadges),
        ledgerIds: new Set(),
        makes: 0,
        maxStreak: 0,
        catCounts: {},
        exCounts: {},
        styleMakes: {},
      };
    }
  },[earnedBadges, completed, getExerciseCategory, ledger, shotLogTick]);

  const tracksComplete = useMemo(
    () => PATHS.filter(t => trackStageProgress(t, progressCtx).reached >= t.stages.length).length,
    [progressCtx]
  );

  // Progression ledger — the single grant path.
  // journey milestones/titles/cosmetics, syncs to the cloud ledger, and celebrates
  // newly reached ranks with the same confetti moment as badges.
  useEffect(()=>{
    try {
      const earnedAll = new Set([...earnedBadges, ...evaluateEarned(progressCtx)]);
      const owned = ledgerIdSet(readLocalLedger());
      const entries = grantEntries(earnedAll, owned, {});
      if (!entries.length) return;
      mergeIntoLocalLedger(entries);
      setLedger(readLocalLedger());
      pushLedgerEntries(entries).catch(()=>{});
      const milestoneDefs = entries
        .filter(e => e.kind === "milestone")
        .map(e => { const m = getAchievementMeta(e.achievement_id); return m && { id: m.id, name: m.name, emoji: m.emoji, color: m.color, desc: m.flavor, kind: "milestone", conquest: m.conquest, inspo: m.inspo }; })
        .filter(Boolean);
      if (milestoneDefs.length) setCelebrationQueue(q=>[...q, ...milestoneDefs]);
    } catch (e) {
      console.error("[fkh] ledger grant failed", e);
    }
  },[progressCtx, earnedBadges]);

  // On open: claim any challenge rewards earned (server-validated, immediate),
  // then pull the cloud ledger so progression + new rewards follow across devices.
  useEffect(()=>{
    claimChallengeRewards()
      .catch(()=>0)
      .then(()=>pullLedger())
      .then(()=>setLedger(readLocalLedger()))
      .catch(()=>{});
  },[]);

  // Equip system — ownership is the ledger; equipped state lives in settings and
  // is mirrored to the profile so friends/boards see it.
  const ledgerSet = useMemo(()=>ledgerIdSet(ledger),[ledger]);
  const persistEquip = useCallback((next)=>{
    setSettings(next);
    pushEquippedIdentity({ activeTitle: next.activeTitle, equipped: next.equipped }).catch(()=>{});
  },[]);
  const handleEquipTitle = useCallback(id=>persistEquip(equipTitle(settings, id, ledgerSet)),[settings, ledgerSet, persistEquip]);
  const handleEquipCosmetic = useCallback(id=>persistEquip(equipCosmetic(settings, id, ledgerSet)),[settings, ledgerSet, persistEquip]);
  const handleUnequipSlot = useCallback(slot=>persistEquip(unequipSlot(settings, slot)),[settings, persistEquip]);

  // Log a benchmark test → update PB, append to the cloud series, and (if the
  // threshold is met) certify it as an equippable title via the one grant path.
  const handleLogBenchmark = useCallback((benchmarkId, value)=>{
    const b = getBenchmark(benchmarkId);
    if (!b || !Number.isFinite(value)) return;
    setBenchmarkPBs(recordLocalPB(benchmarkId, value));
    recordBenchmark(benchmarkId, value).catch(()=>{});
    const certId = benchmarkCertTitle(b, value);
    if (!certId) return;
    const owned = ledgerIdSet(readLocalLedger());
    const entries = grantEntries(new Set([certId]), owned, { context:{ benchmark: benchmarkId, value } });
    if (!entries.length) return;
    mergeIntoLocalLedger(entries);
    setLedger(readLocalLedger());
    pushLedgerEntries(entries).catch(()=>{});
    const m = getAchievementMeta(certId);
    if (m) setCelebrationQueue(q=>[...q, { id:m.id, name:m.name, emoji:m.emoji, color:m.color,
      desc:`Certified: ${b.label} ${value}${b.unit}`, kind:"milestone" }]);
  },[]);

  /* Daily Mission ─────────────────────────────────────────────── */
  const todayMission = useMemo(() => {
    try {
      return generateDailyMission(today, settings, completed, enrolledPrograms, programProgress);
    } catch (e) {
      console.error("[fkh] daily mission generation failed", e);
      return {
        date: today,
        title: "Daily Training",
        tasks: [{
          id: "task-fallback",
          type: "category",
          label: "Complete 3 drills from Programs",
          exercises: [],
          target: 3,
          required: true,
        }],
        bonusXP: 50,
      };
    }
  }, [today, settings, completed, enrolledPrograms, programProgress]);

  const missionClaimed = !!missionLog[today]?.claimed;

  const requiredTasksDone = useMemo(()=>
    todayMission.tasks.filter(t=>t.required).every(t=>{
      const {cur,target} = getMissionTaskProgress(t, completed, today, programProgress);
      return cur >= target;
    }),
  [todayMission, completed, today, programProgress]);

  const challengeProgress = useCallback((def, completed) => getChallengeProgress(def, completed, WORKOUTS), []);

  const challengeNudge = useMemo(
    () => pickChallengeNudge(CHALLENGES_DEF, challengeProgress, completed),
    [completed, challengeProgress]
  );

  const activeProgForMission = useMemo(() => {
    const dueList = [];
    for (const prog of PROGRAMS) {
      if (!enrolledPrograms[prog.id]) continue;
      const due = findDueProgramSession(prog, enrolledPrograms[prog.id], programProgress, today);
      if (due) dueList.push({ prog, due });
    }
    const sorted = sortDueProgramEntries(dueList);
    return sorted[0]?.prog || PROGRAMS.find(p => enrolledPrograms[p.id]) || null;
  }, [enrolledPrograms, programProgress, today]);

  const dueSessionForMission = useMemo(() => {
    if (!activeProgForMission) return null;
    const enrollment = enrolledPrograms[activeProgForMission.id];
    return findDueProgramSession(activeProgForMission, enrollment, programProgress, today);
  }, [activeProgForMission, enrolledPrograms, programProgress, today]);

  const missionHasProgramTask = todayMission.tasks.some(t => t.type === "program");

  const dailyAction = useMemo(() => resolveDailyAction({
    mission: todayMission,
    enrolledPrograms,
    programProgress,
    todayStr: today,
    challenges: CHALLENGES_DEF,
    getChallengeProgress: challengeProgress,
    completed,
    coachTemplateKey: coachRec?.templateKey,
    activeProgram: activeProgForMission,
    dueSession: dueSessionForMission,
  }), [todayMission, enrolledPrograms, programProgress, today, completed, coachRec, activeProgForMission, dueSessionForMission, challengeProgress]);

  useEffect(() => {
    if (missionDeepLink) {
      setView("home");
      setHomeMissionFocus(true);
      setMissionDeepLink(false);
    }
  }, [missionDeepLink]);

  useEffect(() => {
    if (inviteCode) setView("boards");
  }, [inviteCode]);

  useEffect(() => {
    if (auth.loading || !auth.isSignedIn || !auth.user?.id) return;
    refreshSquadNotifications();
    const retry = setTimeout(refreshSquadNotifications, 1500);
    return () => clearTimeout(retry);
  }, [auth.loading, auth.isSignedIn, auth.user?.id, refreshSquadNotifications]);

  useEffect(() => {
    if (auth.isSignedIn) refreshSquadNotifications();
  }, [view, auth.isSignedIn, refreshSquadNotifications]);

  useEffect(() => {
    if (!navDeepLink) return;
    setView(navDeepLink.tab);
    if (navDeepLink.openMessages) {
      setOpenMessagesInbox(true);
      setFriendsFocusTick(t => t + 1);
    }
    if (navDeepLink.openFriends) setFriendsFocusTick(t => t + 1);
    setNavDeepLink(null);
  }, [navDeepLink]);

  useEffect(() => {
    if (!auth.isSignedIn) return;
    let cancelled = false;
    (async () => {
      await applyCloudSync();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [auth.isSignedIn, applyCloudSync]);

  // Normalize legacy profile fields when Settings opens (tab or legacy sheet).
  useEffect(() => {
    const settingsOpen = showSettings || (view === "progress" && progressTab === "settings");
    if (!settingsOpen) return;
    try {
      setSettings(prev => {
        const next = withStoredAvatar(migrateThemeSettings(normalizeProfileFields(prev)));
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    } catch (e) {
      console.error("[fkh] settings normalize failed", e);
    }
    if (auth.isSignedIn && auth.user?.id) hydrateProfileIntoState(auth.user.id).catch(() => {});
  }, [showSettings, view, progressTab, auth.isSignedIn, auth.user?.id, hydrateProfileIntoState]);

  // Auto-sync the leaderboard on app open / sign-in (not just when Boards is
  // opened). Self-throttled to ~30 min, so it's cheap to fire here.
  useEffect(() => {
    maybeAutoSyncLeaderboard({
      settings, completed, missionLog, getCategory: getExerciseCategory, earnedBadges, ledger,
    }).catch(() => {});
  }, [auth.isSignedIn]);

  useEffect(() => {
    scheduleMissionReminder({
      missionComplete: missionClaimed,
      missionTitle: todayMission.title,
      athleteName: settings.athleteName,
    });
  }, [missionClaimed, todayMission.title, settings.athleteName]);

  // Reset per-day task celebration tracking at midnight rollover
  useEffect(() => {
    const stored = missionLog[today]?.celebratedTasks;
    if (stored?.length) {
      celebratedMissionTasksRef.current = new Set(stored);
    } else if (missionLog[today]?.claimed) {
      celebratedMissionTasksRef.current = new Set(todayMission.tasks.map(t => t.id));
    } else {
      celebratedMissionTasksRef.current = new Set();
    }
  }, [today, missionLog, todayMission.tasks]);

  // Toast when individual mission steps complete
  useEffect(() => {
    if (missionTaskToast) return;
    for (const task of todayMission.tasks) {
      if (celebratedMissionTasksRef.current.has(task.id)) continue;
      const { cur, target } = getMissionTaskProgress(task, completed, today, programProgress);
      if (cur >= target) {
        celebratedMissionTasksRef.current.add(task.id);
        setMissionLog(prev => ({
          ...prev,
          [today]: {
            ...(prev[today] || {}),
            celebratedTasks: [...celebratedMissionTasksRef.current],
          },
        }));
        setMissionTaskToast({ id: task.id, label: task.label });
        break;
      }
    }
  }, [todayMission, completed, today, programProgress, missionTaskToast]);

  // Auto-claim bonus XP when all required tasks complete + celebration popup
  useEffect(()=>{
    if (requiredTasksDone && !missionClaimed) {
      const entry = { claimed:true, bonusXP:todayMission.bonusXP, claimedAt:Date.now(),
        celebratedTasks: [...celebratedMissionTasksRef.current] };
      setMissionLog(prev => ({ ...prev, [today]: entry }));
      track(ANALYTICS_EVENTS.MISSION_CLAIM, { mission_day: today, bonus_xp: todayMission.bonusXP, title: todayMission.title });
      setMissionCelebration({ title: todayMission.title, bonusXP: todayMission.bonusXP });
    }
  },[requiredTasksDone, missionClaimed, today, todayMission.bonusXP, todayMission.title]);

  const catColor = key => key==="strength" ? ST : key==="speed"||key==="balance" ? P : S;
  const catBg    = key => `${catColor(key)}16`;
  const catBrd   = key => `${catColor(key)}2e`;

  const bd  = "rgba(255,255,255,0.07)";
  const lbl = { fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}80`,marginBottom:10,textTransform:"uppercase" };
  const homeLbl = { fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:"0.13em",color:P,fontWeight:800,marginBottom:10,textTransform:"uppercase" };
  const NAV = [
    {id:"home",     emoji:"☀️",label:"Today"},
    {id:"squad",    emoji:"👥",label:"Squad"},
    {id:"shots",    emoji:"🏀",label:"Shots"},
    {id:"programs", emoji:"📋",label:"Programs"},
    {id:"boards",  emoji:"🏆",label:"Challenges"},
    {id:"progress", emoji:"⭐",label:"Me"},
  ];

  const tourOverlay = tourActive ? (
    <OnboardingTour
      step={TOUR_STEPS[tourStep]}
      stepIndex={tourStep}
      stepCount={TOUR_STEPS.length}
      navTabs={NAV}
      P={P}
      SF={SF}
      onNext={advanceTour}
      onBack={backTour}
      onSkip={finishTour}
    />
  ) : null;

  const programDetailSheet = activeExercise ? (
    <ExerciseDetailSheet exercise={activeExercise} color={P}
      bg2={SF} brd={bd} BG={BG} SF={SF}
      isDone={detailContext
        ? isProgramExerciseDone(programProgress, detailContext.programId, detailContext.week, detailContext.sessionIdx, activeExercise.id)
        : isDone(activeExercise.id)}
      onToggle={()=>{
        if (detailContext) toggleProgramExercise(detailContext, activeExercise.id);
        else toggle(activeExercise.id);
      }}
      onClose={closeDetail} onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
      completed={completed}
      favored={isFav("exercises",activeExercise.id)}
      onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
      {...detailSheetProps}/>
  ) : null;

  const renderBottomNav = () => (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,background:NV,borderTop:`1px solid ${bd}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom, 0px)", pointerEvents:tourActive?"none":"auto", opacity:tourActive?0.92:1 }}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>setView(n.id)} style={{ flex:1,padding:"10px 0 12px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
          <span style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:18 }}>{n.emoji}</span>
            {n.id === "squad" && squadNotifications > 0 && (
              <CountBadge count={squadNotifications} P={P} style={{ position:"absolute", top:-8, right:-12, minWidth:18, height:18, fontSize:10, padding:"0 5px", boxShadow:"0 0 0 2px var(--fkh-bg, #0b1220)" }} />
            )}
          </span>
          <span style={{ fontSize:9,color:view===n.id?P:"#475569",fontWeight:view===n.id?700:400,letterSpacing:"0.04em" }}>{n.label}</span>
          {view===n.id&&<div style={{ width:16,height:2,borderRadius:99,background:P,marginTop:1 }}/>}
        </button>
      ))}
    </div>
  );

  const renderMissionOverlays = () => (
    <>
      {missionCelebration&&<MissionCelebration
        title={missionCelebration.title} bonusXP={missionCelebration.bonusXP} color={P}
        onDismiss={()=>setMissionCelebration(null)}/>}
      {missionTaskToast&&<MissionTaskToast
        label={missionTaskToast.label}
        onDone={()=>setMissionTaskToast(null)}/>}
    </>
  );

  const shellOverlays = (
    <>
      {settingsSheet}{feedbackSheet}{authSheet}{guideSheet}
      {showPlayLikePicker && (
        <PlayLikePickerSheet
          open={showPlayLikePicker}
          onClose={() => setShowPlayLikePicker(false)}
          value={settings.favoritePlayLike || ""}
          onChange={v => setSettings(s => ({ ...s, favoritePlayLike: v }))}
          accent={P}
        />
      )}
      {showWhatsNew && (
        <WhatsNewSheet P={P} SF={SF} onClose={() => setShowWhatsNew(false)} onDismiss={dismissWhatsNew} />
      )}
      {playerHighlight && (
        <HighlightVideoSheet
          videoId={playerHighlight.videoId}
          title={playerHighlight.title}
          color={P}
          BG={BG}
          onClose={() => setPlayerHighlight(null)}
        />
      )}
      {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]} onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
      {renderMissionOverlays()}
      {tourOverlay}
    </>
  );

  /* PROGRAMS */
  if (view==="programs") {
    return (
      <ProgramsView
        programs={PROGRAMS}
        settings={settings}
        enrolledPrograms={enrolledPrograms}
        setEnrolledPrograms={setEnrolledPrograms}
        programProgress={programProgress}
        setProgramProgress={setProgramProgress}
        programSegment={programSegment}
        setProgramSegment={setProgramSegment}
        programsHubSection={programsHubSection}
        setProgramsHubSection={setProgramsHubSection}
        recommendedProgramIds={recommendedProgramIds}
        earnedBadges={earnedBadges}
        selectedProgram={selectedProgram}
        setSelectedProgram={setSelectedProgram}
        allExercises={ALL_EXERCISES}
        exerciseMeta={EXERCISE_META}
        cats={CATS}
        workouts={WORKOUTS}
        schedule={SCHEDULE}
        workoutTemplates={WORKOUT_TEMPLATES}
        favorites={favorites}
        todayMission={todayMission}
        searchExercises={searchExercises}
        onPickCategory={(cat) => { setActiveCat(cat); setPrevView("programs"); setView("cat"); }}
        startQuickWorkout={startQuickWorkout}
        P={P}
        BG={BG}
        SF={SF}
        bd={bd}
        shellOverlays={shellOverlays}
        detailSheet={programDetailSheet}
        renderBottomNav={renderBottomNav}
        setShowSettings={openSettingsTab}
        onOpenGuide={() => openGuide("explore")}
        isFav={isFav}
        toggleFav={toggleFav}
        openDetail={openDetail}
        toggle={toggle}
        toggleProgramExercise={toggleProgramExercise}
        isDone={isDone}
        completed={completed}
      />
    );
  }

  /* SQUAD */
  if (view === "squad") {
    return (
      <SquadView
        settings={settings}
        completed={completed}
        missionLog={missionLog}
        getCategory={getExerciseCategory}
        earnedBadges={earnedBadges}
        ledger={ledger}
        personalChallenges={personalChallenges}
        currentLevel={currentLevel}
        xpData={xpData}
        P={P}
        BG={BG}
        SF={SF}
        bd={bd}
        lbl={lbl}
        initialInviteCode={inviteCode}
        isSignedIn={auth.isSignedIn}
        onOpenAuth={() => setShowAuth(true)}
        focusFriendsTick={friendsFocusTick}
        onPushSuccess={() => setPushError(null)}
        unreadMessages={unreadMessages}
        friendRequests={friendRequests}
        feedActivity={feedActivity}
        challengeActivity={challengeActivity}
        squadNotifications={squadNotifications}
        onSquadTabSeen={markSquadTabSeen}
        onUnreadRefresh={refreshSquadNotifications}
        onOpenGuide={() => openGuide("explore")}
        openMessagesInbox={openMessagesInbox}
        onMessagesInboxOpened={() => setOpenMessagesInbox(false)}
        shellOverlays={shellOverlays}
        renderBottomNav={renderBottomNav}
      />
    );
  }

  /* SHOTS */
  if (view==="shots") return (
    <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto" }}>
      {shellOverlays}
      <ShotTrackerErrorBoundary P={P} onRepaired={() => setShotLogTick(t => t + 1)}>
        <ShotTracker P={P} S={S} BG={BG} athleteName={settings.athleteName} settings={settings}
          onLogChange={() => setShotLogTick(t => t + 1)}
          onOpenGuide={() => openGuide("explore")} />
      </ShotTrackerErrorBoundary>
      {renderBottomNav()}
    </div>
  );

  /* ME */
  if (view==="progress") {
    return (
      <MeView
        settings={settings}
        progressTab={progressTab}
        setProgressTab={setProgressTab}
        xpData={xpData}
        currentLevel={currentLevel}
        earnedBadges={earnedBadges}
        completed={completed}
        programProgress={programProgress}
        badgeDates={badgeDates}
        totalBadges={totalBadges}
        tracksComplete={tracksComplete}
        totalTracks={totalTracks}
        programs={PROGRAMS}
        allExercises={ALL_EXERCISES}
        progressCtx={progressCtx}
        ledgerSet={ledgerSet}
        ledger={ledger}
        benchmarkPBs={benchmarkPBs}
        growthLog={growthLog}
        lockerBadgesOpen={lockerBadgesOpen}
        setLockerBadgesOpen={setLockerBadgesOpen}
        P={P}
        S={S}
        ST={ST}
        BG={BG}
        SF={SF}
        bd={bd}
        lbl={lbl}
        shellOverlays={shellOverlays}
        BadgesView={BadgesView}
        ProgressStatsPanel={ProgressStatsPanel}
        onOpenGuide={() => openGuide("explore")}
        setSettings={setSettings}
        onOpenFeedback={openFeedback}
        onOpenWhatsNew={openWhatsNew}
        onOpenAuth={() => setShowAuth(true)}
        onCloudSync={applyCloudSync}
        cloudSyncStatus={auth.syncStatus}
        cloudSyncDetail={auth.syncDetail}
        onLogout={async () => { await auth.logout(); }}
        isSignedIn={auth.isSignedIn}
        signedInUsername={auth.username}
        onViewHistory={() => { setPrevView("progress"); setView("history"); }}
        onOpenSchedule={() => openSchedule("progress", "calendar")}
        onViewReport={() => { setPrevView("progress"); setView("report"); }}
        onViewLeaderboard={() => setView("boards")}
        onPushStats={() => handlePushStats({ goToRanks: false })}
        pushBusy={pushBusy}
        pushError={pushError}
        onLogBenchmark={handleLogBenchmark}
        onEquipTitle={handleEquipTitle}
        onEquipCosmetic={handleEquipCosmetic}
        onUnequipSlot={handleUnequipSlot}
        onLogHeight={handleLogHeight}
        onOpenPlayerHighlight={openPlayerHighlight}
        onOpenExercise={exId => {
          const ex = ALL_EXERCISES[exId];
          if (ex) openDetail({ ...ex, meta: EXERCISE_META[exId] || {} }, []);
        }}
        onOpenShots={() => setView("shots")}
        renderBottomNav={renderBottomNav}
      />
    );
  }

  /* HISTORY */
  if (view==="history") return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", background:BG, color:"var(--fkh-text)", minHeight:"100vh", maxWidth:680, margin:"0 auto", paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}
      <HistoryView
        completed={completed} badgeDates={badgeDates} settings={settings}
        allExercises={ALL_EXERCISES}
        P={P} BG={BG} SF={SF} bd={bd} lbl={lbl}
        onBack={() => setView(prevView === "progress" ? "progress" : "home")}/>
      {renderBottomNav()}
    </div>
  );

  /* CHALLENGES */
  if (view==="boards") {
    return (
      <ChallengesView
        settings={settings}
        completed={completed}
        missionLog={missionLog}
        getCategory={getExerciseCategory}
        earnedBadges={earnedBadges}
        ledger={ledger}
        personalChallenges={personalChallenges}
        currentLevel={currentLevel}
        xpData={xpData}
        P={P}
        BG={BG}
        SF={SF}
        bd={bd}
        lbl={lbl}
        initialInviteCode={inviteCode}
        isSignedIn={auth.isSignedIn}
        onOpenAuth={() => setShowAuth(true)}
            onAddFriends={focusSquad}
        focusFriendsTick={friendsFocusTick}
        onPushSuccess={() => setPushError(null)}
        onOpenGuide={() => openGuide("explore")}
        shellOverlays={shellOverlays}
        renderBottomNav={renderBottomNav}
        progressCtx={progressCtx}
        questsPanel={
          <ProgressionView
            tab="journeys"
            settings={settings}
            ledgerIds={ledgerSet}
            ledger={ledger}
            ctx={progressCtx}
            P={P}
            benchmarkPBs={benchmarkPBs}
            onLogBenchmark={handleLogBenchmark}
            onEquipTitle={handleEquipTitle}
            onEquipCosmetic={handleEquipCosmetic}
            onUnequipSlot={handleUnequipSlot}
            allExercises={ALL_EXERCISES}
            onOpenExercise={exId => { const ex = ALL_EXERCISES[exId]; if (ex) openDetail({ ...ex, meta: EXERCISE_META[exId] || {} }, []); }}
            onOpenShots={() => setView("shots")}
            onOpenPlayerHighlight={openPlayerHighlight}
          />
        }
      />
    );
  }


  /* CATEGORY DRILLS */
  if (view==="cat" && activeCat) {
    const color = catColor(activeCat), bg2 = catBg(activeCat), brd = catBrd(activeCat);
    const isStrength = activeCat==="strength";
    const filteredWorkouts = isStrength
      ? (WORKOUTS.strength.filter(w=>STR_DAYS[strDay]?.ids.includes(w.id)).concat(WORKOUTS.strength.filter(w=>w.id==="str-full")))
      : WORKOUTS[activeCat];
    return (
      <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
        {shellOverlays}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`2px solid ${color}40`,position:"sticky",top:0,background:NV,backdropFilter:"blur(10px)",zIndex:10 }}>
          <button onClick={()=>setView(prevView)} style={{ background:`${color}14`,border:`1px solid ${color}30`,borderRadius:8,color,fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px",letterSpacing:"0.02em" }}>← Back</button>
          <span style={{ fontSize:15,fontWeight:800,color,letterSpacing:"-0.01em" }}>{CATS[activeCat].emoji} {CATS[activeCat].label}</span>
          <button onClick={openSettingsTab} style={{ background:`${color}14`,border:`1px solid ${color}30`,borderRadius:8,color,fontSize:16,cursor:"pointer",padding:"5px 8px" }}>⚙</button>
        </div>

        {/* Strength day picker */}
        {isStrength && (
          <div style={{ padding:"12px 16px 0" }}>
            <div style={lbl}>Training Program — Select Day</div>
            <div style={{ display:"flex",gap:8,marginBottom:14 }}>
              {Object.entries(STR_DAYS).map(([key,val])=>(
                <button key={key} onClick={()=>setStrDayPersist(key)} style={{ flex:1,padding:"10px 8px",borderRadius:12,border:`1px solid ${strDay===key?color:bd}`,background:strDay===key?`${color}18`:"transparent",color:strDay===key?color:"#475569",fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",lineHeight:1.3 }}>
                  <div style={{ fontSize:16,marginBottom:3 }}>{key==="Day 1"?"💪":key==="Day 2"?"🎯":"⚡"}</div>
                  {key}
                  <div style={{ fontSize:9,color:`${color}99`,marginTop:2 }}>{key==="Day 1"?"Strength/Core":key==="Day 2"?"Balance/Move":"Power/Athletic"}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding:"0 16px 80px" }}>
          {filteredWorkouts.map(w => (
            <DrillCard key={w.id} w={w} color={color} bg2={bg2} brd={brd} isDone={isDone(w.id)} onToggle={()=>toggle(w.id)}
              onViewDetail={()=>openDetail(w, filteredWorkouts)}
              favored={isFav("exercises",w.id)} onFav={()=>toggleFav("exercises",w.id)}/>
          ))}
        </div>
        {activeExercise&&<ExerciseDetailSheet
          exercise={activeExercise} color={catColor(activeExercise._cat)}
          bg2={catBg(activeExercise._cat)} brd={catBrd(activeExercise._cat)}
          BG={BG} SF={SF} isDone={isDone(activeExercise.id)}
          onToggle={()=>toggle(activeExercise.id)}
          onClose={closeDetail}
          onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
          completed={completed}
          favored={isFav("exercises",activeExercise.id)}
          onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
          navLabel={activeCat&&CATS[activeCat]?`${CATS[activeCat].emoji} ${CATS[activeCat].label}`:undefined}
          {...detailSheetProps}/>}
        {renderBottomNav()}
      </div>
    );
  }

  /* REPORT */
  if (view==="report") {
    const report = buildReport(reportPeriod, completed, badgeDates, enrolledPrograms, favorites, programProgress);
    const insights = generateInsights(report, reportPeriod, currentLevel);
    const periodLabel = reportPeriod==="7d"?"Last 7 Days":reportPeriod==="30d"?"Last 30 Days":"All Time";

    const Section = ({emoji,title,children})=>(
      <div style={{ margin:"0 18px 14px",borderRadius:14,background:SF,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden" }}>
        <div style={{ padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:16 }}>{emoji}</span>
          <span style={{ fontSize:12,fontWeight:800,color:"var(--fkh-text)",letterSpacing:"0.01em" }}>{title}</span>
        </div>
        <div style={{ padding:"12px 14px" }}>{children}</div>
      </div>
    );
    const Stat = ({label,value,sub})=>(
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:P,lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:3 }}>{label}</div>
        {sub&&<div style={{ fontSize:10,color:"#334155",marginTop:2 }}>{sub}</div>}
      </div>
    );

    return (
      <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:80 }}>
        {shellOverlays}
        {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]} onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
        {renderMissionOverlays()}
        {activeExercise&&<ExerciseDetailSheet exercise={activeExercise} color={P}
          bg2={SF} brd={bd} BG={BG} SF={SF}
          isDone={isDone(activeExercise.id)} onToggle={()=>toggle(activeExercise.id)}
          onClose={closeDetail} onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
          completed={completed}
          favored={isFav("exercises",activeExercise.id)}
          onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
          {...detailSheetProps}/>}

        {/* Header */}
        <div style={{ padding:"20px 18px 14px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
            <div>
              <button onClick={() => setView(prevView === "progress" ? "progress" : "home")}
                style={{ marginBottom:10,padding:"5px 12px",borderRadius:8,border:`1px solid ${P}30`,background:`${P}14`,color:P,fontSize:11,fontWeight:700,cursor:"pointer" }}>
                ← {prevView === "progress" ? "Me" : "Home"}
              </button>
              <h1 style={{ fontSize:22,fontWeight:800,color:"var(--fkh-text)",margin:0 }}>📈 Progress Report</h1>
              <p style={{ fontSize:12,color:"#64748b",margin:"4px 0 0" }}>{settings.athleteName} · {periodLabel}</p>
            </div>
            <button onClick={openSettingsTab} style={{ padding:"8px 10px",borderRadius:10,border:`1px solid ${bd}`,background:SF,color:"#64748b",fontSize:14,cursor:"pointer" }}>⚙️</button>
          </div>
          {/* Period selector */}
          <div style={{ display:"flex",gap:6,marginTop:10 }}>
            {[["7d","7 Days"],["30d","30 Days"],["all","All Time"]].map(([key,label])=>(
              <button key={key} onClick={()=>setReportPeriod(key)}
                style={{ flex:1,padding:"9px 0",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
                  ...(reportPeriod===key
                    ? { background:P, color:"#000" }
                    : chipStyle(settings, false, P)) }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 💡 Coach FKH Insights — at the top for impact */}
        <Section emoji="💡" title="Coach FKH Insights">
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {insights.length>0 ? insights.map((ins,i)=>(
              <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",padding:"9px 11px",borderRadius:10,background:`${P}0d`,border:`1px solid ${P}20` }}>
                <div style={{ width:20,height:20,borderRadius:6,background:`${P}20`,border:`1px solid ${P}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:P,flexShrink:0,marginTop:1 }}>{i+1}</div>
                <span style={{ fontSize:12,color:"var(--fkh-text)",lineHeight:1.55 }}>{ins}</span>
              </div>
            )) : (
              <div style={{ fontSize:12,color:"#475569",textAlign:"center",padding:"8px 0" }}>Train more to unlock insights. 🏀</div>
            )}
          </div>
        </Section>

        {/* 🏋️ Training Overview */}
        <Section emoji="🏋️" title="Training">
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
            <Stat label="Days" value={report.training.days}/>
            <Stat label="Exercises" value={report.training.exercises}/>
            <Stat label="Minutes" value={report.training.minutes}/>
          </div>
        </Section>

        {/* 🏀 Shots Made */}
        <Section emoji="🏀" title="Shots Made">
          {report.shots.total===0
            ? <div style={{ fontSize:12,color:"#475569",textAlign:"center" }}>No shots logged this period.</div>
            : <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
                <Stat label="Total Makes" value={report.shots.total.toLocaleString()}/>
                <Stat label="Daily Avg" value={report.shots.average}/>
                <Stat label="Best Day" value={report.shots.bestDay} sub={report.shots.bestDayDate ? new Date(report.shots.bestDayDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : ""}/>
              </div>
          }
        </Section>

        {/* 🔥 Streaks */}
        <Section emoji="🔥" title="Streaks">
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
            <Stat label="Current" value={`${report.streaks.current}d`}/>
            <Stat label="Best This Period" value={`${report.streaks.longest}d`}/>
            <Stat label="Training Days" value={report.streaks.days}/>
          </div>
        </Section>

        {/* ⭐ Level Progress */}
        <Section emoji="⭐" title="Level Progress">
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
            <span style={{ fontSize:28 }}>{currentLevel.emoji}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:800,color:"var(--fkh-text)" }}>{currentLevel.name}</div>
              <div style={{ fontSize:11,color:"#64748b" }}>
                {reportPeriod!=="all" ? `+${report.periodXP} XP earned this period` : `${xpData.total} XP total`}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:P }}>{xpData.total.toLocaleString()}</div>
              <div style={{ fontSize:9,color:"#475569" }}>TOTAL XP</div>
            </div>
          </div>
          {(()=>{
            const nextLv = LEVELS.find(l=>l.xpMin>xpData.total);
            if (!nextLv) return <div style={{ fontSize:11,color:"#22c55e",fontWeight:700 }}>🏆 Max Level Achieved!</div>;
            const pct = Math.round(((xpData.total-currentLevel.xpMin)/(nextLv.xpMin-currentLevel.xpMin))*100);
            return (
              <>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                  <span style={{ fontSize:10,color:"#64748b" }}>→ {nextLv.emoji} {nextLv.name}</span>
                  <span style={{ fontSize:10,color:P,fontWeight:700 }}>{pct}%</span>
                </div>
                <div style={{ height:5,borderRadius:99,background:"rgba(255,255,255,0.07)" }}>
                  <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:`linear-gradient(90deg,${P},${S})` }}/>
                </div>
                <div style={{ fontSize:10,color:"#475569",marginTop:6 }}>{nextLv.xpMin-xpData.total} XP to {nextLv.name}</div>
              </>
            );
          })()}
        </Section>

        {/* 📈 Category Breakdown */}
        <Section emoji="📈" title="Category Breakdown">
          {report.training.exercises===0
            ? <div style={{ fontSize:12,color:"#475569",textAlign:"center" }}>No exercises logged this period.</div>
            : <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {report.categories.filter(c=>c.count>0).sort((a,b)=>b.count-a.count).map(cat=>(
                  <div key={cat.key}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:12,fontWeight:600,color:"var(--fkh-text)" }}>{cat.emoji} {cat.label}</span>
                      <span style={{ fontSize:11,color:P,fontWeight:700 }}>{cat.count} · {cat.pct}%</span>
                    </div>
                    <div style={{ height:5,borderRadius:99,background:"rgba(255,255,255,0.07)" }}>
                      <div style={{ height:"100%",width:`${cat.pct}%`,borderRadius:99,background:P,minWidth:cat.count>0?4:0 }}/>
                    </div>
                  </div>
                ))}
                {report.categories.every(c=>c.count===0) && <div style={{ fontSize:12,color:"#475569",textAlign:"center" }}>No basketball-specific categories tracked yet.</div>}
              </div>
          }
        </Section>

        {/* 🏆 Achievements */}
        <Section emoji="🏆" title="Achievements">
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {/* Badges earned in period */}
            <div>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Badges Earned{reportPeriod!=="all"?` This ${reportPeriod==="7d"?"Week":"Month"}`:""}</div>
              {report.badges.length>0
                ? <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {report.badges.map(b=>(
                      <div key={b.id} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,
                        background:`${b.color||P}15`,border:`1px solid ${b.color||P}30` }}>
                        <span style={{ fontSize:14 }}>{b.emoji}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:b.color||P }}>{b.name}</span>
                      </div>
                    ))}
                  </div>
                : <div style={{ fontSize:11,color:"#334155" }}>No badges earned this period yet.</div>
              }
            </div>
            {/* Programs */}
            <div>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Programs Completed</div>
              {report.completedPrograms.length>0
                ? <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {report.completedPrograms.map(p=>(
                      <div key={p.id} style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,
                        background:`${p.color}15`,border:`1px solid ${p.color}30` }}>
                        <span style={{ fontSize:14 }}>{p.emoji}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:p.color }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                : <div style={{ fontSize:11,color:"#334155" }}>No programs completed yet.</div>
              }
            </div>
            {/* Challenges */}
            <div>
              <div style={{ fontSize:10,color:"#64748b",fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em" }}>Challenges Completed</div>
              <div style={{ fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:P }}>{report.completedChallenges.length}<span style={{ fontSize:11,color:"#475569",fontWeight:400,fontFamily:"sans-serif" }}> / {CHALLENGES_DEF.length}</span></div>
            </div>
          </div>
        </Section>

        {/* 📌 Favorites */}
        <Section emoji="📌" title="Favorites">
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {[
              { label:"Most Completed (All Time)", value: report.mostCompleted ? `${report.mostCompleted.name} (${report.mostCompleted.count}×)` : "—" },
              { label:`Top Drill This ${reportPeriod==="7d"?"Week":reportPeriod==="30d"?"Month":"Period"}`, value: report.periodMostCompleted ? `${report.periodMostCompleted.name} (${report.periodMostCompleted.count}×)` : "—" },
              { label:"⭐ Starred Exercise", value: report.favExercise ? report.favExercise.name : "None yet — tap ☆ on any drill" },
              { label:"⭐ Starred Workout", value: report.favWorkout ? `${report.favWorkout.emoji} ${report.favWorkout.name}` : "None yet" },
              { label:"⭐ Starred Program", value: report.favProgram ? `${report.favProgram.emoji} ${report.favProgram.name}` : "None yet" },
            ].map(({label,value})=>(
              <div key={label} style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,
                padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:11,color:"#64748b",flex:1 }}>{label}</span>
                <span style={{ fontSize:11,fontWeight:700,color:"var(--fkh-text)",textAlign:"right",maxWidth:"55%" }}>{value}</span>
              </div>
            ))}
          </div>
        </Section>

        {renderBottomNav()}
      </div>
    );
  }

  /* SCHEDULE / CALENDAR (Tier 1 — expose existing views) */
  if (view==="schedule") {
    const scheduleBack = ["home", "profile", "progress", "report"].includes(prevView) ? prevView : "home";
    const scheduleBackLabel = scheduleBack === "progress" || scheduleBack === "profile" ? "Me"
      : scheduleBack === "report" ? "Report" : "Home";
    return (
      <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
        {shellOverlays}
        {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]} onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
        {renderMissionOverlays()}
        {tourOverlay}
        <div style={{ padding:"16px 20px 12px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
          <button onClick={()=>setView(scheduleBack)}
            style={{ marginBottom:10,padding:"5px 12px",borderRadius:8,border:`1px solid ${P}30`,background:`${P}14`,color:P,fontSize:11,fontWeight:700,cursor:"pointer" }}>
            ← {scheduleBackLabel}
          </button>
          <h1 style={{ fontSize:20,fontWeight:800,margin:0,color:"var(--fkh-text)" }}>🗓 Training Calendar</h1>
          <p style={{ fontSize:12,color:"#64748b",margin:"4px 0 0" }}>Weekly plan & training history</p>
          <div style={{ display:"flex",gap:8,marginTop:12 }}>
            {[
              { id:"week",     label:"📋 This Week" },
              { id:"calendar", label:"🗓 Calendar"   },
            ].map(t=>(
              <button key={t.id} onClick={()=>setSchedTab(t.id)}
                style={{ flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
                  ...(schedTab===t.id
                    ? { background:P, border:`1px solid ${P}`, color:"#000" }
                    : chipStyle(settings, false, P)) }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {schedTab==="week"&&(
          <div style={{ padding:"4px 20px 20px" }}>
            {(() => {
              const enrolledList = PROGRAMS.filter(p => enrolledPrograms[p.id]);
              if (!enrolledList.length) return null;
              return (
                <>
                  {enrolledList.length > 1 && (
                    <div style={{ ...lbl, marginTop: 4 }}>My Programs</div>
                  )}
                  {enrolledList.map(prog => {
                    const enrollment = enrolledPrograms[prog.id];
                    const weekPlan = buildProgramWeekPlan(prog, enrollment, programProgress, today);
                    if (!weekPlan) return null;
                    return (
                      <div key={prog.id} style={{ marginBottom:16,padding:"12px 14px",borderRadius:14,background:`${prog.color}0c`,border:`1px solid ${prog.color}33` }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
                          <span style={{ fontSize:16 }}>{prog.emoji}</span>
                          <span style={{ fontSize:12,fontWeight:700,color:"var(--fkh-text)" }}>{prog.name}</span>
                          <span style={{ fontSize:10,color:prog.color,fontWeight:700,marginLeft:"auto" }}>Week {weekPlan.curWeek}</span>
                        </div>
                        <ProgramWeekStrip plan={weekPlan} color={prog.color} />
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {scheduleDetailDate && (
              <div style={{ marginBottom: 14 }}>
                <button type="button" onClick={() => setScheduleDetailDate(null)}
                  style={{ marginBottom: 8, padding:"5px 10px", borderRadius:8, border:`1px solid ${bd}`,
                    background:"transparent", color:"#64748b", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  ← Back to week
                </button>
                <DayPlanPanel
                  plan={buildTrainingDayPlan(scheduleDetailDate, SCHEDULE, PROGRAMS, enrolledPrograms, programProgress, WORKOUTS)}
                  history={buildCalendarData(completed)[scheduleDetailDate] || null}
                  cats={CATS}
                  allExercises={ALL_EXERCISES}
                  P={P}
                  SF={SF}
                  bd={bd}
                  onOpenCategory={cat => { setActiveCat(cat); setPrevView("schedule"); setView("cat"); }}
                  onOpenExercise={(ex, list, ctx) => openDetail(ex, list || [ex], ctx)}
                  onStartProgramSession={(exs, ctx) => { if (exs?.[0]) openDetail(exs[0], exs, ctx); }}
                  onStartCustomWorkout={exs => { if (exs?.[0]) openDetail(exs[0], exs); }}
                />
              </div>
            )}

            {!scheduleDetailDate && (
              <>
                <div style={lbl}>This Week&apos;s Plan</div>
                {(() => {
                  const weekDates = currentWeekDates(today);
                  const calData = buildCalendarData(completed);
                  return SCHEDULE.map((d, i) => {
                    const dateStr = weekDates[i];
                    const isToday = dateStr === today;
                    const dayPlan = buildTrainingDayPlan(dateStr, SCHEDULE, PROGRAMS, enrolledPrograms, programProgress, WORKOUTS);
                    const dayData = calData[dateStr];
                    const hasWork = d.cats.length > 0 || dayPlan.programSessions.length > 0 || (dayPlan.customSessions?.length || 0) > 0;
                    return (
                      <div key={i}
                        onClick={hasWork ? () => setScheduleDetailDate(dateStr) : undefined}
                        style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:10,
                          marginBottom:4,
                          background:isToday ? `${P}0e` : "transparent",
                          border:`1px solid ${isToday ? `${P}30` : "transparent"}`,
                          cursor:hasWork ? "pointer" : undefined }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11,
                          color:isToday ? P : `${P}99`, width:32, flexShrink:0, fontWeight:isToday ? 800 : 400 }}>
                          {d.day}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, color:isToday ? P : `${P}dd`, fontWeight:600 }}>{d.label}</div>
                          {dayPlan.programSessions.map(({ program, session, done }) => (
                            <div key={program.id} style={{ marginTop:6 }}>
                              <div style={{ fontSize:10, color:program.color, fontWeight:700 }}>
                                {program.emoji} {program.name} · {session.focus}{done ? " ✓" : ""}
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", gap:2, marginTop:4, paddingLeft:4 }}>
                                {session.exercises.slice(0, 4).map(exId => {
                                  const ex = ALL_EXERCISES[exId];
                                  if (!ex) return null;
                                  return (
                                    <div key={exId} style={{ fontSize:10, color:"#94a3b8" }}>{ex.name}</div>
                                  );
                                })}
                                {session.exercises.length > 4 && (
                                  <div style={{ fontSize:9, color:"#64748b" }}>+{session.exercises.length - 4} more</div>
                                )}
                              </div>
                            </div>
                          ))}
                          {(dayPlan.customSessions || []).map(cw => (
                            <div key={cw.id} style={{ fontSize:10, color:P, marginTop:4, fontWeight:700 }}>
                              {cw.emoji} {cw.name} · {cw.exerciseIds.length} drills
                            </div>
                          ))}
                        </div>
                        {dayData?.xp > 0 && (
                          <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:"#22c55e",
                            background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)",
                            borderRadius:20, padding:"2px 7px", flexShrink:0 }}>
                            +{dayData.xp} XP
                          </span>
                        )}
                        {isToday && !dayData && (
                          <span style={{ fontSize:9, fontWeight:800, color:P, letterSpacing:"0.06em", flexShrink:0 }}>TODAY</span>
                        )}
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end", maxWidth:120 }}>
                          {d.cats.map(c => (
                            <button key={c} type="button"
                              onClick={e => { e.stopPropagation(); setActiveCat(c); setPrevView("schedule"); setView("cat"); }}
                              style={{ fontSize:10, padding:"3px 8px", borderRadius:20, background:catBg(c),
                                color:catColor(c), border:`1px solid ${catBrd(c)}`, fontWeight:600, cursor:"pointer" }}>
                              {CATS[c].emoji}
                            </button>
                          ))}
                        </div>
                        {hasWork && <span style={{ fontSize:16, color:`${P}80`, flexShrink:0, lineHeight:1 }}>›</span>}
                      </div>
                    );
                  });
                })()}
              </>
            )}
          </div>
        )}

        {schedTab==="calendar"&&(
          <CalendarView
            completed={completed}
            P={P}
            S={S}
            BG={BG}
            SF={SF}
            bd={bd}
            lbl={lbl}
            schedule={SCHEDULE}
            programs={PROGRAMS}
            enrolledPrograms={enrolledPrograms}
            programProgress={programProgress}
            cats={CATS}
            allExercises={ALL_EXERCISES}
            workouts={WORKOUTS}
            onOpenCategory={cat => { setActiveCat(cat); setPrevView("schedule"); setView("cat"); }}
            onOpenExercise={(ex, list, ctx) => openDetail(ex, list || [ex], ctx)}
            onStartProgramSession={(exs, ctx) => { if (exs?.[0]) openDetail(exs[0], exs, ctx); }}
          />
        )}

        {renderBottomNav()}
      </div>
    );
  }

  /* HOME */
  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"var(--fkh-text)",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}
      {activeExercise&&<ExerciseDetailSheet
        exercise={activeExercise} color={catColor(activeExercise._cat)}
        bg2={catBg(activeExercise._cat)} brd={catBrd(activeExercise._cat)}
        BG={BG} SF={SF} isDone={isDone(activeExercise.id)}
        onToggle={()=>toggle(activeExercise.id)}
        onClose={closeDetail}
        onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
        completed={completed}
        favored={isFav("exercises",activeExercise.id)}
        onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
        {...detailSheetProps}/>}
      {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]}
        onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
      {renderMissionOverlays()}
      {tourOverlay}
      {showOnboarding && !auth.loading && (
        <OnboardingSheet
          P={P}
          onComplete={({ settings: patch, finalize = true }) => {
            setSettings(p => {
              const next = { ...p, ...patch };
              safePersistKey("s_settings", next, { force: true });
              return next;
            });
            if (!finalize) return;
            localStorage.setItem("s_onboarded", "1");
            track(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, {});
            setShowOnboarding(false);
            startTour();
          }}
          onAuthSuccess={applyCloudSync}
          onForgotPasscode={() => { setAuthInitialMode("forgot"); setShowAuth(true); }}
        />
      )}
      <div style={{ padding:"26px 20px 16px",borderBottom:`1px solid ${P}14` }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <h1 style={{ flex:1,minWidth:0,fontSize:28,fontWeight:800,margin:0,letterSpacing:"-0.03em",lineHeight:1.1 }}>
            FKH <span style={{ color:P }}>Fit Kid Hooper</span>
          </h1>
          <div style={{ display:"flex",gap:6,flexShrink:0 }}>
            <button type="button" onClick={openFeedback} title="Send feedback" aria-label="Send feedback"
              style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"var(--fkh-text-muted)",fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px" }}>
              💬
            </button>
            <button type="button" onClick={() => openGuide("explore")} title="Guide" aria-label="Open guide"
              style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"var(--fkh-text-muted)",fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px" }}>
              📖
            </button>
          </div>
          <div style={{ position:"relative",width:56,height:56,flexShrink:0 }}>
            <div onClick={()=>{ setView("progress"); setProgressTab("overview"); }}
              style={{ width:56,height:56,borderRadius:"50%",background:`${P}18`,border:`3px solid ${P}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              {settings.avatar?<img src={settings.avatar} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ fontSize:24 }}>👤</span>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap" }}>
          <p style={{ fontSize:14,color:P,fontWeight:600,margin:0 }}>{settings.athleteName}</p>
          <div onClick={()=>{ setView("progress"); setProgressTab("overview"); }}
            style={{ display:"flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,cursor:"pointer",
              background:`${P}20`,border:`1px solid ${P}45` }}>
            <span style={{ fontSize:11 }}>{currentLevel.emoji}</span>
            <span style={{ fontSize:11,fontWeight:800,color:P }}>{currentLevel.name}</span>
            <span style={{ fontSize:10,color:P,fontFamily:"'DM Mono',monospace",opacity:0.85 }}>· {xpData.total} XP</span>
          </div>
        </div>
      </div>


      {/* Badge Earned Notification Banner (home screen) */}
      {lastEarnedBadge && view==="home" && (
        <div style={{ margin:"10px 20px 0",padding:"12px 14px",borderRadius:14,
          background:`${lastEarnedBadge.color}12`,
          border:`1px solid ${lastEarnedBadge.color}35`,
          display:"flex",alignItems:"center",gap:12,
          animation:"fkh-fade-up 0.35s ease both" }}>
          <div style={{ width:38,height:38,borderRadius:12,flexShrink:0,
            background:`${lastEarnedBadge.color}20`,
            border:`1.5px solid ${lastEarnedBadge.color}50`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,animation:"fkh-bounce 0.6s ease-out 0.1s both" }}>
            {lastEarnedBadge.emoji}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:11,fontWeight:800,color:lastEarnedBadge.color,
              textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2 }}>
              Badge Unlocked!
            </div>
            <div style={{ fontSize:13,fontWeight:700,color:"var(--fkh-text)",lineHeight:1.2 }}>
              {lastEarnedBadge.name}
            </div>
          </div>
          <button onClick={()=>{ setView("progress"); setProgressTab("locker"); setLastEarnedBadge(null); }}
            style={{ background:lastEarnedBadge.color,border:"none",color:"#000",fontSize:10,
              fontWeight:800,cursor:"pointer",borderRadius:20,padding:"5px 12px",
              whiteSpace:"nowrap",flexShrink:0 }}>
            View →
          </button>
          <button onClick={()=>setLastEarnedBadge(null)}
            style={{ background:"none",border:"none",color:"#475569",fontSize:16,
              cursor:"pointer",padding:0,lineHeight:1,flexShrink:0 }}>
            ✕
          </button>
        </div>
      )}

      <ViewErrorBoundary
        label="Today"
        title="Today couldn't load"
        message="Something broke on the home screen. Tap try again — if it keeps happening, open Me → Settings and export a backup."
        P={P}
        onRetry={() => setShotLogTick(t => t + 1)}
      >
        <TodayView
        settings={settings}
        P={P}
        S={S}
        ST={ST}
        BG={BG}
        SF={SF}
        NV={NV}
        bd={bd}
        coachMsg={coachMsg}
        today={today}
        growthLog={growthLog}
        schedule={SCHEDULE}
        todayMission={todayMission}
        missionClaimed={missionClaimed}
        requiredTasksDone={requiredTasksDone}
        completed={completed}
        programProgress={programProgress}
        challengeNudge={challengeNudge}
        dailyAction={dailyAction}
        missionHasProgramTask={missionHasProgramTask}
        enrolledPrograms={enrolledPrograms}
        programs={PROGRAMS}
        progressCtx={progressCtx}
        showFindDrills={showFindDrills}
        onShowFindDrills={() => setShowFindDrills(true)}
        onHideFindDrills={() => setShowFindDrills(false)}
        onOpenProgramsSection={openProgramsSection}
        favorites={favorites}
        cats={CATS}
        workouts={WORKOUTS}
        allExercises={ALL_EXERCISES}
        exerciseMeta={EXERCISE_META}
        workoutTemplates={WORKOUT_TEMPLATES}
        searchExercises={searchExercises}
        onPickCategory={(cat) => { setActiveCat(cat); setPrevView("home"); setView("cat"); }}
        onOpenPath={openLegendsJourney}
        onSetFavorite={() => setShowPlayLikePicker(true)}
        onOpenPlayerHighlight={openPlayerHighlight}
        onFocusFriends={focusSquad}
        onOpenMessages={navigateToMessages}
        squadNotifications={squadNotifications}
        unreadMessages={unreadMessages}
        isSignedIn={auth.isSignedIn}
        onOpenAuth={() => setShowAuth(true)}
        onOpenChallenges={() => setView("boards")}
        onOpenProgram={(id) => { setSelectedProgram(id); setView("programs"); }}
        workoutOpen={workoutOpen}
        onToggleWorkoutOpen={() => setWorkoutOpen(o => !o)}
        todaysWorkout={todaysWorkout}
        quickWorkoutComplete={quickWorkoutComplete}
        selectedTemplate={selectedTemplate}
        coachRec={coachRec}
        templateScrolledEnd={templateScrolledEnd}
        onTemplateScrolledEnd={setTemplateScrolledEnd}
        selectTemplate={selectTemplate}
        refreshWorkout={refreshWorkout}
        loadWorkoutForTemplate={loadWorkoutForTemplate}
        isDone={isDone}
        isFav={isFav}
        toggleFav={toggleFav}
        openDetail={openDetail}
        getMissionTaskProgress={getMissionTaskProgress}
        isProgramExerciseDone={isProgramExerciseDone}
        getActiveProgramScheduleStatus={getActiveProgramScheduleStatus}
        onOpenWorkout={() => setWorkoutOpen(true)}
        showTourPrompt={showTourPrompt && !tourActive && !showOnboarding}
        onStartTour={startTour}
        onOpenGuide={() => openGuide("tour")}
        onDismissTourPrompt={dismissTourPromptBanner}
        showNotificationPrompt={showNotificationPrompt && !tourActive && !showOnboarding}
        onEnableNotifications={enableNotificationsFromPrompt}
        onDismissNotificationPrompt={dismissNotificationPromptBanner}
        onOpenSchedule={() => openSchedule("home", "week")}
        focusMissionSection={homeMissionFocus}
        onMissionFocusHandled={() => setHomeMissionFocus(false)}
      />
      </ViewErrorBoundary>

      {renderBottomNav()}
    </div>
  );
}

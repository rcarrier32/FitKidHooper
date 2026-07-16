import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import HistoryView from "./components/HistoryView.jsx";
import BadgesView from "./components/BadgesView.jsx";
import AuthSheet from "./components/AuthSheet.jsx";
import NotificationSettings from "./components/NotificationSettings.jsx";
import OnboardingSheet from "./components/OnboardingSheet.jsx";
import PlayLikePickerSheet from "./components/PlayLikePickerSheet.jsx";
import FeedbackCenter from "./components/FeedbackCenter.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { useSquadNotifications } from "./hooks/useSquadNotifications.js";
import GuideNavButton from "./components/GuideNavButton.jsx";
import ShotTrackerErrorBoundary from "./components/ShotTrackerErrorBoundary.jsx";
import ViewErrorBoundary from "./components/ViewErrorBoundary.jsx";
import CountBadge from "./components/CountBadge.jsx";
import { readShotLog, normalizeShotLog, writeShotLog, countShotMakes } from "./lib/shotLog.js";
import { computeShotStyleMakes, SHOT_STYLES, getShotStyle, getLastShotStyle, setLastShotStyle } from "./lib/shotStyles.js";
import { getAgeGroup, getAgeGroupLabel } from "./lib/periodStats.js";
import { exportCanonicalSave, importCanonicalSave } from "./lib/canonicalSave.js";
import { recoverFromSyncBackupIfNeeded } from "./lib/syncBackup.js";
import { writeStoredAvatar, readStoredAvatar, stripAvatarForCloud, migrateAvatarOutOfSettings } from "./lib/avatarStorage.js";
import { safePersistKey } from "./lib/dataSafety.js";
import { readStoredObject, parseStoredObject, repairStoredObjectKeys, asRecord, readStoredArray } from "./lib/storageParse.js";
import { mergeUserSettings } from "./lib/settingsMerge.js";
import { persistHydratedSettings, normalizeProfileFields, fetchAthleteProfilePatch, mergeProfilePatch } from "./lib/profileHydrate.js";
import { syncAvatarToCloud, restoreLocalAvatarFromCloud, saveAvatarLocally } from "./lib/avatarCloud.js";
import { getEffectiveAthleteId, hasStoredAuthSession } from "./lib/auth.js";
import { migrateIdentitySettings } from "./lib/identity.js";
import { getSupabaseClient } from "./lib/supabaseClient.js";
import { CATS, CAT_DOT_COLORS } from "./lib/categories.js";
import { BADGES_DEF, BADGE_CATS, getEarnedBadges, getBadgeProgress } from "./lib/badges.js";
import { buildProgressJourney } from "./lib/progressJourney.js";
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
import { withSessionWarmup, categoriesFromExercises, isWarmupExercise } from "./lib/sessionWarmup.js";
import {
  consumeInviteDeepLink,
  consumeMissionDeepLink,
  consumeNavigationDeepLink,
  listenForNotificationNavigation,
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
import { getOrCreateDailyMission, missionExerciseIds } from "./lib/dailyMission.js";
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
  trackHomeViewed,
  trackPracticeStarted,
  trackPracticeFinished,
  trackMissionCompleted,
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
import CoachFKHSheet from "./components/CoachFKHSheet.jsx";
import CoachIntroSheet from "./components/CoachIntroSheet.jsx";
import { buildCoachAthleteContext } from "./lib/coachAgentApi.js";
import { runGapAnalysis } from "./lib/coachAgent.js";
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
import {
  WORKOUTS,
  SCHEDULE,
  STR_DAYS,
  EXERCISE_META,
  AGE_RULES,
  POSITION_PROFILES,
  WORKOUT_TEMPLATES,
  SCHED_TO_TEMPLATE,
  BENEFIT_MAP,
  ALL_EXERCISES,
  PROGRAMS,
  PROGRAM_WEEK_TIERS,
  TIER_LABELS,
  programWeekTier,
} from "./data/trainingCatalog.js";


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

function buildCoachMessage(completed, xpData, earnedBadges, programProgress, weakAreas = [], settings = {}) {
  completed = asRecord(completed);
  programProgress = asRecord(programProgress);
  const todayKey = new Date().toLocaleDateString("en-CA");
  const playLike = (settings.favoritePlayLike || "").trim();
  const goalHint = (settings.goals || [])[0];
  const GOAL_LABELS = {
    handles: "handles", shooting: "shooting", finishing: "finishing",
    defense: "defense", footwork: "footwork", get_stronger: "strength",
    conditioning: "conditioning",
  };
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
    { key:"defense", label:"Defense" },
  ];
  // Prefer the shared skill-graph gap analysis (same source Coach FKH chat uses);
  // fall back to the legacy 7-day-untrained-category check if it has no signal yet.
  let gapCat = weakAreas?.[0]?.label || null;
  if (!gapCat) {
    const nowMs = Date.now();
    for (const { key, label } of bballGapCheck) {
      const ids = new Set((WORKOUTS[key] || []).map(e => e.id));
      const lastMs = Object.keys(completed).filter(k => completed[k] && [...ids].some(id => k.includes(id)))
        .map(k => new Date(k.split("-").slice(0, 3).join("-") + "T12:00:00").getTime()).sort((a, b) => b - a)[0] || 0;
      if ((nowMs - lastMs) / 86400000 >= 7) { gapCat = label; break; }
    }
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
  // Returning after a break (has history, no streak) — don't treat like day-one.
  if (doneToday === 0 && streak === 0 && xpData.total > 0) {
    if (playLike) return `Welcome back — channel that ${playLike} energy today. No pressure, just reps. 🏀`;
    return "Welcome back — pick up where you left off. No pressure, just reps. 🏀";
  }
  if (doneToday === 0 && streak === 0) {
    if (playLike) return `Let's build those ${playLike} skills — first drill starts now. 🏀`;
    if (goalHint && GOAL_LABELS[goalHint]) return `Ready to level up your ${GOAL_LABELS[goalHint]}? Let's get your first rep in. 🏀`;
    return "Every champion started at zero. Let's get your first rep in. 🏀";
  }
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

  if (!slots.warmup.length) {
    const fallback = scored.find(ex => ex.id === "jumping-jacks")
      || scored.find(ex => (ex.meta.workoutRole || []).includes("warmup"));
    if (fallback) slots.warmup = [fallback];
  }

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
  completed = asRecord(completed);
  programProgress = asRecord(programProgress);
  missionLog = asRecord(missionLog);
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

/** XP gained by completing a practice session's drills today (includes bonuses that unlocked). */
function computeSessionXpEarned(sessionExerciseIds, completed, programProgress, missionLog, todayStr, programContext) {
  const ids = (sessionExerciseIds || []).filter(Boolean);
  if (!ids.length) return 0;
  const after = computeXP(completed, programProgress, missionLog);
  const beforeCompleted = { ...asRecord(completed) };
  for (const id of ids) {
    delete beforeCompleted[`${todayStr}-${id}`];
  }
  let beforeProgramProgress = asRecord(programProgress);
  if (programContext?.programId) {
    const { programId, week, sessionIdx } = programContext;
    const slot = programSessionSlot(week, sessionIdx);
    const prog = beforeProgramProgress[programId];
    if (prog) {
      const slotData = { ...(prog[slot] || {}) };
      for (const id of ids) delete slotData[id];
      beforeProgramProgress = {
        ...beforeProgramProgress,
        [programId]: { ...prog, [slot]: slotData },
      };
    }
  }
  const before = computeXP(beforeCompleted, beforeProgramProgress, missionLog);
  const delta = after.total - before.total;
  return Math.max(delta, ids.length * 5);
}

/* ═══════════════════════ CALENDAR DATA ══════════════════════ */

function buildCalendarData(completed) {
  completed = asRecord(completed);
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
  completed = asRecord(completed);
  badgeDatesMap = asRecord(badgeDatesMap);
  programProgress = asRecord(programProgress);
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
    {key:"defense",       label:"Defense",                 emoji:"🛡️"},
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
 *
 * Anti-repeat uses categories from the prior 3 days only (excludes today) so
 * freestyle drills done before opening Today don't reshape the mission, and so
 * completing today's mission never feeds back into its own definition.
 */
function generateDailyMission(todayStr, settings, completed, enrolledPrograms, programProgress={}) {
  const age = calcAge(settings.dateOfBirth);
  const cutoff = new Date(Date.now()-3*86400000).toLocaleDateString("en-CA");
  const recentCats = new Set(
    Object.keys(completed)
      .filter(k => {
        const d = k.split("-").slice(0, 3).join("-");
        return d >= cutoff && d < todayStr && completed[k];
      })
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

// Skill-graph area → workout template, for grounding coach nudges in the shared skill graph
const AREA_TO_TEMPLATE = { handles:"handles", shooting:"shooting", defense:"defense", footwork:"quickFeet" };

function computeRecommendation(settings, completed, currentTemplate, weakAreas = []) {
  completed = asRecord(completed);
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

  // Priority 3.5 — grounded skill-area gap (shared source with Coach FKH chat)
  if (!reasons.length && weakAreas?.length) {
    const gap = weakAreas.find(w => AREA_TO_TEMPLATE[w.area]);
    if (gap) {
      recommendedTemplate = AREA_TO_TEMPLATE[gap.area];
      reasons.push(`Your ${gap.label.toLowerCase()} is behind your other skills — let's close that gap today.`);
    }
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

                  <div style={{ fontSize:10, fontWeight:700, color:"#64748b", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
                    Shot type
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                    {SHOT_STYLES.map(sty => (
                      <button key={sty.id} type="button" onClick={() => pickShotStyle(sty.id)}
                        style={{
                          padding:"10px 8px", borderRadius:10, cursor:"pointer",
                          border:`1.5px solid ${shotStyle === sty.id ? P : bd}`,
                          background: shotStyle === sty.id ? `${P}22` : "rgba(255,255,255,0.04)",
                          color: shotStyle === sty.id ? P : "var(--fkh-text-muted)",
                          fontSize:11, fontWeight: shotStyle === sty.id ? 800 : 600,
                          lineHeight:1.25, textAlign:"center",
                        }}>
                        {sty.label}
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
                      <div style={{ fontSize:10, color:"#64748b" }}>{sty.label}</div>
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
                    <span style={{ fontSize:11,color:"var(--fkh-text-muted)",flex:1,minWidth:0 }}>{st.label}</span>
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
    const list = withSessionWarmup(
      (exercises || []).map(e => ({ ...e, meta: e.meta || EXERCISE_META[e.id] || {} })),
      workouts,
      EXERCISE_META,
      { categories: categoriesFromExercises(exercises, allExercises) },
    );
    if (list[0]) onOpenExercise?.(list[0], list, ctx);
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
          workouts={workouts}
          exerciseMeta={EXERCISE_META}
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
  programContext, setLog, onSetLogChange, maxRepsMap, onMaxRepsChange, bilateralPrefs, onBilateralPrefChange, settings, today, onAskCoach,
  sessionList, isSessionExerciseDone, totalXP, hasPendingCelebration, sessionXpEarned }) {
  useWakeLock(true);

  /* Practice session summary — only meaningful for a real multi-exercise
     session, not a single drill opened via "learn about this exercise". */
  const session = useMemo(() => {
    if (!sessionList || sessionList.length < 2 || !isSessionExerciseDone) return null;
    const total = sessionList.length;
    const done = sessionList.filter(e => isSessionExerciseDone(e.id, programContext)).length;
    const minutes = Math.max(1, Math.round(
      sessionList.reduce((s, e) => s + (e.meta?.estimatedDuration || 180), 0) / 60,
    ));
    const xp = typeof sessionXpEarned === "number" && sessionXpEarned > 0
      ? sessionXpEarned
      : total * 5;
    return { total, done, minutes, xp, isLast: exercise && sessionList.at(-1)?.id === exercise.id };
  }, [sessionList, isSessionExerciseDone, programContext, exercise, sessionXpEarned]);

  const [showComplete, setShowComplete] = useState(false);
  const [completePending, setCompletePending] = useState(false);
  const triggerComplete = () => {
    if (hasPendingCelebration) setCompletePending(true);
    else setShowComplete(true);
  };
  useEffect(() => {
    if (completePending && !hasPendingCelebration) {
      setShowComplete(true);
      setCompletePending(false);
    }
  }, [completePending, hasPendingCelebration]);
  const streak = useMemo(() => {
    if (!completed) return 0;
    let s = 0, d = new Date();
    for (let i = 0; i < 60; i++) {
      const k = d.toLocaleDateString("en-CA");
      if (Object.keys(completed).some(c => c.startsWith(k) && completed[c])) { s++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return s;
  }, [completed]);
  const levelAfter = totalXP != null ? getLevel(totalXP + (session?.xp || 0)) : null;

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
    else if (session) setTimeout(() => triggerComplete(), 500);
  };

  // Mirrors handleAllSetsComplete's existing auto-advance timing for the
  // plain (non-sets-tracking) footer button, so both paths feel continuous
  // instead of requiring a second "Next" tap.
  const handleMarkComplete = () => {
    const wasNotDone = !isDone;
    onToggle();
    if (!wasNotDone) return;
    if (onNext) setTimeout(() => onNext(), 900);
    else if (session) setTimeout(() => triggerComplete(), 500);
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

        {/* Practice session progress — only when this is a real multi-drill
            session, not a single "learn about this drill" open. */}
        {session && (
          <div style={{ padding:"10px 16px", borderBottom:`1px solid ${color}14`, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, flexWrap:"wrap", gap:4 }}>
              <span style={{ fontSize:11, fontWeight:800, color, letterSpacing:"0.04em" }}>
                🏀 Today's Practice · {session.minutes} min · {session.total} exercises · +{session.xp} XP
              </span>
              <span style={{ fontSize:11, fontWeight:700, color:"var(--fkh-text-muted)" }}>
                {session.done} of {session.total} complete
              </span>
            </div>
            <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.06)" }}>
              <div style={{ height:"100%", width:`${(session.done / session.total) * 100}%`, borderRadius:99,
                background:color, transition:"width 0.35s" }} />
            </div>
          </div>
        )}

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

            {/* Ask Coach FKH — always available, independent of coachNotes/cues coverage */}
            {onAskCoach && (
              <button type="button" onClick={()=>onAskCoach(exercise.id)}
                style={{ display:"flex",alignItems:"center",gap:8,width:"100%",marginBottom:18,
                  background:`${color}0d`,border:`1px solid ${color}28`,borderRadius:12,
                  padding:"11px 14px",cursor:"pointer",textAlign:"left" }}>
                <span style={{ fontSize:15 }}>🧠</span>
                <span style={{ fontSize:13,fontWeight:700,color,flex:1 }}>Ask Coach FKH about this drill</span>
                <span style={{ fontSize:13,fontWeight:700,color }}>→</span>
              </button>
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
          <button onClick={handleMarkComplete}
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

        {/* Practice-complete celebration — covers the panel once the last
            drill in a real multi-exercise session is marked done. */}
        {showComplete && session && (
          <div style={{ position:"absolute", inset:0, zIndex:5, background:BG,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"32px 28px", textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12, animation:"fkh-bounce 0.6s ease-out 0.1s both" }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--fkh-text)", marginBottom:18 }}>
              Today's Practice Complete
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320, marginBottom:22 }}>
              {streak >= 2 && (
                <div style={{ padding:"10px 14px", borderRadius:12, background:"rgba(249,115,22,0.1)",
                  border:"1px solid rgba(249,115,22,0.3)", fontSize:14, fontWeight:700, color:"#f97316" }}>
                  🔥 {streak}-Day Streak Continues
                </div>
              )}
              <div style={{ padding:"12px 14px", borderRadius:14, background:`${color}14`,
                border:`1px solid ${color}33`, fontSize:15, fontWeight:800, color }}>
                +{session.xp} XP Earned
                {session.xp > session.total * 5 && (
                  <div style={{ fontSize:11, fontWeight:600, opacity:0.85, marginTop:4 }}>
                    Includes workout & challenge bonuses
                  </div>
                )}
              </div>
              {levelAfter && (
                <div style={{ fontSize:12, color:"var(--fkh-text-muted)" }}>
                  {levelAfter.xpNext != null
                    ? `One step closer to ${LEVELS.find(l => l.rank === levelAfter.rank + 1)?.name || "the next level"}`
                    : `${levelAfter.emoji} ${levelAfter.name} — the top of the mountain`}
                </div>
              )}
            </div>
            <div style={{ fontSize:13, color:"var(--fkh-text-muted)", marginBottom:22 }}>
              See you tomorrow. 🏀
            </div>
            <button onClick={onClose}
              style={{ padding:"13px 28px", borderRadius:12, border:"none", background:color,
                color:"#000", fontSize:14, fontWeight:800, cursor:"pointer" }}>
              Done
            </button>
          </div>
        )}
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
  // ── v8 → v9: re-repair after cloud sync regressions ──
  () => {
    repairStoredObjectKeys();
  },
  // ── v9 → v10: move avatar out of s_settings (memory / crash fix on Android) ──
  () => {
    migrateAvatarOutOfSettings();
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
try {
  recoverFromSyncBackupIfNeeded();
  runDataMigrations();
  repairStoredObjectKeys();
  migrateAvatarOutOfSettings();
  persistProgramProgressRecovery();
  checkIdStability();
} catch (e) {
  console.error("[fkh] app boot failed — attempting repair", e);
  try {
    repairStoredObjectKeys();
    migrateAvatarOutOfSettings();
  } catch { /* ignore */ }
}

function loadSettingsFromStorage(defaults) {
  try {
    migrateAvatarOutOfSettings();
    const raw = readStoredObject("s_settings");
    if (raw.avatar) {
      writeStoredAvatar(raw.avatar);
      delete raw.avatar;
    }
    if (raw.athleteAge && !raw.dateOfBirth) {
      const year = new Date().getFullYear() - Number(raw.athleteAge);
      raw.dateOfBirth = `${year}-06-15`;
    }
    delete raw.athleteAge;
    const merged = mergeUserSettings(raw, {});
    return migrateIdentitySettings(migrateThemeSettings({ ...defaults, ...merged }));
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
  const [showCoachFKH, setShowCoachFKH] = useState(false);
  const [coachInitialQuery, setCoachInitialQuery] = useState(null);
  const [showCoachIntro, setShowCoachIntro] = useState(false);
  const [tourPendingAfterCoach, setTourPendingAfterCoach] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(() => {
    try { return localStorage.getItem("fkh-workout-open") === "1"; } catch { return false; }
  });
  const [templateScrolledEnd, setTemplateScrolledEnd] = useState(false);
  const [friendsFocusTick, setFriendsFocusTick] = useState(0);
  const [playerHighlight, setPlayerHighlight] = useState(null);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const avatarUrl = useMemo(() => readStoredAvatar(), [avatarRevision]);
  const bumpAvatar = useCallback(() => setAvatarRevision(v => v + 1), []);
  const headerFrameColor = useMemo(
    () => (settings.equipped?.frame ? getAchievementMeta(settings.equipped.frame)?.color : null),
    [settings.equipped],
  );

  useEffect(() => {
    migrateAvatarOutOfSettings();
    (async () => {
      const av = readStoredAvatar();
      if (av && av.length > 120_000) {
        const saved = await saveAvatarLocally(av);
        if (saved.ok) bumpAvatar();
      }
    })();
  }, [bumpAvatar]);

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
    repairStoredObjectKeys();
    migrateAvatarOutOfSettings();
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
    try {
      const celebrated = readStoredArray("fkh-celebrated-badges");
      setCelebratedBadges(new Set(celebrated));
    } catch { /* ignore */ }
  }, []);

  const hydrateProfileIntoState = useCallback(async (userId) => {
    if (!userId) return;
    if (!readStoredAvatar()) {
      await restoreLocalAvatarFromCloud(userId);
    }
    const patch = await fetchAthleteProfilePatch(userId);
    setSettings(prev => {
      const next = migrateThemeSettings(
        mergeProfilePatch(normalizeProfileFields(prev), patch)
      );
      persistHydratedSettings(next, prev);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, []);

  const completedSafe = useMemo(() => asRecord(completed), [completed]);
  const missionLogSafe = useMemo(() => asRecord(missionLog), [missionLog]);
  const enrolledProgramsSafe = useMemo(() => asRecord(enrolledPrograms), [enrolledPrograms]);
  const programProgressSafe = useMemo(() => asRecord(programProgress), [programProgress]);

  const applyCloudSync = useCallback(async () => {
    try {
      const result = await auth.syncNow();
      repairStoredObjectKeys();
      migrateAvatarOutOfSettings();
      persistProgramProgressRecovery();
      reloadAthleteStateFromStorage();
      const sb = getSupabaseClient();
      const userId = (await sb?.auth.getSession())?.data?.session?.user?.id;
      if (userId) await hydrateProfileIntoState(userId).catch(() => {});
      if (result?.ok) refreshSquadNotifications();
      return result;
    } catch (e) {
      console.error("[fkh] applyCloudSync failed", e);
      try {
        repairStoredObjectKeys();
        migrateAvatarOutOfSettings();
        reloadAthleteStateFromStorage();
      } catch { /* ignore */ }
      return { ok: false, error: e?.message || String(e) };
    }
  }, [auth.syncNow, reloadAthleteStateFromStorage, hydrateProfileIntoState, refreshSquadNotifications]);
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

  // Post-onboarding sequence in progress: Meet Coach FKH intro, or the coach
  // sheet it opened while a tour start is still pending. Other first-run
  // surfaces (notifications, tour prompt, what's new) must wait their turn.
  const inPostOnboardingFlow = showCoachIntro || (showCoachFKH && tourPendingAfterCoach);

  useEffect(() => {
    if (!auth.isSignedIn || tourActive || showOnboarding || inPostOnboardingFlow) {
      setShowNotificationPrompt(false);
      return undefined;
    }
    let cancelled = false;
    needsNotificationSubscription().then(need => {
      if (!cancelled) setShowNotificationPrompt(need);
    });
    return () => { cancelled = true; };
  }, [auth.isSignedIn, tourActive, showOnboarding, inPostOnboardingFlow]);

  useEffect(() => {
    if (tourActive || showOnboarding || inPostOnboardingFlow) return;
    setShowTourPrompt(shouldShowTourPrompt());
  }, [tourActive, showOnboarding, inPostOnboardingFlow, completedSafe]);

  useEffect(() => {
    const onShow = () => setShowWhatsNew(true);
    window.addEventListener(WHATS_NEW_EVENT, onShow);
    return () => window.removeEventListener(WHATS_NEW_EVENT, onShow);
  }, []);

  useEffect(() => {
    if (showOnboarding || inPostOnboardingFlow || tourActive || auth.loading) return;
    if (!shouldShowWhatsNew()) return;
    const t = setTimeout(() => setShowWhatsNew(true), 800);
    return () => clearTimeout(t);
  }, [showOnboarding, inPostOnboardingFlow, tourActive, auth.loading]);

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

  const settingsPersistKey = useMemo(() => {
    try { return JSON.stringify(stripAvatarForCloud(settings)); } catch { return ""; }
  }, [settings]);

  useEffect(() => {
    if (!settingsPersistKey) return;
    safePersistKey("s_settings", JSON.parse(settingsPersistKey));
  }, [settingsPersistKey]);

  const avatarSyncRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const athleteId = await getEffectiveAthleteId();
      if (cancelled || !athleteId) return;
      const localAvatar = readStoredAvatar();
      if (!localAvatar) return;
      if (avatarSyncRef.current === localAvatar) return;
      avatarSyncRef.current = localAvatar;
      await syncAvatarToCloud(localAvatar, athleteId);
    })();
    return () => { cancelled = true; };
  }, [avatarRevision]);
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
  const toggleFav  = (type, id) => {
    if (type === "exercises" && !isFav(type, id)) track(ANALYTICS_EVENTS.EXERCISE_FAVORITE, { exercise_id: id });
    setFavorites(prev=>{
      const sec = { ...(prev[type]||{}) };
      if (sec[id]) delete sec[id]; else sec[id] = Date.now();
      return { ...prev, [type]:sec };
    });
  };

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
  const doneCnt = Object.keys(completedSafe).filter(k=>k.startsWith(today)).length;

  /* Exercise Detail helpers ────────────────────────────────── */
  const activePracticeRef = useRef(null);

  const isExerciseDoneForPractice = useCallback((exId, programContext) => {
    if (programContext && !isWarmupExercise({ id: exId })) {
      return isProgramExerciseDone(
        programProgress,
        programContext.programId,
        programContext.week,
        programContext.sessionIdx,
        exId,
      );
    }
    return !!completed[`${today}-${exId}`];
  }, [completed, programProgress, today]);

  const openDetail = useCallback((ex, list = [], context = null, practiceSource = null) => {
    const enrich = e => ({ ...e, _cat:e._cat||"speed", meta:e.meta||EXERCISE_META[e.id]||{} });
    const enrichedList = list.map(enrich);
    setActiveExercise(enrich(ex));
    setDetailList(enrichedList);
    setDetailContext(context);

    if (practiceSource && enrichedList.length > 0) {
      const exerciseIds = enrichedList.map(e => e.id);
      const allAlreadyDone = exerciseIds.every(id => isExerciseDoneForPractice(id, context));
      if (!allAlreadyDone) {
        activePracticeRef.current = {
          source: practiceSource,
          exerciseIds,
          startedAt: Date.now(),
          programContext: context,
        };
        trackPracticeStarted(practiceSource, {
          exerciseCount: exerciseIds.length,
          programId: context?.programId ?? null,
        });
      } else {
        activePracticeRef.current = null;
      }
    } else if (!enrichedList.length) {
      activePracticeRef.current = null;
    }
  }, [isExerciseDoneForPractice]);
  const openSessionWithWarmup = useCallback((exList, ctx, startEx = null, practiceSource = null) => {
    const list = withSessionWarmup(
      (exList || []).map(e => ({ ...e, meta: e.meta || EXERCISE_META[e.id] || {} })),
      WORKOUTS,
      EXERCISE_META,
      { categories: categoriesFromExercises(exList, ALL_EXERCISES) },
    );
    const first = startEx || list[0];
    if (first) openDetail(first, list, ctx, practiceSource);
  }, [openDetail]);
  const detailIdx  = activeExercise ? detailList.findIndex(e=>e.id===activeExercise.id) : -1;
  const nextExDetail = detailIdx>=0 && detailIdx<detailList.length-1 ? detailList[detailIdx+1] : null;
  const closeDetail  = () => { setActiveExercise(null); setDetailContext(null); activePracticeRef.current = null; };

  const askCoachAboutExercise = useCallback((exerciseId) => {
    setCoachInitialQuery({ intent: "explain_drill", exerciseId, label: "Tell me about this drill" });
    setShowCoachFKH(true);
  }, []);

  const detailSheetProps = {
    programContext: detailContext,
    setLog, onSetLogChange: handleSetLogChange,
    maxRepsMap, onMaxRepsChange: handleMaxRepsChange,
    bilateralPrefs, onBilateralPrefChange: handleBilateralPrefChange,
    settings, today,
    onAskCoach: askCoachAboutExercise,
    sessionList: detailList,
    isSessionExerciseDone: isExerciseDoneForPractice,
    sessionXpEarned: detailList.length >= 2
      ? computeSessionXpEarned(
        detailList.map((e) => e.id),
        completedSafe,
        programProgressSafe,
        missionLogSafe,
        today,
        detailContext,
      )
      : null,
    // Badge/mission celebrations are full-screen overlays with a semi-
    // transparent backdrop — showing the practice-complete screen underneath
    // at the same time bleeds both together. Defer to them instead of racing.
    hasPendingCelebration: celebrationQueue.length > 0 || !!missionCelebration,
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
    // Exclude today's frozen mission drills from workout anti-repeat so completing
    // the mission doesn't push those exercises out of Quick Workout shuffles.
    const exclude = missionExerciseIds(missionLogSafe[today]?.mission);
    return Object.keys(completedSafe)
      .filter(k=>{ const d=k.split("-").slice(0,3).join("-"); return d>=cutoff && completedSafe[k]; })
      .map(k=>k.split("-").slice(3).join("-"))
      .filter(id => !exclude.has(id));
  },[completedSafe, missionLogSafe, today]);

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
      avatarUrl={avatarUrl}
      onAvatarChange={bumpAvatar}
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
        setShowAuth(false);
        setAuthInitialMode("signin");
        if (showOnboarding) {
          localStorage.setItem("s_onboarded", "1");
          track(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, {});
          setShowOnboarding(false);
          setShowCoachIntro(true);
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
    if (view === "home") trackHomeViewed();
  }, [view, selectedProgram, activeCat, schedTab]);

  useEffect(() => {
    const ap = activePracticeRef.current;
    if (!ap) return;
    const allDone = ap.exerciseIds.every((id) => isExerciseDoneForPractice(id, ap.programContext));
    if (!allDone) return;
    trackPracticeFinished(ap.source, {
      exerciseCount: ap.exerciseIds.length,
      durationSec: Math.round((Date.now() - ap.startedAt) / 1000),
    });
    activePracticeRef.current = null;
  }, [completed, programProgress, isExerciseDoneForPractice]);

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

  const coachAthleteContext = useMemo(
    () => buildCoachAthleteContext({ settings, completed: completedSafe, enrolledPrograms: enrolledProgramsSafe, workouts: WORKOUTS }),
    [settings, completedSafe, enrolledProgramsSafe],
  );
  const coachGapAnalysis = useMemo(() => runGapAnalysis(coachAthleteContext), [coachAthleteContext]);

  const coachRec = useMemo(() =>
    computeRecommendation(settings, completedSafe, coachBasisTemplate ?? defaultTmpl, coachGapAnalysis.weakAreas),
  [settings, completedSafe, coachBasisTemplate, defaultTmpl, coachGapAnalysis]);

  /* XP / Level / Badges ──────────────────────────────────── */
  const xpData = useMemo(() => computeXP(completedSafe, programProgressSafe, missionLogSafe), [completedSafe, programProgressSafe, missionLogSafe]);
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
  const earnedBadges = useMemo(() => getEarnedBadges(completedSafe, programProgressSafe, PROGRAMS), [completedSafe, programProgressSafe]);
  const personalChallenges = useMemo(() => buildPersonalChallenges(completedSafe, WORKOUTS), [completedSafe]);
  const recommendedProgramIds = useMemo(() => recommendProgramsForFavorite(settings), [settings]);
  const totalBadges = BADGES_DEF.length;
  const totalTracks = PATHS.length;
  const coachMsg = useMemo(
    () => buildCoachMessage(completedSafe, xpData, earnedBadges, programProgressSafe, coachGapAnalysis.weakAreas, settings),
    [completedSafe, xpData, earnedBadges, programProgressSafe, coachGapAnalysis, settings]
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
        ledgerIds: new Set(Object.keys(asRecord(ledger))),
        makes,
        maxStreak,
        catCounts: computeCatCounts(completedSafe, getExerciseCategory),
        exCounts: computeExCounts(completedSafe),
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
  },[earnedBadges, completedSafe, getExerciseCategory, ledger, shotLogTick]);

  const tracksComplete = useMemo(
    () => PATHS.filter(t => trackStageProgress(t, progressCtx).reached >= t.stages.length).length,
    [progressCtx]
  );

  // Progress Journey view-model for Me › Overview — reframes existing training
  // data (completed drills, shots, badges, ledger, XP) as identity + growth.
  // Pure derivation, no new tracking. Level context comes from LEVELS here
  // since that table lives in this file.
  const progressJourney = useMemo(() => {
    const nextLv = LEVELS.find(l => l.rank === currentLevel.rank + 1) || null;
    const levelContext = nextLv ? {
      nextLevelName: nextLv.name,
      nextLevelEmoji: nextLv.emoji,
      xpToNext: Math.max(0, nextLv.xpMin - xpData.total),
      xpInto: xpData.total - currentLevel.xpMin,
      xpSpan: nextLv.xpMin - currentLevel.xpMin,
      pct: Math.min(1, (xpData.total - currentLevel.xpMin) / Math.max(1, nextLv.xpMin - currentLevel.xpMin)),
    } : null;
    return buildProgressJourney({
      completed: completedSafe,
      shotLog: readShotLog(),
      getCategory: getExerciseCategory,
      settings,
      earnedBadges,
      badgeDates: badgeDates || {},
      ledger: ledger || {},
      catCounts: progressCtx.catCounts,
      programProgress: programProgressSafe,
      programs: PROGRAMS,
      badgesDef: BADGES_DEF,
      levelContext,
    });
  }, [completedSafe, settings, earnedBadges, badgeDates, ledger, progressCtx, programProgressSafe, currentLevel, xpData.total, shotLogTick]);

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

  /* Daily Mission contract — see dailyMission.js. Generated once per calendar day;
     enrollment, completions, and profile changes must not regenerate today's mission. */
  const todayMission = useMemo(() => {
    const fallback = {
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
    try {
      const { mission } = getOrCreateDailyMission({
        missionLog: missionLogSafe,
        today,
        generate: () => generateDailyMission(
          today,
          settings,
          completedSafe,
          enrolledProgramsSafe,
          programProgressSafe,
        ),
      });
      return mission || fallback;
    } catch (e) {
      console.error("[fkh] daily mission generation failed", e);
      return fallback;
    }
  // completedSafe / programProgressSafe intentionally omitted: regenerating from
  // live completion state was flipping the mission mid-day. First generation
  // still sees them via the generate closure when there is no cache yet.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- freeze mission for the calendar day
  }, [today, settings, enrolledProgramsSafe, missionLogSafe]);

  // Persist a freshly generated mission into missionLog once (cloud-synced via fkh-missions).
  useEffect(() => {
    const cached = missionLogSafe[today]?.mission;
    if (cached?.date === today && Array.isArray(cached.tasks) && cached.tasks.length) return;
    if (!todayMission?.tasks?.length || todayMission.date !== today) return;
    setMissionLog((prev) => {
      if (prev[today]?.mission?.date === today && prev[today]?.mission?.tasks?.length) return prev;
      return { ...prev, [today]: { ...prev[today], mission: todayMission } };
    });
  }, [today, todayMission, missionLogSafe]);

  const missionClaimed = !!missionLogSafe[today]?.claimed;

  const requiredTasksDone = useMemo(()=>
    todayMission.tasks.filter(t=>t.required).every(t=>{
      const {cur,target} = getMissionTaskProgress(t, completedSafe, today, programProgressSafe);
      return cur >= target;
    }),
  [todayMission, completedSafe, today, programProgressSafe]);

  const challengeProgress = useCallback((def, completedArg) => getChallengeProgress(def, completedArg, WORKOUTS), []);

  const challengeNudge = useMemo(
    () => pickChallengeNudge(CHALLENGES_DEF, challengeProgress, completedSafe),
    [completedSafe, challengeProgress]
  );

  const activeProgForMission = useMemo(() => {
    const dueList = [];
    for (const prog of PROGRAMS) {
      if (!enrolledProgramsSafe[prog.id]) continue;
      const due = findDueProgramSession(prog, enrolledProgramsSafe[prog.id], programProgressSafe, today);
      if (due) dueList.push({ prog, due });
    }
    const sorted = sortDueProgramEntries(dueList);
    return sorted[0]?.prog || PROGRAMS.find(p => enrolledProgramsSafe[p.id]) || null;
  }, [enrolledProgramsSafe, programProgressSafe, today]);

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

  useEffect(() => listenForNotificationNavigation(setNavDeepLink), []);

  useEffect(() => {
    const onShow = () => {
      const link = consumeNavigationDeepLink();
      if (link) setNavDeepLink(link);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!auth.isSignedIn || auth.loading) return;
    let cancelled = false;
    (async () => {
      try {
        await applyCloudSync();
        if (cancelled) return;
        await claimChallengeRewards().catch(() => 0);
        await pullLedger().catch(() => {});
        if (!cancelled) setLedger(readLocalLedger());
      } catch (e) {
        console.error("[fkh] post-sign-in sync failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [auth.isSignedIn, auth.loading, applyCloudSync]);

  // Normalize legacy profile fields when Settings opens — local only, no cloud overwrite.
  useEffect(() => {
    const settingsOpen = showSettings || (view === "progress" && progressTab === "settings");
    if (!settingsOpen) return;
    try {
      setSettings(prev => {
        const next = migrateThemeSettings(normalizeProfileFields(prev));
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    } catch (e) {
      console.error("[fkh] settings normalize failed", e);
    }
  }, [showSettings, view, progressTab]);

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
      trackMissionCompleted({ missionDay: today, bonusXp: todayMission.bonusXP, title: todayMission.title });
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
      isDone={detailContext && !isWarmupExercise(activeExercise)
        ? isProgramExerciseDone(programProgress, detailContext.programId, detailContext.week, detailContext.sessionIdx, activeExercise.id)
        : isDone(activeExercise.id)}
      onToggle={()=>{
        if (detailContext && !isWarmupExercise(activeExercise)) toggleProgramExercise(detailContext, activeExercise.id);
        else toggle(activeExercise.id, detailContext ? "program_warmup" : undefined);
      }}
      onClose={closeDetail} onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
      completed={completedSafe}
      favored={isFav("exercises",activeExercise.id)}
      onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
      totalXP={xpData.total}
      {...detailSheetProps}/>
  ) : null;

  const renderBottomNav = () => (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,background:NV,borderTop:`1px solid ${bd}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom, 0px)", pointerEvents:tourActive?"none":"auto", opacity:tourActive?0.92:1 }}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>setView(n.id)} aria-label={`${n.emoji} ${n.label}`} style={{ flex:1,padding:"10px 0 12px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
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
      {showCoachFKH && (
        <CoachFKHSheet
          open={showCoachFKH}
          onClose={() => {
            setShowCoachFKH(false);
            setCoachInitialQuery(null);
            // Don't auto-start the guided tour — first practice comes first.
            // Tour prompt appears after the first completed drill.
            if (tourPendingAfterCoach) setTourPendingAfterCoach(false);
          }}
          P={P}
          SF={SF}
          bd={bd}
          athleteContext={coachAthleteContext}
          isSignedIn={auth.isSignedIn}
          initialQuery={coachInitialQuery}
          onOpenProgram={(id) => { setSelectedProgram(id); setView("programs"); setShowCoachFKH(false); }}
          onOpenExercise={(id) => { const ex = ALL_EXERCISES[id]; if (ex) openDetail(ex); setShowCoachFKH(false); }}
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
        completed={completedSafe}
      />
    );
  }

  /* SQUAD */
  if (view === "squad") {
    return (
      <SquadView
        settings={settings}
        completed={completedSafe}
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
        journey={progressJourney}
        onStartPractice={() => setView("home")}
        earnedBadges={earnedBadges}
        completed={completedSafe}
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
        avatarUrl={avatarUrl}
        onAvatarChange={bumpAvatar}
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
        onOpenCoach={() => setShowCoachFKH(true)}
        renderBottomNav={renderBottomNav}
      />
    );
  }

  /* HISTORY */
  if (view==="history") return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", background:BG, color:"var(--fkh-text)", minHeight:"100vh", maxWidth:680, margin:"0 auto", paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {shellOverlays}
      <HistoryView
        completed={completedSafe} badgeDates={badgeDates} settings={settings}
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
        completed={completedSafe}
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
          completed={completedSafe}
          favored={isFav("exercises",activeExercise.id)}
          onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
          navLabel={activeCat&&CATS[activeCat]?`${CATS[activeCat].emoji} ${CATS[activeCat].label}`:undefined}
          totalXP={xpData.total}
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
          completed={completedSafe}
          favored={isFav("exercises",activeExercise.id)}
          onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
          totalXP={xpData.total}
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
                  workouts={WORKOUTS}
                  exerciseMeta={EXERCISE_META}
                  P={P}
                  SF={SF}
                  bd={bd}
                  onOpenCategory={cat => { setActiveCat(cat); setPrevView("schedule"); setView("cat"); }}
                  onOpenExercise={(ex, list, ctx) => openSessionWithWarmup(list || [ex], ctx, ex)}
                  onStartProgramSession={(exs, ctx) => openSessionWithWarmup(exs, ctx)}
                  onStartCustomWorkout={exList => openSessionWithWarmup(exList, null)}
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
            completed={completedSafe}
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
            onOpenExercise={(ex, list, ctx) => openSessionWithWarmup(list || [ex], ctx, ex)}
            onStartProgramSession={(exs, ctx) => openSessionWithWarmup(exs, ctx)}
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
        completed={completedSafe}
        favored={isFav("exercises",activeExercise.id)}
        onToggleFav={()=>toggleFav("exercises",activeExercise.id)}
        totalXP={xpData.total}
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
            markWhatsNewSeen(); // baseline release so brand-new athletes skip changelog
            track(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, {});
            setShowOnboarding(false);
            setShowCoachIntro(true);
          }}
          onAuthSuccess={undefined}
          onForgotPasscode={() => { setAuthInitialMode("forgot"); setShowAuth(true); }}
        />
      )}
      {showCoachIntro && (
        <CoachIntroSheet
          P={P}
          athleteName={settings.athleteName}
          onPickPrompt={(q) => {
            setShowCoachIntro(false);
            setCoachInitialQuery({ intent: q.intent, label: q.label });
            setShowCoachFKH(true);
            setTourPendingAfterCoach(true);
          }}
          onSkip={() => { setShowCoachIntro(false); /* tour waits until after first practice */ }}
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
              style={{ width:56,height:56,borderRadius:"50%",background:`${P}18`,
                border:`3px solid ${headerFrameColor || P}`,
                boxShadow:headerFrameColor ? `0 0 10px ${headerFrameColor}55` : "none",
                overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:24 }}>👤</span>}
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
        completed={completedSafe}
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
        onOpenCoach={() => setShowCoachFKH(true)}
        focusMissionSection={homeMissionFocus}
        onMissionFocusHandled={() => setHomeMissionFocus(false)}
      />
      </ViewErrorBoundary>

      {renderBottomNav()}
    </div>
  );
}

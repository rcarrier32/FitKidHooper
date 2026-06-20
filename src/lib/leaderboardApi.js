import { computeAllPeriodStats, getAgeGroup } from "./periodStats.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { profileForCloud, boardDisplayName } from "./identity.js";
import { getDeviceAthleteId, getEffectiveAthleteId } from "./auth.js";
import { buildPathSnapshot } from "./achievements.js";
import { getStreak, getAllTrainingDayCount } from "./progressStats.js";
import { readLocalPBs } from "./benchmarksApi.js";
import { computeCatCounts } from "./achievements.js";
import { computeExCounts } from "./pathSignatures.js";

const LAST_PUSH_KEY = "fkh-last-push";
const PUSH_DISMISS_KEY = "fkh-push-prompt-dismissed-until";

/** Days without a push before we nudge the athlete. */
export const PUSH_STALE_DAYS = 3;

export function isLeaderboardConfigured() {
  return isSupabaseConfigured();
}

function getClient() {
  return getSupabaseClient();
}

/**
 * Device-scoped athlete id. Identity has a single source of truth in auth.js;
 * this delegates so leaderboard/analytics/boards all key off the same value.
 */
export function getAthleteId() {
  return getDeviceAthleteId();
}

export function getLastPushTime() {
  try {
    const raw = localStorage.getItem(LAST_PUSH_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function setLastPushTime(ts = Date.now()) {
  try {
    localStorage.setItem(LAST_PUSH_KEY, String(ts));
  } catch {}
}

export function daysSinceLastPush() {
  const last = getLastPushTime();
  if (!last) return null;
  return Math.floor((Date.now() - last) / 86400000);
}

export function shouldShowPushPrompt({ sharingEnabled, minDays = PUSH_STALE_DAYS } = {}) {
  if (!sharingEnabled || !isLeaderboardConfigured()) return false;

  const snoozeUntil = Number(localStorage.getItem(PUSH_DISMISS_KEY) || "0");
  if (snoozeUntil > Date.now()) return false;

  const last = getLastPushTime();
  if (!last) return true;
  return daysSinceLastPush() >= minDays;
}

export function dismissPushPrompt(hours = 24) {
  try {
    localStorage.setItem(PUSH_DISMISS_KEY, String(Date.now() + hours * 3600000));
  } catch {}
}

export function buildPushPayload({
  displayName, dateOfBirth, ageGroup, completed, shotLog, missionLog, getCategory,
  athleteId: athleteIdIn, profileExtras = {}, activeTitle = null, playLike = null,
  pathSnapshot = null,
}) {
  const athleteId = athleteIdIn || getAthleteId();
  if (!athleteId) throw new Error("Could not create athlete id on this device");

  const statsByPeriod = computeAllPeriodStats({ completed, shotLog, missionLog, getCategory });
  const pushedAt = new Date().toISOString();
  const snap = pathSnapshot || null;

  return {
    athleteId,
    profile: {
      id: athleteId,
      display_name: displayName.trim(),
      age_group: ageGroup,
      date_of_birth: dateOfBirth || null,
      updated_at: pushedAt,
      ...(snap ? {
        primary_path_id: snap.primaryPathId,
        path_snapshot: snap.paths,
      } : {}),
      ...profileExtras,
    },
    stats: Object.entries(statsByPeriod).map(([period, stats]) => ({
      athlete_id: athleteId,
      display_name: displayName.trim(),
      age_group: ageGroup,
      period,
      xp: stats.xp,
      shots_made: stats.shotsMade,
      training_days: stats.trainingDays,
      streak: stats.streak,
      active_title: activeTitle || null,
      play_like: playLike || null,
      primary_path_rank: snap?.primaryPathRank || null,
      path_progress_pct: snap?.pathProgressPct ?? null,
      pushed_at: pushedAt,
    })),
  };
}

export async function pushLeaderboardStats(payload) {
  const sb = getClient();
  if (!sb) throw new Error("Leaderboard is not configured yet");

  const { error: profileErr } = await sb
    .from("athlete_profiles")
    .upsert(payload.profile, { onConflict: "id" });

  if (profileErr) throw profileErr;

  const { error: statsErr } = await sb
    .from("leaderboard_stats")
    .upsert(payload.stats, { onConflict: "athlete_id,period" });

  if (statsErr) throw statsErr;

  setLastPushTime();
  return { pushedAt: payload.stats[0]?.pushed_at || new Date().toISOString() };
}

export async function fetchLeaderboard({ ageGroup, period, limit = 50 }) {
  const sb = getClient();
  if (!sb) return { rows: [], error: "Leaderboard is not configured yet" };

  const { data, error } = await sb
    .from("leaderboard_stats")
    .select("athlete_id, display_name, age_group, period, xp, shots_made, training_days, streak, active_title, play_like, pushed_at")
    .eq("age_group", ageGroup)
    .eq("period", period)
    .order("xp", { ascending: false })
    .order("shots_made", { ascending: false })
    .limit(limit);

  if (error) return { rows: [], error: error.message };
  return { rows: data || [], error: null };
}

/** Minimum time between automatic leaderboard syncs (ms). */
export const AUTO_SYNC_MIN_MS = 30 * 60 * 1000;

export function canAutoSyncLeaderboard(settings) {
  if (!isLeaderboardConfigured()) return false;
  const name = settings?.athleteName?.trim();
  if (!name || name === "Champ") return false;
  return true;
}

/** Sync leaderboard stats when sharing is on. Throttled unless `force`. */
export async function maybeAutoSyncLeaderboard({
  settings,
  completed,
  missionLog,
  getCategory,
  earnedBadges = [],
  ledger = {},
  force = false,
} = {}) {
  if (!canAutoSyncLeaderboard(settings)) {
    return { skipped: true, reason: "not_eligible" };
  }

  const last = getLastPushTime();
  if (!force && last && Date.now() - last < AUTO_SYNC_MIN_MS) {
    return { skipped: true, reason: "throttled" };
  }

  try {
    await pushFromAppState({ settings, completed, missionLog, getCategory, earnedBadges, ledger });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "Sync failed" };
  }
}

export async function pushFromAppState({ settings, completed, missionLog, getCategory, earnedBadges = [], ledger = {} }) {
  const firstName = settings.athleteName?.trim();
  if (!firstName || firstName === "Champ") {
    throw new Error("Set your name in Settings before pushing stats");
  }
  const displayName = boardDisplayName(settings);

  let shotLog = {};
  try {
    shotLog = JSON.parse(localStorage.getItem("shot_log_v2") || "{}");
  } catch {}

  const ageGroup = getAgeGroup(settings.dateOfBirth);
  const cloudProfile = profileForCloud(settings);
  const athleteId = (await getEffectiveAthleteId()) || getAthleteId();

  let makes = 0;
  try {
    makes = Object.values(shotLog).flatMap(v => v).filter(s => s.made !== false).length;
  } catch {}

  const progressCtx = {
    earnedBadgeIds: new Set(earnedBadges),
    ledgerIds: new Set(Object.keys(ledger || {})),
    makes,
    maxStreak: getStreak(completed),
    trainingDays: getAllTrainingDayCount(completed, shotLog),
    catCounts: computeCatCounts(completed, getCategory),
    exCounts: computeExCounts(completed),
    benchmarkPBs: readLocalPBs(),
  };
  const pathSnapshot = buildPathSnapshot(progressCtx, settings);

  const payload = buildPushPayload({
    displayName,
    dateOfBirth: settings.dateOfBirth,
    ageGroup,
    completed,
    shotLog,
    missionLog,
    getCategory,
    athleteId,
    activeTitle: settings.activeTitle || null,
    playLike: cloudProfile.favorite_playlike || cloudProfile.favorite_current || cloudProfile.favorite_player || null,
    pathSnapshot,
    profileExtras: {
      jersey_number: cloudProfile.jersey_number,
      favorite_player: cloudProfile.favorite_player,
      favorite_current: cloudProfile.favorite_current,
      favorite_playlike: cloudProfile.favorite_playlike,
      position: cloudProfile.position,
      active_title: cloudProfile.active_title,
      equipped: cloudProfile.equipped,
      user_id: athleteId,
    },
  });

  return pushLeaderboardStats(payload);
}

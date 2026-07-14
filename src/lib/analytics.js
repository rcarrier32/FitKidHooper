import { getDeviceAthleteId as getAthleteId, readStoredAuthSession } from "./auth.js";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { ANALYTICS_EVENTS } from "./analyticsTypes.js";

const QUEUE_KEY = "fkh-analytics-queue";
const TRACKED_CHALLENGES_KEY = "fkh-analytics-challenges";
const TRACKED_PROGRAM_SESSIONS_KEY = "fkh-analytics-program-sessions";
const TRACKED_WORKOUT_DAYS_KEY = "fkh-analytics-workout-days";
const FIRST_EXERCISE_KEY = "fkh-analytics-first-exercise";
const FIRST_SESSION_KEY = "fkh-analytics-first-session";

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 40;
const MAX_QUEUE_SIZE = 500;

let sessionStartedAt = null;
let sessionId = null;
let flushTimer = null;
let flushing = false;
let context = { ageGroup: "unknown", isStandalone: false };

// When signed in, events are logged under the auth user id (set by the app on
// auth state change) so a kid's activity is unified across devices. Falls back
// to the per-device id for anonymous use.
let athleteIdOverride = null;

// Best-effort synchronous read of the signed-in user id from the Supabase
// session in localStorage. This avoids a startup race: initAnalytics fires
// session_start (the event DAU/WAU/retention count) before the async auth
// listener sets the override, so without this the first event of a signed-in
// session would log under the device id.
function authIdFromStorage() {
  return readStoredAuthSession()?.userId ?? null;
}

function activeAthleteId() {
  return athleteIdOverride || authIdFromStorage() || getAthleteId();
}

/** Point analytics at the auth user id (or null to revert to the device id). */
export function setAnalyticsAthleteId(id) {
  athleteIdOverride = id || null;
}

function getAppVersion() {
  return import.meta.env.VITE_APP_VERSION || "dev";
}

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
  } catch {
    /* localStorage unavailable */
  }
}

function readJsonSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

function writeJsonSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* localStorage unavailable */
  }
}

function basePayload() {
  return {
    athlete_id: activeAthleteId(),
    app_version: getAppVersion(),
    age_group: context.ageGroup || "unknown",
    session_id: sessionId,
  };
}

/** Queue an event for batched upload. No-op when Supabase is not configured. */
export function track(eventName, properties = {}) {
  if (!isSupabaseConfigured()) return;
  if (!activeAthleteId()) return;

  const queue = readQueue();
  queue.push({
    ...basePayload(),
    event_name: eventName,
    properties,
    queued_at: Date.now(),
  });
  writeQueue(queue);

  if (queue.length >= FLUSH_BATCH_SIZE) {
    flushEvents();
  }
}

export async function flushEvents() {
  if (!isSupabaseConfigured() || flushing) return;
  const sb = getSupabaseClient();
  if (!sb) return;

  const queue = readQueue();
  if (queue.length === 0) return;

  flushing = true;
  const batch = queue.slice(0, FLUSH_BATCH_SIZE);
  const remaining = queue.slice(batch.length);

  // client_ts (when the event actually happened, client-side) is distinct
  // from the DB's created_at (when the batch was inserted) — events queue
  // locally and flush together every 30s, so several events in one batch
  // would otherwise share the same server insert time and make any
  // duration/ordering math between them collapse to zero.
  const rows = batch.map(({ event_name, properties, athlete_id, app_version, age_group, session_id, queued_at }) => ({
    athlete_id,
    event_name,
    properties: properties || {},
    app_version,
    age_group,
    session_id: session_id || null,
    client_ts: queued_at ? new Date(queued_at).toISOString() : null,
  }));

  const { error } = await sb.from("events").insert(rows);
  if (!error) {
    writeQueue(remaining);
  }
  flushing = false;
}

async function upsertAthleteAnalytics({ isFirstSession = false } = {}) {
  const sb = getSupabaseClient();
  const athleteId = activeAthleteId();
  if (!sb || !athleteId) return;

  const now = new Date().toISOString();
  const row = {
    athlete_id: athleteId,
    last_session_at: now,
    age_group: context.ageGroup || "unknown",
    app_version: getAppVersion(),
    updated_at: now,
  };

  if (isFirstSession) {
    row.first_session_at = now;
  }

  await sb.from("athlete_analytics").upsert(row, { onConflict: "athlete_id" });
}

export function trackScreen(screen, extra = {}) {
  track(ANALYTICS_EVENTS.SCREEN_VIEW, { screen, ...extra });
}

export function trackExerciseComplete(exerciseId, source = "unknown", extra = {}) {
  if (!exerciseId) return;

  const isFirst = !localStorage.getItem(FIRST_EXERCISE_KEY);
  track(ANALYTICS_EVENTS.EXERCISE_COMPLETE, { exercise_id: exerciseId, source, ...extra });

  if (isFirst) {
    localStorage.setItem(FIRST_EXERCISE_KEY, new Date().toISOString());
    track(ANALYTICS_EVENTS.FIRST_EXERCISE_COMPLETE, { exercise_id: exerciseId, source });
  }
}

export function trackShotSession({ makes = 0, misses = 0, shotType = null, usedCourtMap = false } = {}) {
  if (makes + misses === 0) return;
  track(ANALYTICS_EVENTS.SHOT_SESSION, {
    makes,
    misses,
    total: makes + misses,
    shot_type: shotType,
    used_court_map: usedCourtMap,
  });
}

export function trackChallengeIfNew(challengeId, isComplete) {
  if (!isComplete) return;
  const tracked = readJsonSet(TRACKED_CHALLENGES_KEY);
  if (tracked.has(challengeId)) return;
  tracked.add(challengeId);
  writeJsonSet(TRACKED_CHALLENGES_KEY, tracked);
  track(ANALYTICS_EVENTS.CHALLENGE_COMPLETE, { challenge_id: challengeId });
}

export function trackProgramSessionIfNew(programId, week, sessionIdx) {
  const key = `${programId}:${week}:${sessionIdx}`;
  const tracked = readJsonSet(TRACKED_PROGRAM_SESSIONS_KEY);
  if (tracked.has(key)) return;
  tracked.add(key);
  writeJsonSet(TRACKED_PROGRAM_SESSIONS_KEY, tracked);
  track(ANALYTICS_EVENTS.PROGRAM_SESSION_COMPLETE, {
    program_id: programId,
    week,
    session_idx: sessionIdx,
  });
}

export function trackWorkoutCompleteIfNew(templateKey, today) {
  const tracked = readJsonSet(TRACKED_WORKOUT_DAYS_KEY);
  const key = `${today}:${templateKey}`;
  if (tracked.has(key)) return;
  tracked.add(key);
  writeJsonSet(TRACKED_WORKOUT_DAYS_KEY, tracked);
  track(ANALYTICS_EVENTS.WORKOUT_COMPLETE, { template_key: templateKey });
}

function endSession() {
  if (!sessionStartedAt) return;
  const durationSec = Math.round((Date.now() - sessionStartedAt) / 1000);
  track(ANALYTICS_EVENTS.SESSION_END, { duration_sec: durationSec });
  sessionStartedAt = null;
  sessionId = null;
  flushEvents();
}

/** Call once on app mount. */
export function initAnalytics({ ageGroup = "unknown", isStandalone = false } = {}) {
  if (!isSupabaseConfigured()) return () => {};

  context = { ageGroup, isStandalone };

  const isFirstEver = !localStorage.getItem(FIRST_SESSION_KEY);
  if (isFirstEver) localStorage.setItem(FIRST_SESSION_KEY, new Date().toISOString());

  sessionStartedAt = Date.now();
  sessionId = crypto.randomUUID();
  track(ANALYTICS_EVENTS.SESSION_START, {
    is_standalone: isStandalone,
    is_return: !isFirstEver,
  });
  upsertAthleteAnalytics({ isFirstSession: isFirstEver });

  const onHide = () => {
    if (document.visibilityState === "hidden") {
      endSession();
    } else if (document.visibilityState === "visible" && !sessionStartedAt) {
      sessionStartedAt = Date.now();
      sessionId = crypto.randomUUID();
      track(ANALYTICS_EVENTS.SESSION_START, { is_standalone: isStandalone, is_return: true });
      upsertAthleteAnalytics();
    }
  };

  const onUnload = () => endSession();

  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onUnload);

  flushTimer = setInterval(() => flushEvents(), FLUSH_INTERVAL_MS);
  flushEvents();

  return () => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onUnload);
    if (flushTimer) clearInterval(flushTimer);
    endSession();
  };
}

export function setAnalyticsAgeGroup(ageGroup) {
  context.ageGroup = ageGroup || "unknown";
}

/** Submit feedback directly (not queued). */
export async function submitFeedback({ rating, sentiment, category, message }) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Analytics not configured" };
  }
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "Could not connect" };

  const row = {
    athlete_id: activeAthleteId(),
    rating: rating ?? null,
    sentiment: sentiment ?? null,
    category: category || "general",
    message: message?.trim() || null,
    app_version: getAppVersion(),
  };

  const { error } = await sb.from("feedback").insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export { ANALYTICS_EVENTS };

import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";
import { isDefaultAthleteProfile, isRealName } from "./settingsMerge.js";

const DEVICE_ID_KEY = "fkh-athlete-id";
const LEGACY_LINKED_KEY = "fkh-auth-linked";
const LAST_USERNAME_KEY = "fkh-last-username";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const PASSCODE_RE = /^\d{6}$/;

export function isAuthConfigured() {
  return isSupabaseConfigured();
}

export function normalizeUsername(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function validateUsername(username) {
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3–20 characters: letters, numbers, or underscores";
  }
  return null;
}

export function validatePasscode(passcode) {
  if (!PASSCODE_RE.test(passcode)) {
    return "Passcode must be exactly 6 digits";
  }
  return null;
}

export function getLastUsername() {
  try { return localStorage.getItem(LAST_USERNAME_KEY) || ""; } catch { return ""; }
}

function rememberUsername(username) {
  try { localStorage.setItem(LAST_USERNAME_KEY, username); } catch {}
}

export function getSignedInUsername(user) {
  return user?.user_metadata?.username || null;
}

export function getDeviceAthleteId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export async function getEffectiveAthleteId() {
  const sb = getSupabaseClient();
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user?.id) return session.user.id;
  }
  return getDeviceAthleteId();
}

export async function getAuthSession() {
  const sb = getSupabaseClient();
  if (!sb) return { session: null, user: null };
  const { data: { session } } = await sb.auth.getSession();
  return { session, user: session?.user ?? null };
}

export function onAuthStateChange(callback) {
  const sb = getSupabaseClient();
  if (!sb) return () => {};
  const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

function appRedirectUrl() {
  return typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}`
    : undefined;
}

async function resolveLoginEmail(identifier) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");

  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const username = normalizeUsername(trimmed);
  const err = validateUsername(username);
  if (err) throw new Error(err);

  const { data, error } = await sb.rpc("get_email_for_username", { p_username: username });
  if (error) throw error;
  if (!data) throw new Error("Username not found");
  return data;
}

export async function checkUsernameAvailable(username) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");
  const norm = normalizeUsername(username);
  const err = validateUsername(norm);
  if (err) throw new Error(err);
  const { data, error } = await sb.rpc("is_username_available", { p_username: norm });
  if (error) throw error;
  return Boolean(data);
}

async function registerUsername(username) {
  const sb = getSupabaseClient();
  const { data, error } = await sb.rpc("register_username", { p_username: username });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Could not register username");
  return data.username;
}

export async function signUpWithUsername({ username, passcode, recoveryEmail }) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");

  const normUser = normalizeUsername(username);
  const userErr = validateUsername(normUser);
  if (userErr) throw new Error(userErr);
  const passErr = validatePasscode(passcode);
  if (passErr) throw new Error(passErr);
  if (!recoveryEmail?.includes("@")) throw new Error("Enter a valid recovery email");

  const available = await checkUsernameAvailable(normUser);
  if (!available) throw new Error("Username is already taken");

  const email = recoveryEmail.trim().toLowerCase();
  const { data, error } = await sb.auth.signUp({
    email,
    password: passcode,
    options: {
      data: { username: normUser },
      emailRedirectTo: appRedirectUrl(),
    },
  });
  if (error) throw error;

  if (data.session) {
    await registerUsername(normUser);
    rememberUsername(normUser);
    return { needsEmailVerification: false, user: data.user };
  }

  return { needsEmailVerification: true, email, username: normUser, user: data.user };
}

export async function verifySignupEmail({ email, code, username }) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");

  const { error } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "signup",
  });
  if (error) throw error;

  const normUser = normalizeUsername(username);
  await registerUsername(normUser);
  rememberUsername(normUser);
  return { ok: true };
}

export async function signInWithUsername({ username, passcode }) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");

  const normUser = normalizeUsername(username);
  const passErr = validatePasscode(passcode);
  if (passErr) throw new Error(passErr);

  const email = await resolveLoginEmail(normUser);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: passcode });
  if (error) {
    if (error.message?.toLowerCase().includes("invalid")) {
      throw new Error("Wrong username or passcode");
    }
    throw error;
  }

  rememberUsername(normUser);
  return data;
}

export async function sendRecoveryCode(identifier) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");

  const email = await resolveLoginEmail(identifier);
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
  return { email };
}

export async function resetPasscodeWithCode({ email, code, newPasscode }) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");

  const passErr = validatePasscode(newPasscode);
  if (passErr) throw new Error(passErr);

  const { error: verifyErr } = await sb.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });
  if (verifyErr) throw verifyErr;

  const { error: updateErr } = await sb.auth.updateUser({ password: newPasscode });
  if (updateErr) throw updateErr;
  return { ok: true };
}

export async function signOut() {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function linkDeviceProfileOnAuth(user, settings) {
  const sb = getSupabaseClient();
  if (!sb || !user?.id) return;
  if (localStorage.getItem(LEGACY_LINKED_KEY) === user.id) return;

  const deviceId = getDeviceAthleteId();
  const { profileForCloud } = await import("./identity.js");
  const profile = profileForCloud(settings);
  const metaName = user.user_metadata?.username;
  const localShell = isDefaultAthleteProfile(settings) || !isRealName(settings.athleteName);

  const { data: existing } = await sb
    .from("athlete_profiles")
    .select("display_name, date_of_birth, jersey_number, favorite_player, favorite_current, favorite_playlike, position, age_group")
    .eq("id", user.id)
    .maybeSingle();

  const { getAgeGroup } = await import("./periodStats.js");
  const row = {
    id: user.id,
    user_id: user.id,
    legacy_device_id: deviceId,
    updated_at: new Date().toISOString(),
  };

  if (localShell && existing) {
    row.display_name = existing.display_name;
    row.date_of_birth = existing.date_of_birth;
    row.age_group = existing.age_group || getAgeGroup(existing.date_of_birth);
    row.jersey_number = existing.jersey_number;
    row.favorite_player = existing.favorite_player;
    row.favorite_current = existing.favorite_current;
    row.favorite_playlike = existing.favorite_playlike;
    row.position = existing.position || "any";
  } else {
    row.display_name = profile.display_name || metaName || settings.athleteName;
    row.date_of_birth = profile.date_of_birth;
    row.age_group = getAgeGroup(settings.dateOfBirth);
    row.jersey_number = profile.jersey_number;
    row.favorite_player = profile.favorite_player;
    row.favorite_current = profile.favorite_current;
    row.favorite_playlike = profile.favorite_playlike;
    row.position = profile.position;
  }

  if (profile.first_name) row.first_name = profile.first_name;
  if (profile.last_name) row.last_name = profile.last_name;

  await sb.from("athlete_profiles").upsert(row, { onConflict: "id" });

  // Re-parent device-keyed board data (leaderboard stats, friendships, board
  // memberships, invites) onto the authenticated user id so a returning athlete
  // keeps their standing and friends after signing in.
  if (deviceId && deviceId !== user.id) {
    try {
      await sb.rpc("claim_device_stats", { p_device_id: deviceId });
    } catch {}
  }

  try { localStorage.setItem(LEGACY_LINKED_KEY, user.id); } catch {}
}

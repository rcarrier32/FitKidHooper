import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient.js";

const DEVICE_ID_KEY = "fkh-athlete-id";
const LEGACY_LINKED_KEY = "fkh-auth-linked";

export function isAuthConfigured() {
  return isSupabaseConfigured();
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

/** Prefer auth UID when signed in; fall back to device UUID. */
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

export async function signInWithEmail(email) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error("Supabase is not configured");
  const redirectTo = typeof window !== "undefined"
    ? `${window.location.origin}${import.meta.env.BASE_URL}`
    : undefined;
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
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

  await sb.from("athlete_profiles").upsert({
    id: user.id,
    user_id: user.id,
    legacy_device_id: deviceId,
    display_name: profile.display_name,
    date_of_birth: profile.date_of_birth,
    age_group: (await import("./periodStats.js")).getAgeGroup(settings.dateOfBirth),
    jersey_number: profile.jersey_number,
    favorite_player: profile.favorite_player,
    position: profile.position,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  try { localStorage.setItem(LEGACY_LINKED_KEY, user.id); } catch {}
}

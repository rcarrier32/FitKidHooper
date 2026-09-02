// FKH Buddy Video — mints a LiveKit join token, and is the only thing that can.
//
// This function is the security boundary for video. The browser never holds the
// LiveKit API secret; it asks here, and it gets a token ONLY if the database
// says this specific athlete may join this specific room right now. Every check
// is server-side and re-run per request, because a token is a capability: once
// issued it is valid until it expires, so the moment of issue is the only place
// the answer can be enforced.
//
// Unlike the other functions here, this one is NOT gated by PUSH_SECRET. That
// is a shared operator secret for admin blasts; this is called by kids' phones,
// so it authenticates the CALLER instead — the Supabase JWT in the auth header
// — and then asks the database what that caller is allowed to do. A shared
// secret shipped to browsers would not be a secret.
//
// Checks, in order, all of them refusals rather than warnings:
//   1. A valid Supabase session (who is asking?)
//   2. video_sessions_available() — the server kill switch. Off by default;
//      see supabase/buddy_video_sessions.sql for why it exists.
//   3. The session row names this caller as host or guest
//   4. The session is still invitable/active, not ended or declined
//   5. can_video_with() — mutual friendship AND both parents opted into video
//
// Two kinds of room, one gate:
//   { session_id } — a buddy call. Both parties publish. Requires mutual
//     friendship and video consent on both sides.
//   { class_id }   — a coach-led class. ONLY the coach gets canPublish; every
//     athlete joins muted and cameraless, which is enforced here in the grant
//     rather than in the UI. A client cannot ask to publish in a class.
//
// Env: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.
// Call with { dry_run: true } to check configuration without minting anything;
// it reports presence only, never values.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Short on purpose: a token is a capability, and this one only needs to
 *  survive the join handshake. LiveKit keeps the connection alive afterwards,
 *  so a short TTL costs nothing and shrinks the window a leaked token is worth
 *  anything. */
const TOKEN_TTL_SECONDS = 120;

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlStr = (s: string) => b64url(new TextEncoder().encode(s));

/** LiveKit access token: a plain HS256 JWT whose `video` claim is the grant. */
async function mintLiveKitToken(opts: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name?: string;
  room: string;
  canPublish: boolean;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: opts.apiKey,
    sub: opts.identity,
    // LiveKit uses `jti` to dedupe identities; the athlete id is already unique.
    jti: opts.identity,
    nbf: now - 5,
    exp: now + TOKEN_TTL_SECONDS,
    name: opts.name || undefined,
    video: {
      room: opts.room,
      roomJoin: true,
      canPublish: opts.canPublish,
      canSubscribe: true,
      // Tied to canPublish, not granted to everyone. Class chat lives in a
      // moderated table the coach can hide messages from; an open data channel
      // would be a second, unreviewable chat sitting right beside it, which is
      // the thing that design was meant to avoid.
      canPublishData: opts.canPublish,
      // Nobody creates or destroys rooms from a phone.
      roomCreate: false,
      roomAdmin: false,
    },
  };
  const signingInput = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(opts.apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput)));
  return `${signingInput}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
  const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
  const LIVEKIT_URL = Deno.env.get("LIVEKIT_URL");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  let payload: any = {};
  try { payload = await req.json(); } catch { /* empty */ }

  // Presence only — never echo a secret back over HTTP.
  if (payload.dry_run) {
    return json({
      ok: true,
      dry_run: true,
      has_livekit_key: Boolean(LIVEKIT_API_KEY),
      has_livekit_secret: Boolean(LIVEKIT_API_SECRET),
      livekit_url_set: Boolean(LIVEKIT_URL),
      has_supabase_env: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  // ── 1. Who is asking? ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  // The caller's own JWT is forwarded, so every RPC below runs AS the athlete
  // and auth.uid() inside those functions is them, not a service role. This
  // function deliberately holds no elevated database privileges.
  const sb = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  const me = userData?.user?.id;
  if (userErr || !me) return json({ ok: false, error: "unauthorized" }, 401);

  const sessionId = String(payload.session_id || "").trim();
  const classId = String(payload.class_id || "").trim();
  if (!sessionId && !classId) return json({ ok: false, error: "session_id or class_id required" }, 400);

  // ── 2. Is the feature on at all? ───────────────────────────────────────────
  const { data: available } = await sb.rpc("video_sessions_available");
  if (available !== true) return json({ ok: false, error: "unavailable" }, 403);

  // ── Coach-led class ────────────────────────────────────────────────────────
  if (classId) {
    const { data: cls, error: cErr } = await sb
      .from("video_classes")
      .select("id, coach_id, status")
      .eq("id", classId)
      .maybeSingle();
    if (cErr || !cls) return json({ ok: false, error: "not_found" }, 404);
    // You cannot join a class that is not on. There is no waiting room, so an
    // open room outside class time would be an unsupervised one.
    if (cls.status !== "live") return json({ ok: false, error: "class_not_live" }, 409);

    // The single most important line in this file: publishing is decided here,
    // from the database's view of who the coach is. An athlete's token simply
    // does not carry the capability, so no amount of client tampering turns a
    // child's camera on in a class.
    const isCoach = cls.coach_id === me;

    const classToken = await mintLiveKitToken({
      apiKey: LIVEKIT_API_KEY,
      apiSecret: LIVEKIT_API_SECRET,
      identity: me,
      room: `class-${cls.id}`,
      canPublish: isCoach,
    });
    return json({
      ok: true, token: classToken, url: LIVEKIT_URL,
      room: `class-${cls.id}`, identity: me, role: isCoach ? "coach" : "athlete",
    });
  }

  // ── 3 & 4. Is this caller a party to a session that is still live? ─────────
  // RLS on video_sessions already restricts SELECT to participants, so a row
  // coming back at all means the caller is one of the two.
  const { data: session, error: sErr } = await sb
    .from("video_sessions")
    .select("id, host_id, guest_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (sErr || !session) return json({ ok: false, error: "not_found" }, 404);
  if (session.host_id !== me && session.guest_id !== me) {
    return json({ ok: false, error: "not_your_session" }, 403);
  }
  if (session.status !== "active" && session.status !== "inviting") {
    return json({ ok: false, error: "session_over" }, 409);
  }

  // ── 5. Do the consent and friendship rules still hold, right now? ──────────
  const other = session.host_id === me ? session.guest_id : session.host_id;
  const { data: eligible } = await sb.rpc("can_video_with", { p_other: other });
  if (eligible !== true) return json({ ok: false, error: "not_eligible" }, 403);

  // The room name is derived from the session id rather than supplied by the
  // caller, so nobody can request a token for a room they were not granted.
  const token = await mintLiveKitToken({
    apiKey: LIVEKIT_API_KEY,
    apiSecret: LIVEKIT_API_SECRET,
    identity: me,
    room: `buddy-${session.id}`,
    canPublish: true,
  });

  return json({ ok: true, token, url: LIVEKIT_URL, room: `buddy-${session.id}`, identity: me });
});

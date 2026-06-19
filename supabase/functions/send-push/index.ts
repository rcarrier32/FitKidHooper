// Deployed Supabase Edge Function (verify_jwt = false; gated by PUSH_SECRET).
// Sends web-push notifications for a category to eligible subscribers. Called by
// pg_cron (daily reminder) and the friend_requests trigger. VAPID keys embedded
// (server-side only; can be moved to Supabase secrets later).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const VAPID_PUBLIC = "BKTyb_hHdQoeCzVSQ6DuBqolJMNKBdMh3hjY73gevAl-qwwyVTWy6bVnHuQP2tx6LaYiefRmz02vtHxSiu0As8w";
const VAPID_PRIVATE = "GtWmgmxTkyRDZBUVk3MEgKCavg-1Jt5i1HKTQQlDHfQ";
const PUSH_SECRET = "fkh_push_9Qx2Re7Yk3Lm8Wp4Zb6Td0Vn5Hs1Ac";

webpush.setVapidDetails("mailto:rcarrier32@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  let payload: any = {};
  try { payload = await req.json(); } catch { /* empty */ }
  const { secret, category = "dailyMission", title, body, url, onlyUserId = null } = payload;
  if (secret !== PUSH_SECRET) return json({ ok: false, error: "unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let q = supabase.from("push_subscriptions").select("endpoint,p256dh,auth,user_id,prefs");
  if (onlyUserId) q = q.eq("user_id", onlyUserId);
  const { data: subs, error } = await q;
  if (error) return json({ ok: false, error: error.message }, 500);

  let targets = (subs ?? []).filter((s: any) => s.prefs?.[category] !== false);

  if (category === "dailyMission" || category === "streakRisk") {
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);
    const { data: active } = await supabase
      .from("events").select("athlete_id")
      .eq("event_name", "session_start")
      .gte("created_at", midnight.toISOString());
    const activeSet = new Set((active ?? []).map((r: any) => r.athlete_id));
    targets = targets.filter((s: any) => !activeSet.has(s.user_id));
  }

  const msg = JSON.stringify({
    title: title || "🏀 Time to train",
    body: body || "Your daily mission is waiting — go get a rep in!",
    url: url || "/FitKidHooper/?mission=1",
    tag: category,
  });

  let sent = 0, removed = 0;
  await Promise.all(targets.map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg);
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      }
    }
  }));

  return json({ ok: true, category, candidates: targets.length, sent, removed });
});

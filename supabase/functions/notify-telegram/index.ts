// Admin Telegram alerts for FKH feedback (bugs, feature ideas, negative/general).
// Deploy: supabase functions deploy notify-telegram --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (same bot as Sentinel FX is fine).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOTIFY_SECRET = "fkh_notify_Tg8Kp2Qm5Wx7Nz4Rb3Yv6Hs1Ld0Ac";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function categoryEmoji(category: string) {
  if (category === "bug") return "🐛";
  if (category === "feature_request") return "💡";
  return "💬";
}

function categoryLabel(category: string, title?: string) {
  if (title) return title;
  if (category === "bug") return "Bug report";
  if (category === "feature_request") return "Feature idea";
  return "Feedback";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    /* empty */
  }

  if (payload.secret !== NOTIFY_SECRET) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    return json({ ok: false, error: "telegram_not_configured" }, 503);
  }

  const category = String(payload.category || "general");
  const emoji = categoryEmoji(category);
  const label = categoryLabel(category, payload.title as string | undefined);
  const message = String(payload.message || "(no message)").trim();
  const rating = payload.rating != null ? Number(payload.rating) : null;
  const sentiment = payload.sentiment as string | null;
  const appVersion = payload.app_version as string | undefined;
  const feedbackId = payload.feedback_id as string | undefined;

  const meta: string[] = [];
  if (appVersion) meta.push(`App ${escapeHtml(appVersion)}`);
  if (rating) meta.push(`★ ${rating}/5`);
  if (sentiment === "thumbs_up") meta.push("👍");
  if (sentiment === "thumbs_down") meta.push("👎");
  if (feedbackId) meta.push(`id ${feedbackId.slice(0, 8)}`);

  const text = [
    `${emoji} <b>${escapeHtml(label)}</b>`,
    meta.length ? meta.join(" · ") : null,
    "",
    escapeHtml(message),
  ].filter((line) => line !== null).join("\n");

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const tgBody = await tgRes.json().catch(() => ({}));
  if (!tgRes.ok || !tgBody?.ok) {
    return json({ ok: false, error: tgBody?.description || "telegram_send_failed" }, 502);
  }

  return json({ ok: true });
});

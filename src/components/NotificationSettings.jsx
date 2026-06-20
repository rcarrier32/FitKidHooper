import { useState, useEffect } from "react";
import {
  isPushSupported, getPushSubscription, subscribeToPush, unsubscribeFromPush,
  NOTIFICATION_CATEGORIES, getNotifyPrefs, setNotifyPref, canUseNotifications,
} from "../lib/notifications.js";

/** Web push notifications — all types on by default; athlete opts out per category. */
export default function NotificationSettings({ P = "#f97316", isSignedIn, onNeedAuth }) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(getNotifyPrefs());
  const [msg, setMsg] = useState(null);
  const supported = isPushSupported();

  const refreshSub = () => getPushSubscription().then(s => setSubscribed(!!s));

  useEffect(() => { refreshSub(); }, []);

  // Already allowed — register this device silently (notifications default on).
  useEffect(() => {
    if (!isSignedIn || !supported) return;
    if (!canUseNotifications() || Notification.permission !== "granted") return;
    let cancelled = false;
    (async () => {
      const sub = await getPushSubscription();
      if (cancelled || sub) {
        if (sub) setSubscribed(true);
        return;
      }
      const r = await subscribeToPush();
      if (!cancelled && r.ok) setSubscribed(true);
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, supported]);

  const togglePush = async () => {
    setBusy(true); setMsg(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        return;
      }
      if (!isSignedIn) {
        setMsg("Sign in first so notifications follow you across devices.");
        onNeedAuth?.();
        return;
      }
      const r = await subscribeToPush();
      if (r.ok) setSubscribed(true);
      else if (r.reason === "denied") {
        setMsg("Notifications are blocked — turn them on in your browser or device settings.");
      } else if (r.reason === "unsupported") {
        setMsg("On iPhone or iPad, add Fit Kid Hooper to your Home Screen first, then enable notifications.");
      } else setMsg("Couldn't enable notifications: " + r.reason);
    } finally { setBusy(false); }
  };

  const toggleCat = (key) => setPrefs({ ...setNotifyPref(key, !prefs[key]) });

  if (!supported) {
    return (
      <div style={{ fontSize: 11, color: "#64748b", padding: "6px 2px", lineHeight: 1.5 }}>
        🔔 Notifications aren't supported here. On iPhone or iPad, add Fit Kid Hooper to your Home Screen first.
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: "0 0 10px" }}>
        All notification types are <strong style={{ color: "var(--fkh-text)" }}>on by default</strong> — uncheck any you don't want.
      </p>

      <button type="button" onClick={togglePush} disabled={busy} style={{
        width: "100%", padding: "10px 14px", borderRadius: 12, cursor: busy ? "default" : "pointer",
        border: `1px solid ${subscribed ? P : "rgba(255,255,255,0.12)"}`,
        background: subscribed ? `${P}14` : "transparent",
        color: subscribed ? P : "#94a3b8", fontSize: 12, fontWeight: 700,
      }}>
        {busy ? "…" : subscribed ? "✓ Notifications on" : "🔔 Turn on notifications"}
      </button>
      {msg && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, lineHeight: 1.5 }}>{msg}</div>}

      {isSignedIn && (
        <div style={{
          marginTop: 12, display: "flex", flexDirection: "column", gap: 10,
          opacity: subscribed ? 1 : 0.85,
        }}>
          {NOTIFICATION_CATEGORIES.map(c => (
            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={prefs[c.key]}
                onChange={() => toggleCat(c.key)}
                style={{ accentColor: P, width: 16, height: 16, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>{c.label}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{c.desc}</div>
              </div>
            </label>
          ))}
          {!subscribed && (
            <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.45 }}>
              Your choices are saved — turn on notifications above to receive them on this device.
            </div>
          )}
        </div>
      )}

      {!isSignedIn && (
        <div style={{ fontSize: 10, color: "#475569", marginTop: 8, lineHeight: 1.45 }}>
          Sign in to enable push notifications on this device.
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  isPushSupported, getPushSubscription, subscribeToPush, unsubscribeFromPush,
  NOTIFICATION_CATEGORIES, getNotifyPrefs, setNotifyPref,
} from "../lib/notifications.js";

/** Enable web-push reminders + per-category toggles (all default on). */
export default function NotificationSettings({ P = "#f97316", isSignedIn, onNeedAuth }) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(getNotifyPrefs());
  const [msg, setMsg] = useState(null);
  const supported = isPushSupported();

  useEffect(() => { getPushSubscription().then(s => setSubscribed(!!s)); }, []);

  const togglePush = async () => {
    setBusy(true); setMsg(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        return;
      }
      if (!isSignedIn) { setMsg("Sign in first so reminders follow you across devices."); onNeedAuth?.(); return; }
      const r = await subscribeToPush();
      if (r.ok) setSubscribed(true);
      else if (r.reason === "denied") setMsg("Notifications are blocked — turn them on in your browser/site settings.");
      else if (r.reason === "unsupported") setMsg("On iPhone, add Fit Kid Hooper to your Home Screen first, then enable.");
      else setMsg("Couldn't enable reminders: " + r.reason);
    } finally { setBusy(false); }
  };

  const toggleCat = (key) => setPrefs({ ...setNotifyPref(key, !prefs[key]) });

  if (!supported) {
    return (
      <div style={{ fontSize: 11, color: "#64748b", padding: "6px 2px", lineHeight: 1.5 }}>
        🔔 Reminders aren't supported here. On iPhone, add Fit Kid Hooper to your Home Screen to turn them on.
      </div>
    );
  }

  return (
    <div>
      <button onClick={togglePush} disabled={busy} style={{
        width: "100%", padding: "10px 14px", borderRadius: 12, cursor: busy ? "default" : "pointer",
        border: `1px solid ${subscribed ? P : "rgba(255,255,255,0.12)"}`,
        background: subscribed ? `${P}14` : "transparent",
        color: subscribed ? P : "#94a3b8", fontSize: 12, fontWeight: 700,
      }}>
        {busy ? "…" : subscribed ? "✓ Reminders on" : "🔔 Turn on reminders"}
      </button>
      {msg && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, lineHeight: 1.5 }}>{msg}</div>}
      {subscribed && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {NOTIFICATION_CATEGORIES.map(c => (
            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={prefs[c.key]} onChange={() => toggleCat(c.key)}
                style={{ accentColor: P, width: 16, height: 16, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>{c.label}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{c.desc}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

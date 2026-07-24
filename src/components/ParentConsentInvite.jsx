import { useState } from "react";
import {
  createConsentRequest,
  getConsentRequest,
  consentUrl,
  mailtoLink,
  smsLink,
} from "../lib/parentConsent.js";

/**
 * "Grab a grown-up" hand-off. The kid is the one holding the phone, so this is
 * built for the real moment: mint a link, then get it to a parent by whatever
 * is nearest — their mail app, a text, or a copied link. mailto:/sms: hand off
 * to the phone's own apps, so no email provider is required for this to work.
 *
 * The parent signs on their own device (ParentConsentPage), which is the whole
 * point: the approval doesn't happen in the kid's hands.
 */
export default function ParentConsentInvite({ P = "#f97316", isSignedIn, athleteName }) {
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [signed, setSigned] = useState(false);

  if (!isSignedIn) {
    return (
      <div style={{ fontSize: 11, color: "#64748b", padding: "6px 2px", lineHeight: 1.5 }}>
        Save your player first — then you can send a grown-up the approval link.
      </div>
    );
  }

  const start = async () => {
    setBusy(true); setErr(null);
    const r = await createConsentRequest();
    setBusy(false);
    if (r.ok) setToken(r.token);
    else setErr(r.error === "not configured" ? "Not available offline." : "Couldn't create a link — try again.");
  };

  const check = async () => {
    const r = await getConsentRequest(token);
    if (r.ok && r.status === "signed") setSigned(true);
    else setErr("Not signed yet — give them a minute, then check again.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(consentUrl(token));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setErr("Couldn't copy — long-press the link to copy it."); }
  };

  if (signed) {
    return (
      <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, padding: "8px 2px", lineHeight: 1.5 }}>
        ✅ Approved! Your grown-up signed off. You&apos;re all set.
      </div>
    );
  }

  const btn = (extra = {}) => ({
    padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent", color: "#cbd5e1", fontSize: 12, fontWeight: 700,
    cursor: "pointer", textDecoration: "none", textAlign: "center", display: "block",
    ...extra,
  });

  return (
    <div>
      <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, margin: "0 0 10px" }}>
        A grown-up needs to approve your account. Send them a link — they sign it on their own phone,
        and it takes them about 30 seconds.
      </p>

      {!token ? (
        <button type="button" onClick={start} disabled={busy} style={{
          width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${P}`,
          background: `${P}14`, color: P, fontSize: 13, fontWeight: 800,
          cursor: busy ? "default" : "pointer",
        }}>
          {busy ? "…" : "🙌 Get my grown-up's OK"}
        </button>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <a href={mailtoLink(consentUrl(token), athleteName)} style={btn()}>✉️ Email it</a>
            <a href={smsLink(consentUrl(token), athleteName)} style={btn()}>💬 Text it</a>
          </div>
          <button type="button" onClick={copy} style={btn({ width: "100%" })}>
            {copied ? "✓ Link copied" : "🔗 Copy the link"}
          </button>
          <button type="button" onClick={check} style={{
            ...btn({ width: "100%" }), border: "none", color: "#64748b", fontSize: 11,
          }}>
            Already signed? Check now
          </button>
          <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.45 }}>
            The link works for 30 days. Only send it to your parent or guardian.
          </div>
        </div>
      )}

      {err && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>{err}</div>}
    </div>
  );
}

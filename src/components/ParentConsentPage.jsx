import { useState, useEffect } from "react";
import {
  getConsentRequest,
  submitParentConsent,
  consentTokenFromUrl,
} from "../lib/parentConsent.js";

/**
 * Parent-facing consent page (opened from the link the athlete sends).
 *
 * Rendered INSTEAD of the app when the URL carries ?consent=TOKEN — the parent
 * is not a logged-in athlete and should never land in the kid's UI. Light and
 * document-like on purpose: an adult skimming on a phone needs legibility and a
 * sense that this is the serious part, not the game part.
 *
 * The two asks are deliberately separate. The account consent is required; the
 * video pre-approval is OPTIONAL, defaults off, and declining it changes
 * nothing about the account. Consent has to be specific to each practice, so
 * these can never collapse into one "I agree".
 */

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const ORANGE = "#ea7317";

const page = {
  minHeight: "100dvh", background: "#f8fafc", color: INK,
  fontFamily: "system-ui, -apple-system, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center",
};
const card = {
  width: "100%", maxWidth: 480, background: "#fff", padding: "24px 20px 32px",
  boxSizing: "border-box", flex: 1,
};
const label = { display: "block", fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6 };
const input = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
  border: `1px solid ${LINE}`, background: "#fff", color: INK, fontSize: 16, // 16px: iOS won't zoom
  fontFamily: "inherit",
};
const checkRow = {
  display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer",
  fontSize: 14, lineHeight: 1.5,
};

function Shell({ children }) {
  return (
    <div style={page}>
      <div style={{
        width: "100%", background: "#0b1220", color: "#fff", padding: "14px 20px",
        boxSizing: "border-box", display: "flex", justifyContent: "center",
      }}>
        <div style={{ width: "100%", maxWidth: 480, fontSize: 14, fontWeight: 800, letterSpacing: 0.2 }}>
          🏀 FKH <span style={{ color: ORANGE }}>Fit Kid Hooper</span>
        </div>
      </div>
      <div style={card}>{children}</div>
    </div>
  );
}

function Notice({ emoji, title, children }) {
  return (
    <Shell>
      <div style={{ textAlign: "center", padding: "32px 8px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
        <h1 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 10px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: 0 }}>{children}</p>
      </div>
    </Shell>
  );
}

export default function ParentConsentPage() {
  const token = consentTokenFromUrl();
  // A missing token is knowable at first render — no effect round-trip for it.
  const [state, setState] = useState(() => (token ? { loading: true } : { loading: false, error: "not_found" }));
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [attest, setAttest] = useState(false);
  const [video, setVideo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);

  // index.html paints a boot shell that only the athlete app's error boundary
  // clears — without this the parent stares at "Loading your training…".
  useEffect(() => {
    const el = document.getElementById("fkh-boot-shell");
    if (el) el.style.display = "none";
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getConsentRequest(token).then(r => {
      if (cancelled) return;
      setState({ loading: false, ...(r.ok ? { data: r } : { error: r.error || "not_found" }) });
    });
    return () => { cancelled = true; };
  }, [token]);

  const athlete = state.data?.athlete_label || "your athlete";

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!attest) { setErr("Please confirm you're the parent or legal guardian."); return; }
    setBusy(true);
    const r = await submitParentConsent(token, {
      parentName: name, relationship, parentEmail: email, videoOptIn: video,
    });
    setBusy(false);
    if (r.ok) setDone({ video: !!r.video });
    else setErr({
      name_required: "Please enter your full name.",
      email_required: "Please enter a valid email address.",
      expired: "This link has expired — ask your athlete to send a new one.",
      not_found: "This link isn't valid — ask your athlete to send a new one.",
    }[r.error] || "Something went wrong. Please try again.");
  };

  if (state.loading) return <Notice emoji="🏀" title="Loading…">One moment.</Notice>;

  if (state.error === "expired")
    return <Notice emoji="⏳" title="This link has expired">
      For safety, approval links expire after 30 days. Ask your athlete to send a fresh one from the app.
    </Notice>;

  if (state.error)
    return <Notice emoji="🔍" title="We couldn't find this request">
      The link may be incomplete or already used. Ask your athlete to send a new one from the app.
    </Notice>;

  if (done || state.data?.status === "signed")
    return <Notice emoji="✅" title="Thank you — you're all set">
      {athlete}&apos;s account is approved{done?.video ? ", and you've pre-approved video workouts with friends you approve" : ""}.
      You can change or withdraw this at any time from Settings in the app, or by replying to any email we send you.
    </Notice>;

  return (
    <Shell>
      <h1 style={{ fontSize: 21, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.3 }}>
        Approve {athlete}&apos;s account
      </h1>
      <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 20px" }}>
        Fit Kid Hooper is a basketball training app for young athletes. We need a parent or
        guardian&apos;s permission before we save {athlete}&apos;s account. This takes about 30 seconds.
      </p>

      <div style={{
        background: "#f8fafc", border: `1px solid ${LINE}`, borderRadius: 12,
        padding: "14px 16px", marginBottom: 22, fontSize: 13, color: MUTED, lineHeight: 1.6,
      }}>
        <strong style={{ color: INK }}>What we save:</strong> a nickname, a passcode, your email, and their
        training progress. <strong style={{ color: INK }}>What we never do:</strong> show your child&apos;s real
        name publicly, sell their information, or show them ads. You can withdraw permission and delete the
        account at any time.
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={label} htmlFor="pc-name">Your full name</label>
          <input id="pc-name" style={input} value={name} autoComplete="name"
                 onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
        </div>

        <div>
          <label style={label} htmlFor="pc-rel">You are their</label>
          <select id="pc-rel" style={input} value={relationship} onChange={e => setRelationship(e.target.value)}>
            <option value="">Select…</option>
            <option value="mother">Mother</option>
            <option value="father">Father</option>
            <option value="guardian">Legal guardian</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label style={label} htmlFor="pc-email">Your email</label>
          <input id="pc-email" style={input} value={email} type="email" autoComplete="email"
                 onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
            Yours, not your child&apos;s — it&apos;s how we reach you about the account.
          </div>
        </div>

        <label style={{ ...checkRow, paddingTop: 4 }}>
          <input type="checkbox" checked={attest} onChange={e => setAttest(e.target.checked)}
                 style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: ORANGE }} />
          <span>
            I am {athlete}&apos;s parent or legal guardian, I am over 18, and I give permission for this
            account.
          </span>
        </label>

        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: 0.6, marginBottom: 10 }}>
            OPTIONAL — YOU CAN CHANGE THIS ANYTIME
          </div>
          <label style={checkRow}>
            <input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)}
                   style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: ORANGE }} />
            <span>
              <strong>Live video workouts.</strong> {athlete} could train over video only with friends
              you have already approved — never strangers, and never random matching.
              <span style={{ display: "block", color: MUTED, fontSize: 12.5, marginTop: 4 }}>
                This feature isn&apos;t available yet. We&apos;ll confirm with you before it ever turns on,
                and leaving this unchecked doesn&apos;t affect the account at all.
              </span>
            </span>
          </label>
        </div>

        {err && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
            borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.5,
          }}>{err}</div>
        )}

        <button type="submit" disabled={busy} style={{
          width: "100%", padding: "15px 20px", borderRadius: 12, border: "none",
          background: busy ? "#cbd5e1" : ORANGE, color: busy ? "#64748b" : "#fff",
          fontSize: 16, fontWeight: 800, cursor: busy ? "default" : "pointer", marginTop: 4,
        }}>
          {busy ? "Saving…" : `Approve ${athlete}'s account`}
        </button>

        <p style={{ fontSize: 11.5, color: MUTED, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
          By approving you agree to our{" "}
          <a href="privacy.html" style={{ color: ORANGE }}>privacy notice</a>.
          Questions? Reply to any email we send you.
        </p>
      </form>
    </Shell>
  );
}

import { useState } from "react";
import { isAuthConfigured, signInWithEmail } from "../lib/auth.js";

export default function AuthSheet({ P, SF, onClose, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const configured = isAuthConfigured();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await signInWithEmail(email);
      setStatus("Check your email for a sign-in link (parent/guardian email).");
    } catch (err) {
      setStatus(err.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 350,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: SF || "#0d1526", borderRadius: "22px 22px 0 0",
        width: "100%", maxWidth: 680, padding: "20px 20px 32px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fkh-text)" }}>Parent Sign-In</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.55, marginBottom: 16 }}>
          Sign in with a parent email to save progress to the cloud and sync across devices.
          Athletes stay local-first — no child email required.
        </p>
        {!configured ? (
          <p style={{ fontSize: 12, color: "#f87171" }}>Supabase is not configured for this build.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="parent@email.com"
              style={{
                width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${P}44`, background: "rgba(255,255,255,0.05)",
                color: "var(--fkh-text)", fontSize: 14, marginBottom: 12,
              }}
            />
            <button type="submit" disabled={busy} style={{
              width: "100%", padding: 14, borderRadius: 12, border: "none",
              background: P, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer",
            }}>
              {busy ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
        {status && (
          <p style={{ fontSize: 12, color: status.includes("Check") ? "#22c55e" : "#f87171", marginTop: 12 }}>{status}</p>
        )}
        <button type="button" onClick={onSignedIn} style={{
          marginTop: 16, width: "100%", padding: 10, background: "transparent",
          border: `1px solid ${P}33`, borderRadius: 10, color: P, fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          I already signed in — sync now
        </button>
      </div>
    </div>
  );
}

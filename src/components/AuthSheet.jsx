import { useState } from "react";
import {
  isAuthConfigured,
  getLastUsername,
  signUpWithUsername,
  signInWithUsername,
  sendRecoveryCode,
  resetPasscodeWithCode,
  verifySignupEmail,
} from "../lib/auth.js";

const inputStyle = (P) => ({
  width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
  border: `1px solid ${P}44`, background: "rgba(255,255,255,0.05)",
  color: "var(--fkh-text)", fontSize: 14, marginBottom: 10,
});

const btnPrimary = (P, disabled) => ({
  width: "100%", padding: 14, borderRadius: 12, border: "none",
  background: disabled ? `${P}66` : P, color: "#000",
  fontSize: 14, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer",
});

const btnGhost = (P) => ({
  width: "100%", padding: 10, marginTop: 8, background: "transparent",
  border: `1px solid ${P}33`, borderRadius: 10, color: P,
  fontSize: 12, fontWeight: 700, cursor: "pointer",
});

export default function AuthSheet({ P, SF, onClose, onSignedIn }) {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState(getLastUsername());
  const [passcode, setPasscode] = useState("");
  const [passcode2, setPasscode2] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const configured = isAuthConfigured();

  const isError = status && !status.includes("sent") && !status.includes("Check") && !status.includes("created");

  const finish = async () => {
    await onSignedIn?.();
    onClose?.();
  };

  const handleSignIn = async e => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await signInWithUsername({ username, passcode });
      await finish();
    } catch (err) {
      setStatus(err.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async e => {
    e.preventDefault();
    if (passcode !== passcode2) {
      setStatus("Passcodes do not match");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const result = await signUpWithUsername({ username, passcode, recoveryEmail });
      if (result.needsEmailVerification) {
        setPendingEmail(result.email);
        setPendingUsername(result.username);
        setMode("verify");
        setStatus(`Enter the 6-digit code sent to ${result.email}`);
      } else {
        await finish();
      }
    } catch (err) {
      setStatus(err.message || "Sign-up failed");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifySignup = async e => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await verifySignupEmail({ email: pendingEmail, code: otpCode, username: pendingUsername });
      await finish();
    } catch (err) {
      setStatus(err.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSendRecovery = async e => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const { email } = await sendRecoveryCode(username || recoveryEmail);
      setPendingEmail(email);
      setMode("reset");
      setStatus(`Code sent to ${email}`);
    } catch (err) {
      setStatus(err.message || "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPasscode = async e => {
    e.preventDefault();
    if (passcode !== passcode2) {
      setStatus("Passcodes do not match");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await resetPasscodeWithCode({ email: pendingEmail, code: otpCode, newPasscode: passcode });
      setStatus("Passcode updated — sign in with your new code");
      setMode("signin");
      setPasscode("");
      setPasscode2("");
      setOtpCode("");
    } catch (err) {
      setStatus(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const title = {
    signin: "Sign In",
    signup: "Create Account",
    forgot: "Forgot Passcode",
    verify: "Verify Email",
    reset: "New Passcode",
  }[mode];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 350,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        background: SF || "#0d1526", borderRadius: "22px 22px 0 0",
        width: "100%", maxWidth: 680, padding: "20px 20px 32px", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fkh-text)" }}>{title}</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.55, marginBottom: 16 }}>
          {mode === "signin" && "Back up progress, sync across devices, and add friends on Boards."}
          {mode === "signup" && "Pick a username and 6-digit passcode. Add a recovery email in case you forget."}
          {mode === "forgot" && "Enter your username or recovery email. We'll send a 6-digit code."}
          {mode === "verify" && "Check your recovery email for a 6-digit code."}
          {mode === "reset" && "Enter the code from your email and choose a new 6-digit passcode."}
        </p>

        {!configured ? (
          <p style={{ fontSize: 12, color: "#f87171" }}>Supabase is not configured for this build.</p>
        ) : mode === "signin" ? (
          <form onSubmit={handleSignIn}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect="off"
              style={inputStyle(P)}
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={passcode}
              onChange={e => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit passcode"
              style={inputStyle(P)}
            />
            <button type="submit" disabled={busy} style={btnPrimary(P, busy)}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <button type="button" onClick={() => { setMode("signup"); setStatus(null); }} style={btnGhost(P)}>
              Create account
            </button>
            <button type="button" onClick={() => { setMode("forgot"); setStatus(null); }} style={btnGhost(P)}>
              Forgot passcode?
            </button>
          </form>
        ) : mode === "signup" ? (
          <form onSubmit={handleSignUp}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              autoCapitalize="none"
              autoCorrect="off"
              style={inputStyle(P)}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={passcode}
              onChange={e => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit passcode"
              style={inputStyle(P)}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={passcode2}
              onChange={e => setPasscode2(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="confirm passcode"
              style={inputStyle(P)}
            />
            <input
              type="email"
              value={recoveryEmail}
              onChange={e => setRecoveryEmail(e.target.value)}
              placeholder="recovery email"
              style={inputStyle(P)}
            />
            <button type="submit" disabled={busy} style={btnPrimary(P, busy)}>
              {busy ? "Creating…" : "Create account"}
            </button>
            <button type="button" onClick={() => { setMode("signin"); setStatus(null); }} style={btnGhost(P)}>
              Already have an account? Sign in
            </button>
          </form>
        ) : mode === "forgot" ? (
          <form onSubmit={handleSendRecovery}>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username or recovery email"
              autoCapitalize="none"
              style={inputStyle(P)}
            />
            <button type="submit" disabled={busy} style={btnPrimary(P, busy)}>
              {busy ? "Sending…" : "Send code"}
            </button>
            <button type="button" onClick={() => { setMode("signin"); setStatus(null); }} style={btnGhost(P)}>
              Back to sign in
            </button>
          </form>
        ) : mode === "verify" ? (
          <form onSubmit={handleVerifySignup}>
            <input
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              style={inputStyle(P)}
            />
            <button type="submit" disabled={busy} style={btnPrimary(P, busy)}>
              {busy ? "Verifying…" : "Verify & finish"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPasscode}>
            <input
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="code from email"
              style={inputStyle(P)}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={passcode}
              onChange={e => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="new 6-digit passcode"
              style={inputStyle(P)}
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={passcode2}
              onChange={e => setPasscode2(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="confirm new passcode"
              style={inputStyle(P)}
            />
            <button type="submit" disabled={busy} style={btnPrimary(P, busy)}>
              {busy ? "Saving…" : "Save new passcode"}
            </button>
          </form>
        )}

        {status && (
          <p style={{ fontSize: 12, color: isError ? "#f87171" : "#22c55e", marginTop: 12, lineHeight: 1.45 }}>{status}</p>
        )}
      </div>
    </div>
  );
}

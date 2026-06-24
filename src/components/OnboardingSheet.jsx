import { useState, useEffect, useCallback, useMemo } from "react";
import {
  isAuthConfigured,
  getLastUsername,
  normalizeUsername,
  validateUsername,
  checkUsernameAvailable,
  signUpWithUsername,
  signInWithUsername,
  verifySignupEmail,
} from "../lib/auth.js";
import { calcAge } from "../lib/periodStats.js";
import { POSITIONS } from "../lib/identity.js";

const PLAY_LIKE_CHIPS = ["Steph Curry", "Allen Iverson", "Kyrie Irving", "Jalen Brunson", "Vince Carter", "Klay Thompson"];

const EXPERIENCE_OPTIONS = [
  ["beginner", "🌱 Beginner"],
  ["intermediate", "⚡ Intermediate"],
  ["advanced", "🔥 Advanced"],
];

const GOAL_OPTIONS = [
  ["explosion", "💥 Jump Higher"],
  ["speed", "⚡ Quick Feet"],
  ["conditioning", "🔥 Conditioning"],
  ["handles", "🤲 Ball Handling"],
  ["shooting", "🎯 Shooting"],
  ["strength", "💪 Strength"],
  ["defense", "🛡 Defense"],
  ["coordination", "🎶 Coordination"],
];

function dobBounds() {
  const today = new Date();
  return {
    max: new Date(today.getFullYear() - 8, today.getMonth(), today.getDate()).toLocaleDateString("en-CA"),
    min: new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toLocaleDateString("en-CA"),
  };
}

export default function OnboardingSheet({ P = "#f97316", onComplete, onAuthSuccess, onForgotPasscode }) {
  const authEnabled = isAuthConfigured();

  const [step, setStep] = useState(0);
  /** new = stepped through profile setup; returning = tapped Log in on step 1 */
  const [flow, setFlow] = useState("new");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [experience, setExperience] = useState("beginner");
  const [goals, setGoals] = useState([]);
  const [playStyle, setPlayStyle] = useState("any");
  const [favoritePlayLike, setFavoritePlayLike] = useState("");

  const [username, setUsername] = useState(() => getLastUsername());
  const [passcode, setPasscode] = useState("");
  const [passcode2, setPasscode2] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null);

  const [verifyMode, setVerifyMode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { min: minDob, max: maxDob } = useMemo(() => dobBounds(), []);
  const normUser = normalizeUsername(username);
  const isReturning = flow === "returning";
  const wantsAccount = authEnabled && !isReturning
    && (normUser || passcode || passcode2 || recoveryEmail.trim());

  const checkUsername = useCallback(async (raw) => {
    if (isReturning) return;
    const norm = normalizeUsername(raw);
    if (!norm) { setUsernameStatus(null); return; }
    const err = validateUsername(norm);
    if (err) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    try {
      const available = await checkUsernameAvailable(norm);
      setUsernameStatus(available ? "ok" : "taken");
    } catch {
      setUsernameStatus(null);
    }
  }, [isReturning]);

  useEffect(() => {
    if (isReturning || !normUser) {
      setUsernameStatus(null);
      return undefined;
    }
    const t = setTimeout(() => { checkUsername(normUser); }, 400);
    return () => clearTimeout(t);
  }, [normUser, checkUsername, isReturning]);

  const toggleGoal = (val) => {
    setGoals(prev => prev.includes(val) ? prev.filter(g => g !== val) : prev.length < 3 ? [...prev, val] : prev);
  };

  const buildProfilePatch = () => ({
    athleteName: firstName.trim() || "Hooper",
    lastName: lastName.trim(),
    dateOfBirth: dateOfBirth || null,
    experience,
    goals,
    playStyle,
    favoritePlayLike: favoritePlayLike.trim(),
    favoriteAllTime: favoritePlayLike.trim() || "",
  });

  const validateStep0 = () => {
    if (!firstName.trim()) return "Enter your first name";
    return null;
  };

  const validateStep2Profile = () => {
    if (!dateOfBirth) return "Enter your birthday so we can match your age group";
    const age = calcAge(dateOfBirth);
    if (age < 8 || age > 18) return "Birthday must be for ages 8–18";
    return null;
  };

  const validateSignupAccount = () => {
    if (!wantsAccount) return null;
    if (!normUser) return "Pick a username";
    const userErr = validateUsername(normUser);
    if (userErr) return userErr;
    if (usernameStatus === "taken") return "That username is taken — try another";
    if (usernameStatus === "checking") return "Still checking username…";
    if (!/^\d{6}$/.test(passcode)) return "Passcode must be exactly 6 digits";
    if (passcode !== passcode2) return "Passcodes do not match";
    if (!recoveryEmail.trim().includes("@")) return "Add a recovery email (parent's email works)";
    return null;
  };

  const goToLogin = () => {
    setError(null);
    setFlow("returning");
    setStep(1);
  };

  const goToStep2 = () => {
    const err = validateStep0();
    if (err) { setError(err); return; }
    setError(null);
    setFlow("new");
    setStep(1);
  };

  const finishWithoutAccount = () => {
    const err0 = validateStep0();
    if (err0) { setError(err0); return; }
    const err2 = validateStep2Profile();
    if (err2) { setError(err2); return; }
    onComplete?.({ settings: buildProfilePatch(), finalize: true });
  };

  const handleSignIn = async (e) => {
    e?.preventDefault?.();
    setError(null);
    if (!normUser) { setError("Enter your username"); return; }
    const userErr = validateUsername(normUser);
    if (userErr) { setError(userErr); return; }
    if (!/^\d{6}$/.test(passcode)) { setError("Enter your 6-digit passcode"); return; }

    setBusy(true);
    try {
      await signInWithUsername({ username: normUser, passcode });
      const patch = buildProfilePatch();
      if (firstName.trim()) onComplete?.({ settings: patch, finalize: false });
      await onAuthSuccess?.();
      onComplete?.({
        settings: firstName.trim() ? patch : {},
        finalize: true,
      });
    } catch (err) {
      setError(err.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFinishNew = async (e) => {
    e?.preventDefault?.();
    setError(null);
    const err0 = validateStep0();
    if (err0) { setError(err0); return; }
    const err2 = validateStep2Profile();
    if (err2) { setError(err2); return; }
    const accountErr = validateSignupAccount();
    if (accountErr) { setError(accountErr); return; }

    const patch = buildProfilePatch();
    onComplete?.({ settings: patch, finalize: false });

    if (!wantsAccount) {
      onComplete?.({ settings: patch, finalize: true });
      return;
    }

    setBusy(true);
    try {
      const result = await signUpWithUsername({
        username: normUser,
        passcode,
        recoveryEmail: recoveryEmail.trim(),
      });
      if (result.needsEmailVerification) {
        setPendingEmail(result.email);
        setPendingUsername(result.username);
        setVerifyMode(true);
        setError(null);
      } else {
        await onAuthSuccess?.();
        onComplete?.({ settings: patch, finalize: true });
      }
    } catch (err) {
      setError(err.message || "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifySignupEmail({ email: pendingEmail, code: otpCode, username: pendingUsername });
      await onAuthSuccess?.();
      onComplete?.({ settings: buildProfilePatch(), finalize: true });
      setVerifyMode(false);
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)",
    border: "1.5px solid #f9731640", borderRadius: 10, padding: "12px", fontSize: 16,
    color: "#fff", outline: "none", marginBottom: 10,
  };
  const labelStyle = { fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block" };
  const sectionStyle = { fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.16em",
    color: "#475569", textTransform: "uppercase", margin: "16px 0 10px" };
  const btnPrimary = { width: "100%", background: P, border: "none", borderRadius: 12, padding: 14,
    fontSize: 15, fontWeight: 800, color: "#000", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 };
  const chip = (active) => ({
    padding: "6px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
    background: active ? `${P}20` : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${active ? P : "rgba(255,255,255,0.1)"}`,
    color: active ? P : "#64748b",
  });

  const usernameHint = () => {
    if (!normUser) return null;
    if (usernameStatus === "checking") return <span style={{ color: "#94a3b8" }}>Checking…</span>;
    if (usernameStatus === "ok") return <span style={{ color: "#22c55e" }}>✓ @{normUser} is available</span>;
    if (usernameStatus === "taken") return <span style={{ color: "#f87171" }}>✗ Username taken</span>;
    if (usernameStatus === "invalid") return <span style={{ color: "#f87171" }}>3–20 letters, numbers, or _</span>;
    return null;
  };

  const shell = (children) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 400,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d1627", borderRadius: 20, padding: "24px 22px 22px", width: "100%", maxWidth: 400,
        border: "1px solid #f9731640", maxHeight: "min(92vh, 720px)", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );

  const playLikeBlock = (
    <>
      <div style={sectionStyle}>Your game</div>
      <label style={labelStyle}>Who do you play like?</label>
      <input type="text" value={favoritePlayLike} onChange={e => setFavoritePlayLike(e.target.value)}
        placeholder="e.g. Steph Curry" style={inputStyle} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {PLAY_LIKE_CHIPS.map(n => (
          <button key={n} type="button" onClick={() => setFavoritePlayLike(n)}
            style={chip(favoritePlayLike === n)}>{n}</button>
        ))}
      </div>
    </>
  );

  if (verifyMode) {
    return shell(
      <form onSubmit={handleVerify}>
        <div style={{ fontSize: 42, textAlign: "center", marginBottom: 10 }}>📧</div>
        <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 6px" }}>
          Check your email
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
          Enter the 6-digit code sent to {pendingEmail}
        </p>
        <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
          onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456" autoFocus style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.3em" }} />
        {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.45 }}>{error}</div>}
        <button type="submit" disabled={busy || otpCode.length < 6} style={btnPrimary}>
          {busy ? "…" : "Verify & continue 🏀"}
        </button>
      </form>,
    );
  }

  if (step === 0) {
    return shell(
      <>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8 }}>🏀</div>
        <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 4px" }}>
          Welcome, hooper!
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 16, lineHeight: 1.45 }}>
          Let's get to know you.
        </p>

        <label style={labelStyle}>First name *</label>
        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
          placeholder="First name" autoFocus style={inputStyle} />
        <label style={labelStyle}>Last name</label>
        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
          placeholder="Last name (optional)" style={inputStyle} />

        <div style={labelStyle}>My goals <span style={{ fontWeight: 400 }}>(pick up to 3)</span></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {GOAL_OPTIONS.map(([val, lbl]) => (
            <button key={val} type="button" onClick={() => toggleGoal(val)} style={chip(goals.includes(val))}>
              {lbl}
            </button>
          ))}
        </div>

        {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.45 }}>{error}</div>}

        <button type="button" onClick={goToStep2} disabled={busy} style={btnPrimary}>
          Next →
        </button>
        {authEnabled && (
          <button type="button" onClick={goToLogin} disabled={busy}
            style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 12, cursor: "pointer",
              background: "transparent", border: `1.5px solid ${P}55`, color: P, fontSize: 13, fontWeight: 800 }}>
            Log in
          </button>
        )}
      </>,
    );
  }

  // Step 2 — returning athletes
  if (isReturning) {
    return shell(
      <form onSubmit={handleSignIn}>
        <button type="button" onClick={() => { setStep(0); setError(null); }}
          style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, fontWeight: 700,
            cursor: "pointer", padding: 0, marginBottom: 12 }}>
          ← Back
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 4px" }}>
          Welcome back!
        </h2>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14, lineHeight: 1.45 }}>
          Sign in to restore your progress, friends, and messages.
        </p>

        <label style={labelStyle}>Username</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ color: "#64748b", fontSize: 16, fontWeight: 700 }}>@</span>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="hooper23" autoCapitalize="off" autoCorrect="off" autoFocus
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        </div>
        <label style={labelStyle}>6-digit passcode</label>
        <input type="password" inputMode="numeric" maxLength={6} value={passcode}
          onChange={e => setPasscode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••" style={inputStyle} />
        {onForgotPasscode && (
          <button type="button" onClick={onForgotPasscode} disabled={busy}
            style={{ background: "none", border: "none", color: P, fontSize: 11, fontWeight: 700,
              cursor: "pointer", padding: "0 0 12px", textAlign: "left" }}>
            Forgot passcode?
          </button>
        )}

        {playLikeBlock}

        {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.45 }}>{error}</div>}
        <button type="submit" disabled={busy} style={btnPrimary}>
          {busy ? "…" : "Sign in & continue 🏀"}
        </button>
      </form>,
    );
  }

  // Step 2 — new athletes
  return shell(
    <form onSubmit={handleFinishNew}>
      <button type="button" onClick={() => { setStep(0); setError(null); }}
        style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, fontWeight: 700,
          cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Back
      </button>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 4px" }}>
        Almost there, {firstName.trim() || "hooper"}!
      </h2>
      <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14, lineHeight: 1.45 }}>
        A few more details — you can edit all of this in Settings later.
      </p>

      <label style={labelStyle}>Birthday *</label>
      <input type="date" value={dateOfBirth} min={minDob} max={maxDob}
        onChange={e => setDateOfBirth(e.target.value)}
        style={{ ...inputStyle, colorScheme: "dark" }} />
      {dateOfBirth && (
        <div style={{ fontSize: 11, color: "#94a3b8", margin: "-4px 0 10px" }}>
          Age {calcAge(dateOfBirth)} — for the right training level & leaderboards
        </div>
      )}

      <div style={labelStyle}>Experience</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {EXPERIENCE_OPTIONS.map(([val, lbl]) => (
          <button key={val} type="button" onClick={() => setExperience(val)}
            style={{ ...chip(experience === val), flex: 1, padding: "8px 4px" }}>{lbl}</button>
        ))}
      </div>

      <div style={labelStyle}>Position</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {POSITIONS.map(pos => (
          <button key={pos.id} type="button" onClick={() => setPlayStyle(pos.id)}
            style={{ ...chip(playStyle === pos.id), flex: 1, padding: "8px 4px", fontSize: 10 }}>
            {pos.emoji} {pos.label}
          </button>
        ))}
      </div>

      {playLikeBlock}

      {authEnabled && (
        <>
          <div style={sectionStyle}>Create account</div>
          <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
            Optional — sync across devices, add friends, and get message alerts.
          </p>
          <label style={labelStyle}>Username</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ color: "#64748b", fontSize: 16, fontWeight: 700 }}>@</span>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="hooper23" autoCapitalize="off" autoCorrect="off"
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          </div>
          <div style={{ fontSize: 11, marginBottom: 10, minHeight: 16 }}>{usernameHint()}</div>
          <label style={labelStyle}>6-digit passcode</label>
          <input type="password" inputMode="numeric" maxLength={6} value={passcode}
            onChange={e => setPasscode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••" style={inputStyle} />
          <label style={labelStyle}>Confirm passcode</label>
          <input type="password" inputMode="numeric" maxLength={6} value={passcode2}
            onChange={e => setPasscode2(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••" style={inputStyle} />
          <label style={labelStyle}>Recovery email</label>
          <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)}
            placeholder="parent@email.com" style={inputStyle} />
          <button type="button" onClick={goToLogin} disabled={busy}
            style={{ background: "none", border: "none", color: P, fontSize: 11, fontWeight: 700,
              cursor: "pointer", padding: "0 0 10px", textAlign: "left" }}>
            Already have an account? Log in
          </button>
        </>
      )}

      {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.45 }}>{error}</div>}

      <button type="submit" disabled={busy} style={btnPrimary}>
        {busy ? "…" : wantsAccount ? "Let's go! 🏀" : "Finish setup 🏀"}
      </button>
      {authEnabled && (
        <button type="button" onClick={finishWithoutAccount} disabled={busy}
          style={{ width: "100%", background: "transparent", border: "none", color: "#64748b",
            fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10, padding: 8 }}>
          Skip account for now
        </button>
      )}
    </form>,
  );
}

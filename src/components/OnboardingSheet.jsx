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

  const [accountMode, setAccountMode] = useState("signup"); // signup | signin

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
  const [usernameStatus, setUsernameStatus] = useState(null); // null | checking | ok | taken | invalid

  const [verifyMode, setVerifyMode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { min: minDob, max: maxDob } = useMemo(() => dobBounds(), []);
  const normUser = normalizeUsername(username);
  const wantsAccount = authEnabled && accountMode === "signup"
    && (normUser || passcode || passcode2 || recoveryEmail.trim());

  const checkUsername = useCallback(async (raw) => {
    if (accountMode === "signin") return;
    const norm = normalizeUsername(raw);
    if (!norm) {
      setUsernameStatus(null);
      return;
    }
    const err = validateUsername(norm);
    if (err) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    try {
      const available = await checkUsernameAvailable(norm);
      setUsernameStatus(available ? "ok" : "taken");
    } catch {
      setUsernameStatus(null);
    }
  }, [accountMode]);

  useEffect(() => {
    if (accountMode === "signin" || !normUser) {
      setUsernameStatus(null);
      return undefined;
    }
    const t = setTimeout(() => { checkUsername(normUser); }, 400);
    return () => clearTimeout(t);
  }, [normUser, checkUsername, accountMode]);

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

  const validateProfile = () => {
    if (!firstName.trim()) return "Enter your first name";
    if (!dateOfBirth) return "Enter your birthday so we can match your age group";
    const age = calcAge(dateOfBirth);
    if (age < 8 || age > 18) return "Birthday must be for ages 8–18";
    return null;
  };

  const validateAccount = () => {
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

  const finishProfileOnly = () => {
    const profileErr = validateProfile();
    if (profileErr) { setError(profileErr); return; }
    onComplete?.({ settings: buildProfilePatch(), finalize: true });
  };

  const saveProfile = () => {
    onComplete?.({ settings: buildProfilePatch(), finalize: false });
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
      const profileErr = validateProfile();
      if (!profileErr && firstName.trim()) {
        onComplete?.({ settings: buildProfilePatch(), finalize: false });
      }
      await onAuthSuccess?.();
      onComplete?.({
        settings: !profileErr && firstName.trim() ? buildProfilePatch() : {},
        finalize: true,
      });
    } catch (err) {
      setError(err.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    if (accountMode === "signin") {
      await handleSignIn(e);
      return;
    }
    e?.preventDefault?.();
    setError(null);
    const profileErr = validateProfile();
    if (profileErr) { setError(profileErr); return; }
    const accountErr = validateAccount();
    if (accountErr) { setError(accountErr); return; }

    saveProfile();

    if (!wantsAccount) {
      onComplete?.({ settings: buildProfilePatch(), finalize: true });
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
        onComplete?.({ settings: buildProfilePatch(), finalize: true });
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
    color: "#475569", textTransform: "uppercase", margin: "18px 0 10px" };

  const chip = (active) => ({
    padding: "6px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
    background: active ? `${P}20` : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${active ? P : "rgba(255,255,255,0.1)"}`,
    color: active ? P : "#64748b",
  });

  const usernameHint = () => {
    if (accountMode === "signin" || !normUser) return null;
    if (usernameStatus === "checking") return <span style={{ color: "#94a3b8" }}>Checking…</span>;
    if (usernameStatus === "ok") return <span style={{ color: "#22c55e" }}>✓ @{normUser} is available</span>;
    if (usernameStatus === "taken") return <span style={{ color: "#f87171" }}>✗ Username taken</span>;
    if (usernameStatus === "invalid") return <span style={{ color: "#f87171" }}>3–20 letters, numbers, or _</span>;
    return null;
  };

  const accountBlock = authEnabled ? (
    <>
      <div style={sectionStyle}>Your account</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          ["signup", "Create account"],
          ["signin", "Sign in"],
        ].map(([id, label]) => (
          <button key={id} type="button" disabled={busy}
            onClick={() => { setAccountMode(id); setError(null); setPasscode2(""); setRecoveryEmail(""); setUsernameStatus(null); }}
            style={{
              flex: 1, padding: "9px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: accountMode === id ? `${P}18` : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${accountMode === id ? P : "rgba(255,255,255,0.1)"}`,
              color: accountMode === id ? P : "#64748b",
            }}>
            {label}
          </button>
        ))}
      </div>

      {accountMode === "signup" ? (
        <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
          Sync progress across devices, add friends, and get message alerts.
        </p>
      ) : (
        <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 10px", lineHeight: 1.45 }}>
          Welcome back — sign in to restore your progress and friends.
        </p>
      )}

      <label style={labelStyle}>Username</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ color: "#64748b", fontSize: 16, fontWeight: 700 }}>@</span>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
          placeholder="hooper23" autoCapitalize="off" autoCorrect="off"
          autoFocus={accountMode === "signin"}
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
      </div>
      {accountMode === "signup" && (
        <div style={{ fontSize: 11, marginBottom: 10, minHeight: 16 }}>{usernameHint()}</div>
      )}
      <label style={labelStyle}>6-digit passcode</label>
      <input type="password" inputMode="numeric" maxLength={6} value={passcode}
        onChange={e => setPasscode(e.target.value.replace(/\D/g, ""))}
        placeholder="••••••" style={inputStyle} />
      {accountMode === "signup" && (
        <>
          <label style={labelStyle}>Confirm passcode</label>
          <input type="password" inputMode="numeric" maxLength={6} value={passcode2}
            onChange={e => setPasscode2(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••" style={inputStyle} />
          <label style={labelStyle}>Recovery email</label>
          <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)}
            placeholder="parent@email.com" style={inputStyle} />
        </>
      )}
      {accountMode === "signin" && onForgotPasscode && (
        <button type="button" onClick={onForgotPasscode} disabled={busy}
          style={{ background: "none", border: "none", color: P, fontSize: 11, fontWeight: 700,
            cursor: "pointer", padding: "0 0 10px", textAlign: "left" }}>
          Forgot passcode?
        </button>
      )}
    </>
  ) : null;

  const profileBlock = (
    <>
      <div style={sectionStyle}>About you</div>
      <label style={labelStyle}>First name *</label>
      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
        placeholder="First name" autoFocus={!authEnabled} style={inputStyle} />
      <label style={labelStyle}>Last name</label>
      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
        placeholder="Last name (optional)" style={inputStyle} />
      <label style={labelStyle}>Birthday *</label>
      <input type="date" value={dateOfBirth} min={minDob} max={maxDob}
        onChange={e => setDateOfBirth(e.target.value)}
        style={{ ...inputStyle, colorScheme: "dark" }} />
      {dateOfBirth && (
        <div style={{ fontSize: 11, color: "#94a3b8", margin: "-4px 0 10px" }}>
          Age {calcAge(dateOfBirth)} — used for the right training level & leaderboards
        </div>
      )}

      <div style={labelStyle}>Experience</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {EXPERIENCE_OPTIONS.map(([val, lbl]) => (
          <button key={val} type="button" onClick={() => setExperience(val)} style={{ ...chip(experience === val), flex: 1, padding: "8px 4px" }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={labelStyle}>My goals <span style={{ fontWeight: 400 }}>(up to 3)</span></div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {GOAL_OPTIONS.map(([val, lbl]) => (
          <button key={val} type="button" onClick={() => toggleGoal(val)} style={chip(goals.includes(val))}>
            {lbl}
          </button>
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

      <div style={sectionStyle}>Your game</div>
      <label style={labelStyle}>Who do you play like?</label>
      <input type="text" value={favoritePlayLike} onChange={e => setFavoritePlayLike(e.target.value)}
        placeholder="e.g. Steph Curry" style={inputStyle} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {PLAY_LIKE_CHIPS.map(n => (
          <button key={n} type="button" onClick={() => setFavoritePlayLike(n)}
            style={chip(favoritePlayLike === n)}>{n}</button>
        ))}
      </div>
    </>
  );

  if (verifyMode) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 400,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <form onSubmit={handleVerify}
          style={{ background: "#0d1627", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, border: "1px solid #f9731640" }}>
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
          <button type="submit" disabled={busy || otpCode.length < 6}
            style={{ width: "100%", background: P, border: "none", borderRadius: 12, padding: 14,
              fontSize: 15, fontWeight: 800, color: "#000", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "…" : "Verify & continue 🏀"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 400,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={handleSubmit}
        style={{ background: "#0d1627", borderRadius: 20, padding: "24px 22px 22px", width: "100%", maxWidth: 400,
          border: "1px solid #f9731640", maxHeight: "min(92vh, 720px)", overflowY: "auto" }}>
        <div style={{ fontSize: 44, textAlign: "center", marginBottom: 8 }}>🏀</div>
        <h2 style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: "var(--fkh-text)", margin: "0 0 4px" }}>
          Welcome, hooper!
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 4, lineHeight: 1.45 }}>
          {accountMode === "signin" && authEnabled
            ? "Sign in to pick up where you left off."
            : "Set up your profile — everything saves to Me → Settings too."}
        </p>

        {accountBlock}
        {(!authEnabled || accountMode === "signup") && profileBlock}

        {error && <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10, lineHeight: 1.45 }}>{error}</div>}

        <button type="submit" disabled={busy}
          style={{ width: "100%", background: P, border: "none", borderRadius: 12, padding: 14,
            fontSize: 15, fontWeight: 800, color: "#000", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "…" : accountMode === "signin" ? "Sign in & continue 🏀"
            : wantsAccount ? "Create profile & account 🏀" : "Let's go! 🏀"}
        </button>
        {authEnabled && accountMode === "signup" && (
          <button type="button" onClick={finishProfileOnly} disabled={busy}
            style={{ width: "100%", background: "transparent", border: "none", color: "#64748b",
              fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 10, padding: 8 }}>
            Skip account for now
          </button>
        )}
      </form>
    </div>
  );
}

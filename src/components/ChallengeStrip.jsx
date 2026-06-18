import { useEffect, useState } from "react";
import { fetchActiveChallenges, fetchChallengeStanding, METRIC_LABEL } from "../lib/challengesApi.js";

/**
 * Challenges live directly beneath the Daily Mission — never their own nav tab.
 * Shows the active challenge and your standing among friends for its metric/period.
 * Quietly renders nothing until there's something to show (no friends / unconfigured).
 */
export default function ChallengeStrip({ P = "#f97316", onAddFriends }) {
  const [challenge, setChallenge] = useState(null);
  const [standing, setStanding] = useState(null);
  const [state, setState] = useState("loading"); // loading | none | nofriends | ready

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await fetchActiveChallenges();
      if (!alive) return;
      if (!list.length) { setState("none"); return; }
      const ch = list[0];
      setChallenge(ch);
      const st = await fetchChallengeStanding(ch);
      if (!alive) return;
      if (!st) { setState("nofriends"); return; }
      setStanding(st);
      setState("ready");
    })();
    return () => { alive = false; };
  }, []);

  if (state === "loading" || state === "none") return null;

  const metricLabel = challenge ? (METRIC_LABEL[challenge.metric] || challenge.metric) : "";
  const periodLabel = challenge?.period === "month" ? "this month" : "this week";

  const wrap = {
    margin: "0 20px 14px", borderRadius: 16, overflow: "hidden",
    border: `1px solid ${P}33`, background: `${P}0c`, padding: "12px 14px",
  };
  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 18 }}>{challenge?.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em",
          color: P, textTransform: "uppercase", fontWeight: 800 }}>Challenge · {periodLabel}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>{challenge?.title}</div>
      </div>
    </div>
  );

  // Not enough friends to compete yet — nudge, don't nag.
  if (state === "nofriends") {
    return (
      <div style={wrap}>
        {header}
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
          Add a friend to compete for most {metricLabel} {periodLabel}.
          {onAddFriends && (
            <button onClick={onAddFriends} style={{
              marginLeft: 8, padding: "4px 10px", borderRadius: 8, border: `1px solid ${P}44`,
              background: "transparent", color: P, fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>Add friends →</button>
          )}
        </div>
      </div>
    );
  }

  const { myRank, total, leader, me, field } = standing;
  const leaderVal = leader ? (leader[field] || 0) : 0;
  const myVal = me ? (me[field] || 0) : 0;
  const leading = myRank === 1;
  const gap = Math.max(0, leaderVal - myVal);
  const goal = challenge?.goal_value || null;
  const earned = goal != null && myVal >= goal;
  const toGo = goal != null ? Math.max(0, goal - myVal) : null;
  const pct = goal ? Math.min(100, Math.round((myVal / goal) * 100)) : null;

  return (
    <div style={wrap}>
      {header}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 800, color: P }}>
          #{myRank}<span style={{ fontSize: 12, color: "#64748b" }}>/{total}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.45 }}>
          {leading
            ? `You're leading with ${myVal.toLocaleString()} ${metricLabel}! 🔥`
            : `${leader.display_name} leads with ${leaderVal.toLocaleString()} — ${gap.toLocaleString()} ${metricLabel} to catch up.`}
        </div>
      </div>

      {/* Goal progress — the reward is earned by effort, not by beating friends. */}
      {goal != null && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: earned ? "#22c55e" : P }} />
          </div>
          <div style={{ fontSize: 10, marginTop: 5, color: earned ? "#22c55e" : "#64748b", fontWeight: 700 }}>
            {earned
              ? `✓ Earned ${challenge.reward_label}! 🎉`
              : `${myVal.toLocaleString()}/${goal.toLocaleString()} ${metricLabel} — ${toGo.toLocaleString()} to earn ${challenge.reward_label}`}
          </div>
        </div>
      )}

      {/* Group challenges also crown a weekly champion */}
      {(challenge?.scope === "friends" || challenge?.scope === "team") && (
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
          🏆 {leading ? "You're on track for" : "Leader earns"} the <span style={{ color: P, fontWeight: 700 }}>{challenge.title} Champion</span> trophy this week
        </div>
      )}
    </div>
  );
}

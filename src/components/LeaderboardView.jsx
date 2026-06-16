import { useCallback, useEffect, useState } from "react";
import {
  AGE_GROUPS,
  LEADERBOARD_PERIODS,
  getAgeGroup,
  getAgeGroupLabel,
} from "../lib/periodStats.js";
import {
  fetchLeaderboard,
  getAthleteId,
  getLastPushTime,
  isLeaderboardConfigured,
  pushFromAppState,
} from "../lib/leaderboardApi.js";

function fmtRelativePush(ts) {
  if (!ts) return "Never pushed";
  const d = new Date(ts);
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return "Pushed today";
  if (days === 1) return "Pushed yesterday";
  return `Pushed ${days} days ago`;
}

function medalForRank(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function LeaderboardView({
  settings,
  completed,
  missionLog,
  getCategory,
  P,
  BG,
  SF,
  bd,
  lbl,
  onPushSuccess,
}) {
  const myAgeGroup = getAgeGroup(settings.dateOfBirth);
  const [ageGroup, setAgeGroup] = useState(myAgeGroup);
  const [period, setPeriod] = useState("week");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState(null);
  const [pushMsg, setPushMsg] = useState(null);
  const configured = isLeaderboardConfigured();
  const athleteId = getAthleteId();

  const load = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError(null);
    const { rows: data, error: err } = await fetchLeaderboard({ ageGroup, period });
    setRows(data);
    if (err) setError(err);
    setLoading(false);
  }, [ageGroup, period, configured]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePush = async () => {
    if (!settings.leaderboardSharing) {
      setError("Turn on “Share on Leaderboard” in Settings first");
      return;
    }
    setPushing(true);
    setError(null);
    setPushMsg(null);
    try {
      await pushFromAppState({ settings, completed, missionLog, getCategory });
      setPushMsg("Stats pushed! You're on the board.");
      onPushSuccess?.();
      await load();
    } catch (e) {
      setError(e.message || "Push failed");
    } finally {
      setPushing(false);
    }
  };

  const myRank = rows.findIndex(r => r.athlete_id === athleteId) + 1;
  const myRow = rows.find(r => r.athlete_id === athleteId);

  return (
    <div style={{ padding: "0 20px 100px" }}>
      {!configured && (
        <div style={{
          background: `${P}12`, border: `1px solid ${P}30`, borderRadius: 14,
          padding: "14px 16px", marginBottom: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.55,
        }}>
          Leaderboard backend is not connected yet. Add <code style={{ color: P }}>VITE_SUPABASE_URL</code> and{" "}
          <code style={{ color: P }}>VITE_SUPABASE_ANON_KEY</code> to your build, then run{" "}
          <code style={{ color: P }}>supabase/schema.sql</code> in your Supabase project.
        </div>
      )}

      <div style={{
        background: `${P}0d`, border: `1px solid ${P}22`, borderRadius: 16,
        padding: "16px 16px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P, marginBottom: 4 }}>Push your stats</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Sharing as <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{settings.athleteName}</span>
              {" · "}{getAgeGroupLabel(myAgeGroup)}
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
              {fmtRelativePush(getLastPushTime())}
            </div>
          </div>
          <button
            onClick={handlePush}
            disabled={!configured || pushing || !settings.leaderboardSharing}
            style={{
              padding: "10px 16px", borderRadius: 12, border: "none", flexShrink: 0,
              background: configured && settings.leaderboardSharing ? P : "rgba(255,255,255,0.08)",
              color: configured && settings.leaderboardSharing ? "#000" : "#64748b",
              fontSize: 12, fontWeight: 800, cursor: configured ? "pointer" : "not-allowed",
            }}
          >
            {pushing ? "Pushing…" : "Push Stats ↑"}
          </button>
        </div>
        {pushMsg && (
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 8 }}>{pushMsg}</div>
        )}
        {error && (
          <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8 }}>{error}</div>
        )}
        {!settings.leaderboardSharing && (
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Leaderboard sharing is off. Enable it in Settings → Leaderboard.
          </div>
        )}
      </div>

      {myRow && (
        <div style={{
          background: SF, border: `1px solid ${P}40`, borderRadius: 12,
          padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800, color: P, minWidth: 36 }}>
            #{myRank || "—"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>You · {myRow.display_name}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
              {myRow.xp.toLocaleString()} XP · {myRow.shots_made.toLocaleString()} makes · {myRow.training_days} days
            </div>
          </div>
        </div>
      )}

      <div style={lbl}>Age group</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {AGE_GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => setAgeGroup(g.id)}
            style={{
              padding: "7px 11px", borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${ageGroup === g.id ? P : bd}`,
              background: ageGroup === g.id ? `${P}20` : "transparent",
              color: ageGroup === g.id ? P : "#64748b",
            }}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div style={lbl}>Time period</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {LEADERBOARD_PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 10, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${period === p.id ? P : bd}`,
              background: period === p.id ? `${P}18` : "transparent",
              color: period === p.id ? P : "#64748b",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={lbl}>Rankings</div>
        <button
          onClick={load}
          disabled={loading || !configured}
          style={{
            background: "transparent", border: `1px solid ${P}30`, borderRadius: 8,
            color: P, fontSize: 10, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻ Refresh"}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, color: "#64748b", fontSize: 13 }}>Loading rankings…</div>
      ) : rows.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 32, color: "#64748b", fontSize: 13,
          background: SF, borderRadius: 14, border: `1px solid ${bd}`,
        }}>
          No one on the board yet for {getAgeGroupLabel(ageGroup)} · {LEADERBOARD_PERIODS.find(p => p.id === period)?.label}.
          <br />Be the first — push your stats!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, i) => {
            const rank = i + 1;
            const isMe = row.athlete_id === athleteId;
            return (
              <div
                key={row.athlete_id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                  background: isMe ? `${P}12` : SF,
                  border: `1px solid ${isMe ? `${P}40` : bd}`,
                }}
              >
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: rank <= 3 ? 20 : 14,
                  fontWeight: 800, color: rank <= 3 ? P : "#64748b", minWidth: 32, textAlign: "center",
                }}>
                  {medalForRank(rank)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: isMe ? P : "#f1f5f9",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {row.display_name}{isMe ? " (you)" : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    {row.shots_made.toLocaleString()} makes · {row.training_days} training days
                    {row.streak >= 3 ? ` · 🔥 ${row.streak}d streak` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 800, color: P }}>
                    {row.xp.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569" }}>XP</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

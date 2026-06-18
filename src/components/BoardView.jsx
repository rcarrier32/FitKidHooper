import { useCallback, useEffect, useState } from "react";
import {
  AGE_GROUPS,
  LEADERBOARD_PERIODS,
  getAgeGroup,
  getAgeGroupLabel,
} from "../lib/periodStats.js";
import {
  BOARD_TYPES,
  fetchAgeGroupBoard,
  fetchFriendsBoard,
  getBoardAthleteId,
  getLastPushTime,
  isLeaderboardConfigured,
  maybeAutoSyncLeaderboard,
  createFriendInvite,
  acceptFriendInvite,
  listFriendAthleteIds,
  getInviteUrl,
} from "../lib/boardsApi.js";
import AthleteCard from "./AthleteCard.jsx";
import { getAchievementMeta } from "../lib/achievements.js";

function fmtRelativePush(ts) {
  if (!ts) return "Not synced yet";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return "Synced today";
  if (days === 1) return "Synced yesterday";
  return `Synced ${days} days ago`;
}

function medalForRank(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

export default function BoardView({
  settings,
  completed,
  missionLog,
  getCategory,
  currentLevel,
  xpData,
  P,
  SF,
  bd,
  lbl,
  onPushSuccess,
  initialInviteCode,
  isSignedIn,
  onOpenAuth,
}) {
  const myAgeGroup = getAgeGroup(settings.dateOfBirth);
  const [boardType, setBoardType] = useState("age_group");
  const [ageGroup, setAgeGroup] = useState(myAgeGroup);
  const [period, setPeriod] = useState("week");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState(null);
  const [pushMsg, setPushMsg] = useState(null);
  const [athleteId, setAthleteId] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteInput, setInviteInput] = useState(initialInviteCode || "");
  const [friendMsg, setFriendMsg] = useState(null);
  const configured = isLeaderboardConfigured();

  useEffect(() => {
    getBoardAthleteId().then(setAthleteId);
  }, []);

  const load = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError(null);
    let result = { rows: [], error: null };

    if (boardType === "age_group") {
      result = await fetchAgeGroupBoard({ ageGroup, period });
    } else if (boardType === "friends" && athleteId) {
      const friendIds = await listFriendAthleteIds(athleteId);
      result = await fetchFriendsBoard({ athleteIds: friendIds, period });
    }

    setRows(result.rows);
    if (result.error) setError(result.error);
    setLoading(false);
  }, [boardType, ageGroup, period, configured, athleteId]);

  const syncAndLoad = useCallback(async (force = false) => {
    if (configured && settings.leaderboardSharing) {
      await maybeAutoSyncLeaderboard({ settings, completed, missionLog, getCategory, force });
    }
    await load();
  }, [configured, settings, completed, missionLog, getCategory, load]);

  useEffect(() => { syncAndLoad(); }, [syncAndLoad]);

  useEffect(() => {
    if (initialInviteCode && athleteId) {
      setInviteInput(initialInviteCode);
      setBoardType("friends");
    }
  }, [initialInviteCode, athleteId]);

  const handleSyncNow = async () => {
    if (!settings.leaderboardSharing) {
      setError("Turn on “Share on Leaderboard” in Settings first");
      return;
    }
    setPushing(true);
    setError(null);
    setPushMsg(null);
    try {
      const result = await maybeAutoSyncLeaderboard({
        settings, completed, missionLog, getCategory, force: true,
      });
      if (!result.ok) throw new Error(result.error || "Sync failed");
      setPushMsg("Boards updated.");
      onPushSuccess?.();
      await load();
    } catch (e) {
      setError(e.message || "Sync failed");
    } finally {
      setPushing(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!athleteId) return;
    setFriendMsg(null);
    try {
      const { code } = await createFriendInvite(athleteId);
      setInviteCode(code);
      setFriendMsg(`Share code: ${code}`);
    } catch (e) {
      setFriendMsg(e.message || "Could not create invite");
    }
  };

  const handleAcceptInvite = async () => {
    if (!athleteId || !inviteInput.trim()) return;
    setFriendMsg(null);
    try {
      await acceptFriendInvite(inviteInput.trim(), athleteId);
      setFriendMsg("Friend added!");
      setInviteInput("");
      await load();
    } catch (e) {
      setFriendMsg(e.message || "Invalid code");
    }
  };

  const myRank = rows.findIndex(r => r.athlete_id === athleteId) + 1;
  const myRow = rows.find(r => r.athlete_id === athleteId);

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <AthleteCard
        settings={settings}
        currentLevel={currentLevel}
        totalXP={xpData?.total}
        variant="compact"
        P={P}
      />

      {!configured && (
        <div style={{
          background: `${P}12`, border: `1px solid ${P}30`, borderRadius: 14,
          padding: "14px 16px", margin: "16px 0", fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.55,
        }}>
          Boards backend is not connected. Run <code style={{ color: P }}>supabase/schema.sql</code> and{" "}
          <code style={{ color: P }}>supabase/boards.sql</code> in your Supabase project.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, margin: "16px 0 12px" }}>
        {BOARD_TYPES.map(b => (
          <button
            key={b.id}
            disabled={b.comingSoon}
            onClick={() => !b.comingSoon && setBoardType(b.id)}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 10, fontWeight: 700,
              cursor: b.comingSoon ? "not-allowed" : "pointer",
              border: `1px solid ${boardType === b.id ? P : bd}`,
              background: boardType === b.id ? `${P}18` : "transparent",
              color: boardType === b.id ? P : "#64748b",
              opacity: b.comingSoon ? 0.45 : 1,
            }}
          >
            {b.emoji} {b.label}
          </button>
        ))}
      </div>

      {boardType === "friends" && (
        <div style={{ background: SF, border: `1px solid ${bd}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          {!isSignedIn && (
            <div style={{
              marginBottom: 12, padding: "10px 12px", borderRadius: 10,
              background: `${P}12`, border: `1px solid ${P}28`, fontSize: 11, color: "var(--fkh-text-muted)", lineHeight: 1.5,
            }}>
              Sign in to add friends and keep your friend list across devices.
              <button type="button" onClick={onOpenAuth} style={{
                display: "block", marginTop: 8, padding: "8px 12px", borderRadius: 8, border: `1px solid ${P}44`,
                background: "transparent", color: P, fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%",
              }}>Sign in</button>
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: P, marginBottom: 8 }}>Add a friend</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={handleCreateInvite} disabled={!isSignedIn} style={{
              flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${P}44`,
              background: "transparent", color: isSignedIn ? P : "#64748b", fontSize: 11, fontWeight: 700,
              cursor: isSignedIn ? "pointer" : "not-allowed", opacity: isSignedIn ? 1 : 0.6,
            }}>Get friend code</button>
          </div>
          {inviteCode && (
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: P, letterSpacing: "0.15em", marginBottom: 8 }}>
              {inviteCode}
            </div>
          )}
          {inviteCode && (
            <div style={{ fontSize: 10, color: "#64748b", wordBreak: "break-all", marginBottom: 8 }}>
              Link: {getInviteUrl(inviteCode)}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={inviteInput}
              onChange={e => setInviteInput(e.target.value.toUpperCase())}
              placeholder="Enter friend code"
              maxLength={6}
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bd}`,
                background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 13,
              }}
            />
            <button onClick={handleAcceptInvite} style={{
              padding: "8px 14px", borderRadius: 8, border: "none", background: P,
              color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer",
            }}>Join</button>
          </div>
          {friendMsg && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{friendMsg}</div>}
        </div>
      )}

      <div style={{
        background: `${P}0d`, border: `1px solid ${P}22`, borderRadius: 16,
        padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P, marginBottom: 4 }}>Board sync</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {settings.leaderboardSharing ? "Auto-syncs as you train" : "Sharing is off"}
              {" · "}{getAgeGroupLabel(myAgeGroup)}
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
              {fmtRelativePush(getLastPushTime())}
            </div>
          </div>
          <button onClick={handleSyncNow} disabled={!configured || pushing || !settings.leaderboardSharing} style={{
            padding: "10px 16px", borderRadius: 12, flexShrink: 0, background: "transparent",
            border: `1px solid ${configured && settings.leaderboardSharing ? P : "rgba(255,255,255,0.12)"}`,
            color: configured && settings.leaderboardSharing ? P : "#64748b",
            fontSize: 12, fontWeight: 700, cursor: configured ? "pointer" : "not-allowed",
          }}>
            {pushing ? "Syncing…" : "Sync now"}
          </button>
        </div>
        {pushMsg && <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginTop: 8 }}>{pushMsg}</div>}
        {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>{error}</div>}
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
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fkh-text)" }}>You · {myRow.display_name}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
              {myRow.xp.toLocaleString()} XP · {myRow.shots_made.toLocaleString()} makes
            </div>
          </div>
        </div>
      )}

      {boardType === "age_group" && (
        <>
          <div style={lbl}>Age group</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {AGE_GROUPS.map(g => (
              <button key={g.id} onClick={() => setAgeGroup(g.id)} style={{
                padding: "7px 11px", borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${ageGroup === g.id ? P : bd}`,
                background: ageGroup === g.id ? `${P}20` : "transparent",
                color: ageGroup === g.id ? P : "#64748b",
              }}>{g.label}</button>
            ))}
          </div>
        </>
      )}

      <div style={lbl}>Time period</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {LEADERBOARD_PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 10, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${period === p.id ? P : bd}`,
            background: period === p.id ? `${P}18` : "transparent",
            color: period === p.id ? P : "#64748b",
          }}>{p.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={lbl}>Rankings</div>
        <button onClick={load} disabled={loading || !configured} style={{
          background: "transparent", border: `1px solid ${P}30`, borderRadius: 8,
          color: P, fontSize: 10, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
        }}>{loading ? "…" : "↻ Refresh"}</button>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, color: "#64748b", fontSize: 13 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 32, color: "#64748b", fontSize: 13,
          background: SF, borderRadius: 14, border: `1px solid ${bd}`,
        }}>
          {boardType === "friends"
            ? "No friends on the board yet. Share a friend code!"
            : "No rankings yet — train and sync to appear!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, i) => {
            const rank = i + 1;
            const isMe = row.athlete_id === athleteId;
            const rowTitle = row.active_title ? getAchievementMeta(row.active_title) : null;
            return (
              <div key={row.athlete_id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                background: isMe ? `${P}12` : SF,
                border: `1px solid ${isMe ? `${P}40` : bd}`,
              }}>
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: rank <= 3 ? 20 : 14,
                  fontWeight: 800, color: rank <= 3 ? P : "#64748b", minWidth: 32, textAlign: "center",
                }}>{medalForRank(rank)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: isMe ? P : "var(--fkh-text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {row.display_name}{isMe ? " (you)" : ""}
                    </span>
                    {rowTitle && (
                      <span style={{
                        flexShrink: 0, fontSize: 9, fontWeight: 800, color: rowTitle.color,
                        background: `${rowTitle.color}1f`, border: `1px solid ${rowTitle.color}55`,
                        padding: "1px 6px", borderRadius: 999,
                      }}>{rowTitle.emoji} {rowTitle.name}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    {row.shots_made.toLocaleString()} makes · {row.training_days} days
                    {row.streak >= 3 ? ` · 🔥 ${row.streak}d` : ""}
                    {row.play_like ? ` · 🎯 plays like ${row.play_like}` : ""}
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

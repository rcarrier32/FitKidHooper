import { useCallback, useEffect, useRef, useState } from "react";
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
  sendFriendRequest,
  listFriendRequests,
  respondFriendRequest,
  listFriendAthleteIds,
  getInviteUrl,
} from "../lib/boardsApi.js";
import AthleteCard from "./AthleteCard.jsx";
import FeedView from "./FeedView.jsx";
import FriendAvatar from "./FriendAvatar.jsx";
import FriendProfileSheet from "./FriendProfileSheet.jsx";
import MessagesSheet from "./MessagesSheet.jsx";
import ChallengesActivePanel from "./ChallengesActivePanel.jsx";
import { fetchProfileSnippets, profileSnippet } from "../lib/friendProfileApi.js";
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
  earnedBadges = [],
  ledger = {},
  personalChallenges = [],
  currentLevel,
  xpData,
  P,
  BG,
  SF,
  bd,
  lbl,
  onPushSuccess,
  onAddFriends,
  focusFriendsTick = 0,
  initialInviteCode,
  isSignedIn,
  onOpenAuth,
  modes = ["challenges", "friends", "rankings"],
}) {
  const myAgeGroup = getAgeGroup(settings.dateOfBirth);
  const friendsPanelRef = useRef(null);
  const [mode, setMode] = useState(modes[0]); // which of: challenges | friends | rankings
  const [messageFriend, setMessageFriend] = useState(null); // { id, name } → open chat
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
  const [friendUsername, setFriendUsername] = useState("");
  const [requests, setRequests] = useState([]);
  const [requesterProfiles, setRequesterProfiles] = useState({});
  const [friendProfileId, setFriendProfileId] = useState(null);
  const [friendRoster, setFriendRoster] = useState([]);
  const configured = isLeaderboardConfigured();

  const viewFriend = useCallback(id => {
    if (id) setFriendProfileId(id);
  }, []);

  useEffect(() => {
    getBoardAthleteId().then(setAthleteId);
  }, []);

  const loadRequests = useCallback(async () => {
    if (!isSignedIn) { setRequests([]); setRequesterProfiles({}); return; }
    const list = await listFriendRequests();
    setRequests(list);
    const ids = list.map(r => r.requester_id).filter(Boolean);
    if (ids.length) {
      const map = await fetchProfileSnippets(ids);
      setRequesterProfiles(map);
    } else {
      setRequesterProfiles({});
    }
  }, [isSignedIn]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    if (mode !== "friends" || !athleteId || !configured) {
      setFriendRoster([]);
      return;
    }
    let alive = true;
    (async () => {
      const ids = (await listFriendAthleteIds(athleteId)).filter(id => id !== athleteId);
      if (!ids.length) { if (alive) setFriendRoster([]); return; }
      const map = await fetchProfileSnippets(ids);
      if (!alive) return;
      setFriendRoster(ids.map(id => map[id] || profileSnippet({ id, display_name: "Friend" })));
    })();
    return () => { alive = false; };
  }, [mode, athleteId, configured, requests.length]);

  useEffect(() => {
    if (!focusFriendsTick || !modes.includes("friends")) return;
    setMode("friends");
    const timer = setTimeout(() => {
      friendsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(timer);
  }, [focusFriendsTick]);

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

    if (result.error) setError(result.error);
    else if (result.rows?.length) {
      const map = await fetchProfileSnippets(result.rows.map(r => r.athlete_id));
      setRows(result.rows.map(r => ({
        ...r,
        profile: map[r.athlete_id] || profileSnippet({ id: r.athlete_id, display_name: r.display_name }),
      })));
    } else {
      setRows(result.rows || []);
    }
    setLoading(false);
  }, [boardType, ageGroup, period, configured, athleteId]);

  const syncAndLoad = useCallback(async (force = false) => {
    if (configured) {
      await maybeAutoSyncLeaderboard({
        settings, completed, missionLog, getCategory, earnedBadges, ledger, force,
      });
    }
    await load();
  }, [configured, settings, completed, missionLog, getCategory, earnedBadges, ledger, load]);

  useEffect(() => { syncAndLoad(); }, [syncAndLoad]);

  useEffect(() => {
    if (initialInviteCode && athleteId && modes.includes("friends")) {
      setInviteInput(initialInviteCode);
      setMode("friends");
    }
  }, [initialInviteCode, athleteId]);

  const handleSyncNow = async () => {
    setPushing(true);
    setError(null);
    setPushMsg(null);
    try {
      const result = await maybeAutoSyncLeaderboard({
        settings, completed, missionLog, getCategory, earnedBadges, ledger, force: true,
      });
      if (!result.ok) throw new Error(result.error || "Sync failed");
      setPushMsg("Challenges synced.");
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

  const handleSendRequest = async () => {
    const u = friendUsername.trim();
    if (!u) return;
    setFriendMsg(null);
    try {
      const res = await sendFriendRequest(u);
      if (res.status === "accepted") {
        setFriendMsg(`You're now friends with @${u}!`);
        await load();
      } else {
        setFriendMsg(`Request sent to @${u} — they'll need to accept.`);
      }
      setFriendUsername("");
    } catch (e) {
      setFriendMsg(e.message || "Could not send request");
    }
  };

  const handleRespond = async (id, accept) => {
    setFriendMsg(null);
    try {
      await respondFriendRequest(id, accept);
      await loadRequests();
      if (accept) { setFriendMsg("Friend added!"); await load(); }
    } catch (e) {
      setFriendMsg(e.message || "Could not respond");
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

      {modes.length > 1 && (
        <div style={{ display: "flex", gap: 6, margin: "14px 0 0" }}>
          {[["challenges", "🎯 Challenges"], ["friends", "👋 Friends"], ["rankings", "🏆 Rankings"]]
            .filter(([m]) => modes.includes(m))
            .map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${mode === m ? P : bd}`,
              background: mode === m ? `${P}18` : "transparent",
              color: mode === m ? P : "#64748b",
            }}>{label}</button>
          ))}
        </div>
      )}

      {mode === "challenges" ? (
        <div style={{ marginTop: 12 }}>
          <ChallengesActivePanel
            personalChallenges={personalChallenges}
            P={P}
            SF={SF}
            bd={bd}
            onAddFriends={() => { onAddFriends?.(); setMode("friends"); }}
          />
        </div>
      ) : mode === "friends" ? (
        <div style={{ marginTop: 12 }}>
          <div ref={friendsPanelRef} style={{ background: SF, border: `1px solid ${bd}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
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
            <div style={{ fontSize: 14, fontWeight: 800, color: P, marginBottom: 4 }}>👋 Add a friend</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 1.45 }}>
              Train together — add by username or share a friend code.
            </div>

            {requests.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Friend requests ({requests.length})
                </div>
                {requests.map(r => {
                  const prof = requesterProfiles[r.requester_id] || profileSnippet({
                    id: r.requester_id,
                    display_name: r.display_name,
                  });
                  return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${P}10`, border: `1px solid ${P}22`, marginBottom: 6 }}>
                    <FriendAvatar
                      profile={prof}
                      displayName={r.display_name || r.username}
                      size={36}
                      P={P}
                      onPress={() => viewFriend(r.requester_id)}
                    />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--fkh-text)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        onClick={() => viewFriend(r.requester_id)}
                        style={{
                          background: "none", border: "none", padding: 0, margin: 0,
                          font: "inherit", fontWeight: 700, color: "var(--fkh-text)",
                          cursor: "pointer", textDecoration: "underline",
                        }}
                      >
                        @{r.username || "athlete"}
                      </button>
                      {r.display_name ? <span style={{ color: "#64748b", fontWeight: 400 }}> · {r.display_name}</span> : null}
                    </div>
                    <button onClick={() => handleRespond(r.id, true)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: P, color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Accept</button>
                    <button onClick={() => handleRespond(r.id, false)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${bd}`, background: "transparent", color: "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Decline</button>
                  </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                value={friendUsername}
                onChange={e => setFriendUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                placeholder="Friend's username"
                disabled={!isSignedIn}
                maxLength={20}
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bd}`,
                  background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 13,
                }}
              />
              <button onClick={handleSendRequest} disabled={!isSignedIn || !friendUsername.trim()} style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: isSignedIn && friendUsername.trim() ? P : `${P}55`,
                color: "#000", fontSize: 11, fontWeight: 800,
                cursor: isSignedIn && friendUsername.trim() ? "pointer" : "not-allowed",
              }}>Add</button>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 10 }}>
              They'll get a request to accept. Or share a one-time code:
            </div>

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
              }}>Redeem</button>
            </div>
            {friendMsg && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{friendMsg}</div>}
          </div>

          {friendRoster.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={lbl}>Your squad</div>
                <button onClick={() => setMessageFriend("inbox")} style={{
                  display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 99,
                  border: `1px solid ${P}44`, background: `${P}12`, color: P, fontSize: 11, fontWeight: 800, cursor: "pointer",
                }}>💬 Messages</button>
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {friendRoster.map(prof => (
                  <div key={prof.id} style={{ flex: "0 0 auto", textAlign: "center", width: 64 }}>
                    <button type="button" onClick={() => viewFriend(prof.id)} style={{
                      background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%",
                    }}>
                      <FriendAvatar profile={prof} size={48} P={P} />
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "var(--fkh-text-muted)",
                        marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {prof.displayName?.split(" ")[0] || "Friend"}
                      </div>
                    </button>
                    <button type="button" onClick={() => setMessageFriend({ id: prof.id, name: prof.displayName })}
                      title="Message" style={{
                        marginTop: 4, padding: "2px 10px", borderRadius: 99, border: `1px solid ${P}33`,
                        background: "transparent", color: P, fontSize: 11, cursor: "pointer",
                      }}>💬</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <div style={{ ...lbl, marginBottom: 4 }}>Friends feed</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.45, marginBottom: 12 }}>
              See what friends unlocked · React with emojis · Comment and @tag teammates
            </div>
            <FeedView P={P} SF={SF} bd={bd} onViewFriend={viewFriend} />
          </div>
        </div>
      ) : (<>

      {!configured && (
        <div style={{
          background: `${P}12`, border: `1px solid ${P}30`, borderRadius: 14,
          padding: "14px 16px", margin: "16px 0", fontSize: 12, color: "var(--fkh-text-muted)", lineHeight: 1.55,
        }}>
          Challenges backend is not connected. Run <code style={{ color: P }}>supabase/schema.sql</code> and{" "}
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
        <button type="button" onClick={() => setMode("friends")} style={{
          display: "block", width: "100%", marginBottom: 16, padding: "12px 14px", borderRadius: 12,
          border: `1px solid ${P}44`, background: `${P}10`, color: P, fontSize: 12, fontWeight: 800,
          cursor: "pointer", textAlign: "left",
        }}>
          👋 Add or manage friends →
          <div style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginTop: 4 }}>
            Friend codes, requests, and the friends feed live on the Friends tab
          </div>
        </button>
      )}

      <div style={{
        background: `${P}0d`, border: `1px solid ${P}22`, borderRadius: 16,
        padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P, marginBottom: 4 }}>Board sync</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Auto-syncs as you train
              {" · "}{getAgeGroupLabel(myAgeGroup)}
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 4, fontFamily: "'DM Mono',monospace" }}>
              {fmtRelativePush(getLastPushTime())}
            </div>
          </div>
          <button onClick={handleSyncNow} disabled={!configured || pushing} style={{
            padding: "10px 16px", borderRadius: 12, flexShrink: 0, background: "transparent",
            border: `1px solid ${configured ? P : "rgba(255,255,255,0.12)"}`,
            color: configured ? P : "#64748b",
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
            ? "No friends on the board yet. Tap 👋 Friends above to add someone!"
            : "No rankings yet — train and sync to appear!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, i) => {
            const rank = i + 1;
            const isMe = row.athlete_id === athleteId;
            const rowTitle = row.active_title ? getAchievementMeta(row.active_title) : null;
            const canView = !isMe && boardType === "friends";
            return (
              <div key={row.athlete_id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                background: isMe ? `${P}12` : SF,
                border: `1px solid ${isMe ? `${P}40` : bd}`,
              }}>
                <div style={{
                  fontFamily: "'DM Mono',monospace", fontSize: rank <= 3 ? 20 : 14,
                  fontWeight: 800, color: rank <= 3 ? P : "#64748b", minWidth: 28, textAlign: "center",
                }}>{medalForRank(rank)}</div>
                <FriendAvatar
                  profile={row.profile}
                  displayName={row.display_name}
                  size={40}
                  P={P}
                  onPress={canView ? () => viewFriend(row.athlete_id) : null}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    {canView ? (
                      <button
                        type="button"
                        onClick={() => viewFriend(row.athlete_id)}
                        style={{
                          background: "none", border: "none", padding: 0, margin: 0,
                          fontSize: 13, fontWeight: 700, color: "var(--fkh-text)",
                          cursor: "pointer", textDecoration: "underline",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: "100%", textAlign: "left",
                        }}
                      >
                        {row.display_name}
                      </button>
                    ) : (
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: isMe ? P : "var(--fkh-text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {row.display_name}{isMe ? " (you)" : ""}
                      </span>
                    )}
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
      </>)}
      {friendProfileId && (
        <FriendProfileSheet
          athleteId={friendProfileId}
          P={P}
          BG={BG || "#0b1220"}
          bd={bd}
          onClose={() => setFriendProfileId(null)}
          onMessage={f => { setFriendProfileId(null); setMessageFriend(f); }}
        />
      )}
      {messageFriend && (
        <MessagesSheet
          P={P}
          SF={SF}
          bd={bd}
          initialFriend={messageFriend === "inbox" ? null : messageFriend}
          onClose={() => setMessageFriend(null)}
        />
      )}
    </div>
  );
}

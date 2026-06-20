import { useEffect, useState } from "react";
import { fetchFriendProfile } from "../lib/friendProfileApi.js";
import { getAchievementMeta } from "../lib/achievements.js";
import FriendAvatar from "./FriendAvatar.jsx";

function relativeSync(iso) {
  if (!iso) return "Hasn't synced this week";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Synced today";
  if (days === 1) return "Synced yesterday";
  return `Synced ${days}d ago`;
}

export default function FriendProfileSheet({
  athleteId,
  P = "#f97316",
  BG = "#0b1220",
  bd = "rgba(255,255,255,0.08)",
  onClose,
  onMessage,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!athleteId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchFriendProfile(athleteId).then(res => {
      if (!alive) return;
      if (!res.ok) {
        setError(res.error || "Could not load profile");
        setData(null);
      } else {
        setData(res);
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) return;
    const onKey = e => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [athleteId, onClose]);

  if (!athleteId) return null;

  const profile = data?.profile;
  const titleMeta = profile?.activeTitle ? getAchievementMeta(profile.activeTitle) : null;
  const playLike = data?.stats?.playLike || profile?.favoritePlayLike || "";
  const favCurrent = profile?.favoriteCurrent || "";
  const favAllTime = profile?.favoriteAllTime || "";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, backdropFilter: "blur(3px)" }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 680, maxHeight: "88vh", zIndex: 201,
        borderRadius: "20px 20px 0 0", background: BG,
        border: `1px solid ${P}22`, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px", borderBottom: `1px solid ${P}20`, flexShrink: 0,
        }}>
          <button type="button" onClick={onClose} style={{
            padding: "6px 12px", borderRadius: 8, border: `1px solid ${P}30`,
            background: `${P}14`, color: P, fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            ← Back
          </button>
          <span style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: `${P}cc` }}>
            Friend Profile
          </span>
          {onMessage ? (
            <button type="button" onClick={() => onMessage({ id: athleteId, name: profile?.displayName })} style={{
              padding: "6px 12px", borderRadius: 8, border: "none",
              background: P, color: "#000", fontSize: 12, fontWeight: 800, cursor: "pointer",
            }}>
              💬 Message
            </button>
          ) : <div style={{ width: 72 }} />}
        </div>

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "16px 18px 28px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 32, color: "#64748b", fontSize: 13 }}>Loading…</div>
          )}
          {error && !loading && (
            <div style={{ textAlign: "center", padding: 32, color: "#f87171", fontSize: 13 }}>{error}</div>
          )}
          {!loading && profile && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <FriendAvatar profile={profile} size={64} P={P} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--fkh-text)" }}>
                    {profile.displayName}
                    {profile.jerseyNumber != null && (
                      <span style={{
                        marginLeft: 8, fontSize: 12, fontWeight: 800, color: P,
                        fontFamily: "'DM Mono',monospace",
                        background: `${P}18`, padding: "2px 8px", borderRadius: 6,
                      }}>
                        #{profile.jerseyNumber}
                      </span>
                    )}
                  </div>
                  {titleMeta && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6,
                      fontSize: 11, fontWeight: 800, color: titleMeta.color || P,
                      background: `${titleMeta.color || P}1f`,
                      border: `1px solid ${titleMeta.color || P}55`,
                      padding: "2px 10px", borderRadius: 999,
                    }}>
                      <span>{titleMeta.emoji}</span><span>{titleMeta.name}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, lineHeight: 1.45 }}>
                    {data.positionEmoji} {data.positionLabel}
                  </div>
                </div>
              </div>

              {(playLike || favCurrent || favAllTime) && (
                <div style={{
                  background: `${P}0c`, border: `1px solid ${P}22`, borderRadius: 14,
                  padding: "12px 14px", marginBottom: 14,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    Basketball identity
                  </div>
                  {playLike && (
                    <div style={{ fontSize: 13, color: "var(--fkh-text)", marginBottom: 4 }}>
                      🎯 Plays like <span style={{ fontWeight: 800, color: P }}>{playLike}</span>
                    </div>
                  )}
                  {favCurrent && (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>
                      ⭐ Favorite now: {favCurrent}
                    </div>
                  )}
                  {favAllTime && favAllTime !== favCurrent && (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      🐐 All-time: {favAllTime}
                    </div>
                  )}
                </div>
              )}

              {data.pathRank && (
                <div style={{
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${bd}`,
                  borderRadius: 14, padding: "12px 14px", marginBottom: 14,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                    Path rank
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: P }}>{data.pathRank}</div>
                  {data.pathTracks?.length > 1 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {data.pathTracks.filter(t => t.id !== profile.primaryPathId).slice(0, 3).map(t => (
                        <div key={t.id} style={{ fontSize: 11, color: "#94a3b8" }}>
                          {t.emoji} {t.archetype}{t.rank ? ` · ${t.rank}` : t.reached ? ` · ${t.reached}/${t.total}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {data.stats && (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14,
                }}>
                  {[
                    ["XP this week", data.stats.xp.toLocaleString()],
                    ["Shots made", data.stats.shotsMade.toLocaleString()],
                    ["Training days", String(data.stats.trainingDays)],
                    ["Streak", data.stats.streak >= 3 ? `${data.stats.streak}d 🔥` : `${data.stats.streak}d`],
                  ].map(([label, val]) => (
                    <div key={label} style={{
                      background: "rgba(255,255,255,0.03)", border: `1px solid ${bd}`,
                      borderRadius: 12, padding: "10px 12px", textAlign: "center",
                    }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 800, color: P }}>{val}</div>
                      <div style={{ fontSize: 9, color: "#64748b", marginTop: 3, fontWeight: 700 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
              {data.stats && (
                <div style={{ fontSize: 10, color: "#475569", textAlign: "center", marginBottom: 14 }}>
                  {relativeSync(data.stats.pushedAt)}
                </div>
              )}

              <div style={{
                background: "rgba(255,255,255,0.03)", border: `1px solid ${bd}`,
                borderRadius: 14, padding: "12px 14px",
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                  Recent wins
                </div>
                {!data.achievements?.length ? (
                  <div style={{ fontSize: 12, color: "#64748b" }}>No badges or ranks synced yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.achievements.slice(0, 10).map(a => (
                      <div key={`${a.achievement_id}-${a.earned_at}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{a.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: a.color || "var(--fkh-text)" }}>{a.name}</div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>
                            {a.kind === "title" ? "Title" : a.kind === "badge" ? "Badge" : a.kind === "recognition" ? "Trophy" : "Rank"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

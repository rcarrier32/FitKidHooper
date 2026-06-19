import { useState } from "react";
import PlayerHighlightLink from "./PlayerHighlightLink.jsx";
import PathStageTraining from "./PathStageTraining.jsx";
import {
  MASTERY_TRACKS,
  trackRankInfo,
  trackStageProgress,
  recommendTrackForFavorite,
  getTrack,
  rungLabel,
  ownedTitleIds,
  ownedCosmeticIds,
  getAchievementMeta,
  COSMETIC_SLOTS,
  BENCHMARKS,
} from "../lib/achievements.js";

/** Compact Home card — surfaces the legend journey + current rank front-and-center. */
export function JourneyHomeCard({ settings, ctx, P = "#f97316", onOpen }) {
  const recId = recommendTrackForFavorite(settings);
  const track = (recId && getTrack(recId)) || MASTERY_TRACKS[0];
  if (!track) return null;
  const info = trackRankInfo(track, ctx);
  return (
    <div onClick={onOpen} role="button" style={{
      margin: "0 20px 14px", borderRadius: 16, cursor: "pointer",
      border: `1px solid ${P}33`, background: `${P}0c`, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{track.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em",
            color: P, textTransform: "uppercase", fontWeight: 800 }}>Your Journey · {track.archetype}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>
            Rank: {info.currentRank}{info.nextGoal ? ` → ${info.nextGoal}` : " 🏆"}
          </div>
        </div>
        <span style={{ fontSize: 12, color: P, fontWeight: 800 }}>›</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 9 }}>
        <div style={{ width: `${info.pct}%`, height: "100%", background: P }} />
      </div>
    </div>
  );
}

function BenchmarkRow({ b, pb, certified, onLog, P }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const n = Number(val);
    if (Number.isFinite(n)) { onLog(b.id, n); setVal(""); }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 18 }}>{b.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>{b.label}</div>
        <div style={{ fontSize: 10, color: certified ? "#22c55e" : "#64748b", fontWeight: 700 }}>
          {certified ? `✓ ${getAchievementMeta(b.title.id)?.name}` : `Best ${pb != null ? pb + b.unit : "—"} · certify at ${b.threshold}${b.unit}`}
        </div>
      </div>
      <input value={val} onChange={e => setVal(e.target.value)} inputMode="decimal" placeholder={`${b.threshold}${b.unit}`}
        style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: `1px solid ${P}33`,
          background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 13, textAlign: "center" }} />
      <button onClick={submit} style={{ padding: "6px 12px", borderRadius: 8, border: "none",
        background: P, color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Log</button>
    </div>
  );
}

const SLOT_LABELS = { frame: "Card Frame", avatar_gear: "Gear", emote: "Emote" };
const RARITY_RING = { common: "#64748b", rare: "#38bdf8", epic: "#a78bfa", legendary: "#f59e0b" };

/** Collapsible section header (Home-style), used inside Progress sub-tabs. */
function Collapsible({ title, count, P, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "transparent", border: "none", cursor: "pointer", padding: "10px 0",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {title}{count != null ? ` (${count})` : ""}
        </span>
        <span style={{ color: P, fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && children}
    </div>
  );
}

function Ladder({ track, info, P, onOpenPlayerHighlight }) {
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
      {track.stages.map((stage, i) => {
        const earned = i < info.reached;
        const isCurrent = i === info.reached - 1;
        const isNext = i === info.reached;
        const c = stage.color || P;
        return (
          <div key={stage.id} style={{
            flex: "1 0 92px", minWidth: 92, borderRadius: 12, padding: "10px 8px", textAlign: "center",
            background: earned ? `${c}1c` : "rgba(255,255,255,0.03)",
            border: `1.5px solid ${isCurrent ? c : isNext ? `${P}55` : earned ? `${c}45` : "rgba(255,255,255,0.07)"}`,
            opacity: earned || isNext ? 1 : 0.55,
          }}>
            <div style={{ fontSize: 22, filter: earned ? "none" : "grayscale(1)" }}>{stage.emoji}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: earned ? c : "var(--fkh-text)", marginTop: 3, lineHeight: 1.2 }}>
              {stage.inspo && stage.highlightVideoId ? (
                <PlayerHighlightLink
                  stage={stage}
                  P={P}
                  onOpenHighlight={onOpenPlayerHighlight}
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: earned ? c : P,
                    textDecoration: earned ? "none" : "underline",
                  }}
                />
              ) : rungLabel(stage)}
            </div>
            {stage.inspo && stage.name !== rungLabel(stage) && (
              <div style={{ fontSize: 8.5, color: "#64748b", marginTop: 1 }}>“{stage.name}”</div>
            )}
            <div style={{ fontSize: 8, fontWeight: 700, marginTop: 4, letterSpacing: "0.04em",
              color: stage.conquest ? "#f59e0b" : earned ? "#22c55e" : isNext ? P : "#475569" }}>
              {stage.conquest ? "★ CONQUEST" : earned ? "EARNED" : isNext ? "NEXT" : "LOCKED"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressionView({
  tab = "journeys",
  settings, ledgerIds, ledger, ctx, P = "#f97316",
  benchmarkPBs = {}, onLogBenchmark,
  onEquipTitle, onEquipCosmetic, onUnequipSlot,
  allExercises = {},
  onOpenExercise,
  onOpenPlayerHighlight,
}) {
  const trophies = Object.entries(ledger || {})
    .filter(([, e]) => e.kind === "recognition")
    .map(([id, e]) => ({ id, ...e.context }))
    .sort((a, b) => (b.period || "").localeCompare(a.period || ""));
  const owned = ledgerIds instanceof Set ? ledgerIds : new Set(ledgerIds || []);
  const recId = recommendTrackForFavorite(settings);
  const recTrack = recId ? getTrack(recId) : null;
  const recInfo = recTrack ? trackRankInfo(recTrack, ctx) : null;
  const playLike = (settings.favoritePlayLike || settings.favoriteCurrent
    || settings.favoriteAllTime || settings.favoritePlayer || "").trim();

  const ownedTitles = ownedTitleIds([...owned]);
  const ownedCosmetics = ownedCosmeticIds([...owned]);
  const activeTitle = settings.activeTitle || null;
  const equipped = settings.equipped || {};

  // recommended track first
  const orderedTracks = recTrack
    ? [recTrack, ...MASTERY_TRACKS.filter(t => t.id !== recTrack.id)]
    : MASTERY_TRACKS;

  const lbl = { fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px" };

  /* ── SKILLS tab — benchmarks / certifications ─────────────────────────── */
  if (tab === "skills") {
    return (
      <div style={{ padding: "4px 18px 16px" }}>
        <div style={lbl}>Get Certified — log your accuracy</div>
        <div style={{ background: "var(--fkh-surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "4px 14px 8px" }}>
          {BENCHMARKS.map(b => (
            <BenchmarkRow key={b.id} b={b} pb={benchmarkPBs[b.id] ?? null}
              certified={owned.has(b.title.id)} onLog={onLogBenchmark} P={P} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 10, lineHeight: 1.5 }}>
          Hit the mark and you earn a certification Title — which unlocks the Conquest peak on the matching path.
        </div>
      </div>
    );
  }

  /* ── LOCKER tab — equip titles / cosmetics, view trophies ─────────────── */
  if (tab === "locker") {
    return (
      <div style={{ padding: "4px 18px 16px" }}>
        <Collapsible title="Titles" count={ownedTitles.length || null} P={P}>
          {ownedTitles.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              Climb a path to earn your first Title — then wear it on your card and the leaderboard.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ownedTitles.map(id => {
                const m = getAchievementMeta(id);
                const active = activeTitle === id;
                return (
                  <button key={id} onClick={() => onEquipTitle(active ? null : id)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999,
                    cursor: "pointer", fontSize: 12, fontWeight: 800,
                    color: active ? "#0b1220" : (m?.color || P),
                    background: active ? (m?.color || P) : `${m?.color || P}1c`,
                    border: `1px solid ${m?.color || P}${active ? "" : "55"}`,
                  }}>
                    <span>{m?.emoji}</span><span>{m?.name}</span>{active && <span style={{ fontSize: 10 }}>✓ equipped</span>}
                  </button>
                );
              })}
            </div>
          )}
        </Collapsible>

        <Collapsible title="Cosmetics" count={ownedCosmetics.length || null} P={P}>
          {ownedCosmetics.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>Reach a new rank to unlock frames, gear, and emotes.</div>
          ) : (
            COSMETIC_SLOTS.map(slot => {
              const inSlot = ownedCosmetics.filter(id => getAchievementMeta(id)?.slot === slot);
              if (!inSlot.length) return null;
              return (
                <div key={slot} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 6 }}>{SLOT_LABELS[slot] || slot}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {inSlot.map(id => {
                      const m = getAchievementMeta(id);
                      const active = equipped[slot] === id;
                      return (
                        <button key={id} onClick={() => (active ? onUnequipSlot(slot) : onEquipCosmetic(id))} style={{
                          display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 10,
                          cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                          color: active ? "#0b1220" : "var(--fkh-text)",
                          background: active ? (m?.color || P) : "rgba(255,255,255,0.04)",
                          border: `1px solid ${active ? (m?.color || P) : RARITY_RING[m?.rarity] || "rgba(255,255,255,0.1)"}`,
                        }}>
                          <span>{m?.emoji}</span><span>{m?.name}</span>{active && <span style={{ fontSize: 10 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </Collapsible>

        <Collapsible title="Trophies" count={trophies.length || null} P={P}>
          {trophies.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748b" }}>Win a weekly challenge to earn a Champion trophy.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {trophies.map(t => (
                <div key={t.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 12,
                  background: "#f59e0b1c", border: "1px solid #f59e0b55", fontSize: 12, fontWeight: 800, color: "#f59e0b",
                }}>
                  <span>{t.emoji || "🏆"}</span><span>{t.label || "Champion"}</span>
                  {t.period && <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>{t.period}</span>}
                </div>
              ))}
            </div>
          )}
        </Collapsible>
      </div>
    );
  }

  /* ── PATH tab (default) — passive mastery tracks ─────────────────────────── */
  return (
    <div style={{ padding: "4px 18px 16px" }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
        Every path tracks automatically from your drills and shots — no signup required.
      </div>
      {/* Favorite-player personalization */}
      {recTrack && recInfo && (
        <div style={{
          background: `${P}12`, border: `1px solid ${P}35`, borderRadius: 16, padding: "14px 16px", marginBottom: 18,
        }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            {playLike ? (
              <>PLAY LIKE · <span style={{ color: "var(--fkh-text)" }}>{playLike}</span></>
            ) : (
              "YOUR PRIMARY PATH"
            )}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P, marginTop: 4 }}>
            {recTrack.emoji} {recTrack.archetype}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>CURRENT RANK</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fkh-text)" }}>{recInfo.currentRank}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>NEXT GOAL</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: P }}>
                {recInfo.next ? (
                  <PlayerHighlightLink
                    stage={recInfo.next}
                    P={P}
                    onOpenHighlight={onOpenPlayerHighlight}
                    style={{ fontSize: 15, fontWeight: 800, color: P }}
                  />
                ) : "Path complete! 🏆"}
              </div>
            </div>
          </div>
          {(() => {
            const sp = trackStageProgress(recTrack, ctx);
            if (sp.complete) return null;
            return (
              <>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: 12 }}>
                  <div style={{ width: `${sp.stagePct}%`, height: "100%", background: P }} />
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{sp.progressLabel}</div>
                {sp.next && (
                  <PathStageTraining
                    stage={sp.next}
                    signatureProgress={sp.signatureProgress}
                    allExercises={allExercises}
                    P={P}
                    onOpenExercise={onOpenExercise}
                    onOpenPlayerHighlight={onOpenPlayerHighlight}
                  />
                )}
              </>
            );
          })()}
        </div>
      )}

      {orderedTracks.map(track => {
        const info = trackRankInfo(track, ctx);
        const stageProg = trackStageProgress(track, ctx);
        const isRec = recTrack && track.id === recTrack.id;
        return (
          <div key={track.id} style={{
            background: "var(--fkh-surface)", border: `1px solid ${isRec ? `${P}45` : "rgba(255,255,255,0.07)"}`,
            borderRadius: 16, padding: "14px 14px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fkh-text)" }}>
                {track.emoji} {track.archetype}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: info.complete ? "#22c55e" : P }}>
                {info.reached}/{info.total}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.45 }}>{track.theme}</div>
            {!info.complete && stageProg.progressLabel && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                {stageProg.progressLabel}
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 6 }}>
                  <div style={{ width: `${stageProg.stagePct}%`, height: "100%", background: isRec ? P : "#64748b" }} />
                </div>
              </div>
            )}
            <Ladder track={track} info={info} P={P} onOpenPlayerHighlight={onOpenPlayerHighlight} />
            {info.next && (
              <PathStageTraining
                stage={info.next}
                signatureProgress={stageProg.signatureProgress}
                allExercises={allExercises}
                P={P}
                onOpenExercise={onOpenExercise}
                onOpenPlayerHighlight={onOpenPlayerHighlight}
              />
            )}
            {info.next?.unlockNote && (
              <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 3, fontWeight: 700 }}>
                🔒 {info.next.unlockNote}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

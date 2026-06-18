import { useState } from "react";
import {
  MASTERY_TRACKS,
  trackRankInfo,
  recommendTrackForFavorite,
  getTrack,
  rungLabel,
  ownedTitleIds,
  ownedCosmeticIds,
  getAchievementMeta,
  COSMETIC_SLOTS,
  BENCHMARKS,
} from "../lib/achievements.js";

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

function Ladder({ track, info, P }) {
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
              {rungLabel(stage)}
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
  settings, ledgerIds, ledger, ctx, P = "#f97316",
  benchmarkPBs = {}, onLogBenchmark,
  onEquipTitle, onEquipCosmetic, onUnequipSlot, onBack,
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

  return (
    <div style={{ padding: "0 18px 110px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 8px" }}>
        {onBack && (
          <button onClick={onBack} style={{ background: `${P}14`, border: `1px solid ${P}30`, borderRadius: 8, color: P, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "5px 10px" }}>← Back</button>
        )}
        <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: P }}>🏀 Your Journeys</h1>
      </div>

      {/* Favorite-player personalization */}
      {recTrack && recInfo && (
        <div style={{
          background: `${P}12`, border: `1px solid ${P}35`, borderRadius: 16, padding: "14px 16px", marginBottom: 18,
        }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            WANTS TO PLAY LIKE · <span style={{ color: "var(--fkh-text)" }}>{playLike}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P, marginTop: 4 }}>
            {recTrack.emoji} {recTrack.archetype} — your journey
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>CURRENT RANK</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fkh-text)" }}>{recInfo.currentRank}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700 }}>NEXT GOAL</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: P }}>{recInfo.nextGoal || "Journey complete! 🏆"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Trophies — challenge wins (recognition), rendered from the ledger context */}
      {trophies.length > 0 && (
        <>
          <div style={lbl}>Trophies ({trophies.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {trophies.map(t => (
              <div key={t.id} style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 12,
                background: "#f59e0b1c", border: "1px solid #f59e0b55",
                fontSize: 12, fontWeight: 800, color: "#f59e0b",
              }}>
                <span>{t.emoji || "🏆"}</span>
                <span>{t.label || "Champion"}</span>
                {t.period && <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>{t.period}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mastery journeys */}
      <div style={lbl}>Mastery Journeys</div>
      {orderedTracks.map(track => {
        const info = trackRankInfo(track, ctx);
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
                {info.reached}/{info.total} · {info.pct}%
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.45 }}>{track.theme}</div>
            <Ladder track={track} info={info} P={P} />
            {info.nextGoal && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                Next: <span style={{ color: P, fontWeight: 700 }}>{info.nextGoal}</span>
              </div>
            )}
            {info.next?.unlockNote && (
              <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 3, fontWeight: 700 }}>
                🔒 {info.next.unlockNote}
              </div>
            )}
          </div>
        );
      })}

      {/* Benchmarks — log a test, earn a certification title by hitting the mark */}
      {onLogBenchmark && (
        <>
          <div style={{ ...lbl, marginTop: 22 }}>Get Certified — log your accuracy</div>
          <div style={{ background: "var(--fkh-surface)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "4px 14px 8px", marginBottom: 14 }}>
            {BENCHMARKS.map(b => (
              <BenchmarkRow key={b.id} b={b} pb={benchmarkPBs[b.id] ?? null}
                certified={owned.has(b.title.id)} onLog={onLogBenchmark} P={P} />
            ))}
          </div>
        </>
      )}

      {/* Equip — Titles */}
      <div style={{ ...lbl, marginTop: 22 }}>Titles {ownedTitles.length ? `(${ownedTitles.length})` : ""}</div>
      {ownedTitles.length === 0 ? (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          Climb a journey to earn your first Title — then wear it on your card and the leaderboard.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
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

      {/* Equip — Cosmetics */}
      <div style={lbl}>Cosmetics {ownedCosmetics.length ? `(${ownedCosmetics.length})` : ""}</div>
      {ownedCosmetics.length === 0 ? (
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Reach a new rank to unlock frames, gear, and emotes.
        </div>
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
    </div>
  );
}

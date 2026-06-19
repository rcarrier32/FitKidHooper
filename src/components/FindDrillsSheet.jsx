import { useMemo, useState } from "react";

/**
 * Browse drills — search, favorites, and category grid (approved IA secondary surface).
 */
export default function FindDrillsSheet({
  open, onClose, onPickCategory, P, SF, bd, NV,
  CATS, WORKOUTS, ALL_EXERCISES, EXERCISE_META,
  favorites, isDone, openDetail,
  searchExercises,
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => (query.trim().length >= 2 ? searchExercises(query) : []),
    [query, searchExercises],
  );

  const favExercises = useMemo(() => {
    return Object.entries(favorites?.exercises || {})
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ALL_EXERCISES[id])
      .filter(Boolean)
      .slice(0, 8);
  }, [favorites, ALL_EXERCISES]);

  if (!open) return null;

  const openEx = (ex) => {
    const enriched = { ...ex, meta: ex.meta || EXERCISE_META[ex.id] || {} };
    openDetail(enriched, []);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 680, maxHeight: "88vh", overflowY: "auto",
          background: NV, borderRadius: "20px 20px 0 0", padding: "16px 0 24px",
          border: `1px solid ${bd}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 12px" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em", color: P, fontWeight: 800, textTransform: "uppercase" }}>
              Find a Drill
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Search or pick a category</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ margin: "0 20px 14px", position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: 11, fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search drills…"
            autoFocus
            style={{
              width: "100%", padding: "10px 14px 10px 36px", borderRadius: 12, border: `1px solid ${bd}`,
              background: SF, color: "var(--fkh-text)", fontSize: 14, boxSizing: "border-box", outline: "none",
            }}
          />
        </div>

        {query.trim().length >= 2 && (
          <div style={{ margin: "0 20px 16px" }}>
            {results.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: 12 }}>No drills match</div>
            ) : results.map(ex => {
              const catInfo = CATS[ex._cat] || { emoji: "🏀", label: ex._cat };
              return (
                <button key={ex.id} type="button" onClick={() => openEx(ex)} style={{
                  width: "100%", padding: "10px 12px", marginBottom: 6, borderRadius: 10, border: `1px solid ${bd}`,
                  background: SF, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span>{catInfo.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isDone(ex.id) ? "#22c55e" : "var(--fkh-text)" }}>{ex.name}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{catInfo.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {favExercises.length > 0 && query.trim().length < 2 && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>⭐ Favorites</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {favExercises.map(ex => (
                <button key={ex.id} type="button" onClick={() => openEx(ex)} style={{
                  flexShrink: 0, padding: "10px 12px", borderRadius: 12, border: `1px solid ${P}33`,
                  background: `${P}0c`, cursor: "pointer", minWidth: 130, textAlign: "left",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>{ex.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim().length < 2 && (
          <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {Object.entries(CATS).map(([key, cat]) => {
              const total = (WORKOUTS[key] || []).length;
              const done = (WORKOUTS[key] || []).filter(ex => isDone(ex.id)).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onPickCategory?.(key); onClose(); }}
                  style={{
                    padding: "12px", borderRadius: 14, border: `1px solid ${bd}`, background: SF,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 20 }}>{cat.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--fkh-text)", marginTop: 4 }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{done}/{total} · {pct}%</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mini UI mockups shown in the app tour — one per main tab. */
export default function TourStepPreview({ stepId, P = "#f97316" }) {
  const box = {
    borderRadius: 8,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  if (stepId === "today") {
    return (
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, marginBottom: 6, letterSpacing: "0.08em" }}>TODAY'S MISSION ▼</div>
        <div style={{ ...box, padding: "8px 10px", marginBottom: 6, borderColor: `${P}44`, background: `${P}12` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: P }}>Daily Mission · +75 BONUS XP</div>
          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.1)", marginTop: 6 }}>
            <div style={{ width: "45%", height: "100%", background: P, borderRadius: 99 }} />
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>MY PROGRAMS ▼</div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ ...box, flex: 1, padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>📋 Plan A</div>
          <div style={{ ...box, flex: 1, padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>💪 Plan B</div>
        </div>
      </div>
    );
  }

  if (stepId === "squad") {
    return (
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ ...box, padding: "8px 10px", marginBottom: 6, borderColor: `${P}33` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: P }}>👥 Squad challenge</div>
          <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>Compete with friends</div>
        </div>
        <div style={{ ...box, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--fkh-text)" }}>Friends & messages</div>
          <div style={{ minWidth: 16, height: 16, borderRadius: 99, background: P, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</div>
        </div>
      </div>
    );
  }

  if (stepId === "shots") {
    return (
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
          {["Stat", "C&S", "Pull", "Step"].map((l, i) => (
            <div key={l} style={{
              ...box, padding: "4px 7px", fontSize: 8, fontWeight: 800,
              color: i === 1 ? P : "#64748b",
              borderColor: i === 1 ? `${P}55` : "rgba(255,255,255,0.1)",
              background: i === 1 ? `${P}14` : "rgba(255,255,255,0.04)",
            }}>{l}</div>
          ))}
        </div>
        <div style={{ ...box, padding: 10, marginBottom: 6, textAlign: "center" }}>
          <div style={{ fontSize: 28, lineHeight: 1 }}>🏀</div>
          <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>Pick type → tap zone → log makes</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ ...box, flex: 1, padding: "6px 8px", fontSize: 9, color: "#94a3b8" }}>Week goal</div>
          <div style={{ ...box, flex: 1, padding: "6px 8px", fontSize: 9, color: P, fontWeight: 700 }}>Auto %</div>
        </div>
      </div>
    );
  }

  if (stepId === "programs") {
    return (
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ ...box, padding: "7px 10px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>🔍</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>Search programs & drills…</span>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            { e: "📋", l: "Plans" },
            { e: "🏀", l: "Drills" },
            { e: "⚡", l: "Quick" },
            { e: "🛠", l: "Build" },
          ].map(t => (
            <div key={t.l} style={{
              ...box, padding: "5px 9px", fontSize: 9, fontWeight: 800,
              color: t.l === "Plans" ? P : "#64748b",
              borderColor: t.l === "Plans" ? `${P}55` : "rgba(255,255,255,0.1)",
              background: t.l === "Plans" ? `${P}14` : "rgba(255,255,255,0.04)",
            }}>
              {t.e} {t.l}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stepId === "challenges") {
    return (
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ ...box, padding: "8px 10px", marginBottom: 6, borderColor: `${P}33` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: P }}>⭐ Train Like Legends</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>
            Rank: Rookie → <span style={{ color: P, textDecoration: "underline", fontWeight: 700 }}>Steph Curry</span>
          </div>
          <div style={{ fontSize: 8, color: "#64748b", marginTop: 3 }}>↑ tap names for highlight videos</div>
        </div>
        <div style={{ ...box, padding: "6px 10px", fontSize: 9, color: "#94a3b8" }}>🏆 Personal goals · legend paths</div>
      </div>
    );
  }

  if (stepId === "me") {
    return (
      <div style={{ padding: "4px 2px 0" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${P}22`, border: `2px solid ${P}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--fkh-text)" }}>Your athlete card</div>
            <div style={{ fontSize: 9, color: P }}>Rookie · 240 XP</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["Overview", "Skills", "Badges", "Stats"].map((t, i) => (
            <div key={t} style={{
              ...box, flex: 1, padding: "4px 2px", fontSize: 7, fontWeight: 700, textAlign: "center",
              color: i === 0 ? P : "#64748b",
              borderColor: i === 0 ? `${P}55` : "rgba(255,255,255,0.08)",
            }}>{t}</div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

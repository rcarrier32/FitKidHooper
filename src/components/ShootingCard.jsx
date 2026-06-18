import { shootingSnapshot, ZONES } from "../lib/shootingStats.js";

function readShotLog() {
  try { return JSON.parse(localStorage.getItem("shot_log_v2") || "{}"); } catch { return {}; }
}

/** Shooting accuracy — make %, not just raw makes — overall, this week, by zone. */
export default function ShootingCard({ P = "#f97316", SF, bd }) {
  const { allTime, week } = shootingSnapshot(readShotLog());

  if (!allTime.attempts) {
    return (
      <div style={{ background: SF, border: `1px solid ${bd}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)", marginBottom: 4 }}>🎯 Shooting Accuracy</div>
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
          Log your makes <b>and</b> misses on the Shots tab to track your shooting %. Accuracy beats volume.
        </div>
      </div>
    );
  }

  const big = (label, s) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 800, color: P, lineHeight: 1 }}>
        {s.pct != null ? `${s.pct}%` : "—"}
      </div>
      <div style={{ fontSize: 9, color: "#475569", marginTop: 3, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 9, color: "#475569", marginTop: 1 }}>{s.makes}/{s.attempts}</div>
    </div>
  );

  return (
    <div style={{ background: SF, border: `1px solid ${bd}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)", marginBottom: 10 }}>🎯 Shooting Accuracy</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {big("OVERALL FG%", allTime)}
        {big("THIS WEEK", week)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ZONES.map(z => {
          const s = allTime.zones[z.id];
          const has = s.a > 0;
          const ftElite = z.id === "ft" && s.pct != null && s.pct >= 70;
          return (
            <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, width: 18 }}>{z.emoji}</span>
              <span style={{ fontSize: 11, color: "var(--fkh-text-muted)", width: 78 }}>{z.label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{ width: `${has ? s.pct : 0}%`, height: "100%", background: ftElite ? "#22c55e" : P }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: has ? (ftElite ? "#22c55e" : P) : "#475569", fontFamily: "'DM Mono',monospace", width: 60, textAlign: "right" }}>
                {has ? `${s.pct}% · ${s.m}/${s.a}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

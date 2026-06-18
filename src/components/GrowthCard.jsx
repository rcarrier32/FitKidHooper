import { useState } from "react";
import { computeGrowth, formatHeight, GROWTH_UI } from "../lib/growth.js";

/**
 * Growth & body card — log height monthly, see growth velocity, and get
 * load-awareness guidance around the growth spurt (highest injury-risk window).
 */
export default function GrowthCard({ log, onLog, P = "#f97316", SF, bd }) {
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const g = computeGrowth(log);
  const ui = GROWTH_UI[g.status] || GROWTH_UI.none;

  const submit = () => {
    const total = (Number(ft) || 0) * 12 + (Number(inch) || 0);
    if (total > 0) { onLog(total); setFt(""); setInch(""); }
  };

  return (
    <div style={{ background: SF, border: `1px solid ${bd}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>📏</span>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>Growth Tracker</div>
        {g.latest && (
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: P, fontFamily: "'DM Mono',monospace" }}>
            {formatHeight(g.latest.h)}
          </span>
        )}
      </div>

      {/* Velocity + load-awareness */}
      <div style={{ background: `${ui.color}14`, border: `1px solid ${ui.color}40`, borderRadius: 10, padding: "10px 12px", margin: "8px 0 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: ui.color }}>
          {ui.emoji} {ui.title}
          {g.velocity != null && <span style={{ fontWeight: 600, color: "var(--fkh-text-muted)" }}> · {g.velocity.toFixed(1)}"/yr</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--fkh-text-muted)", marginTop: 4, lineHeight: 1.5 }}>{ui.msg}</div>
      </div>

      {/* Log height */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>Log height</div>
        <input value={ft} onChange={e => setFt(e.target.value)} inputMode="numeric" placeholder="ft"
          style={{ width: 44, padding: "6px 8px", borderRadius: 8, border: `1px solid ${P}33`, background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 13, textAlign: "center" }} />
        <input value={inch} onChange={e => setInch(e.target.value)} inputMode="decimal" placeholder="in"
          style={{ width: 48, padding: "6px 8px", borderRadius: 8, border: `1px solid ${P}33`, background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 13, textAlign: "center" }} />
        <button onClick={submit} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "none", background: P, color: "#000", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Log</button>
      </div>
      {g.count > 0 && (
        <div style={{ fontSize: 9, color: "#475569", marginTop: 8 }}>{g.count} measurement{g.count === 1 ? "" : "s"} · log monthly for the best read</div>
      )}
    </div>
  );
}

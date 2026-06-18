import { useState } from "react";
import { WARMUP_ROUTINE, restGuidance } from "../lib/warmup.js";

/**
 * Home warm-up nudge — a quick dynamic routine before training, emphasized on
 * high-impact (jump/sprint/cut) days, plus a rest-is-good reminder.
 */
export default function WarmUpCard({ emphasize = false, growthStatus, P = "#f97316" }) {
  const [open, setOpen] = useState(false);
  const rest = restGuidance({ growthStatus });
  const accent = emphasize ? "#f59e0b" : P;

  return (
    <div style={{ margin: "0 20px 14px", borderRadius: 16, overflow: "hidden",
      border: `1px solid ${accent}33`, background: `${accent}0c` }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 18 }}>🤸</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em",
            color: accent, textTransform: "uppercase", fontWeight: 800 }}>
            Warm Up First{emphasize ? " · High-impact day" : ""}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>
            {emphasize ? "Jumping & sprinting today — warm up to stay safe" : "2-minute dynamic warm-up"}
          </div>
        </div>
        <span style={{ color: accent, fontSize: 12 }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {WARMUP_ROUTINE.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: accent, fontWeight: 800, width: 34, flexShrink: 0 }}>{m.secs}s</span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fkh-text)" }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: "var(--fkh-text-muted)" }}> — {m.cue}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 10,
            background: rest.tone === "spurt" ? "#f43f5e14" : "rgba(255,255,255,0.04)",
            border: `1px solid ${rest.tone === "spurt" ? "#f43f5e40" : "rgba(255,255,255,0.08)"}` }}>
            <span style={{ fontSize: 11, color: rest.tone === "spurt" ? "#f43f5e" : "var(--fkh-text-muted)", fontWeight: 700, lineHeight: 1.5 }}>
              {rest.tone === "spurt" ? "🚀 " : "😴 "}{rest.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { getWhatsNew } from "../lib/changelog.js";

export default function WhatsNewSheet({ P = "#f97316", SF = "#1e293b", onClose, onDismiss }) {
  const { headline, items } = getWhatsNew();

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDismiss = () => {
    onDismiss?.();
    onClose();
  };

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 515,
        display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: SF, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 680,
          maxHeight: "80vh", display: "flex", flexDirection: "column",
          border: `1px solid ${P}33`,
        }}
      >
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{
                fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.14em",
                color: P, textTransform: "uppercase", fontWeight: 800, marginBottom: 4,
              }}>
                What&apos;s new
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fkh-text)" }}>{headline}</div>
            </div>
            <button type="button" onClick={handleDismiss} aria-label="Close"
              style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer", padding: 4 }}>
              ✕
            </button>
          </div>
        </div>

        <ul style={{
          listStyle: "none", margin: 0, padding: "12px 20px 8px", overflowY: "auto", flex: 1,
        }}
        >
          {items.map((item, i) => (
            <li key={i} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "12px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }}>{item.emoji}</span>
              <span style={{ fontSize: 13, color: "var(--fkh-text)", lineHeight: 1.5, fontWeight: 500 }}>{item.text}</span>
            </li>
          ))}
        </ul>

        <div style={{ padding: "12px 20px calc(20px + env(safe-area-inset-bottom, 0px))" }}>
          <button type="button" onClick={handleDismiss}
            style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: P, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer",
            }}
          >
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  );
}

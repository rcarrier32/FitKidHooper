import { useEffect } from "react";
import PlayerPicker from "./PlayerPicker.jsx";

/** Lightweight sheet for picking "play like" without opening full Settings. */
export default function PlayLikePickerSheet({ open, onClose, value, onChange, accent = "#f97316" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (name) => {
    onChange(name);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 510,
        display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d1627", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 680,
          padding: "18px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
          border: `1px solid ${accent}33`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--fkh-text)" }}>Who do you play like?</span>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer", padding: 4 }}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>
          Pick a player — we&apos;ll tailor your Train Like Legends journey.
        </p>
        <PlayerPicker
          value={value || ""}
          onChange={onChange}
          onPick={pick}
          pool="both"
          placeholder="Search NBA players…"
          accent={accent}
        />
      </div>
    </div>
  );
}

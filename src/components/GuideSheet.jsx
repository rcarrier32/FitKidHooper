import { useState, useEffect } from "react";
import { getWhatsNew } from "../lib/changelog.js";
import { GUIDE_SECTIONS, GUIDE_TIPS } from "../lib/guideContent.js";
import { TOUR_STEPS } from "../lib/onboardingTour.js";

const MODES = [
  { id: "tour", label: "Tour", emoji: "🎓" },
  { id: "explore", label: "Explore", emoji: "🗺" },
  { id: "howto", label: "How-to", emoji: "📖" },
];

/**
 * Unified Guide — tour, explore map, and how-to in one place.
 * Replaces the separate Help and App Map sheets.
 */
export default function GuideSheet({
  P = "#f97316",
  SF,
  onClose,
  onNavigate,
  onStartTour,
  onOpenFeedback,
  onOpenWhatsNew,
  initialMode = "explore",
}) {
  const [mode, setMode] = useState(initialMode);
  const [openSection, setOpenSection] = useState("today");

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const whatsNew = getWhatsNew();
  const kicker = { fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: "0.18em", color: "#334155", marginBottom: 10, textTransform: "uppercase" };
  const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" };

  const go = dest => {
    if (dest) {
      onClose();
      onNavigate?.(dest);
    }
  };

  const startTour = () => {
    onClose();
    onStartTour?.();
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: SF, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", paddingBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, marginBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 0, background: SF, zIndex: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fkh-text)" }}>🏀 Guide</span>
          <button onClick={onClose} aria-label="Close guide"
            style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer", padding: "6px 10px", borderRadius: 8, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "14px 20px 0" }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--fkh-text-muted)", margin: "0 0 12px" }}>
            New here? Take the tour. Need a feature? Explore the map. Stuck on something? Read the how-to.
          </p>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {MODES.map(m => (
              <button key={m.id} type="button" onClick={() => setMode(m.id)}
                style={{
                  flex: 1, padding: "9px 6px", borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: "pointer",
                  border: `1px solid ${mode === m.id ? P : "rgba(255,255,255,0.1)"}`,
                  background: mode === m.id ? `${P}18` : "transparent",
                  color: mode === m.id ? P : "#64748b",
                }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {onOpenWhatsNew && (
              <button type="button" onClick={() => { onClose(); onOpenWhatsNew(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: `1px solid ${P}33`, background: `${P}0c`, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: P }}>What&apos;s new</div>
                  <div style={{ fontSize: 11, color: "var(--fkh-text-muted)" }}>{whatsNew.headline}</div>
                </div>
                <span style={{ color: P, fontSize: 13 }}>→</span>
              </button>
            )}
            {onOpenFeedback && (
              <button type="button" onClick={() => { onClose(); onOpenFeedback(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>Send feedback</div>
                  <div style={{ fontSize: 11, color: "var(--fkh-text-muted)" }}>Report a bug or share an idea</div>
                </div>
                <span style={{ color: "#64748b", fontSize: 13 }}>→</span>
              </button>
            )}
          </div>
        </div>

        {mode === "tour" && (
          <div style={{ padding: "0 20px 8px" }}>
            <button type="button" onClick={startTour}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "none", background: P, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 14 }}>
              Start guided tour →
            </button>
            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: "0 0 14px" }}>
              Walks through every bottom tab step by step — takes about a minute.
            </p>
            <div style={kicker}>You&apos;ll visit</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TOUR_STEPS.map((step, i) => (
                <div key={step.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", ...card }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", fontFamily: "'DM Mono',monospace", width: 18, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 20, lineHeight: 1.1, flexShrink: 0 }}>{step.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: P, marginBottom: 3 }}>{step.title}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fkh-text-muted)" }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "explore" && (
          <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 4px 4px", lineHeight: 1.45 }}>
              Tap a section to see what&apos;s inside — then jump straight there.
            </p>
            {GUIDE_SECTIONS.map(sec => {
              const isOpen = openSection === sec.key;
              return (
                <div key={sec.key} style={{ borderRadius: 14, border: `1px solid ${isOpen ? `${P}40` : "rgba(255,255,255,0.07)"}`, background: isOpen ? `${P}0a` : "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                  <button type="button" onClick={() => setOpenSection(isOpen ? null : sec.key)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{sec.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fkh-text)" }}>{sec.title}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{sec.blurb}</div>
                    </div>
                    <span style={{ color: P, fontSize: 13, flexShrink: 0 }}>{isOpen ? "▾" : "▸"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 12px 46px", display: "flex", flexDirection: "column", gap: 2 }}>
                      {sec.items.map((it, i) => (
                        it.to ? (
                          <button key={i} type="button" onClick={() => go(it.to)}
                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "7px 0", color: P, fontSize: 12.5, fontWeight: 600 }}>
                            <span style={{ flex: 1, minWidth: 0 }}>{it.label}</span>
                            <span style={{ fontSize: 12, flexShrink: 0 }}>→</span>
                          </button>
                        ) : (
                          <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", fontSize: 12.5, color: "var(--fkh-text-muted)", lineHeight: 1.4 }}>
                            <span style={{ color: "#475569" }}>•</span><span>{it.label}</span>
                          </div>
                        )
                      ))}
                      <button type="button" onClick={() => go(sec.navigateTo)}
                        style={{ marginTop: 8, alignSelf: "flex-start", padding: "8px 14px", borderRadius: 10, border: "none", background: P, color: "#000", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>
                        Open {sec.title} →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mode === "howto" && (
          <div style={{ padding: "0 20px 8px" }}>
            <div style={kicker}>What you can do</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {GUIDE_SECTIONS.map(sec => (
                <div key={sec.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", ...card }}>
                  <span style={{ fontSize: 20, lineHeight: 1.1, flexShrink: 0 }}>{sec.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: P, marginBottom: 3 }}>{sec.title}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fkh-text-muted)" }}>{sec.howTo}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={kicker}>Good to know</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {GUIDE_TIPS.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, lineHeight: 1.2, flexShrink: 0 }}>{t.e}</span>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fkh-text-muted)" }}>{t.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "20px 20px 0", textAlign: "center" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: P }}>Now go get buckets! 🏀</div>
        </div>
      </div>
    </div>
  );
}

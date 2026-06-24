import { useEffect, useMemo, useRef, useState } from "react";
import {
  NBA_PLAY_LIKE_ACTIVE,
  NBA_PLAY_LIKE_LEGENDS,
  PLAY_LIKE_QUICK_PICKS,
  filterPlayers,
} from "../lib/nbaPlayers.js";

function PlayerListSheet({ open, onClose, pool, query, onQueryChange, results, value, onPick, accent }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 520,
        display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d1627", borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 680,
          maxHeight: "85vh", display: "flex", flexDirection: "column", border: `1px solid ${accent}33`,
        }}
      >
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--fkh-text)" }}>Search players</span>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer", padding: 4 }}>
              ✕
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.06)", border: `1.5px solid ${accent}44`, borderRadius: 12, padding: "0 12px" }}>
            <span style={{ fontSize: 16, opacity: 0.7 }} aria-hidden>🔍</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Type a name…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "12px 0", fontSize: 15, color: "#fff",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
            {results.length} player{results.length === 1 ? "" : "s"}
          </div>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: "6px 8px 20px", overflowY: "auto", flex: 1 }}>
          {results.map(name => {
            const selected = value === name;
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => onPick(name)}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: "none", marginBottom: 4, fontSize: 14, fontWeight: selected ? 800 : 600,
                    background: selected ? `${accent}18` : "transparent",
                    color: selected ? accent : "var(--fkh-text)",
                  }}
                >
                  {name}
                  {selected && <span style={{ float: "right", fontSize: 12 }}>✓</span>}
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li style={{ padding: "24px 14px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
              No players match — try a shorter name or different spelling.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Searchable player field with live typeahead + magnifying-glass list browser.
 * pool: "active" | "legends" | "both"
 */
export default function PlayerPicker({
  value,
  onChange,
  onPick,
  pool = "both",
  placeholder = "Search players…",
  quickPicks = PLAY_LIKE_QUICK_PICKS,
  accent = "#f97316",
  maxInlineResults = 8,
}) {
  const [draft, setDraft] = useState(value || "");
  const [focused, setFocused] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listQuery, setListQuery] = useState("");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const chip = (active) => ({
    padding: "6px 11px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? `${accent}20` : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${active ? accent : "rgba(255,255,255,0.1)"}`,
    color: active ? accent : "#64748b",
  });

  const quick = quickPicks.filter(n => {
    if (pool === "active") return NBA_PLAY_LIKE_ACTIVE.includes(n);
    if (pool === "legends") return NBA_PLAY_LIKE_LEGENDS.includes(n);
    return true;
  });

  const inlineResults = useMemo(() => {
    const q = draft.trim();
    if (!q) return [];
    return filterPlayers(pool, q).slice(0, maxInlineResults);
  }, [draft, pool, maxInlineResults]);

  const listResults = useMemo(() => filterPlayers(pool, listQuery), [pool, listQuery]);

  const pick = (name) => {
    onChange(name);
    onPick?.(name);
    setDraft(name);
    setFocused(false);
    setListOpen(false);
    setListQuery("");
  };

  const openList = () => {
    setListQuery(draft.trim());
    setListOpen(true);
  };

  const showDropdown = focused && draft.trim().length > 0;

  return (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.07)", border: `1.5px solid ${focused ? accent : `${accent}40`}`,
            borderRadius: 10, padding: "0 12px",
          }}>
            <span style={{ fontSize: 14, opacity: 0.65, flexShrink: 0 }} aria-hidden>🔍</span>
            <input
              type="text"
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                onChange(e.target.value);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 160)}
              placeholder={placeholder}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "10px 0", fontSize: 14, color: "#fff", minWidth: 0,
              }}
            />
          </div>
          <button
            type="button"
            onClick={openList}
            aria-label="Browse player list"
            title="Browse full list"
            style={{
              flexShrink: 0, width: 44, borderRadius: 10, cursor: "pointer",
              background: `${accent}14`, border: `1.5px solid ${accent}55`,
              color: accent, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            🔍
          </button>
        </div>

        {showDropdown && (
          <ul style={{
            position: "absolute", left: 0, right: 48, top: "calc(100% + 4px)", zIndex: 30,
            listStyle: "none", margin: 0, padding: 6, borderRadius: 12,
            background: "#0d1627", border: `1px solid ${accent}44`,
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)", maxHeight: 220, overflowY: "auto",
          }}
          >
            {inlineResults.map(name => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(name)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8,
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: value === name ? 800 : 600,
                    background: value === name ? `${accent}18` : "transparent",
                    color: value === name ? accent : "var(--fkh-text)",
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
            {inlineResults.length === 0 && (
              <li style={{ padding: "10px 12px", fontSize: 12, color: "#64748b" }}>
                No quick matches — tap 🔍 to browse all players
              </li>
            )}
            {inlineResults.length >= maxInlineResults && (
              <li>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={openList}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 12px", border: "none",
                    background: "transparent", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  See all results in list →
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {!draft.trim() && quick.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {quick.map(name => (
            <button key={name} type="button" onClick={() => pick(name)} style={chip(value === name)}>
              {name}
            </button>
          ))}
        </div>
      )}

      <PlayerListSheet
        open={listOpen}
        onClose={() => setListOpen(false)}
        pool={pool}
        query={listQuery}
        onQueryChange={setListQuery}
        results={listResults}
        value={value}
        onPick={pick}
        accent={accent}
      />
    </div>
  );
}

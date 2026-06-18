import { useCallback, useEffect, useState } from "react";
import {
  fetchFriendsFeed, fetchFeedReactions, toggleReaction, reactionKey, relativeTime, REACTIONS,
} from "../lib/feedApi.js";
import { getAchievementMeta } from "../lib/achievements.js";

/** Verb + label for a ledger event, from the catalog or the row's own context. */
function describe(item) {
  const meta = getAchievementMeta(item.achievement_id);
  if (item.kind === "recognition") {
    return { emoji: item.context?.emoji || "🏆", verb: "won", label: item.context?.label || "Champion" };
  }
  if (item.kind === "title") {
    return { emoji: meta?.emoji || "🎖️", verb: "earned the title", label: meta?.name || "a title" };
  }
  return { emoji: meta?.emoji || "⭐", verb: "reached", label: meta?.name || "a new rank" };
}

export default function FeedView({ P = "#f97316", SF, bd }) {
  const [rows, setRows] = useState(null); // null = loading
  const [reactions, setReactions] = useState({}); // key -> { counts, mine:Set }

  const loadReactions = useCallback(() => {
    fetchFeedReactions().then(({ map }) => setReactions(map || {})).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    fetchFriendsFeed().then(r => { if (alive) setRows(r); }).catch(() => { if (alive) setRows([]); });
    loadReactions();
    return () => { alive = false; };
  }, [loadReactions]);

  // Optimistic toggle: update local counts immediately, then persist.
  const react = useCallback((item, rid) => {
    const key = reactionKey(item.athlete_id, item.achievement_id);
    let hadIt = false;
    setReactions(prev => {
      const cur = prev[key] || { counts: {}, mine: new Set() };
      const mine = new Set(cur.mine);
      const counts = { ...cur.counts };
      hadIt = mine.has(rid);
      if (hadIt) { mine.delete(rid); counts[rid] = Math.max(0, (counts[rid] || 1) - 1); }
      else { mine.add(rid); counts[rid] = (counts[rid] || 0) + 1; }
      return { ...prev, [key]: { counts, mine } };
    });
    toggleReaction(item.athlete_id, item.achievement_id, rid, hadIt).catch(() => loadReactions());
  }, [loadReactions]);

  if (rows === null) {
    return <div style={{ textAlign: "center", padding: 28, color: "#64748b", fontSize: 13 }}>Loading feed…</div>;
  }
  if (!rows.length) {
    return (
      <div style={{ textAlign: "center", padding: 28, color: "#64748b", fontSize: 13, background: SF, borderRadius: 14, border: `1px solid ${bd}` }}>
        No activity yet. Add friends and start earning — wins from you and your friends show up here.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((item, i) => {
        const d = describe(item);
        const key = reactionKey(item.athlete_id, item.achievement_id);
        const r = reactions[key] || { counts: {}, mine: new Set() };
        return (
          <div key={`${key}-${i}`} style={{
            padding: "11px 14px", borderRadius: 12,
            background: item.isMe ? `${P}12` : SF, border: `1px solid ${item.isMe ? `${P}33` : bd}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{d.emoji}</span>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--fkh-text)", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 800, color: item.isMe ? P : "var(--fkh-text)" }}>
                  {item.isMe ? "You" : item.name}
                </span>{" "}
                <span style={{ color: "var(--fkh-text-muted)" }}>{d.verb}</span>{" "}
                <span style={{ fontWeight: 700 }}>{d.label}</span>
              </div>
              <span style={{ fontSize: 10, color: "#475569", flexShrink: 0 }}>{relativeTime(item.earned_at)}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {REACTIONS.map(({ id, emoji }) => {
                const count = r.counts[id] || 0;
                const mine = r.mine.has(id);
                return (
                  <button key={id} onClick={() => react(item, id)} style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999,
                    cursor: "pointer", fontSize: 12, fontWeight: 700,
                    border: `1px solid ${mine ? P : bd}`,
                    background: mine ? `${P}1c` : "transparent",
                    color: mine ? P : "#64748b",
                  }}>
                    <span>{emoji}</span>{count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

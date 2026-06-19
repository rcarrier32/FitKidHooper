import { useCallback, useEffect, useState } from "react";
import {
  fetchFriendsFeed, fetchFeedReactions, toggleReaction, reactionKey, relativeTime, REACTIONS,
  fetchFeedComments, postFeedComment,
} from "../lib/feedApi.js";
import { getAchievementMeta } from "../lib/achievements.js";

/** Render comment text with @mentions highlighted. */
function renderBody(text, P) {
  return String(text || "").split(/(@[a-z0-9_]{3,20})/gi).map((part, i) =>
    part.startsWith("@")
      ? <span key={i} style={{ color: P, fontWeight: 700 }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

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
  const [comments, setComments] = useState({}); // key -> [comment]
  const [openKey, setOpenKey] = useState(null);  // which item's comments are expanded
  const [draft, setDraft] = useState("");

  const loadReactions = useCallback(() => {
    fetchFeedReactions().then(({ map }) => setReactions(map || {})).catch(() => {});
  }, []);

  const loadComments = useCallback(() => {
    fetchFeedComments().then(({ map }) => setComments(map || {})).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    fetchFriendsFeed().then(r => { if (alive) setRows(r); }).catch(() => { if (alive) setRows([]); });
    loadReactions();
    loadComments();
    return () => { alive = false; };
  }, [loadReactions, loadComments]);

  const submitComment = useCallback(async (item) => {
    const text = draft.trim();
    if (!text) return;
    const key = reactionKey(item.athlete_id, item.achievement_id);
    setDraft("");
    const res = await postFeedComment(item.athlete_id, item.achievement_id, text);
    if (res.ok) {
      setComments(prev => ({ ...prev, [key]: [...(prev[key] || []), res.comment] }));
    }
  }, [draft]);

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
            {(() => {
              const cmts = comments[key] || [];
              const isOpen = openKey === key;
              return (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => { setOpenKey(isOpen ? null : key); setDraft(""); }} style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: isOpen ? P : "#64748b", fontSize: 11, fontWeight: 700, padding: 0,
                  }}>
                    💬 {cmts.length > 0 ? `${cmts.length} comment${cmts.length > 1 ? "s" : ""}` : "Comment"}
                  </button>
                  {isOpen && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {cmts.map(c => (
                        <div key={c.id} style={{ fontSize: 12, lineHeight: 1.45 }}>
                          <span style={{ fontWeight: 700, color: c.isMe ? P : "var(--fkh-text)" }}>
                            {c.isMe ? "You" : c.authorName}
                          </span>{" "}
                          <span style={{ color: "var(--fkh-text-muted)" }}>{renderBody(c.body, P)}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <input
                          value={draft}
                          onChange={e => setDraft(e.target.value.slice(0, 280))}
                          onKeyDown={e => { if (e.key === "Enter") submitComment(item); }}
                          placeholder="Add a comment… use @username"
                          maxLength={280}
                          style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${bd}`,
                            background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 12 }}
                        />
                        <button onClick={() => submitComment(item)} disabled={!draft.trim()} style={{
                          padding: "7px 12px", borderRadius: 8, border: "none",
                          background: draft.trim() ? P : `${P}55`, color: "#000",
                          fontSize: 11, fontWeight: 800, cursor: draft.trim() ? "pointer" : "not-allowed",
                        }}>Post</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

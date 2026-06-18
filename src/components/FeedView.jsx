import { useEffect, useState } from "react";
import { fetchFriendsFeed, relativeTime } from "../lib/feedApi.js";
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

  useEffect(() => {
    let alive = true;
    fetchFriendsFeed().then(r => { if (alive) setRows(r); }).catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

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
        return (
          <div key={`${item.athlete_id}-${item.achievement_id}-${i}`} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12,
            background: item.isMe ? `${P}12` : SF, border: `1px solid ${item.isMe ? `${P}33` : bd}`,
          }}>
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
        );
      })}
    </div>
  );
}

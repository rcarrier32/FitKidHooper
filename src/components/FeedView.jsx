import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchFriendsFeed, fetchFeedReactions, toggleReaction, reactionKey, relativeTime, REACTIONS,
  fetchFeedComments, postFeedComment,
} from "../lib/feedApi.js";
import { getAchievementMeta } from "../lib/achievements.js";
import FriendAvatar from "./FriendAvatar.jsx";

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

function summarizeReactions(counts) {
  const active = REACTIONS
    .map(r => ({ ...r, count: counts[r.id] || 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const total = active.reduce((s, r) => s + r.count, 0);
  return { active, total, top: active.slice(0, 3) };
}

function FriendName({ item, P, onViewFriend }) {
  const name = item.isMe ? "You" : item.name;
  if (item.isMe || !onViewFriend) {
    return (
      <span style={{ fontWeight: 800, color: item.isMe ? P : "var(--fkh-text)" }}>{name}</span>
    );
  }
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onViewFriend(item.athlete_id); }}
      style={{
        background: "none", border: "none", padding: 0, margin: 0,
        font: "inherit", fontWeight: 800, color: "var(--fkh-text)",
        cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2,
      }}
    >
      {name}
    </button>
  );
}

const actionBtn = {
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  padding: "6px 4px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
};

/** Facebook/IG-style summary + single action bar + one expandable engage panel. */
function FeedEngagement({
  item, keyId, reactions, comments, openKey, setOpenKey, draft, setDraft,
  react, submitComment, P, bd, onViewFriend,
}) {
  const inputRef = useRef(null);
  const r = reactions[keyId] || { counts: {}, mine: new Set() };
  const cmts = comments[keyId] || [];
  const isOpen = openKey === keyId;
  const { total, top } = summarizeReactions(r.counts);
  const mineList = REACTIONS.filter(x => r.mine.has(x.id));
  const reactLabel = mineList.length ? mineList.map(x => x.emoji).join("") : "React";

  const open = (focusComment = false) => {
    setOpenKey(keyId);
    if (focusComment) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <div style={{ marginTop: 6 }}>
      {(total > 0 || cmts.length > 0) && (
        <button
          type="button"
          onClick={() => setOpenKey(isOpen ? null : keyId)}
          style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%",
            padding: "2px 0 4px", margin: 0, border: "none", background: "transparent",
            cursor: "pointer", textAlign: "left",
          }}
        >
          {total > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "1px 6px 1px 4px", borderRadius: 999,
                background: "rgba(255,255,255,0.07)", border: `1px solid ${bd}`,
              }}>
                {top.map((rx, i) => (
                  <span key={rx.id} style={{ fontSize: 11, marginLeft: i ? -3 : 0 }}>{rx.emoji}</span>
                ))}
              </span>
              <span style={{ fontSize: 11, color: "var(--fkh-text-muted)", fontWeight: 600 }}>{total}</span>
            </span>
          )}
          {total > 0 && cmts.length > 0 && (
            <span style={{ fontSize: 10, color: "#475569" }}>·</span>
          )}
          {cmts.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--fkh-text-muted)", fontWeight: 600 }}>
              {cmts.length} {cmts.length === 1 ? "comment" : "comments"}
            </span>
          )}
        </button>
      )}

      <div style={{
        display: "flex", borderTop: `1px solid ${bd}`, marginTop: total > 0 || cmts.length > 0 ? 2 : 0,
      }}>
        <button type="button" onClick={() => (isOpen ? setOpenKey(null) : open(false))} style={{
          ...actionBtn,
          color: isOpen || mineList.length ? P : "#64748b",
        }}>
          <span style={{ fontSize: 13 }}>{reactLabel === "React" ? "👏" : reactLabel}</span>
          <span>React{total > 0 ? ` · ${total}` : ""}</span>
        </button>
        <button type="button" onClick={() => (isOpen ? setOpenKey(null) : open(true))} style={{
          ...actionBtn,
          color: isOpen ? P : "#64748b",
        }}>
          <span style={{ fontSize: 13 }}>💬</span>
          <span>Comment{cmts.length > 0 ? ` · ${cmts.length}` : ""}</span>
        </button>
      </div>

      {isOpen && (
        <div style={{
          marginTop: 8, padding: "10px 10px 8px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)", border: `1px solid ${bd}`,
        }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: cmts.length || draft ? 10 : 0 }}>
            {REACTIONS.map(({ id, emoji }) => {
              const count = r.counts[id] || 0;
              const mine = r.mine.has(id);
              return (
                <button key={id} type="button" onClick={() => react(item, id)} title={emoji} style={{
                  position: "relative",
                  width: 36, height: 36, borderRadius: 999, cursor: "pointer",
                  border: `1px solid ${mine ? P : bd}`,
                  background: mine ? `${P}22` : "transparent",
                  fontSize: 18, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {emoji}
                  {count > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      minWidth: 14, height: 14, padding: "0 3px", borderRadius: 999,
                      background: P, color: "#000", fontSize: 9, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {cmts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {cmts.map(c => (
                <div key={c.id} style={{ fontSize: 12, lineHeight: 1.45 }}>
                  {c.isMe ? (
                    <span style={{ fontWeight: 700, color: P }}>You</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onViewFriend?.(c.author_id)}
                      style={{
                        background: "none", border: "none", padding: 0, margin: 0,
                        font: "inherit", fontWeight: 700, color: "var(--fkh-text)",
                        cursor: "pointer",
                      }}
                    >
                      {c.authorName}
                    </button>
                  )}
                  <span style={{ color: "var(--fkh-text-muted)" }}> {renderBody(c.body, P)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, 280))}
              onKeyDown={e => { if (e.key === "Enter") submitComment(item); }}
              placeholder="Write a comment… @username"
              maxLength={280}
              style={{
                flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${bd}`,
                background: "rgba(255,255,255,0.05)", color: "var(--fkh-text)", fontSize: 12,
              }}
            />
            <button type="button" onClick={() => submitComment(item)} disabled={!draft.trim()} style={{
              padding: "7px 12px", borderRadius: 8, border: "none",
              background: draft.trim() ? P : `${P}55`, color: "#000",
              fontSize: 11, fontWeight: 800, cursor: draft.trim() ? "pointer" : "not-allowed",
            }}>
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedView({ P = "#f97316", SF, bd, onViewFriend }) {
  const [rows, setRows] = useState(null); // null = loading
  const [reactions, setReactions] = useState({}); // key -> { counts, mine:Set }
  const [comments, setComments] = useState({}); // key -> [comment]
  const [openKey, setOpenKey] = useState(null);
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
      loadComments();
    }
  }, [draft, loadComments]);

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
        const viewProfile = !item.isMe && onViewFriend ? () => onViewFriend(item.athlete_id) : null;
        return (
          <div key={`${key}-${i}`} style={{
            padding: "10px 12px", borderRadius: 12,
            background: item.isMe ? `${P}12` : SF, border: `1px solid ${item.isMe ? `${P}33` : bd}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <FriendAvatar
                profile={item.profile}
                displayName={item.name}
                size={36}
                P={P}
                onPress={viewProfile}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1.35 }}>{d.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--fkh-text)", lineHeight: 1.4 }}>
                    <FriendName item={item} P={P} onViewFriend={onViewFriend} />{" "}
                    <span style={{ color: "var(--fkh-text-muted)" }}>{d.verb}</span>{" "}
                    <span style={{ fontWeight: 700 }}>{d.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#475569", flexShrink: 0, paddingTop: 2 }}>
                    {relativeTime(item.earned_at)}
                  </span>
                </div>
                <FeedEngagement
                  item={item}
                  keyId={key}
                  reactions={reactions}
                  comments={comments}
                  openKey={openKey}
                  setOpenKey={(k) => { setOpenKey(k); if (!k) setDraft(""); }}
                  draft={draft}
                  setDraft={setDraft}
                  react={react}
                  submitComment={submitComment}
                  P={P}
                  bd={bd}
                  onViewFriend={onViewFriend}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Always-visible entry to Friends — add teammates, see feed, react & comment. */
export default function FriendsTeaser({ P = "#f97316", onOpenFriends }) {
  return (
    <button
      type="button"
      onClick={onOpenFriends}
      style={{
        display: "block",
        width: "calc(100% - 40px)",
        margin: "0 20px 14px",
        textAlign: "left",
        borderRadius: 14,
        border: `1px solid ${P}33`,
        background: `${P}0c`,
        padding: "12px 14px",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>👋</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)" }}>Friends</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.45 }}>
            Add teammates · See their wins · Chat in the feed
          </div>
        </div>
        <span style={{ fontSize: 14, color: P, fontWeight: 800 }}>›</span>
      </div>
    </button>
  );
}

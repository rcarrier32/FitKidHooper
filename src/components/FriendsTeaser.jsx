import CountBadge from "./CountBadge.jsx";

/** Always-visible entry to Friends — add teammates, see feed, react & comment. */
export default function FriendsTeaser({
  P = "#f97316",
  onOpenFriends,
  unreadMessages = 0,
  isSignedIn = false,
  onSignIn,
}) {
  const unread = Number(unreadMessages) || 0;
  const hasUnread = unread > 0;

  return (
    <div style={{ margin: "0 20px 14px" }}>
      <button
        type="button"
        onClick={onOpenFriends}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          borderRadius: 14,
          border: `1px solid ${hasUnread ? P : `${P}33`}`,
          background: hasUnread ? `${P}14` : `${P}0c`,
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>👋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Friends</span>
              {hasUnread && <CountBadge count={unread} P={P} />}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.45 }}>
              {hasUnread
                ? "Open Messages to read and reply"
                : "Add teammates · See their wins · Chat in the feed"}
            </div>
          </div>
          <span style={{ fontSize: 14, color: P, fontWeight: 800 }}>›</span>
        </div>
      </button>

      {!isSignedIn && onSignIn && (
        <button
          type="button"
          onClick={onSignIn}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${P}44`,
            background: "transparent",
            color: P,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Sign in to get private messages from friends
        </button>
      )}
    </div>
  );
}

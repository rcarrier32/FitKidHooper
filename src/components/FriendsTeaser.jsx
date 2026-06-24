import CountBadge from "./CountBadge.jsx";

/** Always-visible entry to Friends — add teammates, see feed, react & comment. */
export default function FriendsTeaser({
  P = "#f97316",
  onOpenFriends,
  squadNotifications = 0,
  unreadMessages = 0,
  isSignedIn = false,
  onSignIn,
}) {
  const total = Number(squadNotifications) || 0;
  const unread = Number(unreadMessages) || 0;
  const hasActivity = total > 0;

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
          border: `1px solid ${hasActivity ? P : `${P}33`}`,
          background: hasActivity ? `${P}14` : `${P}0c`,
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>👋</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--fkh-text)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Squad</span>
              {hasActivity && <CountBadge count={total} P={P} />}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.45 }}>
              {!isSignedIn
                ? "Sign in to add friends, message, and compete"
                : hasActivity
                  ? unread > 0 && total === unread
                    ? "New messages waiting — open Squad to reply"
                    : `${total} update${total === 1 ? "" : "s"} in Squad — messages, requests, feed, or challenges`
                  : "Add teammates · See their wins · Chat in the feed"}
            </div>
          </div>
          <span style={{ fontSize: 16, color: P, flexShrink: 0 }}>›</span>
        </div>
      </button>
      {!isSignedIn && onSignIn && (
        <button type="button" onClick={onSignIn} style={{
          display: "block", width: "100%", marginTop: 8, padding: "8px 12px", borderRadius: 10,
          border: `1px solid ${P}44`, background: "transparent", color: P, fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          Sign in to unlock Squad
        </button>
      )}
    </div>
  );
}

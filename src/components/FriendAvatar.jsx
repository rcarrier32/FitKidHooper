import { getAchievementMeta } from "../lib/achievements.js";
import { initialsFromName } from "../lib/friendProfileApi.js";

/**
 * Friend avatar — initials + optional equipped frame/gear until cloud avatars ship.
 */
export default function FriendAvatar({
  profile,
  displayName,
  size = 40,
  P = "#f97316",
  onPress,
  style = {},
}) {
  const name = displayName || profile?.displayName || "Hooper";
  const initials = initialsFromName(name);
  const equipped = profile?.equipped || {};
  const frame = equipped.frame ? getAchievementMeta(equipped.frame) : null;
  const gear = equipped.avatar_gear ? getAchievementMeta(equipped.avatar_gear) : null;
  const borderColor = frame?.color || P;
  const clickable = !!onPress;

  const inner = (
    <div style={{
      position: "relative",
      width: size,
      height: size,
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `${borderColor}22`,
        border: `2px solid ${borderColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        boxShadow: frame ? `0 0 10px ${borderColor}44` : "none",
      }}>
        <span style={{
          fontSize: size * 0.38, fontWeight: 800, color: borderColor,
          fontFamily: "'DM Mono',monospace", lineHeight: 1,
        }}>
          {initials}
        </span>
      </div>
      {gear?.emoji && (
        <span style={{
          position: "absolute", bottom: -2, right: -2, fontSize: size * 0.32,
          lineHeight: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
        }}>
          {gear.emoji}
        </span>
      )}
    </div>
  );

  if (!clickable) return inner;

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onPress?.(); }}
      aria-label={`View ${name}'s profile`}
      style={{
        background: "none", border: "none", padding: 0, margin: 0,
        cursor: "pointer", flexShrink: 0,
      }}
    >
      {inner}
    </button>
  );
}

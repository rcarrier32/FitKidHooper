import { getPositionLabel, getPositionEmoji, primaryFavorite } from "../lib/identity.js";
import { getAchievementMeta } from "../lib/achievements.js";

export default function AthleteCard({
  settings,
  currentLevel,
  totalXP,
  variant = "full",
  P = "#f97316",
  onPress,
}) {
  const isCompact = variant === "compact";
  const position = getPositionLabel(settings.playStyle);
  const posEmoji = getPositionEmoji(settings.playStyle);
  const jersey = settings.jerseyNumber != null ? `#${settings.jerseyNumber}` : null;
  const title = settings.activeTitle ? getAchievementMeta(settings.activeTitle) : null;
  const frame = settings.equipped?.frame ? getAchievementMeta(settings.equipped.frame) : null;
  const frameC = frame?.color || null;
  const allTime = settings.favoriteAllTime?.trim() || primaryFavorite(settings);
  const playLike = settings.favoritePlayLike?.trim();

  const cardStyle = {
    background: frameC ? `linear-gradient(135deg, ${frameC}1f 0%, ${P}0c 70%)` : `${P}0c`,
    border: `${frameC ? 2 : 1}px solid ${frameC || `${P}30`}`,
    borderRadius: isCompact ? 12 : 16,
    padding: isCompact ? "10px 12px" : "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: isCompact ? 10 : 14,
    cursor: onPress ? "pointer" : "default",
    boxShadow: frameC ? `0 0 16px ${frameC}33` : "none",
  };

  const avatarSize = isCompact ? 44 : 64;

  return (
    <div style={cardStyle} onClick={onPress} role={onPress ? "button" : undefined}>
      <div style={{
        width: avatarSize, height: avatarSize, borderRadius: "50%",
        background: `${P}18`, border: `2px solid ${P}`,
        overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {settings.avatar
          ? <img src={settings.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: isCompact ? 20 : 28 }}>👤</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: isCompact ? 14 : 18, fontWeight: 800, color: "var(--fkh-text)" }}>
            {settings.athleteName}
          </span>
          {jersey && (
            <span style={{
              fontSize: isCompact ? 10 : 11, fontWeight: 800, color: P,
              fontFamily: "'DM Mono',monospace",
              background: `${P}18`, padding: "2px 7px", borderRadius: 6,
            }}>{jersey}</span>
          )}
        </div>
        {title && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3,
            fontSize: isCompact ? 10 : 11, fontWeight: 800,
            color: title.color || P,
            background: `${title.color || P}1f`,
            border: `1px solid ${title.color || P}55`,
            padding: "1px 8px", borderRadius: 999,
          }}>
            <span>{title.emoji}</span><span>{title.name}</span>
          </div>
        )}
        {!isCompact && (
          <div style={{ fontSize: 13, fontWeight: 700, color: P, marginTop: 2 }}>
            {currentLevel?.emoji} {currentLevel?.name}
          </div>
        )}
        <div style={{ fontSize: isCompact ? 10 : 11, color: "var(--fkh-text-muted)", marginTop: 3, lineHeight: 1.4 }}>
          {posEmoji} {position}
          {allTime ? ` · 🐐 ${allTime}` : ""}
          {!isCompact && playLike ? ` · plays like ${playLike}` : ""}
          {!isCompact && totalXP != null ? ` · ${totalXP.toLocaleString()} XP` : ""}
        </div>
      </div>
    </div>
  );
}

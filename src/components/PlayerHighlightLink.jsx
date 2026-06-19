import { playerDisplayName, playerHighlightVideoId } from "../lib/pathSignatures.js";

/** Path legend name — tap opens in-app YouTube highlights (same as exercise videos). */
export default function PlayerHighlightLink({
  stage,
  children,
  P = "#f97316",
  onOpenHighlight,
  style = {},
  as = "button",
}) {
  const name = children || playerDisplayName(stage) || stage?.name || "";
  const videoId = playerHighlightVideoId(stage);
  if (!name) return null;

  if (!videoId || !onOpenHighlight) {
    return <span style={style}>{name}</span>;
  }

  const open = e => {
    e.preventDefault();
    e.stopPropagation();
    onOpenHighlight({ videoId, title: `${name} highlights` });
  };

  const linkStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    font: "inherit",
    color: P,
    fontWeight: "inherit",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: 2,
    ...style,
  };

  if (as === "span") {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") open(e); }}
        style={linkStyle}
      >
        {name}
      </span>
    );
  }

  return (
    <button type="button" onClick={open} style={linkStyle}>
      {name}
    </button>
  );
}

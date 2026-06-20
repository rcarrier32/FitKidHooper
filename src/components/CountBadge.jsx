/** Small numeric badge for unread counts on nav buttons and tabs. */
export default function CountBadge({ count, P = "#f97316", style = {} }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  const label = n > 99 ? "99+" : String(n);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99,
      background: P, color: "#000", fontSize: 10, fontWeight: 800,
      lineHeight: 1, flexShrink: 0, ...style,
    }}>
      {label}
    </span>
  );
}

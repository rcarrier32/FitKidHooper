import { useId } from "react";

/**
 * The tile that fronts a program on its card and detail header.
 *
 * Most programs still ride on their catalog `emoji` — it stays the source of truth for the
 * dozens of text placements (day-plan labels, coach replies, insight strings) where a glyph
 * has to sit inline in a sentence. A program can additionally set `icon:"<key>"` to opt into
 * bespoke line art here, which is what the coach-partner programs use: a stock 🌊/🔥 next to
 * a partner's real logo reads like a placeholder.
 *
 * Glyphs are stroke-only and drawn on a 48-unit grid, so one path serves every size. They
 * inherit the program's colour through a gradient, which is why each instance mints its own
 * gradient id — two tiles on screen at once must not share one <defs>.
 */

const GLYPHS = {
  /* Smooth Handles — the ball at the end of a crossover path. The S-curve is the "smooth"
     part; the arcs behind it are the two beats of the handle that got it there. */
  handles: ({ stroke, glow }) => (
    <>
      <path d="M9 15c5 0 4 7 9 7s4-7 9-7 4 7 9 7"
        fill="none" stroke={glow} strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      <path d="M11 22.5c4 0 3.5 5 7.5 5s3.5-5 7.5-5"
        fill="none" stroke={glow} strokeWidth="2" strokeLinecap="round" opacity="0.28" />
      <circle cx="24" cy="33" r="8" fill="none" stroke={stroke} strokeWidth="2.6" />
      <path d="M16 33h16M24 25v16M18.4 27.4c2.9 3.1 2.9 8.1 0 11.2M29.6 27.4c-2.9 3.1-2.9 8.1 0 11.2"
        fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
    </>
  ),

  /* Cramer 29 — a streak ring of daily ticks around a flame. The dashed ring is literally the
     shape of the challenge: one mark per day, all the way around. */
  streak29: ({ stroke, glow }) => (
    <>
      <circle cx="24" cy="24" r="18" fill="none" stroke={glow} strokeWidth="3"
        strokeLinecap="round" strokeDasharray="1.4 4.5" opacity="0.55" />
      <path d="M24 9c1.5 5.5 6 7 7.5 11.5 2 6-1.5 12-7.5 12s-9.5-5-8-11c.8-3.2 3-4.6 3.6-7.4 1.9 1.4 2.8 3.3 3 5.6C24 17 24.6 12.8 24 9Z"
        fill="none" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M24 22c1.8 1.9 2.6 3.6 2.6 5.2 0 2-1.2 3.3-2.6 3.3s-2.6-1.3-2.6-3.3c0-1.6.8-3.3 2.6-5.2Z"
        fill={stroke} opacity="0.35" stroke="none" />
    </>
  ),
};

export default function ProgramIcon({ prog, size = 48, active = false }) {
  const uid = useId();
  const glyph = GLYPHS[prog?.icon];
  const color = prog?.color || "#38bdf8";
  const radius = Math.round(size * 0.26);

  /* No bespoke glyph for this program: keep the exact emoji tile it has always had. */
  if (!glyph) {
    return (
      <div style={{ width:size,height:size,borderRadius:radius,
        background:`${color}18`,border:`2px solid ${color}${active ? "55" : "33"}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:Math.round(size * 0.46),flexShrink:0 }}>
        {prog?.emoji}
      </div>
    );
  }

  const gradId = `pgi-fill-${uid}`;
  const tileId = `pgi-tile-${uid}`;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={prog.name}
      style={{ flexShrink:0, display:"block" }}>
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={active ? 0.34 : 0.24} />
          <stop offset="100%" stopColor={color} stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={gradId} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#${tileId})`}
        stroke={color} strokeOpacity={active ? 0.55 : 0.34} strokeWidth="2" />
      {glyph({ stroke:`url(#${gradId})`, glow:color })}
    </svg>
  );
}

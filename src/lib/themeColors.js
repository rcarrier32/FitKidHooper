/** Runtime HSL/hex helpers for themed UI surfaces. */

export const hsl = (h, s, l) => {
  const _s = s / 100;
  const _l = l / 100;
  const a = _s * Math.min(_l, 1 - _l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = _l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const pri = s => hsl(s.primaryHue, s.primarySat, s.primaryLight);
export const sec = s => hsl(s.secondaryHue, s.secondarySat, s.secondaryLight);
export const bg = s => hsl(s.bgHue, s.bgSat, s.bgLight);
export const btn = s => s.buttonHue !== undefined
  ? hsl(s.buttonHue, s.buttonSat, s.buttonLight)
  : hsl(s.bgHue, Math.max(s.bgSat - 8, 0), Math.min(s.bgLight + 14, 24));
export const surf = s => s.surfaceHue !== undefined
  ? hsl(s.surfaceHue, s.surfaceSat, s.surfaceLight)
  : hsl(s.bgHue, Math.max(s.bgSat - 10, 0), Math.min(s.bgLight + 5, 20));
export const nav = s => s.surfaceHue !== undefined
  ? hsl(s.surfaceHue, s.surfaceSat, Math.max(s.surfaceLight - 1, 2))
  : hsl(s.bgHue, s.bgSat, Math.max(s.bgLight - 1, 2));
export const textPri = s => hsl(s.textHue ?? 210, s.textSat ?? 25, s.textLight ?? 94);
export const textMuted = s => hsl(s.textHue ?? 210, Math.max((s.textSat ?? 25) - 10, 0), Math.max((s.textLight ?? 94) - 30, 52));
export const str3 = s => s.accentHue !== undefined
  ? hsl(s.accentHue, s.accentSat, s.accentLight)
  : hsl((s.primaryHue + 120) % 360, Math.min(s.primarySat + 5, 100), Math.max(s.primaryLight, 50));

export function chipStyle(settings, selected, accent) {
  const a = accent || pri(settings);
  const b = btn(settings);
  return selected
    ? { background: `${a}20`, border: `1.5px solid ${a}`, color: a }
    : { background: `${b}2e`, border: `1.5px solid ${b}66`, color: textMuted(settings) };
}

export function actionBtnStyle(settings) {
  const b = btn(settings);
  return { background: `${b}2e`, border: `1px solid ${b}66`, color: textMuted(settings) };
}

/** Parse "#rrggbb" (or "#rgb") → {h,s,l} or null if invalid. */
export function hexToHsl(hex) {
  let m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) {
    const s = /^#?([0-9a-f]{3})$/i.exec((hex || "").trim());
    if (s) m = [null, s[1].split("").map(c => c + c).join("")];
  }
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function contrastOn(hex) {
  const c = hexToHsl(hex);
  return c && c.l > 52 ? "#000" : "#fff";
}

/** Theme presets, migration, and contrast guardrails for FKH color settings. */

const TAB_LIMITS = {
  accent:    { lMin: 38, lMax: 72, sMin: 55 },
  bg:        { lMin: 2, lMax: 35 },
  surface:   { lMin: 6, lMax: 30 },
  button:    { lMin: 8, lMax: 40 },
  text:      { lMin: 72, lMax: 98, sMax: 42 },
  secondary: { lMin: 35, lMax: 75, sMin: 50 },
  strength:  { lMin: 35, lMax: 70, sMin: 45 },
};

/** @typedef {{ accent:[number,number,number], bg:[number,number,number], surface:[number,number,number], button:[number,number,number], text:[number,number,number], secondary?:[number,number,number], strength?:[number,number,number] }} ThemePresetColors */

/** Kid-friendly team / vibe presets — each sets all 5 main buckets + derived accents. */
export const THEME_PRESETS = [
  {
    id: "neon-blue",
    label: "💙 Neon Blue",
    colors: {
      accent:    [195, 100, 58],
      bg:        [222, 47, 10],
      surface:   [222, 38, 15],
      button:    [222, 32, 20],
      text:      [210, 28, 94],
      secondary: [265, 82, 62],
      strength:  [158, 85, 50],
    },
  },
  {
    id: "pistons",
    label: "🏀 Detroit Pistons",
    colors: {
      accent:    [192, 88, 46],
      bg:        [215, 52, 10],
      surface:   [215, 42, 15],
      button:    [215, 36, 20],
      text:      [210, 18, 92],
      secondary: [350, 88, 52],
      strength:  [350, 75, 48],
    },
  },
  {
    id: "lakers",
    label: "🟣🟡 Lakers",
    colors: {
      accent:    [265, 85, 55],
      bg:        [250, 42, 9],
      surface:   [250, 34, 14],
      button:    [250, 28, 19],
      text:      [220, 18, 93],
      secondary: [45,  95, 52],
      strength:  [145, 70, 45],
    },
  },
  {
    id: "warriors",
    label: "🔵🟡 Warriors",
    colors: {
      accent:    [210, 88, 52],
      bg:        [220, 50, 9],
      surface:   [220, 40, 14],
      button:    [220, 34, 19],
      text:      [215, 20, 92],
      secondary: [45,  98, 55],
      strength:  [25,  90, 52],
    },
  },
  {
    id: "celtics",
    label: "🟢⚪ Celtics",
    colors: {
      accent:    [145, 78, 42],
      bg:        [155, 35, 9],
      surface:   [155, 28, 14],
      button:    [155, 24, 19],
      text:      [140, 15, 93],
      secondary: [0,   0,  88],
      strength:  [145, 75, 38],
    },
  },
  {
    id: "bulls",
    label: "🔴⚫ Bulls",
    colors: {
      accent:    [350, 88, 50],
      bg:        [220, 25, 8],
      surface:   [220, 20, 13],
      button:    [220, 18, 18],
      text:      [210, 12, 92],
      secondary: [0,   0,  75],
      strength:  [350, 80, 45],
    },
  },
  {
    id: "court-orange",
    label: "🏀 Court Orange",
    colors: {
      accent:    [28,  95, 55],
      bg:        [25,  40, 9],
      surface:   [25,  32, 14],
      button:    [25,  28, 19],
      text:      [35,  20, 93],
      secondary: [200, 75, 50],
      strength:  [15,  90, 52],
    },
  },
  {
    id: "ocean",
    label: "🌊 Ocean",
    colors: {
      accent:    [175, 85, 48],
      bg:        [200, 55, 9],
      surface:   [200, 45, 14],
      button:    [200, 38, 19],
      text:      [195, 22, 92],
      secondary: [280, 70, 60],
      strength:  [190, 80, 45],
    },
  },
];

export function deriveSecondaryFromAccent(h, s, l) {
  return {
    h: (h + 52) % 360,
    s: Math.min(s + 4, 100),
    l: Math.min(l + 6, 72),
  };
}

export function deriveStrengthFromAccent(h) {
  return { h: (h + 118) % 360, s: 82, l: 48 };
}

/** Read HSL for a settings tab id. */
export function getTabHSL(settings, tab) {
  if (tab === "accent")    return { h: settings.primaryHue,   s: settings.primarySat,   l: settings.primaryLight };
  if (tab === "secondary") return { h: settings.secondaryHue, s: settings.secondarySat, l: settings.secondaryLight };
  if (tab === "strength")  return { h: settings.accentHue,    s: settings.accentSat,    l: settings.accentLight };
  if (tab === "button")    return { h: settings.buttonHue,    s: settings.buttonSat,    l: settings.buttonLight };
  if (tab === "surface")   return { h: settings.surfaceHue,   s: settings.surfaceSat,   l: settings.surfaceLight };
  if (tab === "text")      return { h: settings.textHue,      s: settings.textSat,      l: settings.textLight };
  return { h: settings.bgHue, s: settings.bgSat, l: settings.bgLight };
}

/** Write HSL for a tab into a settings patch (with guardrails). */
export function patchTabHSL(settings, tab, h, s, l) {
  const clamped = clampTabHSL(tab, h, s, l, settings);
  const prefix =
    tab === "accent"    ? "primary"
    : tab === "strength" ? "accent"
    : tab;
  const patch = {
    [`${prefix}Hue`]: clamped.h,
    [`${prefix}Sat`]: clamped.s,
    [`${prefix}Light`]: clamped.l,
  };
  if (tab === "accent" && !settings.customSecondary) {
    const sec = deriveSecondaryFromAccent(clamped.h, clamped.s, clamped.l);
    const secClamped = clampTabHSL("secondary", sec.h, sec.s, sec.l, settings);
    patch.secondaryHue = secClamped.h;
    patch.secondarySat = secClamped.s;
    patch.secondaryLight = secClamped.l;
  }
  if (tab === "secondary") patch.customSecondary = true;
  return { patch, adjusted: clamped.adjusted };
}

export function clampTabHSL(tab, h, s, l, settings = {}) {
  const lim = TAB_LIMITS[tab] || {};
  const nh = ((Math.round(h) % 360) + 360) % 360;
  let ns = Math.round(s);
  let nl = Math.round(l);
  const before = { h: nh, s: ns, l: nl };

  if (lim.sMin != null) ns = Math.max(lim.sMin, ns);
  if (lim.sMax != null) ns = Math.min(lim.sMax, ns);
  if (lim.lMin != null) nl = Math.max(lim.lMin, nl);
  if (lim.lMax != null) nl = Math.min(lim.lMax, nl);

  const bgL = settings.bgLight ?? 6;
  const textL = settings.textLight ?? 94;

  if (tab === "text" && nl - bgL < 45) nl = Math.min(bgL + 45, lim.lMax ?? 98);
  if (tab === "accent") {
    if (ns < 55) ns = 55;
    if (Math.abs(nl - bgL) < 22) nl = Math.min(bgL + 28, lim.lMax ?? 72);
  }
  if (tab === "surface") {
    nl = Math.max(bgL + 3, Math.min(nl, textL - 48));
  }
  if (tab === "button") {
    nl = Math.max(bgL + 5, Math.min(nl, textL - 40));
  }

  return {
    h: nh, s: ns, l: nl,
    adjusted: nh !== before.h || ns !== before.s || nl !== before.l,
  };
}

export function brightnessMaxForTab(tab) {
  if (tab === "bg") return 35;
  if (tab === "surface") return 30;
  if (tab === "button") return 40;
  if (tab === "text") return 98;
  return 75;
}

/** Default FKH theme — used to detect custom colors during cloud merge. */
export const DEFAULT_THEME = {
  primaryHue: 38, primarySat: 92, primaryLight: 55,
  secondaryHue: 245, secondarySat: 80, secondaryLight: 60,
  bgHue: 222, bgSat: 47, bgLight: 10,
  surfaceHue: 222, surfaceSat: 37, surfaceLight: 15,
  buttonHue: 222, buttonSat: 38, buttonLight: 20,
  textHue: 210, textSat: 25, textLight: 94,
  accentHue: 158, accentSat: 85, accentLight: 50,
  customSecondary: false,
};

const THEME_NUM_KEYS = [
  "primaryHue", "primarySat", "primaryLight",
  "secondaryHue", "secondarySat", "secondaryLight",
  "bgHue", "bgSat", "bgLight",
  "surfaceHue", "surfaceSat", "surfaceLight",
  "buttonHue", "buttonSat", "buttonLight",
  "textHue", "textSat", "textLight",
  "accentHue", "accentSat", "accentLight",
];

function clampThemeNumber(key, value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (key.endsWith("Hue")) return ((Math.round(n) % 360) + 360) % 360;
  if (key.endsWith("Sat")) return Math.max(0, Math.min(100, Math.round(n)));
  if (key.endsWith("Light")) return Math.max(0, Math.min(100, Math.round(n)));
  return n;
}

/** Coerce NaN / out-of-range theme sliders so render never produces invalid colors. */
export function sanitizeThemeNumbers(raw) {
  const s = { ...(raw || {}) };
  for (const key of THEME_NUM_KEYS) {
    if (s[key] === undefined) continue;
    const fallback = DEFAULT_THEME[key];
    s[key] = clampThemeNumber(key, s[key], fallback);
  }
  return s;
}

/** Fill missing surface/text/button fields from legacy settings. */
export function migrateThemeSettings(raw) {
  const s = sanitizeThemeNumbers({ ...raw });
  if (s.surfaceHue === undefined) {
    s.surfaceHue = s.bgHue ?? 222;
    s.surfaceSat = Math.max((s.bgSat ?? 47) - 10, 0);
    s.surfaceLight = Math.min((s.bgLight ?? 6) + 5, 20);
  }
  if (s.textHue === undefined) {
    s.textHue = 210;
    s.textSat = 25;
    s.textLight = 94;
  }
  if (s.buttonHue === undefined) {
    s.buttonHue = s.bgHue ?? 222;
    s.buttonSat = Math.max((s.bgSat ?? 47) - 8, 0);
    s.buttonLight = Math.min((s.bgLight ?? 6) + 14, 24);
  }
  if (s.customSecondary === undefined) s.customSecondary = false;
  return s;
}

export function applyThemePreset(preset) {
  const c = preset.colors;
  const strength = c.strength || (() => {
    const d = deriveStrengthFromAccent(c.accent[0]);
    return [d.h, d.s, d.l];
  })();
  const secondary = c.secondary || (() => {
    const d = deriveSecondaryFromAccent(c.accent[0], c.accent[1], c.accent[2]);
    return [d.h, d.s, d.l];
  })();
  return migrateThemeSettings({
    primaryHue: c.accent[0], primarySat: c.accent[1], primaryLight: c.accent[2],
    bgHue: c.bg[0], bgSat: c.bg[1], bgLight: c.bg[2],
    surfaceHue: c.surface[0], surfaceSat: c.surface[1], surfaceLight: c.surface[2],
    buttonHue: c.button[0], buttonSat: c.button[1], buttonLight: c.button[2],
    textHue: c.text[0], textSat: c.text[1], textLight: c.text[2],
    secondaryHue: secondary[0], secondarySat: secondary[1], secondaryLight: secondary[2],
    accentHue: strength[0], accentSat: strength[1], accentLight: strength[2],
    customSecondary: true,
    themePresetId: preset.id,
  });
}

export const THEME_SETTING_KEYS = [
  ...Object.keys(DEFAULT_THEME),
  "themePresetId",
];

export function extractThemeFields(settings) {
  if (!settings) return {};
  const out = {};
  for (const k of THEME_SETTING_KEYS) {
    if (settings[k] !== undefined) out[k] = settings[k];
  }
  return out;
}

export function isDefaultTheme(settings) {
  if (!settings) return true;
  if (settings.themePresetId) return false;
  return Object.entries(DEFAULT_THEME).every(([k, v]) => (settings[k] ?? v) === v);
}

export const MAIN_THEME_TABS = [
  ["accent", "Accent"],
  ["bg", "Background"],
  ["surface", "Surface"],
  ["button", "Buttons"],
  ["text", "Text"],
];

export const ADVANCED_THEME_TABS = [
  ["secondary", "Secondary"],
  ["strength", "Strength"],
];

export function tabPreviewLabel(tab) {
  return MAIN_THEME_TABS.find(([id]) => id === tab)?.[1]
    || ADVANCED_THEME_TABS.find(([id]) => id === tab)?.[1]
    || tab;
}

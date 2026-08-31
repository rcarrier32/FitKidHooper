/** Court zones a shot can be logged from, and the colour each one draws in. */
export const SHOT_TYPES = [
  { id:"layup",        label:"Layup",          emoji:"🏃", locations:null },
  { id:"rev_layup",    label:"Reverse Layup",  emoji:"🔄", locations:null },
  { id:"block_bank",   label:"Block Area",     emoji:"📐", locations:["Left Block","Right Block"] },
  { id:"mid_bank",     label:"Elbow Shot",    emoji:"💫", locations:["Left Elbow","Right Elbow"] },
  { id:"mid",          label:"Wing (Mid)",     emoji:"🎯", locations:["Left Wing","Right Wing"] },
  { id:"mid_baseline", label:"Baseline (Mid)", emoji:"🎯", locations:["Left Baseline","Right Baseline"] },
  { id:"free_throw",   label:"Free Throw",     emoji:"🆓", locations:null },
  { id:"three_corner", label:"Corner 3",       emoji:"📐", locations:["Left Corner","Right Corner"] },
  { id:"three_wing",   label:"Wing 3",         emoji:"↗️", locations:["Left Wing","Right Wing"] },
  { id:"three_slot",   label:"Slot 3",         emoji:"↗️", locations:["Left Slot","Right Slot"] },
  { id:"three_center", label:"Top 3",          emoji:"🎯", locations:null },
];
export const SHOT_COLORS = {
  layup:"#34d399", rev_layup:"#6ee7b7", block_bank:"#60a5fa",
  mid_bank:"#93c5fd", mid:"#a78bfa", mid_baseline:"#c4b5fd", free_throw:"#fbbf24",
  three_corner:"#f87171", three_wing:"#fb923c", three_slot:"#f472b6", three_center:"#f43f5e",
};


/* True 2D hue×saturation disc: angle = hue, radius = saturation, at a fixed
   lightness. One drag sets both hue and sat → onChange(hue, sat). The disc
   bitmap only redraws when lightness/size change; the selection ring is a DOM
   element so dragging never re-renders the canvas. */
/* ═══════════════════════ SHOT TRACKER HELPERS ═══════════════ */

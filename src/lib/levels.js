/** XP levels — Rookie through Elite Hooper. */
export const LEVELS = [
  { rank:1, name:"Rookie",       emoji:"🌱", xpMin:0,     xpNext:1000  },
  { rank:2, name:"Starter",      emoji:"⭐", xpMin:1000,  xpNext:2500  },
  { rank:3, name:"All-Star",     emoji:"🌟", xpMin:2500,  xpNext:5000  },
  { rank:4, name:"Varsity",      emoji:"🏆", xpMin:5000,  xpNext:10000 },
  { rank:5, name:"Elite Hooper", emoji:"👑", xpMin:10000, xpNext:null  },
];

export function getLevel(xp) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xpMin) lv = l; }
  return lv;
}

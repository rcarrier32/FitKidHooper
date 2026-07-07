/**
 * Favorite-player registry — maps player names to paths, programs, and drill bias.
 * Registry match wins over fuzzy track.favoritePlayerKeys.
 */

export const FAVORITE_PLAYER_REGISTRY = [
  {
    keys: ["curry", "steph"],
    primaryPath: "shooter",
    programs: ["become-shooter", "complete-hooper"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "Range & quick release",
  },
  {
    keys: ["ray allen", "ray"],
    primaryPath: "shooter",
    programs: ["become-shooter"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "Catch-and-shoot",
  },
  {
    keys: ["iverson", "ai"],
    primaryPath: "ballhandling",
    programs: ["guard-handles", "first-step"],
    categories: ["handles", "ballhandling", "explosion"],
    label: "Crossover & first step",
  },
  {
    keys: ["williams", "white chocolate", "whitechocolate"],
    primaryPath: "ballhandling",
    programs: ["guard-handles"],
    categories: ["handles", "ballhandling"],
    label: "Flashy handles",
  },
  {
    keys: ["hardaway", "tim"],
    primaryPath: "ballhandling",
    programs: ["guard-handles", "first-step"],
    categories: ["handles", "ballhandling"],
    label: "UTA crossover",
  },
  {
    keys: ["kyrie", "irving"],
    primaryPath: "ballhandling",
    programs: ["guard-handles", "first-step"],
    categories: ["handles", "ballhandling", "finishing"],
    label: "Handle & finish",
  },
  {
    keys: ["stockton"],
    primaryPath: "maestro",
    programs: ["guard-handles", "complete-hooper"],
    categories: ["game_handles", "handles"],
    label: "Pure point guard",
  },
  {
    keys: ["nash", "steve"],
    primaryPath: "maestro",
    programs: ["guard-handles", "complete-hooper"],
    categories: ["game_handles", "footwork"],
    label: "Floor orchestrator",
  },
  {
    keys: ["paul", "cp3", "chris"],
    primaryPath: "maestro",
    programs: ["guard-handles", "complete-hooper"],
    categories: ["game_handles", "handles"],
    label: "Point god",
  },
  {
    keys: ["magic", "johnson"],
    primaryPath: "maestro",
    programs: ["complete-hooper", "guard-handles"],
    categories: ["game_handles", "footwork"],
    label: "Showtime passing",
  },
  {
    keys: ["brunson", "jalen"],
    primaryPath: "maestro",
    programs: ["guard-handles", "complete-hooper", "become-shooter"],
    categories: ["footwork", "footwork_lab", "game_handles"],
    label: "Footwork master",
  },
  {
    keys: ["durant", "kd"],
    primaryPath: "shooter",
    programs: ["become-shooter"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "Unguardable shot",
  },
  {
    keys: ["jordan", "mj"],
    primaryPath: "finisher",
    programs: ["first-step", "complete-hooper"],
    categories: ["finishing", "explosion"],
    label: "Attack the rim",
  },
  {
    keys: ["wade", "flash"],
    primaryPath: "finisher",
    programs: ["first-step"],
    categories: ["finishing", "explosion"],
    label: "Paint penetration",
  },
  {
    keys: ["lebron", "james"],
    primaryPath: "skywalker",
    programs: ["jump-higher", "complete-hooper"],
    categories: ["explosion", "athletic"],
    label: "Above the rim",
  },
  {
    keys: ["richardson", "jrich", "j-rich"],
    primaryPath: "skywalker",
    programs: ["jump-higher", "first-step"],
    categories: ["explosion", "athletic"],
    label: "360 dunks & hang time",
  },
  {
    keys: ["wilkins", "dominique", "nique"],
    primaryPath: "skywalker",
    programs: ["jump-higher", "bodyweight-beast"],
    categories: ["explosion", "athletic"],
    label: "Power dunks & windmills",
  },
  {
    keys: ["kawhi", "leonard"],
    primaryPath: "lockdown",
    programs: ["complete-hooper"],
    categories: ["deceleration", "athletic"],
    label: "Lockdown defense",
  },
  {
    keys: ["harden", "james harden"],
    primaryPath: "stepback",
    programs: ["step-back-legends", "become-shooter"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "Step-back separation",
  },
  {
    keys: ["luka", "doncic", "dončić"],
    primaryPath: "stepback",
    programs: ["step-back-legends", "become-shooter"],
    categories: ["shooting_lab", "shootingdrills", "handles"],
    label: "Drive-to-step-back",
  },
  {
    keys: ["lillard", "dame", "damian"],
    primaryPath: "stepback",
    programs: ["step-back-legends", "become-shooter"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "Logo-range step-back",
  },
  {
    keys: ["derozan", "demar", "de rozan"],
    primaryPath: "midrange",
    programs: ["become-shooter", "step-back-legends"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "Mid-range step-back",
  },
  {
    keys: ["dirk", "nowitzki"],
    primaryPath: "stepback",
    programs: ["step-back-legends", "become-shooter"],
    categories: ["shooting_lab", "shootingdrills"],
    label: "One-leg balance shot",
  },
  {
    keys: ["rodman", "dennis", "worm"],
    primaryPath: "rebounder",
    programs: ["own-the-glass"],
    categories: ["rebounding"],
    label: "Own the glass",
  },
  {
    keys: ["draymond", "green", "moses malone", "ben wallace", "drummond", "gobert", "dwight", "howard"],
    primaryPath: "rebounder",
    programs: ["own-the-glass", "complete-hooper"],
    categories: ["rebounding"],
    label: "Motor & second-jump boards",
  },
];

export function favoritePlayerQuery(settings) {
  if (typeof settings === "string") return settings.toLowerCase().trim();
  return (
    settings?.favoritePlayLike
    || settings?.favoriteCurrent
    || settings?.favoriteAllTime
    || settings?.favoritePlayer
    || ""
  ).toLowerCase().trim();
}

export function matchRegistryEntry(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return null;
  let best = null;
  let bestLen = 0;
  for (const entry of FAVORITE_PLAYER_REGISTRY) {
    for (const k of entry.keys) {
      if (q.includes(k) && k.length > bestLen) {
        best = entry;
        bestLen = k.length;
      }
    }
  }
  return best;
}

export function displayFavoritePlayer(settings) {
  const raw = typeof settings === "string"
    ? settings
    : (settings?.favoritePlayLike || settings?.favoriteCurrent
       || settings?.favoriteAllTime || settings?.favoritePlayer || "");
  return raw.trim();
}

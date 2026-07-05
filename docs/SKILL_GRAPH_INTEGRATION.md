# Skill Graph — Integration Plan (UI + connections)

`src/lib/skillGraph.js` is built (data-only, no UI touched). This plans how it gets *used* —
none of the FKH-UI items below are built yet; they're proposals.

## What shipped (non-UI, done)
- `src/lib/skillGraph.js` — the Player-Development Knowledge Layer: both grammars (game + dev),
  8 skill areas, ~72 skills (role/age/movement-pattern/tactical-link), shooting mechanics
  (Base→Load→Lift→Release→Follow-Through), movement patterns, combo grammar, helpers.
- `CATEGORY_TO_AREA` — maps existing drill categories → skill areas, so every current drill gets a
  skill-graph home **without touching the drills or UI**.

## A. FKH UI adoption (PLAN — not built; needs your OK per "don't change FKH UI")
1. **Drill browser grouping** — group/filter existing drills by *skill area* via `areaForCategory`
   (additive; drills unchanged).
2. **Drill detail** — show the skill(s) a drill builds + its fundamentals/cues.
3. **Skill Map view** — browse areas → skills; tap a skill → its drills + "what's next."
4. **Mastery tracks tie-in** — link the existing paths/tracks to skills (skill = the Speed/Difficulty
   axis of the Dev Grammar).
5. **Age filter** — foundational (6–12) vs advanced, reusing FKH's age groups (`skillsByAge`).
6. **Combo Builder** — generate handle combos from `COMBO_GRAMMAR` (Rhythm→Direction-Change→
   Counter→Finish) instead of a fixed list.
7. **Partner section** (later) — partner-capable skills → dual-video workout mode (drill PiP).

## B. Connections to finish (mostly non-UI, extensible)
- **Per-drill → specific skill** map (beyond category→area) — extend as drills are reviewed.
- **Mastery tracks/paths → skills** — the Speed/Difficulty progression axis.
- **YouTube enrichment** — use the skill graph as the gap-analysis lens; trusted-trainer allowlist +
  short clips; one-time review before adding (see NextPlay docs/PLAYER_DEVELOPMENT_KNOWLEDGE_LAYER.md §Enrichment).

## C. NextPlay combination (the bridge — built on NextPlay side)
- Port/seed the skill vocabulary into NextPlay (`coaching_knowledge_items` with `domain='development'`,
  or a shared lib).
- Wire **tactical action ↔ dev skill** via `skill.tacticalAction` (curl/flare/pin-down/dho/zoom already
  linked) → shared nodes across the two knowledge layers.
- **Bidirectional bridge:** NextPlay scenario `requires` skills ↔ skill `usedIn` scenarios. The
  existing NextPlay player-dev (skill pathways + the 84 dev drills) becomes knowledge-backed.

## Ordering
Non-UI first (B connections + C NextPlay bridge) — they add value without any FKH-UI change. FKH-UI
adoption (A) only after you approve the specific screens.

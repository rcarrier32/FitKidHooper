# Plan — Add 33 Player-Development Skills as FKH Exercises

**Status:** PLAN ONLY — no exercise data written yet. Awaiting approval.
**Source:** the dev-skill knowledge layer (`src/lib/skillGraph.js`) + curated videos (`src/lib/skillVideos.js`).
**Audience:** ages 9–14. **Constraint:** do not change FKH UI without approval.

These 33 skills have a reviewed video in `skillVideos.js` but **no matching exercise** in the app today.
This plan turns them into real, athlete-facing exercises.

---

## How an exercise is registered (so we do it right)

An FKH exercise is data in three places in `src/FitKidHooperApp.jsx` (+ one label file):

1. **`W_<CATEGORY>` array** — the exercise object:
   ```js
   { id:"gh-in-out", name:"In-and-Out Dribble", tag:"Rhythm Move", difficulty:"beginner",
     ageRange:[9,14], funScore:8, estimatedDuration:90,
     desc:"…one-sentence what/why…",
     cues:["cue 1","cue 2","cue 3"],
     trainer:"Get Handles Basketball", videoId:"dF61fgRPa3g",
     videoTitle:"How To In & Out Dribble — Get Handles" },
   ```
2. **`EXERCISE_META[id]`** — powers age-aware generation (REQUIRED, or the generator mis-handles it):
   ```js
   "gh-in-out": { difficulty:"beginner", impactLevel:"low", intensityLevel:"medium",
     movementType:"skill", bodyFocus:["hands","coordination"],
     basketballTransfer:["ball handling","change of pace"], equipment:"ball",
     spaceRequired:"small", ageRange:[9,14], estimatedDuration:90, funScore:8, workoutRole:["main"] },
   ```
3. **`WORKOUTS`** map already contains the category key (e.g. `game_handles: W_GAME_HANDLES`) — no change needed for existing categories.
4. **`CATS`** in `src/lib/categories.js` — label + emoji (only for a NEW category).

**→ Adding to an EXISTING category = pure data (steps 1–2). No UI change.**
**→ A NEW category = steps 1–4 + `SCHEDULE`/`SCHED_TO_TEMPLATE` wiring (multi-file). Needs sign-off.**

---

## Part A — 29 exercises into EXISTING categories (DATA ONLY, no UI change)

Target category shown per group. Each needs a `W_` object + `EXERCISE_META` entry. Videos are the
current first-sweep picks; ★ = will be re-checked by the youth re-enrichment (see Part C) before final.

### Ball Handling → `W_GAME_HANDLES` (game_handles) — 9
| Skill | Role | Video | id |
|---|---|---|---|
| In-and-Out | rhythm | KaKaBasketball (10s) ★ | gh-in-out |
| Stutter | rhythm | Hoop Dreams Basketball (12s) ★ | gh-stutter |
| Push Cross | direction_change | Get Handles (9s) | gh-push-cross |
| Half-Spin | direction_change | Get Handles (44s) | gh-half-spin |
| Shamgod | direction_change | ILoveBasketballTV (58s) | gh-shamgod |
| Pullback | escape | Billy Clapper (9s) ★ | gh-pullback |
| Snatch Back | escape | ILoveBasketballTV (25s) | gh-snatch |
| Cross → Behind | direction_change | Get Handles (23s) | gh-cross-behind |
| Hang → Hesi → Cross | direction_change | PJFPerformance (27s) | gh-hhc |

### Shooting → `W_SHOOTING_LAB` (shooting_lab) — 12
| Skill | Video | id |
|---|---|---|
| Relocation | HoopStudy (23s) | sl-relocation |
| Drift | Shoot-A-Way (88s) | sl-drift |
| Flare | Coach Tony Miller (5s) ★ | sl-flare |
| Pin-Down | Shoot-A-Way (69s) | sl-pindown |
| DHO (dribble hand-off) | Dr. Dish (88s) | sl-dho |
| Sprint-Into-Shot | HoopStudy (26s) | sl-sprint-shot |
| Zoom Action | Matt Hackenberg (15s) ★ | sl-zoom |
| One-Dribble Pull-Up | Keith Poitier (25s) ★ | sl-1dribble-pu |
| Two-Dribble Pull-Up | ILoveBasketballTV (31s) | sl-2dribble-pu |
| Side-Step | HoopStudy (14s) | sl-side-step |
| Floater / Runner | HoopStudy (9s) | sl-floater |
| Reject Screen | HoopStudy (16s) | sl-reject |

### Finishing → `W_FINISHING_SCHOOL` (finishing_school) — 3
| Skill | Video | id |
|---|---|---|
| Speed Gather (off one) | Good Drill (37s) ★ | fs-speed-gather |
| Overhand Layup | Get Handles (18s) | fs-overhand |
| Underhand / Scoop | FIBA Basketball (115s) ★ | fs-scoop |

### Footwork → `W_FOOTWORK_LAB` (footwork_lab) — 1
| Skill | Video | id |
|---|---|---|
| Jab-and-Go | Get Handles (18s) | flab-jab-go |

### Passing → `W_PASSING` (passing) — 3
| Skill | Video | id |
|---|---|---|
| Pocket Pass (PnR) | Ryan Razooky R2BBALL (13s) | pass-pocket |
| Kick-Out | OTRP Teaching Library (50s) | pass-kickout |
| Skip Pass | STACK Basketball (24s) | pass-skip |

### Rebounding → `W_REBOUNDING` (rebounding) — 1
| Skill | Video | id |
|---|---|---|
| Put-Back | Junior Wildcats (14s) | reb-putback |

---

## Part B — 4 DEFENSE exercises (needs a category decision)

Defense has **no `W_` category today** (defensive slide currently lives in `W_SPEED` as `def-slide`).
The 4 skills: **Lateral Slide, Containment / Mirror, Shot Contest (no foul), Recover / X-Out.**

Two options:

- **B1 — New `W_DEFENSE` category (recommended).** Defense is a real skill area; it deserves its own
  card. Touches: new `W_DEFENSE` array + `EXERCISE_META` (data) · `CATS.defense = {label:"Defense", emoji:"🛡️"}`
  in categories.js · `WORKOUTS.defense = W_DEFENSE` · one `SCHEDULE` day + `SCHED_TO_TEMPLATE.defense`
  · add to the category picker list (~line 2185) and a session template (~line 1912). Multi-file registry
  wiring, no new UI *components* — the existing category screens render it. **This is the "provide a plan"
  UI change — approve before I touch it.**
- **B2 — Fold into `basketball_iq` or `athletic`.** Zero new category; defense skills ride an existing
  card. Less discoverable, but no category wiring. Fastest.

**Recommendation: B1** — a Defense card matches the skillGraph areas and gives the 5 defensive dev-skills
(these 4 + the 3 rebounding micro-cues later) a real home.

---

## Part C — Youth re-enrichment (in flight)

`enrich-dev-skills.mjs --youth` (already built) biases to age-9–14 channels (Jr. NBA, Cramer,
Get Handles) and beginner queries. Full 33-skill youth run is ~3.3k YouTube quota units; today's
budget was mostly spent on the first sweep, so run it after the daily quota reset:

```
cd nextplay && node scripts/enrich-dev-skills.mjs --youth --ids <33 ids> --top 3
# → scripts/dev-enrichment-review-youth.json → re-curate → swap ★ videos before finalizing
```

Skills marked ★ above have non-youth or ultra-short current picks and should be youth-refined first.

---

## Recommended sequence

1. **Approve Part B option** (B1 new Defense category vs B2 fold-in).
2. Run **Part C** youth re-enrichment (quota reset) → finalize videos.
3. Land **Part A** (29 exercises) as data — batchable by category, no UI change.
4. Land **Part B** per the approved option.
5. Sanity pass: every new `id` has both a `W_` object and an `EXERCISE_META` entry.

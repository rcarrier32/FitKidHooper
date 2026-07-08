# Deep Evaluation — Development Plans & Legends vs. the Knowledge Layer

**Method:** audit the three progression systems against `skillGraph.js` (8 skill areas, roles, age bands,
and the DEV grammar: *Area → Movement Pattern → Technique → **Speed/Difficulty** → Goal*). Goal: find
where the development plans can evolve, and design a coherent **tier** system.

---

## 1. What exists today (three overlapping ladders)

| System | Where | Count | Structure | Has tiers? |
|---|---|---|---|---|
| **Training Programs** ("plans") | `FitKidHooperApp.jsx` `PROGRAMS` | 7 | weeks → sessions → exercises | ❌ flat (only *Step Back Legends* uses "Level 1–3") |
| **Legend Paths** ("legends challenges") | `lib/achievements.js` | 9 | archetype → 4–5 stages, each a legend + signature drills | ✅ **rarity**: common → rare → epic → legendary |
| **XP Ranks** | `FitKidHooperApp.jsx` | 5 | Rookie → Starter → All-Star → Varsity → Elite Hooper | ✅ XP thresholds (account-wide, not per-skill) |

The **rarity ladder already IS a tier system** — but only inside Legend Paths, and it's cosmetic
(a color/name), not tied to the knowledge layer's difficulty axis. Programs have no tiers at all.

---

## 2. Coverage vs. the 8 knowledge-layer areas

| Area | Programs | Legend Paths | Verdict |
|---|:--:|:--:|---|
| Ball-Handling | 2 | 1 (The Ball Handler) | ✅ covered |
| Shooting | 3 | 3 (Shooter, Mid-Range, Step-Back) | 🔵 **over-covered** |
| Finishing | 2 | 2 (Finisher, Floater) | 🔵 **over-covered** |
| Footwork | 3 | 2 (folded into Step-Back/Maestro) | 🔵 over-covered, no *dedicated* path |
| Passing | **0** | 1 (Maestro, shared w/ IQ) | ⚠ **path only, no program** |
| Defense | **0** | 1 (The Lockdown) | ⚠ **path only, no program** |
| Rebounding | **0** | **0** | ❌ **TOTAL GAP** |
| Athleticism | 2 | 1 (Above the Rim) | ✅ covered |

**The evolution map falls right out of this:**
1. **Rebounding — total gap.** No program, no legend path — yet skillGraph has a full rebounding area
   and we just built the `W_REBOUNDING` category. Biggest missing pillar.
2. **Defense — path but no program.** *The Lockdown* legend path exists with nothing to train it. We
   just shipped the Defense category (22 exercises) — it's begging for a **Lockdown Defender** program.
3. **Passing — thin.** Only lives inside the Maestro path; no standalone program.
4. **Shooting is triple-covered** while three whole areas are starved — the catalog is lopsided toward
   guard scoring. Rebalancing *is* the evolution.

---

## 3. The tier problem — and the fix the knowledge layer already implies

**Problem.** Difficulty is expressed three inconsistent ways: rarity (legends), week number (programs),
and skillGraph's `age` field — which has only **two** values (`foundational` 53, `advanced` 19). There's
no shared, skill-level notion of "how hard / how game-real is this rep."

**Fix — one 3-tier ladder, sourced from the DEV grammar's Speed/Difficulty axis**, applied everywhere:

| Tier | Name | Speed / Difficulty (DEV grammar) | skillGraph `age` | Legend rarity | Crossover example |
|---|---|---|---|---|---|
| **T1** | **Foundation** | stationary · form · slow · uncontested | `foundational` | common | Stationary cross, ball below the knee |
| **T2** | **Application** | on the move · combos · controlled game speed | *(new middle band)* | rare / epic | Cross on the move into a second move |
| **T3** | **Game-Speed** | contested · live read · game situation | `advanced` | legendary | Cross vs. a live defender — read & attack |

This is not a new invention — it's the **Speed/Difficulty axis we already designed into the DEV grammar**,
made explicit. Recommended implementation:

- Add a `tier: 1|2|3` field to each `skillGraph.js` SKILL (the knowledge layer becomes the single source
  of truth for difficulty; `age` collapses into it — foundational→T1, advanced→T3, everything else→T2).
- Programs reference tiers instead of bare week numbers ("Week 1 = Tier 1 reps").
- Legend rarity maps to tiers (common=T1, rare/epic=T2, legendary=T3), so a "legendary" rung *means*
  game-speed mastery, not just a gold frame.
- The age-aware workout generator can then serve tier-appropriate reps (a 9-year-old gets T1; a 14-year-old
  ready for contested reps gets T3) — real progression instead of a flat age gate.

---

## 4. Recommended evolution (priority order)

1. ~~**Add the `tier` field to skillGraph**~~ ✅ **DONE.** `SKILL_TIERS` in `skillGraph.js` classifies all
   73 skills into T1/T2/T3 (26/33/14) + `TIER_META`, `skillTier(id)`, `skillsByTier(t)`. Programs, legend
   rungs, and the age-aware generator can now reference a real 3-level ladder.
2. **Rebounding pillar** — ✅ **BUILT.** `rebounder` legend path (The Glass Cleaner: Box-Out → The Motor/Faried
   → Second Jump/Moses Malone → Glass Eater/Ben Wallace → The Worm/Rodman Conquest) + 3-week *Own the Glass*
   program + `rebounding` bucket + registry entries + `pgm-own-the-glass` badge. Verified builds clean.
3. ~~**Lockdown Defender program**~~ ✅ **DONE.** 4-week `lockdown-defender` program (stance/slide →
   containment → closeouts/contest → team defense) on W_DEFENSE + defense-transfer agility, badge
   `pgm-lockdown-defender`, wired into the Lockdown path. Also fixed: `BUCKETS.defense` now counts the
   `defense` category so those reps advance the legend path.
4. ~~**Floor General (passing) program**~~ ✅ **DONE.** 4-week `floor-general` program built entirely on
   WALL drills (solo-trainable) — added 3 new ones (Drive & Kick, Skip, Pocket) for kick_out/skip/pocket.
   Badge `pgm-floor-general`, wired into the Maestro path; `BUCKETS.playmaking` now counts `passing`.
5. ~~**Retro-tier existing programs**~~ ✅ **DONE.** `PROGRAM_WEEK_TIERS` maps all 10 programs' weeks to
   T1→T3 (lengths verified against week counts) + `programWeekTier()`/`TIER_LABELS` helpers. Data only;
   a future week-badge UI can render it.

**Constraint note:** items 1–5 are mostly *data* (skillGraph fields, PROGRAMS entries, achievements.js
paths). New legend paths/programs surface through existing UI (the same way the Defense category did), so
no new UI components — but new PROGRAMS/paths are athlete-facing content, so each ships on approval.

---

## 5. Open question for direction

Two ways to sequence:
- **Foundation-first:** land the `tier` field (item 1), then everything else references it. Cleaner, but
  no new athlete-facing content until step 2.
- **Gap-first:** build the Lockdown Defender program (item 3) now — immediate, visible payoff on the Defense
  category we just shipped — then formalize tiers.

Recommendation: **Foundation-first for tiers is cheap and unblocks the rest**, but if you want a visible win,
the **Lockdown Defender program** is the fastest high-value build.

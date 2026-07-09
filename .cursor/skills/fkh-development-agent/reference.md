# FKH Development Agent — Reference

## Coach API quick reference

See `docs/COACH_AGENT_API.md` for full contract.

Client pattern:

```javascript
import { handleCoachRequest } from "../../src/lib/coachAgent.js";

const result = handleCoachRequest({
  intent: "gap_analysis",
  athleteContext: {
    settings: { dateOfBirth: "2014-06-15", experience: "intermediate", goals: ["defense"], playStyle: "guard" },
    completed: {},
    enrolledProgramIds: ["guard-handles"],
  },
});
// result.data.skillGaps, result.data.recommendedPrograms
```

## Pathway selection logic

`selectPathway({ goals, playStyle })` scores:
- +3 per matching `goalsMatch` keyword
- +2 if `playStyle` in `playStyles`
- +1 default for `complete-player` when goals empty

## Exercise skill resolution order

1. `EXERCISE_SKILL_OVERRIDES[exerciseId]`
2. `EXERCISE_META.basketballTransfer` → `TRANSFER_TO_SKILL`
3. `ID_SKILL_RULES` regex on id + name
4. `AREA_FALLBACK_SKILLS` for the exercise category's area

## Adding a skill override (example)

```javascript
// src/lib/exerciseSkills.js
"my-new-drill": { skills: ["cross", "hesitation"], tier: 2 },
```

## Program week tier alignment

`PROGRAM_WEEK_TIERS` in trainingCatalog.js — week N maps to T1/T2/T3. When drafting Week 3 of `lockdown-defender`, pull T2 skills: `closeout`, `containment`, `contest`.

## Orphan skills priority (no exercises yet)

High-value gaps for content: `hang`, `shamgod`, `dho_entry`, `transition_shot`, `reject_screen`, `recover_xout`, `pocket`, `reb_tipcontrol`.

## CI hooks

```bash
npm run verify:exercise-skills  # mapping coverage ≥85%
npm run verify:imports
npm run build
```

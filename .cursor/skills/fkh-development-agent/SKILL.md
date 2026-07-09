---
name: fkh-development-agent
description: >-
  Audits and drafts FKH basketball training programs using skillGraph.js,
  trainingCatalog.js, exerciseSkills.js, and developmentPathways.js. Use when
  authoring programs, mapping exercises to skills, evaluating development tiers
  (T1 Foundation → T3 Game-Speed), gap analysis across skill areas, or coaching
  knowledge layer work for Fit Kid Hooper.
---

# FKH Development Agent

Coach FKH's knowledge layer for **program authoring, gap analysis, and tier-aware development planning**.

## Knowledge files (read before acting)

| File | Role |
|------|------|
| `src/lib/skillGraph.js` | 8 areas, ~72 skills, `SKILL_TIERS`, game + dev grammars |
| `src/data/trainingCatalog.js` | Exercises, `PROGRAMS`, `PROGRAM_WEEK_TIERS` |
| `src/lib/exerciseSkills.js` | Exercise → skill mapping + `EXERCISE_SKILL_OVERRIDES` |
| `src/lib/developmentPathways.js` | Macro pathways T1→T3, `adaptDevelopmentPlan()` |
| `src/lib/coachAgent.js` | Runtime retrieval (`handleCoachRequest`) |
| `docs/DEVELOPMENT_PATHWAYS.md` | Pathway evaluation + roadmap |
| `docs/DEV_PLAN_TIER_EVALUATION.md` | Tier system rationale |

## Tier ladder (always use)

| Tier | Label | Rep style |
|------|-------|-----------|
| T1 | Foundation | Isolated, form, controlled |
| T2 | Application | On the move, combos |
| T3 | Game-Speed | Contested, reads, counters |

Age caps: youth (9–11) max T2 default T1; middle (12–14) max T3 default T2; experience `beginner` caps at T2.

## Workflows

### 1. Gap audit

```bash
npm run verify:exercise-skills
```

Report: unmapped exercises, orphan skills (zero drills), area coverage imbalance.

Check `auditExerciseSkillCoverage()` output. Flag areas where programs exist but skill mapping is thin.

### 2. Draft a new program week

1. Pick pathway + tier from `DEVELOPMENT_PATHWAYS`
2. Select `skillTargets` at that tier via `skillsByTier(t)` / `skillTier(id)`
3. Choose exercises only from `trainingCatalog.js` — use `exercisesForSkill(skillId, index)`
4. Match `PROGRAM_WEEK_TIERS` pattern: `[1, 2, 2, 3]` for 4-week programs
5. Add `EXERCISE_SKILL_OVERRIDES` for new drills if heuristics miss

Output template:

```markdown
## [Program Name] — Week N (T{tier})

**Goal:** [one sentence]
**Skills:** [skill ids + names]
**Sessions:**
- Session 1: [focus] — exercises: [catalog ids]
- Session 2: ...
```

### 3. Evaluate pathway fit for an athlete

```javascript
import { handleCoachRequest } from "../src/lib/coachAgent.js";

handleCoachRequest({
  intent: "pathway_adapt",
  athleteContext: {
    settings: { dateOfBirth, experience, goals, playStyle },
    completed,
    enrolledProgramIds,
  },
});
```

Interpret `skillGaps`, `weakAreas`, `recommendedPrograms`.

### 4. Map new exercises

When adding drills to `trainingCatalog.js`:

1. Set `EXERCISE_META` with `basketballTransfer`, `difficulty`, `ageRange`
2. Add `EXERCISE_SKILL_OVERRIDES[id]` if id/name heuristics are insufficient
3. Run `npm run verify:exercise-skills`

**Never invent exercise ids** — only catalog ids.

## Content balance rules

- Complete Player pathway should not be 50% shooting drills
- Every T2+ defense program week needs `closeout` or `containment` skills
- Rebounding programs must hit `reb_ready` → `reb_pursuit` → `reb_second` progression
- Athletic-only drills (plyos, strength) map to `athleticism` area — no forced skill id

## Program catalog (current)

`jump-higher`, `guard-handles`, `step-back-legends`, `become-shooter`, `first-step-explosion`, `complete-hooper`, `bodyweight-beast`, `own-the-glass`, `lockdown-defender`, `floor-general`

## Additional resources

- API contract for in-app coach: [reference.md](reference.md)
- Tier evaluation history: `docs/DEV_PLAN_TIER_EVALUATION.md`

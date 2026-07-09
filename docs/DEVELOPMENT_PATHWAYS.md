# FKH Development Pathways — Scalable Player Development

High-level programs that scale **T1 Foundation → T2 Application → T3 Game-Speed** across ages 9–17.

## The problem

FKH had three overlapping ladders (programs, legend paths, XP ranks) with no shared difficulty axis. Shooting was over-covered; rebounding and defense were starved. Difficulty was expressed as week number, legend rarity, or a binary age band — not as a coherent development model.

## The fix: one tier ladder everywhere

| Tier | Label | Rep character | Typical ages |
|------|-------|---------------|--------------|
| **T1** | Foundation | Stationary, form, slow, uncontested | 9–11 |
| **T2** | Application | On the move, combos, live speed | 11–14 |
| **T3** | Game-Speed | Contested, reads, counters | 13–17 |

Source of truth: `SKILL_TIERS` in `skillGraph.js` + `PROGRAM_WEEK_TIERS` in `trainingCatalog.js`.

## Macro pathways (agent-adaptable)

Defined in `src/lib/developmentPathways.js`:

| Pathway | Who | T1 → T2 → T3 arc |
|---------|-----|------------------|
| **Complete Player** | Any position, balanced goals | Bodyweight Beast + handles/shooting → Complete Hooper + defense/glass → First Step + Step-Back + Floor General |
| **Guard Development** | Guards, combo guards | Handles + shooter → Complete + Lockdown → Step-Back + Floor General + explosion |
| **Wing Development** | Forwards, wings | Shooter + athletic base → Complete + glass + lockdown → explosion + step-back |
| **Post & Rim** | Posts, centers | Beast + glass → Complete + lockdown → Jump Higher + glass (T3 rim) |
| **Athletic Foundation** | Jump/speed priority | Beast → Jump Higher + First Step → explosion + complete |

## How the agent adapts

`adaptDevelopmentPlan()` takes:

1. **Age** → maturity band (youth / middle / advanced youth) → default tier + cap
2. **Experience** → beginners capped at T2 until intermediate
3. **Goals + playStyle** → pathway selection
4. **Completed exercises** → inferred tier per skill area
5. **Enrolled programs** → filters recommendations

Output: target tier, phase label, skill gaps, weak areas, next program ids — all cite real catalog data.

## Gaps to close (content roadmap)

| Area | Status | Next step |
|------|--------|-----------|
| Rebounding | Program + path exist | Map more drills → `reb_*` skills |
| Defense | Program exists | Expand T3 contested drills |
| Passing | Floor General only | Standalone T1–T2 passing micro-program |
| Shooting | Over-covered | Rebalance toward defense/rebounding in Complete Player |
| Skill orphans | 33 skills with 0 exercises | Add drills or relax tier targets |

## Agent integration

- **Dev agent (Cursor):** `.cursor/skills/fkh-development-agent/` — audit, draft, gap analysis
- **Runtime:** `src/lib/coachAgent.js` — grounded retrieval
- **API:** `supabase/functions/coach-agent` + `docs/COACH_AGENT_API.md`

## Verification

```bash
npm run verify:exercise-skills
```

Target: ≥85% of exercises map to ≥1 skillGraph skill (athletic-only drills exempt).

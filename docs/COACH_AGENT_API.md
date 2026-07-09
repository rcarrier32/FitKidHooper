# Coach FKH Agent API

Grounded basketball development coach. **Data picks drills; the LLM only classifies intent — it never generates advice.**

## Architecture

```
Client (PWA)
  ├─ handleCoachRequest() in src/lib/coachAgent.js  ← retrieval + adaptation (always runs first, works offline)
  ├─ POST /functions/v1/coach-agent                 ← auth + optional LLM intent classification
  ├─ Client re-runs handleCoachRequest() locally with the LLM's corrected intent/skillIds
  └─ Citations: exercise ids + skill ids only (no hallucinated content)
```

The edge function's LLM call has exactly one job: given free text the client couldn't route with confidence, return `{intent, skillIds, hasInjury}` from a closed vocabulary (known intents, known skill ids). It never writes the message or picks the drills — those always come from the same deterministic `handleCoachRequest()` the client already ran locally. A malformed/hallucinated/failed classification falls straight back to the local regex router with zero risk of an invented answer reaching a kid.

Knowledge sources:
- `src/data/trainingCatalog.js` — exercises, programs
- `src/lib/skillGraph.js` — skills, tiers
- `src/lib/exerciseSkills.js` — exercise → skill mapping
- `src/lib/developmentPathways.js` — scalable T1→T3 pathways
- `src/lib/achievements.js` — Train Like Legends tracks (`legend_plan`) and shot-accuracy benchmarks (`benchmark_check`)
- `src/lib/pathRegistry.js` — curated player-name → track registry (also used by onboarding's "who do you play like" picker)
- `src/lib/personalChallenges.js` — weekly challenges surfaced alongside a legend plan, where a clean fit exists

## Endpoint

```
POST https://<project>.supabase.co/functions/v1/coach-agent
Authorization: Bearer <supabase_user_jwt>
Content-Type: application/json
```

## Request

```json
{
  "intent": "recommend_program",
  "message": "What should I work on this week?",
  "exerciseId": "bh-crossover",
  "skillId": "cross",
  "personalize": false,
  "athleteContext": {
    "settings": {
      "dateOfBirth": "2014-06-15",
      "experience": "intermediate",
      "goals": ["shooting", "handles", "defense"],
      "playStyle": "guard",
      "athleteName": "Braylen"
    },
    "completed": { "2026-07-08-bh-pound": true },
    "enrolledProgramIds": ["guard-handles"],
    "age": 12
  },
  "precomputed": {
    "message": "Based on your Application phase, start with Lockdown Defender.",
    "data": { },
    "citations": [{ "type": "skill", "id": "closeout" }]
  }
}
```

### Intents

| Intent | Purpose |
|--------|---------|
| `pathway_adapt` | Full development plan for age/experience/history |
| `recommend_program` | Next catalog program to enroll |
| `gap_analysis` | Skill gaps vs current pathway phase |
| `explain_drill` | Why an exercise matters (requires `exerciseId`) |
| `explain_skill` | Skill definition + catalog exercises |
| `search_exercises` | Exercises building one or more named skills (grouped by skill) |
| `legend_plan` | "Shoot like Steph" / "become a lockdown defender" — a Train Like Legends track, tier-appropriate signature drills, curated programs, and a related weekly challenge where one exists |
| `build_workout` | One custom session composed from the catalog to fit a stated duration/focus/equipment constraint |
| `week_plan` | Several non-repeating sessions across a week, built in a single response (no conversation memory needed) |
| `benchmark_check` | A reported made/attempted stat ("18/25 free throws") checked against real kid-calibrated thresholds in `achievements.js` |
| `off_topic` | Not a training question at all (trivia, unrelated topics) — reachable **only** via LLM classification; the local regex router never returns this, since a false positive here is worse than a harmless generic fallback |

Both `build_workout` and `week_plan` also honor a stated injury (`hasInjury` from the LLM classifier, or local regex on phrases like "sore ankle") by excluding high-impact exercises and prefacing the response with a safety note.

**Client-first, LLM-corrects:** the client always runs `handleCoachRequest()` locally first — this is the guaranteed, offline-capable, no-API-key-required baseline. When `personalize: true` and the request is free text the client couldn't route with an explicit intent (no quick-prompt button, no skill chip, no drill link), the edge function may return an LLM classification instead of an answer; the client re-runs `handleCoachRequest()` with that corrected `{intent, skillIds}` to get the final grounded answer. See `mode` in the response: `"local"` (no edge call), `"structured"` (edge call, no classification), `"llm_classified"` (edge call, classification applied).

## Response

```json
{
  "ok": true,
  "intent": "recommend_program",
  "message": "Based on your Application phase, start with 🛡️ Lockdown Defender.",
  "data": {
    "pathway": { "id": "guard-development", "name": "Guard Development" },
    "targetTier": 2,
    "tierLabel": "Application",
    "skillGaps": [{ "id": "closeout", "name": "Closeout", "tier": 2 }],
    "recommendedPrograms": [{ "id": "lockdown-defender", "name": "Lockdown Defender", "emoji": "🛡️" }],
    "primaryRecommendation": { "id": "lockdown-defender", "name": "Lockdown Defender" }
  },
  "citations": [
    { "type": "skill", "id": "closeout" },
    { "type": "program", "id": "lockdown-defender" }
  ],
  "mode": "structured"
}
```

## Development pathways (adaptation model)

Five macro pathways in `developmentPathways.js`, each with **3 tiers**:

| Tier | Label | Ages (typical) | Character |
|------|-------|----------------|-----------|
| T1 | Foundation | 9–11 | Isolated, form, controlled |
| T2 | Application | 11–14 | On the move, combos |
| T3 | Game-Speed | 13–17 | Contested, reads |

Adaptation inputs:
- `age` + `experience` → tier cap (beginners max T2 until intermediate)
- `completed` history → inferred area tiers
- `goals` + `playStyle` → pathway selection
- `enrolledProgramIds` → skip already-active programs

## Guardrails

- Basketball development only; no medical advice — a stated injury gets a lighter, safety-filtered workout and a "check with a parent or coach" note, never a diagnosis
- Citations must reference catalog exercise/skill/program ids — the LLM classifier can only pick from a closed vocabulary sent in its prompt (known intents, known skill ids); anything outside that list is rejected before use
- Kid-safe tone; parent can use same API
- **Not yet implemented:** no request rate limiting on the edge function (recommend ~20/user/day before production scale) — real cost/abuse exposure at scale, low priority at current usage

## Deploy

```bash
supabase functions deploy coach-agent
# Optional: supabase secrets set OPENAI_API_KEY=sk-...   # without it, classification silently no-ops and every request falls back to "structured" mode
```

`src/lib/skillGraph.js` and the edge function's `SKILL_MANIFEST` constant (id:name pairs used in the classification prompt) are kept in sync **by hand** — update both when adding/removing skills.

## Client usage

```javascript
import { invokeCoachAgent, buildCoachAthleteContext } from "./lib/coachAgentApi.js";

const athleteContext = buildCoachAthleteContext({ settings: profile, completed, enrolledPrograms });

// Handles local-first, edge classification, and fallback automatically.
const res = await invokeCoachAgent({
  intent: null,              // null for free text; an explicit intent for quick-prompt/skill-chip/drill-link UI
  message: "how can I get better at crossover",
  athleteContext,
  personalize: isSignedIn,
});
// res.mode: "local" | "structured" | "llm_classified"
```

Calling `handleCoachRequest()` from `coachAgent.js` directly (as in the old example) skips the edge/classification layer entirely — fine for tests or server-side use, but the app itself should go through `invokeCoachAgent()`.

## Verification

```bash
npm run verify:exercise-skills   # catalog mapping coverage
npm run verify:coach-agent       # routing/retrieval regression suite — see scripts/verify-coach-agent.mjs
```

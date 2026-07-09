# Coach FKH Agent API

Grounded basketball development coach. **Data picks drills; LLM only explains.**

## Architecture

```
Client (PWA)
  ├─ handleCoachRequest() in src/lib/coachAgent.js  ← retrieval + adaptation
  ├─ POST /functions/v1/coach-agent                 ← auth + optional LLM voice
  └─ Citations: exercise ids + skill ids only (no hallucinated content)
```

Knowledge sources:
- `src/data/trainingCatalog.js` — exercises, programs
- `src/lib/skillGraph.js` — skills, tiers
- `src/lib/exerciseSkills.js` — exercise → skill mapping
- `src/lib/developmentPathways.js` — scalable T1→T3 pathways

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
| `search_exercises` | Exercises building a skill |

**Phase 2 pilot:** Client runs `handleCoachRequest()` locally, sends `precomputed` payload. Edge function validates auth and optionally personalizes tone.

**Phase 3:** Edge function bundles `coachAgent.js` server-side and loads completion from Supabase.

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

- Basketball development only; no medical advice
- Citations must reference catalog exercise/skill/program ids
- Kid-safe tone; parent can use same API
- Rate limit: recommend 20 requests/user/day in production

## Deploy

```bash
supabase functions deploy coach-agent
# Optional: supabase secrets set OPENAI_API_KEY=sk-...
```

## Client usage

```javascript
import { handleCoachRequest } from "./lib/coachAgent.js";

const local = handleCoachRequest({
  intent: "recommend_program",
  athleteContext: {
    settings: profile,
    completed,
    enrolledProgramIds: enrolled.map((p) => p.id),
  },
});

// Optional: personalize tone via edge
const res = await supabase.functions.invoke("coach-agent", {
  body: {
    intent: local.intent,
    personalize: true,
    athleteContext: { settings: profile },
    precomputed: {
      message: local.message,
      data: local.data,
      citations: local.data?.citations,
    },
  },
});
```

## Verification

```bash
npm run verify:exercise-skills   # mapping coverage
node -e "import { handleCoachRequest } from './src/lib/coachAgent.js'; console.log(handleCoachRequest({ intent: 'gap_analysis', athleteContext: { settings: { playStyle: 'guard', goals: ['defense'] } } }));"
```

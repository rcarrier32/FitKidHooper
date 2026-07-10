# Coach FKH — Proactive Greeting Roadmap

Today, Coach FKH is pull-only: it answers when a kid taps a card or the "Ask Coach" button. This doc plans a **proactive daily greeting** — Coach surfacing something on the Today tab without being asked — in two tiers, so the free version ships now and the LLM version is a deliberate, revenue-gated upgrade later, not a default.

Related: [`COACH_AGENT_API.md`](COACH_AGENT_API.md) for the existing architecture and the "data picks drills, LLM only classifies — never generates content reaching a kid" boundary this plan extends.

---

## Tier 1 — Rule-based daily greeting (build now, $0 marginal cost)

**Goal:** Make Coach feel alive on the Today tab without spending a cent on inference.

**What it needs:**
- Extend `buildAthleteContext()` (`src/lib/coachAgent.js:186-204`) / `buildCoachAthleteContext()` (`src/lib/coachAgentApi.js:7-23`) to include `challengeProgress` and a computed streak — both exist in app state today but aren't passed into coach context (only `enrolledProgramIds` and the completed-exercise map are).
- A small deterministic template library keyed off that state (e.g. streak length, yesterday's trained category, an in-progress challenge) — plain string interpolation, no model call. E.g. "You crushed shooting yesterday — let's work on ball handling today" or "3-day streak — one more session locks in the badge."
- Delivery: piggyback on the existing daily cron. `send-push` (`supabase/functions/send-push/index.ts:28-81`) already loops over every athlete's subscription once a day — add a step there that computes and caches one greeting string per athlete, so the Today card reads a precomputed value at load instead of generating anything live.
- No API key, no per-request cost, no latency risk.

**Ships as part of:** the broader Coach-discoverability work (onboarding intro, tour step, card animation) already agreed separately.

---

## Tier 2 — LLM-backed greeting (future, gated on users + revenue)

**Goal:** Replace templated sentences with real synthesis that references chat history and ties multiple signals together in natural language — e.g. "You asked me about your first step last week — today's session builds on that."

**Prerequisites (net-new infrastructure, not currently present):**
- **Chat history persistence** — does not exist at all today. `CoachFKHSheet.jsx` keeps only the single last response in memory; the edge function is stateless per request. Needs a `coach_messages` table (athlete_id, role, content, created_at) with RLS matching the existing per-athlete data isolation pattern.
- Tier 1's context wiring (streak, challenges) already in place.
- A real API key turned on for the first time — `coach-agent/index.ts` already has an OpenAI classification path stubbed in and intentionally disabled in production (`OPENAI_API_KEY` unset, see `docs/COACH_AGENT_API.md`). Tier 2 would either enable that path for greeting generation or add an Anthropic call — either way this is the first time the system incurs real per-request inference cost.

**What changes when Tier 2 ships:**
- Cost is bounded to 1 LLM call per athlete per day, using the same daily-cron slot Tier 1 already occupies — not a call per screen load.
- Preserve the existing safety boundary: the LLM drafts phrasing only; the underlying facts (streak count, challenge name, category name) stay deterministic and grounded, never invented — same principle already enforced for coach responses in general.

---

## When to consider flipping to Tier 2

- A revenue source exists (monetization is currently deferred per the RC1 growth-window decision) to justify a recurring per-athlete cost.
- Real usage data shows the templated greeting has gone stale or isn't moving engagement — per this project's standing rule that new roadmap items need data behind them, not speculation.
- Founder call, not an automatic trigger on DAU alone.

## Risks

- Per-athlete recurring LLM cost scales linearly with DAU — needs a cost ceiling/budget check before enabling broadly.
- Tone/safety: content must stay grounded, not freely generated, given the kid audience — reuse the classification-only boundary already established in `coach-agent/index.ts`.
- Chat history storage is a new surface holding kids' messages — must ship with RLS from day one, not retrofitted.

## Decision log

| Date       | Decision                                                        |
|------------|-------------------------------------------------------------------|
| 2026-07-10 | Ship Tier 1 (rule-based, free) now; defer Tier 2 (LLM) until a revenue source or strong usage signal justifies the cost |

# Coach-Centric IA Roadmap

The original framing (from outside feedback on Coach FKH's discoverability) was to stop treating Coach FKH as one feature among several and instead make it feel like the thing that powers the whole app:

```
Workout App                    Coach FKH
├── Missions          →        ├── Today's Workout
├── Programs                   ├── Missions
└── Coach FKH                  ├── Programs
                                ├── Challenges
                                └── Progress
```

This doc plans that shift in tiers so the cheap, reversible parts ship now and the expensive, hard-to-reverse part (an actual navigation/IA rewrite) waits for evidence it's worth it. See [COACH_PROACTIVE_ROADMAP.md](COACH_PROACTIVE_ROADMAP.md) for the related (but separate) plan to make Coach's greeting itself smarter — this doc is about *where Coach sits in the app's structure*, not what it says.

---

## Tier 1 — Light-touch presence (shipped)

Already built: first-run "Meet Coach FKH" intro right after onboarding, a tour step calling out the Coach card, a one-time highlight animation on the Today card, and richer chat context (streak, active challenges). This got Coach FKH *discovered* without touching navigation or how any other tab works.

## Tier 2 — Habit-loop CTAs (not built, recommended next step before any IA change)

**Goal:** test the actual hypothesis behind "everything under Coach" — that surfacing Coach at more decision points drives the "whenever I don't know what to do, I ask Coach" habit — without committing to a structural rewrite.

**What it would be:** a small "Ask Coach what's next →" CTA at 2–3 high-frequency completion moments (workout complete, mission complete first), reusing the exact same `coachInitialQuery` → `CoachFKHSheet` mechanism already wired up. Purely additive — no existing screen changes shape, no renamed tabs, no new events that would break the `analytics_top_screens` continuity we rely on for the admin dashboard.

**Why this matters before Tier 3:** it's the cheapest possible way to get real signal — if kids tap that CTA meaningfully often, that's evidence a bigger structural bet is worth making. If they don't, a full IA rewrite would have been solving a problem that wasn't there.

## Tier 3 — Full IA reframe (deferred, data-gated)

**What "everything under Coach" would actually require:**
- Reframing the Today tab's presentation as Coach's voice ("here's what I've got for you today") instead of generic app copy — a content/tone change, moderate effort.
- Threading a "Coach's take" into Programs, Challenges, and Progress/Me — e.g. Coach-authored recommendation blurbs on those screens, not just Today. Touches four screens' worth of layout.
- Possibly making Coach access persistent/global (e.g. sticky entry point across all tabs) rather than a card on Today + Me only.
- Rewriting onboarding, the guided tour, and any marketing copy to introduce the app as "your AI coach" first, workouts/programs second.
- Likely renaming/restructuring the bottom nav itself, which changes `screen_view` event names — breaking continuity with the `analytics_top_screens` history we just built the admin dashboard around, and resetting kids' muscle memory for an app that real athletes are already using daily.

**Impact assessment:**
- **Upside, if the hypothesis holds:** stronger differentiation from competitors (a "personal trainer" is a much harder story to copy than "a workout app with a chatbot bolted on"), and a real shot at the habit-formation behavior change the original feedback was after.
- **Cost/risk:**
  - Large surface area — five-plus screens, onboarding, tour, and analytics event naming all move together, which makes this hard to ship incrementally or roll back cleanly.
  - No usage data yet. Coach FKH's chat and proactive card only shipped this session — we don't yet know if kids use it at all, let alone whether more Coach presence would help retention or just add noise.
  - Runs against this project's own standing rule: new roadmap bets need data behind them, not a compelling narrative alone.
  - Risk of reading as more abstract/corporate to a 9–14-year-old than concrete, literal tabs like Shots/Programs/Challenges — the audience that's actually driving this app's differentiation (kid-first, not gamification-first).
  - A full rewrite while real athletes are mid-RC1 risks a confusing, hard-to-diagnose engagement dip that gets conflated with an actual regression.

**When to revisit:** once Tier 2's CTAs (or the Tier 1 card/chat itself) show real usage — open rate, follow-through, and ideally a retention correlation — not simply because the narrative is appealing. Founder call, same as every other roadmap item here.

## Decision log

| Date       | Decision                                                                 |
|------------|---------------------------------------------------------------------------|
| 2026-07-10 | Ship Tier 1 (light-touch presence). Hold Tier 3 (full IA reframe) pending usage data; Tier 2 (CTAs) recommended as the next cheap signal-gathering step if/when picked back up. |

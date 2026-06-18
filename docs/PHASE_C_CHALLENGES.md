# Phase C — Challenges

The retention engine, built entirely on existing primitives. A challenge is a
**time-windowed competition on an existing metric, scoped to a board population.**
It reuses the friends board for standings and the achievement ledger for rewards —
no new tracking, ranking, or reward system.

## Shipped (this phase)

- **`challenges` table** (`supabase/challenges.sql`) — one row per challenge.
  `scope` (global/friends/team) + `period` (week/month) + `metric`. Group, seasonal,
  and community challenges are the *same table* with different scope/window — not
  separate systems. Definitions are public-read, non-PII; no client writes.
- **First live challenge** — seeded `weekly-makes` (most `shots_made` this week).
- **`challengesApi.js`** — `fetchActiveChallenges()` and `fetchChallengeStanding()`,
  which sort the existing friends board by the challenge's metric. No new queries
  against new tables.
- **`ChallengeStrip.jsx`** — renders **directly beneath the Daily Mission** on Home
  (never its own nav tab, per the product principle). Shows your rank among friends,
  the gap to the leader, and a **goal progress bar** toward the reward. Renders
  nothing until there's something to show (unconfigured / no friends → quiet nudge).
- **Reward granting (automated)** — rewards are **effort-based**: reach the goal in
  the period → earn the cosmetic. Because a cosmetic unlocks once, the ledger PK
  makes granting idempotent — **no award-tracking table, no winner-resolution.**
  - `settle_challenges()` (security-definer, `pg_cron` every 6h) grants to everyone
    who's hit the goal — the backstop.
  - `claim_my_challenge_rewards()` (client calls on open) grants the caller's own
    rewards immediately, validated server-side against their synced stats.
  - The ledger is also re-parented on sign-in (`claim_device_stats`) so a reward
    earned on the device survives account creation.

## Deferred (intentionally — additive, no redesign required)

| Deferred | Why it waits | What unlocks it |
|---|---|---|
| **Challenge creation UI** | First challenges are seeded via SQL by us. Self-serve creation isn't needed at this scale. | A small admin form (or `/challenges` skill) writing rows; RLS already blocks client writes. |
| **Competitive (single-winner) rewards** | Current rewards are effort-based (everyone who hits the goal), which is simpler and developmentally sounder than zero-sum. | Per-friend-group winner resolution + a `challenge_awards` idempotency table, only if a "beat your friends" exclusive is wanted. |
| **Team & Coach challenges** (`scope='team'`) | Depends on team boards / coach roster, which are a later phase. | The Coach phase (board `role='coach'` + roster RLS). `scope='team'` already exists in the schema. |
| **Seasonal / community exclusives** | The mechanism is the same row with a date window + a unique `reward_achievement_id`. Just content + the reward-granting job. | Ships with reward automation above. |
| **`athlete_metric_stats` (tall ranking table)** | Only needed to rank a metric `leaderboard_stats` doesn't already hold. The current metrics (makes/xp/days/streak) are all present. | A future challenge on a metric not in `leaderboard_stats` (e.g. accuracy from a Benchmarks phase). |
| **Accuracy-based challenges/tracks** | Mastery tracks + challenges currently use volume metrics. Accuracy needs measured-input benchmarks. | The **Benchmarks** mini-phase (log a test → certifications → metrics), which feeds the same ledger. |

## Architectural guarantees preserved

- **One ledger** still owns every earned thing; challenge rewards are ledger rows.
- **One board engine** computes standings; challenges don't fork it.
- **Challenges reinforce the Daily Mission** and never become a nav destination.
- Adding reward automation, team scope, or seasonal content is **additive** — no
  table or component built here needs to change.

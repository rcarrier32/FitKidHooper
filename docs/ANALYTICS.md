# Fit Kid Hooper — Product Analytics

Lightweight instrumentation for learning from the first ~100 users. Uses the same Supabase project as the leaderboard — no third-party analytics SDK.

## Goals

| Question | Events / views |
|----------|----------------|
| Are kids returning? | `session_start`, `analytics_dau`, `analytics_wau`, `analytics_retention` |
| What features do they use? | `screen_view`, `analytics_top_screens` |
| What drives improvement? | `exercise_complete`, `shot_session`, `program_session_complete` |
| What builds habits? | `mission_claim`, `workout_complete`, `analytics_training_days_per_week` |
| Parent / kid feedback? | `feedback` table, Settings → Feedback Center |

## Setup

1. Run `supabase/schema.sql` (leaderboard) if not already applied.
2. Run `supabase/analytics.sql` in the Supabase SQL editor.
3. Run `supabase/storage.sql` for the `fkh-videos` bucket.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same as leaderboard).
4. Optional: `VITE_APP_VERSION` for release tagging; `VITE_ADMIN_DASHBOARD_KEY` for dashboard access.

## Privacy (COPPA-conscious)

- **No names, DOB, or avatars** are sent in events or feedback.
- **Device UUID** (`fkh-athlete-id`) links events on one device only.
- **Age group** bracket (`u10` / `u12` / `u14` / `u17`) is optional segmentation — same as leaderboard.
- Feedback messages are optional free text — avoid entering real names.

Before a broader launch, tighten RLS `SELECT` policies on `events` and `feedback` (currently open for small-team MVP).

## Client API

```js
import { track, trackScreen, trackExerciseComplete, initAnalytics } from "./lib/analytics.js";
import { ANALYTICS_EVENTS } from "./lib/analyticsTypes.js";
```

| Function | Purpose |
|----------|---------|
| `initAnalytics({ ageGroup, isStandalone })` | Session start, flush timer, offline queue |
| `track(name, props)` | Queue event for batched upload |
| `trackScreen(screen)` | `screen_view` |
| `trackExerciseComplete(id, source)` | `exercise_complete` + first-time activation |
| `submitFeedback({ rating, sentiment, category, message })` | Direct insert to `feedback` |

Events are queued in `localStorage` (`fkh-analytics-queue`) and flushed every 30s, on background, or when the queue reaches 40 items.

## Tracked events

| Event | When |
|-------|------|
| `session_start` | App load / return from background |
| `session_end` | Tab hidden / page unload |
| `screen_view` | Tab or major view change |
| `onboarding_complete` | First-run name flow finished |
| `first_exercise_complete` | First drill ever checked off |
| `exercise_complete` | Any drill marked done |
| `mission_claim` | Daily mission auto-claimed |
| `program_enroll` | Start Program tapped |
| `program_session_complete` | All exercises in a program session done |
| `challenge_complete` | Challenge threshold met (once per challenge) |
| `badge_earn` | New badge unlocked |
| `workout_complete` | Quick workout template fully done for the day |
| `shot_session` | Shot batch logged |
| `video_play` | Exercise video played |
| `level_up` | XP rank increased |
| `leaderboard_push` | Opt-in stats push to Ranks |

## SQL views (Supabase SQL editor)

| View | Metric |
|------|--------|
| `analytics_dau` | Daily active users |
| `analytics_wau` | Weekly active users |
| `analytics_mau` | Monthly active users |
| `analytics_retention` | D1 / D7 / D30 by cohort |
| `analytics_sessions_per_week` | Avg sessions per athlete |
| `analytics_training_days_per_week` | Avg training days per athlete |
| `analytics_top_screens` | Feature usage |
| `analytics_top_exercises` | Most completed drills |
| `analytics_top_programs` | Program session completions |
| `analytics_mission_completion` | Mission claim rate |
| `analytics_challenge_completion` | Per-challenge completions |
| `analytics_badge_distribution` | Badge earn counts |
| `analytics_athlete_summary` | Active / new / total athletes |
| `feedback_summary` | Ratings and sentiment |
| `feedback_feature_requests` | Feature ideas |
| `feedback_bugs` | Bug reports |
| `feedback_general` | General feedback |

### Example queries

```sql
-- Last 7 days DAU
select * from analytics_dau limit 7;

-- Retention for recent cohorts
select cohort_day, cohort_size, d1_pct, d7_pct, d30_pct
from analytics_retention
order by cohort_day desc
limit 14;

-- Top exercises this month
select * from analytics_top_exercises limit 20;
```

## In-app surfaces

- **Feedback Center** — Settings → Open Feedback Center (thumbs, 1–5 stars, category, message).
- **Admin dashboard** — `https://your-app/?admin=1` or `?admin=YOUR_KEY` if `VITE_ADMIN_DASHBOARD_KEY` is set.

## Integration map

| Location | Tracking |
|----------|----------|
| `SummerTrainingApp` mount | `initAnalytics`, `screen_view` |
| `toggle()` / program exercise | `exercise_complete` |
| Mission auto-claim effect | `mission_claim` |
| `enrollProg()` | `program_enroll` |
| Program progress effect | `program_session_complete` |
| Challenge effect | `challenge_complete` |
| Badge celebration effect | `badge_earn` |
| Quick workout complete effect | `workout_complete` |
| Onboarding button | `onboarding_complete` |
| `ShotTracker.logBatch` | `shot_session` |

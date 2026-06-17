# FKH Fit Kid Hooper — Observation Log

**App:** https://rcarrier32.github.io/FitKidHooper/  
**Backend:** [supabase.com](https://supabase.com) (one project for leaderboard + analytics + video hosting)  
**Goal:** Learn from real athlete behavior to drive product decisions for the first ~100 users.

---

## Observation Mode Rules

### Allowed
✅ Bug fixes  
✅ UX improvements (friction reduction)  
✅ Content additions (exercises, drills, coach tips, FKH videos)  
✅ Lightweight analytics and feedback (no enterprise stack)

### Still deferred (not RC2 scope unless data demands it)
❌ User accounts / login  
❌ Full cloud sync of local progress  
❌ Social features beyond opt-in leaderboard  
❌ Third-party analytics (Mixpanel, GA, PostHog)

---

## ⚠️ Supabase Setup — REQUIRED (you have not finished this)

> **Status: 2026-06-16** — Analytics + feedback + leaderboard code is **shipped in the app**.  
> Events will **not** reach the database until you complete the steps below.

The app sends data to Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in the build **and** the SQL migrations have been run.

### Quick links

| Resource | Path / URL |
|----------|------------|
| Supabase dashboard | https://supabase.com/dashboard |
| Leaderboard schema | `supabase/schema.sql` |
| Analytics schema | `supabase/analytics.sql` |
| Full analytics docs | `docs/ANALYTICS.md` |
| Production app | https://rcarrier32.github.io/FitKidHooper/ |
| Admin dashboard | https://rcarrier32.github.io/FitKidHooper/?admin=1 |

---

## Supabase setup checklist

Work through in order. Check each box when done.

### A. Project & secrets

- [ ] **A1.** Create or open your Supabase project at [supabase.com](https://supabase.com)
- [ ] **A2.** Copy **Project URL** and **anon public** key (Settings → API)
- [ ] **A3.** Add to **GitHub Actions secrets** (for production deploy):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] **A4.** Add same values to local `.env.local` for dev testing
- [ ] **A5.** (Optional) Set `VITE_ADMIN_DASHBOARD_KEY` in secrets + use `?admin=YOUR_KEY` on prod
- [ ] **A6.** (Optional) Set `VITE_APP_VERSION` to tag events by release (e.g. `rc2`)

### B. Database — run SQL in Supabase SQL Editor

Run **both** files in order (paste full file → Run):

- [ ] **B1.** `supabase/schema.sql` — leaderboard tables  
  - Creates: `athlete_profiles`, `leaderboard_stats`  
  - Enables RLS + anon read/upsert policies

- [ ] **B2.** `supabase/analytics.sql` — product intelligence  
  - Creates tables: `events`, `athlete_analytics`, `feedback`  
  - Creates **17 analytics views** (DAU, WAU, MAU, retention, top screens/exercises/programs, mission rate, etc.)  
  - Creates feedback views: `feedback_general`, `feedback_bugs`, `feedback_feature_requests`, `feedback_summary`  
  - Enables RLS + anon insert/select (MVP — tighten before public scale)

### C. Verify tables exist

In Supabase → **Table Editor**, confirm these tables appear:

| Table | Purpose |
|-------|---------|
| `athlete_profiles` | Leaderboard display names (opt-in push) |
| `leaderboard_stats` | Aggregated XP / shots / streak per period |
| `events` | Anonymous behavioral events from the app |
| `athlete_analytics` | One row per device — cohort anchor for retention |
| `feedback` | In-app Feedback Center submissions |

### D. Verify views exist

In Supabase → **SQL Editor** → run:

```sql
select table_name from information_schema.views
where table_schema = 'public' and table_name like 'analytics_%' or table_name like 'feedback_%'
order by 1;
```

Expected views include:

| View | Answers |
|------|---------|
| `analytics_dau` | Daily active users |
| `analytics_wau` | Weekly active users |
| `analytics_mau` | Monthly active users |
| `analytics_retention` | D1 / D7 / D30 retention by cohort |
| `analytics_sessions_per_week` | Avg sessions per athlete per week |
| `analytics_training_days_per_week` | Avg training days per athlete per week |
| `analytics_top_screens` | Most visited screens |
| `analytics_top_exercises` | Most completed exercises |
| `analytics_top_programs` | Most completed program sessions |
| `analytics_mission_completion` | Daily mission claim rate |
| `analytics_challenge_completion` | Challenge completion counts |
| `analytics_badge_distribution` | Badge earn distribution |
| `analytics_athlete_summary` | Active / new / total athletes (7d) |
| `feedback_summary` | Ratings, thumbs, counts by category |
| `feedback_feature_requests` | Feature ideas |
| `feedback_bugs` | Bug reports |
| `feedback_general` | General feedback |

### E. Verify the app is connected

- [ ] **E1.** Redeploy after secrets are set (push to `main` or manual workflow run)
- [ ] **E2.** Open the app on a test device, use it for 1–2 minutes (open tabs, complete a drill, submit feedback)
- [ ] **E3.** In Supabase → `events` table → confirm new rows with `session_start`, `screen_view`, etc.
- [ ] **E4.** In Supabase → `athlete_analytics` → confirm one row for your test device UUID
- [ ] **E5.** Settings → **Open Feedback Center** → submit test feedback → confirm row in `feedback`
- [ ] **E6.** Open admin dashboard: https://rcarrier32.github.io/FitKidHooper/?admin=1 — confirm metrics load (not “Supabase is not configured”)

### F. Leaderboard (separate from analytics)

- [ ] **F1.** Set athlete name in Settings (not default “Champ”)
- [ ] **F2.** Ranks tab → push stats → confirm `leaderboard_stats` updates

### G. Before 100 users (security note)

- [ ] **G1.** Review RLS: `events` and `feedback` currently allow public SELECT (fine for small team + admin dashboard)
- [ ] **G2.** Before broader launch: restrict SELECT to service role or add auth — see `docs/ANALYTICS.md`

---

## What the app collects automatically (once Supabase is live)

### COPPA-conscious rules
- **No names, DOB, or avatars** in events or feedback payloads
- **Device UUID only** (`fkh-athlete-id` in localStorage) — same ID as leaderboard
- **Age bracket** (`u10` / `u12` / `u14` / `u17`) for segmentation — not exact age
- Feedback message is optional free text — remind athletes/parents not to include real names

### Events tracked (→ `events` table)

| Event | Product question it answers |
|-------|----------------------------|
| `session_start` / `session_end` | Are kids returning? How long are sessions? |
| `screen_view` | What features do they actually use? |
| `onboarding_complete` | Activation funnel |
| `first_exercise_complete` | Time-to-value |
| `exercise_complete` | Training volume, top drills, improvement signal |
| `mission_claim` | Habit formation (daily mission stickiness) |
| `program_enroll` | Program adoption |
| `program_session_complete` | Program completion funnel |
| `challenge_complete` | Challenge engagement |
| `badge_earn` | Milestone / progression |
| `workout_complete` | Quick workout completion |
| `shot_session` | Shooting practice volume |

Events queue offline in `localStorage` (`fkh-analytics-queue`) and batch-upload every ~30s or on background.

### Feedback (→ `feedback` table)

**In-app:** Settings → **Open Feedback Center**

| Field | Options |
|-------|---------|
| Sentiment | 👍 thumbs up / 👎 thumbs down |
| Rating | 1–5 stars |
| Category | General / Bug / Feature idea |
| Message | Optional free text |

---

## Manual observation vs automated data

Use **both** during the first cohort. Automated data scales; sit-beside observation catches confusion the metrics miss.

| Manual log (below) | Automated replacement |
|--------------------|----------------------|
| Screen Visits tally | `analytics_top_screens` |
| Exercise Completions top 10 | `analytics_top_exercises` |
| Program session completed | `analytics_top_programs` + `program_session_complete` events |
| Retention Check tables | `analytics_retention`, `analytics_dau`, `analytics_wau` |
| Feature Requests (raw) | `feedback_feature_requests` + Feedback Center |
| Bug Reports | `feedback_bugs` + Feedback Center |
| Parent Feedback | `feedback` (any category) + Feedback Center |
| Average session length | `session_end` → `properties.duration_sec` |
| Daily Mission completed | `analytics_mission_completion` |

**Keep logging manually:** confusion, exact quotes, parent-present context, device-specific bugs.

---

## Per-Session Log (qualitative — still valuable)

> One row per athlete session. Automated metrics do not capture confusion or delight.

| Date | Athlete | Age | Opened First | Used Most | Ignored | Confusing | Liked | Feature Request | Parent Present |
|------|---------|-----|-------------|-----------|---------|-----------|-------|-----------------|---------------|
|      |         |     |             |           |         |           |       |                 |               |

---

## Direct Quotes

> Exact words from athletes and parents. Do not paraphrase.

| Date | Who (Athlete / Parent) | Quote |
|------|------------------------|-------|
|      |                        |       |

---

## Friction Points

> Things that slowed athletes down, caused hesitation, or required explanation.

| Date | Screen | What Happened | Severity (Low / Med / High) |
|------|--------|---------------|----------------------------|
|      |        |               |                            |

---

## Bug Reports

> Also encourage in-app Feedback Center → **Bug** category.

| Date | Device / OS | Screen | Description | Reproducible | Status |
|------|-------------|--------|-------------|--------------|--------|
|      |             |        |             |              | Open   |

---

## Feature Requests (raw — no filtering)

> Also logged automatically when submitted via Feedback Center → **Feature idea**.

| Date | Requested By | Request |
|------|-------------|---------|
|      |              |         |

---

## Parent Feedback

| Date | Parent | Feedback | Positive / Concern |
|------|--------|----------|--------------------|
|      |        |          |                    |

---

## Weekly review queries (run in Supabase SQL Editor)

After Supabase is live, use these instead of hand-counting tallies.

```sql
-- Health snapshot
select * from analytics_athlete_summary;
select * from analytics_dau limit 7;
select * from analytics_wau limit 4;

-- Retention
select cohort_day, cohort_size, d1_pct, d7_pct, d30_pct
from analytics_retention
order by cohort_day desc
limit 14;

-- Feature usage
select * from analytics_top_screens limit 15;
select * from analytics_top_exercises limit 15;
select * from analytics_top_programs;

-- Habits
select * from analytics_mission_completion limit 14;
select * from analytics_training_days_per_week limit 8;
select * from analytics_sessions_per_week limit 8;

-- Progression
select * from analytics_challenge_completion;
select * from analytics_badge_distribution;

-- Feedback
select * from feedback_summary;
select message, rating, created_at from feedback_feature_requests limit 20;
select message, created_at from feedback_bugs limit 20;
```

**Or** open the in-app admin dashboard:  
https://rcarrier32.github.io/FitKidHooper/?admin=1

---

## Retention Check — End of Week 1

| Metric | Count | SQL / source |
|--------|-------|--------------|
| Total athletes (devices) | | `analytics_athlete_summary.total_athletes` |
| Athletes active in last 7d | | `analytics_athlete_summary.active_athletes_7d` |
| New athletes in last 7d | | `analytics_athlete_summary.new_athletes_7d` |
| DAU (latest day) | | `analytics_dau` |
| WAU (latest week) | | `analytics_wau` |
| D1 retention (latest cohort) | | `analytics_retention.d1_pct` |
| Mission claim rate (avg) | | `analytics_mission_completion.mission_rate_pct` |
| Top screen | | `analytics_top_screens` row 1 |
| Top exercise | | `analytics_top_exercises` row 1 |
| Feedback submissions | | `feedback_summary.total` |

---

## Retention Check — End of Week 2

| Metric | Count | SQL / source |
|--------|-------|--------------|
| D7 retention (latest cohort) | | `analytics_retention.d7_pct` |
| Avg sessions per athlete / week | | `analytics_sessions_per_week` |
| Avg training days per athlete / week | | `analytics_training_days_per_week` |
| Program with most session completions | | `analytics_top_programs` row 1 |
| Most earned badge | | `analytics_badge_distribution` row 1 |
| Top feature request | | `feedback_feature_requests` |
| Biggest surprise (qualitative) | | Manual notes |

---

## End-of-Window Observations Summary

> Complete after cohort window closes. Pull numbers from SQL views; write insights here.

### Most Used Features
1. 
2. 
3. 

### Least Used Features
1. 
2. 
3. 

### Biggest Friction Points
1. 
2. 
3. 

### Parent Feedback Summary
> 

### Athlete Feedback Summary
> 

---

## Prioritized backlog (data-driven)

> If it does not appear in observation data **or** analytics, it does not enter the roadmap.

| Priority | Item | Signal | Source | Est. Effort |
|----------|------|--------|--------|-------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Product baseline reference

| Metric | Value |
|--------|-------|
| Total exercises | ~220 |
| Workout templates | 6 |
| Training programs | 5 |
| Total badges | 27 |
| Shot zones | 9 court + 6 quick-tap |
| Tracked event types | 13 |
| Analytics SQL views | 17 |
| In-app feedback | Settings → Feedback Center |
| Admin dashboard | `?admin=1` on app URL |

---

## Infrastructure status log

| Date | Item | Status |
|------|------|--------|
| 2026-06-01 | Supabase project | ⚠️ Needed — noted in original RC1 log |
| 2026-06-16 | `events` + `feedback` tables + views | ✅ SQL in `supabase/analytics.sql` — **run in dashboard** |
| 2026-06-16 | Client `track()` + offline queue | ✅ Shipped in app |
| 2026-06-16 | Feedback Center (Settings) | ✅ Shipped in app |
| 2026-06-16 | Admin product dashboard | ✅ Shipped (`?admin=1`) |
| 2026-06-16 | GitHub secrets + redeploy | ❌ **You still need to do this** |
| 2026-06-16 | Run `schema.sql` + `analytics.sql` | ❌ **You still need to do this** |
| 2026-06-16 | End-to-end verification (E1–E6) | ❌ **You still need to do this** |

---

*Created: 2026-05-30*  
*Last updated: 2026-06-16*  
*Next action: Complete Supabase checklist sections A → E*

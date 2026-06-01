# FKH Fit Kid Hooper — RC1 Observation Log

**Mode:** Observation Only  
**Release:** RC1 — https://rcarrier32.github.io/FitKidHooper/  
**Tag:** `rc1`  
**Observation Window:** 2 weeks from first real-athlete session  
**Goal:** Let real athlete behavior determine RC2 — not assumptions.

---

## Observation Mode Rules

### Allowed
✅ Bug fixes  
✅ UX improvements (friction reduction)  
✅ Content additions (exercises, drills, coach tips, coachNotes, commonMistakes, progressionTips)  
✅ FKH original video creation and integration  

### Not Allowed
❌ New major systems  
❌ New tabs  
❌ New gamification layers  
❌ Accounts, profiles, or cloud sync  
❌ Leaderboards or social features  
❌ Phase 14 or beyond  

---

## ⚠️ Infrastructure Gap — Needs Resolution Before Window Closes

> **Noted: 2026-06-01**

The observation window is running but has **no automated data collection**. All tracking below must currently be done manually (sit-beside observation). This limits the quality of the RC2 backlog.

### What's missing
| Gap | Impact |
|-----|--------|
| No Supabase project | No backend to write events or feedback to |
| No in-app feedback button | Athletes/parents have no way to submit reports |
| No usage analytics | Category visits, exercise completions, program enrollments are invisible |

### Planned fix (before RC2 planning)
1. Create Supabase project (also needed for FKH video hosting)
2. Add `events` table — anonymous usage: exercise completions, category opens, program enrollments, video plays
3. Add `feedback` table — athlete/parent input: name (optional), context, message, rating
4. Add in-app feedback button (Settings or post-workout prompt)
5. OBSERVATION_LOG.md becomes the synthesis document, not the collection mechanism

> Until this is resolved, observation data is manual only. Prioritize Supabase setup.

---

## Roadmap Rule

> **If it does not appear in the observation data, it does not enter the roadmap.**

---

## Per-Session Log

> One row per athlete session.  
> Record honestly — "—" is fine. Do not editorialize.

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

| Date | Device / OS | Screen | Description | Reproducible | Status |
|------|-------------|--------|-------------|--------------|--------|
|      |             |        |             |              | Open   |

---

## Feature Requests (raw — no filtering)

> Log every request exactly as stated. Rank later.

| Date | Requested By | Request |
|------|-------------|---------|
|      |              |         |

---

## Parent Feedback

| Date | Parent | Feedback | Positive / Concern |
|------|--------|----------|--------------------|
|      |        |          |                    |

---

## Usage Tally (update after every session)

### Screen Visits
| Screen | Times Visited |
|--------|--------------|
| Home | |
| Shots Tracker | |
| Programs | |
| Badges | |
| Profile | |
| Exercise Detail | |
| Progress Report | |

### Feature Engagement
| Feature | Times Used |
|---------|-----------|
| Daily Mission read | |
| Daily Mission task completed | |
| Workout template selected | |
| Workout started | |
| Exercise marked done | |
| Shot logged | |
| Program enrolled | |
| Program session completed | |
| Favorite starred | |
| Progress Report opened | |
| Badges screen opened | |
| Settings opened | |

### Category Visits (drill list opens)
| Category | Times Opened |
|----------|-------------|
| Ball Handling Foundations | |
| Ball Handling Moves | |
| Game Handles | |
| Footwork Lab | |
| Footwork | |
| Shooting Lab | |
| Shooting Drills | |
| Finishing School | |
| Finishing | |
| Post Moves | |
| Explosion & Jumps | |
| Speed & Agility | |
| Strength | |
| Conditioning | |
| Coordination | |
| Deceleration & Landing | |
| Athletic Movement | |
| Basketball IQ | |

### Exercise Completions (top 10 most completed)
| Exercise | Times Completed |
|----------|----------------|
| | |
| | |
| | |
| | |
| | |
| | |
| | |
| | |
| | |
| | |

---

## Retention Check — End of Week 1

| Metric | Count |
|--------|-------|
| Total athletes observed | |
| Athletes who returned 2+ days | |
| Athletes who completed a Daily Mission | |
| Athletes who enrolled in a Program | |
| Athletes who logged shots | |
| Athletes who opened Progress Report | |
| Average estimated session length | |
| Most common first action | |

---

## Retention Check — End of Week 2

| Metric | Count |
|--------|-------|
| Athletes who returned 4+ days | |
| Athletes who completed a full program week | |
| Feature used every single session | |
| Feature never used across all athletes | |
| Most mentioned feature request | |
| Biggest surprise | |

---

## End-of-Window Observations Summary

> Complete only after the 2-week window closes.

### Most Used Features
1. 
2. 
3. 
4. 
5. 

### Least Used Features
1. 
2. 
3. 

### Most Opened Categories
1. 
2. 
3. 

### Most Completed Programs
1. 
2. 

### Most Favorited Exercises
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

## Prioritized RC2 Backlog

> Populated from observation data only. Items without signal are excluded.

| Priority | Item | Signal | Observations | Est. Effort |
|----------|------|--------|-------------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## RC1 Baseline Reference

| Metric | RC1 Value |
|--------|-----------|
| Total exercises | ~220 |
| Workout templates | 6 |
| Training programs | 5 |
| Total badges | 27 |
| Shot zones | 9 court + 6 quick-tap |
| Report periods | 7d / 30d / All Time |
| Daily Mission structure | 2 required + 1 optional shot goal |
| FKH original videos | 1 |
| Third-party videos | ~198 |

---

*Created: 2026-05-30*  
*Last updated: 2026-05-30*  
*Next review: End of 2-week observation window*

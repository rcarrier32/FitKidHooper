# Training Calendar Roadmap

FKH calendar/scheduling features in three tiers. **Tier 1 is implemented.**

---

## Tier 1 — Expose existing calendar (done)

**Goal:** Make the built-in schedule and history calendar discoverable without new UI.

**What shipped:**
- Dedicated **Training Calendar** screen (`view === "schedule"`)
  - **This Week** — rotating weekly training plan (category focus per day)
  - **Calendar** — month grid with training heat map; tap a day for drill details (`CalendarView`)
- Entry points:
  - **Profile** → 🗓 Training Calendar
  - **Home** → Progress & Stats (expand) → Training Calendar teaser
- Back navigation returns to Profile or Home depending on where the user came from
- Help sheet updated with calendar tip

**Existing related surfaces (unchanged):**
- **Training History** (Profile) — stats, streaks, insights (`HistoryView`)
- **Progress Report** (Home teaser) — period analytics
- **Active Program** card — today’s / next program session with rest-day messaging

**Code references:**
- `CalendarView`, `buildCalendarData` — month history
- `SCHEDULE` — weekly category rotation
- `openSchedule(returnView, tab)` — navigation helper in `SummerTrainingApp.jsx`

---

## Tier 2 — Week-ahead program plan (done)

**Goal:** Answer “what’s coming this week?” for enrolled programs, with **REST** clearly labeled on off days.

**What shipped:**
- `buildProgramWeekPlan()` — 7-day grid from enrollment start, sessions on days 0/2/4, **REST** on all other days
- `ProgramWeekStrip` — compact Mon–Sun strip with S1/S2/S3, ✓, and **REST**
- **Active Program** card on Home — week strip + status line (`REST today · Session 3 Fri`)
- **Training Calendar → This Week** — program strip above the general category plan when enrolled

**Technical notes:**
- Reuses `programSessionScheduleDays`, `programWeekDayIndex`, `findDueProgramSession`, `getActiveProgramScheduleStatus`
- Program week days are relative to enrollment `startDate`, not calendar Monday

**Out of scope for Tier 2:**
- Full month forward view
- Editing schedule manually

---

## Tier 3 — Full calendar / planning (future, optional)

**Goal:** Parent/coach planning and richer scheduling — only if product direction needs it.

**Possible features:**
- Unified month view: **backward** (training done) + **forward** (program sessions, rest, missions)
- Mark real-world events (games, practices) and adjust recommendations
- Export or sync (device calendar, share with parent) — significant scope
- Custom weekly templates per athlete (e.g. “Tue/Thu hoop, Mon/Wed/Fri strength”)

**When to consider:**
- Parents are a primary audience and ask for planning tools
- Multiple concurrent programs or team schedules need coordination
- Tier 2 week strip doesn’t reduce support questions

**Risks:**
- Over-engineering for a kid-first “what do I do today?” app
- Duplicates Home + Active Program if not carefully integrated

---

## Decision log

| Date       | Decision                                      |
|------------|-----------------------------------------------|
| 2026-06-16 | Ship Tier 1; defer Tier 2/3 to this doc       |
| 2026-06-16 | Program sessions use rest spacing (days 0,2,4) |
| 2026-06-16 | Ship Tier 2 — week strip with REST labels on program off days |

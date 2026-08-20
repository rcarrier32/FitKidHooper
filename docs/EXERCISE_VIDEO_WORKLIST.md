# Exercise Video Worklist — Phase A audit results + Phase B queue

**Generated:** 2026-07-17 from a full YouTube Data API audit of every video in `src/data/trainingCatalog.js`, cross-referenced with view traffic from analytics `events` (`video_play` + `exercise_complete` + `exercise_favorite`). Prereq shipped: `src/lib/youtubeEmbedUrl.js` supports `start`/`end` clipping (exercises honor `videoStart`/`videoEnd`).

## Health summary
- **258 exercises** · **247 with video** · **221 unique videoIds** · **11 with no video** · 0 FKH-native.
- ✅ **0 dead/removed, 0 non-embeddable** — nothing is currently broken.
- ⚠️ **108 of 221 (49%) are >90s** — clip candidates (the whole reason for this pass).
- 71 videos on preferred channels · 3 on avoid-list · **147 on unclassified channels**.
- Traffic is thin (top = 9 plays) — the user base is small, so treat "sort by views" as *directional*; weight also by which exercises live in default programs / Daily Mission (guaranteed exposure).

---

## Bucket 1 — Clip checklist (keep the video, add timestamps)
These already play good content; they're just long. **Watch each once, note the in/out seconds**, then set `videoStart` / `videoEnd` on the exercise in `trainingCatalog.js`. ★ = already a preferred/known-good channel (no re-sourcing needed).

| Do | Exercise | Traffic | Len | Channel | Watch | `videoStart` | `videoEnd` |
|---|---|---|---|---|---|---|---|
| ☐ | `bh-crossover` (most-watched!) | 9 | 115s | ★ Kids Basketball Training | https://youtu.be/7kFuB5Wc970 | | |
| ☐ | `bh-in-out` | 2 | 151s | ★ Cramer Basketball | https://youtu.be/LMy9MUEd0Q0 | | |
| ☐ | `two-ball` | 2 | 109s | ★ HoopStudy | https://youtu.be/3N92fry2Jdw | | |
| ☐ | `weak-hand` | 1 | 127s | ★ Get Handles Basketball | https://youtu.be/O4x_AQVZ_nI | | |
| ☐ | `relph-twoball` | 1 | 128s | ★ Tyler Relph | https://youtu.be/fR6O8m48sg0 | | |
| ☐ | `bh-btl` | 3 | 97s | HandleLife | https://youtu.be/Y7PjqLcIhXw | | |
| ☐ | `tennis-dribble` | 3 | 242s | Pro Training Basketball | https://youtu.be/nozHTvLyL0o | | |
| ☐ | `gh-change-pace` | 2 | 155s | Howcast | https://youtu.be/0Wwv5nDpL6k | | |
| ☐ | `lateral-line-hops` | 3 | 93s | HASfit | https://youtu.be/dZKEw4zDL_c | | |
| ☐ | `reverse-lunge` | 3 | 260s | Mind Pump TV | https://youtu.be/3XDriUn0udo | | |
| ☐ | `squat-jumps` (+`squat-jacks`) | 2 | 135s | Howcast | https://youtu.be/U4s4mEQ5VqU | | |
| ☐ | `depth-drop` | 1 | 242s | Simple Speed Coach | https://youtu.be/ol4VhEANoQs | | |
| ☐ | `side-plank` | 1 | 217s | Dublin 2 Chiro (PT) | https://youtu.be/m8lSq4SC_eM | | |

*(95 more >90s videos have zero traffic — clip lazily / on demand. Full list in the audit JSON.)*

**To apply timestamps:** in `trainingCatalog.js`, add `videoStart: <sec>, videoEnd: <sec>` to the exercise object. The player already honors them; blank = whole video.

---

## Bucket 2 — Replace (6 videos: 3 fragile + 3 avoid-list)
**Status 2026-07-17: 4 of 6 DONE.** Applied to `trainingCatalog.js` + API-verified public/embeddable/short. Please eyeball the 4 (links below). The remaining 2 are entangled with clipping (their accurate replacement is long) → moved to Bucket 1.

**✅ DONE — Fragile unlisted → public short:**
- ✅ `bw-squats` → `I7Nk1RMtcLs` Shawn Adair "How to Bodyweight Squat" (12s) — https://youtu.be/I7Nk1RMtcLs
- ✅ `broad-jump-stick` (+`-dec`) → `Fhz-s_Hqo8I` uoasportsagility "Broad Jump to Stick" (6s) — https://youtu.be/Fhz-s_Hqo8I *(also fixed a mislabel: catalog tagged it "PJF Performance" but the real upload was BowFlex/unlisted)*
- ✅ `high-knees` → `GjTALVhkSuw` TJSportsPrograms "High Knees In-Place" (18s) — https://youtu.be/GjTALVhkSuw

**✅ DONE — Avoid-list → preferred:**
- ✅ `fs-speed-gather` (was Good Drill) → ★ `B444HaiZPkE` PJFPerformance "7 Types of Finishing Footwork" (14s) — https://youtu.be/B444HaiZPkE

**⏳ HELD for Bucket 1 (replacement is long → needs a timestamp, else it regresses):**
- `gh-in-out` (KaKaBasketball animation, 10s) → ★ `b73g2s6HpC4` Howcast "In & Out Dribble" (139s — clip) — real demo vs animation
- `pass-skip` (Hoop Dreams, 16s) → ★ `hijb6RY-dfM` Teach Hoops "Skip Pass" (193s — clip)

---

## Bucket 3 — The 147 unclassified channels (mostly fine)
Not a quality problem — just unlabeled. Rough classification:
- **~Legit basketball coaching (accept):** Teach Hoops (7), Dr. Dish Basketball (5), Basketball Coach Allen (4), Pro Skills Basketball (3), Baller Boot Camp (3), Paul Easton, Better Basketball (Ozswoosh), HandleLife, PGC Coaching, The Scoring Factory, Pro Training Basketball, HoopsKing, IMG Academy, Atlanta Hawks, The Hoop Group, Coach Tony Miller, Ryan Razooky, + many single-video coach channels.
- **~Established fitness/strength/plyo (accept for athletic moves):** Simple Speed Coach (6), Howcast (6), Live Lean TV (4), KP Sports Performance (3), CrossFit, NASM, Mind Pump TV, ScottHermanFitness, FitnessBlender, HASfit, BuiltLean, OPEX, Kbands, Bodybuilding.com.
- **Medical/PT/chiro (works, off-brand — consider a coach source later):** Champion PT, Children's Hospital Colorado, Julie Lee Physiotherapy, Dublin 2 Chiropractic, UofL Health, React PT, SPARC, The Movement Doc.
- **⚠️ Off-sport — eyeball these 2:** The Soccer Specialist (1), Global Triathlon Network (1).

**Recommendation:** promote the recurring legit ones (Teach Hoops, Dr. Dish, Simple Speed Coach, Howcast, KP Sports, Pro Skills, Baller Boot Camp) into `PREFERRED_TRAINERS.md` as a "Tier 2b — accepted" list; review only the 2 off-sport clips.

---

## Bucket 4 — 11 exercises with no video (all zero-traffic, hardest to source)
Rebounding + small-sided playmaking drills, which is why they were skipped:
`reb-self-toss`, `reb-tips`, `reb-boxout`, `reb-outlet`, `reb-power`, `pg-partner-pass`, `pg-closeout-read`, `pg-1v1`, `pg-boxout-live`, `pg-2v2`, `pg-3v3`.
Source from coach channels (Teach Hoops, Basketball Immersion, Brian McCormick, Jr. NBA) — clipping helps since these live inside longer practice videos.

---

## Phase C — kill the blind spot ✅ DONE 2026-07-17
Backfilled `videoChannel` onto all **247** video entries and `trusted:true` onto the **78** on preferred channels, from the audit data. Additive/in-place edit; file parses; no render collision (`videoChannel`/`trusted` are read nowhere yet). Future audits no longer need an API round-trip to know channels. Re-run `scratchpad/audit-exercise-videos.mjs` after any swap to keep the data fresh; re-run `backfill-channels.mjs` (idempotent) to re-sync.

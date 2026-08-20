# Program build-out proposal — First Step Explosion + Handle Like a Guard

Gap-driven additions sourced from HoopStudy (your most-used trusted trainer). Each proposed drill fills a **specific hole** in the program's current 4-week curriculum. **Not watched — titles only:** the `cues` and `desc` below are DRAFTS inferred from the title; verify against the clip before shipping. `clip` = trim on add (>~45s).

---

## 1) First Step Explosion — current gaps
Today: 26 drills, all `footwork`/`footwork_lab`/`finishing`/`finishing_school`. It teaches pivots, jabs, and finishes well — but for a program called *Explosion*, it has **almost nothing on the actual first-step burst, attacking a closeout, or beating a defender off the catch/dribble.** Six fills:

| Add | Drill (new id) | Video | Len | Fills gap | Suggested slot |
|---|---|---|---|---|---|
| ☐ | `fs-get-downhill` Get Downhill (First Step) | https://youtu.be/ib1tdRCjpQ0 | 22s | first-step burst | W1 · S3 First Steps |
| ☐ | `fs-explosive-catch` Explosive Catch & Go | https://youtu.be/sylgDPJgK4Y | 47s `clip` | explode off the catch | W2 · S1 Pivot Work |
| ☐ | `fs-beat-closeout` Beat the Closeout | https://youtu.be/RC2ZygaJPZw | 24s | attack a closeout | W3 · S1 Rip & Drive |
| ☐ | `fs-attack-defender` Claim Space & Attack | https://youtu.be/rBWi9R4GLwc | 16s | blow-by / beat defender | W3 · S3 Counter Moves |
| ☐ | `fs-decel-finish` Decelerating Finish | https://youtu.be/O0Qpe-7kYmE | 49s `clip` | change-of-speed → finish | W4 · S1 Advanced Finishes |
| ☐ | `fs-one-dribble-drive` One-Dribble Drive | https://youtu.be/GSE7PXOtDeI | 29s | 1-dribble rim attack | W4 · S3 Complete Attack |

### Draft entries (First Step Explosion)
```js
{ id:"fs-get-downhill", name:"Get Downhill (First Step)", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:9, estimatedDuration:90, sets:"3x5 each side", rest:"30 s",
  transferTags:["first-step","driving","attacking"], progressionTrack:"Step 3 — Off-The-Dribble Moves",
  desc:"DRAFT — Push the ball out on the first dribble and get your shoulders past the defender's hip to get downhill toward the rim.",
  cues:["DRAFT: first dribble is long and low — cover ground","Get your shoulders past their hip","Push off the back foot to explode, don't glide"],
  trainer:"HoopStudy", videoId:"ib1tdRCjpQ0", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Get Downhill With This Dribble Tip", _cat:"footwork", meta:{} },

{ id:"fs-explosive-catch", name:"Explosive Catch & Go", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:8, estimatedDuration:90, sets:"3x6 reps", rest:"30 s", videoStart:0, videoEnd:0,
  transferTags:["first-step","catch","driving"], progressionTrack:"Step 3 — Off-The-Dribble Moves",
  desc:"DRAFT — Run through the catch instead of stopping flat, using the momentum to launch an explosive first step to the rim.",
  cues:["DRAFT: run THROUGH the catch, don't stop flat","Low first step, don't stand up","Attack in a straight line to the rim"],
  trainer:"HoopStudy", videoId:"sylgDPJgK4Y", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Running through the catch for a more explosive first step", _cat:"footwork", meta:{} },

{ id:"fs-beat-closeout", name:"Beat the Closeout", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:9, estimatedDuration:90, sets:"3x5 each side", rest:"30 s",
  transferTags:["closeout","attacking","driving"], progressionTrack:"Step 3 — Off-The-Dribble Moves",
  desc:"DRAFT — Read a hard closeout and attack the high foot with a shot-fake or straight-line drive before the defender is set.",
  cues:["DRAFT: attack the closeout's high foot","Shot-fake only if they fly at you","One dribble past, don't dance"],
  trainer:"HoopStudy", videoId:"RC2ZygaJPZw", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"How To Beat A Closeout Defender", _cat:"footwork", meta:{} },

{ id:"fs-attack-defender", name:"Claim Space & Attack", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:8, estimatedDuration:90, sets:"3x5 each side", rest:"30 s",
  transferTags:["first-step","deception","attacking"], progressionTrack:"Step 3 — Off-The-Dribble Moves",
  desc:"DRAFT — Claim your space with a jab or drop before exploding past the defender so you attack from an advantage.",
  cues:["DRAFT: claim space FIRST, then attack","Wide, low base before the burst","Sell the setup so the defender freezes"],
  trainer:"HoopStudy", videoId:"rBWi9R4GLwc", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Claim your space before attacking the defender", _cat:"footwork", meta:{} },

{ id:"fs-decel-finish", name:"Decelerating Finish", tag:"Advanced", difficulty:"advanced",
  ageRange:[11,14], funScore:8, estimatedDuration:90, sets:"3x4 each side", rest:"30 s", videoStart:0, videoEnd:0,
  transferTags:["finishing","change-of-speed","gather"], progressionTrack:"Step 4 — Advanced Finishes",
  desc:"DRAFT — Attack at speed then decelerate into a controlled two-foot gather to finish under control past a defender.",
  cues:["DRAFT: sprint in, then STOP under control","Gather on two feet, stay balanced","Finish soft off the glass"],
  trainer:"HoopStudy", videoId:"O0Qpe-7kYmE", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Work on your Decelerating Finishes", _cat:"finishing", meta:{} },

{ id:"fs-one-dribble-drive", name:"One-Dribble Drive", tag:"Advanced", difficulty:"advanced",
  ageRange:[11,14], funScore:9, estimatedDuration:90, sets:"3x5 each side", rest:"30 s",
  transferTags:["first-step","driving","finishing"], progressionTrack:"Step 4 — Advanced Finishes",
  desc:"DRAFT — Cover maximum ground on one dribble to get to the rim before help arrives.",
  cues:["DRAFT: one long dribble, gather, finish","Push off hard on the first step","Beat the defender before the second dribble"],
  trainer:"HoopStudy", videoId:"GSE7PXOtDeI", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"One Dribble Drives", _cat:"footwork", meta:{} },
```

---

## 2) Handle Like a Guard — current gaps
Today: 19 drills across `ballhandling`/`game_handles`/`handles`. Strong on crossover, between-legs, behind-back, hesitation, combos — but **missing the spin move entirely, has only one pullback (`bh-retreat`), and little stationary weight-shift foundation** (HoopStudy's bread and butter). Six fills:

| Add | Drill (new id) | Video | Len | Fills gap | Suggested slot |
|---|---|---|---|---|---|
| ☐ | `gh-weight-shift` Stationary Weight Shift | https://youtu.be/eIQj6RPD9Ro | 16s | weight-shift foundation | W1 · S1 Ball Control |
| ☐ | `gh-shifty-unlock` Shifty Stationary Unlock | https://youtu.be/slj01lUa4Gg | 16s | stationary control | W1 · S3 Foundation Review |
| ☐ | `gh-spin` Spin Move | https://youtu.be/Z_1p5lhysso | 15s | **spin (missing!)** | W3 · S1 Behind the Back |
| ☐ | `gh-pullback-space` Pull Back to Space | https://youtu.be/oOgsWmXlVqI | 53s `clip` | pullback/snatch series | W3 · S2 Hesitation Game |
| ☐ | `gh-push-cross-spin` Push Cross → Spin | https://youtu.be/y3RJ07NCzdU | 14s | combo into spin | W4 · S2 Combo Sequences |
| ☐ | `gh-cone-cod` 5-Cone Change of Direction | https://youtu.be/EzChuYYrQqA | 58s `clip` | game-speed COD circuit | W4 · S1 Attack Moves |

### Draft entries (Handle Like a Guard)
```js
{ id:"gh-weight-shift", name:"Stationary Weight Shift", tag:"Beginner", difficulty:"beginner",
  ageRange:[9,14], funScore:8, estimatedDuration:90, sets:"3x45 s", rest:"20 s",
  transferTags:["ball-control","deception","change-of-direction"], progressionTrack:"Step 1 — Stationary Foundation",
  desc:"DRAFT — Shift your body weight side to side while dribbling low to learn to sell direction changes before you move.",
  cues:["DRAFT: shift the WEIGHT, not just the ball","Stay low, eyes up","Sell the lean before you go"],
  trainer:"HoopStudy", videoId:"eIQj6RPD9Ro", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Learn how to shift your weight in stationary dribbling", _cat:"ballhandling", meta:{} },

{ id:"gh-shifty-unlock", name:"Shifty Stationary Unlock", tag:"Beginner", difficulty:"beginner",
  ageRange:[9,14], funScore:8, estimatedDuration:90, sets:"3x45 s", rest:"20 s",
  transferTags:["ball-control","handles"], progressionTrack:"Step 1 — Stationary Foundation",
  desc:"DRAFT — A stationary handle drill that builds the shiftiness and control that unlocks live-dribble moves.",
  cues:["DRAFT: quick, sharp dribbles","Fingertips not palm","Keep the ball on a string"],
  trainer:"HoopStudy", videoId:"slj01lUa4Gg", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"This Stationary Drill Could Unlock Your Handle", _cat:"ballhandling", meta:{} },

{ id:"gh-spin", name:"Spin Move", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:9, estimatedDuration:90, sets:"3x5 each side", rest:"30 s",
  transferTags:["spin","change-of-direction","deception"], progressionTrack:"Step 3 — Advanced Moves",
  desc:"DRAFT — Plant, pull the ball tight to your hip, and spin off the defender to change direction and protect the ball.",
  cues:["DRAFT: pull the ball TIGHT to your hip","Spin off the front foot","Keep eyes up to find the rim out of the spin"],
  trainer:"HoopStudy", videoId:"Z_1p5lhysso", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Everyone needs to add a spin move", _cat:"game_handles", meta:{} },

{ id:"gh-pullback-space", name:"Pull Back to Space", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:8, estimatedDuration:90, sets:"3x5 each side", rest:"30 s", videoStart:0, videoEnd:0,
  transferTags:["pullback","create-space","change-of-direction"], progressionTrack:"Step 3 — Advanced Moves",
  desc:"DRAFT — Retreat/pull the ball back to space to reset the defender and create a driving or shooting window.",
  cues:["DRAFT: push back hard off the front foot","Pull the ball back with you, protected","Reset, read, re-attack"],
  trainer:"HoopStudy", videoId:"oOgsWmXlVqI", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Your ability to pull back to space is crucial", _cat:"ballhandling", meta:{} },

{ id:"gh-push-cross-spin", name:"Push Cross → Spin", tag:"Advanced", difficulty:"advanced",
  ageRange:[11,14], funScore:9, estimatedDuration:90, sets:"3x5 each side", rest:"30 s",
  transferTags:["combo","spin","deception"], progressionTrack:"Step 4 — Combo Moves",
  desc:"DRAFT — Chain a push crossover into a spin to counter a defender who jumps the crossover.",
  cues:["DRAFT: sell the push cross first","Spin only when they overplay it","Two moves, one rhythm"],
  trainer:"HoopStudy", videoId:"y3RJ07NCzdU", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"Push Cross to Spin Move", _cat:"game_handles", meta:{} },

{ id:"gh-cone-cod", name:"5-Cone Change of Direction", tag:"Intermediate", difficulty:"intermediate",
  ageRange:[10,14], funScore:8, estimatedDuration:120, sets:"3 circuits", rest:"45 s", videoStart:0, videoEnd:0,
  transferTags:["change-of-direction","conditioning","handles"], progressionTrack:"Step 3 — Advanced Moves",
  desc:"DRAFT — A 5-cone circuit stringing change-of-direction moves together at game speed.",
  cues:["DRAFT: attack each cone like a defender","Change speed AND direction","Stay low through every cut"],
  trainer:"HoopStudy", videoId:"EzChuYYrQqA", videoChannel:"HoopStudy", trusted:true,
  videoTitle:"5 Cone Change of Direction Drill", _cat:"game_handles", meta:{} },
```

---

## How to apply (on approval)
1. **Author** the 12 entries into `src/data/trainingCatalog.js` (insert in the matching category block).
2. **Wire into programs**: add each new `id` to its suggested `weeks[].sessions[].exercises[]` slot in the program object.
3. **Verify cues** against each clip and replace the `DRAFT:` text (this is the step I can't do — needs eyes on the video).
4. **Clip** the 4 flagged (`videoStart`/`videoEnd` already stubbed at 0 on those entries).

**Reminder:** these 12 are HoopStudy candidates matched by title. Watch each before it ships to kids — a wrong cue is worse than no drill.

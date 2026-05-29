import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   SETTINGS & COLOR HELPERS
═══════════════════════════════════════════════════════════════ */
const DEFAULT = {
  primaryHue:38, primarySat:92, primaryLight:55,
  secondaryHue:245, secondarySat:80, secondaryLight:60,
  bgHue:222, bgSat:47, bgLight:6,
  accentHue:158, accentSat:85, accentLight:50,
  athleteName:"Champ", avatar:null,
  athleteAge:12, experience:"beginner", goals:[], playStyle:"any",
};
const hsl  = (h,s,l) => `hsl(${h},${s}%,${l}%)`;
const pri  = s => hsl(s.primaryHue,   s.primarySat,   s.primaryLight);
const sec  = s => hsl(s.secondaryHue, s.secondarySat, s.secondaryLight);
const bg   = s => hsl(s.bgHue, s.bgSat, s.bgLight);
const surf = s => hsl(s.bgHue, Math.max(s.bgSat-10,0), Math.min(s.bgLight+5,20));
const nav  = s => hsl(s.bgHue, s.bgSat, Math.max(s.bgLight-1,2));
const str3 = s => s.accentHue !== undefined ? hsl(s.accentHue, s.accentSat, s.accentLight) : hsl((s.primaryHue+120)%360, Math.min(s.primarySat+5,100), Math.max(s.primaryLight,50));


/* ═══════════════════════════════════════════════════════════════
   WORKOUT DATA
═══════════════════════════════════════════════════════════════ */
const W_SPEED = [
  { id:"ladder",    name:"Agility Ladder Drills",    tag:"Foundation", sets:"3 rounds", rest:"45 s",
    desc:"Two feet in each box, lateral icky shuffle, one-foot hops. Light feet — not stomping.",
    cues:["Stay on balls of feet","Arms drive the rhythm","Eyes forward, not at ladder"],
    videoId:"_3J1tzI63b4", videoTitle:"Agility Ladder Drills for Kids" },
  { id:"cone-cod",  name:"Cone Change of Direction", tag:"COD",        sets:"5x each dir", rest:"30 s",
    desc:"3 cones 5 yds apart. Sprint, plant outside foot, drive back. Deceleration habit is injury prevention.",
    cues:["Sink hips on plant — not just ankles","Short chop steps before cut","Explode out of the break"],
    videoId:"Em0jnOawLwU", videoTitle:"GAMESPEED Change of Direction Drills" },
  { id:"5-10-5",    name:"Pro Agility 5-10-5",       tag:"Speed",      sets:"4-6 reps", rest:"60 s",
    desc:"Gold standard lateral test. Touch the line each cut. Time yourself weekly.",
    cues:["Low start position","Touch line with inside hand","Push off ground — not just turn"],
    videoId:"SBx-chygCdE", videoTitle:"Pro Agility Drill (5-10-5)" },
  { id:"lat-bounds",name:"Lateral Bounds to Sprint",  tag:"Power",      sets:"3x5 each side", rest:"45 s",
    desc:"Bound sideways 3-5 times then explode into a forward sprint. Lateral power tied to acceleration.",
    cues:["Stick each landing before next bound","Drive knee up on sprint","Long powerful bounds"],
    videoId:"K9-MmZDRhj8", videoTitle:"Build REAL Speed with Plyometrics — Youth Athletes" },
  { id:"def-slide", name:"Defensive Slide + Sprint",  tag:"Basketball", sets:"3x full court", rest:"60 s",
    desc:"Defensive slide sideline to sideline, then drop step and sprint. Direct court transfer.",
    cues:["Stay wide — feet never touch","Hips low throughout","Head stays at same height"],
    videoId:"Vu-2wL-dt7Q", videoTitle:"Lateral Shuffle to Sprint — Simple Speed Coach" },
];

const W_BALANCE = [
  { id:"sl-hold",   name:"Single Leg Balance Hold",  tag:"Foundation", sets:"3x30-45s each", rest:"15 s",
    desc:"Start flat. Progress: eyes closed, pillow, catch a ball. Number one injury prevention at this age.",
    cues:["Micro-bend in standing knee","Squeeze glute of standing leg","Eyes fixed or close them"],
    videoId:"Z9_ThjKQyOg", videoTitle:"Single Leg Balance — Childrens Hospital Colorado" },
  { id:"bosu-sq",   name:"BOSU Squats",               tag:"Balance",    sets:"3x8", rest:"45 s",
    desc:"Flat side up on BOSU or a folded towel. Adds a stabilization challenge to the squat pattern.",
    cues:["Same squat cues apply — chest up, knees track toes","Engage core before lowering","Control the wobble — do not fight it, work with it"],
    videoId:"h-Wh6dNHq8I", videoTitle:"Top 7 Single Leg Plyometric Drills" },
  { id:"sl-ball",   name:"Single-Leg Balance Toss",   tag:"Reactive",   sets:"3x30s each", rest:"15 s",
    desc:"Stand single-leg, have someone toss a ball to catch and return. Reactive balance is real-world stability.",
    cues:["Keep standing knee slightly bent","Do not let hip drop on catching side","Eyes closed for 10s intervals to level up"],
    videoId:"Z9_ThjKQyOg", videoTitle:"Single Leg Balance — Childrens Hospital Colorado" },
  { id:"sl-squat",  name:"Single Leg Squat (Box)",    tag:"Strength",   sets:"3x8 each", rest:"30 s",
    desc:"Sit back to a box. Powers every jump and cut.",
    cues:["Knee tracks over second toe","Chest up, slight forward lean","Touch box lightly — do not crash"],
    videoId:"IBUwgLEKeUc", videoTitle:"5 Single Leg Exercises for Strength & Balance" },
  { id:"lat-stick", name:"Lateral Bounds — Stick It", tag:"Power Ctrl", sets:"3x6 each leg", rest:"30 s",
    desc:"Jump laterally, land and FREEZE 2 full seconds. Teaches force control for cutting and landing.",
    cues:["Soft landing — ankle to knee to hip","Freeze means FREEZE — 2 full seconds","Progress to landing on grass"],
    videoId:"HJi0bU2YiR8", videoTitle:"Top 8 Beginner Plyometric Jumps — Youth Athletes" },
  { id:"triple-lat-hops", name:"Triple Lateral Hops", tag:"Reactive Balance", sets:"3x5 each side", rest:"45 s",
    desc:"Three consecutive lateral hops on one foot, then stick and hold the final landing for 2 seconds. Builds balance, landing control, and ankle strength together.",
    cues:["Same foot for all three hops","Stick the final landing HARD — no extra steps","Soft landing on each hop — absorb","Eyes forward, not down at feet"],
    videoId:"6xwGFn-J_QE", videoTitle:"Triple Lateral Hops" },
  { id:"pogo-hops", name:"Pogo Hops", tag:"Reactive Balance", sets:"3x15 reps", rest:"45 s",
    desc:"Single-leg rapid pogo hops. Combines ankle stiffness training with single-leg balance and reactive movement.",
    cues:["Stay on ball of foot — heels barely graze the floor","Stiff ankle — spring, do not collapse","Small quick hops first, build rhythm","Switch legs every set"],
    videoId:"1j3w6KyYg6c", videoTitle:"Single Leg Pogos — How To" },
  { id:"sl-balance-reach",  name:"Single Leg Balance Reach",       tag:"Proprioception", sets:"3x8 each leg", rest:"20 s",
    desc:"Stand single-leg, reach the free leg in multiple directions while keeping balance. Trains proprioception and ankle stability.",
    cues:["Slight bend in standing knee","Hip stays level — do not let it drop","Reach far in each direction","Eyes can be open then closed to level up"],
    videoId:"Kj6A6MZ9K5U", videoTitle:"Single Leg Balance Reach" },
];

const W_STRENGTH = [
  { id:"goblet-sq",   name:"Goblet Squat",            tag:"Day 1 Squat",      sets:"3x10", rest:"60 s",
    desc:"Hold 5-10 lb at chest. Forces an upright torso automatically — the safest teaching squat for youth.",
    cues:["Elbows drive INSIDE knees at bottom","Chest tall throughout","Heels flat","Full depth if mobility allows"],
    videoId:"0o--5CwQtTU", videoTitle:"How to Teach a Child to Squat — Brand X Method" },
  { id:"pushup",      name:"Push-Ups",                 tag:"Day 1 Push",       sets:"3x10-15", rest:"60 s",
    desc:"Wall to incline to floor progression. Only move to next level when every rep is clean.",
    cues:["Body is a rigid plank — no sagging hips","Elbows at 45 degrees","3-second lowering builds control","Chest touches, full lockout at top"],
    videoId:"JFbFLSR6LJE", videoTitle:"Perfect Push-Up for 10-13 Year Old Athletes" },
  { id:"step-ups",    name:"Step-Ups",                 tag:"Day 1 Single Leg", sets:"3x8 each", rest:"45 s",
    desc:"Use a sturdy box or step about knee height. Add light dumbbells when bodyweight feels easy.",
    cues:["Drive through the heel of the top foot","Full hip extension at top — stand tall","Control the lowering — do not drop"],
    videoId:"aKj-6hgiViA", videoTitle:"How to Properly Perform Dumbbell Step-Ups" },
  { id:"db-rows",     name:"Dumbbell Rows",            tag:"Day 1 Pull",       sets:"3x10 each", rest:"60 s",
    desc:"One hand on a bench, row dumbbell to hip. The pull complement to push-ups.",
    cues:["Elbow drives back past the hip — not out to the side","Squeeze lat at top — hold 1 second","Do not rotate torso to get the weight up"],
    videoId:"Fl0UMfdEzsE", videoTitle:"Inverted Rows — Beginner to Advanced" },
  { id:"plank-hold",  name:"Plank Hold",               tag:"Day 1 Core",       sets:"3x45s", rest:"30 s",
    desc:"The foundation of all core work. Progress by adding shoulder taps when 45s feels easy.",
    cues:["Squeeze glutes AND abs","Hips level — do not sag or pike","Breathe — do not hold breath","Eyes slightly forward"],
    videoId:"pSHjTRCQxIw", videoTitle:"Plank Hold — Proper Form" },
  { id:"walk-lunge",  name:"Walking Lunges",           tag:"Day 2 Lunge",      sets:"3x10 each", rest:"45 s",
    desc:"Bodyweight first — add light dumbbells when form is automatic.",
    cues:["Front shin stays vertical","Tall torso — do not lean forward","Back knee lightly touches floor","Step long enough for parallel thigh"],
    videoId:"L8fvypPrzzs", videoTitle:"Walking Lunges — Proper Form" },
  { id:"glute-bridge",name:"Glute Bridges",            tag:"Day 2 Hinge",      sets:"3x12", rest:"30 s",
    desc:"Lie on back, feet flat, drive hips to ceiling. Hip extension that transfers to sprinting and jumping.",
    cues:["Drive through HEELS — not balls of feet","Squeeze glutes hard at top — hold 2 seconds","Do not hyperextend the lower back","Progress: single-leg bridge"],
    videoId:"wPM8icPu6H8", videoTitle:"Glute Bridge — How To" },
  { id:"side-plank",  name:"Side Plank",               tag:"Day 2 Core",       sets:"3x20s each", rest:"20 s",
    desc:"Lateral core stability — resists sideways forces of cutting and landing.",
    cues:["Hip stacked — do not let it sag","Body is a straight line head to feet","Breathe normally throughout"],
    videoId:"m8lSq4SC_eM", videoTitle:"Beginner Core — Plank Side Plank Dead Bug" },
  { id:"box-jump",    name:"Box Jumps",                tag:"Day 3 Power",      sets:"3x5", rest:"90 s",
    desc:"Jump to box, step down. Land mechanics more important than height at this age.",
    cues:["Swing arms back then up","Land in athletic stance — not feet together","STEP down — do not jump down","Quiet landing = good absorption"],
    videoId:"HJi0bU2YiR8", videoTitle:"Top 8 Beginner Plyometric Jumps — Youth Athletes" },
  { id:"db-deadlift", name:"Dumbbell Deadlift",        tag:"Day 3 Hinge",      sets:"3x8", rest:"60 s",
    desc:"Dumbbells at sides, hip hinge to mid-shin. Foundation of all pulling strength.",
    cues:["Push the floor away — do not think pull up","Stay close to legs throughout","Hips and shoulders rise together","Stand completely tall at top"],
    videoId:"-FN9IgWFiTU", videoTitle:"RDL Hip Hinge Pattern Development" },
  { id:"ohp",         name:"Overhead Press",           tag:"Day 3 Push",       sets:"3x8", rest:"60 s",
    desc:"Dumbbells at shoulders, press overhead. Builds shoulder strength for all overhead movement.",
    cues:["Brace the core before pressing","Press straight up — not forward","Lock out fully at top","Control the lowering — 2 seconds down"],
    videoId:"LmrjCwMo1ZQ", videoTitle:"Basketball Upper Body Strength — Coach Kyle" },
  { id:"split-sq",    name:"Split Squats",             tag:"Day 3 Single Leg", sets:"3x6 each", rest:"60 s",
    desc:"Static lunge position, lower straight down. Builds single-leg strength and hip flexibility.",
    cues:["Back knee drops straight down — not forward","Front shin stays vertical","Tall torso — resist leaning","90 and 90 at the bottom"],
    videoId:"Wcmg-3iHwjQ", videoTitle:"Dumbbell Split Squat" },
  { id:"hollow-hold", name:"Hollow Body Hold",         tag:"Day 3 Core",       sets:"3x hold to fatigue", rest:"30 s",
    desc:"Arms overhead, legs extended, lower back pressed flat. Builds full-body tension — foundation of all athletic movement.",
    cues:["Lower back MUST stay pressed into the floor","Chin tucked — look at your belly","Arms by ears — reach long","Start with knees bent if needed"],
    videoId:"0yPin8hSc8o", videoTitle:"Hollow Body Hold — Proper Form Tutorial" },
  { id:"dead-bug", name:"Dead Bug", tag:"Day 1 Core", sets:"3x6 each side", rest:"30 s",
    desc:"Lie on back, arms up, knees at 90°. Lower opposite arm and leg while keeping lower back pressed FLAT. The gold standard anti-rotation core exercise for youth athletes.",
    cues:["Lower back MUST stay glued to the floor — no gap","Breathe out as you lower the limbs","Move SLOW — 3 seconds down, 2 seconds hold","Only lower as far as your back stays flat"],
    videoId:"4XLEnwUr8b0", videoTitle:"Dead Bug Exercise — Proper Form" },
  { id:"reverse-lunge",    name:"Reverse Lunges",                  tag:"Day 2 Lunge",    sets:"3x10 each leg", rest:"45 s",
    desc:"Step backward into the lunge. Easier on the knee than forward lunges — great starting point for lunge pattern.",
    cues:["Back knee drops straight down","Front shin stays vertical","Tall torso — do not lean","Push through front heel to return"],
    videoId:"3XDriUn0udo", videoTitle:"Reverse Lunges — Proper Form" },
  { id:"bw-squats",        name:"Bodyweight Squats",                tag:"Day 1 Squat",    sets:"3x15", rest:"45 s",
    desc:"The foundational movement pattern. Perfect these before adding any weight. Every jumping, cutting, and landing skill starts here.",
    cues:["Feet shoulder-width, toes slightly out","Sit back and down — not forward","Chest tall throughout","Stand fully at the top — squeeze glutes"],
    videoId:"aclHkVaku9U", videoTitle:"Bodyweight Squats — How To" },
  { id:"str-full",    name:"Youth Strength Full Session",tag:"Full Workout",   sets:"Follow video", rest:"As directed",
    desc:"Complete guided session covering all the key strength and power patterns for young athletes.",
    cues:["Form first — pause and reset any rep that feels wrong","Never grind — if form breaks, set is done","Full rest between rounds"],
    videoId:"3shedfyWTho", videoTitle:"Strength and Power Exercises for Youth Athletes" },
];

const W_STRENGTH_EXTRA = [
  { id:"bear-crawl",  name:"Bear Crawl",               tag:"Bonus Movement", sets:"3x20 yards", rest:"30 s",
    desc:"On all fours, knees hovering 1 inch off the ground. Looks silly, builds serious coordination and full-body stability.",
    cues:["Knees stay 1 inch off the floor — do not let them touch","Opposite arm and leg move together","Hips stay LOW and level — do not rock side to side","Breathe steadily"],
    videoId:"V1ozZbP9hTQ", videoTitle:"Bear Crawl Exercise" },
  { id:"broad-jump",  name:"Broad Jumps",               tag:"Bonus Power",    sets:"3x5", rest:"60 s",
    desc:"Two-foot takeoff, jump as far forward as possible, stick the landing. Horizontal power transfers to first-step explosiveness.",
    cues:["Load the hips — bend knees and swing arms back before launch","Drive arms forward aggressively","Land SOFT — absorb toes to ankles to knees to hips","Measure distance and try to beat it each week"],
    videoId:"HJi0bU2YiR8", videoTitle:"Top 8 Beginner Plyometric Jumps — Youth Athletes" },
  { id:"skater-jumps",name:"Skater Jumps",              tag:"Bonus Lateral",  sets:"3x10 each side", rest:"45 s",
    desc:"Bound laterally from one foot to the other like a speed skater. Same movement as a hard defensive slide or step-back jumper.",
    cues:["Reach trailing leg BEHIND landing foot — big lateral distance","Soft landing","Pause 1 second on each landing","Add a dribble on landing for basketball-specific training"],
    videoId:"K9-MmZDRhj8", videoTitle:"Build REAL Speed with Plyometrics — Youth Athletes" },
  { id:"farmers-carry",name:"Farmer Carry",            tag:"Bonus Carry",    sets:"3x30 yards", rest:"45 s",
    desc:"Walk with a dumbbell in each hand, standing as tall as possible. Builds grip, core, and posture simultaneously.",
    cues:["Stand TALL — do not lean to either side","Shoulders packed down — do not shrug","Normal gait — heel to toe","Single dumbbell suitcase carry challenges anti-lateral bending"],
    videoId:"DxUNi119Qzs", videoTitle:"Dumbbell Farmer Carry — How To" },
  { id:"jump-rope",   name:"Jump Rope",                 tag:"Bonus Conditioning",sets:"5x1 min", rest:"30 s",
    desc:"The most underrated athletic training tool. Builds foot speed, coordination, rhythm, and calf strength simultaneously.",
    cues:["Land on balls of feet — not flat-footed","Small quick jumps — just enough clearance","Wrists do the work — arms stay at sides","Progress to alternating feet then double unders"],
    videoId:"xVM5s3DdE24", videoTitle:"Youth Speed and Agility Training — Ages 8-10" },
];

const W_EXPLOSION = [
  { id:"pogo-jumps", name:"Pogo Jumps", tag:"PJF Elasticity", sets:"3x20 reps", rest:"60 s",
    desc:"Two-foot rapid ground contacts — minimal time on the floor. Trains ankle stiffness and elasticity that powers your first step.",
    cues:["Stay on balls of feet — heels barely touch","Think spring, not squat","Keep knees slightly bent and stiff","Arms help rhythm — small pumps"],
    trainer:"PJF Performance", videoId:"-dNKKNwYTM8", videoTitle:"Pogo Jumps — PJF Performance" },
  { id:"single-leg-hops", name:"Single Leg Hops", tag:"PJF Reactive", sets:"3x8 each leg", rest:"60 s",
    desc:"Hop forward on one foot and stick each landing for 2 seconds before next hop. Builds reactive strength and jumping mechanics.",
    cues:["Absorb landing through ankle, knee, hip","Freeze on every landing — 2 full counts","Drive knee up on the hop","Eyes forward, not down"],
    trainer:"PJF Performance", videoId:"7WgzHOQGgYw", videoTitle:"Single Leg Hops — PJF Performance" },
  { id:"lateral-bounds-pjf", name:"Lateral Bounds", tag:"PJF Lateral", sets:"3x8 each side", rest:"60 s",
    desc:"Bound sideways off one foot, land and stick on the other. Directly trains the lateral explosiveness used in defensive slides and drives.",
    cues:["Push off the full foot — not just the toes","Reach as far laterally as possible","Soft landing — absorb the energy","Pause 1 second on each landing"],
    trainer:"PJF Performance", videoId:"gjiZLF5S6aA", videoTitle:"Lateral Bounds — PJF Performance" },
  { id:"reactive-pogos", name:"Reactive Pogos", tag:"PJF Reactive", sets:"3x15 reps", rest:"60 s",
    desc:"Faster-paced pogo jumps with a direction change cue. React and redirect on each rep — trains the nervous system, not just the muscle.",
    cues:["React immediately — no hesitation","Stay low and springy","Quick ground contacts","Eyes up for the cue"],
    trainer:"PJF Performance", videoId:"lz6BM6WyJ0k", videoTitle:"Reactive Pogos — PJF Performance" },
  { id:"broad-jump-stick", name:"Broad Jump Stick Landing", tag:"PJF Power", sets:"3x5", rest:"90 s",
    desc:"Two-foot takeoff, jump as far forward as possible, STICK and hold the landing for 3 seconds. Builds horizontal power and landing control.",
    cues:["Load hips — arm swing back before launch","Reach arms forward aggressively on takeoff","Soft landing: toes → ankles → knees → hips","Hold the landing completely still"],
    trainer:"PJF Performance", videoId:"QOVaHwm-Q6U", videoTitle:"Broad Jump Stick Landing — PJF Performance" },
  { id:"squat-jumps", name:"Squat Jumps", tag:"PJF Power", sets:"3x8", rest:"90 s",
    desc:"Squat to parallel, explode up as high as possible, land soft. Classic vertical power builder.",
    cues:["Full squat before each jump","Maximum effort every rep — jump as HIGH as possible","Land quiet — absorb through the legs","Reset fully before next rep"],
    trainer:"PJF Performance", videoId:"U4s4mEQ5VqU", videoTitle:"Squat Jumps — PJF Performance" },
  { id:"tuck-jumps", name:"Tuck Jumps", tag:"PJF Power", sets:"3x6", rest:"90 s",
    desc:"Jump and pull knees to chest at the top. Builds explosive power and body control in the air.",
    cues:["Explode UP first — height before tuck","Pull knees fast at peak","Land and immediately soften","Arms drive the jump — not just legs"],
    trainer:"PJF Performance", videoId:"PAh9YntwQ3s", videoTitle:"Tuck Jumps — PJF Performance" },
  { id:"snap-downs", name:"Snap Downs", tag:"PJF Landing", sets:"3x8", rest:"60 s",
    desc:"From standing tall, snap down into a quarter squat athletic position as fast as possible. Trains the ability to decelerate — essential for cutting and landing safely.",
    cues:["Start tall, feet together","Snap down FAST — like a controlled fall","Land in wide athletic stance","Absorb through hips, not knees"],
    trainer:"PJF Performance", videoId:"TN4x2Jx2g9E", videoTitle:"Snap Downs — PJF Performance" },
  { id:"depth-drop", name:"Depth Drop Landing", tag:"PJF Landing", sets:"3x6", rest:"60 s",
    desc:"Step off a low box, land and absorb as quietly as possible. Teaches proper force absorption — most important injury-prevention drill.",
    cues:["Step off — do not jump off","Land SOFT and absorb completely","Toes to ankles to knees to hips","Hold landing 2 seconds before moving"],
    trainer:"PJF Performance", videoId:"FJx2hWm0A1Y", videoTitle:"Depth Drop Landing — PJF Performance" },
  { id:"lateral-line-hops", name:"Lateral Line Hops", tag:"PJF Elasticity", sets:"3x20 s", rest:"45 s",
    desc:"Rapid two-foot hops side to side over a line on the floor. Trains foot speed, lateral quickness, and ankle elasticity.",
    cues:["Stay on balls of feet — fast contacts","Keep feet together","Hips stay level — no side lean","Go as fast as you can maintain rhythm"],
    trainer:"PJF Performance", videoId:"dZKEw4zDL_c", videoTitle:"Lateral Line Hops — PJF Performance" },
  { id:"pogo-tutorial",     name:"Pogo Jump Tutorial",             tag:"PJF Technique",  sets:"2x20 reps", rest:"60 s",
    desc:"Step-by-step pogo jump form breakdown. Master the technique before adding speed or volume.",
    cues:["Minimal knee bend — ankles do the work","Arms stay at sides, small pumps","Think bounce, not jump","Heels barely touch the ground"],
    trainer:"PJF Performance", videoId:"j0nl5dWuqN4", videoTitle:"Pogo Jump Tutorial" },
  { id:"single-leg-pogo",   name:"Single Leg Pogo Jumps",         tag:"PJF Elasticity", sets:"3x12 each leg", rest:"60 s",
    desc:"One-foot rapid pogo hops. The single-leg version is harder and more sport-specific — every cut, drive, and jump happens on one leg.",
    cues:["Same cues as two-foot pogo — stiff ankle, ball of foot","Keep hopping foot directly under hip","Use arms for rhythm and balance","Start slow, build speed over sets"],
    trainer:"PJF Performance", videoId:"48hYRGlXvHw", videoTitle:"Single Leg Pogo Jumps" },
  { id:"lat-skater-hops",   name:"Lateral Skater Hops",           tag:"PJF Lateral",    sets:"3x10 each side", rest:"60 s",
    desc:"Speed-skater style lateral bounds. Trains the exact lateral power used in crossovers, defensive slides, and drive-and-kick movements.",
    cues:["Reach trailing leg far behind","Soft landing — absorb through the whole leg","Pause one second on each landing","Build distance, not just speed"],
    trainer:"PJF Performance", videoId:"gS4F_YrwZVs", videoTitle:"Lateral Skater Hops" },
  { id:"broad-bounds-sprint", name:"Broad Jumps + Bounds + Sprint", tag:"PJF Combo",    sets:"3 rounds", rest:"90 s",
    desc:"Broad jump, then lateral bounds, then sprint. Combines horizontal power, lateral explosiveness, and acceleration in one drill.",
    cues:["Full effort on every component","Reset between jumps — quality over speed","Stick each broad jump landing before bounding","Explode into the sprint"],
    trainer:"PJF Performance", videoId:"p24gY-uIlz4", videoTitle:"Broad Jumps + Bounds + Sprint" },
  { id:"drop-jump",         name:"Drop Jump",                      tag:"PJF Reactive",   sets:"3x6", rest:"90 s",
    desc:"Step off a box, land, and immediately jump as high as possible. Trains the stretch-shortening cycle — the key to reactive jumping power.",
    cues:["Step off — do not jump off the box","Minimal ground contact time — land and GO","Think of the floor as hot","Arms drive hard on the jump"],
    trainer:"PJF Performance", videoId:"LrZuW-sJPBo", videoTitle:"Drop Jump Exercise" },
  { id:"snap-down-prog",    name:"Snap Down Progression",          tag:"PJF Landing",    sets:"3x8", rest:"60 s",
    desc:"Progressive snap-down drill — start with quarter squat, advance to full athletic landing. Builds deceleration skill safely.",
    cues:["Each level must be clean before advancing","Land WIDE — feet outside hips","Eyes forward — not down","Hold each landing completely still"],
    trainer:"PJF Performance", videoId:"_YudFDcW_Iw", videoTitle:"Snap Down Progression" },
  { id:"pogo-to-tuck",      name:"Pogo Jump to Tuck Jump",         tag:"PJF Combo",      sets:"3x6 combos", rest:"90 s",
    desc:"Several rapid pogos, then explode into a max tuck jump. Combines elastic energy with vertical power in one sequence.",
    cues:["Pogos are fast and light — conserve energy","The tuck jump is MAX effort","Pull knees to chest at the peak","Land soft after the tuck"],
    trainer:"PJF Performance", videoId:"IcfbOBftn5c", videoTitle:"Pogo Jump to Tuck Jump" },
  { id:"vj-progression",    name:"Vertical Jump Progression",      tag:"PJF Program",    sets:"Follow video", rest:"As directed",
    desc:"Structured plyometric progression for building vertical jump height. Covers foundational to advanced movements in sequence.",
    cues:["Follow the order — it is a progression","Do not skip levels","Track your vertical jump weekly","Rest days matter as much as training days"],
    trainer:"PJF Performance", videoId:"9GMqCkrAHbg", videoTitle:"Vertical Jump Plyometric Progression" },
  { id:"full-plyo-workout",  name:"Full Plyometric Workout",        tag:"PJF Program",    sets:"Follow video", rest:"As directed",
    desc:"Complete guided plyometric session. Use this as a standalone workout on explosion days.",
    cues:["Warm up before starting","Full rest between rounds — quality matters","Form first, then add speed","Track how you feel after each session"],
    trainer:"PJF Performance", videoId:"MNUxK3mbL0c", videoTitle:"Full Plyometric Workout" },
  { id:"dunk-training",      name:"Dunk Training Plyometrics",      tag:"PJF Hoops",      sets:"Follow video", rest:"As directed",
    desc:"Basketball-specific plyometric session focused on vertical jump and explosiveness for dunking and shot-blocking.",
    cues:["Apply every rep to your basketball game","Visualize jumping for a ball on every rep","Track your standing reach weekly","Patience — vertical gains take 6-8 weeks minimum"],
    trainer:"PJF Performance", videoId:"9AH6wPZVAwA", videoTitle:"Dunk Training Plyometrics" },
];

const W_HANDLES = [
  { id:"tennis-dribble", name:"Tennis Ball Toss + Dribble", tag:"Hand-Eye",
    sets:"3x60s each hand", rest:"20 s",
    desc:"Dribble basketball with one hand while tossing and catching a tennis ball with the other. Forces eyes up and builds true ball feel.",
    cues:["Start slow — dribble stays at hip height","Toss tennis ball at eye level","Progress: dribble between legs while doing the toss","No peeking at the basketball — trust your hands"],
    trainer:"RTG Backyard Series", videoId:"nozHTvLyL0o", videoTitle:"Tennis Ball Basketball Dribbling — 4 Variations" },
  { id:"tennis-wall",    name:"Tennis Ball Wall Toss",       tag:"Reaction",
    sets:"3x45s", rest:"20 s",
    desc:"Bounce a tennis ball off a wall and catch it while simultaneously dribbling a basketball. Trains reaction time and hand independence.",
    cues:["Stand 3-4 feet from wall","Throw with one hand, catch with same or switch","Dribble hand stays independent — do not pause it","Level up: throw from behind your back"],
    trainer:"Hand-Eye Training", videoId:"c0bSiDb-WhE", videoTitle:"Tennis Ball Wall Toss + Control Dribble" },
  { id:"figure-8",       name:"Figure 8 Stationary",         tag:"Foundation",
    sets:"3x30s each direction", rest:"15 s",
    desc:"Dribble in a figure-8 pattern around and between your legs. Mike Conley and DJ Sackmann go-to warm-up.",
    cues:["Wide stance — knees bent, athletic base","Smooth rhythm first, then speed up","Eyes up the entire time","Reverse direction every set"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"W1abDeKo7RU", videoTitle:"7 Minute Ball Handling Warm-Up — DJ Sackmann" },
  { id:"weak-hand",      name:"Weak Hand Development",        tag:"Off-Hand",
    sets:"10 min dedicated left hand", rest:"N/A",
    desc:"Dominant hand OFF. The single most impactful thing a 10-year-old can do to become a skilled ball handler.",
    cues:["Start with simple stationary pound dribbles — master before moving","No using the strong hand as a crutch","Dribble while watching TV or walking around","Patience — it will feel terrible before it feels okay"],
    trainer:"Coach Ryan R2BBall", videoId:"WW_1g1eSSrM", videoTitle:"Improve Your Off Hand Dribble — Full Workout" },
  { id:"two-ball",       name:"Two Ball Dribbling",            tag:"Coordination",
    sets:"3x45s each drill", rest:"20 s",
    desc:"Both hands simultaneously — simultaneous pound, alternating, staggered. Fastest way to develop ambidexterity.",
    cues:["Shoulders relaxed — do not tense up trying to control both","Both balls at same height","Eyes forward — especially on alternating variation","Start slow. Speed is earned"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"3N92fry2Jdw", videoTitle:"Two Ball Dribble Challenge — DJ Sackmann" },
  { id:"cone-attacks",   name:"Cone Attack Moves",             tag:"On-Ball Moves",
    sets:"5 reps each move each side", rest:"30 s",
    desc:"3-4 cones as imaginary defenders. Attack each with: crossover, hesitation, in-and-out, between legs.",
    cues:["Approach the cone AT SPEED — slow players do not need moves","Sell the fake with eyes and shoulder","Explosive first step AFTER the move","Change of pace: slow to FAST"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"9yUi5_JH41A", videoTitle:"Every Hooper Should Do These Handle Drills — Tyler Relph" },
  { id:"handles-followalong", name:"Beginning Youth Ball Handling", tag:"Jason Otter",
    sets:"Follow along 10 min", rest:"As directed",
    desc:"Jason Otter real-time ball handling workout built specifically for youth beginners. Primarily stationary with moving drills added. Perfect daily follow-along.",
    cues:["Match his pace — this is real-time training","Eyes up the whole session","Focus on the transition between stationary and movement"],
    trainer:"Jason Otter · OtterBasketball", videoId:"p5QUHYvRt3E", videoTitle:"Beginning Ball Handling for Youth — Jason Otter" },
  { id:"sackmann-detail", name:"Detailed Dribbling Workout",   tag:"DJ Sackmann",
    sets:"Follow along 12 min", rest:"As directed",
    desc:"DJ Sackmann works through a stationary series focused on exact movements players use in games. Covers body position, rhythm, and hand placement details most coaches skip.",
    cues:["Focus on shoulder drop and hip — not just the hand","Every rep looks the same — consistency is muscle memory","Watch his feet: planted, athletic, never flat-footed"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"bw38uZFvC0A", videoTitle:"Detailed Dribbling Workout — DJ Sackmann" },
  { id:"sackmann-hesi",   name:"Hesitation Move Breakdown",    tag:"DJ Sackmann",
    sets:"5 reps each variation each side", rest:"30 s",
    desc:"DJ Sackmann breaks down the hesitation using a 3-cone drill. The hesi is the most useful move in basketball — every guard needs to own it.",
    cues:["Slow-slow-FAST — sell the slowdown before the burst","Eyes stay up — look at the rim to freeze the defender","Inside shoulder drops before the step — that is the sell"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"j4opotx5ZQI", videoTitle:"Hesitation Drill Breakdown — DJ Sackmann" },
  { id:"relph-twoball",   name:"Two Ball Combo Move",           tag:"Tyler Relph",
    sets:"3x45s", rest:"20 s",
    desc:"Tyler Relph advanced two-ball combo: simultaneous dribble while performing specific hand movement patterns. Trains hand independence.",
    cues:["Each hand has its own rhythm — do not sync them","Keep both balls at the same height","If you lose one, reset — do not try to save a bad rep"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"fR6O8m48sg0", videoTitle:"Advanced Two Ball Drill — Tyler Relph" },
  { id:"gethandles-btl",  name:"Between the Legs Tutorial",     tag:"Get Handles",
    sets:"3x60s", rest:"20 s",
    desc:"Jesse Muench step-by-step breakdown of the between-the-legs dribble — the most commonly done-wrong move in basketball.",
    cues:["Wide stance — the ball needs space to travel through","Lead hand reaches across and under to receive","Do not rush — clean slow beats sloppy fast"],
    trainer:"Get Handles · Jesse Muench", videoId:"JoBXmpLsDtQ", videoTitle:"How to Dribble Between the Legs — Get Handles" },
  { id:"otter-move",      name:"Dribbling on the Move",          tag:"Jason Otter",
    sets:"Follow along 20 min", rest:"As directed",
    desc:"Jason Otter real-time workout built for moving patterns — crossover on the move, between legs while walking, behind-back in transition.",
    cues:["Match his pace — real-time training","Eyes up the whole session","Focus on the transition from stationary to movement"],
    trainer:"Jason Otter · OtterBasketball", videoId:"HiE1XhWVoRI", videoTitle:"20 Minute Dribbling Workout — Jason Otter" },
  { id:"gethandles-daily", name:"Do This Daily — Handle Warm-Up", tag:"Get Handles",
    sets:"Daily follow along", rest:"As directed",
    desc:"Jesse Muench daily warm-up handle routine. Consistent daily beats one long weekly session every time.",
    cues:["This is a warm-up — not your full workout","Consistent daily practice beats one long weekly session","Speed up each time you do it — track your improvement"],
    trainer:"Get Handles · Jesse Muench", videoId:"9hniIMcXdH8", videoTitle:"Do This Daily — Get Handles Jesse Muench" },
];

const W_BASKETBALL = [
  { id:"dribble-basics", name:"Dribbling Fundamentals",         tag:"Ball Handling",
    sets:"2x each drill", rest:"30 s",
    desc:"Stationary pound dribbles, between-legs, behind-back intro. Do every session before anything else.",
    cues:["Dribble at hip height — not knee","Fingertips, never palm","Eyes up — not watching the ball"],
    trainer:"Get Handles · Jesse Muench", videoId:"MRrNi7uHmaY", videoTitle:"6 Best Dribbling Drills for Kids — Get Handles" },
  { id:"handles",        name:"Ball Handling Combos",            tag:"Handles",
    sets:"Follow along 10 min", rest:"N/A",
    desc:"Tyler Relph takes youngsters through a ball handling and footwork workout. Perfect follow-along for the 10-12 age range.",
    cues:["Change of pace — slow to fast","Protect ball with body","Move with purpose — no jogging"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"RRfgpohtnrI", videoTitle:"10 Min Teaching Workout — Tyler Relph Youth Handles + Footwork" },
  { id:"full-bball",     name:"10 Best Drills — 10 Year Olds",   tag:"Full Session",
    sets:"Full video", rest:"As directed",
    desc:"Complete guided session: dribbling, passing, shooting, footwork. Great for solo practice days.",
    cues:["Rep each drill before moving on","10 reps before next drill","Come back to weak areas at end"],
    trainer:"MOJO Basketball", videoId:"wOwM4mONQNY", videoTitle:"10 Best Basketball Drills for 10 Year Olds — MOJO" },
  { id:"defense",        name:"Defensive Footwork",              tag:"Defense",
    sets:"3x1 min", rest:"30 s",
    desc:"Athletic stance, slides, drop step recovery. Athletic kids who cannot defend get benched. Build this now.",
    cues:["Wide base — feet wider than shoulders","Never cross feet on slides","React do not guess"],
    trainer:"Joey Bergles Training", videoId:"ZoV6F6Zdz8s", videoTitle:"Youth Basketball Training — Speed, Strength and Quickness" },
  { id:"sackmann-footwork", name:"Footwork Foundation",          tag:"DJ Sackmann",
    sets:"3x each pattern", rest:"30 s",
    desc:"DJ Sackmann breaks down drop-step footwork that gives more attacking options off the dribble.",
    cues:["Drop means the heel drops — not the whole foot","Stay low through the drop","Speed of thought before speed of feet"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"Y3RZTBlAT_E", videoTitle:"Basketball Footwork Focus — DJ Sackmann" },
  { id:"relph-scoop",    name:"Scoop Layups",                    tag:"Tyler Relph",
    sets:"10 each side", rest:"20 s",
    desc:"Tyler Relph scoop layup breakdown — most underused finishing move, especially effective against taller defenders.",
    cues:["Release point is out in front — not above your head","Soft touch — not power","Reach under and through the contact"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"J3RYUety18M", videoTitle:"Scoop Layups — Tyler Relph Hoop Dynamic" },
  { id:"otter-firststep", name:"First Step Speed Workout",       tag:"Jason Otter",
    sets:"Follow along real-time", rest:"As directed",
    desc:"Jason Otter real-time workout building first-step quickness with the basketball.",
    cues:["The first step wins the possession — this is that drill","Low start position before every rep","Eyes see the target before the feet move"],
    trainer:"Jason Otter · OtterBasketball", videoId:"OjszzpwkBSo", videoTitle:"First Step Workout — Jason Otter" },
  { id:"relph-5drills",  name:"Tyler Relph 5 Hoops Drills",      tag:"Tyler Relph",
    sets:"10 reps each drill", rest:"30 s",
    desc:"Tyler Relph go-to 5-drill sequence covering every major skill in one session. Great standalone workout.",
    cues:["Do them in order — they build on each other","Max effort on every rep","Note which drill feels hardest and spend extra time there"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"PBDkRpt-RIc", videoTitle:"Tyler Relph's 5 Hoops Drills" },
  { id:"sackmann-finish", name:"Footwork and Finishes",          tag:"DJ Sackmann",
    sets:"5 reps each finish each side", rest:"30 s",
    desc:"DJ Sackmann covering layup footwork and finishing variations. Two-step, Euro step, and one-foot gather.",
    cues:["Footwork first — get the steps right before the finish","Euro step: big step away, gather, finish opposite","Each finish has a situation — learn which to use when"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"U-mvPrKRsWE", videoTitle:"Footwork and Finishes — DJ Sackmann" },
  { id:"gethandles-combo", name:"Combo Crossover — Beat Defenders", tag:"Get Handles",
    sets:"5 reps each combo each side", rest:"30 s",
    desc:"Jesse Muench breaks down between-legs into behind-back combo — go-to sequence for breaking down an aggressive defender.",
    cues:["Set up the combo with a hard drive the opposite direction first","Between legs is the fake — behind back is the attack","Do not telegraph — same speed on setup as the move"],
    trainer:"Get Handles · Jesse Muench", videoId:"i1bQI_esIIw", videoTitle:"Combo Crossover Beat Defenders — Get Handles" },
  { id:"youth-finishing", name:"7 Must-Know Finishing Drills",   tag:"Youth",
    sets:"10 each drill", rest:"30 s",
    desc:"Seven finishing drills designed specifically for youth — basic layups, reverse layups, two-foot power, and contact finishes.",
    cues:["Two-foot power layup first — most reliable at this age","Reverse layup: extend ball to far side of the board","Contact drill: do not shy away — embrace it"],
    trainer:"Youth Basketball Coach", videoId:"JaHxR1yeo-k", videoTitle:"7 Must-Know Finishing Drills — Youth Basketball" },
];

const W_CONDITIONING = [
  { id:"down-ups",         name:"Down Ups",                        tag:"Conditioning",   sets:"3x10", rest:"30 s",
    desc:"Drop to the ground and get back up as fast as possible. Simulates getting up after diving for a loose ball — conditioning meets competition.",
    cues:["Full body hits the floor — chest down","Explode up immediately","Arms push first, then hips","Keep moving — no pausing at the top or bottom"],
    videoId:"4w1DBvYVt-g", videoTitle:"Down Ups Exercise" },
  { id:"burpees",          name:"Burpee Progression",              tag:"Conditioning",   sets:"3x8", rest:"45 s",
    desc:"The complete conditioning drill — squat, plank, push-up, jump. Build from half-burpee to full with jump.",
    cues:["Plank position must be solid — no sagging hips","Push-up is optional until upper body is ready","Jump at top — arms overhead","Land soft — right back into the squat"],
    videoId:"TU8QYVW0gDU", videoTitle:"Burpee Progression" },
  { id:"mountain-climbers", name:"Mountain Climbers",              tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"In a plank, drive knees to chest alternately. Builds core stability, hip flexor strength, and conditioning simultaneously.",
    cues:["Hips stay level — do not bounce them","Shoulders directly over hands","Drive knee toward same-side elbow","Keep moving — no pausing"],
    videoId:"nmwgirgXLYM", videoTitle:"Mountain Climbers" },
  { id:"cross-mt-climbers", name:"Cross-Body Mountain Climbers",   tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"Drive each knee toward the OPPOSITE elbow. Adds rotational core challenge — transfers to crossover moves and defensive rotations.",
    cues:["Rotate from the core — not just the hip","Keep the plank solid","Slower than regular mountain climbers — control the rotation","Both shoulders stay square to the floor"],
    videoId:"0sVVgQ6K8Jo", videoTitle:"Cross Body Mountain Climbers" },
  { id:"high-knees",       name:"High Knees",                      tag:"Conditioning",   sets:"3x20 s", rest:"30 s",
    desc:"Run in place driving knees above waist height. Builds hip flexor strength, leg turnover speed, and conditioning.",
    cues:["Drive knee UP — not just forward","Pump arms: opposite arm to opposite leg","Stay on balls of feet","Go as fast as you can maintain form"],
    videoId:"8opcQdC-V-U", videoTitle:"High Knees Exercise" },
  { id:"fast-feet",        name:"Fast Feet Drill",                 tag:"Quickness",      sets:"3x15 s", rest:"30 s",
    desc:"Rapid short steps in place, then react to a signal. Directly trains the foot speed and reaction time needed for defense.",
    cues:["Barely lift feet off the ground — fast touches","Stay low in athletic stance","Weight on balls of feet","React to the signal — do not anticipate"],
    videoId:"QXO0uR0A6qI", videoTitle:"Fast Feet Drill" },
  { id:"crab-walks",       name:"Crab Walks",                      tag:"Full Body",      sets:"3x20 yards", rest:"30 s",
    desc:"On hands and feet facing up, walk forward and backward. Builds posterior shoulder strength, hip extension, and full-body coordination.",
    cues:["Hips up — not sagging toward the floor","Walk opposite hand and foot together","Eyes up — not at the ground","Keep hips level throughout"],
    videoId:"xm0_-R3tI8g", videoTitle:"Crab Walk Exercise" },
  { id:"frog-jumps",       name:"Frog Jumps",                      tag:"Power + Cardio", sets:"3x8", rest:"60 s",
    desc:"Deep squat, then explode upward and forward, land back in the squat. Builds hip power and conditions the legs simultaneously.",
    cues:["Deep squat before each jump","Explode from the bottom — no pause","Swing arms forward on takeoff","Land in squat — immediately go again"],
    videoId:"ZB8Z9Q5N4bA", videoTitle:"Frog Jumps Exercise" },
  { id:"plank-jacks",      name:"Plank Jacks",                     tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"In a plank, jump feet out and in like a jumping jack. Core stability under movement — harder than it looks.",
    cues:["Hips stay level — do not rise or dip","Shoulders stay over hands","Land soft with each hop","Breathe steadily throughout"],
    videoId:"K1VLaXoRRdk", videoTitle:"Plank Jacks" },
  { id:"speed-skaters",    name:"Speed Skaters",                   tag:"Lateral Power",  sets:"3x30 s", rest:"45 s",
    desc:"Lateral bounds alternating feet — like a speed skater. Builds the same lateral explosiveness as defensive slides but with more power.",
    cues:["Reach trailing leg far behind","Pause one second on each landing","Drive forward and lateral — not just sideways","Build distance over time"],
    videoId:"3PrZZ9S5Wm0", videoTitle:"Speed Skaters Exercise" },
  { id:"shuffle-sprint",   name:"Shuffle + Sprint Drill",          tag:"Basketball",     sets:"5 rounds", rest:"30 s",
    desc:"Defensive shuffle sideways, then explode into a forward sprint. The exact movement pattern of switching from help defense to chase-down pursuit.",
    cues:["Low and wide on the shuffle — never let feet touch","Drop step to transition to sprint","First sprint step is the longest","Eyes forward on the sprint"],
    videoId:"zHirJs7syAI", videoTitle:"Shuffle + Sprint Drill" },
  { id:"quick-feet-cones", name:"Quick Feet Cone Drill",           tag:"Agility",        sets:"5 rounds", rest:"30 s",
    desc:"Navigate through cones with rapid short steps. Trains the foot quickness and spatial awareness needed for dribbling and defending in traffic.",
    cues:["Short choppy steps — do not overreach","Stay low throughout","Eyes up — anticipate the next cone","Speed comes after consistency is built"],
    videoId:"Lq8Ccr6yv_4", videoTitle:"Quick Feet Cone Drill" },
  { id:"wall-sit",         name:"Wall Sit",                        tag:"Strength/Mental", sets:"3x30-60 s", rest:"45 s",
    desc:"Thighs parallel, back flat against wall. Builds quad endurance and mental toughness — hold until it burns.",
    cues:["Thighs parallel to floor — not higher","Back flat against the wall","Feet flat — not on toes","Breathe through the burn — it is mental too"],
    videoId:"y-wV4Venusw", videoTitle:"Wall Sit Exercise" },
  { id:"jumping-jacks",    name:"Jumping Jacks",                   tag:"Warm-Up",        sets:"3x30 s", rest:"15 s",
    desc:"Classic warm-up movement. Elevates heart rate, activates the whole body, and improves coordination. Use to open every session.",
    cues:["Full arm extension overhead","Land softly — balls of feet","Steady rhythm — not frantic","Use as a warm-up, not a main exercise"],
    videoId:"c4DAnQ6DtF8", videoTitle:"Jumping Jacks" },
  { id:"squat-jacks",      name:"Squat Jacks",                     tag:"Power + Cardio", sets:"3x15", rest:"45 s",
    desc:"Jump feet wide into a squat, then jump back together. Combines leg power with conditioning — harder and more effective than jumping jacks.",
    cues:["Land in a real squat — thighs parallel","Jump from the squat — do not stand first","Stay low throughout","Chest tall in every squat position"],
    videoId:"gVgqVqYlF1A", videoTitle:"Squat Jacks Exercise" },
  { id:"push-shoulder-taps", name:"Push-Up Shoulder Taps",         tag:"Upper Body Core", sets:"3x10 each side", rest:"45 s",
    desc:"Do a push-up, then tap each shoulder alternately while in the top position. Adds anti-rotation challenge to the push-up.",
    cues:["Hips do not rotate — resist the rotation","Wide stance helps — feet hip-width or wider","Slow on the taps — control beats speed","Full push-up between each set of taps"],
    videoId:"gWHQpMUd4MM", videoTitle:"Push-Up Shoulder Taps" },
];

const W_COORDINATION = [
  { id:"carioca",             name:"Carioca Drill",               tag:"Footwork",          sets:"3x20 yards", rest:"30 s",
    desc:"Crossover running laterally — alternating front and back crosses. The foundation of hip mobility and lateral coordination.",
    cues:["Stay low and light on your feet","Drive hips through each cross","Arms stay relaxed at sides","Speed comes from rhythm, not force"],
    videoId:"1sR8irb7Z8A", videoTitle:"Carioca Drill" },
  { id:"lateral-carioca",     name:"Lateral Carioca",             tag:"Footwork",          sets:"3x15 yards each dir", rest:"30 s",
    desc:"Side-to-side carioca focusing on hip rotation and ground contact rhythm.",
    cues:["Rotate hips fully on each cross","Light foot contacts","Keep shoulders square and level","Build speed over each rep"],
    videoId:"DG3d8j4jRH4", videoTitle:"Lateral Carioca" },
  { id:"rhythm-line-hops",    name:"Rhythm Line Hops",            tag:"Rhythm",            sets:"3x20 s", rest:"30 s",
    desc:"Two-foot hops in a rhythmic pattern over a line. Builds timing, coordination, and foot-speed rhythm.",
    cues:["Stay on balls of feet","Keep a consistent rhythm — like a metronome","Small hops — clearance only","Eyes forward, not down"],
    videoId:"YB0egDzsu18", videoTitle:"Rhythm Line Hops" },
  { id:"quick-step-matrix",   name:"Quick Step Matrix",           tag:"Multi-Direction",   sets:"3 rounds", rest:"45 s",
    desc:"Multi-directional quick steps in a grid or box pattern. Trains the ability to change direction and foot placement rapidly.",
    cues:["Short choppy steps","Stay in an athletic base — do not stand tall","Each direction gets equal attention","Speed comes after pattern is memorized"],
    videoId:"3X1V8l_J0lA", videoTitle:"Quick Step Matrix" },
  { id:"sl-rhythm-hops",      name:"Single Leg Rhythm Hops",      tag:"Single Leg Coord",  sets:"3x12 each leg", rest:"30 s",
    desc:"Rhythmic hops on one foot in a controlled pattern. Combines single-leg stability with coordination timing.",
    cues:["Stay on ball of foot","Find the rhythm before adding speed","Soft landings throughout","Switch legs and notice the difference"],
    videoId:"YbM5jM6s8VQ", videoTitle:"Single Leg Rhythm Hops" },
  { id:"cross-body-toe-taps", name:"Cross Body Toe Taps",         tag:"Cross-Body",        sets:"3x20 s", rest:"20 s",
    desc:"Alternate tapping each foot across the midline on a line or cone. Trains cross-body coordination and hip mobility simultaneously.",
    cues:["Reach across the midline on each tap","Stay upright — do not lean","Alternate at a consistent rhythm","Add a bounce between taps to level up"],
    videoId:"K0nS8Wjz3lQ", videoTitle:"Cross Body Toe Taps" },
  { id:"reactive-cone-calls", name:"Reactive Cone Calls",         tag:"Reaction",          sets:"3x45 s", rest:"30 s",
    desc:"React to called cone colors or numbers and sprint to touch. Trains eyes-up awareness and reactive movement together.",
    cues:["Stay in ready position between cues","First step is an explosive push — not a lean","React, do not anticipate","Eyes on the caller, not the cones"],
    videoId:"8F8oJ0V3sXU", videoTitle:"Reactive Cone Calls" },
  { id:"partner-mirror",      name:"Partner Mirror Drill",        tag:"Reaction",          sets:"3x30 s", rest:"30 s",
    desc:"Mirror your partner's movements in real time. The most game-realistic agility drill — you must read and react, not predict.",
    cues:["Stay in low athletic stance","Eyes on partner's hips — hips tell you direction before feet do","Do not let your partner get past you","Compete — this is a game"],
    videoId:"l9n2s6H6A3Y", videoTitle:"Partner Mirror Drill" },
  { id:"tennis-reaction-catch",name:"Tennis Ball Reaction Catch", tag:"Hand-Eye",          sets:"3x45 s", rest:"20 s",
    desc:"Drop or toss a tennis ball off a wall and react to catch it. Trains reaction time and hand-eye coordination simultaneously.",
    cues:["Start in ready position — weight on balls of feet","Move first — do not wait to see where it goes","Try to catch it as low as possible","Toss at different angles each rep"],
    videoId:"wK5W-cE8m-Q", videoTitle:"Tennis Ball Reaction Catch" },
  { id:"alternating-line-hops",name:"Alternating Line Hops",     tag:"Rhythm",            sets:"3x20 s", rest:"20 s",
    desc:"Hop side to side over a line alternating the lead foot each rep. Adds a coordination layer to standard line hops.",
    cues:["Lead with a different foot each hop","Stay light — fast contacts","Consistent rhythm over maximum speed","Add forward/backward hops to progress"],
    videoId:"F4j6k9s6x6Q", videoTitle:"Alternating Line Hops" },
  { id:"hip-flip-footwork",   name:"Hip Flip Footwork",          tag:"Hip Mobility",      sets:"3x10 each dir", rest:"30 s",
    desc:"Open and close the hips rapidly while moving laterally. The hip flip is the foundation of changing direction without crossing your feet on defense.",
    cues:["Pivot from the hip — not the ankle","Stay low throughout","Plant the pivot foot firmly","Used on every defensive rotation — make it automatic"],
    videoId:"1iY8qM8P0xY", videoTitle:"Hip Flip Footwork" },
  { id:"fast-feet-turn",      name:"Fast Feet + Turn",           tag:"Quickness",         sets:"3x15 s", rest:"30 s",
    desc:"Rapid feet-in-place, then explode into a 180-degree turn on a signal. Combines foot speed with hip rotation and reaction.",
    cues:["Fast feet stay low — barely off the floor","Turn is explosive — full commitment","Land in athletic stance on the turn","React to the signal — do not anticipate it"],
    videoId:"QXO0uR0A6qI", videoTitle:"Fast Feet + Turn" },
  { id:"sl-snap-down-coord",  name:"Single Leg Snap Down",       tag:"Landing Coord",     sets:"3x8 each leg", rest:"45 s",
    desc:"Snap down onto a single leg from a standing position. Trains single-leg deceleration and landing control at a coordination level.",
    cues:["Snap FAST — then absorb completely","Soft landing — no loud contact","Hold every landing for 2 full counts","Progress: start from a box for extra height"],
    videoId:"2q6m0ZJkQwQ", videoTitle:"Single Leg Snap Down" },
  { id:"lateral-step-matrix", name:"Lateral Step Matrix",        tag:"Multi-Direction",   sets:"3 rounds", rest:"45 s",
    desc:"Lateral step pattern through a grid — forward, back, diagonals. The most complete footwork coordination drill.",
    cues:["Never let feet touch","Short choppy steps","Eyes up throughout the pattern","Memorize the pattern then add speed"],
    videoId:"5K6x7YxM4gI", videoTitle:"Lateral Step Matrix" },
  { id:"crossover-footwork",  name:"Crossover Footwork Patterns",tag:"Crossover",         sets:"3x each pattern", rest:"30 s",
    desc:"Structured crossover step sequences for basketball-specific footwork. Covers the exact foot patterns used in crossover dribbles and cuts.",
    cues:["Each pattern is a basketball move — visualize the defender","Plant foot firm before each crossover","Eyes up on every rep","Slow and clean beats fast and sloppy"],
    videoId:"s0Wl3n9k6VQ", videoTitle:"Crossover Footwork Patterns" },
];

const W_DECELERATION = [
  { id:"jump-stop-hold",       name:"Jump Stop Hold",            tag:"Landing",           sets:"3x8", rest:"45 s",
    desc:"Two-foot jump stop and FREEZE. The pivot foot foundation of every legal basketball move — master this before any other footwork.",
    cues:["Both feet land simultaneously","Freeze on every single landing — 2 full counts","Wide stance — not feet together","This is the most important basketball footwork drill"],
    videoId:"0UqQw6L0h5M", videoTitle:"Jump Stop Hold" },
  { id:"sl-stick-landing",     name:"Single Leg Stick Landing",  tag:"Single Leg",        sets:"3x8 each leg", rest:"45 s",
    desc:"Hop and land on one foot, absorb and hold completely still. Teaches the single-leg control that prevents ACL injuries.",
    cues:["Absorb through ankle, knee, and hip","Freeze completely — no extra steps","Knee tracks over second toe — it must NOT cave in","Hold 3 full counts before releasing"],
    videoId:"7WgzHOQGgYw", videoTitle:"Single Leg Stick Landing" },
  { id:"lateral-stick-landing",name:"Lateral Stick Landing",     tag:"Lateral",           sets:"3x8 each side", rest:"45 s",
    desc:"Bound laterally and stick the landing. Directly trains the deceleration needed after a drive, crossover, or defensive cut.",
    cues:["Reach as far as possible before landing","Land soft — toe to heel absorption","Hold every landing completely still","Progress: increase the bound distance"],
    videoId:"AezzGLeOTss", videoTitle:"Lateral Stick Landing" },
  { id:"drop-athletic-stance", name:"Drop To Athletic Stance",   tag:"Deceleration",      sets:"3x10", rest:"30 s",
    desc:"From standing, drop into a low athletic stance as quickly as possible. Trains the ability to decelerate instantly — essential for defensive positioning.",
    cues:["Drop fast — not slow","Land wide — feet outside hips","Hips back and low — not just bent knees","Hold the stance before rising"],
    videoId:"2N3h5P8Jxvk", videoTitle:"Drop To Athletic Stance" },
  { id:"sprint-to-stick",      name:"Sprint To Stick",           tag:"Deceleration",      sets:"3x5", rest:"60 s",
    desc:"Sprint full speed, then stick a two-foot landing on a line. Teaches the most important skill young athletes lack — decelerating at full speed.",
    cues:["Sprint at TRUE full speed — not 80%","Chop steps approaching the line","Two-foot plant — both feet hit together","Hold the landing for 3 seconds"],
    videoId:"9r9x9z8Vxg4", videoTitle:"Sprint To Stick" },
  { id:"decel-shuffle",        name:"Deceleration Shuffle",      tag:"Lateral Decel",     sets:"3x5 each dir", rest:"45 s",
    desc:"Full-speed defensive shuffle, then stop and hold. Trains lateral deceleration — the stopping skill used every defensive possession.",
    cues:["Shuffle at true speed — not jogging","Chop the last 2 steps to decelerate","Wide athletic stance on the stop","Hold position — do not fall forward"],
    videoId:"f9X4l7FQ2rY", videoTitle:"Deceleration Shuffle" },
  { id:"snap-down-to-hold",    name:"Snap Down To Hold",         tag:"Deceleration",      sets:"3x8", rest:"60 s",
    desc:"Snap down into a quarter squat and hold completely still. Builds the deceleration mechanics needed to stop after any explosive movement.",
    cues:["Snap down FAST — like cutting off your momentum","Land wide — feet outside hip width","Hold every rep for 3 counts","Build from quarter squat to full athletic stance over sets"],
    videoId:"_YudFDcW_Iw", videoTitle:"Snap Down To Hold" },
  { id:"broad-jump-stick-dec", name:"Broad Jump Stick",          tag:"Horizontal Power",  sets:"3x5", rest:"90 s",
    desc:"Jump as far forward as possible and stick the landing completely. Combines horizontal power with deceleration — the most complete landing drill.",
    cues:["Maximum distance takeoff","Absorb completely on landing — toes to ankles to knees to hips","Hold 3 seconds — completely still","Measure distance each week"],
    videoId:"QOVaHwm-Q6U", videoTitle:"Broad Jump Stick" },
  { id:"lateral-bound-stick",  name:"Lateral Bound Stick",       tag:"Lateral Power",     sets:"3x8 each side", rest:"60 s",
    desc:"Powerful lateral bound and stick the landing on one foot. Trains lateral power and single-leg deceleration together.",
    cues:["Maximum lateral distance","Land soft — absorb the energy","Stick and hold — 3 full counts","Progress: increase the bound distance weekly"],
    videoId:"gjiZLF5S6aA", videoTitle:"Lateral Bound Stick" },
  { id:"split-stance-absorb",  name:"Split Stance Absorption",   tag:"Staggered",         sets:"3x10", rest:"30 s",
    desc:"In a split stance, absorb force drops by bending into the position. Trains deceleration with staggered feet — common landing position in games.",
    cues:["Front shin stays vertical","Back heel can come up slightly","Absorb through BOTH legs","Hold each position before releasing"],
    videoId:"0mD9xv6W7s4", videoTitle:"Split Stance Absorption" },
  { id:"hop-hop-stick",        name:"Hop-Hop-Stick",             tag:"Reactive Landing",  sets:"3x6 each leg", rest:"45 s",
    desc:"Two small hops followed by a maximum effort stick landing. Trains the ability to absorb force after repeated ground contacts.",
    cues:["First two hops are light and rhythmic","Third contact is a FULL stick — maximum absorption","No extra steps or hops after the stick","Hold the stick for 2 full counts"],
    videoId:"3Yl8M6J4z6Q", videoTitle:"Hop-Hop-Stick" },
  { id:"reactive-landing",     name:"Reactive Landing Drill",    tag:"Reactive",          sets:"3x8", rest:"45 s",
    desc:"Jump or bound, react to a direction signal, and stick the landing in that direction. Combines reactive movement with deceleration control.",
    cues:["React to the signal at peak height","Land in the called direction","Absorb completely — do not let momentum continue","The faster the reaction, the better the landing"],
    videoId:"J3x9m5V6b7Q", videoTitle:"Reactive Landing Drill" },
  { id:"sl-snap-down-dec",     name:"Single Leg Snap Down",      tag:"Single Leg Decel",  sets:"3x8 each leg", rest:"45 s",
    desc:"Snap down onto a single leg and hold. The hardest deceleration skill — trains the single-leg control that protects the knee on every cut and landing.",
    cues:["Land on ball of foot first","Drive heel down to absorb","Knee tracks straight — NEVER caves in","Hold completely still for 3 counts"],
    videoId:"TN4x2Jx2g9E", videoTitle:"Single Leg Snap Down" },
  { id:"depth-landing-hold",   name:"Depth Landing Hold",        tag:"Depth",             sets:"3x6", rest:"60 s",
    desc:"Step off a low box and absorb into a held landing. The most controlled way to build landing mechanics — gravity does the work.",
    cues:["Step off — never jump off","Absorb completely before any movement","As quiet as possible — loud = poor absorption","Progress: increase box height slowly"],
    videoId:"FJx2hWm0A1Y", videoTitle:"Depth Landing Hold" },
  { id:"closeout-decel",       name:"Closeout Deceleration",     tag:"Basketball",        sets:"3x8", rest:"45 s",
    desc:"Sprint out to a shooter and decelerate with controlled footwork. The exact defensive skill used on every perimeter closeout.",
    cues:["Sprint is full speed to start","Chop steps at 6-8 feet — not earlier","Wide stance on arrival — ready to slide","Hand up and contest — this is a full defensive rep"],
    videoId:"3K7z5m8n2fQ", videoTitle:"Closeout Deceleration" },
];

const W_ATHLETIC = [
  { id:"hip-turns",            name:"Hip Turns",                 tag:"Hip Mobility",      sets:"3x10 each dir", rest:"30 s",
    desc:"Open and close the hips while moving — the foundation of athletic movement. Every cut, drive, and defensive slide starts with the hips.",
    cues:["Pivot from the hip — not the foot","Full range of motion each rep","Stay low throughout","Fast hips, controlled torso"],
    videoId:"wH8uL5hTQz4", videoTitle:"Hip Turns" },
  { id:"defensive-hip-flip",   name:"Defensive Hip Flip",        tag:"Defense",           sets:"3x10 each dir", rest:"30 s",
    desc:"Flip the hips from front-facing to side-facing while in a defensive stance. The key movement for transitioning from man defense to help defense.",
    cues:["Plant the pivot foot firmly","Hips open fully — not halfway","Stay in athletic stance throughout","Eyes up on every rep — practice seeing the court"],
    videoId:"9v9v0M8qY2M", videoTitle:"Defensive Hip Flip" },
  { id:"retreat-sprint",       name:"Retreat Sprint",            tag:"Backpedal",         sets:"3x5", rest:"45 s",
    desc:"Backpedal 5-8 yards, then turn and sprint. The exact movement pattern of getting beaten off the dribble and recovering.",
    cues:["Backpedal low — do not stand tall","Head stays still on the turn","Sprint is FULL effort — not 80%","Turn toward your strong side first"],
    videoId:"0K9vM6q7w0E", videoTitle:"Retreat Sprint" },
  { id:"closeout-footwork",    name:"Closeout Footwork",         tag:"Defense",           sets:"3x8", rest:"30 s",
    desc:"Sprint to a closeout position with controlled footwork. The most-used defensive movement in basketball — done every possession.",
    cues:["Sprint hard to start","Chop steps at 5-6 feet from shooter","Wide base on arrival","Hand up, stay balanced — do not fly by"],
    videoId:"V6_6pYBfQ4A", videoTitle:"Closeout Footwork" },
  { id:"shuffle-shuffle-sprint",name:"Shuffle Shuffle Sprint",   tag:"Transition",        sets:"5 rounds", rest:"30 s",
    desc:"Defensive shuffle then explode into a sprint. Trains the transition from defensive positioning to pursuit — used every time you run the floor.",
    cues:["Shuffle stays low — no bouncing","Drop step to trigger the sprint","First sprint step is the longest","Eyes up throughout"],
    videoId:"zHirJs7syAI", videoTitle:"Shuffle Shuffle Sprint" },
  { id:"backpedal-sprint",     name:"Backpedal To Sprint",       tag:"Transition",        sets:"3x5", rest:"45 s",
    desc:"Backpedal then plant and sprint forward. Trains the transition skill used when a defense collapses or you switch from zone to man.",
    cues:["Backpedal with purpose — stay low","Plant is an aggressive step — drive off it","Sprint straight ahead — do not drift","Speed of the turn determines the effectiveness"],
    videoId:"y6M6l6J7n2I", videoTitle:"Backpedal To Sprint" },
  { id:"sprint-float-sprint",  name:"Sprint Float Sprint",       tag:"Speed Variation",   sets:"3x1", rest:"60 s",
    desc:"Full sprint, float at 60% to recover, then explode back to full speed. Trains the ability to vary speeds — crucial for basketball where effort levels constantly change.",
    cues:["Full sprint means 100% — do not hold back","Float is recovery — relax your arms and face","Transition back to sprint is IMMEDIATE — no wind-up","This replicates full-court basketball exactly"],
    videoId:"5M9d0M6lQ8g", videoTitle:"Sprint Float Sprint" },
  { id:"reactive-slide",       name:"Reactive Slide Drill",      tag:"Defense",           sets:"3x30 s", rest:"30 s",
    desc:"Defensive slide, react to a signal and change direction. The most game-realistic defensive drill — you must read and react.",
    cues:["Stay low and wide throughout","React immediately — no hesitation","Feet never touch in the slide","Eyes on the signal, not the floor"],
    videoId:"2D6x4V7pJ0A", videoTitle:"Reactive Slide Drill" },
  { id:"crossover-run",        name:"Crossover Run",             tag:"Footwork",          sets:"3x20 yards", rest:"30 s",
    desc:"Running with crossover steps — trains the hip coordination and balance needed for offensive and defensive movement at full speed.",
    cues:["Cross over in FRONT — not behind","Stay low throughout","Build speed over the distance","Arms counter-rotate for balance"],
    videoId:"4T8m7V5kJ9Q", videoTitle:"Crossover Run" },
  { id:"acceleration-starts",  name:"Acceleration Starts",       tag:"Speed",             sets:"5x10 yards", rest:"45 s",
    desc:"Explosive starts from various positions — standing, crouching, on the ground. Builds first-step power from any position.",
    cues:["Lean into the first step — not just stand up","Drive the knee hard on the first step","Arms drive the speed","First 3 steps determine your acceleration"],
    videoId:"9GMqCkrAHbg", videoTitle:"Acceleration Starts" },
  { id:"three-step-burst",     name:"3-Step Burst",              tag:"Explosion",         sets:"3x8 each dir", rest:"30 s",
    desc:"3 explosive steps in a direction then stop. Trains the short-burst acceleration used in every basketball cut — the same pattern as a V-cut or curl.",
    cues:["First step is the longest and hardest","Each step builds on the last — it is an acceleration","Stop is controlled — decelerate into athletic stance","Direction can be forward, lateral, or diagonal"],
    videoId:"7f8n0xY5m0Q", videoTitle:"3-Step Burst" },
  { id:"drop-step-sprint",     name:"Drop Step Sprint",          tag:"Transition",        sets:"3x5 each side", rest:"30 s",
    desc:"Drop step then sprint in that direction. The exact movement used to transition from defensive slide to full sprint pursuit.",
    cues:["Drop step is decisive — commit fully","Drive off the drop step foot hard","Sprint is full speed immediately","This is a transition — not a separate movement"],
    videoId:"5r8mM9yJ7gI", videoTitle:"Drop Step Sprint" },
  { id:"defensive-recovery",   name:"Defensive Recovery Run",    tag:"Defense",           sets:"3x full court", rest:"60 s",
    desc:"Sprint back on defense at full speed while reading the offense ahead. Trains the defensive transition skill — getting back before the other team scores.",
    cues:["Sprint back at TRUE full speed — not jogging","Eyes on the ball — track the transition","Find your player early","Get between your player and the basket"],
    videoId:"6z9V3Q0l8xM", videoTitle:"Defensive Recovery Run" },
  { id:"lateral-sprint-combo", name:"Lateral Sprint Combo",      tag:"Multi-Direction",   sets:"4 rounds", rest:"45 s",
    desc:"Lateral shuffle into a sprint into a defensive slide. Combines three movement patterns in one drill — the sequence of movements used on every possession.",
    cues:["Each transition is SHARP — no slowing down between","Stay low throughout all three phases","Eyes up — see the floor","Full effort on every rep"],
    videoId:"rrImTQmO31E", videoTitle:"Lateral Sprint Combo" },
  { id:"reaction-sprint",      name:"Reaction Sprint Drill",     tag:"Reactive",          sets:"5 rounds", rest:"30 s",
    desc:"Sprint on an audio or visual signal. Trains pure reaction time and first-step quickness — the most important athletic quality in basketball.",
    cues:["Start in ready position — weight forward","React immediately — do not hesitate","First step is an explosive push","Track your reaction time over weeks"],
    videoId:"Qv9s2K7p6LQ", videoTitle:"Reaction Sprint Drill" },
];

const W_SHOOTING = [
  { id:"form-shots",     name:"Form Shots + Mikan",              tag:"Technique",
    sets:"50 makes", rest:"N/A",
    desc:"Start under basket. BEEF every rep: Balance, Eyes, Elbow, Follow-through. Do not move back until form is automatic.",
    cues:["Ball at forehead — not chest","Elbow under ball, not flaring","Hold follow-through until it hits net"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"PPs7Zvfrkgg", videoTitle:"Become an Elite Shooter — Tyler Relph Workshop" },
  { id:"catch-shoot",    name:"Catch and Shoot 5 Spots",          tag:"Volume",
    sets:"10 makes x 5 spots", rest:"N/A",
    desc:"Left block, left elbow, top of key, right elbow, right block. Track your makes every session.",
    cues:["Feet moving before the catch","Catch in shooting pocket","Same follow-through every time"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"XBacHmPLJLY", videoTitle:"10 Minutes of Shooting Drills — DJ Sackmann" },
  { id:"off-dribble",    name:"Off the Dribble Pull-Ups",         tag:"Game Shots",
    sets:"3x5 each side", rest:"N/A",
    desc:"Pull-up, one-dribble left, one-dribble right. These are the shots that happen in games.",
    cues:["Last dribble propels you into shot","Jump straight up — not forward","Land same spot you took off from"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"7ueOVhOeKEk", videoTitle:"Best Shooting Drill Ever — DJ Sackmann" },
  { id:"full-shooting",  name:"5-4-3-2-1 Shooting Drill",         tag:"Tyler Relph",
    sets:"Full round", rest:"N/A",
    desc:"Tyler Relph 5-4-3-2-1: 5 from corner, 4 from wing, 3 from top, 2 from other wing, 1 from other corner. Then repeat.",
    cues:["Track your makes — not just attempts","Move closer if form breaks","Shoot at game speed"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"r_wv-SigSug", videoTitle:"5-4-3-2-1 Shooting Drill — Tyler Relph" },
  { id:"sackmann-range", name:"Extend Your Shooting Range",       tag:"DJ Sackmann",
    sets:"50 makes progressive distance", rest:"N/A",
    desc:"DJ Sackmann range-building drill. Start close, make 5, step back 2 feet, repeat. Naturally develops more power through mechanics.",
    cues:["Make 5 from each spot before stepping back","If form breaks at any distance, stay there until it is clean","Range comes from legs — get your legs under you"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"aJLFNkb7QA4", videoTitle:"Extend Your Shooting Range — DJ Sackmann" },
  { id:"relph-5spot",    name:"5-Spot Make Drill",                 tag:"Tyler Relph",
    sets:"5 of 6 from each of 5 spots", rest:"N/A",
    desc:"Tyler Relph 5-spot drill with different footwork at each position. Make 5 of 6 before you move.",
    cues:["Do not move to the next spot until you hit 5 of 6","Different footwork each spot: hop, step-in, pivot","Compete against yourself — track your best score"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"qwhx3s8LVnA", videoTitle:"5 Spot Shooting Drill — Tyler Relph" },
  { id:"relph-42pt",     name:"42-Point Shooting Competition",     tag:"Tyler Relph",
    sets:"Full round — track your score", rest:"N/A",
    desc:"Tyler Relph favorite: 3-pointer = 3 pts, pull-up = 2 pts, layup = 1 pt. Closest thing to game pressure in solo practice.",
    cues:["Play it like a game — not just a drill","Mix your shot selection","Track your score every session and try to beat it"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"X9PMRvGxelc", videoTitle:"42-Point Shooting Competition — Tyler Relph" },
  { id:"sackmann-hesi-shot", name:"Shoot Out of Hesitations",     tag:"DJ Sackmann",
    sets:"5 reps each variation each side", rest:"30 s",
    desc:"DJ Sackmann drill connecting ball handling to shooting — hesitate the defender then rise for the shot.",
    cues:["The hesitation earns the shot — do not skip the setup","One foot anchored on the gather — do not drift","Balance on the catch: weight centered, ready to shoot"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"IUy1jilyT3w", videoTitle:"Shoot Out of Hesitations — DJ Sackmann" },
  { id:"relph-partner",  name:"Partner Fire Drill",                tag:"Tyler Relph",
    sets:"10 min with a partner", rest:"N/A",
    desc:"Tyler Relph catch-and-shoot off a pass from a partner. The passer rebounds and feeds right back. Game-speed reps.",
    cues:["Call for the ball — communication is part of the drill","Feet moving toward the pass before it arrives","Eyes: passer to rim — not passer to ball to rim"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"Z8D7OUwdkp4", videoTitle:"Partner Fire Drill — Tyler Relph" },
  { id:"otter-60min",    name:"60-Min Full Summer Workout",        tag:"Jason Otter",
    sets:"Full session", rest:"As directed",
    desc:"Jason Otter complete 60-minute summer workout covering shooting, dribbling, ball handling, and foot speed.",
    cues:["Use this on full training days — not as a warmup","Pause between sections if needed","Note which sections feel weakest and return to those"],
    trainer:"Jason Otter · OtterBasketball", videoId:"g9NnrU_2bX4", videoTitle:"60-Minute Summer Basketball Workout — Jason Otter" },
];

const WORKOUTS = {
  speed:        W_SPEED,
  balance:      W_BALANCE,
  strength:     [...W_STRENGTH, ...W_STRENGTH_EXTRA],
  explosion:    W_EXPLOSION,
  conditioning: W_CONDITIONING,
  coordination: W_COORDINATION,
  deceleration: W_DECELERATION,
  athletic:     W_ATHLETIC,
  handles:      W_HANDLES,
  basketball:   W_BASKETBALL,
  shooting:     W_SHOOTING,
};

const CATS = {
  speed:        { label:"Speed & Agility",         emoji:"⚡" },
  balance:      { label:"Balance & Foundation",    emoji:"🎯" },
  strength:     { label:"Strength Program",        emoji:"💪" },
  explosion:    { label:"Explosion & Jumps",       emoji:"💥" },
  conditioning: { label:"Conditioning",            emoji:"🔥" },
  coordination: { label:"Coordination",            emoji:"🎶" },
  deceleration: { label:"Deceleration & Landing",  emoji:"🛑" },
  athletic:     { label:"Athletic Movement",       emoji:"🏃" },
  handles:      { label:"Ball Handling",           emoji:"🤲" },
  basketball:   { label:"Basketball Skills",       emoji:"🏀" },
  shooting:     { label:"Shooting Reps",           emoji:"🎯" },
};

const SCHEDULE = [
  { day:"Mon", cats:["explosion","deceleration","balance"],   label:"Explosion + Landing + Foundation" },
  { day:"Tue", cats:["strength","conditioning","handles"],    label:"Strength + Conditioning + Handles" },
  { day:"Wed", cats:["balance","coordination"],               label:"Foundation + Coordination" },
  { day:"Thu", cats:["shooting","handles"],                   label:"Shots + Ball Handling 🏀" },
  { day:"Fri", cats:["speed","athletic"],                     label:"Speed + Athletic Movement" },
  { day:"Sat", cats:["strength","shooting"],                  label:"Strength + Full Court" },
  { day:"Sun", cats:[],                                       label:"Rest & Recovery 😴" },
];

const STR_DAYS = {
  "Day 1": { label:"Day 1 — Strength / Core",    ids:["goblet-sq","pushup","step-ups","db-rows","plank-hold"] },
  "Day 2": { label:"Day 2 — Balance / Movement", ids:["walk-lunge","glute-bridge","bosu-sq","sl-ball","side-plank"] },
  "Day 3": { label:"Day 3 — Power / Athletic",   ids:["box-jump","db-deadlift","ohp","split-sq","hollow-hold"] },
};



/* ═══════════════════════════════════════════════════════════════
   EXERCISE METADATA — difficulty, impact, age range, equipment.
   Keyed by exercise id. Powers age-aware workout generation.
═══════════════════════════════════════════════════════════════ */
const EXERCISE_META = {
  /* ─── SPEED ─── */
  "ladder":              { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","coordination"],    basketballTransfer:["footwork","quickness"],     equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "cone-cod":            { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["cutting","defense"],        equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "5-10-5":              { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["speed","cutting"],          equipment:"cones",        spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "lat-bounds":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["explosion","speed"],        equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "def-slide":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","speed"],          equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:120, funScore:6, workoutRole:["main"] },
  /* ─── BALANCE ─── */
  "sl-hold":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["ankles","core","feet"],            basketballTransfer:["defense","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:2, workoutRole:["warmup","recovery"] },
  "bosu-sq":             { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["legs","ankles","core"],            basketballTransfer:["jumping","landing"],        equipment:"bosu",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:5, workoutRole:["main"] },
  "sl-ball":             { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["ankles","core","coordination"],    basketballTransfer:["defense","reaction"],       equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "sl-squat":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","ankles"],         basketballTransfer:["jumping","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:4, workoutRole:["main"] },
  "lat-stick":           { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "triple-lat-hops":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","core"],          basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "pogo-hops":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","feet"],          basketballTransfer:["jumping","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:8, workoutRole:["warmup","main"] },
  "sl-balance-reach":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["ankles","hips","core"],            basketballTransfer:["defense","stability"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:3, workoutRole:["recovery"] },
  /* ─── STRENGTH main ─── */
  "goblet-sq":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","core"],           basketballTransfer:["jumping","power"],          equipment:"dumbbells",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "pushup":              { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["chest","shoulders","core"],        basketballTransfer:["strength","all"],           equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "step-ups":            { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes"],                  basketballTransfer:["jumping","first-step"],     equipment:"box",          spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "db-rows":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["back","biceps"],                   basketballTransfer:["strength","rebounding"],    equipment:"dumbbells",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:3, workoutRole:["main"] },
  "plank-hold":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core"],                            basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:2, workoutRole:["recovery"] },
  "walk-lunge":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","hamstrings"],     basketballTransfer:["running","cutting"],        equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "glute-bridge":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"strength",     bodyFocus:["glutes","hamstrings","core"],      basketballTransfer:["jumping","sprinting"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:3, workoutRole:["warmup","recovery"] },
  "side-plank":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core","obliques"],                 basketballTransfer:["cutting","defense"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:2, workoutRole:["recovery"] },
  "box-jump":            { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["jumping","explosion"],      equipment:"box",          spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "db-deadlift":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["hamstrings","glutes","back"],      basketballTransfer:["jumping","sprinting"],      equipment:"dumbbells",    spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:3, workoutRole:["main"] },
  "ohp":                 { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["shoulders","triceps","core"],      basketballTransfer:["shooting","strength"],      equipment:"dumbbells",    spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:4, workoutRole:["main"] },
  "split-sq":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","hips"],           basketballTransfer:["cutting","jumping"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:4, workoutRole:["main"] },
  "hollow-hold":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core"],                            basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:2, workoutRole:["recovery"] },
  "dead-bug":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"mobility",     bodyFocus:["core"],                            basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:3, workoutRole:["recovery"] },
  "reverse-lunge":       { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","hamstrings"],     basketballTransfer:["running","cutting"],        equipment:"none",         spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:5, workoutRole:["main"] },
  "bw-squats":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["quads","glutes","core"],           basketballTransfer:["jumping","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:4, workoutRole:["main"] },
  "str-full":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"strength",     bodyFocus:["full-body"],                       basketballTransfer:["strength","all"],           equipment:"dumbbells",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:1500, funScore:5, workoutRole:["main","finisher"] },
  /* ─── STRENGTH extra ─── */
  "bear-crawl":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["shoulders","core","coordination"], basketballTransfer:["stability","all"],          equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup","main"] },
  "broad-jump":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["jumping","first-step"],     equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "skater-jumps":        { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","explosion"],      equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "farmers-carry":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["grip","core","traps"],             basketballTransfer:["strength","all"],           equipment:"dumbbells",    spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:120, funScore:4, workoutRole:["main"] },
  "jump-rope":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["calves","ankles","coordination"],  basketballTransfer:["footwork","conditioning"],  equipment:"jump_rope",    spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:300, funScore:7, workoutRole:["warmup","main"] },
  /* ─── EXPLOSION ─── */
  "pogo-jumps":          { difficulty:"beginner",     impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","feet"],          basketballTransfer:["jumping","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["warmup","main"] },
  "single-leg-hops":     { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","quads"],         basketballTransfer:["jumping","cutting"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "lateral-bounds-pjf":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","explosion"],      equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "reactive-pogos":      { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves"],                 basketballTransfer:["jumping","reaction"],       equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  "broad-jump-stick":    { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["jumping","power"],          equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "squat-jumps":         { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes"],                   basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "tuck-jumps":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","core"],                     basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:10, workoutRole:["main"] },
  "snap-downs":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "depth-drop":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["landing","safety"],         equipment:"box",          spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "lateral-line-hops":   { difficulty:"beginner",     impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves","feet"],          basketballTransfer:["quickness","footwork"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:9, workoutRole:["warmup","main"] },
  "pogo-tutorial":       { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"elastic",      bodyFocus:["ankles","calves"],                 basketballTransfer:["jumping","technique"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["warmup"] },
  "single-leg-pogo":     { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["ankles","calves"],                 basketballTransfer:["jumping","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  "lat-skater-hops":     { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","explosion"],      equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "broad-bounds-sprint": { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","ankles"],              basketballTransfer:["explosion","speed"],        equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:150, funScore:9, workoutRole:["main","finisher"] },
  "drop-jump":           { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","ankles","tendons"],         basketballTransfer:["jumping","power"],          equipment:"box",          spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "snap-down-prog":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "pogo-to-tuck":        { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["legs","ankles","core"],            basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:10, workoutRole:["main","finisher"] },
  "vj-progression":      { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["full-legs"],                       basketballTransfer:["jumping"],                  equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:1200, funScore:8, workoutRole:["main"] },
  "full-plyo-workout":   { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","core"],                basketballTransfer:["explosion","jumping"],      equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:1500, funScore:9, workoutRole:["main","finisher"] },
  "dunk-training":       { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["full-legs","core"],                basketballTransfer:["jumping","explosion"],      equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:1500, funScore:10, workoutRole:["main","finisher"] },
  /* ─── CONDITIONING ─── */
  "down-ups":            { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"conditioning", bodyFocus:["full-body"],                       basketballTransfer:["conditioning","toughness"], equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:4, workoutRole:["finisher"] },
  "burpees":             { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"conditioning", bodyFocus:["full-body"],                       basketballTransfer:["conditioning","strength"],  equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:3, workoutRole:["finisher"] },
  "mountain-climbers":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["core","shoulders"],                basketballTransfer:["conditioning","core"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "cross-mt-climbers":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["core","obliques","shoulders"],     basketballTransfer:["conditioning","core"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "high-knees":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["legs","hips","core"],              basketballTransfer:["speed","conditioning"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:6, workoutRole:["warmup","main"] },
  "fast-feet":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["feet","ankles","legs"],            basketballTransfer:["defense","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:45,  funScore:9, workoutRole:["warmup"] },
  "crab-walks":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"strength",     bodyFocus:["shoulders","hips","core"],         basketballTransfer:["conditioning","strength"],  equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:5, workoutRole:["main"] },
  "frog-jumps":          { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["legs","glutes","core"],            basketballTransfer:["jumping","conditioning"],   equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["finisher"] },
  "plank-jacks":         { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"conditioning", bodyFocus:["core","shoulders","legs"],         basketballTransfer:["conditioning","core"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["main"] },
  "speed-skaters":       { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"elastic",      bodyFocus:["legs","glutes","ankles"],          basketballTransfer:["cutting","conditioning"],   equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "shuffle-sprint":      { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","conditioning"],   equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "quick-feet-cones":    { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","coordination"],    basketballTransfer:["defense","quickness"],      equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:9, workoutRole:["warmup","main"] },
  "wall-sit":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"high",   movementType:"strength",     bodyFocus:["quads","glutes"],                  basketballTransfer:["strength","toughness"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:2, workoutRole:["finisher"] },
  "jumping-jacks":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"conditioning", bodyFocus:["full-body"],                       basketballTransfer:["conditioning","warmup"],    equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:6, workoutRole:["warmup"] },
  "squat-jacks":         { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"elastic",      bodyFocus:["legs","glutes"],                   basketballTransfer:["jumping","conditioning"],   equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["finisher"] },
  "push-shoulder-taps":  { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"strength",     bodyFocus:["chest","shoulders","core"],        basketballTransfer:["strength","stability"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:5, workoutRole:["main"] },
  /* ─── COORDINATION ─── */
  "carioca":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["warmup"] },
  "lateral-carioca":     { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["warmup"] },
  "rhythm-line-hops":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["feet","ankles"],                   basketballTransfer:["footwork","quickness"],     equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:7, workoutRole:["warmup"] },
  "quick-step-matrix":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","legs"],            basketballTransfer:["footwork","quickness"],     equipment:"cones",        spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "sl-rhythm-hops":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["ankles","calves","core"],          basketballTransfer:["footwork","balance"],       equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "cross-body-toe-taps": { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","core","coordination"],     basketballTransfer:["footwork","handles"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:6, workoutRole:["warmup"] },
  "reactive-cone-calls": { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["full-body","reaction"],            basketballTransfer:["defense","reaction"],       equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:10, workoutRole:["main"] },
  "partner-mirror":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["full-body","reaction"],            basketballTransfer:["defense","reaction"],       equipment:"partner",      spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:10, workoutRole:["main"] },
  "tennis-reaction-catch":{ difficulty:"beginner",    impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","eyes","reaction"],         basketballTransfer:["ball-handling","reaction"], equipment:"tennis_ball",  spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:9, workoutRole:["warmup","main"] },
  "alternating-line-hops":{ difficulty:"beginner",    impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["feet","ankles"],                   basketballTransfer:["footwork","coordination"],  equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:8, workoutRole:["warmup"] },
  "hip-flip-footwork":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "fast-feet-turn":      { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","hips"],            basketballTransfer:["defense","quickness"],      equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:8, workoutRole:["warmup","main"] },
  "sl-snap-down-coord":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["landing","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "lateral-step-matrix": { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","ankles","hips"],            basketballTransfer:["footwork","defense"],       equipment:"cones",        spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "crossover-footwork":  { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"coordination", bodyFocus:["feet","hips","ankles"],            basketballTransfer:["handles","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  /* ─── DECELERATION ─── */
  "jump-stop-hold":      { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","core"],            basketballTransfer:["footwork","post-moves"],    equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "sl-stick-landing":    { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["landing","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "lateral-stick-landing":{ difficulty:"intermediate",impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["cutting","defense"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "drop-athletic-stance":{ difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"deceleration", bodyFocus:["legs","hips","core"],              basketballTransfer:["defense","reaction"],       equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5, workoutRole:["warmup"] },
  "sprint-to-stick":     { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"deceleration", bodyFocus:["full-legs","ankles","core"],       basketballTransfer:["defense","stopping"],       equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:8, workoutRole:["main","finisher"] },
  "decel-shuffle":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","hips"],                     basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "snap-down-to-hold":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "broad-jump-stick-dec":{ difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["full-legs","ankles"],              basketballTransfer:["jumping","landing"],        equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "lateral-bound-stick": { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["cutting","defense"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "split-stance-absorb": { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["landing","balance"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:4, workoutRole:["main"] },
  "hop-hop-stick":       { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","calves","core"],          basketballTransfer:["landing","jumping"],        equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "reactive-landing":    { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["full-legs","ankles","reaction"],   basketballTransfer:["landing","defense"],        equipment:"none",         spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"] },
  "sl-snap-down-dec":    { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["ankles","knees","hips"],           basketballTransfer:["cutting","landing"],        equipment:"none",         spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "depth-landing-hold":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","ankles","hips"],            basketballTransfer:["landing","safety"],         equipment:"box",          spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "closeout-decel":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"deceleration", bodyFocus:["legs","hips","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  /* ─── ATHLETIC MOVEMENT ─── */
  "hip-turns":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet"],                     basketballTransfer:["defense","cutting"],        equipment:"none",         spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup"] },
  "defensive-hip-flip":  { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:6, workoutRole:["main"] },
  "retreat-sprint":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","speed"],          equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "closeout-footwork":   { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "shuffle-shuffle-sprint":{ difficulty:"beginner",   impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","transition"],     equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "backpedal-sprint":    { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","speed"],          equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "sprint-float-sprint": { difficulty:"advanced",     impactLevel:"high",   intensityLevel:"high",   movementType:"conditioning", bodyFocus:["full-legs","lungs"],               basketballTransfer:["conditioning","speed"],     equipment:"none",         spaceRequired:"large",      ageRange:[11,14], estimatedDuration:150, funScore:6, workoutRole:["finisher"] },
  "reactive-slide":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["defense","reaction"],       equipment:"cones",        spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  "crossover-run":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"coordination", bodyFocus:["hips","feet","ankles"],            basketballTransfer:["footwork","cutting"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup","main"] },
  "acceleration-starts": { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["speed","first-step"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "three-step-burst":    { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","ankles"],            basketballTransfer:["speed","cutting"],          equipment:"none",         spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "drop-step-sprint":    { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips"],                     basketballTransfer:["defense","transition"],     equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:90,  funScore:7, workoutRole:["main"] },
  "defensive-recovery":  { difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"athletic",     bodyFocus:["legs","lungs"],                    basketballTransfer:["defense","conditioning"],   equipment:"none",         spaceRequired:"full_court", ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["finisher"] },
  "lateral-sprint-combo":{ difficulty:"intermediate", impactLevel:"high",   intensityLevel:"high",   movementType:"athletic",     bodyFocus:["full-legs","hips"],                basketballTransfer:["defense","conditioning"],   equipment:"none",         spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:8, workoutRole:["main","finisher"] },
  "reaction-sprint":     { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","reaction"],          basketballTransfer:["speed","defense"],          equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:90,  funScore:9, workoutRole:["main"] },
  /* ─── HANDLES ─── */
  "tennis-dribble":      { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","eyes","coordination"],     basketballTransfer:["ball-handling","reaction"], equipment:"tennis_ball",  spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:8, workoutRole:["main"] },
  "tennis-wall":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","eyes","reaction"],         basketballTransfer:["ball-handling","reaction"], equipment:"tennis_ball",  spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8, workoutRole:["main"] },
  "figure-8":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:6, workoutRole:["warmup","main"] },
  "weak-hand":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists"],                  basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:600, funScore:5, workoutRole:["main"] },
  "two-ball":            { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball_x2",spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "cone-attacks":        { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"cones",        spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "handles-followalong": { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "sackmann-detail":     { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:720, funScore:5, workoutRole:["main"] },
  "sackmann-hesi":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"cones",        spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "relph-twoball":       { difficulty:"advanced",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball_x2",spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "gethandles-btl":      { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:180, funScore:6, workoutRole:["main"] },
  "otter-move":          { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:1200, funScore:7, workoutRole:["main"] },
  "gethandles-daily":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists"],                  basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:600, funScore:6, workoutRole:["main"] },
  /* ─── BASKETBALL SKILLS ─── */
  "dribble-basics":      { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists"],                  basketballTransfer:["ball-handling","footwork"], equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "handles":             { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","footwork"], equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "full-bball":          { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["full-body","coordination"],        basketballTransfer:["all-skills"],              equipment:"basketball",   spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:1200, funScore:8, workoutRole:["main","finisher"] },
  "defense":             { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"athletic",     bodyFocus:["legs","hips","feet"],              basketballTransfer:["defense","footwork"],       equipment:"none",         spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:180, funScore:6, workoutRole:["main"] },
  "sackmann-footwork":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips"],                     basketballTransfer:["footwork","handles"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:180, funScore:6, workoutRole:["main"] },
  "relph-scoop":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["finishing","layups"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "otter-firststep":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips","coordination"],      basketballTransfer:["handles","speed"],          equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "relph-5drills":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["full-body","coordination"],        basketballTransfer:["all-skills"],              equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:600, funScore:7, workoutRole:["main"] },
  "sackmann-finish":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hands","coordination"],     basketballTransfer:["finishing","footwork"],     equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  "gethandles-combo":    { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  "youth-finishing":     { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["finishing","layups"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:600, funScore:8, workoutRole:["main"] },
  /* ─── SHOOTING ─── */
  "form-shots":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","shoulders"],      basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:600, funScore:5, workoutRole:["main"] },
  "catch-shoot":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "off-dribble":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet","hips"],    basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:180, funScore:6, workoutRole:["main"] },
  "full-shooting":       { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "sackmann-range":      { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "relph-5spot":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "relph-42pt":          { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet","hips"],    basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "sackmann-hesi-shot":  { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  "relph-partner":       { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:600, funScore:8, workoutRole:["main"] },
  "otter-60min":         { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["full-body","coordination"],        basketballTransfer:["all-skills"],              equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:3600, funScore:8, workoutRole:["main","finisher"] },
};

/* Age-based workout generation rules */
const AGE_RULES = {
  9:  { maxMinutes:12, maxExercises:4, maxHighImpact:1, focus:["coordination","balance","fun","skill"] },
  10: { maxMinutes:15, maxExercises:5, maxHighImpact:2, focus:["coordination","balance","elastic","skill"] },
  11: { maxMinutes:18, maxExercises:6, maxHighImpact:2, focus:["elastic","coordination","skill","strength"] },
  12: { maxMinutes:20, maxExercises:7, maxHighImpact:3, focus:["elastic","strength","skill","athletic"] },
  13: { maxMinutes:25, maxExercises:8, maxHighImpact:4, focus:["explosion","speed","conditioning","strength"] },
  14: { maxMinutes:30, maxExercises:9, maxHighImpact:5, focus:["explosion","speed","conditioning","strength"] },
};

/* ═══════════════════════════════════════════════════════════════
   WORKOUT TEMPLATES + GENERATOR
═══════════════════════════════════════════════════════════════ */
const WORKOUT_TEMPLATES = {
  jump:      { name:"Jump Workout",      emoji:"💥", desc:"Explosive power and landing control.",     cats:["explosion","deceleration","balance"],      structure:{warmup:1,main:3,finisher:1,recovery:0}, ageMin:10 },
  quickFeet: { name:"Quick Feet",        emoji:"⚡", desc:"Foot speed, agility, and reaction time.",  cats:["speed","coordination","athletic"],          structure:{warmup:2,main:3,finisher:1,recovery:0}, ageMin:9  },
  fullBody:  { name:"Full Body Athlete", emoji:"🏃", desc:"Strength, speed, and conditioning.",       cats:["strength","conditioning","athletic"],       structure:{warmup:1,main:3,finisher:1,recovery:1}, ageMin:9  },
  recovery:  { name:"Recovery Day",      emoji:"🔄", desc:"Light movement, balance, and mobility.",   cats:["balance","coordination"],                   structure:{warmup:2,main:2,finisher:0,recovery:2}, ageMin:9  },
  handles:   { name:"Ball Handling",     emoji:"🤲", desc:"Dribbling, footwork, and court IQ.",       cats:["handles","basketball","coordination"],      structure:{warmup:1,main:4,finisher:1,recovery:0}, ageMin:9  },
  shooting:  { name:"Shooting Session",  emoji:"🎯", desc:"Form, range, and shooting consistency.",   cats:["shooting","basketball"],                    structure:{warmup:1,main:3,finisher:1,recovery:0}, ageMin:9  },
};

const SCHED_TO_TEMPLATE = { explosion:"jump",deceleration:"jump",speed:"quickFeet",coordination:"quickFeet",athletic:"quickFeet",strength:"fullBody",conditioning:"fullBody",balance:"recovery",handles:"handles",basketball:"handles",shooting:"shooting" };

function generateWorkout(settings, templateKey, recentIds=[]) {
  const tmpl = WORKOUT_TEMPLATES[templateKey];
  if (!tmpl) return null;
  const age    = Math.min(14, Math.max(9, settings.athleteAge||12));
  const rule   = AGE_RULES[age];
  const dRank  = {beginner:0,intermediate:1,advanced:2};
  const pRank  = dRank[settings.experience||"beginner"]??0;
  const goals  = settings.goals||[];

  // Build pool from template categories, enrich with metadata
  const pool = tmpl.cats.flatMap(cat =>
    (WORKOUTS[cat]||[]).map(ex => ({ ...ex, _cat:cat, meta:EXERCISE_META[ex.id]||{} }))
  );

  // Filter: age range + difficulty (allow one level stretch for challenge)
  const eligible = pool.filter(ex => {
    const m = ex.meta;
    if (m.ageRange && age < m.ageRange[0]) return false;
    return (dRank[m.difficulty]??0) <= pRank + 1;
  });

  // Score: funScore + goal match + anti-repeat + randomness
  const scored = eligible.map(ex => {
    const m = ex.meta;
    let s = m.funScore || 5;
    if (goals.some(g => (m.basketballTransfer||[]).includes(g))) s += 2;
    if (age <= 11) s += (m.funScore||5) * 0.15; // weight fun more for young athletes
    if (recentIds.includes(ex.id)) s -= 4;
    s += Math.random() * 1.8;
    return { ...ex, _score:s };
  }).sort((a,b) => b._score - a._score);

  let highImpact = 0, totalSecs = 0;
  const maxSecs = rule.maxMinutes * 60 * 1.1;
  const used = new Set();
  const slots = { warmup:[], main:[], finisher:[], recovery:[] };

  const pick = (role, n, test) => {
    const out = [];
    for (const ex of scored) {
      if (out.length >= n) break;
      if (used.has(ex.id)) continue;
      const m = ex.meta, roles = m.workoutRole||[];
      if (!roles.some(r => test(r))) continue;
      if (m.impactLevel==="high") { if (highImpact >= rule.maxHighImpact) continue; highImpact++; }
      const dur = m.estimatedDuration || 90;
      if (totalSecs + dur > maxSecs) continue;
      totalSecs += dur;
      used.add(ex.id);
      out.push(ex);
    }
    return out;
  };

  slots.warmup   = pick("warmup",   tmpl.structure.warmup,   r => r==="warmup");
  slots.main     = pick("main",     tmpl.structure.main,     r => r==="main");
  slots.finisher = pick("finisher", tmpl.structure.finisher, r => r==="finisher");
  slots.recovery = pick("recovery", tmpl.structure.recovery, r => r==="recovery"||r==="warmup");

  const exercises = [
    ...slots.warmup.map(e=>({...e,role:"warmup"})),
    ...slots.main.map(e=>({...e,role:"main"})),
    ...slots.finisher.map(e=>({...e,role:"finisher"})),
    ...slots.recovery.map(e=>({...e,role:"recovery"})),
  ];

  return { templateKey, templateName:tmpl.name, templateEmoji:tmpl.emoji, templateDesc:tmpl.desc, exercises, totalSecs, generatedAt:Date.now() };
}

/* ═══════════════════════════════════════════════════════════════
   CHALLENGES
═══════════════════════════════════════════════════════════════ */
const CHALLENGES_DEF = [
  { id:"streak-3",   emoji:"🔥", name:"3-Day Streak",    type:"streak",    target:3,  desc:"Train 3 days in a row",              reward:"On Fire 🔥" },
  { id:"streak-7",   emoji:"💪", name:"Week Warrior",    type:"streak",    target:7,  desc:"Train all 7 days this week",         reward:"Week Warrior 💪" },
  { id:"jump-5",     emoji:"💥", name:"Jump Week",       type:"cat_week",  target:5,  cat:"explosion", desc:"5 explosion drills this week",   reward:"Sky High 💥" },
  { id:"shots-50",   emoji:"🏀", name:"50 Shots Made",   type:"shots_week",target:50, desc:"Make 50 shots this week",            reward:"Buckets 🏀" },
  { id:"handles-5",  emoji:"🤲", name:"Handle Master",   type:"cat_week",  target:5,  cat:"handles",   desc:"5 handle drills this week",      reward:"Handle King 🤲" },
  { id:"speed-5",    emoji:"⚡", name:"Speed Week",      type:"cat_week",  target:5,  cat:"speed",     desc:"5 speed drills this week",       reward:"Jet Feet ⚡" },
  { id:"today-3",    emoji:"🎯", name:"Full Send",       type:"day_count", target:3,  desc:"Complete 3+ drills today",           reward:"Full Send 🎯" },
  { id:"coord-5",    emoji:"🎶", name:"Coordination",   type:"cat_week",  target:5,  cat:"coordination", desc:"5 coordination drills this week", reward:"Body Control 🎶" },
];

const _ws = () => { const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toLocaleDateString("en-CA"); };

function getChallengeProgress(def, completed) {
  const today = new Date().toLocaleDateString("en-CA"), ws = _ws();
  if (def.type==="streak") {
    let streak=0, d=new Date();
    for (let i=0; i<14; i++) {
      const k=d.toLocaleDateString("en-CA");
      if (Object.keys(completed).some(c=>c.startsWith(k)&&completed[c])) { streak++; d.setDate(d.getDate()-1); } else break;
    }
    return { cur:streak, target:def.target };
  }
  if (def.type==="cat_week") {
    const ids = new Set((WORKOUTS[def.cat]||[]).map(e=>e.id));
    const cur = Object.keys(completed).filter(k => {
      const dateStr=k.split("-").slice(0,3).join("-");
      if (dateStr < ws) return false;
      return completed[k] && ids.has(k.split("-").slice(3).join("-"));
    }).length;
    return { cur, target:def.target };
  }
  if (def.type==="shots_week") {
    let sl; try{sl=JSON.parse(localStorage.getItem("shot_log_v2")||"{}")}catch{sl={}}
    const cur = Object.keys(sl).filter(k=>k>=ws).flatMap(k=>sl[k]||[]).filter(s=>s.made!==false).length;
    return { cur, target:def.target };
  }
  if (def.type==="day_count") {
    const cur = Object.keys(completed).filter(k=>k.startsWith(today)&&completed[k]).length;
    return { cur, target:def.target };
  }
  return { cur:0, target:def.target };
}

/* ═══════════════════════ BENEFIT MAP ════════════════════════ */
// Maps basketballTransfer ids → user-facing labels for the detail view
const BENEFIT_MAP = {
  jumping:       { label:"Jump Higher",        emoji:"💥" },
  quickness:     { label:"Quicker First Step", emoji:"⚡" },
  defense:       { label:"Better Defense",     emoji:"🛡" },
  cutting:       { label:"Sharper Cuts",       emoji:"🔪" },
  "first-step":  { label:"Explosive First Step",emoji:"⚡"},
  landing:       { label:"Safe Landings",      emoji:"🛑" },
  footwork:      { label:"Elite Footwork",     emoji:"👟" },
  stability:     { label:"Solid Balance",      emoji:"🎯" },
  strength:      { label:"Body Strength",      emoji:"💪" },
  conditioning:  { label:"Game Fitness",       emoji:"🔥" },
  speed:         { label:"Top Speed",          emoji:"💨" },
  rebounding:    { label:"Grab More Boards",   emoji:"🏀" },
  reaction:      { label:"React Faster",       emoji:"⚡" },
  all:           { label:"Complete Athlete",   emoji:"🏃" },
  shooting:      { label:"Better Shooting",    emoji:"🎯" },
  power:         { label:"Explosive Power",    emoji:"💥" },
  explosion:     { label:"Pure Explosion",     emoji:"💥" },
  safety:        { label:"Stay Healthy",       emoji:"🛡" },
  sprinting:     { label:"Sprint Faster",      emoji:"💨" },
  running:       { label:"Better Running",     emoji:"🏃" },
};

// Flat lookup: exerciseId → { ...exercise, _cat, meta }
const ALL_EXERCISES = Object.fromEntries(
  Object.entries(WORKOUTS).flatMap(([cat, exs]) =>
    exs.map(ex => [ex.id, { ...ex, _cat:cat, meta:EXERCISE_META[ex.id]||{} }])
  )
);

/* ═══════════════════════ RECOMMENDATION ENGINE ══════════════ */

// What template naturally follows each template (recovery rotation)
const RECOVERY_AFTER = {
  jump:      "recovery",
  quickFeet: "handles",
  fullBody:  "shooting",
  recovery:  "quickFeet",
  handles:   "jump",
  shooting:  "fullBody",
};

// Which challenge urgency maps to which template
const CHALLENGE_TEMPLATE_MAP = {
  "jump-5":    "jump",
  "shots-50":  "shooting",
  "handles-5": "handles",
  "speed-5":   "quickFeet",
  "coord-5":   "quickFeet",
};

// Goal → template preference
const GOAL_TEMPLATE_MAP = {
  jump_higher:  "jump",
  quickness:    "quickFeet",
  handles:      "handles",
  shooting:     "shooting",
  get_stronger: "fullBody",
  conditioning: "fullBody",
};

const GOAL_NAMES = {
  jump_higher:"Jump Higher", quickness:"Get Quicker", handles:"Ball Handling",
  shooting:"Shooting", get_stronger:"Get Stronger", conditioning:"Conditioning",
};

function computeRecommendation(settings, completed, currentTemplate) {
  const age   = settings.athleteAge || 12;
  const goals = settings.goals || [];
  const today = new Date().toLocaleDateString("en-CA");

  // ── How many days since last training session ──────────────────
  let daysSinceTrained = 0;
  const checkD = new Date(); checkD.setDate(checkD.getDate() - 1);
  for (let i = 0; i < 7; i++) {
    const k = checkD.toLocaleDateString("en-CA");
    if (Object.keys(completed).some(c => c.startsWith(k) && completed[c])) break;
    daysSinceTrained++;
    checkD.setDate(checkD.getDate() - 1);
  }

  // ── Current streak ─────────────────────────────────────────────
  let streak = 0;
  const sd = new Date();
  for (let i = 0; i < 14; i++) {
    const k = sd.toLocaleDateString("en-CA");
    if (Object.keys(completed).some(c => c.startsWith(k) && completed[c])) {
      streak++; sd.setDate(sd.getDate() - 1);
    } else break;
  }

  // ── Which challenge is most urgently close to completion ───────
  let urgentChallenge = null, urgentTemplate = null;
  // Sort by (cur/target) descending so the "closest" one wins
  const sorted = [...CHALLENGES_DEF]
    .filter(d => CHALLENGE_TEMPLATE_MAP[d.id])
    .map(d => ({ def:d, ...getChallengeProgress(d, completed) }))
    .sort((a,b) => (b.cur/b.target) - (a.cur/a.target));
  for (const { def, cur, target } of sorted) {
    const pct = cur / target;
    if (pct >= 0.4 && pct < 1) {
      urgentChallenge = def;
      urgentTemplate  = CHALLENGE_TEMPLATE_MAP[def.id];
      break;
    }
  }

  // ── Decision tree ──────────────────────────────────────────────
  let recommendedTemplate = RECOVERY_AFTER[currentTemplate] || "quickFeet";
  const reasons = [];

  // Priority 1 — close to completing a challenge
  if (urgentChallenge && urgentTemplate) {
    const { cur, target } = getChallengeProgress(urgentChallenge, completed);
    const remaining = target - cur;
    recommendedTemplate = urgentTemplate;
    const word = remaining === 1 ? "1 more session" : `${remaining} more`;
    reasons.push(`You're ${word} away from completing "${urgentChallenge.name}" — let's finish it.`);
  }

  // Priority 2 — recovery after a hard session
  if (!reasons.length && currentTemplate === "jump") {
    recommendedTemplate = "recovery";
    reasons.push("You trained explosion today — recovery work tomorrow protects your joints and keeps you fresh.");
  }
  if (!reasons.length && currentTemplate === "fullBody") {
    recommendedTemplate = "shooting";
    reasons.push("Skill work the day after strength training is the perfect combo — let your muscles recover while your game grows.");
  }

  // Priority 3 — coming back from a gap
  if (!reasons.length && daysSinceTrained >= 2) {
    recommendedTemplate = age <= 11 ? "quickFeet" : "handles";
    const dayWord = daysSinceTrained + 1 === 3 ? "3 days" : `${daysSinceTrained + 1} days`;
    reasons.push(`It's been ${dayWord} — a short, high-energy session is the perfect way to get back in rhythm.`);
  }

  // Priority 4 — streak maintenance
  if (!reasons.length && streak >= 2) {
    reasons.push(`You're on a ${streak}-day streak — keep the momentum going tomorrow.`);
  }

  // Priority 5 — goal alignment
  if (!reasons.length && goals.length > 0) {
    const matchedGoal = goals.find(g => GOAL_TEMPLATE_MAP[g]);
    if (matchedGoal) {
      recommendedTemplate = GOAL_TEMPLATE_MAP[matchedGoal];
      reasons.push(`This workout targets your "${GOAL_NAMES[matchedGoal]}" goal — stay locked in.`);
    }
  }

  // Priority 6 — age-based variety / focus
  if (!reasons.length) {
    if (age <= 10) {
      const funOpts = ["quickFeet","handles","recovery"];
      recommendedTemplate = funOpts[new Date().getDay() % funOpts.length];
      reasons.push("Mix it up and keep it fun — variety is the secret weapon at your age.");
    } else if (age >= 13) {
      const hardOpts = ["jump","fullBody","quickFeet"];
      recommendedTemplate = hardOpts[new Date().getDay() % hardOpts.length];
      reasons.push("Consistent, progressive training is how the best get better.");
    } else {
      reasons.push("A balanced session tomorrow keeps your body developing from every angle.");
    }
  }

  const tmpl = WORKOUT_TEMPLATES[recommendedTemplate] || WORKOUT_TEMPLATES.quickFeet;
  return {
    templateKey:   recommendedTemplate,
    templateName:  tmpl.name,
    templateEmoji: tmpl.emoji,
    templateDesc:  tmpl.desc,
    reason:        reasons[0] || "Tomorrow is another chance to level up.",
  };
}

/* ═══════════════════════ SHOT TRACKER DATA ═══════════════════ */
const SHOT_TYPES = [
  { id:"layup",        label:"Layup",          emoji:"🏃", locations:null },
  { id:"rev_layup",    label:"Reverse Layup",  emoji:"🔄", locations:null },
  { id:"block_bank",   label:"Block Area",     emoji:"📐", locations:["Left Block","Right Block"] },
  { id:"mid_bank",     label:"Elbow Shot",    emoji:"💫", locations:["Left Elbow","Right Elbow"] },
  { id:"mid",          label:"Mid-Range",      emoji:"🎯", locations:["Left Elbow","Top Key","Right Elbow","Left Wing","Right Wing"] },
  { id:"free_throw",   label:"Free Throw",     emoji:"🆓", locations:null },
  { id:"three_corner", label:"Corner 3",       emoji:"📐", locations:["Left Corner","Right Corner"] },
  { id:"three_slot",   label:"Wing 3",         emoji:"↗️", locations:["Left Slot","Right Slot"] },
  { id:"three_center", label:"Top 3",          emoji:"🎯", locations:null },
];
const SHOT_COLORS = {
  layup:"#34d399", rev_layup:"#6ee7b7", block_bank:"#60a5fa",
  mid_bank:"#93c5fd", mid:"#a78bfa", free_throw:"#fbbf24",
  three_corner:"#f87171", three_slot:"#fb923c", three_center:"#f43f5e",
};


function ColorWheel({ hue, sat, light, onChange, size=170 }) {
  const ref = useRef(null);
  const drag = useRef(false);

  const draw = useCallback(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const cx = size/2, cy = size/2, R = size/2 - 6;
    ctx.clearRect(0, 0, size, size);
    for (let a = 0; a < 360; a++) {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, (a-1)*Math.PI/180, (a+1)*Math.PI/180);
      ctx.closePath();
      ctx.fillStyle = hsl(a, sat, light); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.52);
    g.addColorStop(0, "rgba(10,14,26,0.97)"); g.addColorStop(1, "rgba(10,14,26,0)");
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.52, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
    // indicator: angle 0 = top, clockwise
    const rad = (hue - 90) * Math.PI / 180;
    const ir = R * 0.78;
    const ix = cx + Math.cos(rad)*ir, iy = cy + Math.sin(rad)*ir;
    ctx.beginPath(); ctx.arc(ix, iy, 8, 0, Math.PI*2);
    ctx.fillStyle = hsl(hue, sat, light);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke();
  }, [hue, sat, light, size]);

  useEffect(() => { draw(); }, [draw]);

  const getHue = useCallback((e) => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const sx = size/r.width, sy = size/r.height;
    const cx2 = e.touches ? e.touches[0].clientX : e.clientX;
    const cy2 = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = (cx2 - r.left)*sx - size/2;
    const dy = (cy2 - r.top)*sy  - size/2;
    let h = Math.atan2(dy, dx)*180/Math.PI + 90;
    if (h < 0) h += 360;
    onChange(Math.round(h) % 360);
  }, [size, onChange]);

  return (
    <canvas ref={ref} width={size} height={size}
      style={{ width:size, height:size, borderRadius:"50%", cursor:"crosshair", touchAction:"none", flexShrink:0 }}
      onMouseDown={e=>{ drag.current=true; getHue(e); }}
      onMouseMove={e=>{ if (drag.current) getHue(e); }}
      onMouseUp={()=>{ drag.current=false; }} onMouseLeave={()=>{ drag.current=false; }}
      onTouchStart={e=>{ drag.current=true; getHue(e); }}
      onTouchMove={e=>{ e.preventDefault(); if (drag.current) getHue(e); }}
      onTouchEnd={()=>{ drag.current=false; }} />
  );
}

/* ═══════════════════════ SETTINGS SHEET ═══════════════════════ */
const PRESETS = [
  { label:"Amber + Indigo", p:[38,92,55],  s:[245,80,60], b:[222,47,6],  a:[158,85,50] },
  { label:"Red + Blue",     p:[0,90,55],   s:[210,88,55], b:[220,50,5],  a:[120,80,45] },
  { label:"Green + Purple", p:[145,75,45], s:[280,70,62], b:[230,45,5],  a:[265,80,58] },
  { label:"Cyan + Orange",  p:[190,85,50], s:[25,95,55],  b:[210,55,5],  a:[310,80,60] },
  { label:"Pink + Teal",    p:[330,80,60], s:[172,70,45], b:[240,40,6],  a:[90,75,48]  },
  { label:"Gold + Navy",    p:[45,100,50], s:[220,75,40], b:[215,60,8],  a:[165,80,45] },
  { label:"Neon + Dark",    p:[120,100,50],s:[285,90,65], b:[140,30,4],  a:[240,85,60] },
  { label:"Sunset",         p:[20,95,58],  s:[300,75,60], b:[240,35,5],  a:[60,95,55]  },
];

function SettingsSheet({ settings, setSettings, onClose }) {
  const [tab, setTab] = useState("primary");
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const P = pri(settings), S = sec(settings), B = bg(settings);

  const exportData = () => {
    const keys = ['shot_log_v2','s_done','s_settings','s_strday'];
    const data = { _exported: new Date().toISOString() };
    keys.forEach(k => { try { data[k] = JSON.parse(localStorage.getItem(k)||'null'); } catch {} });
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitkidhooper-backup-${new Date().toLocaleDateString('en-CA')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = file => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        ['shot_log_v2','s_done','s_settings','s_strday'].forEach(k => {
          if (data[k] != null) localStorage.setItem(k, JSON.stringify(data[k]));
        });
        window.location.reload();
      } catch { alert('Could not restore — invalid backup file'); }
    };
    reader.readAsText(file);
  };

  const cur = tab==="primary"   ? { h:settings.primaryHue,   s:settings.primarySat,   l:settings.primaryLight }
            : tab==="secondary" ? { h:settings.secondaryHue, s:settings.secondarySat, l:settings.secondaryLight }
            : tab==="accent"    ? { h:settings.accentHue,    s:settings.accentSat,    l:settings.accentLight }
            :                     { h:settings.bgHue,        s:settings.bgSat,        l:settings.bgLight };

  const setH = h => setSettings(p => tab==="primary" ? {...p,primaryHue:h} : tab==="secondary" ? {...p,secondaryHue:h} : tab==="accent" ? {...p,accentHue:h} : {...p,bgHue:h});
  const setS2= s2=> setSettings(p => tab==="primary" ? {...p,primarySat:s2} : tab==="secondary" ? {...p,secondarySat:s2} : tab==="accent" ? {...p,accentSat:s2} : {...p,bgSat:s2});
  const setL = l => setSettings(p => tab==="primary" ? {...p,primaryLight:l} : tab==="secondary" ? {...p,secondaryLight:l} : tab==="accent" ? {...p,accentLight:l} : {...p,bgLight:l});

  const activeCol = tab==="primary" ? P : tab==="secondary" ? S : B;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div style={{ background:"#0d1526",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",paddingBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:10,marginBottom:4 }}>
          <div style={{ width:40,height:4,borderRadius:99,background:"rgba(255,255,255,0.12)" }}/>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",position:"sticky",top:0,background:"#0d1526",zIndex:10 }}>
          <span style={{ fontSize:16,fontWeight:700,color:"#f1f5f9" }}>Customize Your App</span>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>

        {/* Profile */}
        <div style={{ padding:"16px 20px 0" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>Athlete Profile</div>
          <div style={{ display:"flex",gap:16,alignItems:"center",marginBottom:16 }}>
            <div onClick={()=>fileRef.current?.click()} style={{ width:72,height:72,borderRadius:"50%",background:`${P}18`,border:`3px solid ${P}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
              {settings.avatar ? <img src={settings.avatar} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:30 }}>👤</span>}
            </div>
            <div style={{ flex:1 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                const reader = new FileReader();
                reader.onload = ev => setSettings(p => ({...p, avatar:ev.target.result}));
                reader.readAsDataURL(f);
              }}/>
              <button onClick={()=>fileRef.current?.click()} style={{ display:"block",padding:"8px 14px",borderRadius:10,border:`1.5px solid ${P}`,background:"transparent",fontSize:12,fontWeight:600,cursor:"pointer",color:P,marginBottom:8 }}>
                📷 Choose Photo
              </button>
              <input value={settings.athleteName} onChange={e=>setSettings(p=>({...p,athleteName:e.target.value}))}
                placeholder="Athlete Name"
                style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${P}44`,borderRadius:10,padding:"8px 12px",fontSize:14,fontWeight:700,color:P,outline:"none",marginBottom:8 }}/>
              <div style={{ fontSize:11,color:"#475569",marginBottom:4,fontWeight:600 }}>Training Start Date</div>
              <input type="date" value={settings.startDate||''} onChange={e=>setSettings(p=>({...p,startDate:e.target.value}))}
                style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${P}44`,borderRadius:10,padding:"8px 12px",fontSize:14,color:"#e2e8f0",outline:"none" }}/>
            </div>
          </div>
        </div>

        {/* Training Profile */}
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>Training Profile</div>

          {/* Age */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11,color:"#475569",fontWeight:600,marginBottom:7 }}>Age</div>
            <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
              {[9,10,11,12,13,14,15,16].map(a=>(
                <button key={a} onClick={()=>setSettings(p=>({...p,athleteAge:a}))}
                  style={{ padding:"6px 12px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
                    background:settings.athleteAge===a?P:"rgba(255,255,255,0.05)",
                    border:`1px solid ${settings.athleteAge===a?P:"rgba(255,255,255,0.1)"}`,
                    color:settings.athleteAge===a?"#000":"#64748b" }}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11,color:"#475569",fontWeight:600,marginBottom:7 }}>Experience Level</div>
            <div style={{ display:"flex",gap:6 }}>
              {[["beginner","🌱 Beginner"],["intermediate","⚡ Intermediate"],["advanced","🔥 Advanced"]].map(([val,lbl])=>(
                <button key={val} onClick={()=>setSettings(p=>({...p,experience:val}))}
                  style={{ flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",
                    background:settings.experience===val?`${P}20`:"rgba(255,255,255,0.04)",
                    border:`1.5px solid ${settings.experience===val?P:"rgba(255,255,255,0.1)"}`,
                    color:settings.experience===val?P:"#64748b" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11,color:"#475569",fontWeight:600,marginBottom:7 }}>
              My Goals <span style={{ fontSize:10,fontWeight:400 }}>(pick up to 3)</span>
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {[["explosion","💥 Jump Higher"],["speed","⚡ Quick Feet"],["conditioning","🔥 Conditioning"],
                ["handles","🤲 Ball Handling"],["shooting","🎯 Shooting"],["strength","💪 Strength"],
                ["defense","🛡 Defense"],["coordination","🎶 Coordination"]].map(([val,lbl])=>{
                const sel=(settings.goals||[]).includes(val);
                return (
                  <button key={val} onClick={()=>setSettings(p=>{
                    const g=p.goals||[];
                    return {...p,goals:sel?g.filter(x=>x!==val):g.length<3?[...g,val]:g};
                  })}
                    style={{ padding:"6px 11px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",
                      background:sel?`${P}20`:"rgba(255,255,255,0.04)",
                      border:`1.5px solid ${sel?P:"rgba(255,255,255,0.1)"}`,
                      color:sel?P:"#64748b" }}>
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Play Style */}
          <div>
            <div style={{ fontSize:11,color:"#475569",fontWeight:600,marginBottom:7 }}>Play Style</div>
            <div style={{ display:"flex",gap:6 }}>
              {[["guard","🏃 Guard"],["wing","🏀 Wing"],["post","💪 Post"],["any","⭐ Any"]].map(([val,lbl])=>(
                <button key={val} onClick={()=>setSettings(p=>({...p,playStyle:val}))}
                  style={{ flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",
                    background:settings.playStyle===val?`${P}20`:"rgba(255,255,255,0.04)",
                    border:`1.5px solid ${settings.playStyle===val?P:"rgba(255,255,255,0.1)"}`,
                    color:settings.playStyle===val?P:"#64748b" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div style={{ padding:"0 20px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:"#334155",marginBottom:12,textTransform:"uppercase" }}>App Colors</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:14 }}>
            {PRESETS.map(pr2 => (
              <button key={pr2.label} onClick={()=>setSettings(p=>({...p,
                primaryHue:pr2.p[0],primarySat:pr2.p[1],primaryLight:pr2.p[2],
                secondaryHue:pr2.s[0],secondarySat:pr2.s[1],secondaryLight:pr2.s[2],
                bgHue:pr2.b[0],bgSat:pr2.b[1],bgLight:pr2.b[2],
                accentHue:pr2.a[0],accentSat:pr2.a[1],accentLight:pr2.a[2],
              }))} style={{ display:"flex",alignItems:"center",gap:3,padding:"5px 10px",borderRadius:20,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",cursor:"pointer" }}>
                {[pr2.p,pr2.s,pr2.b].map((c,i)=>(<span key={i} style={{ width:10,height:10,borderRadius:"50%",background:hsl(c[0],c[1],c[2]),display:"inline-block",marginLeft:i?-3:0,border:"2px solid #0d1526" }}/>))}
                <span style={{ fontSize:11,color:"#64748b",marginLeft:4 }}>{pr2.label}</span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex",gap:6,marginBottom:14 }}>
            {[["primary","Primary",P],["secondary","Secondary",S],["accent","Strength",str3(settings)],["bg","Background",B]].map(([id,lbl,col])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ flex:1,padding:"9px 6px",borderRadius:10,border:`1px solid ${tab===id?col:"rgba(255,255,255,0.1)"}`,background:tab===id?`${col}20`:"transparent",color:tab===id?col:"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
                <span style={{ width:10,height:10,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0 }}/>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ display:"flex",gap:18,alignItems:"center",marginBottom:18 }}>
            <ColorWheel hue={cur.h} sat={cur.s} light={cur.l} onChange={setH} size={170}/>
            <div style={{ flex:1,display:"flex",flexDirection:"column",gap:14 }}>
              {[["Saturation",cur.s,setS2,0,100],["Brightness",cur.l,setL,2,tab==="bg"?25:75]].map(([lbl,val,fn,mn,mx])=>(
                <div key={lbl}>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginBottom:5 }}>
                    {lbl} <span style={{ color:activeCol }}>{val}%</span>
                  </div>
                  <input type="range" min={mn} max={mx} value={val} onChange={e=>fn(+e.target.value)}
                    style={{ width:"100%",accentColor:activeCol,cursor:"pointer" }}/>
                </div>
              ))}
              <div style={{ height:36,borderRadius:10,background:activeCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"rgba(0,0,0,0.5)" }}>
                {tab==="primary"?"Primary":tab==="secondary"?"Secondary":tab==="accent"?"Strength Accent":"Background"}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                {[P,S,str3(settings),B].map((col,i)=>(<div key={i} style={{ width:22,height:22,borderRadius:"50%",background:col,border:"2px solid #0d1526",marginLeft:i?-6:0 }}/>))}
                <span style={{ fontSize:10,color:"#334155",marginLeft:8 }}>Live palette</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 20px 20px" }}>
          <details style={{ borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:12 }}>
            <summary style={{ fontSize:11,color:"#334155",cursor:"pointer",userSelect:"none",listStyle:"none",display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:9 }}>▶</span> Advanced — Data &amp; Backup
            </summary>
            <div style={{ marginTop:10 }}>
              <div style={{ display:"flex",gap:8,marginBottom:6 }}>
                <button onClick={exportData} style={{ flex:1,padding:"9px 8px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",minHeight:36 }}>
                  💾 Backup
                </button>
                <button onClick={()=>importRef.current?.click()} style={{ flex:1,padding:"9px 8px",borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",minHeight:36 }}>
                  📂 Restore
                </button>
              </div>
              <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)importData(f);e.target.value='';}}/>
              <p style={{ fontSize:10,color:"#334155",margin:0 }}>Save a backup before clearing app data or reinstalling.</p>
            </div>
          </details>
        </div>
        <button onClick={onClose} style={{ margin:"0 20px",display:"block",width:"calc(100% - 40px)",padding:"14px",borderRadius:14,border:"none",background:pri(settings),fontSize:15,fontWeight:800,color:"#000",cursor:"pointer" }}>
          Save & Apply ✓
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ SHOT TRACKER HELPERS ═══════════════ */
const todayKey = () => new Date().toLocaleDateString("en-CA");
const fmtDate  = k => new Date(k+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const dayLabel = k => ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(k+"T00:00:00").getDay()];

function StackedBars({ data, priColor, height=104, selDate, onSelect }) {
  const maxT = Math.max(1, ...data.map(d=>d.total));
  return (
    <div style={{ display:"flex",alignItems:"flex-end",gap:data.length>21?2:4,height }}>
      {data.map((d,i) => {
        const colH = Math.max(3,(d.total/maxT)*(height-20));
        const isSel = d.key===selDate, isToday = d.key===todayKey();
        return (
          <div key={i} onClick={()=>onSelect(d.key)} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer" }}>
            <div style={{ fontSize:8,fontFamily:"'DM Mono',monospace",color:d.total>0?priColor:"#334155",minHeight:11 }}>{d.total>0?d.total:""}</div>
            <div style={{ width:"100%",height:colH,borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column-reverse",
              outline:isSel?`2px solid ${priColor}`:"none",filter:isSel?"brightness(1.2)":"none" }}>
              {SHOT_TYPES.map(t => {
                const cnt = d.byShotType[t.id]||0; if (!cnt) return null;
                return <div key={t.id} style={{ width:"100%",height:(cnt/d.total)*colH,background:SHOT_COLORS[t.id],flexShrink:0 }}/>;
              })}
              {d.total===0 && <div style={{ width:"100%",height:"100%",background:"rgba(255,255,255,0.05)" }}/>}
            </div>
            {data.length<=21 && <div style={{ fontSize:8,color:isToday?priColor:"#334155" }}>{d.label}</div>}
          </div>
        );
      })}
    </div>
  );
}

function Spark({ data, color, w=80, h=26 }) {
  if (!data||data.length<2) return <div style={{ width:w,height:h }}/>;
  const mx = Math.max(1,...data);
  const pts = data.map((v,i)=>`${(i/(data.length-1))*w},${h-(v/mx)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}28`} stroke="none"/>
    </svg>
  );
}

function Donut({ data, size=128 }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={size/2-10} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18"/>
      <text x={size/2} y={size/2+4} textAnchor="middle" style={{ fill:"#334155",fontSize:10,fontFamily:"DM Mono" }}>No data</text>
    </svg>
  );
  const r = size/2-10, circ = 2*Math.PI*r;
  let off = 0;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      {data.filter(d=>d.value>0).map((d,i)=>{
        const dash=(d.value/total)*circ, gap=circ-dash;
        const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off} strokeLinecap="butt"/>;
        off+=dash; return el;
      })}
      <circle cx={size/2} cy={size/2} r={r-9} fill="#060b14"/>
    </svg>
  );
}

function CourtMap({ priColor, onZoneSelect, lastShot }) {
  const zones = [
    {id:"layup",        label:"Layup",   x:113,y:42, r:17},
    {id:"block_bank",   label:"Block",   x:68, y:78, r:14},{id:"block_bank",  label:"Block",  x:157,y:78, r:14},
    {id:"free_throw",   label:"FT",      x:113,y:108,r:15},
    {id:"mid_bank",     label:"Elbow",   x:64, y:122,r:13},{id:"mid_bank",    label:"Elbow",  x:161,y:122,r:13},
    {id:"mid",          label:"Wing",    x:42, y:148,r:12},{id:"mid",         label:"Wing",   x:184,y:148,r:12},
    {id:"three_corner", label:"Corner",  x:14, y:68, r:12},{id:"three_corner",label:"Corner", x:212,y:68, r:12},
    {id:"three_slot",   label:"Slot",    x:48, y:170,r:12},{id:"three_slot",  label:"Slot",   x:178,y:170,r:12},
    {id:"three_center", label:"Top 3",   x:113,y:182,r:14},
  ];
  return (
    <svg viewBox="0 0 226 200" style={{ width:"100%",maxWidth:310,display:"block",margin:"0 auto" }}>
      <rect x="2" y="2" width="222" height="196" rx="8" fill="#0f1e35" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <rect x="72" y="2" width="82" height="120" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
      <circle cx="113" cy="122" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      {/* 3-point arc — radius 150 centered on basket (113,20), sweeping away from basket */}
      <path d="M 18 136 A 150 150 0 0 1 207 136" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" strokeDasharray="4 3"/>
      {/* Corner 3 straight portions — from baseline down to where arc begins */}
      <line x1="18" y1="2" x2="18" y2="136" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="207" y1="2" x2="207" y2="136" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <circle cx="113" cy="20" r="4" fill="none" stroke={priColor} strokeWidth="2"/>
      <circle cx="113" cy="20" r="1.8" fill={priColor}/>
      <line x1="96" y1="16" x2="130" y2="16" stroke={priColor} strokeWidth="2.5" strokeLinecap="round"/>
      {zones.map((z,i) => {
        const col = SHOT_COLORS[z.id], hit = lastShot&&lastShot.type===z.id;
        return (
          <g key={i} onClick={()=>onZoneSelect(z.id)} style={{ cursor:"pointer" }}>
            <circle cx={z.x} cy={z.y} r={z.r} fill={hit?col:`${col}25`} stroke={col} strokeWidth={hit?2.5:1.5}/>
            <text x={z.x} y={z.y+1} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize:z.r*0.72,fill:hit?"#000":col,fontWeight:700,pointerEvents:"none",fontFamily:"DM Sans,sans-serif" }}>
              {z.label.length>4?z.label.slice(0,4):z.label}
            </text>
          </g>
        );
      })}
      <text x="113" y="195" textAnchor="middle" style={{ fontSize:7,fill:"rgba(255,255,255,0.18)",fontFamily:"DM Mono,monospace" }}>TAP ZONE TO LOG SHOTS</text>
    </svg>
  );
}

/* ═══════════════════════ SHOT TRACKER ═══════════════════════ */
function ShotTracker({ P, S, BG, athleteName }) {
  const [log, setLog] = useState(()=>{ try{return JSON.parse(localStorage.getItem("shot_log_v2")||"{}")}catch{return{}} });
  const [view, setView] = useState("log");
  const [activeType, setActiveType] = useState(null);
  const [activeLoc, setActiveLoc] = useState(null);
  const [lastShot, setLastShot] = useState(null);
  const [selDate, setSelDate] = useState(todayKey());
  const [range, setRange] = useState(14);
  const [useCustom, setUseCustom] = useState(false);
  const [custStart, setCustStart] = useState("");
  const [custEnd, setCustEnd] = useState("");
  const [shotCount, setShotCount] = useState({made:0, missed:0});

  const save = nl => { setLog(nl); try{localStorage.setItem("shot_log_v2",JSON.stringify(nl))}catch{} };

  const logBatch = (tid, loc, made, missed) => {
    if (made + missed === 0) return;
    const k = todayKey();
    const ts = Date.now();
    const entries = [
      ...Array(made).fill(null).map((_,i)  => ({type:tid, location:loc||null, ts:ts+i,   made:true})),
      ...Array(missed).fill(null).map((_,i) => ({type:tid, location:loc||null, ts:ts+made+i, made:false})),
    ];
    const last = entries[entries.length-1];
    save({...log, [k]:[...(log[k]||[]), ...entries]});
    setLastShot(last);
    setActiveType(null); setActiveLoc(null); setShotCount({made:0, missed:0});
  };

  const addShot = (tid, loc, made) => logBatch(tid, loc, made?1:0, made?0:1);

  const selectType = tid => {
    const st = SHOT_TYPES.find(s=>s.id===tid);
    setActiveType(tid);
    setActiveLoc(st?.locations ? null : '__noloc__');
    setShotCount({made:0, missed:0});
  };
  const undo = () => { const k=todayKey(); if(!(log[k]?.length)) return; save({...log,[k]:log[k].slice(0,-1)}); setLastShot(null); };

  const todayShots = log[todayKey()]||[];
  const todayTotal = todayShots.length;
  const todayByType = useMemo(()=>{ const c={}; todayShots.forEach(s=>{c[s.type]=(c[s.type]||0)+1}); return c; },[todayShots]);
  const allFlat = useMemo(()=>Object.values(log).flat(),[log]);
  const allByType = useMemo(()=>{ const c={}; allFlat.forEach(s=>{c[s.type]=(c[s.type]||0)+1}); return c; },[allFlat]);
  const allTotal = allFlat.length;
  const streak = useMemo(()=>{ let s=0,d=new Date(); while(true){const k=d.toLocaleDateString("en-CA");if((log[k]||[]).length>0){s++;d.setDate(d.getDate()-1)}else break} return s; },[log]);
  const todayMade = useMemo(()=>todayShots.filter(s=>s.made!==false).length,[todayShots]);
  const todayPct = todayTotal>0 ? Math.round((todayMade/todayTotal)*100) : 0;

  const histData = useMemo(()=>{
    const days=[];
    if (useCustom && custStart && custEnd) {
      let d = new Date(custStart+"T00:00:00"), end = new Date(custEnd+"T00:00:00");
      while (d<=end) {
        const k=d.toLocaleDateString("en-CA"), sh=log[k]||[], bst={};
        sh.forEach(s=>{bst[s.type]=(bst[s.type]||0)+1});
        days.push({key:k,label:dayLabel(k),total:sh.length,byShotType:bst});
        d.setDate(d.getDate()+1);
      }
    } else {
      for (let i=range-1;i>=0;i--) {
        const d=new Date(); d.setDate(d.getDate()-i);
        const k=d.toLocaleDateString("en-CA"), sh=log[k]||[], bst={};
        sh.forEach(s=>{bst[s.type]=(bst[s.type]||0)+1});
        days.push({key:k,label:dayLabel(k),total:sh.length,byShotType:bst});
      }
    }
    return days;
  },[log,range,useCustom,custStart,custEnd]);

  const selShots = log[selDate]||[];
  const lbl = { fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}80`,marginBottom:10,textTransform:"uppercase" };
  const bd = "rgba(255,255,255,0.07)";
  const sf = "rgba(255,255,255,0.028)";

  const TABS = [{id:"log",label:"📍 Log"},{id:"history",label:"📈 History"},{id:"breakdown",label:"🍩 Stats"}];

  return (
    <div style={{ background:BG,color:"#e2e8f0",maxWidth:680,margin:"0 auto",minHeight:"100vh",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))",fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <div style={{ padding:"22px 20px 14px",borderBottom:`1px solid ${P}18` }}>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"#334155",marginBottom:5 }}>SHOT TRACKER</div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
          <h2 style={{ fontSize:24,fontWeight:800,margin:0,letterSpacing:"-0.02em" }}>{athleteName}'s <span style={{ color:P }}>Shots</span></h2>
          <div style={{ display:"flex",gap:14 }}>
            {[[todayMade,"TODAY",P],[`${todayPct}%`,"FG%",S],[streak,"STREAK","#34d399"]].map(([n,l,c])=>(
              <div key={l} style={{ textAlign:"right" }}>
                <div style={{ fontSize:22,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:8,color:"#334155",letterSpacing:"0.06em" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:"flex",padding:"10px 14px",gap:6,borderBottom:`1px solid ${bd}` }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{ flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${view===t.id?P:bd}`,background:view===t.id?`${P}18`:"transparent",color:view===t.id?P:"#475569",fontSize:11,fontWeight:600,cursor:"pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {view==="log" && (
        <div style={{ padding:"14px 16px 0" }}>
          <div style={lbl}>Tap Court Zone to Log</div>
          <CourtMap priColor={P} onZoneSelect={selectType} lastShot={lastShot}/>
          {activeType && !activeLoc && (
            <div style={{ background:`${P}10`,border:`1px solid ${P}28`,borderRadius:12,padding:"12px 14px",margin:"12px 0" }}>
              <div style={{ fontSize:12,fontWeight:700,color:P,marginBottom:10 }}>
                {SHOT_TYPES.find(s=>s.id===activeType)?.emoji} {SHOT_TYPES.find(s=>s.id===activeType)?.label} — Where from?
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {SHOT_TYPES.find(s=>s.id===activeType)?.locations?.map(loc=>(
                  <button key={loc} onClick={()=>setActiveLoc(loc)} style={{ padding:"7px 14px",borderRadius:10,border:`1px solid ${P}40`,background:`${P}18`,color:P,fontSize:12,fontWeight:600,cursor:"pointer" }}>{loc}</button>
                ))}
                <button onClick={()=>{setActiveType(null);setActiveLoc(null);}} style={{ padding:"7px 12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#475569",fontSize:12,cursor:"pointer" }}>✕</button>
              </div>
            </div>
          )}
          {activeType && activeLoc && (() => {
            const st = SHOT_TYPES.find(s=>s.id===activeType);
            const loc = activeLoc==='__noloc__' ? null : activeLoc;
            const total = shotCount.made + shotCount.missed;
            const stepBtn = (style) => ({
              width:44, height:44, borderRadius:10, border:"1px solid rgba(255,255,255,0.12)",
              background:"rgba(255,255,255,0.06)", color:"#e2e8f0", fontSize:22,
              fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              ...style,
            });
            return (
              <div style={{ background:`${P}10`,border:`1px solid ${P}28`,borderRadius:14,padding:"14px 14px 12px",margin:"12px 0" }}>
                <div style={{ fontSize:12,fontWeight:700,color:P,marginBottom:14 }}>
                  {st?.emoji} {st?.label}{loc?` — ${loc}`:''} — How many?
                </div>
                {/* Made row */}
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#22c55e",width:68 }}>✅ Made</span>
                  <button style={stepBtn()} onClick={()=>setShotCount(c=>({...c,made:Math.max(0,c.made-1)}))}>−</button>
                  <input
                    type="number" inputMode="numeric" min="0"
                    value={shotCount.made}
                    onChange={e=>setShotCount(c=>({...c,made:Math.max(0,parseInt(e.target.value)||0)}))}
                    style={{ width:52,textAlign:"center",fontSize:26,fontWeight:800,color:"#22c55e",
                      fontFamily:"'DM Mono',monospace",background:"transparent",border:"none",
                      outline:"none",WebkitAppearance:"none",MozAppearance:"textfield",padding:0 }}
                  />
                  <button style={stepBtn({background:"#22c55e22",borderColor:"#22c55e44"})} onClick={()=>setShotCount(c=>({...c,made:c.made+1}))}>+</button>
                </div>
                {/* Missed row */}
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#ef4444",width:68 }}>❌ Missed</span>
                  <button style={stepBtn()} onClick={()=>setShotCount(c=>({...c,missed:Math.max(0,c.missed-1)}))}>−</button>
                  <input
                    type="number" inputMode="numeric" min="0"
                    value={shotCount.missed}
                    onChange={e=>setShotCount(c=>({...c,missed:Math.max(0,parseInt(e.target.value)||0)}))}
                    style={{ width:52,textAlign:"center",fontSize:26,fontWeight:800,color:"#ef4444",
                      fontFamily:"'DM Mono',monospace",background:"transparent",border:"none",
                      outline:"none",WebkitAppearance:"none",MozAppearance:"textfield",padding:0 }}
                  />
                  <button style={stepBtn({background:"#ef444422",borderColor:"#ef444444"})} onClick={()=>setShotCount(c=>({...c,missed:c.missed+1}))}>+</button>
                </div>
                {/* Action row */}
                <div style={{ display:"flex",gap:8 }}>
                  <button
                    disabled={total===0}
                    onClick={()=>logBatch(activeType,loc,shotCount.made,shotCount.missed)}
                    style={{ flex:1,padding:"12px",borderRadius:10,border:`1px solid ${P}44`,
                      background:total>0?`${P}22`:"rgba(255,255,255,0.04)",
                      color:total>0?P:"#334155",fontSize:13,fontWeight:700,cursor:total>0?"pointer":"default" }}>
                    {total>0 ? `Log ${total} Shot${total!==1?'s':''} ✓` : 'Tap + to add shots'}
                  </button>
                  <button onClick={()=>{setActiveType(null);setActiveLoc(null);setShotCount({made:0,missed:0});}}
                    style={{ padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#475569",fontSize:13,cursor:"pointer" }}>✕</button>
                </div>
              </div>
            );
          })()}
          <div style={{ ...lbl,marginTop:14 }}>Quick Tap</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
            {SHOT_TYPES.map(s=>{ const cnt=todayByType[s.id]||0,c=SHOT_COLORS[s.id]; return (
              <button key={s.id} onClick={()=>selectType(s.id)} style={{ padding:"10px 12px",borderRadius:12,border:`1px solid ${c}28`,background:`${c}0e`,display:"flex",alignItems:"center",gap:10,cursor:"pointer",textAlign:"left" }}>
                <span style={{ fontSize:18 }}>{s.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:c,lineHeight:1.2 }}>{s.label}</div>
                  {s.locations&&<div style={{ fontSize:9,color:"#475569" }}>pick location</div>}
                </div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:20,fontWeight:800,color:cnt>0?c:"rgba(255,255,255,0.08)",lineHeight:1 }}>{cnt}</div>
              </button>
            );})}
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <div style={lbl}>Today's Log ({todayTotal})</div>
            {todayTotal>0&&<button onClick={undo} style={{ padding:"5px 12px",borderRadius:8,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:11,fontWeight:600,cursor:"pointer" }}>↩ Undo</button>}
          </div>
          {todayShots.length===0
            ? <div style={{ textAlign:"center",padding:"20px 0",color:"#334155",fontSize:13 }}>No shots logged yet today 🏀</div>
            : <div style={{ display:"flex",flexDirection:"column",gap:4,maxHeight:220,overflowY:"auto" }}>
                {[...todayShots].reverse().map((s,i)=>{ const def=SHOT_TYPES.find(t=>t.id===s.type),c=SHOT_COLORS[s.type]; return (
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:sf,borderRadius:8,border:`1px solid ${c}1a` }}>
                    <span style={{ fontSize:14 }}>{def?.emoji}</span>
                    <span style={{ flex:1,fontSize:12,color:c,fontWeight:600 }}>{def?.label}</span>
                    <span style={{ fontSize:13 }}>{s.made===false?'❌':'✅'}</span>
                    {s.location&&<span style={{ fontSize:10,color:"#475569",background:"rgba(255,255,255,0.04)",padding:"2px 7px",borderRadius:20 }}>{s.location}</span>}
                    <span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:"#334155" }}>{new Date(s.ts).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                );})}
              </div>
          }
        </div>
      )}

      {view==="history" && (
        <div style={{ padding:"14px 16px 0" }}>
          <div style={{ display:"flex",gap:5,marginBottom:10,flexWrap:"wrap" }}>
            {[7,14,30,60,90].map(n=>(
              <button key={n} onClick={()=>{setRange(n);setUseCustom(false);}} style={{ padding:"7px 12px",borderRadius:10,border:`1px solid ${!useCustom&&range===n?P:bd}`,background:!useCustom&&range===n?`${P}18`:"transparent",color:!useCustom&&range===n?P:"#475569",fontSize:12,fontWeight:600,cursor:"pointer" }}>{n}D</button>
            ))}
            <button onClick={()=>setUseCustom(v=>!v)} style={{ padding:"7px 12px",borderRadius:10,border:`1px solid ${useCustom?S:bd}`,background:useCustom?`${S}18`:"transparent",color:useCustom?S:"#475569",fontSize:12,fontWeight:600,cursor:"pointer" }}>📅 Custom</button>
          </div>
          {useCustom&&(
            <div style={{ display:"flex",gap:8,marginBottom:12,alignItems:"center" }}>
              <input type="date" value={custStart} onChange={e=>setCustStart(e.target.value)} style={{ flex:1,background:sf,border:`1px solid ${bd}`,borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12,outline:"none" }}/>
              <span style={{ color:"#334155" }}>→</span>
              <input type="date" value={custEnd} onChange={e=>setCustEnd(e.target.value)} style={{ flex:1,background:sf,border:`1px solid ${bd}`,borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12,outline:"none" }}/>
            </div>
          )}
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px 12px",marginBottom:14 }}>
            <div style={{ ...lbl,marginBottom:12 }}>Daily Makes — Stacked by Shot Type</div>
            <StackedBars data={histData} priColor={P} height={104} selDate={selDate} onSelect={setSelDate}/>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginTop:10 }}>
              {SHOT_TYPES.filter(t=>histData.some(d=>(d.byShotType[t.id]||0)>0)).map(t=>(
                <div key={t.id} style={{ display:"flex",alignItems:"center",gap:4 }}>
                  <div style={{ width:8,height:8,borderRadius:2,background:SHOT_COLORS[t.id] }}/><span style={{ fontSize:9,color:"#475569" }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:`${P}08`,border:`1px solid ${P}1e`,borderRadius:14,padding:"14px",marginBottom:14 }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"#334155",marginBottom:6 }}>{selDate===todayKey()?"TODAY":fmtDate(selDate).toUpperCase()}</div>
            <div style={{ fontSize:22,fontWeight:800,color:P,fontFamily:"'DM Mono',monospace",marginBottom:10 }}>{selShots.length} <span style={{ fontSize:12,fontWeight:400,color:"#475569" }}>makes</span></div>
            {selShots.length===0
              ? <div style={{ color:"#334155",fontSize:12 }}>No shots on this day</div>
              : <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {SHOT_TYPES.map(t=>{ const cnt=selShots.filter(s=>s.type===t.id).length; if(!cnt) return null;
                    const locs=[...new Set(selShots.filter(s=>s.type===t.id&&s.location).map(s=>s.location))];
                    return (<div key={t.id} style={{ padding:"6px 10px",borderRadius:10,background:`${SHOT_COLORS[t.id]}14`,border:`1px solid ${SHOT_COLORS[t.id]}28` }}>
                      <span style={{ fontSize:13 }}>{t.emoji}</span><span style={{ fontSize:12,fontWeight:700,color:SHOT_COLORS[t.id],marginLeft:5 }}>{cnt}</span>
                      {locs.length>0&&<div style={{ fontSize:9,color:"#475569",marginTop:2 }}>{locs.join(", ")}</div>}
                    </div>);
                  })}
                </div>
            }
          </div>
          <div style={lbl}>Per-Type Trends</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {SHOT_TYPES.map(t=>{ const sp=histData.map(d=>(d.byShotType[t.id]||0)); if(sp.every(v=>v===0)) return null; return (
              <div key={t.id} style={{ background:sf,border:`1px solid ${SHOT_COLORS[t.id]}1e`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:18 }}>{t.emoji}</span>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:SHOT_COLORS[t.id],marginBottom:3 }}>{t.label}</div>
                  <Spark data={sp} color={SHOT_COLORS[t.id]} w={80} h={24}/>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:SHOT_COLORS[t.id],lineHeight:1 }}>{allByType[t.id]||0}</div>
                  <div style={{ fontSize:8,color:"#334155" }}>all time</div>
                </div>
              </div>
            );})}
          </div>
        </div>
      )}

      {view==="breakdown" && (
        <div style={{ padding:"14px 16px 0" }}>
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"16px",marginBottom:14,display:"flex",gap:16,alignItems:"center" }}>
            <Donut size={128} data={SHOT_TYPES.map(t=>({value:allByType[t.id]||0,color:SHOT_COLORS[t.id]}))}/>
            <div style={{ flex:1 }}>
              <div style={lbl}>All-Time Mix</div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:800,color:P,lineHeight:1,marginBottom:2 }}>{allTotal}</div>
              <div style={{ fontSize:10,color:"#475569",marginBottom:12 }}>total makes logged</div>
              {SHOT_TYPES.filter(t=>(allByType[t.id]||0)>0).sort((a,b)=>(allByType[b.id]||0)-(allByType[a.id]||0)).slice(0,5).map(t=>(
                <div key={t.id} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:SHOT_COLORS[t.id],flexShrink:0 }}/>
                  <span style={{ fontSize:11,color:"#94a3b8",flex:1 }}>{t.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:SHOT_COLORS[t.id] }}>{allByType[t.id]}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:sf,border:`1px solid ${bd}`,borderRadius:14,padding:"14px",marginBottom:14 }}>
            <div style={lbl}>Location Heatmap</div>
            {(()=>{ const lc={}; allFlat.forEach(s=>{if(s.location)lc[s.location]=(lc[s.location]||0)+1}); const ent=Object.entries(lc).sort((a,b)=>b[1]-a[1]),mx=Math.max(1,...ent.map(e=>e[1]));
              return ent.length===0 ? <div style={{ color:"#334155",fontSize:12,textAlign:"center",padding:"12px 0" }}>Use the court map to log locations!</div>
              : <div style={{ display:"flex",flexDirection:"column",gap:6 }}>{ent.map(([loc,cnt])=>(
                <div key={loc} style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ fontSize:11,color:"#94a3b8",width:100,flexShrink:0 }}>{loc}</div>
                  <div style={{ flex:1,height:6,background:"rgba(255,255,255,0.05)",borderRadius:99,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${(cnt/mx)*100}%`,background:S,borderRadius:99 }}/>
                  </div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:S,width:24,textAlign:"right" }}>{cnt}</div>
                </div>
              ))}</div>;
            })()}
          </div>
          <div style={lbl}>Type Details</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {SHOT_TYPES.map(t=>{ const total=allByType[t.id]||0,pct=allTotal>0?Math.round((total/allTotal)*100):0;
              const wk7=Array.from({length:7}).map((_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return(log[d.toLocaleDateString("en-CA")]||[]).filter(s=>s.type===t.id).length;});
              return (<div key={t.id} style={{ background:`${SHOT_COLORS[t.id]}0a`,border:`1px solid ${SHOT_COLORS[t.id]}20`,borderRadius:12,padding:"12px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div><div style={{ fontSize:18,marginBottom:2 }}>{t.emoji}</div><div style={{ fontSize:11,fontWeight:700,color:SHOT_COLORS[t.id],lineHeight:1.2 }}>{t.label}</div></div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:800,color:SHOT_COLORS[t.id],lineHeight:1 }}>{total}</div>
                    <div style={{ fontSize:9,color:"#334155" }}>{pct}% of all</div>
                  </div>
                </div>
                <Spark data={wk7} color={SHOT_COLORS[t.id]} w={120} h={22}/>
                <div style={{ fontSize:8,color:"#334155",marginTop:3,fontFamily:"'DM Mono',monospace" }}>7-DAY TREND</div>
              </div>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ EXERCISE DETAIL SHEET ════════════ */
function ExerciseDetailSheet({ exercise, color, bg2, brd, BG, SF, isDone, onToggle, onClose, onNext, completed }) {
  const meta      = exercise.meta || {};
  const cat       = exercise._cat || "speed";
  const catInfo   = CATS[cat] || { label:cat, emoji:"⚡" };

  /* Progress from completed ─────────────────────────────── */
  const timesCompleted = Object.keys(completed).filter(k => {
    const exId = k.split("-").slice(3).join("-");
    return exId === exercise.id && completed[k];
  }).length;

  const lastDate = Object.keys(completed)
    .filter(k => { const exId = k.split("-").slice(3).join("-"); return exId === exercise.id && completed[k]; })
    .map(k => k.split("-").slice(0,3).join("-"))
    .sort().at(-1);

  const fmtLast = lastDate
    ? new Date(lastDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})
    : null;

  const level = timesCompleted >= 10 ? "Advanced" : timesCompleted >= 4 ? "Building" : "Learning";

  /* Badges / labels ─────────────────────────────────────── */
  const diffColor = { beginner:"#22c55e", intermediate:"#f59e0b", advanced:"#ef4444" }[meta.difficulty] || "#64748b";
  const diffLabel = { beginner:"Beginner", intermediate:"Intermediate", advanced:"Advanced" }[meta.difficulty] || "All Levels";
  const mins      = meta.estimatedDuration ? Math.max(1,Math.round(meta.estimatedDuration/60)) : null;
  const eqLabel   = { none:"No Equipment", cones:"Cones", dumbbells:"Dumbbells", box:"Box / Step", bosu:"BOSU", jump_rope:"Jump Rope", ball:"Basketball", resistance_band:"Band" }[meta.equipment] || meta.equipment || "None";
  const spLabel   = { small:"Small Space", medium:"Medium Space", large:"Open Space" }[meta.spaceRequired] || meta.spaceRequired || "";

  const benefits = [...new Set(meta.basketballTransfer||[])].map(b=>BENEFIT_MAP[b]).filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:200,backdropFilter:"blur(3px)" }}/>

      {/* Panel */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:680,height:"93vh",zIndex:201,
        display:"flex",flexDirection:"column",
        borderRadius:"20px 20px 0 0",background:BG,
        border:`1px solid ${color}22`,overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",gap:10,
          padding:"14px 16px",borderBottom:`1px solid ${color}20`,
          background:BG,flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:"6px 12px",borderRadius:8,border:`1px solid ${color}30`,
              background:`${color}14`,color,fontSize:12,fontWeight:700,cursor:"pointer" }}>
            ← Back
          </button>
          <span style={{ flex:1,fontSize:12,fontWeight:700,color:`${color}cc`,
            textAlign:"center",letterSpacing:"0.02em" }}>
            {catInfo.emoji} {catInfo.label}
          </span>
          {isDone
            ? <span style={{ fontSize:11,fontWeight:700,color:"#22c55e",
                padding:"4px 10px",background:"rgba(34,197,94,0.1)",
                border:"1px solid rgba(34,197,94,0.2)",borderRadius:20 }}>✓ Done</span>
            : <div style={{ width:56 }}/>}
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>

          {/* Video */}
          <a href={`https://www.youtube.com/watch?v=${exercise.videoId}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display:"block",position:"relative",background:"#000",aspectRatio:"16/9",overflow:"hidden",textDecoration:"none" }}>
            <img src={`https://img.youtube.com/vi/${exercise.videoId}/hqdefault.jpg`}
              alt={exercise.videoTitle}
              style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
            {/* gradient */}
            <div style={{ position:"absolute",inset:0,
              background:"linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }}/>
            {/* play btn */}
            <div style={{ position:"absolute",top:"50%",left:"50%",
              transform:"translate(-50%,-50%)",
              width:64,height:64,borderRadius:"50%",
              background:"rgba(0,0,0,0.72)",border:`2.5px solid ${color}`,
              display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ color,fontSize:24,marginLeft:5 }}>▶</span>
            </div>
            {/* title overlay */}
            <div style={{ position:"absolute",bottom:10,left:12,right:12,
              fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:600,
              textShadow:"0 1px 3px rgba(0,0,0,0.9)" }}>
              📺 {exercise.videoTitle}
            </div>
          </a>

          <div style={{ padding:"18px 18px 8px" }}>

            {/* Title + badges */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:8,flexWrap:"wrap" }}>
                <span style={{ fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:800,
                  background:`${color}18`,color,border:`1px solid ${color}30` }}>
                  {exercise.tag}
                </span>
                <span style={{ fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:700,
                  background:`${diffColor}16`,color:diffColor,border:`1px solid ${diffColor}30` }}>
                  {diffLabel}
                </span>
                {mins&&<span style={{ fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:700,
                  background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.1)" }}>
                  🕐 {mins} min
                </span>}
              </div>
              <h2 style={{ fontSize:22,fontWeight:800,color:"#f1f5f9",margin:0,lineHeight:1.2 }}>
                {exercise.name}
              </h2>
            </div>

            {/* Stat chips */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:18 }}>
              {[
                { label:"Sets",  value:exercise.sets },
                { label:"Rest",  value:exercise.rest==="N/A"?"None":exercise.rest },
                { label:"Gear",  value:eqLabel },
                { label:"Space", value:spLabel },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:SF,borderRadius:10,padding:"10px 6px",
                  textAlign:"center",border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize:8,color:"#475569",fontFamily:"'DM Mono',monospace",
                    letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:10,fontWeight:700,color:"#cbd5e1",lineHeight:1.3 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {exercise.desc&&(
              <p style={{ fontSize:13,color:"#94a3b8",lineHeight:1.65,margin:"0 0 18px" }}>
                {exercise.desc}
              </p>
            )}

            {/* Coach FKH Tips */}
            {exercise.cues?.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>🎓</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                    Coach FKH Tips
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:9,
                  background:bg2,borderRadius:12,padding:"13px 14px",border:`1px solid ${brd}` }}>
                  {exercise.cues.map((cue,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ color,fontWeight:800,fontSize:13,flexShrink:0,lineHeight:1.55 }}>→</span>
                      <span style={{ fontSize:13,color:"#e2e8f0",lineHeight:1.55,fontWeight:500 }}>{cue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Athlete Benefits */}
            {benefits.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>⚡</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                    Athlete Benefits
                  </span>
                </div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:7 }}>
                  {benefits.map((b,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:6,
                      padding:"7px 13px",borderRadius:20,
                      background:`${color}10`,border:`1px solid ${color}28` }}>
                      <span style={{ fontSize:14 }}>{b.emoji}</span>
                      <span style={{ fontSize:12,fontWeight:700,color }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress tracking */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                <span style={{ fontSize:15 }}>📈</span>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                  letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                  Your Progress
                </span>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
                {[
                  { label:"Times Done", value:timesCompleted>0?`${timesCompleted}×`:"—" },
                  { label:"Last Done",  value:fmtLast||"—" },
                  { label:"Level",      value:level },
                ].map(({ label, value })=>(
                  <div key={label} style={{ background:SF,borderRadius:10,padding:"12px 8px",
                    textAlign:"center",border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:18,fontWeight:800,color,lineHeight:1 }}>
                      {value}
                    </div>
                    <div style={{ fontSize:8,color:"#334155",marginTop:4,
                      textTransform:"uppercase",letterSpacing:"0.08em" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Future Ready */}
            <div style={{ borderRadius:12,border:"1px dashed rgba(255,255,255,0.08)",
              background:"rgba(255,255,255,0.02)",padding:"13px 15px",opacity:0.6,marginBottom:6 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:8 }}>
                <span style={{ fontSize:13 }}>🏆</span>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                  letterSpacing:"0.18em",color:"#334155",textTransform:"uppercase" }}>
                  Coming Soon
                </span>
              </div>
              <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
                {["XP Earned","Badges Unlocked","Next Progression"].map(label=>(
                  <div key={label} style={{ padding:"4px 11px",borderRadius:20,
                    border:"1px dashed rgba(255,255,255,0.1)",fontSize:10,color:"#334155" }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

          </div>
          <div style={{ height:20 }}/>
        </div>

        {/* Sticky footer */}
        <div style={{ padding:"12px 16px",
          paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",
          borderTop:`1px solid ${color}20`,background:BG,
          display:"flex",gap:10,flexShrink:0 }}>
          <button onClick={onToggle}
            style={{ flex:1,padding:"13px",borderRadius:12,fontSize:14,fontWeight:800,cursor:"pointer",
              background:isDone?"rgba(34,197,94,0.12)":color,
              border:isDone?"1px solid rgba(34,197,94,0.3)":"none",
              color:isDone?"#22c55e":"#000",transition:"all 0.2s" }}>
            {isDone?"✓ Completed — Undo?":"Mark Complete ✓"}
          </button>
          <button onClick={onNext||onClose}
            style={{ padding:"13px 18px",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",
              background:SF,border:"1px solid rgba(255,255,255,0.09)",color:"#94a3b8" }}>
            {onNext?"Next →":"Close"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════ DRILL CARD ═══════════════════════ */
function DrillCard({ w, color, bg2, brd, isDone, onToggle, onViewDetail }) {
  // color-derived helpers local to this card
  const metaBg  = `${color}12`;
  const metaBrd = `${color}28`;
  const cueTxt  = `${color}cc`;
  return (
    <div onClick={onViewDetail}
      style={{ background:`${color}08`,border:`1px solid ${isDone?color:metaBrd}`,borderRadius:16,overflow:"hidden",marginBottom:14,display:"flex",transition:"border-color 0.2s",cursor:onViewDetail?"pointer":"default" }}>
      <a href={`https://www.youtube.com/watch?v=${w.videoId}`} target="_blank" rel="noopener noreferrer"
        onClick={e=>e.stopPropagation()}
        style={{ flexShrink:0,width:128,position:"relative",display:"block",background:"#0f172a" }}>
        <img src={`https://img.youtube.com/vi/${w.videoId}/mqdefault.jpg`} alt="" style={{ width:128,height:90,objectFit:"cover",display:"block" }}/>
        <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-55%)",width:26,height:26,borderRadius:"50%",background:`${color}cc`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000",fontWeight:700,border:`1px solid ${color}` }}>▶</div>
      </a>
      <div style={{ flex:1,padding:"11px 13px",minWidth:0 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6 }}>
          <div>
            <span style={{ fontSize:9,padding:"2px 8px",borderRadius:20,fontWeight:800,display:"inline-block",marginBottom:4,background:bg2,color,border:`1px solid ${brd}`,letterSpacing:"0.04em" }}>{w.tag}</span>
            {w.trainer && <span style={{ fontSize:9,padding:"2px 8px",borderRadius:20,display:"inline-block",marginBottom:4,marginLeft:4,background:metaBg,color,border:`1px solid ${metaBrd}`,opacity:0.8 }}>📹 {w.trainer}</span>}
            <div style={{ fontSize:13,fontWeight:700,color:"#f1f5f9",lineHeight:1.2 }}>{w.name}</div>
          </div>
          <button onClick={e=>{e.stopPropagation();onToggle();}} style={{ flexShrink:0,width:44,height:44,borderRadius:"50%",border:`2px solid ${isDone?color:metaBrd}`,background:isDone?color:metaBg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,fontWeight:800,color:isDone?"#000":color }}>
            {isDone?"✓":"○"}
          </button>
        </div>
        <div style={{ display:"flex",gap:5,marginBottom:8,flexWrap:"wrap" }}>
          <span style={{ fontSize:10,padding:"3px 8px",background:metaBg,borderRadius:6,fontFamily:"'DM Mono',monospace",color,border:`1px solid ${metaBrd}`,fontWeight:600 }}>{w.sets}</span>
          {w.rest!=="N/A"&&<span style={{ fontSize:10,padding:"3px 8px",background:metaBg,borderRadius:6,fontFamily:"'DM Mono',monospace",color,border:`1px solid ${metaBrd}`,fontWeight:600 }}>Rest {w.rest}</span>}
        </div>
        <p style={{ fontSize:12,color:`${color}bb`,lineHeight:1.55,margin:"0 0 8px" }}>{w.desc}</p>
        <div style={{ display:"flex",flexDirection:"column",gap:4,marginBottom:10,paddingLeft:2 }}>
          {w.cues.map((c,i)=>(
            <div key={i} style={{ fontSize:11,color:cueTxt,display:"flex",lineHeight:1.45,gap:5 }}>
              <span style={{ color,fontWeight:700,flexShrink:0 }}>→</span>{c}
            </div>
          ))}
        </div>
        <a href={`https://www.youtube.com/watch?v=${w.videoId}`} target="_blank" rel="noopener noreferrer"
          onClick={e=>e.stopPropagation()}
          style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,padding:"7px 12px",borderRadius:10,textDecoration:"none",fontWeight:700,background:bg2,color,border:`1px solid ${brd}`,letterSpacing:"0.01em" }}>
          <span style={{ fontSize:13 }}>▶</span> {w.videoTitle}
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN APP ═══════════════════════ */
export default function SummerTrainingApp() {
  const [settings, setSettings] = useState(()=>{ try{return{...DEFAULT,...JSON.parse(localStorage.getItem("s_settings")||"{}")}}catch{return DEFAULT} });
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState("home");
  const [prevView, setPrevView] = useState("home");
  const [activeCat, setActiveCat] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
  const [detailList, setDetailList] = useState([]);
  const [completed, setCompleted] = useState(()=>{ try{return JSON.parse(localStorage.getItem("s_done")||"{}")}catch{return{}} });
  const [strDay, setStrDay] = useState(()=>localStorage.getItem('s_strday')||'Day 1');
  const [onboardName, setOnboardName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(()=>!localStorage.getItem('s_onboarded')&&settings.athleteName===DEFAULT.athleteName);

  /* PWA install prompt ─────────────────────────────────────────── */
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const [installPrompt, setInstallPrompt] = useState(()=>window._installPrompt||null);
  const [showInstallBanner, setShowInstallBanner] = useState(()=>{
    if (isStandalone) return false;
    if (localStorage.getItem('fkh-install-dismissed')) return false;
    return true;
  });
  useEffect(()=>{
    const handler = ()=>{ setInstallPrompt(window._installPrompt); setShowInstallBanner(p=>p||true); };
    window.addEventListener('installpromptready', handler);
    return ()=>window.removeEventListener('installpromptready', handler);
  },[]);
  const dismissInstall = ()=>{ setShowInstallBanner(false); localStorage.setItem('fkh-install-dismissed','1'); };
  const triggerInstall = ()=>{ if (installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(()=>dismissInstall()); } };

  const calcWeek = startDate => {
    if (!startDate) return null;
    const start = new Date(startDate+'T00:00:00'), now = new Date();
    return Math.max(1, Math.floor((now-start)/(7*24*60*60*1000))+1);
  };
  const trainingWeek = calcWeek(settings.startDate);

  useEffect(()=>{ try{localStorage.setItem("s_settings",JSON.stringify(settings))}catch{} },[settings]);
  useEffect(()=>{ try{localStorage.setItem("s_done",JSON.stringify(completed))}catch{} },[completed]);

  const today = todayKey();
  const P = pri(settings), S = sec(settings), BG = bg(settings), ST = str3(settings);
  const NV = nav(settings), SF = surf(settings);

  const isDone  = id => !!completed[`${today}-${id}`];
  const toggle  = id => setCompleted(p=>({...p,[`${today}-${id}`]:!p[`${today}-${id}`]}));
  const setStrDayPersist = day => { setStrDay(day); localStorage.setItem('s_strday',day); };
  const doneCnt = Object.keys(completed).filter(k=>k.startsWith(today)).length;

  /* Exercise Detail helpers ────────────────────────────────── */
  const openDetail = useCallback((ex, list=[]) => {
    const enrich = e => ({ ...e, _cat:e._cat||"speed", meta:e.meta||EXERCISE_META[e.id]||{} });
    setActiveExercise(enrich(ex));
    setDetailList(list.map(enrich));
  }, []);
  const detailIdx  = activeExercise ? detailList.findIndex(e=>e.id===activeExercise.id) : -1;
  const nextExDetail = detailIdx>=0 && detailIdx<detailList.length-1 ? detailList[detailIdx+1] : null;
  const closeDetail  = () => setActiveExercise(null);

  const todayIdx  = new Date().getDay()===0?6:new Date().getDay()-1;
  const todayPlan = SCHEDULE[todayIdx];

  /* Workout generator ──────────────────────────────────────────── */
  const defaultTmpl = todayPlan.cats.map(c=>SCHED_TO_TEMPLATE[c]).find(Boolean)||"quickFeet";
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTmpl);
  const [todaysWorkout, setTodaysWorkout] = useState(null);

  const recentExIds = useMemo(()=>{
    const cutoff = new Date(Date.now()-3*86400000).toLocaleDateString("en-CA");
    return Object.keys(completed)
      .filter(k=>{ const d=k.split("-").slice(0,3).join("-"); return d>=cutoff && completed[k]; })
      .map(k=>k.split("-").slice(3).join("-"));
  },[completed]);

  const refreshWorkout = useCallback(()=>{
    setTodaysWorkout(generateWorkout(settings, selectedTemplate, recentExIds));
  },[settings, selectedTemplate, recentExIds]);

  useEffect(()=>{ refreshWorkout(); },[selectedTemplate, settings.athleteAge, settings.experience]);

  const recommendation = useMemo(()=>
    computeRecommendation(settings, completed, selectedTemplate),
  [settings, completed, selectedTemplate]);

  const catColor = key => key==="strength" ? ST : key==="speed"||key==="balance" ? P : S;
  const catBg    = key => `${catColor(key)}16`;
  const catBrd   = key => `${catColor(key)}2e`;

  const bd  = "rgba(255,255,255,0.07)";
  const lbl = { fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}80`,marginBottom:10,textTransform:"uppercase" };
  const NAV = [{id:"home",emoji:"🏠",label:"Home"},{id:"shots",emoji:"🏀",label:"Shots"},{id:"schedule",emoji:"📅",label:"Schedule"}];

  const renderBottomNav = () => (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,background:NV,borderTop:`1px solid ${bd}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>setView(n.id)} style={{ flex:1,padding:"10px 0 12px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
          <span style={{ fontSize:18 }}>{n.emoji}</span>
          <span style={{ fontSize:9,color:view===n.id?P:"#475569",fontWeight:view===n.id?700:400,letterSpacing:"0.04em" }}>{n.label}</span>
          {view===n.id&&<div style={{ width:16,height:2,borderRadius:99,background:P,marginTop:1 }}/>}
        </button>
      ))}
    </div>
  );

  /* SHOTS */
  if (view==="shots") return (
    <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto" }}>
      {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
      <ShotTracker P={P} S={S} BG={BG} athleteName={settings.athleteName}/>
      {renderBottomNav()}
    </div>
  );

  /* CATEGORY DRILLS */
  if (view==="cat" && activeCat) {
    const color = catColor(activeCat), bg2 = catBg(activeCat), brd = catBrd(activeCat);
    const isStrength = activeCat==="strength";
    const filteredWorkouts = isStrength
      ? (WORKOUTS.strength.filter(w=>STR_DAYS[strDay]?.ids.includes(w.id)).concat(WORKOUTS.strength.filter(w=>w.id==="str-full")))
      : WORKOUTS[activeCat];
    return (
      <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"#e2e8f0",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
        {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`2px solid ${color}40`,position:"sticky",top:0,background:NV,backdropFilter:"blur(10px)",zIndex:10 }}>
          <button onClick={()=>setView(prevView)} style={{ background:`${color}14`,border:`1px solid ${color}30`,borderRadius:8,color,fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px",letterSpacing:"0.02em" }}>← Back</button>
          <span style={{ fontSize:15,fontWeight:800,color,letterSpacing:"-0.01em" }}>{CATS[activeCat].emoji} {CATS[activeCat].label}</span>
          <button onClick={()=>setShowSettings(true)} style={{ background:`${color}14`,border:`1px solid ${color}30`,borderRadius:8,color,fontSize:16,cursor:"pointer",padding:"5px 8px" }}>⚙</button>
        </div>

        {/* Strength day picker */}
        {isStrength && (
          <div style={{ padding:"12px 16px 0" }}>
            <div style={lbl}>Training Program — Select Day</div>
            <div style={{ display:"flex",gap:8,marginBottom:14 }}>
              {Object.entries(STR_DAYS).map(([key,val])=>(
                <button key={key} onClick={()=>setStrDayPersist(key)} style={{ flex:1,padding:"10px 8px",borderRadius:12,border:`1px solid ${strDay===key?color:bd}`,background:strDay===key?`${color}18`:"transparent",color:strDay===key?color:"#475569",fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center",lineHeight:1.3 }}>
                  <div style={{ fontSize:16,marginBottom:3 }}>{key==="Day 1"?"💪":key==="Day 2"?"🎯":"⚡"}</div>
                  {key}
                  <div style={{ fontSize:9,color:`${color}99`,marginTop:2 }}>{key==="Day 1"?"Strength/Core":key==="Day 2"?"Balance/Move":"Power/Athletic"}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding:"0 16px 80px" }}>
          {filteredWorkouts.map(w => (
            <DrillCard key={w.id} w={w} color={color} bg2={bg2} brd={brd} isDone={isDone(w.id)} onToggle={()=>toggle(w.id)}
              onViewDetail={()=>openDetail(w, filteredWorkouts)}/>
          ))}
        </div>
        {activeExercise&&<ExerciseDetailSheet
          exercise={activeExercise} color={catColor(activeExercise._cat)}
          bg2={catBg(activeExercise._cat)} brd={catBrd(activeExercise._cat)}
          BG={BG} SF={SF} isDone={isDone(activeExercise.id)}
          onToggle={()=>toggle(activeExercise.id)}
          onClose={closeDetail}
          onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
          completed={completed}/>}
        {renderBottomNav()}
      </div>
    );
  }

  /* HOME / SCHEDULE */
  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"#e2e8f0",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
      {activeExercise&&<ExerciseDetailSheet
        exercise={activeExercise} color={catColor(activeExercise._cat)}
        bg2={catBg(activeExercise._cat)} brd={catBrd(activeExercise._cat)}
        BG={BG} SF={SF} isDone={isDone(activeExercise.id)}
        onToggle={()=>toggle(activeExercise.id)}
        onClose={closeDetail}
        onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
        completed={completed}/>}
      {showOnboarding&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#0d1627",borderRadius:20,padding:28,width:"100%",maxWidth:360,border:"1px solid #f9731640" }}>
            <div style={{ fontSize:48,textAlign:"center",marginBottom:12 }}>🏀</div>
            <h2 style={{ textAlign:"center",fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:6,margin:"0 0 6px" }}>Welcome!</h2>
            <p style={{ textAlign:"center",color:"#64748b",fontSize:13,marginBottom:20 }}>What's your name, hooper?</p>
            <input type="text" value={onboardName} onChange={e=>setOnboardName(e.target.value)} placeholder="Your name" autoFocus
              style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.07)",border:"1.5px solid #f9731640",borderRadius:10,padding:"12px",fontSize:16,color:"#fff",outline:"none",marginBottom:16 }}/>
            <button onClick={()=>{ const name=onboardName.trim()||'Hooper'; setSettings(p=>({...p,athleteName:name})); localStorage.setItem('s_onboarded','1'); setShowOnboarding(false); }}
              style={{ width:"100%",background:"#f97316",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer" }}>
              Let's Go! 🏀
            </button>
          </div>
        </div>
      )}

      <div style={{ padding:"26px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`1px solid ${P}14` }}>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"#334155",marginBottom:7 }}>FTH FIT KID HOOPER</div>
          <h1 style={{ fontSize:28,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.03em",lineHeight:1.1 }}>FTH <span style={{ color:P }}>Fit Kid Hooper</span></h1>
          <p style={{ fontSize:13,color:`${P}88`,margin:0 }}>{settings.athleteName} · Speed · Strength · Hoops 🏀</p>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,marginLeft:12 }}>
          <div onClick={()=>setShowSettings(true)} style={{ width:56,height:56,borderRadius:"50%",background:`${P}18`,border:`3px solid ${P}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
            {settings.avatar?<img src={settings.avatar} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ fontSize:24 }}>👤</span>}
          </div>
          <button onClick={()=>setShowSettings(true)} style={{ background:"none",border:"none",color:P,fontSize:17,cursor:"pointer",padding:0 }}>⚙</button>
        </div>
      </div>

      {/* Install App Banner */}
      {showInstallBanner && view==="home" && (
        <div style={{ margin:"10px 20px 0",padding:"12px 14px",borderRadius:14,background:"rgba(255,255,255,0.05)",border:`1px solid ${P}40`,display:"flex",alignItems:"flex-start",gap:12 }}>
          <div style={{ fontSize:22,lineHeight:1,paddingTop:2 }}>📲</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:700,color:P,marginBottom:3 }}>Add FKH to Your Home Screen</div>
            {isIOS ? (
              <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5 }}>
                Tap <span style={{ color:"#e2e8f0",fontWeight:700 }}>Share</span> → <span style={{ color:"#e2e8f0",fontWeight:700 }}>Add to Home Screen</span> to install the app and get offline access.
              </div>
            ) : installPrompt ? (
              <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5 }}>
                Install for offline access, faster loading, and a full-screen experience.
              </div>
            ) : (
              <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.5 }}>
                Use your browser menu → <span style={{ color:"#e2e8f0",fontWeight:700 }}>Add to Home Screen</span> to install.
              </div>
            )}
            {!isIOS && installPrompt && (
              <button onClick={triggerInstall} style={{ marginTop:8,padding:"6px 16px",borderRadius:20,background:P,border:"none",color:"#000",fontSize:12,fontWeight:800,cursor:"pointer" }}>
                Install App
              </button>
            )}
          </div>
          <button onClick={dismissInstall} style={{ background:"none",border:"none",color:"#475569",fontSize:16,cursor:"pointer",padding:0,lineHeight:1,flexShrink:0 }}>✕</button>
        </div>
      )}

      {view==="home" && (<>

        {/* ── Stat Row ───────────────────────────────────────────── */}
        <div style={{ display:"flex",gap:8,padding:"12px 20px 8px" }}>
          {[[doneCnt,"done today",P], trainingWeek?[`Wk ${trainingWeek}`,"training",S]:null].filter(Boolean).map(([n,l,c])=>(
            <div key={l} style={{ flex:1,background:`${c}10`,border:`1px solid ${c}35`,borderRadius:12,padding:"10px 8px",textAlign:"center" }}>
              <div style={{ fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c,lineHeight:1 }}>{n}</div>
              <div style={{ fontSize:9,color:"#334155",marginTop:3,letterSpacing:"0.06em",textTransform:"uppercase" }}>{l}</div>
            </div>
          ))}
          {!trainingWeek&&<div style={{ flex:1,background:`${S}10`,border:`1px solid ${S}35`,borderRadius:12,padding:"10px 8px",textAlign:"center",cursor:"pointer" }} onClick={()=>setShowSettings(true)}>
            <div style={{ fontSize:11,color:S,fontWeight:700 }}>Set start date</div>
            <div style={{ fontSize:9,color:"#334155",marginTop:2 }}>in ⚙ settings</div>
          </div>}
          <div style={{ flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"10px 8px",textAlign:"center" }}>
            <div style={{ fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#475569",lineHeight:1 }}>
              {Object.keys(completed).filter(k=>{ const d=k.split("-").slice(0,3).join("-"), cutoff=new Date(Date.now()-6*86400000).toLocaleDateString("en-CA"); return d>=cutoff&&completed[k]; }).length > 0
                ? (() => { let s=0,d=new Date(); for(let i=0;i<14;i++){const k=d.toLocaleDateString("en-CA");if(Object.keys(completed).some(c=>c.startsWith(k)&&completed[c])){s++;d.setDate(d.getDate()-1);}else break;} return s; })()
                : 0}
            </div>
            <div style={{ fontSize:9,color:"#334155",marginTop:3,letterSpacing:"0.06em",textTransform:"uppercase" }}>streak</div>
          </div>
        </div>

        {/* ── Template Picker ────────────────────────────────────── */}
        <div style={{ padding:"10px 20px 4px" }}>
          <div style={lbl}>Today's Mission</div>
        </div>
        <div style={{ display:"flex",gap:7,overflowX:"auto",padding:"0 20px 10px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch" }}>
          {Object.entries(WORKOUT_TEMPLATES).map(([key,tmpl])=>(
            <button key={key} onClick={()=>setSelectedTemplate(key)}
              style={{ flexShrink:0,padding:"7px 13px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                background:selectedTemplate===key?P:"rgba(255,255,255,0.05)",
                border:`1.5px solid ${selectedTemplate===key?P:"rgba(255,255,255,0.09)"}`,
                color:selectedTemplate===key?"#000":"#64748b" }}>
              {tmpl.emoji} {tmpl.name}
            </button>
          ))}
        </div>

        {/* ── Mission Card ───────────────────────────────────────── */}
        {todaysWorkout ? (
          <div style={{ margin:"0 20px 16px",borderRadius:16,background:`${P}09`,border:`1px solid ${P}22`,overflow:"hidden" }}>

            {/* Header */}
            <div style={{ padding:"14px 16px 8px",display:"flex",alignItems:"flex-start",gap:10 }}>
              <span style={{ fontSize:28,lineHeight:1 }}>{todaysWorkout.templateEmoji}</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:15,fontWeight:800,color:P,lineHeight:1.2 }}>{todaysWorkout.templateName}</div>
                <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{todaysWorkout.templateDesc}</div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <div style={{ fontSize:22,fontWeight:800,color:P,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>
                  {Math.max(1,Math.round(todaysWorkout.totalSecs/60))}
                </div>
                <div style={{ fontSize:9,color:"#475569",letterSpacing:"0.07em" }}>MIN</div>
              </div>
            </div>

            {/* Exercise list by role */}
            <div style={{ padding:"4px 12px 10px" }}>
              {["warmup","main","finisher","recovery"].map(role=>{
                const exs=todaysWorkout.exercises.filter(e=>e.role===role);
                if(!exs.length) return null;
                const [dot,roleName]={warmup:["🟡","Warm-Up"],main:["🔵","Main Block"],finisher:["🔴","Finisher"],recovery:["🟢","Cool Down"]}[role];
                return (
                  <div key={role} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9,fontWeight:700,color:"#475569",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5,paddingLeft:4 }}>
                      {dot} {roleName}
                    </div>
                    {exs.map(ex=>{
                      const done2=isDone(ex.id);
                      return (
                        <div key={ex.id}
                          onClick={()=>openDetail(ex, todaysWorkout.exercises)}
                          style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:10,marginBottom:3,cursor:"pointer",
                            background:done2?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${done2?"rgba(34,197,94,0.15)":"transparent"}` }}>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:done2?"#22c55e":"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ex.name}</div>
                            <div style={{ fontSize:10,color:"#475569" }}>{ex.sets}</div>
                          </div>
                          <div style={{ fontSize:10,color:"#334155",fontFamily:"'DM Mono',monospace",flexShrink:0 }}>
                            {Math.round((ex.meta?.estimatedDuration||90)/60)}m
                          </div>
                          <span style={{ fontSize:14,color:done2?"#22c55e":"#334155",flexShrink:0 }}>{done2?"✓":"›"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ padding:"8px 14px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:8 }}>
              <button onClick={()=>{
                const first=todaysWorkout.exercises[0];
                if(first){ setActiveCat(first._cat||"explosion"); setPrevView("home"); setView("cat"); }
              }} style={{ flex:1,padding:"11px",borderRadius:12,background:P,border:"none",color:"#000",fontSize:13,fontWeight:800,cursor:"pointer" }}>
                Start Workout →
              </button>
              <button onClick={refreshWorkout}
                title="Shuffle exercises"
                style={{ padding:"11px 15px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"#64748b",fontSize:16,cursor:"pointer" }}>
                🔀
              </button>
            </div>
          </div>
        ) : (
          <div style={{ margin:"0 20px 16px",padding:"20px",borderRadius:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",textAlign:"center" }}>
            <div style={{ fontSize:13,color:"#475569" }}>Generating workout…</div>
          </div>
        )}

        {/* ── Recommended Tomorrow ───────────────────────────────── */}
        {recommendation && (()=>{
          const A = str3(settings); // accent color (teal)
          const isAlreadySelected = recommendation.templateKey === selectedTemplate;
          return (
            <div style={{ margin:"0 20px 16px",borderRadius:16,
              background:`${A}0d`,border:`1px solid ${A}28`,overflow:"hidden" }}>
              {/* Label row */}
              <div style={{ padding:"11px 14px 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",
                  color:`${A}90`,textTransform:"uppercase" }}>
                  Tomorrow's Rec
                </span>
                <span style={{ fontSize:9,color:"#334155",fontFamily:"'DM Mono',monospace" }}>Coach FKH</span>
              </div>
              {/* Main content */}
              <div style={{ padding:"10px 14px 12px",display:"flex",alignItems:"center",gap:11 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:`${A}18`,
                  border:`1px solid ${A}30`,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:22,flexShrink:0,lineHeight:1 }}>
                  {recommendation.templateEmoji}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:A,lineHeight:1.2,marginBottom:3 }}>
                    {recommendation.templateName}
                  </div>
                  <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.45 }}>
                    {recommendation.reason}
                  </div>
                </div>
              </div>
              {/* Action */}
              <div style={{ padding:"0 14px 13px" }}>
                <button
                  onClick={()=>{ if(!isAlreadySelected) setSelectedTemplate(recommendation.templateKey); }}
                  style={{ width:"100%",padding:"9px",borderRadius:10,fontSize:12,fontWeight:700,
                    cursor: isAlreadySelected?"default":"pointer",
                    background: isAlreadySelected?`${A}18`:`${A}22`,
                    border:`1px solid ${isAlreadySelected?`${A}30`:`${A}50`}`,
                    color: isAlreadySelected?`${A}70`:A,
                    transition:"all 0.2s" }}>
                  {isAlreadySelected ? "✓ Already loaded" : "Load for Today →"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Active Challenges ──────────────────────────────────── */}
        <div style={{ padding:"0 20px 16px" }}>
          <div style={lbl}>Active Challenges</div>
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            {CHALLENGES_DEF.map(def=>{
              const {cur,target}=getChallengeProgress(def,completed);
              const pct=Math.min(1,cur/target), done2=pct>=1;
              return (
                <div key={def.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,
                  background:done2?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.04)",
                  border:`1px solid ${done2?"rgba(34,197,94,0.2)":"rgba(255,255,255,0.07)"}` }}>
                  <span style={{ fontSize:18,lineHeight:1 }}>{def.emoji}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                      <span style={{ fontSize:11,fontWeight:700,color:done2?"#22c55e":"#cbd5e1" }}>{def.name}</span>
                      <span style={{ fontSize:10,color:done2?"#22c55e":"#475569",fontFamily:"'DM Mono',monospace",flexShrink:0,marginLeft:6 }}>{Math.min(cur,target)}/{target}</span>
                    </div>
                    <div style={{ height:4,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${pct*100}%`,background:done2?"#22c55e":P,borderRadius:99,transition:"width 0.5s ease" }}/>
                    </div>
                    <div style={{ fontSize:9,color:"#334155",marginTop:3 }}>{def.desc}</div>
                  </div>
                  {done2&&<span style={{ fontSize:14,flexShrink:0 }}>🏆</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Training Modules ───────────────────────────────────── */}
        <div style={{ padding:"0 20px 16px" }}>
          <div style={lbl}>Training Modules</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {Object.entries(CATS).map(([key,cat])=>{
              const done2=WORKOUTS[key].filter(w=>isDone(w.id)).length, total=WORKOUTS[key].length, c=catColor(key);
              return (
                <button key={key} onClick={()=>{setActiveCat(key);setPrevView("home");setView("cat");}}
                  style={{ padding:"14px",borderRadius:16,textAlign:"left",cursor:"pointer",border:`1px solid ${catBrd(key)}`,background:catBg(key) }}>
                  <div style={{ fontSize:22,marginBottom:6 }}>{cat.emoji}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:c,lineHeight:1.25,marginBottom:2 }}>{cat.label}</div>
                  <div style={{ fontSize:10,color:`${c}99`,marginBottom:8 }}>{total} drills</div>
                  <div style={{ height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden",marginBottom:4 }}>
                    <div style={{ height:"100%",width:`${(done2/total)*100}%`,background:c,borderRadius:99 }}/>
                  </div>
                  {done2>0&&<div style={{ fontSize:10,fontWeight:700,color:c }}>✓ {done2} done</div>}
                </button>
              );
            })}
          </div>
        </div>

      </>)}

      {view==="schedule" && (
        <div style={{ padding:"14px 20px" }}>
          <div style={lbl}>Weekly Schedule</div>
          {SCHEDULE.map((d,i)=>{
            const isToday = i===todayIdx;
            const hasWork = d.cats.length > 0;
            return (
            <div key={i}
              onClick={hasWork ? ()=>{ setActiveCat(d.cats[0]); setPrevView("schedule"); setView("cat"); } : undefined}
              style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:4,background:isToday?`${P}0e`:"transparent",border:`1px solid ${isToday?`${P}30`:"transparent"}`,cursor:hasWork?"pointer":undefined }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:isToday?P:`${P}99`,width:32,flexShrink:0,fontWeight:isToday?800:400 }}>{d.day}</div>
              <div style={{ fontSize:13,color:isToday?P:`${P}dd`,flex:1,fontWeight:600 }}>{d.label}</div>
              {isToday&&<span style={{ fontSize:9,fontWeight:800,color:P,letterSpacing:"0.06em" }}>TODAY</span>}
              <div style={{ display:"flex",gap:5 }}>
                {d.cats.map(c=>(
                  <button key={c}
                    onClick={e=>{ e.stopPropagation(); setActiveCat(c); setPrevView("schedule"); setView("cat"); }}
                    style={{ fontSize:11,padding:"3px 9px",borderRadius:20,background:catBg(c),color:catColor(c),border:`1px solid ${catBrd(c)}`,fontWeight:600,cursor:"pointer" }}>
                    {CATS[c].emoji} {CATS[c].label.split(' ')[0]}
                  </button>
                ))}
              </div>
              {hasWork&&<span style={{ fontSize:16,color:`${P}80`,flexShrink:0,lineHeight:1 }}>›</span>}
            </div>
            );
          })}
        </div>
      )}

      {renderBottomNav()}
    </div>
  );
}

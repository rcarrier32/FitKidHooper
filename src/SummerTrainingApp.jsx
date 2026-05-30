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
  dateOfBirth:null, experience:"beginner", goals:[], playStyle:"any",
};

/**
 * Calculate current age from an ISO date-of-birth string ("YYYY-MM-DD").
 * Returns 12 when dob is absent (safe fallback for new/migrated profiles).
 * Age updates automatically every time the function is called — no manual updates needed.
 */
function calcAge(dob) {
  if (!dob) return 12;
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** True only on the athlete's birthday. */
function isBirthday(dob) {
  if (!dob) return false;
  const birth = new Date(dob + "T00:00:00");
  const today = new Date();
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
}
const hsl  = (h,s,l) => {
  // Output #rrggbb hex so that ${color}XX alpha-suffix trick produces valid 8-char hex (#rrggbbaa)
  const _s = s/100, _l = l/100;
  const a = _s * Math.min(_l, 1-_l);
  const f = n => { const k=(n+h/30)%12; const c=_l-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*c).toString(16).padStart(2,'0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
};
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
    videoId:"AezzGLeOTss", videoTitle:"Triple Lateral Hops — Lateral Bound & Stick" },
  { id:"pogo-hops", name:"Pogo Hops", tag:"Reactive Balance", sets:"3x15 reps", rest:"45 s",
    desc:"Single-leg rapid pogo hops. Combines ankle stiffness training with single-leg balance and reactive movement.",
    cues:["Stay on ball of foot — heels barely graze the floor","Stiff ankle — spring, do not collapse","Small quick hops first, build rhythm","Switch legs every set"],
    videoId:"j0nl5dWuqN4", videoTitle:"Pogo Jump Tutorial — Proper Form" },
  { id:"sl-balance-reach",  name:"Single Leg Balance Reach",       tag:"Proprioception", sets:"3x8 each leg", rest:"20 s",
    desc:"Stand single-leg, reach the free leg in multiple directions while keeping balance. Trains proprioception and ankle stability.",
    cues:["Slight bend in standing knee","Hip stays level — do not let it drop","Reach far in each direction","Eyes can be open then closed to level up"],
    videoId:"TShLyAkKU9c", videoTitle:"Single Leg Balance and Reach" },
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
    videoId:"bxn9FBrt4-A", videoTitle:"Dead Bug Exercise — Proper Form | NASM" },
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
    videoId:"U3Y58Kyw7Xw", videoTitle:"Bear Crawl Exercise — Tutorial" },
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
    trainer:"PJF Performance", videoId:"IcfbOBftn5c", videoTitle:"Pogo Jump to Tuck Jump — PJF Performance" },
  { id:"snap-downs", name:"Snap Downs", tag:"PJF Landing", sets:"3x8", rest:"60 s",
    desc:"From standing tall, snap down into a quarter squat athletic position as fast as possible. Trains the ability to decelerate — essential for cutting and landing safely.",
    cues:["Start tall, feet together","Snap down FAST — like a controlled fall","Land in wide athletic stance","Absorb through hips, not knees"],
    trainer:"PJF Performance", videoId:"fXWPPaRdybI", videoTitle:"Snap Downs — PJF Performance" },
  { id:"depth-drop", name:"Depth Drop Landing", tag:"PJF Landing", sets:"3x6", rest:"60 s",
    desc:"Step off a low box, land and absorb as quietly as possible. Teaches proper force absorption — most important injury-prevention drill.",
    cues:["Step off — do not jump off","Land SOFT and absorb completely","Toes to ankles to knees to hips","Hold landing 2 seconds before moving"],
    trainer:"PJF Performance", videoId:"ol4VhEANoQs", videoTitle:"Depth Drop Landing — Landing Mechanics" },
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
];

const W_CONDITIONING = [
  { id:"down-ups",         name:"Down Ups",                        tag:"Conditioning",   sets:"3x10", rest:"30 s",
    desc:"Drop to the ground and get back up as fast as possible. Simulates getting up after diving for a loose ball — conditioning meets competition.",
    cues:["Full body hits the floor — chest down","Explode up immediately","Arms push first, then hips","Keep moving — no pausing at the top or bottom"],
    videoId:"Au8-FTy1smY", videoTitle:"Down Ups — Get Up Fast Exercise" },
  { id:"burpees",          name:"Burpee Progression",              tag:"Conditioning",   sets:"3x8", rest:"45 s",
    desc:"The complete conditioning drill — squat, plank, push-up, jump. Build from half-burpee to full with jump.",
    cues:["Plank position must be solid — no sagging hips","Push-up is optional until upper body is ready","Jump at top — arms overhead","Land soft — right back into the squat"],
    videoId:"TU8QYVW0gDU", videoTitle:"Burpee Progression" },
  { id:"mountain-climbers", name:"Mountain Climbers",              tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"In a plank, drive knees to chest alternately. Builds core stability, hip flexor strength, and conditioning simultaneously.",
    cues:["Hips stay level — do not bounce them","Shoulders directly over hands","Drive knee toward same-side elbow","Keep moving — no pausing"],
    videoId:"nmwgirgXLYM", videoTitle:"Mountain Climbers — Cross Body" },
  { id:"cross-mt-climbers", name:"Cross-Body Mountain Climbers",   tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"Drive each knee toward the OPPOSITE elbow. Adds rotational core challenge — transfers to crossover moves and defensive rotations.",
    cues:["Rotate from the core — not just the hip","Keep the plank solid","Slower than regular mountain climbers — control the rotation","Both shoulders stay square to the floor"],
    videoId:"nmwgirgXLYM", videoTitle:"Cross Body Mountain Climbers" },
  { id:"high-knees",       name:"High Knees",                      tag:"Conditioning",   sets:"3x20 s", rest:"30 s",
    desc:"Run in place driving knees above waist height. Builds hip flexor strength, leg turnover speed, and conditioning.",
    cues:["Drive knee UP — not just forward","Pump arms: opposite arm to opposite leg","Stay on balls of feet","Go as fast as you can maintain form"],
    videoId:"h-lqIgLaEFA", videoTitle:"High Knees — Proper Form & Technique" },
  { id:"fast-feet",        name:"Fast Feet Drill",                 tag:"Quickness",      sets:"3x15 s", rest:"30 s",
    desc:"Rapid short steps in place, then react to a signal. Directly trains the foot speed and reaction time needed for defense.",
    cues:["Barely lift feet off the ground — fast touches","Stay low in athletic stance","Weight on balls of feet","React to the signal — do not anticipate"],
    videoId:"RvYB5qI8Urk", videoTitle:"Fast Feet — Top 5 Foot Speed Drills" },
  { id:"crab-walks",       name:"Crab Walks",                      tag:"Full Body",      sets:"3x20 yards", rest:"30 s",
    desc:"On hands and feet facing up, walk forward and backward. Builds posterior shoulder strength, hip extension, and full-body coordination.",
    cues:["Hips up — not sagging toward the floor","Walk opposite hand and foot together","Eyes up — not at the ground","Keep hips level throughout"],
    videoId:"oNUJek2xixA", videoTitle:"Crab Walk Exercise — Proper Form" },
  { id:"frog-jumps",       name:"Frog Jumps",                      tag:"Power + Cardio", sets:"3x8", rest:"60 s",
    desc:"Deep squat, then explode upward and forward, land back in the squat. Builds hip power and conditions the legs simultaneously.",
    cues:["Deep squat before each jump","Explode from the bottom — no pause","Swing arms forward on takeoff","Land in squat — immediately go again"],
    videoId:"GvTeWVyJKNE", videoTitle:"Frog Jumps — Plyometric Exercise" },
  { id:"plank-jacks",      name:"Plank Jacks",                     tag:"Core + Cardio",  sets:"3x20 s", rest:"30 s",
    desc:"In a plank, jump feet out and in like a jumping jack. Core stability under movement — harder than it looks.",
    cues:["Hips stay level — do not rise or dip","Shoulders stay over hands","Land soft with each hop","Breathe steadily throughout"],
    videoId:"8Do3ssZ23Mc", videoTitle:"Plank Jacks — Proper Form" },
  { id:"speed-skaters",    name:"Speed Skaters",                   tag:"Lateral Power",  sets:"3x30 s", rest:"45 s",
    desc:"Lateral bounds alternating feet — like a speed skater. Builds the same lateral explosiveness as defensive slides but with more power.",
    cues:["Reach trailing leg far behind","Pause one second on each landing","Drive forward and lateral — not just sideways","Build distance over time"],
    videoId:"9_jLW6VkU8A", videoTitle:"Speed Skaters Exercise — Proper Form" },
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
    videoId:"U4s4mEQ5VqU", videoTitle:"Squat Jacks Exercise" },
  { id:"push-shoulder-taps", name:"Push-Up Shoulder Taps",         tag:"Upper Body Core", sets:"3x10 each side", rest:"45 s",
    desc:"Do a push-up, then tap each shoulder alternately while in the top position. Adds anti-rotation challenge to the push-up.",
    cues:["Hips do not rotate — resist the rotation","Wide stance helps — feet hip-width or wider","Slow on the taps — control beats speed","Full push-up between each set of taps"],
    videoId:"kF9X6PKVysc", videoTitle:"Push-Up Shoulder Taps — Proper Form" },
];

const W_COORDINATION = [
  { id:"carioca",             name:"Carioca Drill",               tag:"Footwork",          sets:"3x20 yards", rest:"30 s",
    desc:"Crossover running laterally — alternating front and back crosses. The foundation of hip mobility and lateral coordination.",
    cues:["Stay low and light on your feet","Drive hips through each cross","Arms stay relaxed at sides","Speed comes from rhythm, not force"],
    videoId:"R3__Q_SulyM", videoTitle:"Carioca Drill — Lateral Footwork" },
  { id:"lateral-carioca",     name:"Lateral Carioca",             tag:"Footwork",          sets:"3x15 yards each dir", rest:"30 s",
    desc:"Side-to-side carioca focusing on hip rotation and ground contact rhythm.",
    cues:["Rotate hips fully on each cross","Light foot contacts","Keep shoulders square and level","Build speed over each rep"],
    videoId:"R3__Q_SulyM", videoTitle:"Lateral Carioca" },
  { id:"rhythm-line-hops",    name:"Rhythm Line Hops",            tag:"Rhythm",            sets:"3x20 s", rest:"30 s",
    desc:"Two-foot hops in a rhythmic pattern over a line. Builds timing, coordination, and foot-speed rhythm.",
    cues:["Stay on balls of feet","Keep a consistent rhythm — like a metronome","Small hops — clearance only","Eyes forward, not down"],
    videoId:"dJI2q9TPdig", videoTitle:"Line Hops Drill — Jr. NBA at Home" },
  { id:"quick-step-matrix",   name:"Quick Step Matrix",           tag:"Multi-Direction",   sets:"3 rounds", rest:"45 s",
    desc:"Multi-directional quick steps in a grid or box pattern. Trains the ability to change direction and foot placement rapidly.",
    cues:["Short choppy steps","Stay in an athletic base — do not stand tall","Each direction gets equal attention","Speed comes after pattern is memorized"],
    videoId:"zt3_P2PyVco", videoTitle:"Lateral Step Matrix Footwork Drill" },
  { id:"sl-rhythm-hops",      name:"Single Leg Rhythm Hops",      tag:"Single Leg Coord",  sets:"3x12 each leg", rest:"30 s",
    desc:"Rhythmic hops on one foot in a controlled pattern. Combines single-leg stability with coordination timing.",
    cues:["Stay on ball of foot","Find the rhythm before adding speed","Soft landings throughout","Switch legs and notice the difference"],
    videoId:"kehkiqjFQdw", videoTitle:"Single Leg Hop Agility Drill" },
  { id:"cross-body-toe-taps", name:"Cross Body Toe Taps",         tag:"Cross-Body",        sets:"3x20 s", rest:"20 s",
    desc:"Alternate tapping each foot across the midline on a line or cone. Trains cross-body coordination and hip mobility simultaneously.",
    cues:["Reach across the midline on each tap","Stay upright — do not lean","Alternate at a consistent rhythm","Add a bounce between taps to level up"],
    videoId:"ZcFcjTON42I", videoTitle:"Cross Body Toe Taps" },
  { id:"reactive-cone-calls", name:"Reactive Cone Calls",         tag:"Reaction",          sets:"3x45 s", rest:"30 s",
    desc:"React to called cone colors or numbers and sprint to touch. Trains eyes-up awareness and reactive movement together.",
    cues:["Stay in ready position between cues","First step is an explosive push — not a lean","React, do not anticipate","Eyes on the caller, not the cones"],
    videoId:"LKLlDnisYZo", videoTitle:"Cone Reaction Drill" },
  { id:"partner-mirror",      name:"Partner Mirror Drill",        tag:"Reaction",          sets:"3x30 s", rest:"30 s",
    desc:"Mirror your partner's movements in real time. The most game-realistic agility drill — you must read and react, not predict.",
    cues:["Stay in low athletic stance","Eyes on partner's hips — hips tell you direction before feet do","Do not let your partner get past you","Compete — this is a game"],
    videoId:"HJwBzfT3ZJc", videoTitle:"The Defensive Mirror Drill" },
  { id:"tennis-reaction-catch",name:"Tennis Ball Reaction Catch", tag:"Hand-Eye",          sets:"3x45 s", rest:"20 s",
    desc:"Drop or toss a tennis ball off a wall and react to catch it. Trains reaction time and hand-eye coordination simultaneously.",
    cues:["Start in ready position — weight on balls of feet","Move first — do not wait to see where it goes","Try to catch it as low as possible","Toss at different angles each rep"],
    videoId:"kzn5mwP2J7c", videoTitle:"Basketball Tennis Ball Reaction Drill" },
  { id:"alternating-line-hops",name:"Alternating Line Hops",     tag:"Rhythm",            sets:"3x20 s", rest:"20 s",
    desc:"Hop side to side over a line alternating the lead foot each rep. Adds a coordination layer to standard line hops.",
    cues:["Lead with a different foot each hop","Stay light — fast contacts","Consistent rhythm over maximum speed","Add forward/backward hops to progress"],
    videoId:"H0lpcLJ94dk", videoTitle:"Alternating Line Hops Agility Drill" },
  { id:"hip-flip-footwork",   name:"Hip Flip Footwork",          tag:"Hip Mobility",      sets:"3x10 each dir", rest:"30 s",
    desc:"Open and close the hips rapidly while moving laterally. The hip flip is the foundation of changing direction without crossing your feet on defense.",
    cues:["Pivot from the hip — not the ankle","Stay low throughout","Plant the pivot foot firmly","Used on every defensive rotation — make it automatic"],
    videoId:"mZVvoGEuBIA", videoTitle:"Defensive Hip Flip — Basketball Drill" },
  { id:"fast-feet-turn",      name:"Fast Feet + Turn",           tag:"Quickness",         sets:"3x15 s", rest:"30 s",
    desc:"Rapid feet-in-place, then explode into a 180-degree turn on a signal. Combines foot speed with hip rotation and reaction.",
    cues:["Fast feet stay low — barely off the floor","Turn is explosive — full commitment","Land in athletic stance on the turn","React to the signal — do not anticipate it"],
    videoId:"z_WsDDyU258", videoTitle:"Fast Feet + Turn — Defensive Footwork Drill" },
  { id:"sl-snap-down-coord",  name:"Single Leg Snap Down",       tag:"Landing Coord",     sets:"3x8 each leg", rest:"45 s",
    desc:"Snap down onto a single leg from a standing position. Trains single-leg deceleration and landing control at a coordination level.",
    cues:["Snap FAST — then absorb completely","Soft landing — no loud contact","Hold every landing for 2 full counts","Progress: start from a box for extra height"],
    videoId:"Wh4oGVLbewE", videoTitle:"Single Leg Snap Down — Landing Control" },
  { id:"lateral-step-matrix", name:"Lateral Step Matrix",        tag:"Multi-Direction",   sets:"3 rounds", rest:"45 s",
    desc:"Lateral step pattern through a grid — forward, back, diagonals. The most complete footwork coordination drill.",
    cues:["Never let feet touch","Short choppy steps","Eyes up throughout the pattern","Memorize the pattern then add speed"],
    videoId:"zt3_P2PyVco", videoTitle:"Lateral Step Matrix" },
  { id:"crossover-footwork",  name:"Crossover Footwork Patterns",tag:"Crossover",         sets:"3x each pattern", rest:"30 s",
    desc:"Structured crossover step sequences for basketball-specific footwork. Covers the exact foot patterns used in crossover dribbles and cuts.",
    cues:["Each pattern is a basketball move — visualize the defender","Plant foot firm before each crossover","Eyes up on every rep","Slow and clean beats fast and sloppy"],
    videoId:"btWfFkTUHog", videoTitle:"Crossover Run — Footwork Drill" },
];

const W_DECELERATION = [
  { id:"jump-stop-hold",       name:"Jump Stop Hold",            tag:"Landing",           sets:"3x8", rest:"45 s",
    desc:"Two-foot jump stop and FREEZE. The pivot foot foundation of every legal basketball move — master this before any other footwork.",
    cues:["Both feet land simultaneously","Freeze on every single landing — 2 full counts","Wide stance — not feet together","This is the most important basketball footwork drill"],
    videoId:"WjssoRn7GcU", videoTitle:"Jump Stop — Two Foot Snap Down & Hold" },
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
    videoId:"WmcEiWGOiPg", videoTitle:"Reactive Landing Drill — Landing Mechanics" },
  { id:"sprint-to-stick",      name:"Sprint To Stick",           tag:"Deceleration",      sets:"3x5", rest:"60 s",
    desc:"Sprint full speed, then stick a two-foot landing on a line. Teaches the most important skill young athletes lack — decelerating at full speed.",
    cues:["Sprint at TRUE full speed — not 80%","Chop steps approaching the line","Two-foot plant — both feet hit together","Hold the landing for 3 seconds"],
    videoId:"sdgPBkKNO4Y", videoTitle:"Sprint to Stick Landing — Deceleration" },
  { id:"decel-shuffle",        name:"Deceleration Shuffle",      tag:"Lateral Decel",     sets:"3x5 each dir", rest:"45 s",
    desc:"Full-speed defensive shuffle, then stop and hold. Trains lateral deceleration — the stopping skill used every defensive possession.",
    cues:["Shuffle at true speed — not jogging","Chop the last 2 steps to decelerate","Wide athletic stance on the stop","Hold position — do not fall forward"],
    videoId:"ADDEtPq6c_s", videoTitle:"Lateral Shuffle — Deceleration Drill" },
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
    videoId:"f2-mg9EghpI", videoTitle:"Hop Hop Stick — Plyometric Landing" },
  { id:"hop-hop-stick",        name:"Hop-Hop-Stick",             tag:"Reactive Landing",  sets:"3x6 each leg", rest:"45 s",
    desc:"Two small hops followed by a maximum effort stick landing. Trains the ability to absorb force after repeated ground contacts.",
    cues:["First two hops are light and rhythmic","Third contact is a FULL stick — maximum absorption","No extra steps or hops after the stick","Hold the stick for 2 full counts"],
    videoId:"f2-mg9EghpI", videoTitle:"Hop-Hop-Stick" },
  { id:"reactive-landing",     name:"Reactive Landing Drill",    tag:"Reactive",          sets:"3x8", rest:"45 s",
    desc:"Jump or bound, react to a direction signal, and stick the landing in that direction. Combines reactive movement with deceleration control.",
    cues:["React to the signal at peak height","Land in the called direction","Absorb completely — do not let momentum continue","The faster the reaction, the better the landing"],
    videoId:"WmcEiWGOiPg", videoTitle:"Reactive Landing Drill" },
  { id:"sl-snap-down-dec",     name:"Single Leg Snap Down",      tag:"Single Leg Decel",  sets:"3x8 each leg", rest:"45 s",
    desc:"Snap down onto a single leg and hold. The hardest deceleration skill — trains the single-leg control that protects the knee on every cut and landing.",
    cues:["Land on ball of foot first","Drive heel down to absorb","Knee tracks straight — NEVER caves in","Hold completely still for 3 counts"],
    videoId:"Wh4oGVLbewE", videoTitle:"Single Leg Snap Down — Landing Control" },
  { id:"depth-landing-hold",   name:"Depth Landing Hold",        tag:"Depth",             sets:"3x6", rest:"60 s",
    desc:"Step off a low box and absorb into a held landing. The most controlled way to build landing mechanics — gravity does the work.",
    cues:["Step off — never jump off","Absorb completely before any movement","As quiet as possible — loud = poor absorption","Progress: increase box height slowly"],
    videoId:"WmcEiWGOiPg", videoTitle:"Depth Landing Hold — Landing Mechanics" },
  { id:"closeout-decel",       name:"Closeout Deceleration",     tag:"Basketball",        sets:"3x8", rest:"45 s",
    desc:"Sprint out to a shooter and decelerate with controlled footwork. The exact defensive skill used on every perimeter closeout.",
    cues:["Sprint is full speed to start","Chop steps at 6-8 feet — not earlier","Wide stance on arrival — ready to slide","Hand up and contest — this is a full defensive rep"],
    videoId:"6mzS2sVhcdg", videoTitle:"Closeout Deceleration — Basketball Defense" },
];

const W_ATHLETIC = [
  { id:"hip-turns",            name:"Hip Turns",                 tag:"Hip Mobility",      sets:"3x10 each dir", rest:"30 s",
    desc:"Open and close the hips while moving — the foundation of athletic movement. Every cut, drive, and defensive slide starts with the hips.",
    cues:["Pivot from the hip — not the foot","Full range of motion each rep","Stay low throughout","Fast hips, controlled torso"],
    videoId:"wH8uL5hTQz4", videoTitle:"Hip Turns" },
  { id:"defensive-hip-flip",   name:"Defensive Hip Flip",        tag:"Defense",           sets:"3x10 each dir", rest:"30 s",
    desc:"Flip the hips from front-facing to side-facing while in a defensive stance. The key movement for transitioning from man defense to help defense.",
    cues:["Plant the pivot foot firmly","Hips open fully — not halfway","Stay in athletic stance throughout","Eyes up on every rep — practice seeing the court"],
    videoId:"mZVvoGEuBIA", videoTitle:"Defensive Hip Flip" },
  { id:"retreat-sprint",       name:"Retreat Sprint",            tag:"Backpedal",         sets:"3x5", rest:"45 s",
    desc:"Backpedal 5-8 yards, then turn and sprint. The exact movement pattern of getting beaten off the dribble and recovering.",
    cues:["Backpedal low — do not stand tall","Head stays still on the turn","Sprint is FULL effort — not 80%","Turn toward your strong side first"],
    videoId:"zj5ReqFvKEQ", videoTitle:"Retreat Sprint — Defensive Footwork Drill" },
  { id:"closeout-footwork",    name:"Closeout Footwork",         tag:"Defense",           sets:"3x8", rest:"30 s",
    desc:"Sprint to a closeout position with controlled footwork. The most-used defensive movement in basketball — done every possession.",
    cues:["Sprint hard to start","Chop steps at 5-6 feet from shooter","Wide base on arrival","Hand up, stay balanced — do not fly by"],
    videoId:"aXGENfO9lPg", videoTitle:"Closeout Footwork — Basketball Defense" },
  { id:"shuffle-shuffle-sprint",name:"Shuffle Shuffle Sprint",   tag:"Transition",        sets:"5 rounds", rest:"30 s",
    desc:"Defensive shuffle then explode into a sprint. Trains the transition from defensive positioning to pursuit — used every time you run the floor.",
    cues:["Shuffle stays low — no bouncing","Drop step to trigger the sprint","First sprint step is the longest","Eyes up throughout"],
    videoId:"zHirJs7syAI", videoTitle:"Shuffle Shuffle Sprint" },
  { id:"backpedal-sprint",     name:"Backpedal To Sprint",       tag:"Transition",        sets:"3x5", rest:"45 s",
    desc:"Backpedal then plant and sprint forward. Trains the transition skill used when a defense collapses or you switch from zone to man.",
    cues:["Backpedal with purpose — stay low","Plant is an aggressive step — drive off it","Sprint straight ahead — do not drift","Speed of the turn determines the effectiveness"],
    videoId:"vYnnIZZ91fI", videoTitle:"Defensive Recovery Run — Reaction Drill" },
  { id:"sprint-float-sprint",  name:"Sprint Float Sprint",       tag:"Speed Variation",   sets:"3x1", rest:"60 s",
    desc:"Full sprint, float at 60% to recover, then explode back to full speed. Trains the ability to vary speeds — crucial for basketball where effort levels constantly change.",
    cues:["Full sprint means 100% — do not hold back","Float is recovery — relax your arms and face","Transition back to sprint is IMMEDIATE — no wind-up","This replicates full-court basketball exactly"],
    videoId:"qF88X_wLGlg", videoTitle:"Sprint Float Sprint — Speed Variation" },
  { id:"reactive-slide",       name:"Reactive Slide Drill",      tag:"Defense",           sets:"3x30 s", rest:"30 s",
    desc:"Defensive slide, react to a signal and change direction. The most game-realistic defensive drill — you must read and react.",
    cues:["Stay low and wide throughout","React immediately — no hesitation","Feet never touch in the slide","Eyes on the signal, not the floor"],
    videoId:"XDhHu6YxmFo", videoTitle:"Reactive Slide — Defensive Shuffle Drill" },
  { id:"crossover-run",        name:"Crossover Run",             tag:"Footwork",          sets:"3x20 yards", rest:"30 s",
    desc:"Running with crossover steps — trains the hip coordination and balance needed for offensive and defensive movement at full speed.",
    cues:["Cross over in FRONT — not behind","Stay low throughout","Build speed over the distance","Arms counter-rotate for balance"],
    videoId:"btWfFkTUHog", videoTitle:"Crossover Run" },
  { id:"acceleration-starts",  name:"Acceleration Starts",       tag:"Speed",             sets:"5x10 yards", rest:"45 s",
    desc:"Explosive starts from various positions — standing, crouching, on the ground. Builds first-step power from any position.",
    cues:["Lean into the first step — not just stand up","Drive the knee hard on the first step","Arms drive the speed","First 3 steps determine your acceleration"],
    videoId:"9GMqCkrAHbg", videoTitle:"Acceleration Starts" },
  { id:"three-step-burst",     name:"3-Step Burst",              tag:"Explosion",         sets:"3x8 each dir", rest:"30 s",
    desc:"3 explosive steps in a direction then stop. Trains the short-burst acceleration used in every basketball cut — the same pattern as a V-cut or curl.",
    cues:["First step is the longest and hardest","Each step builds on the last — it is an acceleration","Stop is controlled — decelerate into athletic stance","Direction can be forward, lateral, or diagonal"],
    videoId:"0aFbY3lg2kw", videoTitle:"3-Step Burst — Sprint Acceleration Drill" },
  { id:"drop-step-sprint",     name:"Drop Step Sprint",          tag:"Transition",        sets:"3x5 each side", rest:"30 s",
    desc:"Drop step then sprint in that direction. The exact movement used to transition from defensive slide to full sprint pursuit.",
    cues:["Drop step is decisive — commit fully","Drive off the drop step foot hard","Sprint is full speed immediately","This is a transition — not a separate movement"],
    videoId:"XXjV6wYmQKE", videoTitle:"Drop Step Sprint — Basketball Transition" },
  { id:"defensive-recovery",   name:"Defensive Recovery Run",    tag:"Defense",           sets:"3x full court", rest:"60 s",
    desc:"Sprint back on defense at full speed while reading the offense ahead. Trains the defensive transition skill — getting back before the other team scores.",
    cues:["Sprint back at TRUE full speed — not jogging","Eyes on the ball — track the transition","Find your player early","Get between your player and the basket"],
    videoId:"vYnnIZZ91fI", videoTitle:"Defensive Recovery Run" },
  { id:"lateral-sprint-combo", name:"Lateral Sprint Combo",      tag:"Multi-Direction",   sets:"4 rounds", rest:"45 s",
    desc:"Lateral shuffle into a sprint into a defensive slide. Combines three movement patterns in one drill — the sequence of movements used on every possession.",
    cues:["Each transition is SHARP — no slowing down between","Stay low throughout all three phases","Eyes up — see the floor","Full effort on every rep"],
    videoId:"rrImTQmO31E", videoTitle:"Lateral Sprint Combo" },
  { id:"reaction-sprint",      name:"Reaction Sprint Drill",     tag:"Reactive",          sets:"5 rounds", rest:"30 s",
    desc:"Sprint on an audio or visual signal. Trains pure reaction time and first-step quickness — the most important athletic quality in basketball.",
    cues:["Start in ready position — weight forward","React immediately — do not hesitate","First step is an explosive push","Track your reaction time over weeks"],
    videoId:"x8-eq7RNsaQ", videoTitle:"Reaction Sprint Drill — Quickness Training" },
];

const W_SHOOTING = [
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
];

/* ═══════════════════════════════════════════════════════════════
   BASKETBALL SKILL LIBRARY — Ball Handling, Footwork, Finishing,
   Shooting Drills. videoUrl:"" — videos to be sourced separately.
═══════════════════════════════════════════════════════════════ */

const W_BALL_HANDLING = [
  { id:"bh-pound",        name:"Pound Dribble",           tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:90,
    sets:"3x30 s each hand", rest:"15 s",
    transferTags:["ball-control","off-hand","touch"],
    progressionTrack:"Step 1 — Ball Handling Foundation",
    desc:"The absolute starting point. Hip-height stationary dribble with each hand, fingertips only, eyes up. Every elite ball handler still does this daily.",
    cues:["Fingertips — never the palm","Dribble at hip height, not knee or ankle","Push the ball, do not slap it","Eyes forward — trust your hands"],
    trainer:"Pure Sweat Basketball", videoId:"xaOeh5CEc68", videoTitle:"Pound Dribbles — Pure Sweat Basketball" },

  { id:"bh-crossover",    name:"Crossovers",              tag:"Basic Moves",     difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:90,
    sets:"3x20 reps", rest:"20 s",
    transferTags:["attacking","change-of-direction","handles"],
    progressionTrack:"Step 2 — Basic Move Package",
    desc:"Bounce the ball low and fast across the body from hand to hand. The first move every defender has to respect — the foundation of every combo.",
    cues:["Keep the ball BELOW the knee — high crossovers get stolen","Eyes up, sell with your shoulder first","Snap it across — not a lazy float","Alternate slow-to-fast rhythm"],
    trainer:"ILoveBasketballTV", videoId:"lZR6U0kG1oU", videoTitle:"How to Crossover Dribble — Four Variations" },

  { id:"bh-btl",          name:"Between Legs",            tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3x30 s alternating", rest:"20 s",
    transferTags:["ball-protection","handles","creativity"],
    progressionTrack:"Step 3 — Advanced Stationary Moves",
    desc:"Dribble the ball through the legs while stationary or on the move. Protects the ball from a reaching defender and sets up combo moves.",
    cues:["Wide stance — ball needs space to fit through","Lead with the receiving hand reaching across","Don't rush — clean slow reps beat sloppy fast","Build to walking, then running"],
    trainer:"Cramer Basketball", videoId:"Y7PjqLcIhXw", videoTitle:"Between Your Legs Dribble — Cramer Basketball" },

  { id:"bh-in-out",       name:"In & Out Dribble",        tag:"Basic Moves",     difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3x20 reps each hand", rest:"20 s",
    transferTags:["change-of-pace","deception","handles"],
    progressionTrack:"Step 2 — Basic Move Package",
    desc:"Attack toward the defender, dip the ball inside as if crossing, then pull it back out in the original direction. The sell makes this move — not the hands.",
    cues:["Sell with your eyes AND shoulder — look where you are faking","Dip the ball inside sharply — half-measure fakes do not work","Snap back out of it: change of pace — slow to FAST","Stay low throughout"],
    trainer:"Cramer Basketball", videoId:"LMy9MUEd0Q0", videoTitle:"V Dribble Series — Cramer Basketball" },

  { id:"bh-retreat",      name:"Retreat Dribble",         tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:90,
    sets:"3x8 reps each direction", rest:"30 s",
    transferTags:["pressure-handling","decision-making","spacing"],
    progressionTrack:"Step 3 — Advanced Stationary Moves",
    desc:"Step backward one or two dribbles while keeping the ball alive — creates space against aggressive defenders. The escape move that resets possessions.",
    cues:["Keep the dribble on the outside foot — away from pressure","Stay low as you retreat — do not stand up","Chin stays down, eyes find the court","Two retreat dribbles MAX — then make a decision"],
    trainer:"By Any Means Basketball", videoId:"FYZcpwOBzyQ", videoTitle:"Essential Steps to Dribbling a Basketball" },

  { id:"bh-attack-cross", name:"Attack Cross",            tag:"Advanced Moves",  difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:120,
    sets:"3x8 reps each direction", rest:"30 s",
    transferTags:["attacking","change-of-direction","scoring"],
    progressionTrack:"Step 4 — Combo Moves",
    desc:"Hard attack dribble in one direction to draw the defender's momentum, then explode across with a full-speed crossover. The most direct path to getting past a defender.",
    cues:["Attack with purpose — make the defender commit","Time the cross to their weight shift — that is the moment","Cross LOW and fast — do not give them time to recover","Finish with a hard first step through the lane"],
    trainer:"ShotMechanics", videoId:"WokdWEYZ7GU", videoTitle:"Kyrie Irving Dribbling Drills — ShotMechanics" },

  { id:"bh-combo",        name:"Combo Series",            tag:"Advanced Moves",  difficulty:"advanced",     ageRange:[11,14], funScore:10, estimatedDuration:120,
    sets:"3x5 full combos each side", rest:"45 s",
    transferTags:["game-moves","creativity","handles"],
    progressionTrack:"Step 5 — Game-Speed Combos",
    desc:"Two or three moves chained together at full pace — crossover to between-legs, hesi to in-and-out to crossover. This is what defenders see in games.",
    cues:["Each move sets up the next — they are not random","Stay in a low athletic position the entire combo","Speed up across the combo — setup move is slower, finish is explosive","Make one move when one works — do not over-dribble"],
    trainer:"Pro Skills Basketball", videoId:"xyZNJoctA9w", videoTitle:"Best Fun Youth Basketball Drill — Improve Dribbling" },
];

const W_FOOTWORK = [
  { id:"fw-jump-stop",    name:"Jump Stop",               tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:90,
    sets:"3x10 reps", rest:"20 s",
    transferTags:["pivoting","post-moves","legal-play"],
    progressionTrack:"Step 1 — Movement Foundation",
    desc:"Catch or gather into a two-foot simultaneous landing — establishes the pivot foot and legal basketball play. The most important skill in basketball that no one teaches.",
    cues:["Both feet land at the SAME TIME — not one then the other","Land wide with knees bent — athletic base","Freeze completely on landing before any movement","Either foot can become the pivot foot on a jump stop"],
    trainer:"Jr. NBA", videoId:"jgqdv9ySjYM", videoTitle:"Jump Stop, Pivot & Pass Drill — Jr. NBA" },

  { id:"fw-front-pivot",  name:"Front Pivot",             tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:60,
    sets:"3x10 each foot", rest:"15 s",
    transferTags:["post-moves","creation","footwork"],
    progressionTrack:"Step 2 — Pivot Mastery",
    desc:"Step forward with the non-pivot foot, rotating to face a new direction. Opens the ball-handler toward the basket or a passing lane — used on nearly every post touch.",
    cues:["Pivot foot stays planted — zero lift","Swing the free foot forward and around","Stay low through the entire pivot — do not rise up","End in a new triple-threat facing a new direction"],
    trainer:"Jr. NBA", videoId:"3GPNfqIzs9Y", videoTitle:"Forward Pivot Drill — Jr. NBA" },

  { id:"fw-rev-pivot",    name:"Reverse Pivot",           tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:6,  estimatedDuration:60,
    sets:"3x10 each foot", rest:"15 s",
    transferTags:["post-moves","pressure-escape","footwork"],
    progressionTrack:"Step 2 — Pivot Mastery",
    desc:"Step backward with the non-pivot foot to turn away from pressure. Shields the ball from defenders and is the foundation of the drop step and post backing-down.",
    cues:["Swing the free foot backward — not sideways","Keep the ball protected close to your body","Stay low — never rise on a pivot","Eyes over the shoulder — locate the defense"],
    trainer:"Jr. NBA", videoId:"5DgXrx7ZkHU", videoTitle:"Reverse Pivot Drill — Jr. NBA" },

  { id:"fw-triple-threat", name:"Triple Threat",          tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:60,
    sets:"Hold 5 s x 10 reps", rest:"10 s",
    transferTags:["shot-creation","ball-fake","decision-making"],
    progressionTrack:"Step 1 — Movement Foundation",
    desc:"Ball cocked at the hip, knees bent, weight on balls of feet — simultaneously threatening to shoot, pass, or drive. Every catch should land here automatically.",
    cues:["Ball at the hip — not the chest, not the shoulder","Knees bent, hips back — ready to explode","Eyes read the defense: gap? shoot. sagging? drive.","Chin stays level — do not look at the ball"],
    trainer:"Cramer Basketball", videoId:"dg9y9-PuQNE", videoTitle:"Triple Threat Combo Shot Fake Jab Step — Cramer Basketball" },

  { id:"fw-jab-series",   name:"Jab Step Series",         tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3x5 each variation each foot", rest:"30 s",
    transferTags:["shot-creation","driving","footwork"],
    progressionTrack:"Step 3 — Off-The-Dribble Moves",
    desc:"One aggressive step toward the defender to read their reaction: if they back up, pull back and shoot; if they hold, drive past their foot; if they reach, shoot over the retreat.",
    cues:["Jab step is SHARP and aggressive — tentative jabs get ignored","Read the defender's feet: did they move back? Did they reach?","Jab and go: your first dribble is past their front foot","Jab and shoot: pull back into your shot pocket in one motion"],
    trainer:"ShotMechanics", videoId:"eE2Vp10Sqko", videoTitle:"Stephen Curry Jab Step Back Move — ShotMechanics" },

  { id:"fw-rip-through",  name:"Rip Through",             tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:90,
    sets:"3x8 each side", rest:"30 s",
    transferTags:["drawing-fouls","driving","ball-security"],
    progressionTrack:"Step 3 — Off-The-Dribble Moves",
    desc:"Swing the ball in a low arc from one side of the body to the other to rip through an outstretched defender arm — initiates contact and creates driving lanes.",
    cues:["Ball path goes LOW — through the defender's arms, not over them","Rip with both hands — do not let go with the guide hand until through","Lead with the elbow to clear the path","Immediately attack off the rip — do not reset"],
    trainer:"Teach Hoops", videoId:"7dxMH7aP6_Y", videoTitle:"Rip Through & Drive — Great Basketball Moves" },

  { id:"fw-sweep-go",     name:"Sweep & Go",              tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:90,
    sets:"3x8 each direction", rest:"30 s",
    transferTags:["ball-security","driving","transition"],
    progressionTrack:"Step 3 — Off-The-Dribble Moves",
    desc:"Sweep the ball from one side of the body to the other in a protective motion paired with an explosive first step — protects the ball while immediately attacking the defense.",
    cues:["Sweep low and fast — keep the ball protected close to the body","First step is simultaneous with the sweep — not after","Eyes on the rim or defender — not the ball","Use when the defender's hands are active and reaching"],
    trainer:"Basketball HQ", videoId:"gzdweY9uYA8", videoTitle:"1 Minute Basketball Drills: Sweep and Go" },

  { id:"fw-shot-fake",    name:"Shot Fake Series",         tag:"Advanced",        difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3x8 each variation", rest:"30 s",
    transferTags:["shot-creation","drawing-fouls","basketball-IQ"],
    progressionTrack:"Step 4 — Game Skill Integration",
    desc:"Lift the ball as if shooting to get the defender airborne, then attack past them or rise for a real shot over their recovery. Requires patience — do not rush after the fake.",
    cues:["Sell the shot completely — knees bend, ball rises, eyes go to rim","WAIT for the defender to leave their feet — patient players draw fouls","Attack the moment they land — do not hesitate","Shot fake to drive, shot fake to shoot, shot fake to pass — know all three"],
    trainer:"Basketball HQ", videoId:"CGnkzd9wV6g", videoTitle:"How To Use The Shot Fake To Score More Points In Basketball" },
];

const W_FINISHING = [
  { id:"fin-mikan",       name:"Mikan Drill",             tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:9,  estimatedDuration:120,
    sets:"3x20 reps (10 each side)", rest:"30 s",
    transferTags:["layups","timing","basket-finishing"],
    progressionTrack:"Step 1 — Basket Finishing Foundation",
    desc:"Alternate-side baby hooks under the basket — catch on the right, hook left, catch on the left, hook right without letting the ball touch the ground. The greatest finishing drill ever invented.",
    cues:["Ball comes off the glass directly — no floor bounces","High release point — shoot up and over the rim, not at it","Two-foot gather on each catch — then one-foot finish","Rhythm is everything — find the timing before adding speed"],
    trainer:"Pro Skills Basketball", videoId:"3ZVV7aN1F-A", videoTitle:"PSB Drills & Skills — Mikan Drill" },

  { id:"fin-rev-mikan",   name:"Reverse Mikan",           tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3x16 reps (8 each side)", rest:"30 s",
    transferTags:["reverse-layup","backboard-touch","finishing"],
    progressionTrack:"Step 2 — Reverse Side Finishing",
    desc:"Same alternating rhythm as the Mikan drill but finishing on the back-side of the backboard — extends touch range, teaches how to use the glass from unusual angles.",
    cues:["Approach from underneath — step backward through the lane","Release against the near side of the backboard square","Soft touch — high arc, not a power move","Same timing as regular Mikan — just the direction changes"],
    trainer:"Basketball HQ", videoId:"k5mZE2STy0w", videoTitle:"Reverse Mikan Drill Layups — Basketball Practice" },

  { id:"fin-power-layup", name:"Power Layups",            tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3x10 each side", rest:"30 s",
    transferTags:["contact-finishing","strength","rebounding-position"],
    progressionTrack:"Step 1 — Basket Finishing Foundation",
    desc:"Two-foot gather and two-foot jump to finish — the most reliable finish through contact for young players. Used on drives when defenders are in the lane.",
    cues:["Gather on TWO feet — wide base","Jump straight up — do not lean into the defender","Release the ball at the peak — do not rush","Land in the same spot you took off from"],
    trainer:"Baller Bootcamp", videoId:"treZvJON-xM", videoTitle:"How To Shoot A Power Layup In Basketball" },

  { id:"fin-reverse",     name:"Reverse Layups",          tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3x10 each side", rest:"30 s",
    transferTags:["defender-avoidance","finishing","creativity"],
    progressionTrack:"Step 2 — Reverse Side Finishing",
    desc:"Drive past the block line and use the backboard from the other side — takes away the shot blocker's angle completely. Every youth player needs this in their bag.",
    cues:["Drive PAST the block — do not stop under the rim","Reach the ball out to the far side of the backboard","Soft touch on the glass — high arc","Chin stays up — look at where you are aiming, not at the defender"],
    trainer:"Baller Bootcamp", videoId:"zkSHyZGWU-s", videoTitle:"How To Reverse Layup 5 Ways — Beginner to Advanced" },

  { id:"fin-floater",     name:"Floater Series",          tag:"Advanced",        difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3x8 each hand", rest:"45 s",
    transferTags:["anti-block","spacing","shot-creation"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"One or two dribble pull-up with a high-arc shot that floats over the outstretched arms of a shot-blocking big man. The signature scoring move of every great guard.",
    cues:["Release early — before you reach the defender, not after","Arc is EVERYTHING — this is not a regular layup","One-foot take-off gives you more separation than two","Soft wrist: imagine dropping the ball over a fence"],
    trainer:"ShotMechanics", videoId:"FtT0iQsl890", videoTitle:"Floater Secrets — 3 Simple Keys to Scoring the Floater" },

  { id:"fin-euro",        name:"Euro Step",               tag:"Advanced",        difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:120,
    sets:"3x8 each direction", rest:"45 s",
    transferTags:["avoiding-contact","finishing","creativity"],
    progressionTrack:"Step 3 — Advanced Footwork Finishes",
    desc:"Gather the ball on one foot stepping one direction, then take the legal second step in the opposite direction — steps completely around the defender's body.",
    cues:["Gather foot steps BIG in one direction to commit the defender","Second step sweeps HARD in the other direction","Ball is protected throughout — under arm, not extended","Finish soft — this is a touch finish, not power"],
    trainer:"ShotMechanics", videoId:"-7ONK1hiZ2A", videoTitle:"How To Euro Step The Safe Way — ShotMechanics" },

  { id:"fin-pro-hop",     name:"Pro Hop Finish",          tag:"Advanced",        difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3x8 each side", rest:"45 s",
    transferTags:["balance","finishing","space-creation"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"Gather on one foot, then jump off that foot to land on two feet before finishing — creates extra space and balance against closing defenders. The most versatile finish.",
    cues:["The hop creates the space — land wide before you finish","Two-foot landing gives you options: shoot, pass, or reset","Stay balanced on the landing — do not drift toward the defender","Practice the footwork without a ball first"],
    trainer:"ShotMechanics", videoId:"pt4i4fzXcSk", videoTitle:"How to Pro Hop Basketball Moves — ShotMechanics" },

  { id:"fin-wrong-foot",  name:"Wrong Foot Layup",        tag:"Elite",           difficulty:"advanced",     ageRange:[11,14], funScore:9,  estimatedDuration:120,
    sets:"3x8 each side", rest:"45 s",
    transferTags:["deception","shot-creation","basketball-IQ"],
    progressionTrack:"Step 5 — Elite Finishing",
    desc:"Finish off the unexpected foot — right-hand layup from the left foot — completely freezes the shot-blocker whose instincts tell them when to jump based on your footwork.",
    cues:["The whole point is surprise — sell the standard footwork first","Jump off the non-dominant foot on the finish","Ball still goes up with the dominant hand — just the take-off foot changes","Film yourself to confirm you are actually switching feet"],
    trainer:"GetHandles", videoId:"vIfDkyZf52s", videoTitle:"Why You SHOULD Take Wrong Foot Layups — GetHandles" },
];

const W_SHOOTING_DRILLS = [
  { id:"sh-form",         name:"Form Shooting",           tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:300,
    sets:"50 makes from 3–5 feet", rest:"N/A",
    transferTags:["mechanics","muscle-memory","shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"BEEF at close range: Balance, Eyes, Elbow, Follow-through. The only drill where repetition of perfect form creates the neuromuscular pattern that lasts forever. Do not move back until form is automatic.",
    cues:["Ball at the forehead — shooting pocket on the way up","Elbow under the ball — not flaring out to the side","Eyes on the back of the rim — not the whole basket","Hold follow-through until the ball hits the net — every single rep"],
    trainer:"PGC Basketball", videoId:"LkkGPDSJfpk", videoTitle:"Basketball Shooting Drills That Build Better Habits — PGC" },

  { id:"sh-one-hand",     name:"One Hand Form Shooting",  tag:"Foundation",      difficulty:"intermediate", ageRange:[10,14], funScore:5,  estimatedDuration:180,
    sets:"30 makes from 3–5 feet", rest:"N/A",
    transferTags:["mechanics","touch","shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Guide hand removed from the ball — strong hand only shoots and follows through. Immediately exposes any compensation in the mechanics. If it looks different with one hand, the form has a flaw.",
    cues:["Guide hand comes completely off before the shot begins","Strong hand: elbow lines up with the basket","Wrist flicks through completely — full follow-through","If the ball goes anywhere but straight: diagnose the flaw and fix it"],
    trainer:"Pro Skills Basketball", videoId:"drjHBtMgbF4", videoTitle:"One Hand Form Shot — PSB Drills & Skills" },

  { id:"sh-spot",         name:"Spot Shooting",           tag:"Volume",          difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:600,
    sets:"10 makes x 5 spots", rest:"Move between spots",
    transferTags:["game-spots","consistency","range"],
    progressionTrack:"Step 2 — Range Extension",
    desc:"5 marked spots around the arc — left corner, left wing, top of key, right wing, right corner. 10 makes from each before moving. Track total makes per session.",
    cues:["Feet set before the catch — not after","Same shot every time: same pocket, same rhythm, same follow-through","Track your makes — improvement is the measure, not just attempts","Closest spot before you earn the farther spots"],
    trainer:"Basketball Drills", videoId:"1RQPTBFduwc", videoTitle:"7 Spot Basketball Shooting Drill" },

  { id:"sh-atw",          name:"Around The World",        tag:"Game",            difficulty:"beginner",     ageRange:[9,14],  funScore:10, estimatedDuration:300,
    sets:"1–3 full rounds", rest:"Between rounds",
    transferTags:["shooting","pressure","competition"],
    progressionTrack:"Step 2 — Range Extension",
    desc:"7 classic spots in sequence from right corner to left corner. Make it to move on, miss twice and go back to start (or stay on that spot). The timeless youth shooting game that never gets old.",
    cues:["Set your feet before every single shot — no rush","Each spot has the same form — do not adjust based on angle","Call your score out loud — makes it a competition even solo","Try to beat your personal best number of makes per round"],
    trainer:"Teach Hoops", videoId:"KCJHGqWZRLU", videoTitle:"Around the World Basketball Shooting Drill — Teach Hoops" },

  { id:"sh-ft-routine",   name:"Free Throw Routine",      tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:300,
    sets:"Shoot until 10 in a row", rest:"N/A",
    transferTags:["free-throws","routine","pressure-shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Build and repeat a locked pre-shot routine: same number of dribbles, same ball spin, same breath, then shoot. The routine removes the thinking so the mechanics can execute.",
    cues:["Same routine — EXACTLY the same — every single rep","1 or 2 dribbles max: more is a distraction, not a help","Deep breath out before the shot — releases tension","10 in a row is the standard: 9 then a miss means start over"],
    trainer:"PGC Basketball", videoId:"0kj_B1za0U0", videoTitle:"Make More Free Throws — PGC Basketball" },

  { id:"sh-beat-pro",     name:"Beat The Pro",            tag:"Game",            difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:300,
    sets:"5–10 rounds", rest:"Between rounds",
    transferTags:["competition","pressure-shooting","shooting"],
    progressionTrack:"Step 3 — Game-Speed Shooting",
    desc:"You need to score more than an imaginary pro player over a round of shooting. Make = 1 point for you; miss = 1 point for the Pro. First to 7 wins. Develops clutch shooting under self-imposed pressure.",
    cues:["Treat every shot like it matters — because in this game it does","If the Pro is winning, feel that pressure — that is the whole point","Shoot at the same pace you would in a game — no slow-down to aim","Track your win/loss record over weeks — improvement is the trend"],
    trainer:"PGC Basketball", videoId:"LlPdpW6l1SQ", videoTitle:"Beat the Pro — PGC Basketball" },

  { id:"sh-knee-roll",    name:"Knee Roll Ups",              tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:6,  estimatedDuration:120,
    sets:"3x20 makes", rest:"N/A",
    transferTags:["mechanics","wrist","muscle-memory"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Start kneeling on your shooting-side knee with the off-foot planted flat — ball in the shooting pocket, guide hand off. Roll up from the knee to standing, releasing at the top of the rise. Eliminates leg power entirely to isolate wrist and hand mechanics. Created by Miami Heat shooting coach Rob Fodor.",
    cues:["Shooting-side knee down, off-foot flat — keep your back straight","Ball stays in the pocket through the roll — never drop it on the way up","Guide hand completely off from the start — strong hand only","Release at the peak of the rise and hold the follow-through"],
    trainer:"Basketball Immersion", videoId:"cpWL5s5XG0g", videoTitle:"Roll Ups — Beyond Static Form Shooting Drills" },

  { id:"sh-hop-shot",     name:"2 Hop Shots",                tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:120,
    sets:"3x20 reps", rest:"N/A",
    transferTags:["footwork","rhythm","catch-and-shoot"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Toss the ball out to yourself, catch it mid-air and land on both feet simultaneously in a small hop-gather — knees loaded — then rise immediately into your shot. Trains the rhythm and balance of the hop footwork used in catch-and-shoot situations. The hop keeps your body square and loads your legs faster than a 1-2 step.",
    cues:["Hop is SMALL — 2 inches off the ground, not a jump","Both feet land at the exact same time — simultaneous, not one then the other","Knees load on the landing — use that energy straight into the shot","Catch the ball before you land — hands ready in the air"],
    trainer:"Shoot a Basketball Better", videoId:"NIk4KtykIOE", videoTitle:"How to Shoot a Basketball Better — The Hop vs. 1-2 Gather (Beginners)" },

  { id:"sh-single-leg",   name:"Single Leg Hop & Step Back", tag:"Advanced",        difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"3x10 each leg", rest:"30 s",
    transferTags:["balance","off-dribble","step-back"],
    progressionTrack:"Step 3 — Game-Speed Shooting",
    desc:"Step back on one leg as if creating space off the dribble — land balanced on that single foot, hold the balance briefly, then shoot from the one-legged support position. Builds the stability needed for real step-back jumpers. Elite guards shoot off one leg constantly; this drill builds that foundation.",
    cues:["Step back far enough to feel the balance challenge — not a tiny step","Land on the ball of the foot — not the heel — and absorb the landing","Hold the single-leg balance for a full beat before shooting — no rushing","Eyes on the rim the entire time — not watching your feet"],
    trainer:"Alan Stein", videoId:"_lbOIWvqP50", videoTitle:"Basketball Shooting Drill: The Balance Series — Alan Stein" },

  { id:"sh-jab-reset",    name:"Jab Step Reset & Shoot",     tag:"Game",            difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"3x10 each side", rest:"30 s",
    transferTags:["shot-creation","footwork","decision-making"],
    progressionTrack:"Step 3 — Game-Speed Shooting",
    desc:"From triple threat, jab hard toward the defender to read their reaction. If they stand their ground and do not retreat — pull the jab back, reset your feet square to the basket, and shoot. This is the most common shot-creation sequence in half-court basketball and the foundation of every great mid-range scorer.",
    cues:["Jab must be sharp and long — a soft jab is not a threat and will be ignored","Read the feet: if they do not move, shoot; if they back up, go","Reset is ONE motion — back foot comes in, weight loads forward, shot releases","Hold the follow-through — you are shooting over a defender who is standing still"],
    trainer:"Ryan Razooky", videoId:"bmUmNPRfrWo", videoTitle:"Basketball Shooting Drills: Jab Step Series — Ryan Razooky" },
];

const W_POST_MOVES = [
  { id:"pm-seal",        name:"Post Seal & Get Position",      tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:6,  estimatedDuration:150,
    sets:"3×30 s holds", rest:"30 s",
    transferTags:["post-position","sealing","body-control"],
    progressionTrack:"Step 1 — Post Fundamentals",
    desc:"The seal is the foundation of every post move — without deep position, nothing else works. Practice getting and holding the block using your backside, forearm, and wide base to pin the defender behind you. Work both the left and right block.",
    cues:["Wide base — feet outside shoulder width, knees bent deep and loaded","Pin with the hip and forearm — not the hands (that's a foul)","Keep eyes on the ball — call for it with your target hand extended","Stay low throughout the hold — the defender wants to push you baseline or middle"],
    trainer:"Shot Science Basketball", videoId:"t2dJ6EpQIgk", videoTitle:"Sealing in the Post (Like Shaq and Yao Ming) — Shot Science Basketball" },

  { id:"pm-drop-step",   name:"Drop Step",                     tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:150,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["post-footwork","finishing","power-move"],
    progressionTrack:"Step 2 — Post Moves Basics",
    desc:"The most fundamental post move in basketball. Catch on the block, feel where the defender's body is, then swing one foot decisively toward the baseline or middle — that single explosive step clears space and puts you on a straight line to the rim for a power layup or hook shot.",
    cues:["Catch and feel the defender — where are their feet and hips before you move?","Drop step is ONE explosive foot swing — not a shuffle or a bounce","Same-side shoulder drives through on the drop — turn your whole body, not just the foot","Chin up, two hands on the ball as you finish — don't lose it in traffic"],
    trainer:"Howcast", videoId:"kcwCvwCBU-A", videoTitle:"How to Do a Drop-Step | Basketball Moves — Howcast" },

  { id:"pm-hook",        name:"Jump Hook Shot",                 tag:"Foundation",      difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:150,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["finishing","post-shooting","touch"],
    progressionTrack:"Step 2 — Post Moves Basics",
    desc:"The hook shot is the most unguardable finish in basketball. Catch near the block, take one gather step toward the lane, jump off the inside foot, and release high over the defender's reach with a soft wrist flip. Practice from both sides until both hands feel comfortable.",
    cues:["Jump off the foot closest to the basket — drive that knee up for height","Shooting arm extends full — elbow to the ceiling, ball as far from the defender as possible","Soft wrist flip at the peak — this is a touch shot, not a power throw","Inside hip swings away from the defender as you go up — create space with your body"],
    trainer:"Shot Science Basketball", videoId:"Oq2V-7cv0R4", videoTitle:"JUMP HOOK Basketball Shot! Low Post Move Tutorial — Shot Science Basketball" },

  { id:"pm-up-under",    name:"Up and Under",                  tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:150,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["footwork","finishing","shot-fake"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"A two-move sequence that rewards reading your defender. Catch on the block, go up convincingly for your shot fake — when the defender jumps or steps in to contest, swing the ball under their outstretched arms and step through for an easy finish at the rim. Requires a patient, convincing fake.",
    cues:["Fake must be a real shot — weight shifts up on your toes, ball rises to chin or forehead, eyes look at the rim","Wait for the defender to go UP — step through the instant you feel their momentum leave the floor","Step through with the outside foot to swing your body past theirs","Stay low through the step — go straight to the glass or finish with a hook"],
    trainer:"Grizzlies Youth Basketball", videoId:"PIqvdG1HpoA", videoTitle:"Master The Up & Under Post Move — Grizzlies Youth Basketball" },

  { id:"pm-spin",        name:"Post Spin Move",                 tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:150,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["footwork","finishing","post-footwork"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"When the defender is pressing hard into your back, use their pressure against them. Plant the inside foot, reverse pivot explosively to spin away from their body, and attack straight to the basket for a power layup or hook. The spin is a counter move — it only works when the defender is pushing.",
    cues:["Plant foot is your pivot foot — never lift it before the spin is complete","Shoulder leads the spin — get your chest through first, the rest of the body follows","Ball stays tight to your chest during the spin — protect it with both hands, elbows out","Come out of the spin low and in attack mode — don't pop upright before you finish"],
    trainer:"ShotMechanics", videoId:"Ug3uvtnC8KI", videoTitle:"How To Perfect the Spin Move: Basketball Moves Mastery — ShotMechanics" },

  { id:"pm-face-up",     name:"Face-Up from the Post",         tag:"Intermediate",    difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:150,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["footwork","shot-creation","decision-making"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"Catch with your back to the basket, then pivot quickly to face up and read the defender in one smooth motion. If they give space, shoot. If they crowd you, drive baseline or middle. This is the move that separates post players who can only score on their back from post players who can score from anywhere.",
    cues:["Choose your pivot foot before you turn — commit immediately on the catch","Face up quickly — don't let the defender recover position while you're still spinning","Read their stance: sag = catch-and-shoot, crowd = drive to the open side","Land in triple threat when you face up — ball ready to shoot, pass, or drive instantly"],
    trainer:"ShotMechanics", videoId:"LX5Kl0_Agj0", videoTitle:"3 Killer Face Up Post Moves: Basketball Post Moves for Big Men — ShotMechanics" },

  { id:"pm-step-through", name:"Shot Fake & Step Through",     tag:"Game",            difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["shot-fake","finishing","footwork"],
    progressionTrack:"Step 3 — Post Combo Moves",
    desc:"A deliberate, high shot fake from any post position draws the defender into the air — then one long step through their body creates a clear path to the basket. Works from the low block, mid-post, or even facing up on the elbow. Patience is the key: you must wait for the defender to fully commit before you step.",
    cues:["Shot fake is SLOW and HIGH — ball rises all the way up, eyes look at the rim, body rises on toes","Wait — you must actually wait long enough for the defender to react and jump","Step through WIDE and decisive — a small shuffle won't clear their body","Protect the ball with your off-arm as you step through — they will swipe at it"],
    trainer:"Coach Frikki", videoId:"Uf1M17qudj4", videoTitle:"DEADLY Finishing Move (Step Through Tutorial) — Coach Frikki" },

  { id:"pm-saddi-combo",  name:"Post Moves Combo (Saddi Washington)", tag:"Game",     difficulty:"intermediate", ageRange:[10,14], funScore:10, estimatedDuration:180,
    sets:"2 rounds each side", rest:"60 s",
    transferTags:["post-footwork","finishing","post-shooting","decision-making"],
    progressionTrack:"Step 4 — Full Post Game",
    desc:"Full post move sequencing drill from University of Michigan coach Saddi Washington. Catch, seal, and attack in rotation — mixing drop steps, hooks, spins, and up-unders so you're reading and reacting, not just running one pattern. This is game-realistic post play, not just isolated reps.",
    cues:["Every catch starts with a read — feel where the defender is before you move","Vary the move on every rep — don't just do drop steps every time you touch it","Finish every move completely, including when you miss — pursue the rebound","Start at 60% speed and earn your way to full speed over multiple rounds"],
    trainer:"Saddi Washington / My Basketball", videoId:"GOqBvniupY4", videoTitle:"Post Moves with Saddi Washington — Univ. of Michigan" },
];

/* ═══════════════════════════════════════════════════════════════
   FINISHING SCHOOL — Verified layup + finishing curriculum
═══════════════════════════════════════════════════════════════ */
const W_FINISHING_SCHOOL = [
  { id:"fs-power-finish",  name:"Two-Foot Power Finish",      tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["contact-finishing","strength","drawing-fouls"],
    progressionTrack:"Step 1 — Close-Range Foundation",
    desc:"Jump-stop gather on both feet before going up — adds balance, strength, and the ability to draw contact at the rim. The most reliable finish under pressure for youth players.",
    cues:["Jump stop with both feet simultaneously","Use two-foot power to absorb contact","Keep eyes on the target through the finish","Land in the same spot you took off from"],
    trainer:"TeachHoops", videoId:"YzSXr6uNNVQ", videoTitle:"Basketball Drill for Better Layups - Play Off Two Feet" },

  { id:"fs-hop-step",      name:"Hop Step (Pro Hop)",          tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"3×8 each side", rest:"45 s",
    transferTags:["balance","finishing","space-creation"],
    progressionTrack:"Step 3 — Advanced Footwork Finishes",
    desc:"Gather on one foot then hop into a two-foot landing before finishing — creates extra space and balance against closing defenders. The most versatile finish for any position.",
    cues:["The hop creates space — land wide before you finish","Two-foot landing gives options: shoot, pass, or reset","Stay balanced on landing — don't drift toward the defender","Practice the footwork without a ball first"],
    trainer:"TeachHoops", videoId:"p88Tll8I_Tk", videoTitle:"Step-Hop to Layup: Basketball Finishing Drill" },

  { id:"fs-contact-finish",name:"Finish Through Contact",      tag:"Advanced",    difficulty:"advanced",     ageRange:[11,14], funScore:8,  estimatedDuration:120,
    sets:"3×10 reps", rest:"45 s",
    transferTags:["contact-finishing","drawing-fouls","toughness"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"Three moves specifically designed to convert layups when defenders make contact — stay strong through it rather than avoiding it. Learning this directly converts more attempts into made baskets and free-throw opportunities.",
    cues:["Expect contact — stay strong through it, not around it","Use a low, protected dribble into the lane","Extend fully on the finish even when hit","Keep the elbow in — don't lose ball control on contact"],
    trainer:"Breakthrough Basketball", videoId:"ujG00ywWO_A", videoTitle:"3 Moves To Finish THROUGH CONTACT! Make More Lay ups" },

  /* ── Redistributed from Basketball Skills ── */
  { id:"relph-scoop",    name:"Scoop Layups",                    tag:"Advanced",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"10 each side", rest:"20 s",
    transferTags:["finishing","layups","anti-block"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"Tyler Relph scoop layup breakdown — most underused finishing move, especially effective against taller defenders. Release point is out in front, not overhead, so it floats over shot-blockers.",
    cues:["Release point is out in front — not above your head","Soft touch — not power","Reach under and through the contact","Use off the glass or directly for different angles"],
    trainer:"Tyler Relph · Hoop Dynamic", videoId:"J3RYUety18M", videoTitle:"Scoop Layups — Tyler Relph Hoop Dynamic" },

  { id:"sackmann-finish", name:"Footwork and Finishes",          tag:"Advanced",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:180,
    sets:"5 reps each finish each side", rest:"30 s",
    transferTags:["finishing","footwork","creativity"],
    progressionTrack:"Step 4 — Advanced Finishes",
    desc:"DJ Sackmann covering layup footwork and finishing variations. Two-step, Euro step, and one-foot gather — each has a specific situation where it's the right choice.",
    cues:["Footwork first — get the steps right before the finish","Euro step: big step away, gather, finish opposite","Each finish has a situation — learn which to use when"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"U-mvPrKRsWE", videoTitle:"Footwork and Finishes — DJ Sackmann" },

];

/* ═══════════════════════════════════════════════════════════════
   FOOTWORK LAB — Verified footwork and move curriculum
═══════════════════════════════════════════════════════════════ */
const W_FOOTWORK_LAB = [
  { id:"flab-triple-threat",name:"Triple Threat + Jab",        tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:6,  estimatedDuration:90,
    sets:"5×10 reps each option", rest:"20 s",
    transferTags:["shot-creation","driving","triple-threat"],
    progressionTrack:"Step 1 — Movement Foundation",
    desc:"Ball at the hip, knees bent, weight on the balls of the feet — simultaneously threatening to shoot, pass, or drive. The jab step freezes the defender so you can read their reaction and attack.",
    cues:["Stay on the balls of your feet in triple threat","Jab step decisively — a soft jab gets ignored","Keep eyes up and read the defense's reaction","Every catch should land in triple threat automatically"],
    trainer:"Baller Boot Camp", videoId:"pjV78JTtqI0", videoTitle:"Basketball Fundamentals and Tips - How To Triple Threat | Jab Step | Footwork | Offense" },

  { id:"flab-jab-series",  name:"Full Jab Step Series",        tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3×5 each variation each foot", rest:"30 s",
    transferTags:["shot-creation","driving","footwork"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"Three jab options chained from the same setup — jab and shoot, jab and drive, jab and spin. A complete jab series gives perimeter players three distinct attack paths, making them much harder to guard.",
    cues:["Make the jab sharp and low to threaten the defender","Read whether they step back (shoot) or hold (drive)","Chain the full series — jab, drive, spin are all connected","First dribble goes past their front foot on the drive"],
    trainer:"Basketball HQ", videoId:"IZWZIIiqQ-4", videoTitle:"Basketball Footwork - Jab Series" },

  { id:"flab-shot-fake",   name:"Shot Fake + 1-Dribble Pull-Up",tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["drawing-fouls","shot-creation","basketball-IQ"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"Sell the shot fake all the way up — wait for the defender to leave their feet — take exactly one hard dribble and stop into a balanced jump stop for the pull-up. A high-percentage mid-range weapon that exploits over-contesting defenders.",
    cues:["Bring the ball all the way up to sell the fake","Wait for the defender to LEAVE their feet — patience wins","Take exactly one dribble and stop balanced","Hold the follow-through on every make"],
    trainer:"Jr. NBA feat. C.J. McCollum", videoId:"Auzwv0cDHIc", videoTitle:"The Shot Fake 1-Dribble Pull-Up Drill" },

  { id:"flab-step-through", name:"Step-Through Move",           tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:90,
    sets:"3×8 each side", rest:"30 s",
    transferTags:["drawing-fouls","post-footwork","finishing"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"After a convincing shot fake, step through on the side the defender's arm went up — converting the fake into an easy basket. Especially useful when shot-blockers overreact to fakes in the post or mid-range.",
    cues:["Shot fake must be completely convincing — full lift","Step through on the side their arm goes up","Keep low and protect the ball throughout","Finish with a power layup or two-foot stop"],
    trainer:"General Coaching", videoId:"McDPlk1DaRc", videoTitle:"Must Have Basketball Footwork: The Step Through" },

  { id:"flab-duck-in",     name:"Duck-In & Seal",               tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"3×30 s holds each side", rest:"30 s",
    transferTags:["post-position","sealing","body-control"],
    progressionTrack:"Step 3 — Post & Interior Footwork",
    desc:"Time the duck-in when the defender is in help position, then use your backside to seal and create deep post position. Getting deep position is what separates players who score in the post from those who receive the ball too far from the basket.",
    cues:["Time the duck-in when the defender loses sight of you","Use your backside to seal — not your hands (foul)","Call for the ball with a high target hand","Stay low throughout the hold — wide base"],
    trainer:"Pro Tips by DICK'S Sporting Goods", videoId:"dTzfpwqW8Yo", videoTitle:"The Fundamentals of the Duck In and Seal" },

  { id:"flab-rocker-step", name:"Rocker Step",                   tag:"Advanced",    difficulty:"intermediate", ageRange:[11,14], funScore:8,  estimatedDuration:90,
    sets:"3×5 each direction", rest:"30 s",
    transferTags:["shot-creation","driving","footwork"],
    progressionTrack:"Step 4 — Advanced Perimeter Moves",
    desc:"Quick forward-back rocking motion in triple threat gets the defender shifting — then attack in the opposite direction of their lean. The most deceptive triple-threat move without picking up the dribble.",
    cues:["Use a quick forward-back rock to get the defender moving","Stay in triple threat throughout the whole sequence","Attack opposite the direction the defender leans","Inside shoulder drops before the explosion step"],
    trainer:"Pro Training Basketball", videoId:"NbOqnSj6lN8", videoTitle:"Rocker Step - Shiftiest Move Ever (Footwork Mastery)" },

  /* ── Redistributed from Basketball Skills ── */
  { id:"sackmann-footwork", name:"Footwork Foundation",           tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:6,  estimatedDuration:180,
    sets:"3x each pattern", rest:"30 s",
    transferTags:["footwork","handles","attacking"],
    progressionTrack:"Step 2 — Perimeter Footwork",
    desc:"DJ Sackmann breaks down drop-step footwork that gives more attacking options off the dribble — the fundamental patterns behind all perimeter creation.",
    cues:["Drop means the heel drops — not the whole foot","Stay low through the drop","Speed of thought before speed of feet"],
    trainer:"DJ Sackmann · HoopStudy", videoId:"Y3RZTBlAT_E", videoTitle:"Basketball Footwork Focus — DJ Sackmann" },
];

/* ═══════════════════════════════════════════════════════════════
   GAME HANDLES — Verified ball-handling drill curriculum
═══════════════════════════════════════════════════════════════ */
const W_GAME_HANDLES = [
  { id:"gh-stationary-cross",name:"Stationary Crossover",      tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:90,
    sets:"3×30 s", rest:"15 s",
    transferTags:["crossover","change-of-direction","ball-handling"],
    progressionTrack:"Step 1 — Ball Control Foundation",
    desc:"Controlled alternating crossover dribbles at below-knee height — pushes through the ball rather than slapping it. Builds the hand strength and coordination that makes live-dribble crossovers quick and deceptive.",
    cues:["Keep the dribble BELOW the knee","Push through — don't slap — on the crossover","Stay in an athletic stance with knees bent throughout","Eyes up the entire time"],
    trainer:"Jr. NBA", videoId:"fuCNf4nmDpM", videoTitle:"Stationary Crossover Drill" },

  { id:"gh-change-pace",   name:"Change-of-Pace Dribble",      tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:90,
    sets:"5×full court or 5 reps", rest:"20 s",
    transferTags:["deception","first-step","attacking"],
    progressionTrack:"Step 2 — Attacking Moves",
    desc:"Drive hard, then slow to near-stop to freeze the defender, then explode out of the pause. Defenders can't react to bursts they didn't see coming — changing pace is the most deceptive weapon a ball-handler has.",
    cues:["Drive hard first — the slowdown is only valuable after you've shown speed","Stay LOW during the hesitation — don't rise up","Explode out of the pause — don't just jog","Eyes on the rim to sell the threat"],
    trainer:"Howcast", videoId:"0Wwv5nDpL6k", videoTitle:"How to Do a Change-of-Pace Dribble | Basketball Moves" },

  { id:"gh-cross-btl",     name:"Crossover + Between-the-Legs",tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:90,
    sets:"3×45 s", rest:"20 s",
    transferTags:["crossover","between-the-legs","combo-moves"],
    progressionTrack:"Step 2 — Attacking Moves",
    desc:"Learn both fundamental change-of-direction moves in one drill. Mastering these in combination builds the two foundational skills that underpin all advanced ball-handling sequences.",
    cues:["Learn each move in isolation before combining","Stagger the feet properly for between-the-legs","Keep the ball at an angle — don't reach back for it","Clean slow beats sloppy fast"],
    trainer:"Hawks Basketball Academy", videoId:"h7s31K0kPh4", videoTitle:"Stationary Crossover & Between the Legs (Beginner Dribble Moves)" },

  { id:"gh-behind-back",   name:"Behind-the-Back Dribble",     tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:90,
    sets:"3×60 s", rest:"20 s",
    transferTags:["behind-the-back","deception","change-of-direction"],
    progressionTrack:"Step 3 — Advanced Moves",
    desc:"Step the lead foot forward as you wrap the ball behind your back — receive on the other side with fingers pointing down. A deceptive direction change that keeps defenders off-balance, particularly when changing speed during a drive.",
    cues:["Step the lead foot forward as you wrap","Receive with fingers pointing DOWN on the other side","Practice slowly before adding speed","Don't rush the receive — control beats speed early on"],
    trainer:"Jr. NBA", videoId:"cGQ7dXW0jCA", videoTitle:"Behind The Back Wrap Breakdown Drill" },

  { id:"gh-dribble-drive", name:"Dribble-Drive Attack",         tag:"Advanced",    difficulty:"intermediate", ageRange:[11,14], funScore:9,  estimatedDuration:90,
    sets:"5 reps each side", rest:"30 s",
    transferTags:["attacking","first-step","scoring"],
    progressionTrack:"Step 4 — Game-Speed Attacking",
    desc:"Attack the defender's front foot to force them to give ground — stay low and use your body to protect the ball, make your decision at the rim before you get there. The most direct route to the basket.",
    cues:["Attack the defender's front foot — force them to give ground","Stay low and protect the ball with your body","Make your rim decision BEFORE you arrive — not at the last second","Explode out of your dribble move — don't coast"],
    trainer:"General Coaching", videoId:"w7Vkpj88edI", videoTitle:"Dribble Drive Attack Basketball Drill" },

  /* ── Redistributed from Basketball Skills ── */
  { id:"gethandles-combo", name:"Combo Crossover — Beat Defenders", tag:"Advanced",    difficulty:"advanced",     ageRange:[11,14], funScore:7,  estimatedDuration:180,
    sets:"5 reps each combo each side", rest:"30 s",
    transferTags:["attacking","change-of-direction","game-moves"],
    progressionTrack:"Step 4 — Game-Speed Attacking",
    desc:"Jesse Muench breaks down between-legs into behind-back combo — go-to sequence for breaking down an aggressive defender. Two-move chain that works because each move sets up the next.",
    cues:["Set up the combo with a hard drive the opposite direction first","Between legs is the fake — behind back is the attack","Do not telegraph — same speed on setup as the move"],
    trainer:"Get Handles · Jesse Muench", videoId:"i1bQI_esIIw", videoTitle:"Combo Crossover Beat Defenders — Get Handles" },

];

/* ═══════════════════════════════════════════════════════════════
   SHOOTING LAB — Verified shooting drill curriculum
═══════════════════════════════════════════════════════════════ */
const W_SHOOTING_LAB = [
  { id:"slab-ft-routine",  name:"Free Throw Routine",           tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:5,  estimatedDuration:300,
    sets:"Shoot until 10 in a row", rest:"N/A",
    transferTags:["free-throws","routine","pressure-shooting"],
    progressionTrack:"Step 1 — Shooting Foundation",
    desc:"Build and lock in a consistent pre-shot routine — same number of dribbles, same spin, same breath — then shoot. The routine removes thinking so mechanics can execute. Games are regularly decided at the charity stripe.",
    cues:["Same routine EXACTLY the same every single rep","1–2 dribbles max — more is a distraction","Deep breath out before the shot to release tension","Align your shooting foot with the nail in the floor"],
    trainer:"TeachHoops", videoId:"upNWZsCtGE8", videoTitle:"Basketball Free Throw Drill" },

  { id:"slab-catch-shoot", name:"Catch-and-Shoot",              tag:"Foundation",  difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:180,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["catch-and-shoot","spacing","team-shooting"],
    progressionTrack:"Step 2 — Catch & Shoot",
    desc:"Get your feet set BEFORE the catch — don't adjust after receiving. Square your shoulders as you catch and release immediately without extra dribbles. One of the most valuable skills in modern basketball.",
    cues:["Feet set before the catch — not after","Square shoulders to the basket as you receive","Shoot immediately — no extra dribbles","Come off a screen or jog to a spot to simulate game conditions"],
    trainer:"Jr. NBA", videoId:"O5b5HaxCE3U", videoTitle:"Catch, Turn, & Shoot Drill" },

  { id:"slab-curl-cut",    name:"Shot Off a Screen (Curl Cut)",  tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3×10 each option", rest:"30 s",
    transferTags:["coming-off-screens","team-offense","catch-and-shoot"],
    progressionTrack:"Step 2 — Catch & Shoot",
    desc:"Read the defender's position to decide whether to curl, pop, or flare off the screen. Keep the ball at chin level as you come off. Coming off screens is how players get open in half-court sets.",
    cues:["Read whether to curl, pop, or flare based on defender's position","Keep ball at chin level as you come off the screen","Catch ready to shoot — hands up before the ball arrives","Feet square to the basket before the catch lands"],
    trainer:"Jr. NBA", videoId:"kWEiiUfGqYM", videoTitle:"Fundamentals Of The Curl Cut" },

  { id:"slab-pullup",      name:"1-Dribble Pull-Up",             tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"3×10 each side", rest:"30 s",
    transferTags:["off-the-dribble","mid-range","pull-up"],
    progressionTrack:"Step 3 — Off-the-Dribble",
    desc:"One hard dribble, then jump stop with feet aligned — square up in the air and don't drift sideways. One of the highest-value mid-range shots in the game because it's efficient, hard to contest, and usable at every position.",
    cues:["One HARD dribble — not a soft push","Jump stop with feet aligned to the basket","Square up in the air — don't drift sideways","Land in the same spot you jumped from"],
    trainer:"TeachHoops", videoId:"i3Cq0s2pnWY", videoTitle:"One Dribble Pull-Up Drill - Basketball Shooting" },

  { id:"slab-elbow",       name:"Elbow Mid-Range",               tag:"Intermediate",difficulty:"intermediate", ageRange:[10,14], funScore:8,  estimatedDuration:120,
    sets:"10 makes each elbow", rest:"30 s",
    transferTags:["mid-range","elbow","half-court"],
    progressionTrack:"Step 3 — Off-the-Dribble",
    desc:"Arrive at the elbow on the move and catch ready to shoot — elbow in, not flared, and shoot with arc aimed at the back of the rim. The most reliable pull-up shot in the half-court — mastering it from both elbows gives you a high-percentage option whenever defenses sag off.",
    cues:["Arrive at the elbow moving — not stationary","Elbow in, not flared — keeps the shot straight","Shoot with arc — aim for the back of the rim at this distance","10 makes each elbow before moving"],
    trainer:"Basketball Shooting Drills", videoId:"ajOtGtnuYks", videoTitle:"Basketball Shooting Drill: Elbow Jump Shots | Improve Your Mid Range Game (Pt 2)" },

  { id:"slab-corner-3",    name:"Corner Three Mechanics",        tag:"Intermediate",difficulty:"intermediate", ageRange:[11,14], funScore:8,  estimatedDuration:120,
    sets:"10 makes each corner", rest:"30 s",
    transferTags:["three-point","corner","team-shooting"],
    progressionTrack:"Step 4 — Range Extension",
    desc:"Square your feet to the basket from the corner angle and catch with your feet already set. The corner three is the highest-value shot in modern basketball by points-per-shot math — mastering it pays dividends at every level of play.",
    cues:["Square your feet to the BASKET — not the sideline","Catch with feet already set toward your target","Keep elbow in and use full wrist snap","Set your feet before the catch — same as all catch-and-shoot situations"],
    trainer:"LethalShooter", videoId:"BjOGkKeZVi4", videoTitle:"The Art of Shooting Lesson #3 (Corner 3)" },

  { id:"slab-step-back",   name:"Step-Back Jumper Basics",       tag:"Advanced",    difficulty:"advanced",     ageRange:[12,14], funScore:9,  estimatedDuration:120,
    sets:"3×8 each side", rest:"45 s",
    transferTags:["step-back","shot-creation","separation"],
    progressionTrack:"Step 5 — Step-Back & Separation",
    desc:"Attack hard first so the step-back is believable — push back on the same foot as the dribble hand and land balanced with knees bent, not falling backward. Creates built-in separation from the defender and is one of the most common ways elite guards create their own shot.",
    cues:["Attack hard FIRST — the step-back is only effective after you've shown drive","Push back on the same foot as your dribble hand","Land balanced with knees bent — not falling backward","Eyes on the rim through the entire sequence"],
    trainer:"The Skill Academy", videoId:"hVSdd79maCw", videoTitle:"Basketball 101: How To Teach The Step Back Jumper" },
];

/* ═══════════════════════════════════════════════════════════════
   BASKETBALL IQ — Decision-making, reads, spacing, and awareness.
   Teaches the mental layer of the game solo players can study
   and immediately apply in practice and games.
═══════════════════════════════════════════════════════════════ */
const W_BASKETBALL_IQ = [
  { id:"iq-closeout",    name:"Attack the Closeout",              tag:"Reads",       difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:120,
    sets:"5 reps each read (shoot / drive / reset)", rest:"30 s",
    transferTags:["decision-making","shot-creation","basketball-IQ"],
    progressionTrack:"Step 1 — Read & React",
    desc:"When a defender sprints to close you out, you have three options based on their momentum: shoot if they're airborne, drive the side they're vacating, or reset if they recover. This is the most common scoring opportunity in basketball — learning to read it in real time separates players who score from players who pass back.",
    cues:["Read the momentum: which direction is the defender moving?","Feet leave the floor = shoot immediately — do not hesitate","Defender sprinting past you = drive the opposite direction","Defender recovers well = pull back to triple threat and read again"],
    trainer:"Basketball Education", videoId:"FqF7sq6fe8k", videoTitle:"Basketball Education: Attack Closeout" },

  { id:"iq-shot-drive",  name:"Shot or Drive Read",               tag:"Reads",       difficulty:"beginner",     ageRange:[9,14],  funScore:8,  estimatedDuration:120,
    sets:"3×8 reads — shoot reps AND drive reps", rest:"30 s",
    transferTags:["decision-making","shooting","attacking","basketball-IQ"],
    progressionTrack:"Step 1 — Read & React",
    desc:"From triple threat, read the defender's distance before making any move. Arm's length or more of space = shoot. Defender crowding tight = drive their front foot. This single read should happen every time you catch the ball — before any dribble. Players who skip this read waste possessions.",
    cues:["Arms-length gap or more = immediate shot — don't hesitate","Defender within arm's length = attack their front foot","Eyes on the defender's feet — weight tells you where to attack","Make ONE decision and commit — do not change your mind mid-rep"],
    trainer:"Championship Productions", videoId:"Dupz4awdQGI", videoTitle:"Improve Your Offense by Learning to Read the Defender!" },

  { id:"iq-read-def",    name:"Reading Defensive Positioning",    tag:"Reads",       difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"Concept study — 3 read situations × 5 reps", rest:"30 s",
    transferTags:["decision-making","basketball-IQ","spacing","passing"],
    progressionTrack:"Step 2 — Off-Ball Intelligence",
    desc:"Elite defenders use gap positioning — they sit between you and the ball to deny passes AND help on drives. Understanding WHERE defenders set up tells you where the open player is, when a drive will succeed, and when to cut. Every smart offensive decision comes from reading the defense first.",
    cues:["Identify: is your defender in deny or gap coverage?","Gap defender = you are open for a backdoor cut — go immediately","Ball-side defender sagging = catch and shoot before they close","Head on a swivel on every possession — never watch just one spot"],
    trainer:"Basketball IQ", videoId:"jnJHFtUgO58", videoTitle:"Basketball Training: Close Out to Attack Drill" },

  { id:"iq-spacing",     name:"Floor Spacing Basics",             tag:"Concepts",    difficulty:"beginner",     ageRange:[9,14],  funScore:7,  estimatedDuration:120,
    sets:"Concept study + court walkthrough", rest:"N/A",
    transferTags:["spacing","basketball-IQ","team-offense","off-ball"],
    progressionTrack:"Step 2 — Off-Ball Intelligence",
    desc:"Where you stand when you do NOT have the ball is as important as what you do with it. Spread to corners and wings — never bunch around the ball. When your teammate drives, stay wide or cut to the basket. Good spacing makes drives easier, passes cleaner, and defenses miserable.",
    cues:["Ball-handler's rule: give them room — spread to a corner or wing","Never stand next to the player with the ball — you eliminate their driving lane","When the driver penetrates, spot up for a catch-and-shoot or cut baseline","One simple standard: every player should be 12–15 feet from every other player"],
    trainer:"JP Productions", videoId:"ySbLZmFWnSw", videoTitle:"Basketball Spacing Made For Beginners! *Learn How To Space The Floor*" },

  { id:"iq-help-side",   name:"Help Side Defense Principles",     tag:"Concepts",    difficulty:"intermediate", ageRange:[10,14], funScore:7,  estimatedDuration:120,
    sets:"Concept study + solo shadow reps", rest:"N/A",
    transferTags:["defense","basketball-IQ","help-defense","team-defense"],
    progressionTrack:"Step 3 — Defensive IQ",
    desc:"The most important defensive skill nobody teaches: where to be when the ball is NOT near you. Learn the ball-you-man triangle — always see both the ball and your player. Know when to step into the lane to stop a drive and when to recover to your assignment.",
    cues:["See the ball AND your player at all times — head on a swivel","One pass away: deny your player from catching","Two passes away: move to the help line so you can see both ball and your player","Call 'Help!' when stepping up to stop the drive — then sprint back"],
    trainer:"Basketball HQ", videoId:"QQ7qPKeynhY", videoTitle:"How To Play Gap Help Defense In Basketball" },

  { id:"iq-transition",  name:"Transition Decision-Making",       tag:"Concepts",    difficulty:"intermediate", ageRange:[10,14], funScore:9,  estimatedDuration:120,
    sets:"Concept study + visualization", rest:"N/A",
    transferTags:["transition","basketball-IQ","decision-making","team-offense"],
    progressionTrack:"Step 3 — Defensive IQ",
    desc:"The best scoring chances in basketball happen in transition — but only for players making fast, smart decisions. Learn: when to push vs. when to set up, how to fill the correct lane, and how to read numbers advantages to get the right shot every time.",
    cues:["After a stop: outlet to the guard immediately, then sprint to fill a wing lane","Run WIDE — stay outside the three-point line to stretch the defense","2-on-1: attack hard to make the defender commit, then decide: score or pass","3-on-2: middle ball-handler draws both defenders, wings get open layups"],
    trainer:"Smart Offense Basketball", videoId:"1LxBSNKO26o", videoTitle:"Using The Whole Floor In Transition | Smart Offense for Basketball Coaches" },
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
  shooting:     W_SHOOTING,
  ballhandling: W_BALL_HANDLING,
  footwork:     W_FOOTWORK,
  finishing:    W_FINISHING,
  shootingdrills: W_SHOOTING_DRILLS,
  postmoves:      W_POST_MOVES,
  finishing_school: W_FINISHING_SCHOOL,
  footwork_lab:     W_FOOTWORK_LAB,
  game_handles:     W_GAME_HANDLES,
  shooting_lab:     W_SHOOTING_LAB,
  basketball_iq:    W_BASKETBALL_IQ,
};

const CATS = {
  speed:          { label:"Speed & Agility",         emoji:"⚡" },
  balance:        { label:"Balance & Foundation",    emoji:"🎯" },
  strength:       { label:"Strength Program",        emoji:"💪" },
  explosion:      { label:"Explosion & Jumps",       emoji:"💥" },
  conditioning:   { label:"Conditioning",            emoji:"🔥" },
  coordination:   { label:"Coordination",            emoji:"🎶" },
  deceleration:   { label:"Deceleration & Landing",  emoji:"🛑" },
  athletic:       { label:"Athletic Movement",       emoji:"🏃" },
  handles:        { label:"Ball Handling Foundations", emoji:"🤲" },
  shooting:       { label:"Shooting Challenges",      emoji:"🎯" },
  ballhandling:   { label:"Ball Handling Moves",     emoji:"🏀" },
  footwork:       { label:"Footwork",                emoji:"👟" },
  finishing:      { label:"Finishing",               emoji:"🏁" },
  shootingdrills: { label:"Shooting Drills",         emoji:"🎯" },
  postmoves:      { label:"Post Moves",              emoji:"🏋️" },
  finishing_school: { label:"Finishing School",      emoji:"🎯" },
  footwork_lab:     { label:"Footwork Lab",          emoji:"👟" },
  game_handles:     { label:"Game Handles",          emoji:"🤲" },
  shooting_lab:     { label:"Shooting Lab",          emoji:"🏀" },
  basketball_iq:    { label:"Basketball IQ",         emoji:"🧠" },
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
  "weak-hand":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists"],                  basketballTransfer:["ball-handling"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:600, funScore:5, workoutRole:["main"] },
  "two-ball":            { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball_x2",spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "sackmann-hesi":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"cones",        spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  "relph-twoball":       { difficulty:"advanced",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["ball-handling"],           equipment:"basketball_x2",spaceRequired:"small",      ageRange:[11,14], estimatedDuration:120, funScore:6, workoutRole:["main"] },
  /* ─── BASKETBALL SKILLS (redistributed) ─── */
  "sackmann-footwork":   { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips"],                     basketballTransfer:["footwork","handles"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:180, funScore:6, workoutRole:["main"] },
  "relph-scoop":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["finishing","layups"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"] },
  "sackmann-finish":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hands","coordination"],     basketballTransfer:["finishing","footwork"],     equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  "gethandles-combo":    { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["ball-handling","cutting"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  /* ─── SHOOTING ─── */
  "sackmann-range":      { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:600, funScore:6, workoutRole:["main"] },
  "relph-5spot":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting"],                equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "relph-42pt":          { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet","hips"],    basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:900, funScore:7, workoutRole:["main"] },
  "sackmann-hesi-shot":  { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["shooting","handles"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:180, funScore:7, workoutRole:["main"] },
  /* ─── BALL HANDLING MOVES ─── */
  "bh-pound":            { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","fingers"],        basketballTransfer:["ball-control","off-hand","touch"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:5,  workoutRole:["warmup","main"], progressionTrack:"Step 1 — Ball Handling Foundation" },
  "bh-crossover":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","coordination"],   basketballTransfer:["attacking","change-of-direction","handles"],  equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:8,  workoutRole:["warmup","main"], progressionTrack:"Step 2 — Basic Move Package" },
  "bh-btl":              { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","hips"],           basketballTransfer:["ball-protection","handles","creativity"],     equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Advanced Stationary Moves" },
  "bh-in-out":           { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","shoulders"],      basketballTransfer:["change-of-pace","deception","handles"],       equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:90,  funScore:7,  workoutRole:["warmup","main"], progressionTrack:"Step 2 — Basic Move Package" },
  "bh-retreat":          { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["pressure-handling","decision-making","spacing"],equipment:"basketball",  spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Advanced Stationary Moves" },
  "bh-attack-cross":     { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["attacking","change-of-direction","scoring"],   equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:10, workoutRole:["main"],          progressionTrack:"Step 4 — Combo Moves" },
  "bh-combo":            { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","coordination"],     basketballTransfer:["game-moves","creativity","handles"],           equipment:"basketball",   spaceRequired:"medium",     ageRange:[11,14], estimatedDuration:120, funScore:10, workoutRole:["main"],          progressionTrack:"Step 5 — Game-Speed Combos" },
  /* ─── FOOTWORK ─── */
  "fw-jump-stop":        { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","ankles","core"],            basketballTransfer:["pivoting","post-moves","legal-play"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:5,  workoutRole:["warmup","main"], progressionTrack:"Step 1 — Movement Foundation" },
  "fw-front-pivot":      { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["feet","hips","legs"],              basketballTransfer:["post-moves","creation","footwork"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5,  workoutRole:["warmup","main"], progressionTrack:"Step 2 — Pivot Mastery" },
  "fw-rev-pivot":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["feet","hips","legs"],              basketballTransfer:["post-moves","pressure-escape","footwork"],    equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:60,  funScore:6,  workoutRole:["main"],          progressionTrack:"Step 2 — Pivot Mastery" },
  "fw-triple-threat":    { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","hips","core"],              basketballTransfer:["shot-creation","ball-fake","decision-making"], equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:60,  funScore:5,  workoutRole:["warmup"],        progressionTrack:"Step 1 — Movement Foundation" },
  "fw-jab-series":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips","legs"],              basketballTransfer:["shot-creation","driving","footwork"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8,  workoutRole:["main"],          progressionTrack:"Step 3 — Off-The-Dribble Moves" },
  "fw-rip-through":      { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","shoulders","hips"],        basketballTransfer:["drawing-fouls","driving","ball-security"],    equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Off-The-Dribble Moves" },
  "fw-sweep-go":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","feet","hips"],             basketballTransfer:["ball-security","driving","transition"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Off-The-Dribble Moves" },
  "fw-shot-fake":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","legs","core"],             basketballTransfer:["shot-creation","drawing-fouls","basketball-IQ"],equipment:"basketball", spaceRequired:"small",      ageRange:[10,14], estimatedDuration:90,  funScore:9,  workoutRole:["main"],          progressionTrack:"Step 4 — Game Skill Integration" },
  /* ─── FINISHING ─── */
  "fin-mikan":           { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["layups","timing","basket-finishing"],         equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 1 — Basket Finishing Foundation" },
  "fin-rev-mikan":       { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["reverse-layup","backboard-touch","finishing"], equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:120, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Reverse Side Finishing" },
  "fin-power-layup":     { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","hands","core"],             basketballTransfer:["contact-finishing","strength","rebounding"],  equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:90,  funScore:7,  workoutRole:["main"],          progressionTrack:"Step 1 — Basket Finishing Foundation" },
  "fin-reverse":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["defender-avoidance","finishing","creativity"], equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:90,  funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Reverse Side Finishing" },
  "fin-floater":         { difficulty:"advanced",     impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["anti-block","spacing","shot-creation"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 4 — Advanced Finishes" },
  "fin-euro":            { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","hips","coordination"],      basketballTransfer:["avoiding-contact","finishing","creativity"],   equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:120, funScore:10, workoutRole:["main"],          progressionTrack:"Step 3 — Advanced Footwork Finishes" },
  "fin-pro-hop":         { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","coordination"],      basketballTransfer:["balance","finishing","space-creation"],       equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 4 — Advanced Finishes" },
  "fin-wrong-foot":      { difficulty:"advanced",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["feet","legs","coordination"],      basketballTransfer:["deception","shot-creation","basketball-IQ"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[11,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 5 — Elite Finishing" },
  /* ─── SHOOTING DRILLS ─── */
  "sh-form":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","shoulders"],      basketballTransfer:["mechanics","muscle-memory","shooting"],       equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:300, funScore:5,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-one-hand":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hand","wrist","shoulder"],         basketballTransfer:["mechanics","touch","shooting"],               equipment:"basketball",   spaceRequired:"small",      ageRange:[10,14], estimatedDuration:180, funScore:5,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-spot":             { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet","legs"],    basketballTransfer:["game-spots","consistency","range"],           equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:600, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Range Extension" },
  "sh-atw":              { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","feet"],           basketballTransfer:["shooting","pressure","competition"],          equipment:"basketball",   spaceRequired:"large",      ageRange:[9,14],  estimatedDuration:300, funScore:10, workoutRole:["main"],          progressionTrack:"Step 2 — Range Extension" },
  "sh-ft-routine":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","legs"],           basketballTransfer:["free-throws","routine","pressure-shooting"],  equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:300, funScore:5,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-beat-pro":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["hands","wrists","feet","mind"],    basketballTransfer:["competition","pressure-shooting","shooting"],  equipment:"basketball",   spaceRequired:"large",      ageRange:[10,14], estimatedDuration:300, funScore:10, workoutRole:["main","finisher"],progressionTrack:"Step 3 — Game-Speed Shooting" },
  "sh-knee-roll":        { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hands","wrists","fingers"],        basketballTransfer:["mechanics","wrist","muscle-memory"],           equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:120, funScore:6,  workoutRole:["warmup","main"],  progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-hop-shot":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["legs","feet","hands"],             basketballTransfer:["footwork","rhythm","catch-and-shoot"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 1 — Shooting Foundation" },
  "sh-single-leg":       { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","core","feet"],              basketballTransfer:["balance","off-dribble","step-back"],           equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Game-Speed Shooting" },
  "sh-jab-reset":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hands","mind"],      basketballTransfer:["shot-creation","footwork","decision-making"],  equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Game-Speed Shooting" },

  "pm-seal":             { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["hips","legs","core","back"],       basketballTransfer:["post-position","sealing","body-control"],      equipment:"basketball",   spaceRequired:"small",      ageRange:[9,14],  estimatedDuration:150, funScore:6,  workoutRole:["warmup","main"],  progressionTrack:"Step 1 — Post Fundamentals" },
  "pm-drop-step":        { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","hips","core"],              basketballTransfer:["post-footwork","finishing","power-move"],       equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:150, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Post Moves Basics" },
  "pm-hook":             { difficulty:"beginner",     impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","arms","wrists","hands"],    basketballTransfer:["finishing","post-shooting","touch"],            equipment:"basketball",   spaceRequired:"medium",     ageRange:[9,14],  estimatedDuration:150, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 2 — Post Moves Basics" },
  "pm-up-under":         { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","core","arms"],       basketballTransfer:["footwork","finishing","shot-fake"],             equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:150, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-spin":             { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","hips","core","shoulders"],  basketballTransfer:["footwork","finishing","post-footwork"],         equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:150, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-face-up":          { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hips","mind"],       basketballTransfer:["footwork","shot-creation","decision-making"],   equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:150, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-step-through":     { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"medium", movementType:"skill",        bodyFocus:["legs","feet","hands","mind"],      basketballTransfer:["shot-fake","finishing","footwork"],             equipment:"basketball",   spaceRequired:"medium",     ageRange:[10,14], estimatedDuration:120, funScore:9,  workoutRole:["main"],          progressionTrack:"Step 3 — Post Combo Moves" },
  "pm-saddi-combo":      { difficulty:"intermediate", impactLevel:"medium", intensityLevel:"high",   movementType:"skill",        bodyFocus:["legs","feet","core","arms","mind"],basketballTransfer:["post-footwork","finishing","post-shooting","decision-making"], equipment:"basketball", spaceRequired:"medium", ageRange:[10,14], estimatedDuration:180, funScore:10, workoutRole:["main","finisher"],progressionTrack:"Step 4 — Full Post Game" },
  /* ─── BASKETBALL IQ ─── */
  "iq-closeout":         { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","hands"],             basketballTransfer:["decision-making","shot-creation","basketball-IQ"], equipment:"basketball", spaceRequired:"medium", ageRange:[9,14],  estimatedDuration:120, funScore:8,  workoutRole:["main"],          progressionTrack:"Step 1 — Read & React" },
  "iq-shot-drive":       { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","hands"],             basketballTransfer:["decision-making","shooting","attacking","basketball-IQ"], equipment:"basketball", spaceRequired:"medium", ageRange:[9,14], estimatedDuration:120, funScore:8, workoutRole:["main"],           progressionTrack:"Step 1 — Read & React" },
  "iq-read-def":         { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","eyes","coordination"],      basketballTransfer:["decision-making","basketball-IQ","spacing","passing"], equipment:"basketball", spaceRequired:"medium", ageRange:[10,14], estimatedDuration:120, funScore:7, workoutRole:["main"],           progressionTrack:"Step 2 — Off-Ball Intelligence" },
  "iq-spacing":          { difficulty:"beginner",     impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","coordination"],      basketballTransfer:["spacing","basketball-IQ","team-offense","off-ball"], equipment:"basketball",  spaceRequired:"large",  ageRange:[9,14],  estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 2 — Off-Ball Intelligence" },
  "iq-help-side":        { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","coordination"],      basketballTransfer:["defense","basketball-IQ","help-defense","team-defense"], equipment:"none",      spaceRequired:"large",  ageRange:[10,14], estimatedDuration:120, funScore:7,  workoutRole:["main"],          progressionTrack:"Step 3 — Defensive IQ" },
  "iq-transition":       { difficulty:"intermediate", impactLevel:"low",    intensityLevel:"low",    movementType:"skill",        bodyFocus:["mind","feet","coordination"],      basketballTransfer:["transition","basketball-IQ","decision-making","team-offense"], equipment:"basketball", spaceRequired:"large", ageRange:[10,14], estimatedDuration:120, funScore:9, workoutRole:["main"],           progressionTrack:"Step 3 — Defensive IQ" },
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
   POSITION PROFILES
   Guard / Wing / Post — each defines score boosts + spotlight IDs
═══════════════════════════════════════════════════════════════ */
const POSITION_PROFILES = {
  guard: {
    label:"Guard", emoji:"🏃",
    desc:"Handle pressure, attack off the dribble, and hit shots off movement.",
    boostCats:["ballhandling","shootingdrills","footwork","speed"],
    boostTags:["ball-handling","attacking","change-of-direction","shot-creation","handles",
               "quickness","footwork","change-of-pace","pressure-handling","off-dribble"],
    spotlight:["bh-attack-cross","sh-jab-reset","fw-jab-series","sh-beat-pro","bh-combo"],
  },
  wing: {
    label:"Wing", emoji:"🏀",
    desc:"Score in transition, finish at the rim, and knock down catch-and-shoot looks.",
    boostCats:["finishing","footwork","shootingdrills","explosion"],
    boostTags:["finishing","cutting","layups","shot-creation","explosion","jumping",
               "catch-and-shoot","euro","avoiding-contact","balance","anti-block"],
    spotlight:["fin-euro","fin-floater","fw-rip-through","sh-spot","fin-pro-hop"],
  },
  post: {
    label:"Post", emoji:"💪",
    desc:"Get deep position, use your body, and finish over defenders at the rim.",
    boostCats:["postmoves","finishing","footwork","strength"],
    boostTags:["post-footwork","post-position","finishing","power-move","sealing","strength",
               "rebounding","contact-finishing","post-shooting","touch","shot-fake"],
    spotlight:["pm-drop-step","pm-hook","pm-up-under","fin-power-layup","pm-spin"],
  },
  any: {
    label:"All-Around", emoji:"⭐",
    desc:"Balanced training across all skills.",
    boostCats:[],
    boostTags:[],
    spotlight:[],
  },
};

/* ═══════════════════════════════════════════════════════════════
   WORKOUT TEMPLATES + GENERATOR
═══════════════════════════════════════════════════════════════ */
const WORKOUT_TEMPLATES = {
  jump:      { name:"Jump Workout",      emoji:"💥", desc:"Explosive power and landing control.",     cats:["explosion","deceleration","balance"],      structure:{warmup:1,main:3,finisher:1,recovery:0}, ageMin:10 },
  quickFeet: { name:"Quick Feet",        emoji:"⚡", desc:"Foot speed, agility, and reaction time.",  cats:["speed","coordination","athletic"],          structure:{warmup:2,main:3,finisher:1,recovery:0}, ageMin:9  },
  fullBody:  { name:"Full Body Athlete", emoji:"🏃", desc:"Strength, speed, and conditioning.",       cats:["strength","conditioning","athletic"],       structure:{warmup:1,main:3,finisher:1,recovery:1}, ageMin:9  },
  recovery:  { name:"Recovery Day",      emoji:"🔄", desc:"Light movement, balance, and mobility.",   cats:["balance","coordination"],                   structure:{warmup:2,main:2,finisher:0,recovery:2}, ageMin:9  },
  handles:   { name:"Ball Handling",     emoji:"🤲", desc:"Dribbling, footwork, and court IQ.",       cats:["handles","game_handles","coordination"],    structure:{warmup:1,main:4,finisher:1,recovery:0}, ageMin:9  },
  shooting:  { name:"Shooting Session",  emoji:"🎯", desc:"Form, range, and shooting consistency.",   cats:["shooting","shooting_lab"],                  structure:{warmup:1,main:3,finisher:1,recovery:0}, ageMin:9  },
};

const SCHED_TO_TEMPLATE = { explosion:"jump",deceleration:"jump",speed:"quickFeet",coordination:"quickFeet",athletic:"quickFeet",strength:"fullBody",conditioning:"fullBody",balance:"recovery",handles:"handles",game_handles:"handles",basketball_iq:"handles",shooting:"shooting",shooting_lab:"shooting" };

function generateWorkout(settings, templateKey, recentIds=[]) {
  const tmpl = WORKOUT_TEMPLATES[templateKey];
  if (!tmpl) return null;
  const age    = Math.min(14, Math.max(9, calcAge(settings.dateOfBirth)));
  const rule   = AGE_RULES[age];
  const dRank  = {beginner:0,intermediate:1,advanced:2};
  const pRank  = dRank[settings.experience||"beginner"]??0;
  const goals  = settings.goals||[];
  const posProfile = POSITION_PROFILES[settings.playStyle||"any"] || POSITION_PROFILES.any;
  const posCats = new Set(posProfile.boostCats);
  const posTags = new Set(posProfile.boostTags);

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

  // Score: funScore + goal match + position fit + anti-repeat + randomness
  const scored = eligible.map(ex => {
    const m = ex.meta;
    let s = m.funScore || 5;
    if (goals.some(g => (m.basketballTransfer||[]).includes(g))) s += 2;
    if (posCats.has(ex._cat)) s += 2.5;                                          // position cat boost
    if ((m.basketballTransfer||[]).some(t => posTags.has(t))) s += 1.5;          // position tag boost
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

/* ═══════════════════════ XP + LEVELS + BADGES ═══════════════ */

const LEVELS = [
  { rank:1, name:"Rookie",       emoji:"🌱", xpMin:0,     xpNext:1000  },
  { rank:2, name:"Starter",      emoji:"⭐", xpMin:1000,  xpNext:2500  },
  { rank:3, name:"All-Star",     emoji:"🌟", xpMin:2500,  xpNext:5000  },
  { rank:4, name:"Varsity",      emoji:"🏆", xpMin:5000,  xpNext:10000 },
  { rank:5, name:"Elite Hooper", emoji:"👑", xpMin:10000, xpNext:null  },
];

function getLevel(xp) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.xpMin) lv = l; }
  return lv;
}

/* Badge categories used to group the collection display */
const BADGE_CATS = {
  progression: { label:"Progression Tracks", emoji:"📈" },
  streak:      { label:"Streaks",            emoji:"🔥" },
  shooting:    { label:"Shooting",           emoji:"🏀" },
  milestone:   { label:"Workout Milestones", emoji:"🏋️" },
};

const BADGES_DEF = [
  /* ── Progression Tracks ─────────────────────────── */
  { id:"prog-pogo",     cat:"progression", name:"Pogo Mastery",       emoji:"🦘", desc:"Complete the full Pogo Mastery chain",        color:"#fb923c" },
  { id:"prog-jump",     cat:"progression", name:"Jump Power",         emoji:"💥", desc:"Complete the full Jump Power chain",           color:"#ef4444" },
  { id:"prog-landing",  cat:"progression", name:"Landing Control",    emoji:"🛑", desc:"Complete the full Landing Control chain",      color:"#60a5fa" },
  { id:"prog-sl",       cat:"progression", name:"Single-Leg Strength",emoji:"🦵", desc:"Complete the Single-Leg Strength chain",       color:"#34d399" },
  { id:"prog-strength", cat:"progression", name:"Strength Foundation",emoji:"💪", desc:"Complete the Strength Foundation chain",       color:"#22c55e" },
  { id:"prog-footwork", cat:"progression", name:"Footwork Foundation",emoji:"👟", desc:"Complete the Footwork Foundation chain",       color:"#a78bfa" },
  { id:"prog-agility",  cat:"progression", name:"Agility Speed",      emoji:"⚡", desc:"Complete the Agility Speed chain",             color:"#facc15" },
  { id:"prog-defense",  cat:"progression", name:"Defensive Movement", emoji:"🛡️", desc:"Complete the Defensive Movement chain",       color:"#e879f9" },

  /* ── Streaks ─────────────────────────────────────── */
  { id:"streak-3",  cat:"streak", name:"3 Day Streak",  emoji:"🔥", desc:"Train 3 days in a row",  color:"#fb923c" },
  { id:"streak-7",  cat:"streak", name:"Week Warrior",  emoji:"⚡", desc:"Train 7 days in a row",  color:"#facc15" },
  { id:"streak-14", cat:"streak", name:"14 Day Streak", emoji:"🌟", desc:"Train 14 days in a row", color:"#a78bfa" },
  { id:"streak-30", cat:"streak", name:"30 Day Streak", emoji:"👑", desc:"Train 30 days in a row", color:"#f59e0b" },

  /* ── Shooting ─────────────────────────────────────── */
  { id:"shots-100",  cat:"shooting", name:"100 Makes Club", emoji:"🏀", desc:"Make 100 shots all-time",    color:"#60a5fa" },
  { id:"shots-1k",   cat:"shooting", name:"1K Shooter",     emoji:"🎯", desc:"Make 1,000 shots all-time",  color:"#f43f5e" },
  { id:"shots-2500", cat:"shooting", name:"2.5K Shooter",   emoji:"🔮", desc:"Make 2,500 shots all-time",  color:"#8b5cf6" },
  { id:"shots-5k",   cat:"shooting", name:"5K Shooter",     emoji:"🌠", desc:"Make 5,000 shots all-time",  color:"#06b6d4" },
  { id:"shots-10k",  cat:"shooting", name:"10K Shooter",    emoji:"🏆", desc:"Make 10,000 shots all-time", color:"#f97316" },

  /* ── Workout Milestones ──────────────────────────── */
  { id:"workouts-1",   cat:"milestone", name:"First Workout", emoji:"🌱", desc:"Complete your first workout",  color:"#22c55e" },
  { id:"workouts-10",  cat:"milestone", name:"10 Workouts",   emoji:"⭐", desc:"Complete 10 workout days",     color:"#60a5fa" },
  { id:"workouts-25",  cat:"milestone", name:"25 Workouts",   emoji:"🌟", desc:"Complete 25 workout days",     color:"#a78bfa" },
  { id:"workouts-50",  cat:"milestone", name:"50 Workouts",   emoji:"🏆", desc:"Complete 50 workout days",     color:"#f59e0b" },
  { id:"workouts-100", cat:"milestone", name:"100 Workouts",  emoji:"👑", desc:"Complete 100 workout days",    color:"#f43f5e" },

  /* ── Program Completion ──────────────────────────────── */
  { id:"pgm-jump-higher",    cat:"program", name:"Vertical Unlocked", emoji:"⬆️", desc:"Complete the Jump Higher program",           color:"#f97316" },
  { id:"pgm-guard-handles",  cat:"program", name:"Guard Certified",   emoji:"🎮", desc:"Complete Handle Like a Guard",               color:"#06b6d4" },
  { id:"pgm-become-shooter", cat:"program", name:"Pure Shooter",      emoji:"🎯", desc:"Complete Become a Shooter",                  color:"#8b5cf6" },
  { id:"pgm-first-step",     cat:"program", name:"First Step Elite",  emoji:"⚡", desc:"Complete First Step Explosion",              color:"#f43f5e" },
  { id:"pgm-complete-hooper",cat:"program", name:"Complete Hooper",   emoji:"🏆", desc:"Complete the Complete Hooper program",       color:"#f59e0b" },
];

function computeXP(completed) {
  let exXP=0, workoutXP=0, challengeXP=0, shotXP=0, streakXP=0, badgeXP=0, missionXP=0;

  // Exercise XP (5 per) + workout completion bonus (25 per qualifying day)
  const dayMap = {};
  for (const [k,v] of Object.entries(completed)) {
    if (!v) continue;
    const date = k.split("-").slice(0,3).join("-");
    const exId = k.split("-").slice(3).join("-");
    exXP += 5;
    if (!dayMap[date]) dayMap[date] = { count:0, cats:new Set() };
    dayMap[date].count++;
    const cat = (ALL_EXERCISES[exId]||{})._cat;
    if (cat) dayMap[date].cats.add(cat);
  }
  for (const info of Object.values(dayMap)) {
    if (info.count >= 3 && info.cats.size >= 2) workoutXP += 25;
  }

  // Challenge completion XP (100 per)
  for (const def of CHALLENGES_DEF) {
    const { cur, target } = getChallengeProgress(def, completed);
    if (cur >= target) challengeXP += 100;
  }

  // Shot XP — minimal contribution (1 XP per 50 makes)
  // Shot volume is tracked separately via Shooting Progression badges
  try {
    const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
    const makes = Object.values(sl).flatMap(v=>v).filter(s=>s.made!==false).length;
    shotXP = Math.floor(makes/50);
  } catch {}

  // Badge XP (50 per earned badge) — rewards meaningful milestones
  const earnedIds = getEarnedBadges(completed);
  badgeXP = earnedIds.length * 50;

  // Streak bonus (2 XP per consecutive day when streak ≥ 3)
  const days = [...new Set(
    Object.keys(completed).filter(k=>completed[k]).map(k=>k.split("-").slice(0,3).join("-"))
  )].sort();
  let st=0;
  for (let i=0; i<days.length; i++) {
    if (i===0) { st=1; }
    else {
      const diff=(new Date(days[i]+"T12:00:00")-new Date(days[i-1]+"T12:00:00"))/86400000;
      if(diff<=1.5) st++; else st=1;
    }
    if(st>=3) streakXP+=2;
  }

  // Mission bonus XP (claimed missions)
  try {
    const ml = JSON.parse(localStorage.getItem("fkh-missions")||"{}");
    for (const m of Object.values(ml)) { if (m.claimed) missionXP += (m.bonusXP||50); }
  } catch {}

  return { total:exXP+workoutXP+challengeXP+shotXP+streakXP+badgeXP+missionXP, exXP, workoutXP, challengeXP, shotXP, streakXP, badgeXP, missionXP };
}

function getEarnedBadges(completed) {
  const earned = new Set();

  /* ── Progression Track badges ─────────────────────────────── */
  const chainBadgeMap = {
    "prog-pogo":     "pogo-mastery",
    "prog-jump":     "jump-power",
    "prog-landing":  "landing-control",
    "prog-sl":       "single-leg",
    "prog-strength": "strength-found",
    "prog-footwork": "footwork-found",
    "prog-agility":  "agility-speed",
    "prog-defense":  "defensive-movement",
  };
  for (const [badgeId, chainId] of Object.entries(chainBadgeMap)) {
    const chain = PROGRESSION_CHAINS.find(c => c.id === chainId);
    if (chain) {
      const { progress, total } = getChainStatus(chain, completed);
      if (progress === total) earned.add(badgeId);
    }
  }

  /* ── Streak badges ─────────────────────────────────────────── */
  const days = [...new Set(
    Object.keys(completed).filter(k => completed[k])
      .map(k => k.split("-").slice(0,3).join("-"))
  )].sort();
  let maxStreak = 0, st = 0;
  for (let i = 0; i < days.length; i++) {
    if (i === 0) { st = 1; }
    else {
      const diff = (new Date(days[i]+"T12:00:00") - new Date(days[i-1]+"T12:00:00")) / 86400000;
      if (diff <= 1.5) st++; else st = 1;
    }
    if (st > maxStreak) maxStreak = st;
  }
  if (maxStreak >= 3)  earned.add("streak-3");
  if (maxStreak >= 7)  earned.add("streak-7");
  if (maxStreak >= 14) earned.add("streak-14");
  if (maxStreak >= 30) earned.add("streak-30");

  /* ── Shooting badges ──────────────────────────────────────── */
  try {
    const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
    const makes = Object.values(sl).flatMap(v=>v).filter(s=>s.made!==false).length;
    if (makes >= 100)   earned.add("shots-100");
    if (makes >= 1000)  earned.add("shots-1k");
    if (makes >= 2500)  earned.add("shots-2500");
    if (makes >= 5000)  earned.add("shots-5k");
    if (makes >= 10000) earned.add("shots-10k");
  } catch {}

  /* ── Workout Milestone badges ─────────────────────────────── */
  // A "workout day" = any day with ≥ 1 completed exercise
  const workoutDays = new Set(
    Object.keys(completed).filter(k => completed[k])
      .map(k => k.split("-").slice(0,3).join("-"))
  ).size;
  if (workoutDays >= 1)   earned.add("workouts-1");
  if (workoutDays >= 10)  earned.add("workouts-10");
  if (workoutDays >= 25)  earned.add("workouts-25");
  if (workoutDays >= 50)  earned.add("workouts-50");
  if (workoutDays >= 100) earned.add("workouts-100");

  /* ── Program completion badges ────────────────────────────── */
  for (const prog of PROGRAMS) {
    if (computeProgramProgress(prog, completed) >= 1) earned.add(prog.badgeId);
  }

  return [...earned];
}

/** Returns {cur, target} progress toward a badge — used by Upcoming Unlocks and Next Badge card. */
function getBadgeProgress(badge, completed) {
  const days = [...new Set(
    Object.keys(completed).filter(k=>completed[k]).map(k=>k.split("-").slice(0,3).join("-"))
  )];
  const workoutDays = days.length;
  let streak = 0; const dw = new Date();
  for (let i = 0; i < 60; i++) {
    const k = dw.toLocaleDateString("en-CA");
    if (days.includes(k)) { streak++; dw.setDate(dw.getDate()-1); } else break;
  }
  let makes = 0;
  try { const sl=JSON.parse(localStorage.getItem("shot_log_v2")||"{}"); makes=Object.values(sl).flatMap(v=>v).filter(s=>s.made!==false).length; } catch {}
  const MAP = {
    "workouts-1":{cur:workoutDays,target:1},"workouts-10":{cur:workoutDays,target:10},
    "workouts-25":{cur:workoutDays,target:25},"workouts-50":{cur:workoutDays,target:50},
    "workouts-100":{cur:workoutDays,target:100},
    "streak-3":{cur:streak,target:3},"streak-7":{cur:streak,target:7},
    "streak-14":{cur:streak,target:14},"streak-30":{cur:streak,target:30},
    "shots-100":{cur:makes,target:100},"shots-1k":{cur:makes,target:1000},
    "shots-2500":{cur:makes,target:2500},"shots-5k":{cur:makes,target:5000},
    "shots-10k":{cur:makes,target:10000},
  };
  if (MAP[badge.id]) return MAP[badge.id];
  // Program completion badges
  const prog = PROGRAMS.find(p => p.badgeId === badge.id);
  if (prog) {
    const totalSessions = prog.weeks.reduce((s, w) => s + w.sessions.length, 0);
    let doneSessions = 0;
    const exDone = exId => Object.keys(completed).some(k => completed[k] && k.split("-").slice(3).join("-") === exId);
    for (const week of prog.weeks) for (const session of week.sessions) if (session.exercises.every(exDone)) doneSessions++;
    return { cur: doneSessions, target: totalSessions };
  }
  return { cur:0, target:1 };
}

/* ═══════════════════════ PROGRESSION CHAINS ════════════════ */

/**
 * Linear exercise sequences. Each step's `unlocksAt` is the number of
 * completions of THAT step required to unlock the NEXT step.
 * Step 0 is always unlocked.
 */
const PROGRESSION_CHAINS = [
  {
    id:"pogo-mastery", name:"Pogo Mastery", emoji:"🦘", cat:"explosion",
    steps:[
      { exId:"pogo-jumps",        unlocksAt:3 },
      { exId:"reactive-pogos",    unlocksAt:3 },
      { exId:"pogo-hops",         unlocksAt:5 },
      { exId:"tuck-jumps",        unlocksAt:5 },
    ]
  },
  {
    id:"jump-power", name:"Jump Power", emoji:"💥", cat:"explosion",
    steps:[
      { exId:"snap-downs",        unlocksAt:3 },
      { exId:"broad-jump-stick",  unlocksAt:3 },
      { exId:"squat-jumps",       unlocksAt:3 },
      { exId:"box-jump",          unlocksAt:5 },
      { exId:"drop-jump",         unlocksAt:5 },
    ]
  },
  {
    id:"landing-control", name:"Landing Control", emoji:"🛑", cat:"deceleration",
    steps:[
      { exId:"jump-stop-hold",        unlocksAt:3 },
      { exId:"drop-athletic-stance",  unlocksAt:3 },
      { exId:"sl-stick-landing",      unlocksAt:5 },
      { exId:"depth-landing-hold",    unlocksAt:5 },
      { exId:"sprint-to-stick",       unlocksAt:5 },
    ]
  },
  {
    id:"single-leg", name:"Single-Leg Strength", emoji:"🦵", cat:"balance",
    steps:[
      { exId:"sl-hold",           unlocksAt:3 },
      { exId:"sl-balance-reach",  unlocksAt:3 },
      { exId:"sl-squat",          unlocksAt:5 },
      { exId:"triple-lat-hops",   unlocksAt:5 },
    ]
  },
  {
    id:"strength-found", name:"Strength Foundation", emoji:"💪", cat:"strength",
    steps:[
      { exId:"bw-squats",   unlocksAt:3 },
      { exId:"goblet-sq",   unlocksAt:3 },
      { exId:"split-sq",    unlocksAt:5 },
      { exId:"db-deadlift", unlocksAt:5 },
    ]
  },
  {
    id:"footwork-found", name:"Footwork Foundation", emoji:"👟", cat:"coordination",
    steps:[
      { exId:"rhythm-line-hops",       unlocksAt:3 },
      { exId:"alternating-line-hops",  unlocksAt:3 },
      { exId:"quick-step-matrix",      unlocksAt:5 },
      { exId:"carioca",                unlocksAt:5 },
    ]
  },
  {
    id:"agility-speed", name:"Agility Speed", emoji:"⚡", cat:"speed",
    steps:[
      { exId:"ladder",    unlocksAt:3 },
      { exId:"cone-cod",  unlocksAt:3 },
      { exId:"def-slide", unlocksAt:5 },
      { exId:"5-10-5",    unlocksAt:5 },
      { exId:"lat-bounds",unlocksAt:5 },
    ]
  },
  {
    id:"defensive-movement", name:"Defensive Movement", emoji:"🛡️", cat:"athletic",
    steps:[
      { exId:"defensive-hip-flip",    unlocksAt:3 },
      { exId:"retreat-sprint",        unlocksAt:3 },
      { exId:"backpedal-sprint",      unlocksAt:5 },
      { exId:"lateral-sprint-combo",  unlocksAt:5 },
      { exId:"defensive-recovery",    unlocksAt:5 },
    ]
  },
];

/** How many times has an athlete completed a given exercise? */
function getCompletionCount(exId, completed) {
  return Object.entries(completed)
    .filter(([k, v]) => v && k.split("-").slice(3).join("-") === exId)
    .length;
}

/** Returns the chain that contains this exercise, or null. */
function getChainForExercise(exId) {
  return PROGRESSION_CHAINS.find(c => c.steps.some(s => s.exId === exId)) || null;
}

/**
 * Returns enriched step list + overall progress counters.
 *
 * Each step gets:
 *   count     — completions recorded
 *   unlocked  — true if the athlete can do this step
 *   mastered  — true if done enough to unlock the NEXT step
 *   ex        — full exercise object (or undefined)
 */
function getChainStatus(chain, completed) {
  const counts = chain.steps.map(s => getCompletionCount(s.exId, completed));

  const steps = chain.steps.map((step, i) => {
    const count   = counts[i];
    const ex      = ALL_EXERCISES[step.exId];
    const unlocked = i === 0 || counts[i - 1] >= chain.steps[i - 1].unlocksAt;
    const mastered = count >= step.unlocksAt;
    return { ...step, count, ex, unlocked, mastered };
  });

  const progress = steps.filter(s => s.mastered).length;
  return { steps, progress, total: steps.length };
}

/* ═══════════════════════ CALENDAR DATA ══════════════════════ */

// Fixed per-category dot colors (theme-independent so they're always readable)
const CAT_DOT_COLORS = {
  explosion:    "#fb923c",
  deceleration: "#60a5fa",
  strength:     "#22c55e",
  speed:        "#f59e0b",
  balance:      "#34d399",
  coordination: "#a78bfa",
  conditioning: "#ef4444",
  athletic:     "#e879f9",
  handles:      "#7c3aed",
  basketball_iq:"#3b82f6",
  shooting:     "#f97316",
};

function buildCalendarData(completed) {
  const dayMap = {};

  // Group completed exercises by date
  for (const [k, v] of Object.entries(completed)) {
    if (!v) continue;
    const date  = k.split("-").slice(0,3).join("-");
    const exId  = k.split("-").slice(3).join("-");
    if (!dayMap[date]) dayMap[date] = { exs:[], cats:new Set(), shots:0 };
    const ex = ALL_EXERCISES[exId];
    if (ex) {
      dayMap[date].exs.push(ex);
      dayMap[date].cats.add(ex._cat);
    } else {
      dayMap[date].exs.push({ id:exId, name:exId, _cat:"unknown" });
    }
  }

  // Layer in shot data
  try {
    const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
    for (const [date, shots] of Object.entries(sl)) {
      const makes = (shots||[]).filter(s=>s.made!==false).length;
      if (makes === 0) continue;
      if (!dayMap[date]) dayMap[date] = { exs:[], cats:new Set(), shots:0 };
      dayMap[date].shots  = makes;
      dayMap[date].cats.add("shooting");
    }
  } catch {}

  // Compute per-day XP and finalise cats → array
  for (const [, data] of Object.entries(dayMap)) {
    data.cats      = [...data.cats];
    const exXP     = data.exs.length * 5;
    const wBonus   = data.exs.length >= 3 && data.cats.length >= 2 ? 25 : 0;
    const shotXP   = Math.floor((data.shots||0)/10) * 5;
    data.xp        = exXP + wBonus + shotXP;
    data.totalDrills = data.exs.length;
  }

  // Compute running streak per day
  const sorted = Object.keys(dayMap).sort();
  let streak = 0;
  for (let i=0; i<sorted.length; i++) {
    if (i===0) { streak=1; }
    else {
      const diff=(new Date(sorted[i]+"T12:00:00")-new Date(sorted[i-1]+"T12:00:00"))/86400000;
      if(diff<=1.5) streak++; else streak=1;
    }
    dayMap[sorted[i]].streakDay = streak;
  }

  return dayMap;
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

/* ═══════════════════════ TRAINING PROGRAMS ═════════════════ */

const PROGRAMS = [
  {
    id:"jump-higher", name:"Jump Higher", emoji:"⬆️", color:"#f97316",
    badgeId:"pgm-jump-higher", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"A 4-week plyometric plan to add inches to your vertical and build explosive first-step power.",
    weeks:[
      { week:1, goal:"Build ankle stiffness and landing control — the foundation of every jump.",
        sessions:[
          { day:"Session 1", focus:"Elasticity Foundation",  exercises:["pogo-jumps","lateral-line-hops","depth-drop"] },
          { day:"Session 2", focus:"Single-Leg Control",     exercises:["sl-hold","sl-squat","sl-stick-landing"] },
          { day:"Session 3", focus:"Power Introduction",     exercises:["squat-jumps","snap-downs","broad-jump-stick"] },
        ]},
      { week:2, goal:"Develop horizontal and lateral power while reinforcing landing mechanics.",
        sessions:[
          { day:"Session 1", focus:"Reactive Elasticity",    exercises:["reactive-pogos","lateral-line-hops","single-leg-hops"] },
          { day:"Session 2", focus:"Lateral Power",          exercises:["lateral-bounds-pjf","lat-skater-hops","lateral-stick-landing"] },
          { day:"Session 3", focus:"Power Development",      exercises:["tuck-jumps","broad-jump-stick-dec","pogo-tutorial"] },
        ]},
      { week:3, goal:"Reactive power and stretch-shortening cycle training — where vertical gains come from.",
        sessions:[
          { day:"Session 1", focus:"Reactive Training",      exercises:["drop-jump","pogo-to-tuck","single-leg-pogo"] },
          { day:"Session 2", focus:"Combo Power",            exercises:["broad-bounds-sprint","lat-skater-hops","tuck-jumps"] },
          { day:"Session 3", focus:"Full Plyometric",        exercises:["vj-progression","snap-down-prog","lateral-bounds-pjf"] },
        ]},
      { week:4, goal:"Peak power expression — max effort on every rep. Measure your vertical this week.",
        sessions:[
          { day:"Session 1", focus:"Max Vertical",           exercises:["drop-jump","squat-jumps","pogo-to-tuck"] },
          { day:"Session 2", focus:"Full Expression",        exercises:["full-plyo-workout","single-leg-pogo","broad-bounds-sprint"] },
          { day:"Session 3", focus:"Peak Performance",       exercises:["dunk-training","vj-progression","lateral-line-hops"] },
        ]},
    ],
  },

  {
    id:"guard-handles", name:"Handle Like a Guard", emoji:"🎮", color:"#06b6d4",
    badgeId:"pgm-guard-handles", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"Build elite ball-handling skills from stationary foundation through full game-speed combo moves.",
    weeks:[
      { week:1, goal:"Master the foundation — ball feel, weak hand, and basic stationary control.",
        sessions:[
          { day:"Session 1", focus:"Ball Control",           exercises:["bh-pound","gh-stationary-cross","weak-hand"] },
          { day:"Session 2", focus:"Hand-Eye",               exercises:["tennis-dribble","tennis-wall","bh-in-out"] },
          { day:"Session 3", focus:"Foundation Review",      exercises:["bh-pound","bh-crossover","gh-change-pace"] },
        ]},
      { week:2, goal:"Learn the core change-of-direction moves — crossover, between legs, and change of pace.",
        sessions:[
          { day:"Session 1", focus:"Crossover Mastery",      exercises:["bh-crossover","gh-stationary-cross","gh-cross-btl"] },
          { day:"Session 2", focus:"Advanced Moves",         exercises:["bh-btl","gh-change-pace","two-ball"] },
          { day:"Session 3", focus:"Combo Foundation",       exercises:["bh-crossover","bh-in-out","sackmann-hesi"] },
        ]},
      { week:3, goal:"Add behind-the-back, hesitation, and two-ball coordination.",
        sessions:[
          { day:"Session 1", focus:"Behind the Back",        exercises:["gh-behind-back","bh-btl","relph-twoball"] },
          { day:"Session 2", focus:"Hesitation Game",        exercises:["sackmann-hesi","bh-retreat","gh-change-pace"] },
          { day:"Session 3", focus:"Advanced Coordination",  exercises:["two-ball","relph-twoball","bh-combo"] },
        ]},
      { week:4, goal:"Game-speed combos, driving attacks, and defeating defenders.",
        sessions:[
          { day:"Session 1", focus:"Attack Moves",           exercises:["bh-attack-cross","gh-dribble-drive","bh-retreat"] },
          { day:"Session 2", focus:"Combo Sequences",        exercises:["bh-combo","gethandles-combo","sackmann-hesi"] },
          { day:"Session 3", focus:"Full Guard Skills",      exercises:["gh-dribble-drive","bh-attack-cross","bh-combo"] },
        ]},
    ],
  },

  {
    id:"become-shooter", name:"Become a Shooter", emoji:"🎯", color:"#8b5cf6",
    badgeId:"pgm-become-shooter", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"Fix your mechanics, build shot consistency, and earn the reputation as the player who never misses.",
    weeks:[
      { week:1, goal:"Lock in your shooting mechanics — form shooting, wrist, and free throw routine.",
        sessions:[
          { day:"Session 1", focus:"BEEF Mechanics",         exercises:["sh-form","sh-one-hand","sh-knee-roll"] },
          { day:"Session 2", focus:"Free Throws",            exercises:["slab-ft-routine","sh-ft-routine","sh-hop-shot"] },
          { day:"Session 3", focus:"Catch & Shoot",          exercises:["slab-catch-shoot","sh-form","sh-atw"] },
        ]},
      { week:2, goal:"Extend range and build volume shooting from game spots.",
        sessions:[
          { day:"Session 1", focus:"Spot Shooting",          exercises:["sh-spot","sh-atw","slab-catch-shoot"] },
          { day:"Session 2", focus:"Screen Actions",         exercises:["slab-curl-cut","sh-hop-shot","slab-ft-routine"] },
          { day:"Session 3", focus:"Pressure Reps",          exercises:["sh-beat-pro","sh-spot","sh-atw"] },
        ]},
      { week:3, goal:"Off-the-dribble shooting — pull-ups, mid-range, and game-like situations.",
        sessions:[
          { day:"Session 1", focus:"Pull-Up Game",           exercises:["slab-pullup","slab-elbow","sh-jab-reset"] },
          { day:"Session 2", focus:"Mid-Range",              exercises:["slab-elbow","sh-beat-pro","slab-pullup"] },
          { day:"Session 3", focus:"Game Shots",             exercises:["sh-jab-reset","slab-curl-cut","sh-single-leg"] },
        ]},
      { week:4, goal:"Separation shots, corner threes, and step-backs — the complete shooting game.",
        sessions:[
          { day:"Session 1", focus:"Range Extension",        exercises:["slab-corner-3","slab-step-back","sh-spot"] },
          { day:"Session 2", focus:"Step Back",              exercises:["slab-step-back","sh-single-leg","sh-jab-reset"] },
          { day:"Session 3", focus:"Compete",                exercises:["sh-beat-pro","slab-corner-3","slab-step-back"] },
        ]},
    ],
  },

  {
    id:"first-step-explosion", name:"First Step Explosion", emoji:"⚡", color:"#f43f5e",
    badgeId:"pgm-first-step", duration:4, daysPerWeek:3, ageRange:[9,17],
    desc:"Build the footwork, pivots, and finishing moves that let you attack the basket with confidence every possession.",
    weeks:[
      { week:1, goal:"Establish the movement foundation — triple threat, jump stop, and basic finishing.",
        sessions:[
          { day:"Session 1", focus:"Triple Threat & Jump Stop", exercises:["fw-jump-stop","fw-triple-threat","flab-triple-threat"] },
          { day:"Session 2", focus:"Layup Foundation",          exercises:["fin-power-layup","fin-mikan","fs-power-finish"] },
          { day:"Session 3", focus:"First Steps",               exercises:["fw-triple-threat","fw-jab-series","flab-jab-series"] },
        ]},
      { week:2, goal:"Pivot mastery and reverse finishing — create angles the defense can't cover.",
        sessions:[
          { day:"Session 1", focus:"Pivot Work",              exercises:["fw-front-pivot","fw-rev-pivot","fin-rev-mikan"] },
          { day:"Session 2", focus:"Reverse Finishing",       exercises:["fin-reverse","fs-hop-step","fin-rev-mikan"] },
          { day:"Session 3", focus:"Jab Series",              exercises:["fw-jab-series","flab-jab-series","fin-mikan"] },
        ]},
      { week:3, goal:"Rip through, shot fakes, and step-through moves — counter every defender.",
        sessions:[
          { day:"Session 1", focus:"Rip & Drive",             exercises:["fw-rip-through","fw-sweep-go","flab-shot-fake"] },
          { day:"Session 2", focus:"Shot Fakes",              exercises:["flab-shot-fake","flab-step-through","fw-shot-fake"] },
          { day:"Session 3", focus:"Counter Moves",           exercises:["fw-sweep-go","fin-euro","fs-contact-finish"] },
        ]},
      { week:4, goal:"Advanced finishes and full-speed integration — score from anywhere in the paint.",
        sessions:[
          { day:"Session 1", focus:"Advanced Finishes",       exercises:["fin-floater","fin-euro","fin-pro-hop"] },
          { day:"Session 2", focus:"Elite Moves",             exercises:["fin-wrong-foot","fin-floater","flab-rocker-step"] },
          { day:"Session 3", focus:"Complete Attack",         exercises:["fin-pro-hop","fin-euro","sackmann-finish"] },
        ]},
    ],
  },

  {
    id:"complete-hooper", name:"Complete Hooper", emoji:"🏆", color:"#f59e0b",
    badgeId:"pgm-complete-hooper", duration:6, daysPerWeek:4, ageRange:[10,17],
    desc:"The full development system — 6 weeks covering handles, footwork, finishing, shooting, post play, and basketball IQ.",
    weeks:[
      { week:1, goal:"Foundation week — ball control, triple threat, shot mechanics, and athletic base.",
        sessions:[
          { day:"Session 1", focus:"Ball Handling Base",     exercises:["bh-pound","gh-stationary-cross","weak-hand"] },
          { day:"Session 2", focus:"Shooting Mechanics",     exercises:["sh-form","sh-one-hand","slab-ft-routine"] },
          { day:"Session 3", focus:"Footwork Foundation",    exercises:["fw-jump-stop","fw-triple-threat","fin-power-layup"] },
          { day:"Session 4", focus:"Athletic Base",          exercises:["pogo-jumps","squat-jumps","sl-hold"] },
        ]},
      { week:2, goal:"Expand your arsenal — add moves in all skill areas simultaneously.",
        sessions:[
          { day:"Session 1", focus:"Crossover & Drives",     exercises:["bh-crossover","bh-in-out","gh-change-pace"] },
          { day:"Session 2", focus:"Spot Shooting",          exercises:["sh-spot","slab-catch-shoot","sh-hop-shot"] },
          { day:"Session 3", focus:"Pivots & Layups",        exercises:["fw-front-pivot","fw-rev-pivot","fin-mikan"] },
          { day:"Session 4", focus:"Explosion",              exercises:["single-leg-hops","lateral-bounds-pjf","snap-downs"] },
        ]},
      { week:3, goal:"Intermediate skill week — game-like reps in handles, shooting, and IQ.",
        sessions:[
          { day:"Session 1", focus:"Intermediate Handles",   exercises:["bh-btl","gh-cross-btl","sackmann-hesi"] },
          { day:"Session 2", focus:"Off-Dribble Shooting",   exercises:["slab-pullup","slab-elbow","sh-beat-pro"] },
          { day:"Session 3", focus:"Attack Moves",           exercises:["fw-jab-series","flab-shot-fake","fin-euro"] },
          { day:"Session 4", focus:"Court Vision",           exercises:["iq-closeout","iq-shot-drive","iq-spacing"] },
        ]},
      { week:4, goal:"Advanced moves — step back, combo handles, post plays, and defensive reads.",
        sessions:[
          { day:"Session 1", focus:"Advanced Handles",       exercises:["gh-behind-back","bh-attack-cross","gethandles-combo"] },
          { day:"Session 2", focus:"Advanced Shooting",      exercises:["sh-jab-reset","slab-step-back","slab-corner-3"] },
          { day:"Session 3", focus:"Post Fundamentals",      exercises:["pm-seal","pm-drop-step","pm-hook"] },
          { day:"Session 4", focus:"Defensive IQ",           exercises:["iq-help-side","iq-read-def","iq-transition"] },
        ]},
      { week:5, goal:"Combo sequences and situational scoring — put it all together.",
        sessions:[
          { day:"Session 1", focus:"Handle Combos",          exercises:["bh-combo","relph-twoball","gh-dribble-drive"] },
          { day:"Session 2", focus:"Full Shooting",          exercises:["slab-step-back","sh-single-leg","sh-beat-pro"] },
          { day:"Session 3", focus:"Advanced Post",          exercises:["pm-up-under","pm-spin","pm-face-up"] },
          { day:"Session 4", focus:"Finishing School",        exercises:["fin-floater","fin-pro-hop","fin-wrong-foot"] },
        ]},
      { week:6, goal:"Peak week — compete at full speed in every area. You're a Complete Hooper.",
        sessions:[
          { day:"Session 1", focus:"Elite Handles",          exercises:["bh-combo","gethandles-combo","sackmann-hesi"] },
          { day:"Session 2", focus:"Shot Creation",          exercises:["slab-step-back","sh-jab-reset","slab-corner-3"] },
          { day:"Session 3", focus:"Post Game",              exercises:["pm-saddi-combo","pm-step-through","pm-face-up"] },
          { day:"Session 4", focus:"Full Integration",       exercises:["iq-closeout","fin-floater","bh-combo"] },
        ]},
    ],
  },
];

/** Returns 0–1 completion ratio for a program based on completed exercises. */
function computeProgramProgress(program, completed) {
  let total = 0, done = 0;
  const exDone = exId => Object.keys(completed).some(k => {
    if (!completed[k]) return false;
    return k.split("-").slice(3).join("-") === exId;
  });
  for (const week of program.weeks) {
    for (const session of week.sessions) {
      total++;
      if (session.exercises.every(exDone)) done++;
    }
  }
  return total === 0 ? 0 : done / total;
}

/** Returns the current week number (1-indexed, capped at duration) for an enrolled program. */
function programCurrentWeek(startDate, duration) {
  if (!startDate) return 1;
  const days = Math.floor((Date.now() - new Date(startDate+"T00:00:00").getTime()) / 86400000);
  return Math.min(duration, Math.max(1, Math.floor(days / 7) + 1));
}

/* ═══════════════════════ DAILY MISSION SYSTEM ══════════════ */

/**
 * Deterministically generates one mission per day based on user state.
 * Priority: active program → underworked skill category → day-of-week rotation.
 */
function generateDailyMission(todayStr, settings, completed, enrolledPrograms) {
  const age = calcAge(settings.dateOfBirth);
  const cutoff = new Date(Date.now()-3*86400000).toLocaleDateString("en-CA");
  const recentCats = new Set(
    Object.keys(completed)
      .filter(k=>{ const d=k.split("-").slice(0,3).join("-"); return d>=cutoff&&completed[k]; })
      .map(k=>ALL_EXERCISES[k.split("-").slice(3).join("-")]?._cat)
      .filter(Boolean)
  );
  const exDone = exId => Object.keys(completed).some(k=>completed[k]&&k.split("-").slice(3).join("-")===exId);

  const tasks = [];
  let title = "Daily Training";
  let bonusXP = 50;

  /* ── Task 1: Active program session or workout category ── */
  const activeProg = PROGRAMS.find(p=>enrolledPrograms[p.id]);
  let task1Cat = null;
  if (activeProg) {
    const enrollment = enrolledPrograms[activeProg.id];
    const curWeek = programCurrentWeek(enrollment.startDate, activeProg.duration);
    const weekData = activeProg.weeks.find(w=>w.week===curWeek);
    const nextSession = weekData?.sessions.find(s=>!s.exercises.every(exDone));
    if (nextSession) {
      title = `${activeProg.emoji} ${activeProg.name} — Week ${curWeek}`;
      task1Cat = ALL_EXERCISES[nextSession.exercises[0]]?._cat || null;
      tasks.push({
        id:"task-prog", type:"program",
        label:`Finish "${nextSession.focus}" session`,
        exercises: nextSession.exercises,
        target: nextSession.exercises.length,
        required: true,
      });
      bonusXP = 75;
    }
  }
  if (tasks.length===0) {
    const bbCats = ["ballhandling","footwork","finishing","game_handles","shooting_lab","footwork_lab","shootingdrills"];
    const daySeed = new Date(todayStr+"T12:00:00").getDay();
    const underworked = bbCats.find(c=>!recentCats.has(c));
    const fallbackCat = underworked || bbCats[daySeed % bbCats.length];
    const catExs = (WORKOUTS[fallbackCat]||[]).slice(0,3).map(e=>e.id);
    const catInfo = CATS[fallbackCat]||{label:fallbackCat,emoji:"🏀"};
    title = `${catInfo.emoji} ${catInfo.label} Day`;
    task1Cat = fallbackCat;
    tasks.push({
      id:"task-workout", type:"category",
      label:`Complete 3 ${catInfo.label} exercises`,
      exercises: catExs,
      target: Math.min(3, catExs.length),
      required: true,
      category: fallbackCat,
    });
  }

  /* ── Task 2: Complementary skill from a different category ── */
  const skillCats = ["ballhandling","footwork","finishing","game_handles","basketball_iq","shooting_lab","footwork_lab","shootingdrills","postmoves"];
  const dayOffset = new Date(todayStr+"T12:00:00").getDay();
  const available = skillCats.filter(c=>c!==task1Cat&&(WORKOUTS[c]||[]).length>=2);
  const skillCat = available.find(c=>!recentCats.has(c)) || available[(dayOffset+1)%available.length];
  if (skillCat) {
    const catExs = (WORKOUTS[skillCat]||[]).slice(0,2).map(e=>e.id);
    const catInfo = CATS[skillCat]||{label:skillCat,emoji:"🏀"};
    tasks.push({
      id:"task-skill", type:"category",
      label:`Do 2 ${catInfo.label} exercises`,
      exercises: catExs,
      target: 2,
      required: true,
      category: skillCat,
    });
  }

  /* ── Task 3: Optional shot goal (age-scaled) ── */
  const shotTarget = age>=13 ? 50 : age>=11 ? 25 : 15;
  tasks.push({
    id:"task-shots", type:"shots",
    label:`Make ${shotTarget} shots`,
    target: shotTarget,
    required: false,
    optional: true,
  });

  return { date:todayStr, title, tasks, bonusXP };
}

/** Live progress for a single mission task. */
function getMissionTaskProgress(task, completed, todayStr) {
  if (task.type==="shots") {
    try {
      const sl = JSON.parse(localStorage.getItem("shot_log_v2")||"{}");
      const makes = (sl[todayStr]||[]).filter(s=>s.made!==false).length;
      return { cur:makes, target:task.target };
    } catch { return { cur:0, target:task.target }; }
  }
  // program or category tasks: count exercises done (any day)
  const exDone = exId => Object.keys(completed).some(k=>completed[k]&&k.split("-").slice(3).join("-")===exId);
  const done = (task.exercises||[]).filter(exDone).length;
  return { cur:done, target:task.target };
}

/* ═══════════════════════ HISTORY DATA BUILDER ══════════════ */

function buildHistoryData(completed, badgeDates) {
  // ── Group completed entries by date ────────────────────────────
  const dayExMap = {};
  for (const [k, v] of Object.entries(completed)) {
    if (!v) continue;
    const parts = k.split("-");
    const date  = parts.slice(0, 3).join("-");
    const exId  = parts.slice(3).join("-");
    if (!dayExMap[date]) dayExMap[date] = [];
    dayExMap[date].push(exId);
  }

  const sortedDays = Object.keys(dayExMap).sort();

  // ── Totals ────────────────────────────────────────────────────
  const totalWorkoutDays = sortedDays.length;
  let totalExercises = 0;
  let totalMinutes   = 0;
  for (const [, exIds] of Object.entries(dayExMap)) {
    totalExercises += exIds.length;
    for (const exId of exIds) {
      totalMinutes += Math.round((ALL_EXERCISES[exId]?.meta?.estimatedDuration || 180) / 60);
    }
  }

  // ── Streak computation ────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString("en-CA");
  const yestD    = new Date(); yestD.setDate(yestD.getDate() - 1);
  const yestStr  = yestD.toLocaleDateString("en-CA");

  // Current streak: consecutive days ending today or yesterday
  let currentStreak = 0;
  const csStart = new Date();
  // If today not trained, try from yesterday
  if (!dayExMap[todayStr]) csStart.setDate(csStart.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const ds = csStart.toLocaleDateString("en-CA");
    if (dayExMap[ds]) { currentStreak++; csStart.setDate(csStart.getDate() - 1); }
    else break;
  }
  // If we started from yesterday and yesterday is empty, streak is 0
  if (!dayExMap[todayStr] && !dayExMap[yestStr]) currentStreak = 0;

  // Longest streak: scan all days
  let longestStreak = 0;
  let runStreak     = 0;
  let prevDate      = null;
  for (const d of sortedDays) {
    if (!prevDate) { runStreak = 1; }
    else {
      const prev = new Date(prevDate + "T12:00:00");
      prev.setDate(prev.getDate() + 1);
      if (prev.toLocaleDateString("en-CA") === d) { runStreak++; }
      else { runStreak = 1; }
    }
    if (runStreak > longestStreak) longestStreak = runStreak;
    prevDate = d;
  }

  // ── Day streak map ────────────────────────────────────────────
  // dayStreakMap[date] = the streak number at that day
  const dayStreakMap = {};
  let rs2 = 0; let pd2 = null;
  for (const d of sortedDays) {
    if (!pd2) { rs2 = 1; }
    else {
      const prev = new Date(pd2 + "T12:00:00");
      prev.setDate(prev.getDate() + 1);
      rs2 = prev.toLocaleDateString("en-CA") === d ? rs2 + 1 : 1;
    }
    dayStreakMap[d] = rs2;
    pd2 = d;
  }

  // ── Total shots from localStorage ────────────────────────────
  let totalShots = 0;
  try {
    const raw = JSON.parse(localStorage.getItem("shot_log_v2") || "[]");
    totalShots = raw.filter(s => s.made !== false).length;
  } catch { totalShots = 0; }

  // ── Weekly data (last 8 ISO weeks, Monday-start) ──────────────
  function getMonWeek(dateStr) {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d); mon.setDate(d.getDate() + diff);
    return mon.toLocaleDateString("en-CA");
  }

  const weekMap = {};
  for (const [date, exIds] of Object.entries(dayExMap)) {
    const wk = getMonWeek(date);
    if (!weekMap[wk]) weekMap[wk] = { workouts: 0, exercises: 0, minutes: 0 };
    weekMap[wk].workouts++;
    weekMap[wk].exercises += exIds.length;
    for (const exId of exIds) {
      weekMap[wk].minutes += Math.round((ALL_EXERCISES[exId]?.meta?.estimatedDuration || 180) / 60);
    }
  }

  // Build last 8 weeks ending this week
  const thisMonday = getMonWeek(todayStr);
  const weeklyData = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMonday + "T12:00:00");
    d.setDate(d.getDate() - i * 7);
    const wkStr = d.toLocaleDateString("en-CA");
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const info  = weekMap[wkStr] || { workouts: 0, exercises: 0, minutes: 0 };
    weeklyData.push({ label, weekStart: wkStr, ...info });
  }

  // ── Category stats ────────────────────────────────────────────
  const catRaw = {};
  for (const [date, exIds] of Object.entries(dayExMap)) {
    const catsThisDay = new Set();
    for (const exId of exIds) {
      const cat = ALL_EXERCISES[exId]?._cat;
      if (!cat) continue;
      if (!catRaw[cat]) catRaw[cat] = { count: 0, sessionDays: 0, lastDate: null, days: new Set() };
      catRaw[cat].count++;
      catsThisDay.add(cat);
      if (!catRaw[cat].lastDate || date > catRaw[cat].lastDate) catRaw[cat].lastDate = date;
    }
    for (const cat of catsThisDay) {
      catRaw[cat].days.add(date);
    }
  }
  const categoryStats = Object.entries(catRaw)
    .map(([cat, v]) => [cat, { count: v.count, sessionDays: v.days.size, lastDate: v.lastDate }])
    .sort((a, b) => b[1].count - a[1].count);

  // ── Recent activity feed ──────────────────────────────────────
  const recentActivity = [];

  for (const [date, exIds] of Object.entries(dayExMap)) {
    const cats = [...new Set(exIds.map(id => ALL_EXERCISES[id]?._cat).filter(Boolean))];
    recentActivity.push({ type: "workout", date, exCount: exIds.length, cats, key: `workout-${date}` });
  }

  if (badgeDates) {
    for (const [badgeId, dateStr] of Object.entries(badgeDates)) {
      const badge = BADGES_DEF.find(b => b.id === badgeId);
      if (badge && dateStr) {
        recentActivity.push({ type: "badge", date: dateStr, badge, key: `badge-${badgeId}` });
      }
    }
  }

  recentActivity.sort((a, b) => b.date.localeCompare(a.date));
  const recentActivitySliced = recentActivity.slice(0, 25);

  // ── Coach insights ─────────────────────────────────────────────
  const coachInsights = [];
  const todayD = new Date(todayStr + "T12:00:00");

  // 1. Most trained category
  if (categoryStats.length > 0) {
    const [topCat, topInfo] = categoryStats[0];
    const catLabel = CATS[topCat]?.label || topCat;
    coachInsights.push({ emoji: CATS[topCat]?.emoji || "🏋️", text: `${catLabel} is your most completed category with ${topInfo.count} sessions.` });
  }

  // 2. Any category not trained in ≥8 days
  for (const [cat, info] of categoryStats) {
    if (coachInsights.length >= 5) break;
    if (!info.lastDate) continue;
    const lastD = new Date(info.lastDate + "T12:00:00");
    const daysDiff = Math.floor((todayD - lastD) / 86400000);
    if (daysDiff >= 8) {
      const catLabel = CATS[cat]?.label || cat;
      coachInsights.push({ emoji: CATS[cat]?.emoji || "📅", text: `You haven't trained ${catLabel} in ${daysDiff} days.` });
      break;
    }
  }

  // 3. Streak ≥ 3
  if (currentStreak >= 3) {
    coachInsights.push({ emoji: "🔥", text: `You're on a ${currentStreak}-day streak! Consistency is what separates good athletes from great ones.` });
  }

  // 4. Streak === 0 but has trained before
  if (currentStreak === 0 && totalWorkoutDays > 0) {
    coachInsights.push({ emoji: "💪", text: `You've trained ${totalWorkoutDays} days total. Lace up and start a new streak today.` });
  }

  // 5. Best week
  const bestWeek = [...weeklyData].sort((a, b) => b.exercises - a.exercises)[0];
  if (bestWeek && bestWeek.exercises > 0) {
    coachInsights.push({ emoji: "⭐", text: `Your best week was the one starting ${bestWeek.label} with ${bestWeek.exercises} exercises completed.` });
  }

  return {
    totalWorkoutDays,
    totalExercises,
    totalMinutes,
    currentStreak,
    longestStreak,
    totalShots,
    weeklyData,
    categoryStats,
    recentActivity: recentActivitySliced,
    coachInsights: coachInsights.slice(0, 5),
    dayExMap,
    dayStreakMap,
  };
}

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
  const age   = calcAge(settings.dateOfBirth);
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

          {/* Date of Birth */}
          {(()=>{
            const today = new Date();
            const maxDOB = new Date(today.getFullYear()-8, today.getMonth(), today.getDate()).toLocaleDateString("en-CA");
            const minDOB = new Date(today.getFullYear()-18,today.getMonth(), today.getDate()).toLocaleDateString("en-CA");
            const age    = settings.dateOfBirth ? calcAge(settings.dateOfBirth) : null;
            const bday   = settings.dateOfBirth && isBirthday(settings.dateOfBirth);
            return (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11,color:"#475569",fontWeight:600,marginBottom:6 }}>Date of Birth</div>
                <input type="date"
                  value={settings.dateOfBirth||''}
                  min={minDOB} max={maxDOB}
                  onChange={e=>setSettings(p=>({...p,dateOfBirth:e.target.value||null}))}
                  style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",
                    border:`1.5px solid ${P}44`,borderRadius:10,padding:"8px 12px",
                    fontSize:14,color:"#e2e8f0",outline:"none",colorScheme:"dark" }}/>
                <div style={{ marginTop:7,display:"flex",alignItems:"center",gap:8 }}>
                  {age!==null
                    ? <span style={{ fontSize:12,color:"#94a3b8" }}>
                        {bday
                          ? <span style={{ color:P,fontWeight:700 }}>🎂 Happy Birthday! Age {age}</span>
                          : `Age ${age} years old — updates automatically on each birthday`}
                      </span>
                    : <span style={{ fontSize:11,color:"#475569" }}>
                        Enter DOB — age adjusts automatically every birthday
                      </span>
                  }
                </div>
              </div>
            );
          })()}

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
    // Under the basket
    {id:"layup",        label:"Layup",  short:"LYP", x:113, y:42,  r:17},
    // Blocks — lane sides at low-post depth (~y=52, lane edges x=70/156)
    {id:"block_bank",   label:"Block",  short:"BLK", x:70,  y:52,  r:13},
    {id:"block_bank",   label:"Block",  short:"BLK", x:156, y:52,  r:13},
    // Free throw — center of the FT line (y=122)
    {id:"free_throw",   label:"FT",                  x:113, y:122, r:15},
    // Elbows — exactly where FT line meets lane edge (x=72/154, y=122)
    {id:"mid_bank",     label:"Elbow",  short:"ELB", x:72,  y:122, r:13},
    {id:"mid_bank",     label:"Elbow",  short:"ELB", x:154, y:122, r:13},
    // Mid-range wings (inside the 3-pt arc)
    {id:"mid",          label:"Wing",                x:42,  y:148, r:12},
    {id:"mid",          label:"Wing",                x:184, y:148, r:12},
    // Corner 3 — ON the corner line (x=18/207), mid-height
    {id:"three_corner", label:"Corner", short:"COR", x:18,  y:90,  r:12},
    {id:"three_corner", label:"Corner", short:"COR", x:208, y:90,  r:12},
    // Slot / wing 3 — just beyond the arc at ~30° offset from top
    {id:"three_slot",   label:"Slot",                x:40,  y:157, r:12},
    {id:"three_slot",   label:"Slot",                x:186, y:157, r:12},
    // Top of the key 3 — at the arc peak (basket y=20 + r=150 → y=170)
    {id:"three_center", label:"Top 3",  short:"T3",  x:113, y:172, r:14},
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
              {z.short || z.label}
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
  const [weekGoal, setWeekGoal] = useState(()=>{
    try{ return parseInt(localStorage.getItem("fkh-shot-goal")||"100"); }catch{ return 100; }
  });
  const [editingGoal, setEditingGoal] = useState(false);

  const save = nl => { setLog(nl); try{localStorage.setItem("shot_log_v2",JSON.stringify(nl))}catch{} };

  const saveGoal = g => {
    setWeekGoal(g);
    try{ localStorage.setItem("fkh-shot-goal", String(g)); }catch{}
  };

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

  // Weekly makes: Monday → today
  const weekMakes = useMemo(()=>{
    const now = new Date();
    const mondayOffset = (now.getDay()+6)%7; // days since last Mon (0=Mon)
    let makes = 0;
    for (let i = 0; i <= mondayOffset; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - mondayOffset + i);
      const k = d.toLocaleDateString("en-CA");
      makes += (log[k]||[]).filter(s=>s.made!==false).length;
    }
    return makes;
  },[log]);

  // Days remaining in the week (Mon–Sun), including today
  const daysLeftInWeek = useMemo(()=>{
    const dow = new Date().getDay(); // 0=Sun
    return dow===0 ? 1 : 7-dow; // Sun=last day; Mon=7 left
  },[]);

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
      {/* ── Weekly Goal Widget ───────────────────────────────── */}
      {(()=>{
        const pct      = Math.min(1, weekMakes / weekGoal);
        const reached  = weekMakes >= weekGoal;
        const barColor = reached
          ? "linear-gradient(90deg,#22c55e,#16a34a)"
          : pct >= 0.75
            ? `linear-gradient(90deg,${P},#22c55e)`
            : pct >= 0.4
              ? `linear-gradient(90deg,${P},${S})`
              : `linear-gradient(90deg,${P}cc,${P})`;
        const glowColor = reached ? "#22c55e" : P;
        const numColor  = reached ? "#22c55e" : pct >= 0.75 ? "#86efac" : "#f1f5f9";

        return (
          <div style={{ padding:"12px 16px 10px",borderBottom:`1px solid ${bd}` }}>
            {/* Top row: counter + set-goal button */}
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:9 }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:6 }}>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:30,fontWeight:800,
                  color:numColor,lineHeight:1,
                  textShadow:reached?`0 0 20px #22c55e80`:pct>0.4?`0 0 16px ${P}60`:"none",
                  transition:"color 0.4s,text-shadow 0.4s" }}>
                  {weekMakes}
                </span>
                <span style={{ fontSize:13,color:"#475569",paddingBottom:2 }}>
                  / {weekGoal} makes this week
                </span>
                {reached && (
                  <span style={{ fontSize:12,animation:"fkh-bounce 0.5s ease-out both" }}>🎯</span>
                )}
              </div>
              <button onClick={()=>setEditingGoal(e=>!e)}
                style={{ fontSize:10,color:editingGoal?P:"#475569",
                  background:editingGoal?`${P}14`:"transparent",
                  border:`1px solid ${editingGoal?P+"40":"rgba(255,255,255,0.1)"}`,
                  borderRadius:8,padding:"5px 11px",cursor:"pointer",fontWeight:600,
                  transition:"all 0.2s" }}>
                {editingGoal ? "Done ✓" : "Set Goal"}
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ position:"relative",height:10,background:"rgba(255,255,255,0.06)",
              borderRadius:99,overflow:"visible",marginBottom:6 }}>
              <div style={{ height:"100%",borderRadius:99,
                background:barColor,
                width:`${pct*100}%`,
                transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)",
                boxShadow:`0 0 12px ${glowColor}70`,
                position:"relative",overflow:"hidden" }}>
                {/* Shimmer when not complete */}
                {!reached && pct>0.05 && (
                  <div style={{ position:"absolute",inset:0,
                    background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)",
                    backgroundSize:"200% 100%",
                    animation:"fkh-shimmer 2s linear infinite" }}/>
                )}
              </div>
            </div>

            {/* Sub-row: % + pace */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,
                  fontWeight:700,color:glowColor }}>
                  {Math.round(pct*100)}%
                </span>
                {!reached && weekMakes>0 && (
                  <span style={{ fontSize:10,color:"#334155" }}>
                    · {weekGoal-weekMakes} to go
                  </span>
                )}
                {reached && (
                  <span style={{ fontSize:10,color:"#22c55e",fontWeight:600 }}>
                    · Goal smashed! 🏀
                  </span>
                )}
              </div>
              <span style={{ fontSize:10,color:"#334155",fontFamily:"'DM Mono',monospace" }}>
                {daysLeftInWeek}d left in week
              </span>
            </div>

            {/* Goal presets (shown when editing) */}
            {editingGoal && (
              <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:9,color:"#475569",letterSpacing:"0.1em",
                  textTransform:"uppercase",fontFamily:"'DM Mono',monospace",marginBottom:8 }}>
                  Weekly makes target
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {[50,100,150,200,300,500].map(n=>(
                    <button key={n} onClick={()=>{ saveGoal(n); setEditingGoal(false); }}
                      style={{ padding:"6px 13px",borderRadius:9,cursor:"pointer",
                        border:`1px solid ${weekGoal===n?P+"60":"rgba(255,255,255,0.1)"}`,
                        background:weekGoal===n?`${P}20`:"rgba(255,255,255,0.04)",
                        color:weekGoal===n?P:"#94a3b8",
                        fontSize:13,fontWeight:weekGoal===n?800:500,
                        boxShadow:weekGoal===n?`0 0 8px ${P}40`:"none",
                        transition:"all 0.15s" }}>
                      {n}
                    </button>
                  ))}
                  {/* Custom input */}
                  <div style={{ display:"flex",alignItems:"center",gap:4,
                    background:"rgba(255,255,255,0.04)",borderRadius:9,
                    border:"1px solid rgba(255,255,255,0.1)",padding:"0 8px" }}>
                    <input
                      type="number" inputMode="numeric" min="1"
                      placeholder="Custom"
                      style={{ width:60,background:"transparent",border:"none",outline:"none",
                        color:"#94a3b8",fontSize:13,padding:"6px 0",
                        WebkitAppearance:"none",MozAppearance:"textfield" }}
                      onKeyDown={e=>{
                        if (e.key==="Enter" && e.target.value) {
                          const v = Math.max(1, parseInt(e.target.value)||100);
                          saveGoal(v); setEditingGoal(false); e.target.value="";
                        }
                      }}
                    />
                    <span style={{ fontSize:9,color:"#334155" }}>↵</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
                    onFocus={e=>e.target.select()}
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
                    onFocus={e=>e.target.select()}
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
            <StackedBars data={histData} priColor={P} height={160} selDate={selDate} onSelect={setSelDate}/>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:12 }}>
              {SHOT_TYPES.filter(t=>histData.some(d=>(d.byShotType[t.id]||0)>0)).map(t=>(
                <div key={t.id} style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <div style={{ width:9,height:9,borderRadius:2,background:SHOT_COLORS[t.id],flexShrink:0 }}/>
                  <span style={{ fontSize:10,fontWeight:600,color:P }}>{t.label}</span>
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

/* ═══════════════════════ BADGE CELEBRATION ════════════════ */
function BadgeCelebration({ badge, onDismiss }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",
      justifyContent:"center",padding:24,
      background:"radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, rgba(6,11,20,0.92) 60%)" }}>
      {/* click backdrop to dismiss */}
      <div onClick={onDismiss} style={{ position:"absolute",inset:0 }}/>

      <div style={{ position:"relative",textAlign:"center",maxWidth:320,width:"100%",zIndex:1,
        animation:"fkh-scale-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>

        {/* Pulse rings */}
        <div style={{ position:"relative",display:"inline-block",marginBottom:16 }}>
          <div style={{ position:"absolute",inset:"-20px",borderRadius:"50%",
            border:`2px solid ${badge.color}`,
            animation:"fkh-pulse-ring 1.2s ease-out 0.3s infinite",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",inset:"-10px",borderRadius:"50%",
            border:`2px solid ${badge.color}88`,
            animation:"fkh-pulse-ring 1.2s ease-out 0.6s infinite",pointerEvents:"none" }}/>
          <div style={{ width:96,height:96,borderRadius:"50%",
            background:`${badge.color}20`,border:`3px solid ${badge.color}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:48,animation:"fkh-bounce 0.6s ease-out 0.3s 2 both" }}>
            {badge.emoji}
          </div>
        </div>

        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginBottom:8,
          animation:"fkh-fade-up 0.4s ease 0.5s both" }}>
          <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.3em",
            color:badge.color,textTransform:"uppercase" }}>
            Badge Unlocked!
          </div>
          {badge.cat && BADGE_CATS[badge.cat] && (
            <div style={{ fontSize:9,color:"#64748b",fontFamily:"'DM Mono',monospace",
              letterSpacing:"0.15em",textTransform:"uppercase" }}>
              {BADGE_CATS[badge.cat].emoji} {BADGE_CATS[badge.cat].label}
            </div>
          )}
        </div>
        <div style={{ fontSize:26,fontWeight:800,color:"#f1f5f9",marginBottom:8,lineHeight:1.2,
          animation:"fkh-fade-up 0.4s ease 0.6s both" }}>
          {badge.name}
        </div>
        <div style={{ fontSize:13,color:"#94a3b8",marginBottom:28,lineHeight:1.5,
          animation:"fkh-fade-up 0.4s ease 0.7s both" }}>
          {badge.desc}
        </div>

        <button onClick={onDismiss}
          style={{ padding:"14px 36px",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",
            background:badge.color,border:"none",color:"#000",
            animation:"fkh-fade-up 0.4s ease 0.8s both",
            boxShadow:`0 0 24px ${badge.color}55` }}>
          Awesome! 🎉
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ CALENDAR VIEW ═════════════════════ */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_HEADERS = ["M","T","W","T","F","S","S"];

function CalendarView({ completed, P, S, BG, SF, bd, lbl }) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(()=>new Date(now.getFullYear(),now.getMonth(),1));
  const [selDate,  setSelDate]  = useState(now.toLocaleDateString("en-CA"));

  const calData = useMemo(()=>buildCalendarData(completed),[completed]);

  const year = viewDate.getFullYear();
  const mon  = viewDate.getMonth();
  const monthKey = `${year}-${String(mon+1).padStart(2,"0")}`;

  // Mon-first calendar cells
  const firstDow   = new Date(year,mon,1).getDay();         // 0=Sun
  const startPad   = (firstDow+6)%7;                        // Mon=0 offset
  const daysInMon  = new Date(year,mon+1,0).getDate();
  const cells = [];
  for (let i=0;i<startPad;i++) cells.push(null);
  for (let d=1;d<=daysInMon;d++) cells.push(d);

  const todayStr = now.toLocaleDateString("en-CA");

  // Month-level stats
  const monthEntries = Object.entries(calData).filter(([d])=>d.startsWith(monthKey));
  const monthXP      = monthEntries.reduce((s,[,v])=>s+v.xp,0);
  const monthDays    = monthEntries.length;
  const monthDrills  = monthEntries.reduce((s,[,v])=>s+v.totalDrills,0);
  const monthMaxStr  = monthEntries.length>0 ? Math.max(...monthEntries.map(([,v])=>v.streakDay||0)) : 0;

  const selData      = calData[selDate];
  const selInMonth   = selDate.startsWith(monthKey);
  const isNowMonth   = year===now.getFullYear() && mon===now.getMonth();

  // intensity → opacity suffix (same pattern used app-wide)
  const intensityBg = (count) => {
    if (count===0) return "rgba(255,255,255,0.03)";
    if (count<=2)  return "rgba(255,255,255,0.07)";
    if (count<=5)  return "rgba(255,255,255,0.12)";
    return "rgba(255,255,255,0.20)";
  };

  return (
    <div style={{ padding:"4px 20px 20px" }}>

      {/* ── Month nav ──────────────────────────────────────────── */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
        <button onClick={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}
          style={{ width:36,height:36,borderRadius:8,border:`1px solid ${bd}`,
            background:"transparent",color:"#64748b",fontSize:20,cursor:"pointer",fontWeight:300 }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:16,fontWeight:800,color:"#f1f5f9" }}>{MONTH_NAMES[mon]}</div>
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>{year}</div>
        </div>
        <button onClick={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}
          disabled={isNowMonth}
          style={{ width:36,height:36,borderRadius:8,border:`1px solid ${bd}`,
            background:"transparent",color:isNowMonth?"#1e293b":"#64748b",
            fontSize:20,cursor:isNowMonth?"default":"pointer",fontWeight:300 }}>›</button>
      </div>

      {/* ── Day headers ───────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4 }}>
        {DOW_HEADERS.map((d,i)=>(
          <div key={i} style={{ textAlign:"center",fontSize:9,fontWeight:700,
            color:"#334155",fontFamily:"'DM Mono',monospace",padding:"3px 0",letterSpacing:"0.06em" }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:14 }}>
        {cells.map((day,i)=>{
          if (!day) return <div key={`p${i}`}/>;
          const dateStr = `${year}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const data    = calData[dateStr];
          const isToday = dateStr===todayStr;
          const isFuture= new Date(dateStr+"T12:00:00")>now;
          const isSel   = dateStr===selDate && selInMonth;
          const cnt     = data?.totalDrills||0;

          return (
            <div key={i} onClick={()=>{ if(!isFuture) setSelDate(dateStr); }}
              style={{
                borderRadius:8,padding:"5px 3px 4px",
                minHeight:50,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"space-between",
                background: isSel ? `${P}28` : intensityBg(cnt),
                border:`1.5px solid ${isSel?P:isToday?`${P}60`:"transparent"}`,
                cursor:isFuture?"default":"pointer",
                opacity:isFuture?0.2:1,
                transition:"background 0.15s, border 0.15s",
              }}>

              {/* Day number */}
              <div style={{ fontSize:11,fontWeight:isToday?800:500,lineHeight:1,
                color:isSel?P:isToday?P:cnt>0?"#cbd5e1":"#475569" }}>
                {day}
              </div>

              {/* Category dots */}
              {data?.cats.length>0&&(
                <div style={{ display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center" }}>
                  {data.cats.slice(0,4).map((cat,ci)=>(
                    <div key={ci} style={{ width:5,height:5,borderRadius:"50%",
                      background:CAT_DOT_COLORS[cat]||"#64748b",flexShrink:0 }}/>
                  ))}
                </div>
              )}

              {/* XP micro-label */}
              {data?.xp>0&&(
                <div style={{ fontSize:7,fontFamily:"'DM Mono',monospace",
                  color:isSel?P:"#475569",lineHeight:1,marginTop:1 }}>
                  {data.xp}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Month summary ─────────────────────────────────────── */}
      {monthDays>0&&(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
          {[
            { v:monthDays,   l:"Days" },
            { v:monthDrills, l:"Drills" },
            { v:monthXP,     l:"XP" },
            { v:monthMaxStr>0?`${monthMaxStr}🔥`:"—", l:"Best Streak" },
          ].map(({ v,l })=>(
            <div key={l} style={{ background:SF,border:`1px solid ${bd}`,borderRadius:10,
              padding:"9px 6px",textAlign:"center" }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:800,
                color:P,lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:8,color:"#334155",marginTop:3,
                textTransform:"uppercase",letterSpacing:"0.07em" }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Selected day detail ───────────────────────────────── */}
      {selInMonth&&selData ? (
        <div style={{ background:`${P}0d`,border:`1px solid ${P}22`,borderRadius:14,
          padding:"14px 16px",animation:"fkh-fade-up 0.22s ease both" }}>

          {/* Day header */}
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14,fontWeight:800,color:"#f1f5f9",lineHeight:1.2 }}>
                {new Date(selDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
              </div>
              <div style={{ fontSize:11,color:"#64748b",marginTop:4,display:"flex",gap:8,flexWrap:"wrap" }}>
                {selData.totalDrills>0&&<span>{selData.totalDrills} drill{selData.totalDrills!==1?"s":""}</span>}
                {selData.shots>0&&<span>🏀 {selData.shots} shots</span>}
                {selData.streakDay>1&&<span style={{ color:"#f97316" }}>Day {selData.streakDay} streak 🔥</span>}
              </div>
            </div>
            <div style={{ textAlign:"right",flexShrink:0 }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:800,color:P,lineHeight:1 }}>
                {selData.xp}
              </div>
              <div style={{ fontSize:9,color:"#475569",letterSpacing:"0.08em" }}>XP</div>
            </div>
          </div>

          {/* Category chips */}
          {selData.cats.length>0&&(
            <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:10 }}>
              {selData.cats.map(cat=>{
                const c=CAT_DOT_COLORS[cat]||"#64748b";
                return (
                  <span key={cat} style={{ display:"flex",alignItems:"center",gap:4,
                    padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,
                    background:`${c}18`,color:c,border:`1px solid ${c}30` }}>
                    {CATS[cat]?.emoji||"•"} {CATS[cat]?.label.split(" ")[0]||cat}
                  </span>
                );
              })}
            </div>
          )}

          {/* Exercise list */}
          <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
            {selData.exs.map((ex,i)=>{
              const c=CAT_DOT_COLORS[ex._cat]||"#64748b";
              return (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8,
                  padding:"7px 9px",borderRadius:8,
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:c,flexShrink:0 }}/>
                  <span style={{ fontSize:12,color:"#e2e8f0",flex:1,fontWeight:500,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ex.name}</span>
                  <span style={{ fontSize:9,color:"#334155",fontFamily:"'DM Mono',monospace",flexShrink:0 }}>+5 XP</span>
                  <span style={{ color:"#22c55e",fontSize:13,flexShrink:0 }}>✓</span>
                </div>
              );
            })}
            {selData.shots>0&&(
              <div style={{ display:"flex",alignItems:"center",gap:8,
                padding:"7px 9px",borderRadius:8,
                background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background:"#f97316",flexShrink:0 }}/>
                <span style={{ fontSize:12,color:"#e2e8f0",flex:1,fontWeight:500 }}>🏀 {selData.shots} shots made</span>
                <span style={{ fontSize:9,color:"#334155",fontFamily:"'DM Mono',monospace",flexShrink:0 }}>
                  +{Math.floor(selData.shots/10)*5} XP
                </span>
                <span style={{ color:"#22c55e",fontSize:13,flexShrink:0 }}>✓</span>
              </div>
            )}
          </div>
        </div>

      ) : selInMonth ? (
        <div style={{ textAlign:"center",padding:"18px 0",color:"#334155" }}>
          <div style={{ fontSize:13,marginBottom:4 }}>
            {new Date(selDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
          <div style={{ fontSize:11,color:"#1e293b" }}>No training logged this day</div>
        </div>
      ) : null}

      {/* ── Empty month state ─────────────────────────────────── */}
      {monthDays===0&&(
        <div style={{ textAlign:"center",padding:"36px 0" }}>
          <div style={{ fontSize:36,marginBottom:12 }}>📅</div>
          <div style={{ fontSize:14,fontWeight:600,color:"#475569",marginBottom:4 }}>
            No workouts logged this month
          </div>
          <div style={{ fontSize:12,color:"#334155" }}>
            Complete exercises to build your training history.
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ HISTORY VIEW ══════════════════════ */
function HistoryView({ completed, badgeDates, settings, P, S, ST, BG, SF, bd, lbl, onBack }) {
  const data = useMemo(() => buildHistoryData(completed, badgeDates), [completed, badgeDates]);
  const {
    totalWorkoutDays, totalExercises, totalMinutes,
    currentStreak, longestStreak, totalShots,
    weeklyData, categoryStats, recentActivity, coachInsights,
    dayExMap, dayStreakMap,
  } = data;

  const todayStr = new Date().toLocaleDateString("en-CA");
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  // ── Calendar helpers ──────────────────────────────────────────
  const calYear  = calMonth.getFullYear();
  const calMon   = calMonth.getMonth();
  const firstDay = new Date(calYear, calMon, 1);
  const lastDay  = new Date(calYear, calMon + 1, 0);
  // Mon=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const calCells = [];
  for (let i = 0; i < startOffset; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);

  const nowForCal = new Date();
  const currentMonthKey = `${nowForCal.getFullYear()}-${String(nowForCal.getMonth()+1).padStart(2,"0")}`;
  const thisCalKey = `${calYear}-${String(calMon+1).padStart(2,"0")}`;
  const canGoForward = thisCalKey < currentMonthKey;

  // ── Weekly chart helpers ──────────────────────────────────────
  const maxWorkouts = Math.max(1, ...weeklyData.map(w => w.workouts));
  const totalWeekWorkouts = weeklyData.reduce((a, w) => a + w.workouts, 0);
  const totalWeekMins     = weeklyData.reduce((a, w) => a + w.minutes, 0);

  // ── Category stats helpers ────────────────────────────────────
  const maxCatCount = categoryStats.length > 0 ? categoryStats[0][1].count : 1;
  const totalCatCount = categoryStats.reduce((a, [, v]) => a + v.count, 0);

  const calMonLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", background:BG, color:"#e2e8f0", minHeight:"100vh", maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column" }}>

      {/* ── Fixed Header ──────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${P}14`, position:"sticky", top:0, background:BG, backdropFilter:"blur(10px)", zIndex:10, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:`${P}14`, border:`1px solid ${P}30`, borderRadius:8, color:P, fontSize:12, fontWeight:700, cursor:"pointer", padding:"5px 10px" }}>← Back</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#f1f5f9" }}>Training History</div>
          <div style={{ fontSize:10, color:`${P}99`, fontFamily:"'DM Mono',monospace" }}>{settings.athleteName}</div>
        </div>
        <span style={{ fontSize:20 }}>📊</span>
      </div>

      {/* ── Scrollable Body ────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 20px 100px" }}>

        {/* ── Stats Grid ──────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:18, marginBottom:18 }}>
          {[
            { val: totalWorkoutDays,                  label: "Workout Days" },
            { val: totalExercises,                    label: "Exercises Done" },
            { val: totalMinutes,                      label: "Training Mins" },
            { val: currentStreak + "🔥",              label: "Current Streak" },
            { val: longestStreak + "⭐",              label: "Longest Streak" },
            { val: totalShots.toLocaleString(),       label: "Total Shots" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background:SF, border:`1px solid ${bd}`, borderRadius:13, padding:"14px 10px", textAlign:"center" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:800, color:P, lineHeight:1, marginBottom:5 }}>{val}</div>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Training Calendar ────────────────────────────────── */}
        <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
          {/* Month nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(), m.getMonth()-1, 1))}
              style={{ background:`${P}14`, border:`1px solid ${P}30`, borderRadius:8, color:P, fontSize:14, fontWeight:700, cursor:"pointer", padding:"4px 10px", lineHeight:1 }}>‹</button>
            <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{calMonLabel}</div>
            <button onClick={()=>{ if(canGoForward) setCalMonth(m=>new Date(m.getFullYear(), m.getMonth()+1, 1)); }}
              style={{ background:canGoForward?`${P}14`:"rgba(255,255,255,0.03)", border:`1px solid ${canGoForward?P+"30":"rgba(255,255,255,0.05)"}`, borderRadius:8, color:canGoForward?P:"#334155", fontSize:14, fontWeight:700, cursor:canGoForward?"pointer":"default", padding:"4px 10px", lineHeight:1 }}>›</button>
          </div>

          {/* Weekday header */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d=>(
              <div key={d} style={{ textAlign:"center", fontSize:9, color:"#475569", fontFamily:"'DM Mono',monospace", padding:"2px 0" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {calCells.map((dayNum, i) => {
              if (!dayNum) return <div key={`e-${i}`}/>;
              const ds = `${calYear}-${String(calMon+1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`;
              const isToday   = ds === todayStr;
              const isFuture  = ds > todayStr;
              const count     = dayExMap[ds]?.length || 0;
              const streakNum = dayStreakMap[ds] || 0;
              const heat = count === 0 ? "transparent" : count <= 2 ? `${P}22` : count <= 5 ? `${P}44` : `${P}70`;
              const bg   = isToday ? P : heat;
              const txt  = isToday ? "#000" : "#e2e8f0";
              const bord = (!isToday && streakNum > 1 && count > 0) ? `1px solid ${P}50` : `1px solid transparent`;
              return (
                <div key={ds} style={{ aspectRatio:"1", borderRadius:6, background:bg, border:bord, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", opacity:isFuture?0.25:1, position:"relative" }}>
                  <div style={{ fontSize:10, fontWeight:isToday?800:500, color:txt, lineHeight:1 }}>{dayNum}</div>
                  {count > 0 && !isToday && <div style={{ width:4, height:4, borderRadius:"50%", background:P, marginTop:2 }}/>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10, justifyContent:"flex-end" }}>
            <span style={{ fontSize:9, color:"#475569" }}>Light</span>
            {[`${P}22`, `${P}44`, `${P}70`].map((c, i) => (
              <div key={i} style={{ width:12, height:12, borderRadius:3, background:c }}/>
            ))}
            <span style={{ fontSize:9, color:"#475569" }}>Heavy</span>
          </div>
        </div>

        {/* ── Weekly Activity Chart ─────────────────────────────── */}
        <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
          <div style={lbl}>Weekly Activity</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80, marginBottom:8 }}>
            {weeklyData.map(w => {
              const isCurrent = w.weekStart === new Date().toLocaleDateString("en-CA").slice(0,7).replace(/-(\d+)$/,"") || (() => {
                // check if this week contains today
                const wStart = new Date(w.weekStart + "T12:00:00");
                const wEnd   = new Date(w.weekStart + "T12:00:00"); wEnd.setDate(wEnd.getDate() + 6);
                const tDay   = new Date(todayStr + "T12:00:00");
                return tDay >= wStart && tDay <= wEnd;
              })();
              const barH = maxWorkouts === 0 ? 0 : Math.max(w.workouts > 0 ? 4 : 0, Math.round((w.workouts / maxWorkouts) * 64));
              return (
                <div key={w.weekStart} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
                  <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                    <div style={{ width:"100%", height:barH, borderRadius:"3px 3px 0 0", background:isCurrent ? P : `${P}70` }}/>
                  </div>
                  <div style={{ fontSize:8, color:isCurrent?P:"#475569", fontFamily:"'DM Mono',monospace", marginTop:4, textAlign:"center", lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>{w.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:10, color:"#475569", textAlign:"center", marginTop:4 }}>
            {totalWeekWorkouts} workout days · {totalWeekMins} min trained <span style={{ fontSize:9, color:"#334155" }}>(last 8 weeks)</span>
          </div>
        </div>

        {/* ── Category Breakdown ───────────────────────────────── */}
        {categoryStats.length > 0 && (
          <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={lbl}>Category Breakdown</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {categoryStats.map(([cat, info]) => {
                const catInfo  = CATS[cat] || { label: cat, emoji:"🏋️" };
                const dotColor = CAT_DOT_COLORS[cat] || P;
                const pct      = totalCatCount === 0 ? 0 : info.count / totalCatCount;
                const lastD    = info.lastDate ? new Date(info.lastDate + "T12:00:00") : null;
                const daysAgo  = lastD ? Math.floor((new Date(todayStr + "T12:00:00") - lastD) / 86400000) : null;
                return (
                  <div key={cat}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:14 }}>{catInfo.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{catInfo.label}</div>
                        {daysAgo !== null && <div style={{ fontSize:9, color:"#475569" }}>last trained {daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}</div>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, color:dotColor }}>{info.count}</div>
                        <div style={{ fontSize:9, color:"#475569" }}>{Math.round(pct * 100)}%</div>
                      </div>
                    </div>
                    <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct*100}%`, background:dotColor, borderRadius:99 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Coach FKH Insights ───────────────────────────────── */}
        {coachInsights.length > 0 && (
          <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={lbl}>Coach FKH Insights</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {coachInsights.map((insight, i) => (
                <div key={i} style={{ background:`${P}0d`, border:`1px solid ${P}1e`, borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:18, lineHeight:1, flexShrink:0, marginTop:1 }}>{insight.emoji}</span>
                  <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>{insight.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent Activity Feed ──────────────────────────────── */}
        {recentActivity.length > 0 && (
          <div style={{ background:SF, border:`1px solid ${bd}`, borderRadius:16, padding:"16px", marginBottom:16 }}>
            <div style={lbl}>Recent Activity</div>
            <div style={{ position:"relative" }}>
              {/* Vertical timeline line */}
              <div style={{ position:"absolute", left:19, top:16, bottom:16, width:1, background:`${P}20` }}/>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {recentActivity.map(event => {
                  const fmtD = new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
                  if (event.type === "workout") {
                    return (
                      <div key={event.key} style={{ display:"flex", alignItems:"flex-start", gap:12, position:"relative", zIndex:1 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:`${P}18`, border:`1.5px solid ${P}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>🏋️</div>
                        <div style={{ flex:1, paddingTop:2 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", marginBottom:2 }}>{event.exCount} exercise{event.exCount!==1?"s":""} completed</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:3 }}>
                            {event.cats.map(cat => (
                              <span key={cat} style={{ fontSize:9, padding:"2px 6px", borderRadius:20, background:`${CAT_DOT_COLORS[cat]||P}18`, color:CAT_DOT_COLORS[cat]||P, fontWeight:600 }}>
                                {CATS[cat]?.emoji} {CATS[cat]?.label || cat}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize:9, color:"#475569", fontFamily:"'DM Mono',monospace" }}>{fmtD}</div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={event.key} style={{ display:"flex", alignItems:"flex-start", gap:12, position:"relative", zIndex:1 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:`${event.badge.color}16`, border:`1.5px solid ${event.badge.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{event.badge.emoji}</div>
                        <div style={{ flex:1, paddingTop:2 }}>
                          <div style={{ fontSize:9, fontWeight:700, color:event.badge.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:1 }}>Badge Unlocked!</div>
                          <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", marginBottom:1 }}>{event.badge.name}</div>
                          <div style={{ fontSize:9, color:"#475569", fontFamily:"'DM Mono',monospace" }}>{fmtD}</div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalWorkoutDays === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#475569", marginBottom:8 }}>No training history yet</div>
            <div style={{ fontSize:12, color:"#334155" }}>Complete exercises to start building your history.</div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ═══════════════════════ PROFILE VIEW ══════════════════════ */
/* ═══════════════════════ BADGES VIEW ══════════════════════ */
function BadgesView({ earnedBadges, badgeDates, completed, P, S, BG, SF, bd, lbl }) {
  const chainsComplete = PROGRESSION_CHAINS.filter(c => {
    const { progress, total } = getChainStatus(c, completed);
    return progress === total;
  }).length;

  return (
    <div style={{ padding:"0 20px 100px" }}>

      {/* Summary hero */}
      <div style={{ display:"flex",gap:10,marginBottom:22,marginTop:4 }}>
        <div style={{ flex:1,textAlign:"center",background:`${P}0d`,border:`1px solid ${P}20`,borderRadius:14,padding:"16px 8px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:32,fontWeight:800,color:P,lineHeight:1 }}>
            {earnedBadges.length}
          </div>
          <div style={{ fontSize:10,color:"#475569",marginTop:4 }}>of {BADGES_DEF.length} badges</div>
        </div>
        <div style={{ flex:1,textAlign:"center",background:`${S}0d`,border:`1px solid ${S}20`,borderRadius:14,padding:"16px 8px" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:32,fontWeight:800,color:S,lineHeight:1 }}>
            {chainsComplete}
          </div>
          <div style={{ fontSize:10,color:"#475569",marginTop:4 }}>of {PROGRESSION_CHAINS.length} tracks</div>
        </div>
      </div>

      {/* Upcoming Unlocks ───────────────────────────────────── */}
      {(()=>{
        const upcoming = BADGES_DEF
          .filter(b => !earnedBadges.includes(b.id))
          .map(b => { const { cur, target } = getBadgeProgress(b, completed); return { ...b, cur, target, pct: Math.min(1, cur / target) }; })
          .sort((a, b) => b.pct - a.pct || a.target - b.target)
          .slice(0, 3);
        if (!upcoming.length) return null;
        return (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={lbl}>Upcoming Unlocks</div>
              <div style={{ fontSize:9,color:"#475569",fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>almost there</div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
              {upcoming.map(badge => {
                const pctDisplay = Math.round(badge.pct * 100);
                const remaining  = badge.target - badge.cur;
                return (
                  <div key={badge.id} style={{
                    padding:"13px 14px",borderRadius:14,
                    background:`${badge.color}10`,
                    border:`1px solid ${badge.color}2a`,
                  }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:9 }}>
                      <div style={{
                        width:36,height:36,borderRadius:10,flexShrink:0,
                        background:`${badge.color}1a`,border:`1.5px solid ${badge.color}40`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
                      }}>🔓</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:badge.color,lineHeight:1.2,marginBottom:2 }}>{badge.name}</div>
                        <div style={{ fontSize:10,color:"#64748b",lineHeight:1.3 }}>{badge.desc}</div>
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:800,color:badge.color,flexShrink:0 }}>
                        {pctDisplay}%
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                      <div style={{ height:"100%",borderRadius:99,background:badge.color,width:`${pctDisplay}%`,transition:"width 0.5s ease" }} />
                    </div>
                    <div style={{ marginTop:5,fontSize:9,color:"#475569",textAlign:"right",fontFamily:"'DM Mono',monospace" }}>
                      {badge.cur}/{badge.target} · {remaining} to go
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Badge Collection ───────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div style={lbl}>Badges</div>
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
            {earnedBadges.length}/{BADGES_DEF.length} earned
          </div>
        </div>

        {Object.entries(BADGE_CATS).map(([catKey, catMeta])=>{
          const catBadges = BADGES_DEF.filter(b=>b.cat===catKey);
          const catEarned = catBadges.filter(b=>earnedBadges.includes(b.id)).length;
          return (
            <div key={catKey} style={{ marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:9 }}>
                <span style={{ fontSize:13 }}>{catMeta.emoji}</span>
                <span style={{ fontSize:10,fontWeight:700,color:"#64748b",
                  textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"'DM Mono',monospace" }}>
                  {catMeta.label}
                </span>
                <span style={{ marginLeft:"auto",fontSize:9,color:"#334155",
                  fontFamily:"'DM Mono',monospace" }}>
                  {catEarned}/{catBadges.length}
                </span>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {catBadges.map(badge=>{
                  const earned   = earnedBadges.includes(badge.id);
                  const earnDate = badgeDates?.[badge.id];
                  const fmtDate  = earnDate
                    ? new Date(earnDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                    : null;
                  return (
                    <div key={badge.id} style={{
                      display:"flex",alignItems:"flex-start",gap:10,padding:"12px 12px",borderRadius:13,
                      background:earned?`${badge.color}0e`:"rgba(255,255,255,0.025)",
                      border:`1px solid ${earned?badge.color+"28":"rgba(255,255,255,0.05)"}`,
                      opacity:earned?1:0.4,transition:"all 0.3s",
                    }}>
                      <div style={{ width:38,height:38,borderRadius:11,flexShrink:0,
                        background:earned?`${badge.color}16`:"rgba(255,255,255,0.04)",
                        border:`1.5px solid ${earned?badge.color+"38":"rgba(255,255,255,0.06)"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:19,boxShadow:earned?`0 0 14px ${badge.color}28`:"none" }}>
                        {earned ? badge.emoji : "🔒"}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,fontWeight:700,lineHeight:1.25,
                          color:earned?badge.color:"#334155",marginBottom:2 }}>
                          {badge.name}
                        </div>
                        <div style={{ fontSize:9,color:earned?"#475569":"#1e293b",lineHeight:1.4 }}>
                          {badge.desc}
                        </div>
                        {earned && fmtDate && (
                          <div style={{ fontSize:8,color:"#334155",marginTop:3,
                            fontFamily:"'DM Mono',monospace" }}>
                            {fmtDate}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progression Tracks ─────────────────────────────── */}
      <div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
          <div style={lbl}>Progression Tracks</div>
          <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
            {chainsComplete}/{PROGRESSION_CHAINS.length} complete
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
          {PROGRESSION_CHAINS.map(chain=>{
            const { steps, progress, total } = getChainStatus(chain, completed);
            const catC = CAT_DOT_COLORS[chain.cat] || P;
            const done = progress === total;
            const activeStep = steps.find(s => s.unlocked && !s.mastered);
            return (
              <div key={chain.id} style={{
                borderRadius:13,padding:"13px 14px",
                background:done?`${catC}0c`:"rgba(255,255,255,0.03)",
                border:`1px solid ${done?catC+"30":"rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                  <span style={{ fontSize:20,lineHeight:1 }}>{chain.emoji}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,
                      color:done?catC:"#e2e8f0",lineHeight:1.2,marginBottom:1 }}>
                      {chain.name}
                    </div>
                    <div style={{ fontSize:10,color:"#475569" }}>{progress}/{total} mastered</div>
                  </div>
                  {done
                    ? <span style={{ fontSize:11,color:"#22c55e",fontWeight:800 }}>✓ Done</span>
                    : progress > 0
                      ? <span style={{ fontSize:10,color:catC,fontFamily:"'DM Mono',monospace",
                          background:`${catC}12`,padding:"2px 8px",borderRadius:20 }}>In Progress</span>
                      : null}
                </div>
                <div style={{ display:"flex",gap:4,marginBottom:activeStep?8:0 }}>
                  {steps.map(step=>(
                    <div key={step.exId} style={{ flex:1,height:4,borderRadius:99,
                      background:step.mastered?catC:step.unlocked?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)",
                      transition:"background 0.3s" }}/>
                  ))}
                </div>
                {activeStep && (
                  <div style={{ fontSize:10,color:"#64748b",fontFamily:"'DM Mono',monospace",lineHeight:1.4 }}>
                    {activeStep.count > 0
                      ? `${activeStep.ex?.name||activeStep.exId} — ${activeStep.count}/${activeStep.unlocksAt} sessions`
                      : `Next: ${activeStep.ex?.name||activeStep.exId}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function ProfileView({ settings, totalXP, xpData, currentLevel, earnedBadges, completed, badgeDates, P, S, ST, BG, SF, bd, lbl, onOpenSettings, onViewHistory, onViewBadges }) {
  const nextLevel = LEVELS.find(l=>l.rank===currentLevel.rank+1);
  const xpInLevel  = totalXP - currentLevel.xpMin;
  const xpSpan     = nextLevel ? nextLevel.xpMin - currentLevel.xpMin : 500;
  const pct        = nextLevel ? Math.min(1, xpInLevel / xpSpan) : 1;

  const xpRows = [
    { label:"Exercises completed", value:xpData.exXP,       unit:`${xpData.exXP/5} × 5 XP` },
    { label:"Workouts completed",  value:xpData.workoutXP,  unit:`${xpData.workoutXP/25} × 25 XP` },
    { label:"Challenges cleared",  value:xpData.challengeXP,unit:`${xpData.challengeXP/100} × 100 XP` },
    { label:"Badges earned",       value:xpData.badgeXP,    unit:`${Math.round(xpData.badgeXP/50)} × 50 XP` },
    { label:"Streak bonus",        value:xpData.streakXP,   unit:"consistency bonus" },
    { label:"Shots made",          value:xpData.shotXP,     unit:`${xpData.shotXP*50} makes → ${xpData.shotXP} XP` },
  ].filter(r=>r.value>0);

  return (
    <div style={{ padding:"0 20px 100px" }}>

      {/* Hero ── Avatar + Name + Level */}
      <div style={{ textAlign:"center",padding:"32px 0 24px" }}>
        <div style={{ position:"relative",display:"inline-block",marginBottom:14 }}>
          <div style={{ width:88,height:88,borderRadius:"50%",
            background:`${P}20`,border:`3px solid ${P}`,
            display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",margin:"0 auto" }}>
            {settings.avatar
              ? <img src={settings.avatar} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
              : <span style={{ fontSize:38 }}>👤</span>}
          </div>
          {/* Level badge overlay */}
          <div style={{ position:"absolute",bottom:-6,right:-6,
            background:BG,borderRadius:20,padding:"3px 9px",
            border:`1.5px solid ${P}`,fontSize:11,fontWeight:800,color:P }}>
            {currentLevel.emoji} {currentLevel.rank}
          </div>
        </div>
        <div style={{ fontSize:24,fontWeight:800,color:"#f1f5f9",marginBottom:4 }}>
          {settings.athleteName}
        </div>
        <div style={{ fontSize:14,color:P,fontWeight:700,marginBottom:4 }}>
          {currentLevel.emoji} {currentLevel.name}
        </div>
        {settings.dateOfBirth ? (
          <div style={{ fontSize:12,color:"#475569" }}>
            {isBirthday(settings.dateOfBirth)
              ? <span style={{ color:P,fontWeight:700 }}>🎂 Happy Birthday! Age {calcAge(settings.dateOfBirth)}</span>
              : `Age ${calcAge(settings.dateOfBirth)}`
            }
          </div>
        ) : (
          <div style={{ fontSize:11,color:"#334155" }}>Set your birthday in Settings</div>
        )}
      </div>

      {/* XP Bar ──────────────────────────────────────────────── */}
      <div style={{ background:`${P}0d`,border:`1px solid ${P}22`,borderRadius:16,padding:"18px 18px",marginBottom:16 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:800,color:P,lineHeight:1 }}>
              {totalXP.toLocaleString()}
            </div>
            <div style={{ fontSize:10,color:"#475569",marginTop:3,letterSpacing:"0.08em" }}>TOTAL XP</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#94a3b8" }}>
              {nextLevel ? `→ ${nextLevel.name}` : "Max Level 👑"}
            </div>
            {nextLevel && <div style={{ fontSize:10,color:"#475569",marginTop:2 }}>
              {(nextLevel.xpMin-totalXP).toLocaleString()} XP to go
            </div>}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:10,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden",marginBottom:8 }}>
          <div style={{
            height:"100%",borderRadius:99,transition:"width 1s ease",
            width:`${pct*100}%`,
            background:pct>=1
              ? `linear-gradient(90deg,${P},${ST})`
              : `linear-gradient(90deg,${P}aa,${P})`,
          }}/>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#334155",fontFamily:"'DM Mono',monospace" }}>
          <span>{currentLevel.name} ({currentLevel.xpMin} XP)</span>
          {nextLevel&&<span>{nextLevel.name} ({nextLevel.xpMin} XP)</span>}
        </div>

        {/* Level ladder */}
        <div style={{ display:"flex",gap:4,marginTop:12,justifyContent:"center" }}>
          {LEVELS.map(l=>(
            <div key={l.rank} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
              <div style={{ width:28,height:28,borderRadius:"50%",fontSize:14,
                display:"flex",alignItems:"center",justifyContent:"center",
                background:totalXP>=l.xpMin?`${P}22`:"rgba(255,255,255,0.04)",
                border:`2px solid ${totalXP>=l.xpMin?P:"rgba(255,255,255,0.07)"}` }}>
                {totalXP>=l.xpMin?l.emoji:<span style={{ fontSize:9,color:"#334155" }}>?</span>}
              </div>
              <div style={{ fontSize:7,color:totalXP>=l.xpMin?P:"#334155",textAlign:"center",
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.03em",lineHeight:1.2 }}>
                {l.name.split(" ").map((w,i)=><div key={i}>{w}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shooting Level ─────────────────────────────────────── */}
      {(()=>{
        const SHOT_TIERS = [
          { name:"100 Makes Club", emoji:"🏀", target:100,   color:"#60a5fa" },
          { name:"1K Shooter",     emoji:"🎯", target:1000,  color:"#f43f5e" },
          { name:"2.5K Shooter",   emoji:"🔮", target:2500,  color:"#8b5cf6" },
          { name:"5K Shooter",     emoji:"🌠", target:5000,  color:"#06b6d4" },
          { name:"10K Shooter",    emoji:"🏆", target:10000, color:"#f97316" },
        ];
        let allMakes = 0;
        try { const sl=JSON.parse(localStorage.getItem("shot_log_v2")||"{}"); allMakes=Object.values(sl).flatMap(v=>v).filter(s=>s.made!==false).length; } catch {}
        const tierIdx    = SHOT_TIERS.filter(t=>allMakes>=t.target).length - 1;
        const curTier    = tierIdx >= 0 ? SHOT_TIERS[tierIdx] : null;
        const nxtTier    = SHOT_TIERS[tierIdx+1] || null;
        const pctShot    = nxtTier
          ? Math.min(1, (allMakes - (curTier?.target||0)) / (nxtTier.target - (curTier?.target||0)))
          : 1;
        const tColor     = curTier?.color || "#60a5fa";
        return (
          <div style={{ background:`${tColor}0d`,border:`1px solid ${tColor}22`,borderRadius:16,padding:"18px 18px",marginBottom:16 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:28,fontWeight:800,color:tColor,lineHeight:1 }}>
                  {allMakes.toLocaleString()}
                </div>
                <div style={{ fontSize:10,color:"#475569",marginTop:3,letterSpacing:"0.08em" }}>SHOTS MADE</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13,fontWeight:700,color:curTier?tColor:"#475569" }}>
                  {curTier ? `${curTier.emoji} ${curTier.name}` : "🏀 Shooting Beginner"}
                </div>
                {nxtTier && <div style={{ fontSize:10,color:"#475569",marginTop:2 }}>
                  {(nxtTier.target - allMakes).toLocaleString()} makes to {nxtTier.name}
                </div>}
              </div>
            </div>
            <div style={{ height:8,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden",marginBottom:8 }}>
              <div style={{ height:"100%",borderRadius:99,transition:"width 1s ease",width:`${pctShot*100}%`,background:`linear-gradient(90deg,${tColor}aa,${tColor})` }}/>
            </div>
            {nxtTier && (
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#334155",fontFamily:"'DM Mono',monospace" }}>
                <span>{curTier?curTier.name:"Beginner"} ({(curTier?.target||0).toLocaleString()})</span>
                <span>{nxtTier.name} ({nxtTier.target.toLocaleString()})</span>
              </div>
            )}
            {/* Shooting tier ladder */}
            <div style={{ display:"flex",gap:4,marginTop:12,justifyContent:"center" }}>
              {SHOT_TIERS.map(t=>(
                <div key={t.name} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",fontSize:14,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background:allMakes>=t.target?`${t.color}22`:"rgba(255,255,255,0.04)",
                    border:`2px solid ${allMakes>=t.target?t.color:"rgba(255,255,255,0.07)"}` }}>
                    {allMakes>=t.target?t.emoji:<span style={{ fontSize:9,color:"#334155" }}>?</span>}
                  </div>
                  <div style={{ fontSize:6,color:allMakes>=t.target?t.color:"#334155",textAlign:"center",
                    fontFamily:"'DM Mono',monospace",letterSpacing:"0.02em",lineHeight:1.2 }}>
                    {t.name.split(" ").map((w,i)=><div key={i}>{w}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* XP Breakdown ───────────────────────────────────────── */}
      {xpRows.length>0&&(
        <div style={{ background:SF,border:`1px solid ${bd}`,borderRadius:14,padding:"14px 16px",marginBottom:16 }}>
          <div style={lbl}>XP Breakdown</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {xpRows.map(({ label,value,unit })=>(
              <div key={label} style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ flex:1,fontSize:12,color:"#94a3b8" }}>{label}</div>
                <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>{unit}</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:800,color:P,minWidth:48,textAlign:"right" }}>
                  +{value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges & Progression teaser ──────────────────────── */}
      <button onClick={onViewBadges}
        style={{ width:"100%",borderRadius:14,padding:"14px 16px",
          background:`${P}08`,border:`1px solid ${P}1c`,cursor:"pointer",
          textAlign:"left",marginBottom:4 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
          <span style={{ fontSize:13,fontWeight:700,color:P }}>🏅 Badges & Progression</span>
          <span style={{ fontSize:13,color:"#475569" }}>→</span>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          {/* Badges count */}
          <div style={{ flex:1,background:`${P}12`,borderRadius:10,padding:"10px 0",textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:24,fontWeight:800,color:P,lineHeight:1 }}>
              {earnedBadges.length}
            </div>
            <div style={{ fontSize:9,color:"#475569",marginTop:3 }}>of {BADGES_DEF.length} badges</div>
          </div>
          {/* Tracks count */}
          <div style={{ flex:1,background:`${P}12`,borderRadius:10,padding:"10px 0",textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:24,fontWeight:800,color:P,lineHeight:1 }}>
              {PROGRESSION_CHAINS.filter(c=>{
                const { progress, total } = getChainStatus(c, completed);
                return progress===total;
              }).length}
            </div>
            <div style={{ fontSize:9,color:"#475569",marginTop:3 }}>of {PROGRESSION_CHAINS.length} tracks</div>
          </div>
        </div>
      </button>

      {/* Settings link */}
      <div style={{ marginTop:24,textAlign:"center" }}>
        <button onClick={onOpenSettings}
          style={{ padding:"12px 28px",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b" }}>
          ⚙ Settings & Customization
        </button>
        <button onClick={onViewHistory}
          style={{ marginTop:10, padding:"12px 28px", borderRadius:12, fontSize:13, fontWeight:700,
            cursor:"pointer", background:`${P}14`, border:`1px solid ${P}30`, color:P, display:"block", margin:"10px auto 0" }}>
          📊 Training History
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════ EXERCISE DETAIL SHEET ════════════ */
function ExerciseDetailSheet({ exercise, color, bg2, brd, BG, SF, isDone, onToggle, onClose, onNext, completed, favored, onToggleFav }) {
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

  /* Progression chain ────────────────────────────────────── */
  const chain       = getChainForExercise(exercise.id);
  const chainStatus = chain ? getChainStatus(chain, completed) : null;

  /* Badges / labels ─────────────────────────────────────── */
  const diffColor = { beginner:"#22c55e", intermediate:"#f59e0b", advanced:"#ef4444" }[meta.difficulty] || "#64748b";
  const diffLabel = { beginner:"Beginner", intermediate:"Intermediate", advanced:"Advanced" }[meta.difficulty] || "All Levels";
  const mins      = meta.estimatedDuration ? Math.max(1,Math.round(meta.estimatedDuration/60)) : null;
  const eqLabel   = { none:"No Equipment", cones:"Cones", dumbbells:"Dumbbells", box:"Box / Step", bosu:"BOSU", jump_rope:"Jump Rope", ball:"Basketball", basketball:"Basketball", tennis_ball:"Tennis Ball", basketball_x2:"Two Basketballs", partner:"Partner", resistance_band:"Band" }[meta.equipment] || meta.equipment || "None";
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
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            {onToggleFav&&(
              <button onClick={onToggleFav}
                style={{ padding:"4px 9px",borderRadius:8,border:`1px solid ${favored?"rgba(250,204,21,0.4)":color+"25"}`,
                  background:favored?"rgba(250,204,21,0.12)":"transparent",
                  fontSize:15,cursor:"pointer",lineHeight:1 }}>
                {favored?"⭐":"☆"}
              </button>
            )}
            {isDone
              ? <span style={{ fontSize:11,fontWeight:700,color:"#22c55e",
                  padding:"4px 10px",background:"rgba(34,197,94,0.1)",
                  border:"1px solid rgba(34,197,94,0.2)",borderRadius:20 }}>✓ Done</span>
              : <div style={{ width:onToggleFav?0:56 }}/>}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>

          {/* Video — FKH original or YouTube fallback */}
          {exercise.videoSource === "fkh" ? (
            /* ── FKH Original Video ── */
            <a href={exercise.videoUrl || "#"}
              target="_blank" rel="noopener noreferrer"
              style={{ display:"block",position:"relative",background:"#000",aspectRatio:"16/9",overflow:"hidden",textDecoration:"none" }}>
              {exercise.thumbnailUrl
                ? <img src={exercise.thumbnailUrl} alt={exercise.name}
                    style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
                : <div style={{ width:"100%",height:"100%",background:"linear-gradient(135deg,#0f2027,#203a43,#2c5364)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:48 }}>🏀</span>
                  </div>
              }
              {/* gradient */}
              <div style={{ position:"absolute",inset:0,
                background:"linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)" }}/>
              {/* play btn */}
              <div style={{ position:"absolute",top:"50%",left:"50%",
                transform:"translate(-50%,-50%)",
                width:64,height:64,borderRadius:"50%",
                background:"rgba(0,0,0,0.72)",border:`2.5px solid ${color}`,
                display:"flex",alignItems:"center",justifyContent:"center" }}>
                <span style={{ color,fontSize:24,marginLeft:5 }}>▶</span>
              </div>
              {/* FKH badge */}
              <div style={{ position:"absolute",top:10,right:10,
                background:"linear-gradient(135deg,#16a34a,#15803d)",
                color:"#fff",fontSize:9,fontWeight:800,letterSpacing:"0.12em",
                padding:"4px 9px",borderRadius:6,textTransform:"uppercase",
                boxShadow:"0 2px 8px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)" }}>
                ✦ FKH Original
              </div>
              {/* title overlay */}
              <div style={{ position:"absolute",bottom:10,left:12,right:12,
                fontSize:11,color:"rgba(255,255,255,0.9)",fontWeight:600,
                textShadow:"0 1px 3px rgba(0,0,0,0.9)" }}>
                🎬 {exercise.name}
              </div>
            </a>
          ) : (
            /* ── YouTube Video ── */
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
          )}

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

            {/* Coach Tips (coachNotes — FKH first-party string) */}
            {exercise.coachNotes&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>💡</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:`${color}80`,textTransform:"uppercase" }}>
                    Coach Tips
                  </span>
                </div>
                <div style={{ background:`${color}0d`,borderRadius:12,padding:"13px 14px",
                  border:`1px solid ${color}28`,borderLeft:`3px solid ${color}` }}>
                  <p style={{ margin:0,fontSize:13,color:"#e2e8f0",lineHeight:1.65,fontWeight:500 }}>
                    {exercise.coachNotes}
                  </p>
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {exercise.commonMistakes?.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>⚠️</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:"#f59e0b80",textTransform:"uppercase" }}>
                    Common Mistakes
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:9,
                  background:"rgba(245,158,11,0.05)",borderRadius:12,padding:"13px 14px",
                  border:"1px solid rgba(245,158,11,0.18)" }}>
                  {exercise.commonMistakes.map((m,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ color:"#f59e0b",fontWeight:800,fontSize:13,flexShrink:0,lineHeight:1.55 }}>✕</span>
                      <span style={{ fontSize:13,color:"#fcd34d",lineHeight:1.55,fontWeight:500 }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How To Progress */}
            {exercise.progressionTips?.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:15 }}>🚀</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:"#a78bfa80",textTransform:"uppercase" }}>
                    How To Progress
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:9,
                  background:"rgba(167,139,250,0.06)",borderRadius:12,padding:"13px 14px",
                  border:"1px solid rgba(167,139,250,0.2)" }}>
                  {exercise.progressionTips.map((tip,i)=>(
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                      <span style={{ color:"#a78bfa",fontWeight:800,fontSize:13,flexShrink:0,lineHeight:1.55 }}>→</span>
                      <span style={{ fontSize:13,color:"#c4b5fd",lineHeight:1.55,fontWeight:500 }}>{tip}</span>
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

            {/* Progression Track */}
            {chain && chainStatus ? (
              <div style={{ marginBottom:6 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                  <span style={{ fontSize:15 }}>{chain.emoji}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,
                    letterSpacing:"0.18em",color:"#475569",textTransform:"uppercase" }}>
                    {chain.name}
                  </span>
                  <span style={{ marginLeft:"auto",fontSize:9,color:"#334155",
                    fontFamily:"'DM Mono',monospace" }}>
                    {chainStatus.progress}/{chainStatus.total}
                  </span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {chainStatus.steps.map((step, i) => {
                    const isThis   = step.exId === exercise.id;
                    const lockPct  = step.unlocksAt > 0 ? Math.min(1, step.count / step.unlocksAt) : 1;
                    const stepName = step.ex?.name || step.exId;
                    return (
                      <div key={step.exId} style={{
                        borderRadius:10,padding:"10px 12px",
                        border: isThis ? `1.5px solid ${color}55`
                              : step.unlocked ? "1px solid rgba(255,255,255,0.08)"
                              : "1px dashed rgba(255,255,255,0.04)",
                        background: isThis ? `${color}0e`
                                  : step.unlocked ? "rgba(255,255,255,0.025)"
                                  : "rgba(0,0,0,0.2)",
                        opacity: step.unlocked ? 1 : 0.4,
                        transition:"all 0.2s",
                      }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:9 }}>
                          <span style={{ fontSize:14,lineHeight:1.4,flexShrink:0 }}>
                            {!step.unlocked ? "🔒"
                              : step.mastered ? "✅"
                              : isThis ? "▶"
                              : "○"}
                          </span>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                              <span style={{ fontSize:12,fontWeight:700,lineHeight:1.25,
                                color: isThis ? color
                                     : step.mastered ? "#22c55e"
                                     : step.unlocked ? "#e2e8f0"
                                     : "#475569" }}>
                                {stepName}
                              </span>
                              {isThis && (
                                <span style={{ fontSize:9,color,fontFamily:"'DM Mono',monospace",
                                  background:`${color}15`,padding:"1px 7px",borderRadius:20 }}>
                                  you are here
                                </span>
                              )}
                            </div>
                            {step.unlocked && !step.mastered && (
                              <div style={{ marginTop:6 }}>
                                <div style={{ height:3,background:"rgba(255,255,255,0.07)",
                                  borderRadius:99,overflow:"hidden",marginBottom:3 }}>
                                  <div style={{ height:"100%",borderRadius:99,
                                    background:isThis ? color : "#475569",
                                    width:`${lockPct*100}%`,transition:"width 0.6s ease" }}/>
                                </div>
                                <div style={{ fontSize:9,color:"#475569",
                                  fontFamily:"'DM Mono',monospace" }}>
                                  {step.count}/{step.unlocksAt} sessions → unlocks next
                                </div>
                              </div>
                            )}
                            {step.mastered && (
                              <div style={{ fontSize:9,color:"#22c55e",marginTop:2,
                                fontFamily:"'DM Mono',monospace" }}>
                                ✓ {step.count} sessions complete
                              </div>
                            )}
                            {!step.unlocked && (
                              <div style={{ fontSize:9,color:"#334155",marginTop:2 }}>
                                Complete the previous exercise to unlock
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ borderRadius:12,border:"1px dashed rgba(255,255,255,0.07)",
                background:"rgba(255,255,255,0.02)",padding:"11px 14px",opacity:0.5,marginBottom:6 }}>
                <div style={{ fontSize:10,color:"#334155" }}>
                  📈 This exercise isn't part of a tracked progression track yet.
                </div>
              </div>
            )}

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
            {isDone?"✓ Completed — Undo?":"Mark Complete ✓  +5 XP"}
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
function DrillCard({ w, color, bg2, brd, isDone, onToggle, onViewDetail, favored, onFav }) {
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
          <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
            {onFav&&<button onClick={e=>{e.stopPropagation();onFav();}}
              style={{ width:30,height:30,borderRadius:8,border:`1px solid ${favored?"rgba(250,204,21,0.35)":metaBrd}`,
                background:favored?"rgba(250,204,21,0.1)":"transparent",
                fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              {favored?"⭐":"☆"}
            </button>}
            <button onClick={e=>{e.stopPropagation();onToggle();}} style={{ width:44,height:44,borderRadius:"50%",border:`2px solid ${isDone?color:metaBrd}`,background:isDone?color:metaBg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,fontWeight:800,color:isDone?"#000":color }}>
              {isDone?"✓":"○"}
            </button>
          </div>
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
  const [settings, setSettings] = useState(()=>{
    try {
      const raw = JSON.parse(localStorage.getItem("s_settings")||"{}");
      // ── Migration: athleteAge (legacy) → dateOfBirth ──────────────
      if (raw.athleteAge && !raw.dateOfBirth) {
        // Estimate DOB as June 15 of (currentYear - athleteAge).
        // Approximate but far better than losing the data entirely.
        const year = new Date().getFullYear() - Number(raw.athleteAge);
        raw.dateOfBirth = `${year}-06-15`;
      }
      delete raw.athleteAge; // remove stale key regardless
      return { ...DEFAULT, ...raw };
    } catch { return DEFAULT; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState("home");
  const [prevView, setPrevView] = useState("home");
  const [activeCat, setActiveCat] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
  const [detailList, setDetailList] = useState([]);
  const [schedTab, setSchedTab] = useState("week");
  const [celebratedBadges, setCelebratedBadges] = useState(()=>{
    try{return new Set(JSON.parse(localStorage.getItem("fkh-celebrated-badges")||"[]"));}catch{return new Set();}
  });
  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const [badgeDates, setBadgeDates] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("fkh-badge-dates")||"{}");}catch{return {};}
  });
  const [lastEarnedBadge, setLastEarnedBadge] = useState(null);
  const [completed, setCompleted] = useState(()=>{ try{return JSON.parse(localStorage.getItem("s_done")||"{}")}catch{return{}} });
  const [enrolledPrograms, setEnrolledPrograms] = useState(()=>{ try{return JSON.parse(localStorage.getItem("fkh-programs")||"{}")}catch{return{}} });
  const [selectedProgram, setSelectedProgram] = useState(null); // programId string when drill-in open
  const [missionLog, setMissionLog] = useState(()=>{ try{return JSON.parse(localStorage.getItem("fkh-missions")||"{}")}catch{return{}} });
  const [favorites, setFavorites] = useState(()=>{ try{return JSON.parse(localStorage.getItem("fkh-favs")||'{"exercises":{},"workouts":{},"programs":{}}')}catch{return{exercises:{},workouts:{},programs:{}}} });
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
    const snoozeUntil = parseInt(localStorage.getItem('fkh-install-snooze-until')||'0');
    if (snoozeUntil > Date.now()) return false;
    return true;
  });
  useEffect(()=>{
    const handler = ()=>{ setInstallPrompt(window._installPrompt); setShowInstallBanner(p=>p||true); };
    window.addEventListener('installpromptready', handler);
    return ()=>window.removeEventListener('installpromptready', handler);
  },[]);
  const dismissInstall = ()=>{
    setShowInstallBanner(false);
    const count = parseInt(localStorage.getItem('fkh-install-dismiss-count')||'0') + 1;
    localStorage.setItem('fkh-install-dismiss-count', String(count));
    if (count >= 3) { localStorage.setItem('fkh-install-dismissed','1'); }
    else { localStorage.setItem('fkh-install-snooze-until', String(Date.now()+7*86400000)); }
  };
  const triggerInstall = ()=>{ if (installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(()=>dismissInstall()); } };

  const calcWeek = startDate => {
    if (!startDate) return null;
    const start = new Date(startDate+'T00:00:00'), now = new Date();
    return Math.max(1, Math.floor((now-start)/(7*24*60*60*1000))+1);
  };
  const trainingWeek = calcWeek(settings.startDate);

  useEffect(()=>{ try{localStorage.setItem("s_settings",JSON.stringify(settings))}catch{} },[settings]);
  useEffect(()=>{ try{localStorage.setItem("s_done",JSON.stringify(completed))}catch{} },[completed]);
  useEffect(()=>{ try{localStorage.setItem("fkh-programs",JSON.stringify(enrolledPrograms))}catch{} },[enrolledPrograms]);
  useEffect(()=>{ try{localStorage.setItem("fkh-missions",JSON.stringify(missionLog))}catch{} },[missionLog]);
  useEffect(()=>{ try{localStorage.setItem("fkh-favs",JSON.stringify(favorites))}catch{} },[favorites]);

  const isFav      = (type, id) => !!(favorites[type]||{})[id];
  const toggleFav  = (type, id) => setFavorites(prev=>{
    const sec = { ...(prev[type]||{}) };
    if (sec[id]) delete sec[id]; else sec[id] = Date.now();
    return { ...prev, [type]:sec };
  });

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

  useEffect(()=>{ refreshWorkout(); },[selectedTemplate, settings.dateOfBirth, settings.experience]);

  const recommendation = useMemo(()=>
    computeRecommendation(settings, completed, selectedTemplate),
  [settings, completed, selectedTemplate]);

  /* XP / Level / Badges ──────────────────────────────────── */
  const xpData       = useMemo(()=>computeXP(completed),[completed]);
  const currentLevel = useMemo(()=>getLevel(xpData.total),[xpData.total]);
  const earnedBadges = useMemo(()=>getEarnedBadges(completed),[completed]);

  // Detect newly unlocked badges → queue celebration + record dates
  useEffect(()=>{
    const newBadges = earnedBadges.filter(id=>!celebratedBadges.has(id));
    if (newBadges.length===0) return;
    const defs = newBadges.map(id=>BADGES_DEF.find(b=>b.id===id)).filter(Boolean);
    setCelebrationQueue(q=>[...q,...defs]);
    if (defs.length>0) setLastEarnedBadge(defs[defs.length-1]);
    const updated = new Set([...celebratedBadges,...newBadges]);
    setCelebratedBadges(updated);
    try { localStorage.setItem("fkh-celebrated-badges",JSON.stringify([...updated])); } catch {}
    // Record earn date for each new badge (first-time only)
    const today = new Date().toLocaleDateString("en-CA");
    setBadgeDates(prev=>{
      const next={...prev};
      for (const id of newBadges) { if (!next[id]) next[id]=today; }
      try{ localStorage.setItem("fkh-badge-dates",JSON.stringify(next)); }catch{}
      return next;
    });
  },[earnedBadges]);

  /* Daily Mission ─────────────────────────────────────────────── */
  const todayMission = useMemo(()=>
    generateDailyMission(today, settings, completed, enrolledPrograms),
  [today, settings, completed, enrolledPrograms]);

  const missionClaimed = !!missionLog[today]?.claimed;

  const requiredTasksDone = useMemo(()=>
    todayMission.tasks.filter(t=>t.required).every(t=>{
      const {cur,target} = getMissionTaskProgress(t, completed, today);
      return cur >= target;
    }),
  [todayMission, completed, today]);

  // Auto-claim bonus XP when all required tasks complete
  useEffect(()=>{
    if (requiredTasksDone && !missionClaimed) {
      const next = { ...missionLog, [today]:{ claimed:true, bonusXP:todayMission.bonusXP, claimedAt:Date.now() } };
      setMissionLog(next);
    }
  },[requiredTasksDone, missionClaimed, today]);

  const catColor = key => key==="strength" ? ST : key==="speed"||key==="balance" ? P : S;
  const catBg    = key => `${catColor(key)}16`;
  const catBrd   = key => `${catColor(key)}2e`;

  const bd  = "rgba(255,255,255,0.07)";
  const lbl = { fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}80`,marginBottom:10,textTransform:"uppercase" };
  const NAV = [
    {id:"home",     emoji:"🏠",label:"Home"},
    {id:"shots",    emoji:"🏀",label:"Shots"},
    {id:"programs", emoji:"📋",label:"Programs"},
    {id:"badges",   emoji:"🏅",label:"Badges"},
    {id:"profile",  emoji:"👤",label:"Profile"},
  ];

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

  /* PROGRAMS */
  if (view==="programs") {
    const enrollProg = (prog) => {
      setEnrolledPrograms(p => ({ ...p, [prog.id]: { startDate: new Date().toLocaleDateString("en-CA") } }));
    };
    const unenrollProg = (progId) => {
      setEnrolledPrograms(p => { const n={...p}; delete n[progId]; return n; });
      if (selectedProgram === progId) setSelectedProgram(null);
    };

    // ─── Program Detail ──────────────────────────────────────────
    if (selectedProgram) {
      const prog = PROGRAMS.find(p => p.id === selectedProgram);
      if (!prog) { setSelectedProgram(null); }
      else {
        const enrollment = enrolledPrograms[prog.id];
        const curWeekNum = enrollment ? programCurrentWeek(enrollment.startDate, prog.duration) : 1;
        const pct = Math.round(computeProgramProgress(prog, completed) * 100);
        const exDone = exId => Object.keys(completed).some(k => completed[k] && k.split("-").slice(3).join("-") === exId);
        const sessionDone = session => session.exercises.every(exDone);
        const totalSessions = prog.weeks.reduce((s, w) => s + w.sessions.length, 0);
        const doneSessions = prog.weeks.reduce((s, w) => s + w.sessions.filter(sessionDone).length, 0);

        return (
          <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:80 }}>
            {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
            {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]} onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
            {activeExercise&&<ExerciseDetailSheet exercise={activeExercise} color={prog.color}
              bg2={SF} brd={`${prog.color}22`} BG={BG} SF={SF}
              isDone={isDone(activeExercise.id)} onToggle={()=>toggle(activeExercise.id)}
              onClose={closeDetail} onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
              completed={completed}
              favored={isFav("exercises",activeExercise.id)}
              onToggleFav={()=>toggleFav("exercises",activeExercise.id)}/>}

            {/* Header */}
            <div style={{ padding:"16px 18px 0" }}>
              <button onClick={()=>setSelectedProgram(null)}
                style={{ marginBottom:14,padding:"6px 14px",borderRadius:8,border:`1px solid ${prog.color}30`,background:`${prog.color}14`,color:prog.color,fontSize:12,fontWeight:700,cursor:"pointer" }}>
                ← Programs
              </button>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
                <div style={{ width:52,height:52,borderRadius:14,background:`${prog.color}18`,border:`2px solid ${prog.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>
                  {prog.emoji}
                </div>
                <div>
                  <div style={{ fontSize:20,fontWeight:800,color:"#f1f5f9",lineHeight:1.2 }}>{prog.name}</div>
                  <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{prog.duration} weeks · {prog.daysPerWeek}×/week · Ages {prog.ageRange[0]}–{prog.ageRange[1]}</div>
                </div>
              </div>
              <p style={{ fontSize:13,color:"#94a3b8",lineHeight:1.6,margin:"0 0 14px" }}>{prog.desc}</p>

              {/* Progress bar */}
              <div style={{ background:SF,borderRadius:12,padding:"12px 14px",border:`1px solid ${prog.color}22`,marginBottom:14 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:prog.color }}>{pct}% complete</span>
                  <span style={{ fontSize:11,color:"#475569" }}>{doneSessions}/{totalSessions} sessions</span>
                </div>
                <div style={{ height:6,borderRadius:99,background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:`linear-gradient(90deg,${prog.color},${prog.color}bb)`,transition:"width 0.4s" }}/>
                </div>
                {enrollment && (
                  <div style={{ marginTop:8,fontSize:11,color:"#475569" }}>
                    Currently on <span style={{ color:prog.color,fontWeight:700 }}>Week {curWeekNum}</span> of {prog.duration}
                  </div>
                )}
              </div>

              {/* Enroll / Unenroll */}
              {enrollment
                ? <button onClick={()=>{ if(window.confirm("Leave this program? Your exercise progress is kept.")) unenrollProg(prog.id); }}
                    style={{ width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${prog.color}30`,background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:18 }}>
                    Leave Program
                  </button>
                : <button onClick={()=>enrollProg(prog)}
                    style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:prog.color,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:18,boxShadow:`0 4px 16px ${prog.color}50` }}>
                    Start Program →
                  </button>
              }
            </div>

            {/* Week accordion */}
            {prog.weeks.map(week => {
              const isCurrent = enrollment && week.week === curWeekNum;
              const weekDone = week.sessions.every(sessionDone);
              const weekPct = Math.round((week.sessions.filter(sessionDone).length / week.sessions.length) * 100);
              return (
                <div key={week.week} style={{ margin:"0 18px 12px",borderRadius:14,
                  border:`1px solid ${isCurrent ? prog.color+"44" : "rgba(255,255,255,0.07)"}`,
                  background:isCurrent ? `${prog.color}08` : SF,overflow:"hidden" }}>
                  {/* Week header */}
                  <div style={{ padding:"13px 14px",display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:32,height:32,borderRadius:8,
                      background:weekDone ? `${prog.color}20` : isCurrent ? `${prog.color}18` : "rgba(255,255,255,0.05)",
                      border:`1px solid ${weekDone ? prog.color+"44" : isCurrent ? prog.color+"33" : "rgba(255,255,255,0.06)"}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,fontWeight:800,color:weekDone ? prog.color : isCurrent ? prog.color : "#475569",flexShrink:0 }}>
                      {weekDone ? "✓" : `W${week.week}`}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                        <span style={{ fontSize:12,fontWeight:700,color:isCurrent?prog.color:"#e2e8f0" }}>
                          Week {week.week}
                        </span>
                        {isCurrent && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:prog.color,color:"#fff",fontWeight:700 }}>CURRENT</span>}
                        {weekDone && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:"rgba(34,197,94,0.15)",color:"#22c55e",fontWeight:700 }}>DONE</span>}
                      </div>
                      <div style={{ fontSize:11,color:"#64748b",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{week.goal}</div>
                    </div>
                    <span style={{ fontSize:11,color:weekDone?"#22c55e":isCurrent?prog.color:"#475569",fontWeight:700,flexShrink:0 }}>{weekPct}%</span>
                  </div>

                  {/* Sessions (always shown for current week, collapsed for others) */}
                  {(isCurrent || !enrollment) && week.sessions.map((session, si) => {
                    const sDone = sessionDone(session);
                    return (
                      <div key={si} style={{ margin:"0 12px 10px",borderRadius:10,
                        background:sDone ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)",
                        border:`1px solid ${sDone ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                        padding:"11px 13px" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:9 }}>
                          <span style={{ fontSize:12,fontWeight:700,color:sDone?"#22c55e":prog.color }}>{session.day}</span>
                          <span style={{ fontSize:10,color:"#64748b" }}>· {session.focus}</span>
                          {sDone && <span style={{ marginLeft:"auto",fontSize:10,color:"#22c55e",fontWeight:700 }}>✓ Done</span>}
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                          {session.exercises.map(exId => {
                            const ex = ALL_EXERCISES[exId];
                            if (!ex) return null;
                            const done = exDone(exId);
                            return (
                              <div key={exId} onClick={()=>{ const enriched={...ex,_cat:ex._cat,meta:ex.meta||EXERCISE_META[exId]||{}}; openDetail(enriched,session.exercises.map(id=>({...ALL_EXERCISES[id],_cat:ALL_EXERCISES[id]?._cat,meta:ALL_EXERCISES[id]?.meta||EXERCISE_META[id]||{}})).filter(Boolean)); }}
                                style={{ display:"flex",alignItems:"center",gap:9,padding:"7px 9px",borderRadius:8,
                                  background:done?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.04)",
                                  border:`1px solid ${done?"rgba(34,197,94,0.18)":"rgba(255,255,255,0.05)"}`,
                                  cursor:"pointer" }}>
                                <button onClick={e=>{ e.stopPropagation(); toggle(exId); }}
                                  style={{ width:20,height:20,borderRadius:6,border:`1.5px solid ${done?"#22c55e":prog.color+"60"}`,
                                    background:done?"#22c55e":"transparent",color:"#fff",fontSize:10,
                                    display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,padding:0 }}>
                                  {done?"✓":""}
                                </button>
                                <span style={{ flex:1,fontSize:12,fontWeight:600,color:done?"#22c55e":"#e2e8f0",lineHeight:1.3 }}>{ex.name}</span>
                                <span style={{ fontSize:9,color:"#475569" }}>{ex.sets}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {renderBottomNav()}
          </div>
        );
      }
    }

    // ─── Programs List ───────────────────────────────────────────
    const activeEnrollments = PROGRAMS.filter(p => enrolledPrograms[p.id]);

    return (
      <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:80 }}>
        {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
        {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]} onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
        {activeExercise&&<ExerciseDetailSheet exercise={activeExercise} color={P}
          bg2={SF} brd={bd} BG={BG} SF={SF}
          isDone={isDone(activeExercise.id)} onToggle={()=>toggle(activeExercise.id)}
          onClose={closeDetail} onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
          completed={completed}
          favored={isFav("exercises",activeExercise.id)}
          onToggleFav={()=>toggleFav("exercises",activeExercise.id)}/>}

        {/* Header */}
        <div style={{ padding:"20px 18px 6px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
            <div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}70`,textTransform:"uppercase",marginBottom:4 }}>Training System</div>
              <h1 style={{ fontSize:22,fontWeight:800,color:"#f1f5f9",margin:0 }}>Programs 📋</h1>
            </div>
            <button onClick={()=>setShowSettings(true)} style={{ padding:"8px 10px",borderRadius:10,border:`1px solid ${bd}`,background:SF,color:"#64748b",fontSize:14,cursor:"pointer" }}>⚙️</button>
          </div>
          <p style={{ fontSize:12,color:"#64748b",margin:"8px 0 0",lineHeight:1.5 }}>
            Multi-week development plans built from existing drills. Pick a program and follow it week by week.
          </p>
        </div>

        {/* Active enrollments */}
        {activeEnrollments.length > 0 && (
          <div style={{ padding:"16px 18px 0" }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}70`,textTransform:"uppercase",marginBottom:10 }}>Active Programs</div>
            {activeEnrollments.map(prog => {
              const enrollment = enrolledPrograms[prog.id];
              const curWeek = programCurrentWeek(enrollment.startDate, prog.duration);
              const pct = Math.round(computeProgramProgress(prog, completed) * 100);
              return (
                <div key={prog.id} onClick={()=>setSelectedProgram(prog.id)}
                  style={{ borderRadius:14,border:`1px solid ${prog.color}40`,background:`${prog.color}0c`,
                    padding:"14px 16px",marginBottom:10,cursor:"pointer" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                    <span style={{ fontSize:24 }}>{prog.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:800,color:"#f1f5f9" }}>{prog.name}</div>
                      <div style={{ fontSize:11,color:prog.color,fontWeight:600 }}>Week {curWeek} of {prog.duration}</div>
                    </div>
                    <span style={{ fontSize:15,fontWeight:800,color:prog.color }}>{pct}%</span>
                  </div>
                  <div style={{ height:5,borderRadius:99,background:"rgba(255,255,255,0.08)" }}>
                    <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:prog.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All programs */}
        <div style={{ padding:"16px 18px 0" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${P}70`,textTransform:"uppercase",marginBottom:10 }}>
            {activeEnrollments.length > 0 ? "All Programs" : "Choose a Program"}
          </div>
          {PROGRAMS.map(prog => {
            const enrolled = !!enrolledPrograms[prog.id];
            const pct = enrolled ? Math.round(computeProgramProgress(prog, completed) * 100) : 0;
            const completed_badge = earnedBadges.includes(prog.badgeId);
            return (
              <div key={prog.id} onClick={()=>setSelectedProgram(prog.id)}
                style={{ borderRadius:14,border:`1px solid ${enrolled?prog.color+"33":"rgba(255,255,255,0.07)"}`,
                  background:enrolled?`${prog.color}08`:SF,
                  padding:"16px",marginBottom:10,cursor:"pointer",
                  boxShadow:enrolled?`0 2px 12px ${prog.color}18`:"none" }}>
                <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
                  <div style={{ width:48,height:48,borderRadius:12,
                    background:`${prog.color}18`,border:`2px solid ${prog.color}${enrolled?"55":"33"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
                    {prog.emoji}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap" }}>
                      <span style={{ fontSize:14,fontWeight:800,color:"#f1f5f9" }}>{prog.name}</span>
                      {enrolled && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:prog.color,color:"#fff",fontWeight:700 }}>ENROLLED</span>}
                      {completed_badge && <span style={{ fontSize:9,padding:"2px 7px",borderRadius:99,background:"rgba(34,197,94,0.2)",color:"#22c55e",fontWeight:700 }}>✓ DONE</span>}
                    </div>
                    <div style={{ fontSize:11,color:"#64748b",marginBottom:6 }}>{prog.duration} weeks · {prog.daysPerWeek}x/week · Ages {prog.ageRange[0]}–{prog.ageRange[1]}</div>
                    <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.4 }}>{prog.desc}</div>
                    {enrolled && (
                      <div style={{ marginTop:8 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                          <span style={{ fontSize:10,color:prog.color,fontWeight:600 }}>{pct}% complete</span>
                        </div>
                        <div style={{ height:4,borderRadius:99,background:"rgba(255,255,255,0.08)" }}>
                          <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:prog.color }}/>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,flexShrink:0 }}>
                    <button onClick={e=>{e.stopPropagation();toggleFav("programs",prog.id);}}
                      style={{ width:28,height:28,borderRadius:8,border:`1px solid ${isFav("programs",prog.id)?"rgba(250,204,21,0.4)":"rgba(255,255,255,0.1)"}`,
                        background:isFav("programs",prog.id)?"rgba(250,204,21,0.1)":"transparent",
                        fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {isFav("programs",prog.id)?"⭐":"☆"}
                    </button>
                    <span style={{ fontSize:16,color:"#475569" }}>›</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  /* SHOTS */
  if (view==="shots") return (
    <div style={{ background:BG,minHeight:"100vh",maxWidth:680,margin:"0 auto" }}>
      {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
      {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]}
        onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
      <ShotTracker P={P} S={S} BG={BG} athleteName={settings.athleteName}/>
      {renderBottomNav()}
    </div>
  );

  /* BADGES */
  if (view==="badges") return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"#e2e8f0",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]}
        onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
        <h1 style={{ fontSize:16,fontWeight:800,margin:0,color:P }}>🏅 Badges</h1>
        <div style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace" }}>
          {earnedBadges.length}/{BADGES_DEF.length} earned
        </div>
      </div>
      <BadgesView
        earnedBadges={earnedBadges} badgeDates={badgeDates} completed={completed}
        P={P} S={S} BG={BG} SF={SF} bd={bd} lbl={lbl}/>
      {renderBottomNav()}
    </div>
  );

  /* HISTORY */
  if (view==="history") return (
    <HistoryView
      completed={completed} badgeDates={badgeDates} settings={settings}
      P={P} S={S} ST={ST} BG={BG} SF={SF} bd={bd} lbl={lbl}
      onBack={()=>setView("profile")}/>
  );

  /* PROFILE */
  if (view==="profile") return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"#e2e8f0",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
      {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]}
        onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${P}14`,position:"sticky",top:0,background:BG,backdropFilter:"blur(10px)",zIndex:10 }}>
        <h1 style={{ fontSize:16,fontWeight:800,margin:0 }}>
          <span style={{ color:P }}>My Profile</span>
        </h1>
        <button onClick={()=>setShowSettings(true)}
          style={{ background:`${P}14`,border:`1px solid ${P}30`,borderRadius:8,color:P,fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px" }}>
          ⚙ Settings
        </button>
      </div>
      <ProfileView
        settings={settings} totalXP={xpData.total} xpData={xpData}
        currentLevel={currentLevel} earnedBadges={earnedBadges} completed={completed}
        badgeDates={badgeDates}
        P={P} S={S} ST={ST} BG={BG} SF={SF} bd={bd} lbl={lbl}
        onOpenSettings={()=>setShowSettings(true)}
        onViewHistory={()=>setView("history")}
        onViewBadges={()=>setView("badges")}/>
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
              onViewDetail={()=>openDetail(w, filteredWorkouts)}
              favored={isFav("exercises",w.id)} onFav={()=>toggleFav("exercises",w.id)}/>
          ))}
        </div>
        {activeExercise&&<ExerciseDetailSheet
          exercise={activeExercise} color={catColor(activeExercise._cat)}
          bg2={catBg(activeExercise._cat)} brd={catBrd(activeExercise._cat)}
          BG={BG} SF={SF} isDone={isDone(activeExercise.id)}
          onToggle={()=>toggle(activeExercise.id)}
          onClose={closeDetail}
          onNext={nextExDetail?()=>setActiveExercise(nextExDetail):null}
          completed={completed}
          favored={isFav("exercises",activeExercise.id)}
          onToggleFav={()=>toggleFav("exercises",activeExercise.id)}/>}
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
        completed={completed}
        favored={isFav("exercises",activeExercise.id)}
        onToggleFav={()=>toggleFav("exercises",activeExercise.id)}/>}
      {celebrationQueue.length>0&&<BadgeCelebration badge={celebrationQueue[0]}
        onDismiss={()=>setCelebrationQueue(q=>q.slice(1))}/>}
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
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"#334155",marginBottom:7 }}>FIT KID HOOPER</div>
          <h1 style={{ fontSize:26,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.03em",lineHeight:1.1 }}>FKH <span style={{ color:P }}>Fit Kid Hooper</span></h1>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:5 }}>
            <p style={{ fontSize:13,color:`${P}88`,margin:0 }}>{settings.athleteName}</p>
            <div onClick={()=>setView("profile")}
              style={{ display:"flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,cursor:"pointer",
                background:`${P}14`,border:`1px solid ${P}30` }}>
              <span style={{ fontSize:11 }}>{currentLevel.emoji}</span>
              <span style={{ fontSize:10,fontWeight:800,color:P }}>{currentLevel.name}</span>
              <span style={{ fontSize:9,color:`${P}70`,fontFamily:"'DM Mono',monospace" }}>· {xpData.total} XP</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,marginLeft:12 }}>
          <div onClick={()=>setView("profile")} style={{ width:56,height:56,borderRadius:"50%",background:`${P}18`,border:`3px solid ${P}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
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

      {/* Badge Earned Notification Banner (home screen) */}
      {lastEarnedBadge && view==="home" && (
        <div style={{ margin:"10px 20px 0",padding:"12px 14px",borderRadius:14,
          background:`${lastEarnedBadge.color}12`,
          border:`1px solid ${lastEarnedBadge.color}35`,
          display:"flex",alignItems:"center",gap:12,
          animation:"fkh-fade-up 0.35s ease both" }}>
          <div style={{ width:38,height:38,borderRadius:12,flexShrink:0,
            background:`${lastEarnedBadge.color}20`,
            border:`1.5px solid ${lastEarnedBadge.color}50`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,animation:"fkh-bounce 0.6s ease-out 0.1s both" }}>
            {lastEarnedBadge.emoji}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:11,fontWeight:800,color:lastEarnedBadge.color,
              textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2 }}>
              Badge Unlocked!
            </div>
            <div style={{ fontSize:13,fontWeight:700,color:"#f1f5f9",lineHeight:1.2 }}>
              {lastEarnedBadge.name}
            </div>
          </div>
          <button onClick={()=>{ setView("badges"); setLastEarnedBadge(null); }}
            style={{ background:lastEarnedBadge.color,border:"none",color:"#000",fontSize:10,
              fontWeight:800,cursor:"pointer",borderRadius:20,padding:"5px 12px",
              whiteSpace:"nowrap",flexShrink:0 }}>
            View →
          </button>
          <button onClick={()=>setLastEarnedBadge(null)}
            style={{ background:"none",border:"none",color:"#475569",fontSize:16,
              cursor:"pointer",padding:0,lineHeight:1,flexShrink:0 }}>
            ✕
          </button>
        </div>
      )}

      {view==="home" && (<>

        {/* ── TODAY'S MISSION (top priority) ──────────────────────── */}
        <div style={{ padding:"6px 20px 4px" }}>
          <div style={lbl}>Today's Mission</div>
        </div>

        {/* ── DAILY MISSION CARD ─────────────────────────────────── */}
        {(()=>{
          const mission = todayMission;
          const claimed = missionClaimed;
          const allReqDone = requiredTasksDone;
          return (
            <div style={{ margin:"0 20px 14px",borderRadius:16,
              border:`1px solid ${claimed?"rgba(34,197,94,0.35)":P+"33"}`,
              background:claimed?"rgba(34,197,94,0.07)":`${P}0c`,overflow:"hidden" }}>

              {/* Header row */}
              <div style={{ padding:"12px 14px 10px",display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.16em",
                      color:claimed?"#22c55e80":`${P}80`,textTransform:"uppercase" }}>Daily Mission</span>
                    {claimed
                      ? <span style={{ fontSize:9,padding:"2px 8px",borderRadius:99,
                          background:"rgba(34,197,94,0.18)",color:"#22c55e",fontWeight:800 }}>✓ COMPLETE</span>
                      : <span style={{ fontSize:9,padding:"2px 8px",borderRadius:99,
                          background:`${P}18`,color:P,fontWeight:700 }}>TODAY</span>
                    }
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#f1f5f9",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    {mission.title}
                  </div>
                </div>
                <div style={{ flexShrink:0,borderRadius:10,padding:"7px 11px",textAlign:"center",
                  background:claimed?"rgba(34,197,94,0.12)":`${P}16`,
                  border:`1px solid ${claimed?"rgba(34,197,94,0.3)":P+"28"}` }}>
                  <div style={{ fontSize:13,fontWeight:800,
                    color:claimed?"#22c55e":P,lineHeight:1 }}>+{mission.bonusXP}</div>
                  <div style={{ fontSize:8,color:"#475569",fontWeight:600,marginTop:1 }}>BONUS XP</div>
                </div>
              </div>

              {/* Task list */}
              <div style={{ padding:"0 12px 12px",display:"flex",flexDirection:"column",gap:7 }}>
                {mission.tasks.map(task=>{
                  const {cur,target} = getMissionTaskProgress(task, completed, today);
                  const taskDone = cur>=target;
                  const pctRaw = target>0 ? Math.min(1,cur/target) : 0;
                  return (
                    <div key={task.id} style={{
                      padding:"9px 11px",borderRadius:10,
                      background:taskDone
                        ? "rgba(34,197,94,0.07)"
                        : task.optional ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                      border:`1px solid ${taskDone
                        ? "rgba(34,197,94,0.18)"
                        : task.optional ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:task.optional?0:6 }}>
                        {/* Checkbox */}
                        <div style={{ width:17,height:17,borderRadius:5,flexShrink:0,
                          border:`1.5px solid ${taskDone?"#22c55e":task.optional?"#2d3748":P+"55"}`,
                          background:taskDone?"#22c55e":"transparent",
                          display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {taskDone&&<span style={{ color:"#fff",fontSize:9,fontWeight:900 }}>✓</span>}
                        </div>
                        <span style={{ flex:1,fontSize:12,fontWeight:600,lineHeight:1.35,
                          color:taskDone?"#22c55e":task.optional?"#475569":"#e2e8f0" }}>
                          {task.label}
                        </span>
                        {task.optional&&<span style={{ fontSize:8,color:"#334155",
                          fontWeight:700,letterSpacing:"0.08em",flexShrink:0 }}>OPTIONAL</span>}
                        <span style={{ fontSize:11,fontWeight:700,flexShrink:0,
                          color:taskDone?"#22c55e":"#64748b" }}>
                          {Math.min(cur,target)}/{target}
                        </span>
                      </div>
                      {/* Progress bar (required tasks only) */}
                      {!task.optional&&(
                        <div style={{ height:3,borderRadius:99,background:"rgba(255,255,255,0.06)",marginLeft:25 }}>
                          <div style={{ height:"100%",width:`${pctRaw*100}%`,borderRadius:99,
                            background:taskDone?"#22c55e":P,transition:"width 0.35s" }}/>
                        </div>
                      )}
                      {/* Exercise chips for program/category tasks */}
                      {(task.type==="program"||task.type==="category")&&task.exercises?.length>0&&(
                        <div style={{ display:"flex",gap:5,marginTop:7,marginLeft:25,flexWrap:"wrap" }}>
                          {task.exercises.map(exId=>{
                            const ex = ALL_EXERCISES[exId];
                            if (!ex) return null;
                            const done = Object.keys(completed).some(k=>completed[k]&&k.split("-").slice(3).join("-")===exId);
                            return (
                              <button key={exId}
                                onClick={()=>{
                                  const enriched={...ex,_cat:ex._cat,meta:ex.meta||EXERCISE_META[exId]||{}};
                                  openDetail(enriched, task.exercises.map(id=>ALL_EXERCISES[id]).filter(Boolean).map(e=>({...e,meta:e.meta||EXERCISE_META[e.id]||{}})));
                                }}
                                style={{ fontSize:9,padding:"3px 8px",borderRadius:99,cursor:"pointer",
                                  background:done?"rgba(34,197,94,0.12)":"rgba(255,255,255,0.05)",
                                  border:`1px solid ${done?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.08)"}`,
                                  color:done?"#22c55e":"#94a3b8",fontWeight:600 }}>
                                {done?"✓ ":""}{ex.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Overall progress / claimed state */}
              {(()=>{
                const reqTasks = mission.tasks.filter(t=>t.required);
                const totalReq = reqTasks.reduce((s,t)=>{const {target}=getMissionTaskProgress(t,completed,today); return s+target;},0);
                const doneReq  = reqTasks.reduce((s,t)=>{const {cur,target}=getMissionTaskProgress(t,completed,today); return s+Math.min(cur,target);},0);
                const overallPct = totalReq>0 ? doneReq/totalReq : 0;
                return (
                  <div style={{ padding:"0 12px 12px" }}>
                    <div style={{ height:4,borderRadius:99,background:"rgba(255,255,255,0.05)" }}>
                      <div style={{ height:"100%",width:`${overallPct*100}%`,borderRadius:99,
                        background:claimed?"#22c55e":`linear-gradient(90deg,${P},${S})`,
                        transition:"width 0.35s" }}/>
                    </div>
                    {claimed&&(
                      <div style={{ textAlign:"center",marginTop:8,fontSize:11,color:"#22c55e",fontWeight:700 }}>
                        🎉 +{mission.bonusXP} XP earned — come back tomorrow for a new mission!
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── WORKOUT TEMPLATE PICKER ─────────────────────────────── */}
        <div style={{ display:"flex",gap:7,overflowX:"auto",padding:"0 20px 10px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch" }}>
          {Object.entries(WORKOUT_TEMPLATES).map(([key,tmpl])=>(
            <div key={key} style={{ flexShrink:0,display:"flex",alignItems:"center",gap:3 }}>
              <button onClick={()=>setSelectedTemplate(key)}
                style={{ padding:"7px 13px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                  background:selectedTemplate===key?P:"rgba(255,255,255,0.05)",
                  border:`1.5px solid ${selectedTemplate===key?P:"rgba(255,255,255,0.09)"}`,
                  color:selectedTemplate===key?"#000":"#64748b" }}>
                {tmpl.emoji} {tmpl.name}
              </button>
              <button onClick={()=>toggleFav("workouts",key)}
                style={{ padding:"4px 6px",borderRadius:14,fontSize:11,cursor:"pointer",
                  background:"transparent",border:"none",
                  color:isFav("workouts",key)?"#facc15":"#334155" }}>
                {isFav("workouts",key)?"⭐":"☆"}
              </button>
            </div>
          ))}
        </div>

        {todaysWorkout ? (
          <div style={{ margin:"0 20px 14px",borderRadius:16,background:`${P}09`,border:`1px solid ${P}22`,overflow:"hidden" }}>
            <div style={{ padding:"14px 16px 8px",display:"flex",alignItems:"flex-start",gap:10 }}>
              <span style={{ fontSize:28,lineHeight:1 }}>{todaysWorkout.templateEmoji}</span>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:15,fontWeight:800,color:P,lineHeight:1.2 }}>{todaysWorkout.templateName}</div>
                <div style={{ fontSize:11,color:"#64748b",marginTop:2 }}>{todaysWorkout.templateDesc}</div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <div style={{ fontSize:22,fontWeight:800,color:P,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{Math.max(1,Math.round(todaysWorkout.totalSecs/60))}</div>
                <div style={{ fontSize:9,color:"#475569",letterSpacing:"0.07em" }}>MIN</div>
              </div>
            </div>
            <div style={{ padding:"4px 12px 10px" }}>
              {["warmup","main","finisher","recovery"].map(role=>{
                const exs=todaysWorkout.exercises.filter(e=>e.role===role);
                if(!exs.length) return null;
                const [dot,roleName]={warmup:["🟡","Warm-Up"],main:["🔵","Main Block"],finisher:["🔴","Finisher"],recovery:["🟢","Cool Down"]}[role];
                return (
                  <div key={role} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9,fontWeight:700,color:"#475569",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5,paddingLeft:4 }}>{dot} {roleName}</div>
                    {exs.map(ex=>{
                      const done2=isDone(ex.id);
                      return (
                        <div key={ex.id} onClick={()=>openDetail(ex,todaysWorkout.exercises)}
                          style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:10,marginBottom:3,cursor:"pointer",
                            background:done2?"rgba(34,197,94,0.08)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${done2?"rgba(34,197,94,0.15)":"transparent"}` }}>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:done2?"#22c55e":"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{ex.name}</div>
                            <div style={{ fontSize:10,color:"#475569" }}>{ex.sets}</div>
                          </div>
                          <div style={{ fontSize:10,color:"#334155",fontFamily:"'DM Mono',monospace",flexShrink:0 }}>{Math.round((ex.meta?.estimatedDuration||90)/60)}m</div>
                          <span style={{ fontSize:14,color:done2?"#22c55e":"#334155",flexShrink:0 }}>{done2?"✓":"›"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div style={{ padding:"8px 14px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:8 }}>
              <button onClick={()=>{ const first=todaysWorkout.exercises[0]; if(first){ setActiveCat(first._cat||"explosion"); setPrevView("home"); setView("cat"); } }}
                style={{ flex:1,padding:"11px",borderRadius:12,background:P,border:"none",color:"#000",fontSize:13,fontWeight:800,cursor:"pointer" }}>
                Start Workout →
              </button>
              <button onClick={refreshWorkout} title="Shuffle exercises"
                style={{ padding:"11px 15px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",color:"#64748b",fontSize:16,cursor:"pointer" }}>
                🔀
              </button>
            </div>
          </div>
        ) : (
          <div style={{ margin:"0 20px 14px",padding:"20px",borderRadius:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",textAlign:"center" }}>
            <div style={{ fontSize:13,color:"#475569" }}>Generating workout…</div>
          </div>
        )}

        {/* ── FAVORITES ──────────────────────────────────────────── */}
        {(()=>{
          const allFavs = [
            ...Object.entries(favorites.exercises||{}).map(([id,ts])=>({type:"exercise",id,ts})),
            ...Object.entries(favorites.workouts||{}).map(([id,ts])=>({type:"workout",id,ts})),
            ...Object.entries(favorites.programs||{}).map(([id,ts])=>({type:"program",id,ts})),
          ].sort((a,b)=>b.ts-a.ts).slice(0,5);
          if (allFavs.length===0) return null;
          return (
            <div style={{ marginBottom:4 }}>
              <div style={{ padding:"2px 20px 8px" }}>
                <div style={lbl}>⭐ Favorites</div>
              </div>
              <div style={{ display:"flex",gap:8,overflowX:"auto",padding:"0 20px 14px",scrollbarWidth:"none",WebkitOverflowScrolling:"touch" }}>
                {allFavs.map(item=>{
                  if (item.type==="exercise") {
                    const ex = ALL_EXERCISES[item.id];
                    if (!ex) return null;
                    const catInfo = CATS[ex._cat]||{emoji:"🏀",label:ex._cat};
                    return (
                      <div key={item.id}
                        onClick={()=>{ const e={...ex,meta:ex.meta||EXERCISE_META[ex.id]||{}}; openDetail(e,[]); }}
                        style={{ flexShrink:0,padding:"10px 13px",borderRadius:12,cursor:"pointer",
                          background:SF,border:`1px solid ${P}22`,minWidth:140,maxWidth:165 }}>
                        <div style={{ fontSize:10,color:"#475569",marginBottom:4,fontWeight:600 }}>{catInfo.emoji} {catInfo.label}</div>
                        <div style={{ fontSize:12,fontWeight:700,color:"#f1f5f9",lineHeight:1.3 }}>{ex.name}</div>
                        <div style={{ fontSize:9,color:"#334155",marginTop:4 }}>{ex.sets}</div>
                      </div>
                    );
                  }
                  if (item.type==="workout") {
                    const tmpl = WORKOUT_TEMPLATES[item.id];
                    if (!tmpl) return null;
                    return (
                      <div key={item.id}
                        onClick={()=>setSelectedTemplate(item.id)}
                        style={{ flexShrink:0,padding:"10px 13px",borderRadius:12,cursor:"pointer",
                          background:SF,border:`1px solid ${P}22`,minWidth:140,maxWidth:165 }}>
                        <div style={{ fontSize:10,color:"#475569",marginBottom:4,fontWeight:600 }}>Workout</div>
                        <div style={{ fontSize:12,fontWeight:700,color:"#f1f5f9",lineHeight:1.3 }}>{tmpl.emoji} {tmpl.name}</div>
                        <div style={{ fontSize:9,color:"#334155",marginTop:4 }}>Tap to select</div>
                      </div>
                    );
                  }
                  if (item.type==="program") {
                    const prog = PROGRAMS.find(p=>p.id===item.id);
                    if (!prog) return null;
                    return (
                      <div key={item.id}
                        onClick={()=>{ setView("programs"); setSelectedProgram(prog.id); }}
                        style={{ flexShrink:0,padding:"10px 13px",borderRadius:12,cursor:"pointer",
                          background:SF,border:`1px solid ${prog.color}33`,minWidth:140,maxWidth:165 }}>
                        <div style={{ fontSize:10,color:"#475569",marginBottom:4,fontWeight:600 }}>Program</div>
                        <div style={{ fontSize:12,fontWeight:700,color:"#f1f5f9",lineHeight:1.3 }}>{prog.emoji} {prog.name}</div>
                        <div style={{ fontSize:9,color:"#334155",marginTop:4 }}>{prog.duration} weeks</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })()}

        {/* ── COACH FKH + DASHBOARD ────────────────────────────────── */}
        {(()=>{
          const streak = (()=>{ let s=0,d=new Date(); for(let i=0;i<60;i++){const k=d.toLocaleDateString("en-CA"); if(Object.keys(completed).some(c=>c.startsWith(k)&&completed[c])){s++;d.setDate(d.getDate()-1);}else break;} return s; })();
          const nextLv  = LEVELS.find(l=>l.xpMin>xpData.total)||null;
          const xpPct   = nextLv&&currentLevel.xpNext ? Math.min(100,Math.round(((xpData.total-currentLevel.xpMin)/(currentLevel.xpNext-currentLevel.xpMin))*100)) : 100;
          const xpLeft  = nextLv ? nextLv.xpMin-xpData.total : 0;
          const weekMakesNow = (()=>{ try{ const sl=JSON.parse(localStorage.getItem("shot_log_v2")||"{}"),ws=_ws(); return Object.keys(sl).filter(k=>k>=ws).flatMap(k=>sl[k]||[]).filter(s=>s.made!==false).length; }catch{return 0;} })();
          const weekShotGoal = (()=>{ try{return parseInt(localStorage.getItem("shot_week_goal")||"100");}catch{return 100;} })();
          const allUnearned  = BADGES_DEF.filter(b=>!earnedBadges.includes(b.id)).map(b=>{ const {cur,target}=getBadgeProgress(b,completed); return {...b,cur,target,pct:cur/target}; }).sort((a,b)=>b.pct-a.pct||a.target-b.target);
          const nextBadge    = allUnearned[0]||null;

          /* ── Upcoming Unlocks: badges + next level merged, sorted by proximity ── */
          const levelItem = nextLv ? {
            id:"__level__", emoji:nextLv.emoji, name:`${nextLv.name} Level`,
            color:S, cur:xpData.total-currentLevel.xpMin,
            target:nextLv.xpMin-currentLevel.xpMin, pct:xpPct/100,
            desc:`${xpLeft} XP remaining to reach ${nextLv.name}`
          } : null;
          const upcomingPool = levelItem
            ? [...allUnearned, levelItem].sort((a,b)=>b.pct-a.pct||(a.target-a.cur)-(b.target-b.cur))
            : allUnearned;
          const upcomingBadges = upcomingPool.slice(0,3);

          const doneToday    = Object.keys(completed).filter(k=>k.startsWith(new Date().toLocaleDateString("en-CA"))&&completed[k]).length;

          /* ── Training gap: which basketball cat hasn't been hit in 7+ days ── */
          const bballGapCheck = [
            {key:"game_handles",label:"Game Handles"},{key:"footwork_lab",label:"Footwork Lab"},
            {key:"finishing_school",label:"Finishing School"},{key:"shooting_lab",label:"Shooting Lab"},
            {key:"post_moves",label:"Post Moves"},{key:"basketball_iq",label:"Basketball IQ"},
          ];
          let gapCat = null;
          const nowMs = Date.now();
          for (const {key,label} of bballGapCheck) {
            const ids = new Set((WORKOUTS[key]||[]).map(e=>e.id));
            const lastMs = Object.keys(completed).filter(k=>completed[k]&&[...ids].some(id=>k.includes(id)))
              .map(k=>new Date(k.split("-").slice(0,3).join("-")+"T12:00:00").getTime()).sort((a,b)=>b-a)[0]||0;
            if ((nowMs-lastMs)/86400000 >= 7) { gapCat=label; break; }
          }

          /* ── Closest incomplete challenge (≥60% done) ── */
          const closeChallenge = CHALLENGES_DEF
            .map(def=>{ const {cur,target}=getChallengeProgress(def,completed); return {...def,cur,target,pct:cur/target}; })
            .filter(c=>c.pct<1&&c.pct>=0.6).sort((a,b)=>b.pct-a.pct)[0]||null;

          /* ── Cross-category balance: handles vs shooting ── */
          const catDoneCount = (keys) => keys.flatMap(k=>(WORKOUTS[k]||[]).filter(e=>Object.keys(completed).some(c=>completed[c]&&c.includes(e.id)))).length;
          const handlesDone  = catDoneCount(["handles","game_handles","ballhandling"]);
          const shootingDone = catDoneCount(["shooting","shooting_lab","shootingdrills"]);
          let balanceMsg = null;
          if (handlesDone>=3 && shootingDone<2)  balanceMsg="Your ball handling is ahead — get some shooting reps to balance your game. 🎯";
          else if (shootingDone>=3 && handlesDone<2) balanceMsg="Your shooting is ahead — your weak-hand development needs attention. 🤲";

          /* ── Smart coach message (priority order) ── */
          let coachMsg = "";
          if      (streak>=3&&doneToday===0)                        coachMsg=`Keep your ${streak}-day streak alive — train today! 🔥`;
          else if (doneToday===0&&streak===0)                       coachMsg="Every champion started at zero. Let's get your first rep in. 🏀";
          else if (nextBadge&&nextBadge.target-nextBadge.cur===1)   coachMsg=`One more and you unlock the ${nextBadge.name} badge! 🏆`;
          else if (nextLv&&xpLeft<=20)                              coachMsg=`Only ${xpLeft} XP away from ${nextLv.name}. Finish strong! 🌟`;
          else if (closeChallenge)                                   coachMsg=`Only ${closeChallenge.target-closeChallenge.cur} more to complete ${closeChallenge.name}. 🎯`;
          else if (gapCat&&doneToday===0)                           coachMsg=`You haven't trained ${gapCat} in a week — today's the day. 🏀`;
          else if (balanceMsg)                                       coachMsg=balanceMsg;
          else if (doneToday>=3)                                    coachMsg=`${doneToday} drills today — you're locked in. Keep stacking! 🔥`;
          else if (doneToday>=1)                                    coachMsg="Good start today. One more session makes the difference. 💪";
          else                                                      coachMsg="Stay consistent. Every rep builds the player you're becoming. 📈";

          return (
            <>
              {/* Coach FKH */}
              <div style={{ margin:"0 20px 10px",padding:"13px 16px",borderRadius:14,background:`${P}0d`,border:`1px solid ${P}22`,display:"flex",alignItems:"flex-start",gap:12 }}>
                <div style={{ width:36,height:36,borderRadius:10,background:`${P}1a`,border:`1px solid ${P}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0 }}>🏀</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:9,fontWeight:800,color:P,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4 }}>Coach FKH</div>
                  <div style={{ fontSize:12,color:"#cbd5e1",lineHeight:1.55 }}>{coachMsg}</div>
                </div>
              </div>

              {/* Active Program Widget */}
              {(()=>{
                const activeProg = PROGRAMS.find(p => enrolledPrograms[p.id]);
                if (!activeProg) return null;
                const enrollment = enrolledPrograms[activeProg.id];
                const curWeek = programCurrentWeek(enrollment.startDate, activeProg.duration);
                const pct = Math.round(computeProgramProgress(activeProg, completed) * 100);
                const exDone = exId => Object.keys(completed).some(k => completed[k] && k.split("-").slice(3).join("-") === exId);
                const weekData = activeProg.weeks.find(w => w.week === curWeek);
                const nextSession = weekData?.sessions.find(s => !s.exercises.every(exDone));
                return (
                  <div onClick={()=>{ setView("programs"); setSelectedProgram(activeProg.id); }}
                    style={{ margin:"0 20px 10px",borderRadius:14,border:`1px solid ${activeProg.color}44`,background:`${activeProg.color}0c`,padding:"13px 14px",cursor:"pointer" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:9 }}>
                      <span style={{ fontSize:18 }}>{activeProg.emoji}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:9,fontWeight:800,color:activeProg.color,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:1 }}>Active Program</div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{activeProg.name}</div>
                      </div>
                      <span style={{ fontSize:11,fontWeight:700,color:activeProg.color }}>{pct}%</span>
                    </div>
                    <div style={{ height:4,borderRadius:99,background:"rgba(255,255,255,0.08)",marginBottom:8 }}>
                      <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:activeProg.color }}/>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <span style={{ fontSize:11,color:"#64748b" }}>Week {curWeek} of {activeProg.duration}</span>
                      {nextSession && <span style={{ fontSize:11,color:activeProg.color,fontWeight:600 }}>Next: {nextSession.focus} →</span>}
                      {!nextSession && <span style={{ fontSize:11,color:"#22c55e",fontWeight:600 }}>Week {curWeek} complete ✓</span>}
                    </div>
                  </div>
                );
              })()}

              {/* Quick Stats — streak + shot challenge */}
              <div style={{ padding:"0 20px 10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                <div style={{ background:`${P}12`,border:`1px solid ${P}28`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ fontSize:26,lineHeight:1 }}>🔥</div>
                  <div>
                    <div style={{ fontSize:24,fontWeight:800,fontFamily:"'DM Mono',monospace",color:P,lineHeight:1 }}>{streak}</div>
                    <div style={{ fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2 }}>Day Streak</div>
                  </div>
                </div>
                <div onClick={()=>setView("shots")} style={{ background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.18)",borderRadius:14,padding:"12px 14px",cursor:"pointer" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5 }}>
                    <span style={{ fontSize:14 }}>🏀</span>
                    <div style={{ fontSize:9,fontWeight:800,color:"#60a5fa",textTransform:"uppercase",letterSpacing:"0.06em" }}>Shot Challenge</div>
                  </div>
                  <div style={{ fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#60a5fa",lineHeight:1,marginBottom:4 }}>
                    {weekMakesNow}<span style={{ fontSize:10,color:"#475569",fontWeight:400 }}> / {weekShotGoal}</span>
                  </div>
                  <div style={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${Math.min(100,Math.round((weekMakesNow/weekShotGoal)*100))}%`,background:"#60a5fa",borderRadius:2 }}/>
                  </div>
                </div>
              </div>

              {/* Active Challenge Progress */}
              <div style={{ padding:"0 20px 10px" }}>
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

              {/* Level Progress */}
              <div style={{ margin:"0 20px 10px",padding:"14px 16px",borderRadius:16,background:`${S}0e`,border:`1px solid ${S}25` }}>
                <div style={{ fontSize:9,fontWeight:800,color:`${S}90`,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8 }}>⭐ Level Progress</div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:S }}>{currentLevel.emoji} {currentLevel.name}</div>
                  <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700,color:S }}>{xpData.total}<span style={{ fontSize:8,color:"#475569" }}> xp</span></div>
                </div>
                <div style={{ height:6,borderRadius:3,background:"rgba(255,255,255,0.07)",overflow:"hidden",marginBottom:5 }}>
                  <div style={{ height:"100%",width:`${xpPct}%`,background:S,borderRadius:3,transition:"width 0.6s ease" }}/>
                </div>
                <div style={{ fontSize:10,color:"#475569" }}>{nextLv?`${xpLeft} XP to reach ${nextLv.name}`:"Max Level reached 👑"}</div>
                {nextBadge&&(
                  <div onClick={()=>setView("badges")} style={{ display:"flex",alignItems:"center",gap:10,marginTop:12,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)",cursor:"pointer" }}>
                    <span style={{ fontSize:18,lineHeight:1 }}>{nextBadge.emoji}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:nextBadge.color,marginBottom:3 }}>🏆 Next Badge: {nextBadge.name}</div>
                      <div style={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
                        <div style={{ height:"100%",width:`${Math.min(100,Math.round(nextBadge.pct*100))}%`,background:nextBadge.color,borderRadius:2 }}/>
                      </div>
                    </div>
                    <div style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:nextBadge.color,fontWeight:700,flexShrink:0 }}>{nextBadge.cur}/{nextBadge.target}</div>
                  </div>
                )}
              </div>

              {/* Upcoming Unlocks */}
              {upcomingBadges.length>0&&(
                <div style={{ padding:"0 20px 10px" }}>
                  <div style={lbl}>Upcoming Unlocks</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                    {upcomingBadges.map(b=>(
                      <div key={b.id} onClick={()=>setView("badges")} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,
                        background:`${b.color}08`,border:`1px solid ${b.color}1a`,cursor:"pointer" }}>
                        <span style={{ fontSize:22,lineHeight:1 }}>{b.emoji}</span>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                            <span style={{ fontSize:11,fontWeight:700,color:b.color }}>{b.name}</span>
                            <span style={{ fontSize:10,color:"#475569",fontFamily:"'DM Mono',monospace",flexShrink:0,marginLeft:6 }}>{b.cur}/{b.target}</span>
                          </div>
                          <div style={{ height:4,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${Math.min(100,Math.round(b.pct*100))}%`,background:b.color,borderRadius:99,transition:"width 0.5s ease" }}/>
                          </div>
                          <div style={{ fontSize:9,color:"#334155",marginTop:3 }}>{b.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ── Tomorrow's Rec (Coach FKH) ──────────────────────────── */}
        {recommendation && (()=>{
          const A = str3(settings);
          const isAlreadySelected = recommendation.templateKey === selectedTemplate;
          return (
            <div style={{ margin:"0 20px 14px",borderRadius:16,background:`${A}0d`,border:`1px solid ${A}28`,overflow:"hidden" }}>
              <div style={{ padding:"11px 14px 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${A}90`,textTransform:"uppercase" }}>Tomorrow's Rec</span>
                <span style={{ fontSize:9,color:"#334155",fontFamily:"'DM Mono',monospace" }}>Coach FKH</span>
              </div>
              <div style={{ padding:"10px 14px 12px",display:"flex",alignItems:"center",gap:11 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:`${A}18`,border:`1px solid ${A}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,lineHeight:1 }}>
                  {recommendation.templateEmoji}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:A,lineHeight:1.2,marginBottom:3 }}>{recommendation.templateName}</div>
                  <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.45 }}>{recommendation.reason}</div>
                </div>
              </div>
              <div style={{ padding:"0 14px 13px" }}>
                <button onClick={()=>{ if(!isAlreadySelected) setSelectedTemplate(recommendation.templateKey); }}
                  style={{ width:"100%",padding:"9px",borderRadius:10,fontSize:12,fontWeight:700,
                    cursor:isAlreadySelected?"default":"pointer",
                    background:isAlreadySelected?`${A}18`:`${A}22`,
                    border:`1px solid ${isAlreadySelected?`${A}30`:`${A}50`}`,
                    color:isAlreadySelected?`${A}70`:A,transition:"all 0.2s" }}>
                  {isAlreadySelected?"✓ Already loaded":"Load for Today →"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Training Modules ───────────────────────────────────── */}
        <div style={{ padding:"0 20px 14px" }}>
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

        {/* ── Position Spotlight ─────────────────────────────────── */}
        {(()=>{
          const pos = settings.playStyle || "any";
          const prof = POSITION_PROFILES[pos];
          if (!prof || pos === "any" || !prof.spotlight.length) return null;
          const ALL = Object.fromEntries(Object.entries(WORKOUTS).flatMap(([cat,exs])=>exs.map(ex=>[ex.id,{...ex,_cat:cat,meta:EXERCISE_META[ex.id]||{}}])));
          const spotExs = prof.spotlight.map(id=>ALL[id]).filter(Boolean).slice(0,3);
          if (!spotExs.length) return null;
          const posColor = pos==="guard"?"#3b82f6":pos==="wing"?"#a855f7":"#f97316";
          return (
            <div style={{ padding:"0 20px 16px" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:"0.18em",color:`${posColor}99`,textTransform:"uppercase" }}>
                  {prof.emoji} {prof.label} Spotlight
                </div>
                <button onClick={()=>setShowSettings(true)} style={{ background:"none",border:"none",fontSize:10,color:"#334155",cursor:"pointer",padding:0 }}>change position</button>
              </div>
              <div style={{ fontSize:11,color:"#475569",marginBottom:10,lineHeight:1.5 }}>{prof.desc}</div>
              <div style={{ display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch" }}>
                {spotExs.map(ex=>{
                  const c=catColor(ex._cat), done2=isDone(ex.id);
                  return (
                    <button key={ex.id} onClick={()=>setActiveExercise(ex)}
                      style={{ flexShrink:0,width:148,textAlign:"left",padding:"12px",borderRadius:14,cursor:"pointer",
                        background:done2?`${c}18`:`${posColor}0b`,border:`1.5px solid ${done2?c:posColor}30`,position:"relative",overflow:"hidden" }}>
                      {done2&&<div style={{ position:"absolute",top:6,right:8,fontSize:10,color:c,fontWeight:800 }}>✓</div>}
                      <div style={{ fontSize:10,color:`${posColor}99`,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em" }}>{ex.tag}</div>
                      <div style={{ fontSize:12,fontWeight:800,color:done2?c:posColor,lineHeight:1.25,marginBottom:5 }}>{ex.name}</div>
                      <div style={{ fontSize:10,color:"#475569",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{ex.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </>)}

      {view==="schedule" && (
        <div>
          {/* ── Sub-tab switcher ─────────────────────────────── */}
          <div style={{ display:"flex",gap:8,padding:"12px 20px 10px" }}>
            {[
              { id:"week",     label:"📋 This Week" },
              { id:"calendar", label:"🗓 History"   },
            ].map(t=>(
              <button key={t.id} onClick={()=>setSchedTab(t.id)}
                style={{ flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
                  background:schedTab===t.id?P:"rgba(255,255,255,0.05)",
                  border:`1px solid ${schedTab===t.id?P:"rgba(255,255,255,0.09)"}`,
                  color:schedTab===t.id?"#000":"#64748b" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── This Week ─────────────────────────────────────── */}
          {schedTab==="week"&&(
            <div style={{ padding:"4px 20px 20px" }}>
              <div style={lbl}>Weekly Training Plan</div>
              {SCHEDULE.map((d,i)=>{
                const isToday = i===todayIdx;
                const hasWork = d.cats.length > 0;
                const dayData = Object.entries(buildCalendarData(completed))
                  .filter(([k])=>{
                    const date=new Date(k+"T12:00:00");
                    return date.getDay()===(i+1)%7 && (new Date()-date)<7*86400000;
                  })[0]?.[1];
                return (
                  <div key={i}
                    onClick={hasWork?()=>{ setActiveCat(d.cats[0]); setPrevView("schedule"); setView("cat"); }:undefined}
                    style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,
                      marginBottom:4,
                      background:isToday?`${P}0e`:"transparent",
                      border:`1px solid ${isToday?`${P}30`:"transparent"}`,
                      cursor:hasWork?"pointer":undefined }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,
                      color:isToday?P:`${P}99`,width:32,flexShrink:0,fontWeight:isToday?800:400 }}>
                      {d.day}
                    </div>
                    <div style={{ fontSize:13,color:isToday?P:`${P}dd`,flex:1,fontWeight:600 }}>{d.label}</div>
                    {dayData?.xp>0&&(
                      <span style={{ fontSize:9,fontFamily:"'DM Mono',monospace",color:"#22c55e",
                        background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",
                        borderRadius:20,padding:"2px 7px",flexShrink:0 }}>
                        +{dayData.xp} XP
                      </span>
                    )}
                    {isToday&&!dayData&&<span style={{ fontSize:9,fontWeight:800,color:P,letterSpacing:"0.06em" }}>TODAY</span>}
                    <div style={{ display:"flex",gap:5 }}>
                      {d.cats.map(c=>(
                        <button key={c}
                          onClick={e=>{ e.stopPropagation(); setActiveCat(c); setPrevView("schedule"); setView("cat"); }}
                          style={{ fontSize:11,padding:"3px 9px",borderRadius:20,background:catBg(c),
                            color:catColor(c),border:`1px solid ${catBrd(c)}`,fontWeight:600,cursor:"pointer" }}>
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

          {/* ── History calendar ──────────────────────────────── */}
          {schedTab==="calendar"&&(
            <CalendarView completed={completed} P={P} S={S} BG={BG} SF={SF} bd={bd} lbl={lbl}/>
          )}
        </div>
      )}

      {renderBottomNav()}
    </div>
  );
}

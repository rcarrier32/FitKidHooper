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
    videoId:"m8lSq4SC_eM", videoTitle:"Beginner Core — Plank Side Plank Dead Bug" },
  { id:"walk-lunge",  name:"Walking Lunges",           tag:"Day 2 Lunge",      sets:"3x10 each", rest:"45 s",
    desc:"Bodyweight first — add light dumbbells when form is automatic.",
    cues:["Front shin stays vertical","Tall torso — do not lean forward","Back knee lightly touches floor","Step long enough for parallel thigh"],
    videoId:"gLw7T14PG2o", videoTitle:"Walking Lunge with Dumbbells" },
  { id:"glute-bridge",name:"Glute Bridges",            tag:"Day 2 Hinge",      sets:"3x12", rest:"30 s",
    desc:"Lie on back, feet flat, drive hips to ceiling. Hip extension that transfers to sprinting and jumping.",
    cues:["Drive through HEELS — not balls of feet","Squeeze glutes hard at top — hold 2 seconds","Do not hyperextend the lower back","Progress: single-leg bridge"],
    videoId:"nuapk_-Q2BI", videoTitle:"How to Do a Glute Bridge — Step By Step" },
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
  { id:"str-full",    name:"Youth Strength Full Session",tag:"Full Workout",   sets:"Follow video", rest:"As directed",
    desc:"Complete guided session covering all the key strength and power patterns for young athletes.",
    cues:["Form first — pause and reset any rep that feels wrong","Never grind — if form breaks, set is done","Full rest between rounds"],
    videoId:"3shedfyWTho", videoTitle:"Strength and Power Exercises for Youth Athletes" },
];

const W_STRENGTH_EXTRA = [
  { id:"bear-crawl",  name:"Bear Crawl",               tag:"Bonus Movement", sets:"3x20 yards", rest:"30 s",
    desc:"On all fours, knees hovering 1 inch off the ground. Looks silly, builds serious coordination and full-body stability.",
    cues:["Knees stay 1 inch off the floor — do not let them touch","Opposite arm and leg move together","Hips stay LOW and level — do not rock side to side","Breathe steadily"],
    videoId:"3shedfyWTho", videoTitle:"Youth Strength + Power — Bear Crawl Included" },
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
  speed:      W_SPEED,
  balance:    W_BALANCE,
  strength:   [...W_STRENGTH, ...W_STRENGTH_EXTRA],
  handles:    W_HANDLES,
  basketball: W_BASKETBALL,
  shooting:   W_SHOOTING,
};

const CATS = {
  speed:      { label:"Speed & Agility",      emoji:"⚡" },
  balance:    { label:"Balance & Foundation", emoji:"🎯" },
  strength:   { label:"Strength Program",     emoji:"💪" },
  handles:    { label:"Ball Handling",        emoji:"🤲" },
  basketball: { label:"Basketball Skills",    emoji:"🏀" },
  shooting:   { label:"Shooting Reps",        emoji:"🎯" },
};

const SCHEDULE = [
  { day:"Mon", cats:["speed","balance"],             label:"Speed + Foundation" },
  { day:"Tue", cats:["strength","handles"],          label:"Strength + Handles" },
  { day:"Wed", cats:["balance","speed"],             label:"Foundation + Agility" },
  { day:"Thu", cats:["shooting","handles"],          label:"Shots + Ball Handling 🏀" },
  { day:"Fri", cats:["speed","basketball"],          label:"Speed + Defense" },
  { day:"Sat", cats:["strength","shooting"],         label:"Strength + Full Court" },
  { day:"Sun", cats:[],                              label:"Rest & Recovery 😴" },
];

const STR_DAYS = {
  "Day 1": { label:"Day 1 — Strength / Core",    ids:["goblet-sq","pushup","step-ups","db-rows","plank-hold"] },
  "Day 2": { label:"Day 2 — Balance / Movement", ids:["walk-lunge","glute-bridge","bosu-sq","sl-ball","side-plank"] },
  "Day 3": { label:"Day 3 — Power / Athletic",   ids:["box-jump","db-deadlift","ohp","split-sq","hollow-hold"] },
};



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
    {id:"mid_bank",     label:"Elbow",   x:64, y:118,r:13},{id:"mid_bank",    label:"Elbow",  x:161,y:118,r:13},
    {id:"mid",          label:"Wing",    x:44, y:140,r:12},{id:"mid",         label:"Wing",   x:181,y:140,r:12},
    {id:"three_corner", label:"Corner",  x:18, y:150,r:12},{id:"three_corner",label:"Corner", x:207,y:150,r:12},
    {id:"three_slot",   label:"Slot",    x:50, y:172,r:12},{id:"three_slot",  label:"Slot",   x:175,y:172,r:12},
    {id:"three_center", label:"Top 3",   x:113,y:180,r:14},
  ];
  return (
    <svg viewBox="0 0 226 200" style={{ width:"100%",maxWidth:310,display:"block",margin:"0 auto" }}>
      <rect x="2" y="2" width="222" height="196" rx="8" fill="#0f1e35" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <rect x="72" y="2" width="82" height="120" rx="3" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.09)" strokeWidth="1"/>
      <circle cx="113" cy="122" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <path d="M 18 152 Q 18 28 113 28 Q 207 28 207 152" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" strokeDasharray="4 3"/>
      <line x1="18" y1="100" x2="18" y2="152" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="207" y1="100" x2="207" y2="152" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
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
      <text x="113" y="195" textAnchor="middle" style={{ fontSize:7,fill:"rgba(255,255,255,0.18)",fontFamily:"DM Mono,monospace" }}>TAP ZONE TO LOG A MAKE</text>
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
                  <span style={{ fontSize:26,fontWeight:800,color:"#22c55e",minWidth:40,textAlign:"center",fontFamily:"'DM Mono',monospace" }}>{shotCount.made}</span>
                  <button style={stepBtn({background:"#22c55e22",borderColor:"#22c55e44"})} onClick={()=>setShotCount(c=>({...c,made:c.made+1}))}>+</button>
                </div>
                {/* Missed row */}
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#ef4444",width:68 }}>❌ Missed</span>
                  <button style={stepBtn()} onClick={()=>setShotCount(c=>({...c,missed:Math.max(0,c.missed-1)}))}>−</button>
                  <span style={{ fontSize:26,fontWeight:800,color:"#ef4444",minWidth:40,textAlign:"center",fontFamily:"'DM Mono',monospace" }}>{shotCount.missed}</span>
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

/* ═══════════════════════ DRILL CARD ═══════════════════════ */
function DrillCard({ w, color, bg2, brd, isDone, onToggle }) {
  // color-derived helpers local to this card
  const metaBg  = `${color}12`;
  const metaBrd = `${color}28`;
  const cueTxt  = `${color}cc`;
  return (
    <div style={{ background:`${color}08`,border:`1px solid ${isDone?color:metaBrd}`,borderRadius:16,overflow:"hidden",marginBottom:14,display:"flex",transition:"border-color 0.2s" }}>
      <a href={`https://www.youtube.com/watch?v=${w.videoId}`} target="_blank" rel="noopener noreferrer"
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
          <button onClick={onToggle} style={{ flexShrink:0,width:44,height:44,borderRadius:"50%",border:`2px solid ${isDone?color:metaBrd}`,background:isDone?color:metaBg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,fontWeight:800,color:isDone?"#000":color }}>
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
  const [activeCat, setActiveCat] = useState(null);
  const [completed, setCompleted] = useState(()=>{ try{return JSON.parse(localStorage.getItem("s_done")||"{}")}catch{return{}} });
  const [strDay, setStrDay] = useState(()=>localStorage.getItem('s_strday')||'Day 1');
  const [onboardName, setOnboardName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(()=>!localStorage.getItem('s_onboarded')&&settings.athleteName===DEFAULT.athleteName);

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

  const todayIdx  = new Date().getDay()===0?6:new Date().getDay()-1;
  const todayPlan = SCHEDULE[todayIdx];

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
          <button onClick={()=>setView("home")} style={{ background:`${color}14`,border:`1px solid ${color}30`,borderRadius:8,color,fontSize:12,fontWeight:700,cursor:"pointer",padding:"5px 10px",letterSpacing:"0.02em" }}>← Back</button>
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
            <DrillCard key={w.id} w={w} color={color} bg2={bg2} brd={brd} isDone={isDone(w.id)} onToggle={()=>toggle(w.id)}/>
          ))}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  /* HOME / SCHEDULE */
  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:BG,color:"#e2e8f0",minHeight:"100vh",maxWidth:680,margin:"0 auto",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      {showSettings&&<SettingsSheet settings={settings} setSettings={setSettings} onClose={()=>setShowSettings(false)}/>}
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

      {view==="home" && (<>
        <div style={{ display:"flex",gap:10,padding:"14px 20px" }}>
          {[[doneCnt,"done today",P], trainingWeek?[`Wk ${trainingWeek}`,"training week",S]:null].filter(Boolean).map(([n,l,c])=>(
            <div key={l} style={{ flex:1,background:`${c}10`,border:`1px solid ${c}40`,borderRadius:12,padding:"12px 8px",textAlign:"center" }}>
              <div style={{ fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c,lineHeight:1 }}>{n}</div>
              <div style={{ fontSize:9,color:"#334155",marginTop:4,letterSpacing:"0.06em",textTransform:"uppercase" }}>{l}</div>
            </div>
          ))}
          {!trainingWeek&&<div style={{ flex:1,background:`${S}10`,border:`1px solid ${S}40`,borderRadius:12,padding:"12px 8px",textAlign:"center",cursor:"pointer" }} onClick={()=>setShowSettings(true)}>
            <div style={{ fontSize:11,color:S,fontWeight:700 }}>Set start date</div>
            <div style={{ fontSize:9,color:"#334155",marginTop:2 }}>in ⚙ settings</div>
          </div>}
        </div>

        <div style={{ padding:"0 20px 16px" }}>
          <div style={lbl}>Today's Plan</div>
          <div style={{ background:`${P}0e`,border:`1px solid ${P}26`,borderRadius:14,padding:"14px 16px" }}>
            <div style={{ fontSize:15,fontWeight:800,color:P,marginBottom:10 }}>{todayPlan.label}</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {todayPlan.cats.map(c=>(
                <button key={c} onClick={()=>{setActiveCat(c);setView("cat");}} style={{ fontSize:11,padding:"6px 14px",borderRadius:20,fontWeight:600,background:catBg(c),color:catColor(c),border:`1px solid ${catBrd(c)}`,cursor:"pointer" }}>
                  {CATS[c].emoji} {CATS[c].label} →
                </button>
              ))}
              {todayPlan.cats.length===0&&<span style={{ color:"#475569",fontSize:12 }}>Recover. Stretch. Sleep well. 💤</span>}
            </div>
          </div>
        </div>

        <div style={{ padding:"0 20px 16px" }}>
          <div style={lbl}>Training Modules</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {Object.entries(CATS).map(([key,cat])=>{
              const done=WORKOUTS[key].filter(w=>isDone(w.id)).length, total=WORKOUTS[key].length, c=catColor(key);
              return (
                <button key={key} onClick={()=>{setActiveCat(key);setView("cat");}}
                  style={{ padding:"14px",borderRadius:16,textAlign:"left",cursor:"pointer",border:`1px solid ${catBrd(key)}`,background:catBg(key) }}>
                  <div style={{ fontSize:22,marginBottom:6 }}>{cat.emoji}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:c,lineHeight:1.25,marginBottom:2 }}>{cat.label}</div>
                  <div style={{ fontSize:10,color:`${c}99`,marginBottom:8 }}>{total} drills</div>
                  <div style={{ height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden",marginBottom:4 }}>
                    <div style={{ height:"100%",width:`${(done/total)*100}%`,background:c,borderRadius:99 }}/>
                  </div>
                  {done>0&&<div style={{ fontSize:10,fontWeight:700,color:c }}>✓ {done} done</div>}
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
            return (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:4,background:isToday?`${P}0e`:"transparent",border:`1px solid ${isToday?`${P}30`:"transparent"}` }}>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:isToday?P:`${P}99`,width:32,flexShrink:0,fontWeight:isToday?800:400 }}>{d.day}</div>
              <div style={{ fontSize:13,color:isToday?P:`${P}dd`,flex:1,fontWeight:600 }}>{d.label}</div>
              {isToday&&<span style={{ fontSize:9,fontWeight:800,color:P,letterSpacing:"0.06em" }}>TODAY</span>}
              <div style={{ display:"flex",gap:5 }}>
                {d.cats.map(c=>(
                  <span key={c} style={{ fontSize:11,padding:"3px 9px",borderRadius:20,background:catBg(c),color:catColor(c),border:`1px solid ${catBrd(c)}`,fontWeight:600 }}>
                    {CATS[c].emoji}
                  </span>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {renderBottomNav()}
    </div>
  );
}

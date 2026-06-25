/**
 * Single source of truth for the in-app Guide — tour previews, explore map,
 * and how-to copy all pull from here so nothing drifts apart.
 */

/** @typedef {{ label: string, to?: string }} GuideItem */
/** @typedef {{ key: string, emoji: string, title: string, blurb: string, navigateTo: string, tourView?: string, items: GuideItem[], howTo: string }} GuideSection */

/** @type {GuideSection[]} */
export const GUIDE_SECTIONS = [
  {
    key: "today",
    emoji: "☀️",
    title: "Today",
    blurb: "Your daily plan in one place.",
    navigateTo: "today",
    tourView: "home",
    items: [
      { label: "Daily mission — 2 drills + a shot goal" },
      { label: "Warm-up first, then drills" },
      { label: "Your path rail — next rank & moves", to: "paths" },
      { label: "Find a drill — search any exercise" },
    ],
    howTo: "Your home base: Daily Mission (bonus XP), enrolled programs, Train Like Legends, and Quick Workout. Tap section headers to expand or collapse. Tap any drill for video + coaching cues, then check it off to earn XP.",
    tourBody: "Your daily mission, enrolled programs, legend progress, and a quick workout — all on one screen. Tap any section header to expand or collapse it.",
  },
  {
    key: "squad",
    emoji: "👥",
    title: "Squad",
    blurb: "Friends, messages & squad challenges.",
    navigateTo: "squad",
    tourView: "squad",
    items: [
      { label: "Add friends by username or friend code" },
      { label: "Private messages & unread badge on tab" },
      { label: "Friends feed — wins, reactions, comments" },
      { label: "Squad challenges" },
      { label: "Tip: needs an account", to: "account" },
    ],
    howTo: "Add by username or friend code. Message privately from a friend's profile. The Squad tab badge totals unread messages, friend requests, new feed activity, and challenge updates. @mention friends in feed comments for a notification.",
    tourBody: "Friends, private messages, the friends feed, and squad challenges live here. The badge totals messages, requests, feed activity, and challenge updates.",
  },
  {
    key: "shots",
    emoji: "🏀",
    title: "Shots",
    blurb: "Track every make and miss.",
    navigateTo: "shots",
    tourView: "shots",
    items: [
      { label: "Log by shot type, then court zone or quick spot" },
      { label: "Weekly or monthly make goal", to: "shots" },
      { label: "Accuracy by zone, spot & shot type" },
    ],
    howTo: "On Shots → Log: pick shot type (Stationary, Catch & Shoot, Pull-Up, Step Back), then tap the court or a quick spot. Enter makes and misses — the app calculates your % automatically. Use the week/month toggle to set a make goal for that period.",
    tourBody: "Log by shot type, then tap the court or a quick spot. Enter makes and misses — the app calculates your %. Set a weekly or monthly make goal.",
  },
  {
    key: "programs",
    emoji: "📋",
    title: "Programs",
    blurb: "Multi-week training plans.",
    navigateTo: "programs",
    tourView: "programs",
    items: [
      { label: "Plans like Jump Higher & Become a Shooter" },
      { label: "Drills — browse every training module" },
      { label: "Quick — shuffled template workouts" },
      { label: "Build — save a custom day or week" },
    ],
    howTo: "Search any program or drill at the top. Switch between Plans, Drills, Quick workouts, and Build. Enroll in multi-week programs — progress auto-saves and you earn a badge when you finish.",
    tourBody: "Search any drill or program at the top. Switch between Plans, Drills, Quick workouts, and Build — where you can save a custom day or full week.",
  },
  {
    key: "paths",
    emoji: "⭐",
    title: "Train Like Legends",
    blurb: "Climb a legend journey.",
    navigateTo: "paths",
    tourView: "boards",
    items: [
      { label: "Ranks from rookie to legend" },
      { label: "Signature drills required for each rank" },
      { label: "Pick who you play like", to: "playlike" },
      { label: "Earn titles & card frames" },
    ],
    howTo: "On Challenges, scroll to Train Like Legends. Legend names link to real highlights. Climb ranks with reps, signature drills, and logged shot types (Catch & Shoot, Pull-Up, Step Back) — each path collapses so nothing gets buried.",
  },
  {
    key: "boards",
    emoji: "🏆",
    title: "Challenges & leaderboards",
    blurb: "Personal goals & rankings.",
    navigateTo: "boards",
    tourView: "boards",
    items: [
      { label: "Personal weekly challenges" },
      { label: "Age-group & friends leaderboards" },
      { label: "Train Like Legends paths", to: "paths" },
    ],
    howTo: "Personal goals and squad challenges show first. Rankings tab for age-group and friends leaderboards. Expand Train Like Legends for legend journeys and highlight videos.",
    tourBody: "Personal goals, rankings, and Train Like Legends paths. Expand each section to see legend journeys and highlight videos.",
  },
  {
    key: "progress",
    emoji: "📈",
    title: "Me",
    blurb: "Everything you've earned.",
    navigateTo: "progress",
    tourView: "progress",
    items: [
      { label: "XP & levels — Rookie to Elite Hooper" },
      { label: "Badges — locked ones show how to earn", to: "badges" },
      { label: "Stats, training history & calendar", to: "stats" },
      { label: "Profile, colors, account & backup", to: "settings" },
      { label: "Growth tracker & shooting %", to: "stats" },
    ],
    howTo: "Overview — your card and challenges sync. Badges — locked badges show how to earn them. Stats — streaks, shooting %, history & calendar. Settings tab — profile, colors, notifications, sign-in, and backup.",
    tourBody: "Your profile, XP, badges, stats, and Settings — all under Me. Now go get buckets!",
  },
  {
    key: "notifications",
    emoji: "🔔",
    title: "Notifications",
    blurb: "Stay in the loop.",
    navigateTo: "settings",
    items: [
      { label: "Messages, daily mission, streak & friend activity" },
      { label: "All types on by default — turn off any in Settings" },
    ],
    howTo: "Me → Settings tab → Notifications — push alerts are on by default. Uncheck any category you don't want. On iPhone, add to Home Screen first for push to work.",
  },
  {
    key: "account",
    emoji: "☁️",
    title: "Account & sync",
    blurb: "Back up across devices.",
    navigateTo: "account",
    items: [
      { label: "Username + 6-digit passcode" },
      { label: "Cloud backup, merged across your devices" },
      { label: "Unlocks friends & boards" },
    ],
    howTo: "Settings → Sign in (username + 6-digit passcode) to back up progress, keep it across devices, and add friends. Progress saves locally until you sign in.",
  },
  {
    key: "settings",
    emoji: "⚙️",
    title: "Settings",
    blurb: "Make it yours.",
    navigateTo: "settings",
    items: [
      { label: "Name, birthday, goals, who you play like" },
      { label: "App colors & theme" },
      { label: "What's new — latest update", to: "whatsnew" },
      { label: "Install on your home screen" },
    ],
    howTo: "Name, birthday, goals, who you play like, colors, notifications, What's new, and install to home screen. Six tabs at the bottom: Today, Squad, Shots, Programs, Challenges, and Me.",
  },
];

export const GUIDE_TIPS = [
  { e: "🔥", d: "Streaks are forgiving — one rest day won't break your streak. Two missed days in a row resets it." },
  { e: "⭐", d: "Tap the star on any drill, program, or workout template to save it as a favorite." },
  { e: "🔍", d: "Search exercises and programs from the Programs tab search bar — crossover, Mikan, plank, and more." },
  { e: "🛠", d: "Programs → Build — pick drills for one day or map out a full week and save your custom plan." },
  { e: "📲", d: "Add to home screen via Settings → Install. On iPhone: Safari Share → Add to Home Screen (needed for notifications)." },
  { e: "🐛", d: "Something not working? Me → Settings → Feedback Center — pick Bug or Feature idea and leave a short note." },
];

/** Tour steps derived from main nav sections — bodies stay in sync with Guide. */
export function buildTourSteps() {
  const navOrder = ["today", "squad", "shots", "programs", "boards", "progress"];
  const byKey = Object.fromEntries(GUIDE_SECTIONS.map(s => [s.key, s]));
  const navHighlight = {
    today: "home",
    squad: "squad",
    shots: "shots",
    programs: "programs",
    boards: "boards",
    progress: "progress",
  };
  const extras = {
    programs: { programsHubSection: "plans", clearProgramDetail: true },
    progress: { progressTab: "overview" },
  };
  return navOrder.map(key => {
    const sec = byKey[key];
    return {
      id: key === "progress" ? "me" : key,
      view: sec.tourView || sec.navigateTo,
      highlightNav: navHighlight[key],
      emoji: sec.emoji,
      title: sec.title,
      body: sec.tourBody || sec.howTo,
      ...extras[key],
    };
  });
}

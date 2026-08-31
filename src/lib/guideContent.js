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
      { label: "Start Today's Practice — one tap, straight in" },
      { label: "Today's Mission — drills, plan and bonus XP" },
      { label: "Shot Tracking — quick-log makes without leaving home" },
      { label: "Coach FKH — the 🏀 button in the header, on every tab" },
      { label: "Legend progress — next rank & moves", to: "paths" },
    ],
    howTo: "Your home base. Start Today's Practice sits at the top — one tap into the next drill. Below it: Today's Mission (your drills, today's plan and bonus XP), Shot Tracking (quick-log +5, +10 or +25 makes), then Squad and Train Like Legends, collapsed until you want them. Tap any drill for video + coaching cues, then check it off to earn XP. The 🏀 Coach button in the header works from every tab.",
    tourBody: "Start Today's Practice is the first thing on the screen. Under it: your daily mission and today's plan in one block, then shot tracking with quick-log buttons. Squad and legend progress sit collapsed below. Tap 🏀 in the header any time to ask Coach FKH what to work on.",
  },
  {
    key: "squad",
    emoji: "👥",
    title: "Squad",
    blurb: "Friends, messages & squad challenges.",
    navigateTo: "squad",
    tourView: "squad",
    items: [
      { label: "+ Add — search by username or redeem a friend code" },
      { label: "Squad — your roster, requests and squad challenges" },
      { label: "Messages — private chats, unread badge on the tab" },
      { label: "Feed — wins, reactions, comments" },
      { label: "Tip: needs an account", to: "account" },
    ],
    howTo: "Three tabs: Squad, Messages and Feed. Tap + Add in the header from any of them to search by username, redeem a friend code, or share your own. A friend request shows as a banner at the top of Squad — accept it right there. Squad challenges open as a dropdown under your roster. @mention friends in feed comments for a notification.",
    tourBody: "Squad, Messages and Feed. + Add sits in the header from every tab — search a username or share a friend code. Requests arrive as a banner you accept in place, and squad challenges drop down under your roster.",
  },
  {
    key: "shots",
    emoji: "🏀",
    title: "Shots",
    blurb: "Track every make and miss.",
    navigateTo: "shots",
    tourView: "shots",
    items: [
      { label: "Log — set your shot style once, then tap the court" },
      { label: "Stats — accuracy for any period, not just all-time" },
      { label: "History — are you improving? FG% over time" },
      { label: "Day, week or month make goal", to: "shots" },
    ],
    howTo: "Three tabs: Log, Stats and History. On Log, pick the day, set your shot style once (Stationary, Catch & Shoot, Pull-Up, Step Back) — it sticks between sessions — then tap a court zone and enter makes and misses. +5 saves you taps on a big session, and the button previews your % before you log it. Stats reads for whichever period you pick, from Today to All Time; tap a location to split it by shot type. History answers whether you're improving, with FG% drawn over your volume bars.",
    tourBody: "Set your shot style once, then tap the court — the app works out your %. Stats shows accuracy for any period you pick, and History draws your FG% over time so you can see whether you're improving. Tap the goal strip up top for a day, week or month target.",
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
    tourView: "progress",
    items: [
      { label: "Ranks from rookie to legend" },
      { label: "Signature drills required for each rank" },
      { label: "Pick who you play like", to: "playlike" },
      { label: "Earn titles & card frames" },
    ],
    howTo: "Me → 🏅 Badges, below your titles and trophies. Legend names link to real highlights. Climb ranks with reps, signature drills, and logged shot types (Catch & Shoot, Pull-Up, Step Back) — each path collapses so nothing gets buried. Today shows a one-line summary of the path you're on.",
  },
  {
    key: "boards",
    emoji: "🏆",
    title: "Challenges & leaderboards",
    blurb: "Personal goals & rankings.",
    navigateTo: "boards",
    tourView: "boards",
    items: [
      { label: "Personal weekly challenges, closest to done first" },
      { label: "Age-group & friends leaderboards" },
      { label: "Squad challenges live on Squad", to: "squad" },
    ],
    howTo: "Your personal challenges show first, sorted closest to done so the one you're about to finish is at the top. The Rankings tab has age-group and friends leaderboards, with your own rank and age group in a row above them. Board settings — age group, sync and refresh — sit under the rankings.",
    tourBody: "Personal challenges sorted closest to done, then age-group and friends leaderboards with your rank up top. Squad challenges live on the Squad tab; legend paths live under Me.",
  },
  {
    key: "progress",
    emoji: "📈",
    title: "Me",
    blurb: "Everything you've earned.",
    navigateTo: "progress",
    tourView: "progress",
    items: [
      { label: "Progress — who you're becoming and what's next" },
      { label: "Badges — trophies, certifications & legend paths", to: "badges" },
      { label: "Stats, training history & calendar", to: "stats" },
      { label: "Settings — colors, account & backup", to: "settings" },
      { label: "Edit your player from the athlete card" },
    ],
    howTo: "Four pills: Progress, Badges, Stats and Settings. Progress leads with who you're becoming, your next goal and recent improvements — tap Edit on your card to change your name, photo, goals or who you play like. Badges holds earned badges, titles and trophies, certifications, and your Train Like Legends paths. Stats has streaks, shooting % and history.",
    tourBody: "Progress, Badges, Stats and Settings. Progress leads with your next goal; tap Edit on your card to change your player. Badges holds trophies, certifications and your legend paths. Now go get buckets!",
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
    howTo: "Me → ⚙ Settings → Account & Safety → Notifications — push alerts are on by default. Uncheck any category you don't want. On iPhone, add to Home Screen first for push to work.",
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
    howTo: "Me → ⚙ Settings → Account & Safety → Sign in (username + 6-digit passcode) to back up progress, keep it across devices, and add friends. Progress saves locally until you sign in.",
  },
  {
    key: "settings",
    emoji: "⚙️",
    title: "Settings",
    blurb: "Make it yours.",
    navigateTo: "settings",
    items: [
      { label: "🎨 My Look — a row per color, tap to fine-tune" },
      { label: "📱 App & Data — timers, install, backup, feedback" },
      { label: "🔒 Account & Safety — sign-in, parents, notifications" },
      { label: "What's new — latest update", to: "whatsnew" },
    ],
    howTo: "Me → ⚙ Settings, split into three groups. My Look is open by default: each color is a row showing its shade and brightness — tap one to open its wheel, slider and hex field, or start from a team preset below them. App & Data has workout timers, install, backup and the Feedback Center. Account & Safety has sign-in, parent approval and notifications. Six tabs at the bottom: Today, Squad, Shots, Programs, Challenges, and Me.",
  },
];

export const GUIDE_TIPS = [
  { e: "🔥", d: "Streaks are forgiving — one rest day won't break your streak. Two missed days in a row resets it." },
  { e: "⭐", d: "Tap the star on any drill, program, or workout template to save it as a favorite." },
  { e: "🔍", d: "Search exercises and programs from the Programs tab search bar — crossover, Mikan, plank, and more." },
  { e: "🛠", d: "Programs → Build — pick drills for one day or map out a full week and save your custom plan." },
  { e: "📲", d: "Add to home screen via Me → Settings → App & Data → Install. On iPhone: Safari Share → Add to Home Screen (needed for notifications)." },
  { e: "🐛", d: "Something not working? Me → Settings → App & Data → Feedback Center — pick Bug or Feature idea and leave a short note." },
  { e: "🏀", d: "The 🏀 button in the header opens Coach FKH from any tab — ask what to work on next or how to play like your legend." },
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

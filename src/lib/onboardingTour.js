export const TOUR_STORAGE_KEY = "fkh-tour-v1-complete";

/** Legacy intro keys — marked complete when tour finishes so popups never double-fire. */
export const LEGACY_INTRO_KEYS = ["fkh-programs-intro-v1", "fkh-legends-intro-v1"];

export function isTourComplete() {
  try { return !!localStorage.getItem(TOUR_STORAGE_KEY); } catch { return false; }
}

export function markTourComplete() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    for (const key of LEGACY_INTRO_KEYS) localStorage.setItem(key, "1");
  } catch { /* ignore */ }
}

/**
 * Guided app tour — navigates real tabs and explains each area.
 * @typedef {{ id: string, view: string, highlightNav: string, emoji: string, title: string, body: string, bullets?: string[], programsHubSection?: string, progressTab?: string, clearProgramDetail?: boolean }} TourStep
 */

/** @type {TourStep[]} */
export const TOUR_STEPS = [
  {
    id: "today",
    view: "home",
    highlightNav: "home",
    emoji: "☀️",
    title: "Today — your command center",
    body: "Everything for today's training lives here. Section headers expand and collapse so you can focus on what matters.",
    bullets: [
      "Daily Mission — bonus XP when you finish required tasks",
      "My Programs — every enrolled plan in one place",
      "Train Like Legends — your path progress at a glance",
      "Quick Workout — shuffle a template and start drilling",
    ],
  },
  {
    id: "programs",
    view: "programs",
    highlightNav: "programs",
    clearProgramDetail: true,
    programsHubSection: "plans",
    emoji: "📋",
    title: "Programs — your training hub",
    body: "Search any program or drill at the top. Use the tabs below to switch modes:",
    bullets: [
      "Plans — multi-week programs; enroll and track sessions week by week",
      "Drills — browse every module (handles, shooting, strength…)",
      "Quick — ready-made workout templates to start fast",
      "Build — custom day or weekly workouts; save and rerun anytime",
    ],
  },
  {
    id: "shots",
    view: "shots",
    highlightNav: "shots",
    emoji: "🏀",
    title: "Shots — log your makes",
    body: "Tap zones on the court map (left/right detected automatically) or use Quick Tap for shot types.",
    bullets: [
      "Defaults to today — pick Yesterday or another date if you forgot to log",
      "Set a weekly make goal and watch the bar fill up",
      "Shot data feeds your stats and legend paths",
    ],
  },
  {
    id: "challenges",
    view: "boards",
    highlightNav: "boards",
    emoji: "🏆",
    title: "Challenges — compete & climb",
    body: "Personal goals, squad competitions, leaderboards, and Train Like Legends all live here.",
    bullets: [
      "Legend names are tap-to-watch links — real player highlights",
      "Train like them, hit signature-move drills, build your own game",
      "Sign in to sync stats and add friends on the leaderboard",
    ],
  },
  {
    id: "me",
    view: "progress",
    highlightNav: "progress",
    progressTab: "overview",
    emoji: "⭐",
    title: "Me — profile, friends & progress",
    body: "Your athlete card, XP level, badges, and training stats. Use the tabs to switch areas:",
    bullets: [
      "Friends — add by username, message privately, see unread badges",
      "Badges — titles and gear you unlock from paths and programs",
      "Stats — streaks, drill log, and training calendar",
    ],
  },
  {
    id: "finish",
    view: "home",
    highlightNav: "home",
    emoji: "🚀",
    title: "You're ready — go get buckets!",
    body: "Tap ❓ Help on Me anytime for the full guide, or replay this tour from Settings.",
    bullets: [
      "⚙ Settings — profile, colors, notifications, sign-in & cloud sync",
      "⭐ Favorite drills and programs with the star icon",
      "🔔 Notifications are on by default — opt out per category in Settings",
    ],
  },
];

export function applyTourStep(step, handlers) {
  if (!step) return;
  const {
    setView,
    setProgressTab,
    setProgramsHubSection,
    setSelectedProgram,
  } = handlers;
  if (step.view) setView(step.view);
  if (step.progressTab) setProgressTab(step.progressTab);
  if (step.programsHubSection) setProgramsHubSection(step.programsHubSection);
  if (step.clearProgramDetail) setSelectedProgram(null);
}

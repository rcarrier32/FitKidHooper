import { buildTourSteps } from "./guideContent.js";

export const TOUR_STORAGE_KEY = "fkh-tour-v1-complete";
export const TOUR_PROMPT_DISMISS_KEY = "fkh-tour-prompt-dismissed";

/** Legacy intro keys — marked complete when tour finishes so popups never double-fire. */
export const LEGACY_INTRO_KEYS = ["fkh-programs-intro-v1", "fkh-legends-intro-v1"];

export function isTourComplete() {
  try { return !!localStorage.getItem(TOUR_STORAGE_KEY); } catch { return false; }
}

/** Profile setup done (`s_onboarded`) but guided tour not finished or dismissed. */
export function shouldShowTourPrompt() {
  try {
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return false;
    if (localStorage.getItem(TOUR_PROMPT_DISMISS_KEY)) return false;
    if (!localStorage.getItem("s_onboarded")) return false;
    return true;
  } catch {
    return false;
  }
}

export function dismissTourPrompt() {
  try { localStorage.setItem(TOUR_PROMPT_DISMISS_KEY, "1"); } catch { /* ignore */ }
}

export function markTourComplete() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    for (const key of LEGACY_INTRO_KEYS) localStorage.setItem(key, "1");
  } catch { /* ignore */ }
}

/**
 * Guided app tour — one step per bottom-nav tab, left to right.
 * @typedef {{ id: string, view: string, highlightNav: string, emoji: string, title: string, body: string, programsHubSection?: string, progressTab?: string, clearProgramDetail?: boolean }} TourStep
 */

/** @type {TourStep[]} */
export const TOUR_STEPS = buildTourSteps();

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

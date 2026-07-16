/** Shared quick-ask prompts for Coach FKH — used by both the chat sheet's
 * quick-ask chips and the first-run "Meet Coach FKH" intro screen.
 * Labels stay kid-friendly; intents are unchanged. */
export const QUICK_PROMPTS = [
  { label: "What should I work on?", intent: "recommend_program" },
  { label: "What am I weak at?", intent: "gap_analysis" },
  { label: "What's my training plan?", intent: "pathway_adapt" },
  { label: "Play like my legend", intent: "legend_plan" },
];

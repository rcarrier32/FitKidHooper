/** Canonical analytics event names — keep in sync with supabase/analytics.sql */
export const ANALYTICS_EVENTS = {
  SESSION_START: "session_start",
  SESSION_END: "session_end",
  SCREEN_VIEW: "screen_view",
  ONBOARDING_COMPLETE: "onboarding_complete",
  ONBOARDING_TOUR_COMPLETE: "onboarding_tour_complete",
  FIRST_EXERCISE_COMPLETE: "first_exercise_complete",
  EXERCISE_COMPLETE: "exercise_complete",
  MISSION_CLAIM: "mission_claim",
  PROGRAM_ENROLL: "program_enroll",
  PROGRAM_SESSION_COMPLETE: "program_session_complete",
  CHALLENGE_COMPLETE: "challenge_complete",
  BADGE_EARN: "badge_earn",
  WORKOUT_COMPLETE: "workout_complete",
  SHOT_SESSION: "shot_session",
  VIDEO_PLAY: "video_play",
  LEVEL_UP: "level_up",
  LEADERBOARD_PUSH: "leaderboard_push",
};

export const FEEDBACK_CATEGORIES = {
  GENERAL: "general",
  BUG: "bug",
  FEATURE: "feature_request",
};

export const FEEDBACK_SENTIMENTS = {
  UP: "thumbs_up",
  DOWN: "thumbs_down",
};

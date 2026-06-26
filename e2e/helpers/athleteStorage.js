/** Minimal localStorage seed so the app boots like a returning athlete. */
export const MINIMAL_ATHLETE_STORAGE = {
  s_settings: JSON.stringify({
    primaryHue: 38,
    primarySat: 92,
    primaryLight: 55,
    secondaryHue: 245,
    secondarySat: 80,
    secondaryLight: 60,
    bgHue: 222,
    bgSat: 47,
    bgLight: 10,
    surfaceHue: 222,
    surfaceSat: 37,
    surfaceLight: 15,
    buttonHue: 222,
    buttonSat: 38,
    buttonLight: 20,
    textHue: 210,
    textSat: 25,
    textLight: 94,
    accentHue: 158,
    accentSat: 85,
    accentLight: 50,
    customSecondary: false,
    athleteName: "Braylen",
    lastName: "T",
    jerseyNumber: 7,
    favoritePlayLike: "Stephen Curry",
    dateOfBirth: "2014-06-15",
    experience: "intermediate",
    goals: ["shooting", "handles"],
    playStyle: "guard",
    workoutTimers: true,
    leaderboardSharing: true,
    startDate: "2025-09-01",
  }),
  s_done: "{}",
  "fkh-programs": "{}",
  "fkh-program-progress": "{}",
  "fkh-set-log": "{}",
  "fkh-max-reps": "{}",
  "fkh-bilateral-prefs": "{}",
  "fkh-missions": "{}",
  "fkh-favs": JSON.stringify({ exercises: {}, workouts: {}, programs: {} }),
  "fkh-badge-dates": "{}",
  "fkh-athlete-id": "3644131e-feed-4c8f-a825-0a0433b40308",
  "fkh-last-username": "braylen",
};

/** Tiny JPEG — exercises avatar load/save path without bloating storage. */
export const TINY_AVATAR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFRABAQAAAAAAAAAAAAAAAAAAABH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGwAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z";

export async function seedAthleteStorage(page, extra = {}) {
  const entries = { ...MINIMAL_ATHLETE_STORAGE, ...extra };
  await page.addInitScript((data) => {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value);
    }
  }, entries);
}

export function supabaseAuthStorageKey() {
  const url = process.env.VITE_SUPABASE_URL || "";
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  return ref ? `sb-${ref}-auth-token` : null;
}

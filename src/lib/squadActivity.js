/**
 * Local "seen" markers for Squad sub-tabs (feed + challenges).
 * Messages and friend requests use server counts instead.
 */
import { fetchFriendsFeed, fetchFeedComments } from "./feedApi.js";
import { fetchActiveChallenges } from "./challengesApi.js";
import { getBoardAthleteId } from "./boardsApi.js";

const SEEN_KEYS = {
  friends: "fkh-squad-seen-friends",
  challenges: "fkh-squad-seen-challenges",
};

export function getSquadTabSeenAt(tab) {
  try {
    return localStorage.getItem(SEEN_KEYS[tab]) || null;
  } catch {
    return null;
  }
}

export function markSquadTabSeen(tab) {
  try {
    if (SEEN_KEYS[tab]) localStorage.setItem(SEEN_KEYS[tab], new Date().toISOString());
  } catch { /* ignore */ }
}

function periodStartIso(period) {
  const now = new Date();
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Friend feed wins + comments/mentions since the Friends tab was last opened. */
export async function countUnseenFeedActivity(username) {
  const me = await getBoardAthleteId();
  if (!me) return 0;

  const lastSeen = getSquadTabSeenAt("friends");
  const cutoff = lastSeen ? new Date(lastSeen).getTime() : 0;
  const normUser = String(username || "").trim().toLowerCase();

  const [feed, commentData] = await Promise.all([
    fetchFriendsFeed(40),
    fetchFeedComments(),
  ]);

  let count = 0;
  for (const item of feed || []) {
    if (!item.isMe && new Date(item.earned_at).getTime() > cutoff) count++;
  }

  const mentionNeedle = normUser ? `@${normUser}` : "";
  for (const list of Object.values(commentData?.map || {})) {
    for (const c of list) {
      if (c.author_id === me) continue;
      if (new Date(c.created_at).getTime() <= cutoff) continue;
      if (c.target_id === me) count++;
      else if (mentionNeedle && String(c.body || "").toLowerCase().includes(mentionNeedle)) count++;
    }
  }
  return count;
}

/** 1 when an active challenge hasn't been opened this period. */
export async function countUnseenChallengeActivity() {
  const challenges = await fetchActiveChallenges();
  if (!challenges.length) return 0;

  const ch = challenges[0];
  const periodStart = new Date(periodStartIso(ch.period)).getTime();
  const seen = getSquadTabSeenAt("challenges");
  const seenTs = seen ? new Date(seen).getTime() : 0;
  return seenTs < periodStart ? 1 : 0;
}

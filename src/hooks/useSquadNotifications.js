import { useState, useEffect, useCallback } from "react";
import { unreadMessageCount } from "../lib/messagesApi.js";
import { listFriendRequests } from "../lib/boardsApi.js";
import {
  countUnseenFeedActivity,
  countUnseenChallengeActivity,
  markSquadTabSeen,
} from "../lib/squadActivity.js";

/** Aggregate unread counts across all Squad categories for the tab badge. */
export function useSquadNotifications(isSignedIn, username) {
  const [messages, setMessages] = useState(0);
  const [requests, setRequests] = useState(0);
  const [feedActivity, setFeedActivity] = useState(0);
  const [challengeActivity, setChallengeActivity] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setMessages(0);
      setRequests(0);
      setFeedActivity(0);
      setChallengeActivity(0);
      return;
    }
    const [msgN, reqList, feedN, challengeN] = await Promise.all([
      unreadMessageCount(),
      listFriendRequests().catch(() => []),
      countUnseenFeedActivity(username).catch(() => 0),
      countUnseenChallengeActivity().catch(() => 0),
    ]);
    const reqN = Array.isArray(reqList) ? reqList.length : 0;
    setMessages(typeof msgN === "number" && msgN > 0 ? msgN : 0);
    setRequests(reqN);
    setFeedActivity(typeof feedN === "number" && feedN > 0 ? feedN : 0);
    setChallengeActivity(typeof challengeN === "number" && challengeN > 0 ? challengeN : 0);
  }, [isSignedIn, username]);

  useEffect(() => {
    refresh();
    if (!isSignedIn) return undefined;
    const timer = setInterval(refresh, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, isSignedIn]);

  const markTabSeen = useCallback((tab) => {
    markSquadTabSeen(tab);
    refresh();
  }, [refresh]);

  const squadNotifications = messages + requests + feedActivity + challengeActivity;

  return {
    squadNotifications,
    unreadMessages: messages,
    friendRequests: requests,
    feedActivity,
    challengeActivity,
    markSquadTabSeen: markTabSeen,
    refreshSquadNotifications: refresh,
  };
}

import { useState, useEffect, useCallback } from "react";
import { unreadMessageCount } from "../lib/messagesApi.js";
import { listFriendRequests } from "../lib/boardsApi.js";

/** Unread messages + pending friend requests for Squad tab badge. */
export function useSquadNotifications(isSignedIn) {
  const [count, setCount] = useState(0);
  const [messages, setMessages] = useState(0);
  const [requests, setRequests] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setCount(0);
      setMessages(0);
      setRequests(0);
      return;
    }
    const [msgN, reqList] = await Promise.all([
      unreadMessageCount(),
      listFriendRequests().catch(() => []),
    ]);
    const reqN = Array.isArray(reqList) ? reqList.length : 0;
    const m = typeof msgN === "number" && msgN > 0 ? msgN : 0;
    setMessages(m);
    setRequests(reqN);
    setCount(m + reqN);
  }, [isSignedIn]);

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

  return { squadNotifications: count, unreadMessages: messages, friendRequests: requests, refreshSquadNotifications: refresh };
}

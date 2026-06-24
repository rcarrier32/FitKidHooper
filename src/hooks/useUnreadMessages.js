import { useState, useEffect, useCallback, useRef } from "react";
import { unreadMessageCount } from "../lib/messagesApi.js";
import { notifyNewMessage } from "../lib/notifications.js";

/** Poll unread direct-message count while signed in (nav badges + headers). */
export function useUnreadMessages(isSignedIn, userId) {
  const [count, setCount] = useState(0);
  const prevCount = useRef(0);

  const refresh = useCallback(async () => {
    if (!isSignedIn || !userId) {
      setCount(0);
      prevCount.current = 0;
      return;
    }
    const n = await unreadMessageCount();
    const next = typeof n === "number" && n > 0 ? n : 0;
    if (next > prevCount.current) notifyNewMessage();
    prevCount.current = next;
    setCount(next);
  }, [isSignedIn, userId]);

  useEffect(() => {
    refresh();
    if (!isSignedIn || !userId) return undefined;
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
  }, [refresh, isSignedIn, userId]);

  return { unreadMessages: count, refreshUnreadMessages: refresh };
}

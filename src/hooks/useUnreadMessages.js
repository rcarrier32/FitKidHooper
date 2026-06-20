import { useState, useEffect, useCallback } from "react";
import { unreadMessageCount } from "../lib/messagesApi.js";

/** Poll unread direct-message count while signed in (nav badges + headers). */
export function useUnreadMessages(isSignedIn) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setCount(0);
      return;
    }
    const n = await unreadMessageCount();
    setCount(typeof n === "number" && n > 0 ? n : 0);
  }, [isSignedIn]);

  useEffect(() => {
    refresh();
    if (!isSignedIn) return undefined;
    const timer = setInterval(refresh, 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, isSignedIn]);

  return { unreadMessages: count, refreshUnreadMessages: refresh };
}

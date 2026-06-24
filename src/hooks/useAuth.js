import { useEffect, useState, useCallback } from "react";
import {
  getAuthSession,
  onAuthStateChange,
  linkDeviceProfileOnAuth,
  signOut,
  isAuthConfigured,
  getSignedInUsername,
} from "../lib/auth.js";
import { getSupabaseClient } from "../lib/supabaseClient.js";
import { syncCloudSave } from "../lib/cloudSave.js";
import { setAnalyticsAthleteId } from "../lib/analytics.js";

export function useAuth(settings) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncDetail, setSyncDetail] = useState(null);

  useEffect(() => {
    let mounted = true;
    let initialResolved = false;

    const resolveUser = (u) => {
      if (!mounted) return;
      setUser(u);
      setAnalyticsAthleteId(u?.id ?? null);
    };

    const finishInitialLoad = () => {
      if (!mounted || initialResolved) return;
      initialResolved = true;
      setLoading(false);
    };

    const unsub = onAuthStateChange((session, event) => {
      resolveUser(session?.user ?? null);
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        finishInitialLoad();
      }
    });

    getAuthSession().then(({ user: u }) => {
      resolveUser(u);
      finishInitialLoad();
    });

    const sb = getSupabaseClient();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !sb) return;
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        resolveUser(session?.user ?? null);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      unsub();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !settings) return;
    linkDeviceProfileOnAuth(user, settings).catch(() => {});
  }, [user?.id, settings?.athleteName]);

  const syncNow = useCallback(async () => {
    if (!user?.id) return { ok: false, error: "Not signed in" };
    setSyncStatus("syncing");
    setSyncDetail(null);
    const result = await syncCloudSave(user.id);
    if (result.ok && result.restored) setSyncStatus("restored");
    else if (result.ok && result.skipped) setSyncStatus("skipped");
    else setSyncStatus(result.ok ? "ok" : "error");
    setSyncDetail(result);
    return result;
  }, [user?.id]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isConfigured: isAuthConfigured(),
    syncStatus,
    syncDetail,
    syncNow,
    logout,
    isSignedIn: Boolean(user?.id),
    username: getSignedInUsername(user),
  };
}

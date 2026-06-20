import { useEffect, useState, useCallback } from "react";
import {
  getAuthSession,
  onAuthStateChange,
  linkDeviceProfileOnAuth,
  signOut,
  isAuthConfigured,
  getSignedInUsername,
} from "../lib/auth.js";
import { syncCloudSave } from "../lib/cloudSave.js";
import { setAnalyticsAthleteId } from "../lib/analytics.js";

export function useAuth(settings) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncDetail, setSyncDetail] = useState(null);

  useEffect(() => {
    let mounted = true;
    getAuthSession().then(({ user: u }) => {
      if (mounted) { setUser(u); setLoading(false); setAnalyticsAthleteId(u?.id ?? null); }
    });
    const unsub = onAuthStateChange(session => {
      setUser(session?.user ?? null);
      setAnalyticsAthleteId(session?.user?.id ?? null);
    });
    return () => { mounted = false; unsub(); };
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

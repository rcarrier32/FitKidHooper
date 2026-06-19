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
    const result = await syncCloudSave(user.id);
    setSyncStatus(result.ok ? "ok" : "error");
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
    syncNow,
    logout,
    isSignedIn: Boolean(user?.id),
    username: getSignedInUsername(user),
  };
}

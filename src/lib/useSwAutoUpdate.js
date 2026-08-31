import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registers the PWA service worker and polls for a fresher build.
 *
 * Previously this only ran inside the athlete app's component tree
 * (via UpdateBanner), so any route that returns before that tree mounts —
 * the admin dashboard, the parent-consent page — never registered a
 * refresh check at all. A stale service worker already controlling the
 * origin would then serve pre-fix JS on those routes forever, with nothing
 * in the page able to notice or self-heal. Mounting UpdateBanner (which
 * calls this) unconditionally in App() makes every route check for
 * updates.
 *
 * Reloading is limited to a cold launch. An earlier version called
 * `updateServiceWorker(true)` whenever `needRefresh` flipped true, which
 * looped: each reload re-ran the immediate `.update()` below, re-detected a
 * refresh, and reloaded again before the page settled. Doing nothing at all
 * was the fix, but it went too far — `skipWaiting`+`clientsClaim` activate a
 * new build, yet an installed PWA keeps running the old bundle until
 * something reloads it, so athletes sat on stale builds indefinitely with no
 * signal. Now a waiting build is applied only within the first few seconds
 * after start, guarded by a session flag: the reloaded page finds no waiting
 * worker, so there is nothing to loop on, and nobody loses a screen
 * mid-drill. After that window an update waits for the athlete to tap the
 * UpdateBanner, which is why `updateServiceWorker` is still returned.
 */
/* A build found within this window of app start is treated as a cold launch:
   applying it costs the athlete nothing because they have not done anything
   yet. After it, an update waits for the banner so we never yank a screen out
   from under someone mid-drill. */
const COLD_LAUNCH_MS = 6000
const startedAt = Date.now()

export function useSwAutoUpdate() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      registration.update()
      setInterval(() => registration.update(), 5 * 60 * 1000)
    },
  })

  /* An installed PWA can hold a stale shell across launches: skipWaiting and
     clientsClaim activate the new worker, but the open page keeps running the
     old bundle until something reloads it. The previous version never
     reloaded at all, to avoid a loop, which left athletes on builds that were
     weeks old with no signal. Reloading only during the first few seconds
     after start cannot loop -- the reloaded page finds no waiting worker, and
     if it somehow did, the flag below stops a second pass. */
  useEffect(() => {
    if (!needRefresh) return
    if (Date.now() - startedAt > COLD_LAUNCH_MS) return
    try {
      if (sessionStorage.getItem('fkh-sw-cold-reloaded')) return
      sessionStorage.setItem('fkh-sw-cold-reloaded', '1')
    } catch { /* ignore */ }
    updateServiceWorker(true)
  }, [needRefresh, updateServiceWorker])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      navigator.serviceWorker?.getRegistration()?.then(r => r?.update())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return { needRefresh, updateServiceWorker }
}

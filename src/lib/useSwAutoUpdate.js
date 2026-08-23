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
 * This deliberately does NOT force a reload on its own: vite.config's
 * workbox `skipWaiting`+`clientsClaim` already activate a new build and
 * take over open pages as soon as one is found, so the next navigation
 * picks up fresh code by itself. An earlier version of this hook called
 * `updateServiceWorker(true)` automatically whenever `needRefresh` flipped
 * true, which caused a reload loop: each reload re-ran the immediate
 * `.update()` check below, which could re-detect a refresh was needed and
 * reload again before the page ever settled. `updateServiceWorker` is
 * still returned so UpdateBanner can apply an update immediately, but only
 * in response to an athlete tapping the button — a one-shot, user-driven
 * call, not an automatic loop.
 */
export function useSwAutoUpdate() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      registration.update()
      setInterval(() => registration.update(), 5 * 60 * 1000)
    },
  })

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

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
 * in the page able to notice or self-heal. Calling this at the top of
 * App() makes every route check for updates.
 *
 * `silent` skips the "new version" banner and immediately reloads once an
 * update is found — used for the admin/consent routes, where there's no
 * athlete mid-session to protect from a surprise refresh.
 */
export function useSwAutoUpdate({ silent = false } = {}) {
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

  useEffect(() => {
    if (silent && needRefresh) updateServiceWorker(true)
  }, [silent, needRefresh, updateServiceWorker])

  return { needRefresh, updateServiceWorker }
}

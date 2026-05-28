import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'fkh-install-dismissed'

function isStandalone() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return

    // Android/Chrome — capture native prompt
    const handler = e => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — show manual instructions after a short delay
    if (isIOS()) {
      const t = setTimeout(() => setShow(true), 1500)
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler) }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Hide banner once the app is installed from native prompt
  useEffect(() => {
    const handler = () => { setInstalled(true); setShow(false) }
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setShow(false)
  }

  if (!show || installed || isStandalone()) return null

  const ios = isIOS()

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
      left: 12,
      right: 12,
      zIndex: 200,
      background: '#0f1e35',
      border: '1px solid #f97316',
      borderRadius: 16,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>🏀</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', marginBottom: 4 }}>
          Install FTH Fit Kid Hooper
        </div>
        {ios ? (
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
            Tap the <strong style={{ color: '#e2e8f0' }}>Share</strong> button{' '}
            <span style={{ fontSize: 14 }}>⎋</span> at the bottom of Safari, then tap{' '}
            <strong style={{ color: '#e2e8f0' }}>"Add to Home Screen"</strong> to install as an app.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
            Add to your home screen for the full app experience — works offline too.
          </div>
        )}
        {!ios && deferredPrompt && (
          <button
            onClick={triggerInstall}
            style={{
              marginTop: 10,
              background: '#f97316',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Install App
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#475569',
          fontSize: 18,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  )
}

import { Component } from 'react'
import FitKidHooperApp from './FitKidHooperApp.jsx'
import UpdateBanner from './UpdateBanner'
import InstallBanner from './InstallBanner'
import AdminDashboard from './components/AdminDashboard.jsx'
import ParentConsentPage from './components/ParentConsentPage.jsx'
import { isAdminDashboardEnabled } from './lib/adminAccess.js'
import { consentTokenFromUrl } from './lib/parentConsent.js'
import { repairStoredObjectKeys } from './lib/storageParse.js'
import { migrateAvatarOutOfSettings } from './lib/avatarStorage.js'

class BootErrorBoundary extends Component {
  state = { error: null, attempt: 0 }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[fkh] boot failed', error, info)
    try { window.__FKH_BOOT_ERROR__ = String(error?.message || error) } catch { /* ignore */ }
  }

  componentDidMount() {
    const el = document.getElementById('fkh-boot-shell')
    if (el) el.style.display = 'none'
  }

  retry = () => {
    try {
      repairStoredObjectKeys()
      migrateAvatarOutOfSettings()
    } catch { /* ignore */ }
    this.setState(s => ({ error: null, attempt: s.attempt + 1 }))
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#060b14',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40 }}>🏀</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f97316' }}>Couldn&apos;t start the app</div>
          <div style={{ fontSize: 13, color: '#94a3b8', maxWidth: 320, lineHeight: 1.5 }}>
            Your training progress is saved. Tap try again — we&apos;ll repair and reload.
          </div>
          <button
            type="button"
            onClick={this.retry}
            style={{
              background: '#f97316',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return (
      <>
        <InstallBanner />
        <FitKidHooperApp key={this.state.attempt} />
      </>
    )
  }
}

export default function App() {
  // UpdateBanner registers the service worker and checks for updates. It
  // used to live only inside BootErrorBoundary's tree, so the admin
  // dashboard and parent-consent routes below never ran any update check
  // at all — a service worker already caching an old build just kept
  // serving it forever on those URLs with nothing to notice or self-heal.
  // Mounting it here, above the route branch, fixes that for every route.
  // (It only ever reloads when someone taps its "Update" button — no
  // automatic reload, see useSwAutoUpdate for why that matters.)
  return (
    <>
      <UpdateBanner />
      <AppRoute />
    </>
  )
}

function AppRoute() {
  // A parent following the approval link is not an athlete — they get the
  // consent page, never the kid's app. Checked first so the link always wins.
  if (consentTokenFromUrl()) {
    return <ParentConsentPage />
  }

  if (isAdminDashboardEnabled()) {
    return <AdminDashboard />
  }

  return <BootErrorBoundary />
}

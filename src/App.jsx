import { Component, Suspense, lazy } from 'react'
import UpdateBanner from './UpdateBanner'
import InstallBanner from './InstallBanner'
import AdminDashboard from './components/AdminDashboard.jsx'
import { isAdminDashboardEnabled } from './lib/adminAccess.js'

const FitKidHooperApp = lazy(() => import('./FitKidHooperApp.jsx'))

function BootShell() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#060b14',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif',
      gap: 12,
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>🏀</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#f97316' }}>Fit Kid Hooper</div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>Loading your training…</div>
    </div>
  )
}

class BootErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[fkh] boot failed', error, info)
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
            Try opening the page again. Your training progress is saved.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
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
    return this.props.children
  }
}

export default function App() {
  if (isAdminDashboardEnabled()) {
    return <AdminDashboard />
  }

  return (
    <BootErrorBoundary>
      <UpdateBanner />
      <InstallBanner />
      <Suspense fallback={<BootShell />}>
        <FitKidHooperApp />
      </Suspense>
    </BootErrorBoundary>
  )
}

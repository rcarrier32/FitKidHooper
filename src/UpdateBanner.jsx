import { useSwAutoUpdate } from './lib/useSwAutoUpdate.js'
import { showWhatsNewSheet } from './lib/changelog.js'

/**
 * Shows a brief banner when a reload is pending so athletes know why the
 * app refreshed. The actual SW registration/update-check now lives in
 * useSwAutoUpdate so every route (including admin/consent) can run it —
 * see App.jsx.
 */
export default function UpdateBanner() {
  const { needRefresh, updateServiceWorker } = useSwAutoUpdate()

  if (!needRefresh) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      left: 12,
      right: 12,
      maxWidth: 420,
      margin: '0 auto',
      zIndex: 5000,
      background: '#f97316',
      color: '#000',
      borderRadius: 14,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 13,
      fontWeight: 700,
      boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
    }}>
      <span>🏀 New version ready</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={showWhatsNewSheet}
          style={{
            background: 'transparent',
            color: '#000',
            border: '1.5px solid rgba(0,0,0,0.35)',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          What&apos;s new
        </button>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          style={{
            background: '#000',
            color: '#f97316',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>
    </div>
  )
}


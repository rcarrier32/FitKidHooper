import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (r) setInterval(() => r.update(), 5 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: '#f97316',
      color: '#000',
      borderRadius: 12,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 13,
      fontWeight: 700,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      🏀 Update available!
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: '#000',
          color: '#f97316',
          border: 'none',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Refresh
      </button>
    </div>
  )
}

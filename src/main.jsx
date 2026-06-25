import { createRoot } from 'react-dom/client'
import { repairStoredObjectKeys } from './lib/storageParse.js'
import { migrateAvatarOutOfSettings } from './lib/avatarStorage.js'
import './index.css'
import App from './App.jsx'

try {
  repairStoredObjectKeys()
  migrateAvatarOutOfSettings()
} catch (e) {
  console.error('[fkh] pre-boot repair failed', e)
}

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(<App />)
}

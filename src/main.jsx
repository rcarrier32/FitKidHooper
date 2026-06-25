import { createRoot } from 'react-dom/client'
import { repairStoredObjectKeys } from './lib/storageParse.js'
import { migrateAvatarOutOfSettings } from './lib/avatarStorage.js'
import './index.css'
import App from './App.jsx'

repairStoredObjectKeys()
migrateAvatarOutOfSettings()

createRoot(document.getElementById('root')).render(<App />)

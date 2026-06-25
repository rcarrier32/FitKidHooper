import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { repairStoredObjectKeys } from './lib/storageParse.js'
import './index.css'
import App from './App.jsx'

repairStoredObjectKeys()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

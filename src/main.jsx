import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ColyseusApp from './ColyseusApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColyseusApp />
  </StrictMode>,
)

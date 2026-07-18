import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ColyseusApp from './ColyseusApp.jsx'

const Game = import.meta.env.VITE_NETWORK_BACKEND === 'colyseus' ? ColyseusApp : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Game />
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@fontsource-variable/inter'
import '@/index.css'
import { applyAmbientPreference } from '@/lib/ambient'

// Apply the ambient-background preference before first paint so a user who
// disabled it never sees a frame of animation.
applyAmbientPreference();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

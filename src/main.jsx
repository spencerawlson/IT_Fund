import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@fontsource-variable/inter'
import '@/index.css'
import { applyAmbientPreference } from '@/lib/ambient'
import { installNativeFetch } from '@/lib/native'

// iOS/Android apps: attach the session token and guest id to API calls (no-op on the website).
installNativeFetch();

// Apply the ambient-background preference before first paint so a user who
// disabled it never sees a frame of animation.
applyAmbientPreference();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

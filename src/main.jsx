import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@fontsource-variable/inter'
import '@/index.css'
import { installNativeFetch } from '@/lib/native'

// iOS/Android apps: attach the session token and guest id to API calls (no-op on the website).
installNativeFetch();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

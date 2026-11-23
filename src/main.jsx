import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@fontsource-variable/inter'
import '@/index.css'
import { installNativeFetch } from '@/lib/native'
import { initIap } from '@/lib/iap'

// iOS/Android apps: attach the session token and guest id to API calls (no-op on the website).
installNativeFetch();

// iOS shell only: subscribe to StoreKit transaction updates and sync the
// current entitlements on launch (restore purchases). No-op everywhere
// else; a landed transaction refreshes the subscription state through the
// subscription cache clear below.
initIap(async () => {
  const { clearSubscriptionCache } = await import('@/lib/subscription');
  clearSubscriptionCache();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

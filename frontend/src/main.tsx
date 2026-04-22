import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'

// Self-hosted display font for Birik brand (Inter + JetBrains Mono already loaded via design system)
import '@fontsource/archivo-black/400.css'

import './index.css'
import App from './App.tsx'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 10, // keep unused cache 10 min (reduce refetches when navigating)
      // If the backend is down (CONNECTION_REFUSED / Failed to fetch), don't
      // retry 3× by default — it spams the console and delays offline-mode
      // fallback. Retry once for genuinely transient errors, then give up.
      retry: (failureCount, error) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (/failed to fetch|networkerror|err_connection|load failed/i.test(msg)) {
          return false;
        }
        return failureCount < 1;
      },
      // Same reasoning for window-focus refetch: spam when offline.
      refetchOnWindowFocus: false,
    },
  },
});

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

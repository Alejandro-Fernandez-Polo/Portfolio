import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from './libs/i18n/i18n.js'
import App from './App.jsx'
import * as Sentry from '@sentry/react'
import SentryFallback from './components/SentryFallback.jsx'
import { initSentry } from './libs/monitoring/sentry.js'
import './index.css'

// Se inicializa antes de montar React para que Sentry también reciba fallos síncronos de arranque.
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <Sentry.ErrorBoundary fallback={<SentryFallback />}>
        <App />
      </Sentry.ErrorBoundary>
    </I18nextProvider>
  </React.StrictMode>,
)

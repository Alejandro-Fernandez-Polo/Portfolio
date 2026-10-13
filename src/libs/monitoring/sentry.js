import * as Sentry from "@sentry/react"

// URLs can contain shared state or form-related tokens after `?` or `#`.
function sanitizeUrl(value) {
  try {
    const url = new URL(value, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  // Builds without explicit configuration stay silent, including local and test runs.
  if (!dsn || !import.meta.env.PROD) return

  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT ||
      (import.meta.env.PROD ? "production" : "development"),
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    initialScope: { tags: { app: "portfolio", surface: "react" } },
    beforeSend(event) {
      // Keep diagnostic stacks while excluding request payloads and URL parameters.
      if (event.request) {
        if (event.request.url) event.request.url = sanitizeUrl(event.request.url)
        delete event.request.query_string
        delete event.request.data
      }
      delete event.user
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      // Console arguments can contain user data, so keep network/navigation context only.
      if (breadcrumb.category === "console") return null
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url)
      }
      return breadcrumb
    },
  })
}

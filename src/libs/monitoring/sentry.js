import * as Sentry from "@sentry/react"

/**
 * Oculta parámetros y fragmentos de URL, que pueden contener estado compartido o datos de formulario.
 * @param {string} value URL absoluta o relativa a la página.
 * @returns {string} Origen y ruta, o el valor original si no se puede analizar.
 */
function sanitizeUrl(value) {
  try {
    const url = new URL(value, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}

/**
 * Activa la monitorización del navegador solo en producción y con una DSN configurada.
 * @returns {void}
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  // Sin DSN, los builds locales y los tests permanecen silenciosos.
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
      // Conserva las trazas de diagnóstico, pero elimina datos del cuerpo y parámetros de URL.
      if (event.request) {
        if (event.request.url) event.request.url = sanitizeUrl(event.request.url)
        delete event.request.query_string
        delete event.request.data
      }
      delete event.user
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      // Los argumentos de consola pueden incluir datos personales; no se adjuntan al evento.
      if (breadcrumb.category === "console") return null
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url)
      }
      return breadcrumb
    },
  })
}

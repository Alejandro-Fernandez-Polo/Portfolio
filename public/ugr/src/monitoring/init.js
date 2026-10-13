(function () {
  const dsn = window.__UGR_SENTRY_DSN__
  const sdk = window.Sentry
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(location.hostname)

  if (!dsn || !sdk || isLocal) {
    window.__UGRMonitoring = {
      captureException() {},
      count() {},
    }
    return
  }

  const environment = ["alejandrofernandezpolo.com", "www.alejandrofernandezpolo.com"].includes(
    location.hostname,
  )
    ? "production"
    : "preview"

  // The SDK's standard global handlers observe onerror/rejections before legacy scripts run;
  // custom duplicate listeners would report the same exception twice.
  sdk.init({
    dsn,
    environment,
    integrations: [sdk.browserTracingIntegration()],
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    initialScope: { tags: { app: "ugr", surface: "vanilla-js" } },
    beforeSend(event) {
      // User-supplied strings can appear in exception messages, so retain type/stack only.
      if (event.request) {
        if (event.request.url) event.request.url = sanitizeUrl(event.request.url)
        delete event.request.query_string
        delete event.request.data
      }
      event.exception?.values?.forEach((value) => {
        value.value = value.type || "UGR client error"
      })
      delete event.user
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      // Console arguments can contain user data, so don't attach them to error events.
      if (breadcrumb.category === "console") return null
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url)
      }
      return breadcrumb
    },
  })

  window.__UGRMonitoring = {
    captureException(error) {
      sdk.captureException(error)
    },
    count(name) {
      sdk.metrics.count(name, 1, { attributes: { app: "ugr" } })
    },
  }

  document.addEventListener("ugr:configSaved", () => {
    window.__UGRMonitoring.count("ugr.guardar_config")
  })

  function sanitizeUrl(value) {
    try {
      const url = new URL(value, location.origin)
      return `${url.origin}${url.pathname}`
    } catch {
      return value
    }
  }
})()

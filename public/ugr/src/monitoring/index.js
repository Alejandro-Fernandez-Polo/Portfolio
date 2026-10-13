// Tests and local callers without a browser remain no-ops until the early script enables Sentry.
export function captureException(error) {
  globalThis.window?.__UGRMonitoring?.captureException(error)
}

export function count(name) {
  globalThis.window?.__UGRMonitoring?.count(name)
}

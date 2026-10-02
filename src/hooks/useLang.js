import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"

export function useLang() {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState(() =>
    (i18n.resolvedLanguage || i18n.language || "en").split("-")[0],
  )

  useEffect(() => {
    const base = () =>
      (i18n.resolvedLanguage || i18n.language || "en").split("-")[0]
    setLang(base())

    const handler = () => setLang(base())
    const emitter = i18n.services?.events
    if (emitter) {
      emitter.on("languageChanged", handler)
      return () => emitter.off("languageChanged", handler)
    }
  }, [i18n])

  return lang
}

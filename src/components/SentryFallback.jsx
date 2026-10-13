import { useTranslation } from "react-i18next"
import "./css/SentryFallback.css"

export default function SentryFallback() {
  const { t } = useTranslation("footer")

  return (
    <main className="monitoring-fallback" role="alert">
      <h1>{t("error.title")}</h1>
      <p>{t("error.description")}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t("error.reload")}
      </button>
    </main>
  )
}

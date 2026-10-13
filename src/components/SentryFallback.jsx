import { useTranslation } from "react-i18next"
import "./css/SentryFallback.css"

/**
 * Sustituye una pantalla en blanco por un aviso accesible y una acción de recuperación.
 * @returns {import("react").JSX.Element} Mensaje traducido y acción para recargar.
 */
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

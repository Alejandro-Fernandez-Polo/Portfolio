import { useTranslation } from "react-i18next"
import './css/Alert.css'

export function Alert({ type, text }) {
  const { t } = useTranslation("contact")
  return (
    <div className="alert-container">
      <div
        className={`alert-box ${
          type === "danger" ? "alert-box-danger" : "alert-box-success"
        }`}
        role="alert"
      >
        <p
          className={`alert-badge ${
            type === "danger" ? "alert-badge-danger" : "alert-badge-success"
          }`}
        >
          {type === "danger" ? t("alerts.failed") : t("alerts.success_badge")}
        </p>
        <p className="alert-text">{text}</p>
      </div>
    </div>
  )
}

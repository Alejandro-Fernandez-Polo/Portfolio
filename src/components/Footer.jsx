import { useTranslation } from "react-i18next"
import "./css/Footer.css"

export default function Footer() {
  const { t } = useTranslation("footer")
  const year = new Date().getFullYear()

  return (
    <footer className="site-foot">
      <div className="container foot-inner mono">
        <p>© {year} Alejandro Fernández Polo</p>
        <a className="to-top" href="#top">
          {t("top")}
        </a>
      </div>
    </footer>
  )
}

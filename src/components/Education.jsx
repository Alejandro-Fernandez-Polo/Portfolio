import { useTranslation } from "react-i18next"
import { useLang } from "../hooks/useLang.js"
import { education } from "../constants/education.js"
import "./css/Education.css"

// Sin <section>: es la columna derecha del bloque de Experience. Su `.reveal`
// lo observa el useReveal de Experience (mismo contenedor).
/**
 * Renderiza educación como aside dentro del grid de experiencia, no como sección hermana.
 * @returns {import("react").JSX.Element} Columna de educación.
 */
export default function Education() {
  const { t } = useTranslation("education")
  const lang = useLang()

  return (
    <aside className="track-edu reveal" id="education">
      <span className="sec-num mono">{t("sec")}</span>
      <h3 className="track-edu-title">{t("title")}</h3>
      <div className="edu-list">
        {education.map((item) => {
          const trans = t(item.id, { returnObjects: true })
          return (
            <div className="edu-row" key={item.id}>
              <h4>{trans.title}</h4>
              <p className="mono">{item.date[lang] || item.date.en}</p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

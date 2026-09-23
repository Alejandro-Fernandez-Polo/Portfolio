import { useTranslation } from "react-i18next"
import { useLang } from "../hooks/useLang.js"
import { education } from "../constants/education.js"
import "./css/Education.css"

export default function Education() {
  const { t } = useTranslation("education")
  const lang = useLang()

  return (
    <section id="education">
      <div className="section-header">
        <h2>{t("title")}</h2>
      </div>
      <div className="education-grid">
        {education.map((item) => {
          const trans = t(`education.${item.id}`, { returnObjects: true })
          return (
            <div key={item.id} className="education-card">
              <h3>{trans.title}</h3>
              <p>{item.date[lang] || item.date.en}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

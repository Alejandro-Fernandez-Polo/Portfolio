import { useTranslation, Trans } from "react-i18next"
import { education } from "../constants/index.js"
export default function Education() {
  const { t, i18n } = useTranslation("education")
  const educationItems = education

  return (
    <section id="education">
      <div className="section-header">
        <h2>{t("title")}</h2>
      </div>
      <div className="education-grid">
        {education.map((item, index) => {
          const trans = t(`education.${item.id}`, { returnObjects: true })
          return (
            <div key={item.id} className="education-card">
              <h3>{trans.title}</h3>
              <p>{item.date[i18n.language]}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

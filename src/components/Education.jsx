import { useTranslation, Trans } from "react-i18next"
import { useState, useEffect } from "react"
import { education } from "../constants/index.js"
import "./css/Education.css"

export default function Education() {
  const { t, i18n } = useTranslation("education")
  const educationItems = education
  const [lang, setLang] = useState(i18n.language || i18n.resolvedLanguage || 'en')

  useEffect(() => {
    setLang(i18n.resolvedLanguage || i18n.language || 'en')
    
    const handler = () => setLang(i18n.language)
    i18n.on("languageChanged", handler)
    return () => i18n.off("languageChanged", handler)
  }, [i18n])

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
              <p>{item.date[lang] || item.date.en}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

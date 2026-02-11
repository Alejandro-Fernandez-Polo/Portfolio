import { useTranslation, Trans } from "react-i18next"
import { useState, useEffect } from "react"
import { experiences } from "../constants/index.js"
import "./css/Experience.css"

export default function Experience() {
  const { t, i18n } = useTranslation("experience")
  const [lang, setLang] = useState(i18n.language || i18n.resolvedLanguage || 'en')

  useEffect(() => {
    setLang(i18n.resolvedLanguage || i18n.language || 'en')
    
    const handler = () => setLang(i18n.language)
    i18n.on("languageChanged", handler)
    return () => i18n.off("languageChanged", handler)
  }, [i18n])

  return (
    <section id="experience">
      <div className="section-header">
        <h2>{t("experience.title")}</h2>
      </div>
      <div className="timeline">
        {experiences.map((exp) => {
          const trans = t(`experience.${exp.id}`, { returnObjects: true })
          return (
            <div key={exp.id} className="timeline-item">
              <h3>{trans.title}</h3>
              <div className="company">
                {exp.company_name} ({exp.date[lang] || exp.date.en})
              </div>
              <div className="date">
                {trans.points.map((point, index) => (
                  <li
                    key={index}
                    className="text-black-500/50 font-normal pl-1 text-sm"
                  >
                    {point}
                  </li>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

import { skills } from "../constants/skills.js"
import { useTranslation, Trans } from "react-i18next"
import "./css/Skills.css"

export default function Skills() {
  const { t, i18n } = useTranslation("skills")

  return (
    <section id="skills">
      <div className="section-header">
        <h2>{t("title")}</h2>
      </div>
      <div className="skills-grid">
        {skills.map((skill) => {
          const trans = t(`skills.${skill.title}`, { returnObjects: true })
          return (
            <div key={skill.title} className="skill-card">
              <h3>{trans}</h3>
              <div className="tech-icons">
                {skill.content.map((item) => (
                  <div key={item.name} className="tech-icon">
                    <svg viewBox="0 0 24 24">
                      <path d={item.imageUrl} />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )})}
      </div>
    </section>
  )
}

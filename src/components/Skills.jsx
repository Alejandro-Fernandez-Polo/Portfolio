import { groupedSkills } from "../constants/index.js"
import { useTranslation, Trans } from "react-i18next"

export default function Skills() {
  const { t, i18n } = useTranslation("skills")

  return (
    <section id="skills">
      <div className="section-header">
        <h2>{t("title")}</h2>
      </div>
      <div className="skills-grid">
        {groupedSkills.map((skill) => {
          const trans = t(`skills.${skill.title}`, { returnObjects: true })
          console.log(trans)
          return (
          <div key={skill.title} className="skill-card">
            <h3>{trans}</h3>
            <div className="tech-icons">
              {skill.content.map((item) => (
                <div key={item.name} className="tech-icon">
                  {/* {icon} */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-1/2 h-1/2 object-contain tech-icon"
                  />
                </div>
              ))}
            </div>
          </div>
        )})}
      </div>
    </section>
  )
}

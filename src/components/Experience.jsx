import { useTranslation, Trans } from "react-i18next"
import { experiences } from "../constants/index.js"
export default function Experience() {
  const { t, i18n } = useTranslation("about")

  return (
    <section id="experience">
      <div className="section-header">
        <h2>Work Experience</h2>
      </div>
      <div className="timeline">
        {experiences.map((exp) => {
          const trans = t(`experience.${exp.id}`, { returnObjects: true })
          return (
            <div key={exp.id} className="timeline-item">
              <h3>{trans.title}</h3>
              <div className="company">
                {exp.company_name} ({exp.date[i18n.language]})
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
          )})
        }
      </div>
    </section>
  )
}

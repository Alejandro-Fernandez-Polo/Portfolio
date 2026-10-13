import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { skills } from "../constants/skills.js"
import { useReveal } from "../hooks/useReveal.js"
import "./css/Skills.css"

/**
 * Agrupa las skills en etiquetas traducidas y chips de texto.
 * @returns {import("react").JSX.Element} Sección de skills.
 */
export default function Skills() {
  const { t } = useTranslation("skills")
  const sectionRef = useRef(null)
  useReveal(sectionRef)

  return (
    <section className="section section-skills" id="skills" ref={sectionRef}>
      <div className="container">
        {/* viewBox con padding: el trazo negro de 16px sobresale del path (~112x36px de bounding box + medio trazo) */}
        <svg className="shape shape-squig" viewBox="-4 4 116 44" aria-hidden="true">
          <path d="M6 26q12-20 24 0t24 0t24 0t24 0" />
          <path d="M6 26q12-20 24 0t24 0t24 0t24 0" />
        </svg>

        <header className="sec-head reveal">
          <span className="sec-num mono">{t("sec")}</span>
          <h2 className="sec-title">{t("title")}</h2>
        </header>

        <div className="skill-table reveal">
          {skills.map((group) => (
            <div className="skill-group" key={group.title}>
              <h3 className="skill-label mono">{t(`skills.${group.title}`)}</h3>
              <ul className="chips">
                {group.content.map((skill) => (
                  <li key={skill.name}>{skill.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

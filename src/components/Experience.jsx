import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { useLang } from "../hooks/useLang.js"
import { experiences } from "../constants/experience.js"
import { useReveal } from "../hooks/useReveal.js"
import Education from "./Education.jsx"
import "./css/Experience.css"

const pad = (n) => String(n).padStart(2, "0")

/**
 * Renderiza la experiencia y aloja Educación en la columna sticky adyacente.
 * @returns {import("react").JSX.Element} Sección conjunta de experiencia y educación.
 */
export default function Experience() {
  const { t } = useTranslation("experience")
  const lang = useLang()
  const sectionRef = useRef(null)
  useReveal(sectionRef)

  return (
    <section className="section" id="experience" ref={sectionRef}>
      <div className="container">
        <header className="sec-head reveal">
          <span className="sec-num mono">{t("sec")}</span>
          <h2 className="sec-title">{t("title")}</h2>
          <p className="sec-intro">{t("description")}</p>
        </header>

        <div className="track-grid">
          <div className="track-exp">
            {experiences.map((exp, index) => {
              const trans = t(exp.id, { returnObjects: true })
              return (
                <article className="exp-row reveal" key={exp.id}>
                  <div className="exp-num" aria-hidden="true">
                    {pad(index + 1)}
                  </div>
                  <div className="exp-body">
                    <div className="exp-top">
                      <div>
                        <p className="exp-company mono">{exp.company_name}</p>
                        <h3 className="exp-role">{trans.title}</h3>
                      </div>
                      <p className="exp-date mono">
                        {exp.date[lang] || exp.date.en}
                      </p>
                    </div>
                    <ul className="exp-points">
                      {trans.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Educación vive dentro del grid: en el prototipo es una columna
              lateral (aside sticky) de este mismo bloque, no una sección. */}
          <Education />
        </div>
      </div>
    </section>
  )
}

//import { CTA } from "../components/CTA.jsx"
import { projects } from "../constants/index.js"
import { useTranslation, Trans } from "react-i18next"

export default function Projects() {
  const { t } = useTranslation("projects")

  return (
    <section id="projects">
      <div className="section-header">
        <h2>{t("title")}</h2>
      </div>
      <div className="projects-grid">
        {projects.map((project) => {
          const trans = t(`projects.${project.id}`, { returnObjects: true })
          return (
            <div key={project.id} className="project-card">
              <div className="project-image">
                <img src={project.img} alt={trans.name} />
                <p>lista de tecnologias usadas</p>
              </div>
              <div className="project-content">
                <h3>{trans.name}</h3>
                <p>{trans.description}</p>
                <div className="project-buttons">
                  <a href={project.link} className="btn btn-primary">
                    {t("projects.viewcode")}
                  </a>
                  <a href={project.demoUrl} className="btn btn-secondary">
                    {t("projects.livedemo")}
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

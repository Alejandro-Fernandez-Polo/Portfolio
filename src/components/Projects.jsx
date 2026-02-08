//import { CTA } from "../components/CTA.jsx"
import { projects } from "../constants/index.js"
import { useTranslation, Trans } from "react-i18next"

export default function Projects() {
  const { t } = useTranslation("projects")
  const p = [
    {
      emoji: "🤖",
      title: "AI-POWERED CHATBOT",
      description:
        "Explore the special copperheated application, from our leamy beeps to your smarters antitelaies.",
      codeUrl: "#",
      demoUrl: "#",
    },
    {
      emoji: "💬",
      title: "MEINDE CHATBOT",
      description:
        "Cloxteed venvennion into istliklethy at powered virtualets.",
      codeUrl: "#",
      demoUrl: "#",
    },
    {
      emoji: "🤖",
      title: "AI-POWERED CHATBOT",
      description:
        "Develoja evert project for media and comprehensater soft ord xtere are the amics.",
      codeUrl: "#",
      demoUrl: "#",
    },
  ]

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
              <div className="project-image">{project.emoji}</div>
              <div className="project-content">
                <h3>{trans.name}</h3>
                <p>{trans.description}</p>
                <div className="project-buttons">
                  <a href={project.link} className="btn btn-primary">
                    View Code
                  </a>
                  <a href={project.demoUrl} className="btn btn-secondary">
                    Live Demo
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

import { Link } from "react-router-dom"
import { CTA } from "../components/CTA.jsx"
import { projects } from "../constants/index.js"
import { useTranslation, Trans } from "react-i18next"

export function Projects() {
  const { t } = useTranslation("projects")
  return (
    <section className="max-container">
      <h1 className="head-text">
        <Trans
          i18nKey="title"
          defaults={t("title")}
          components={{
            1: (
              <span
                className="blue-gradient_text font-semibold 
        drop-shadow"
              />
            ),
          }}
        />
      </h1>
      <div className="mt-5 flex flex-col gap-3 text-slate-500">
        <p>{t("intro")}</p>
      </div>

      <div className="flex flex-wrap my-20 gap-16">
        {projects.map((project) => {
          const trans = t(`projects.${project.id}`, { returnObjects: true })
          return (
            <div className="lg:w-[400px] w-full" key={project.id}>
              <div className="block-container w-12 h-12">
                <div className={`btn-back rounded-xl ${project.theme}`}></div>
                <div className="btn-front rounded-xl flex justify-center items-center">
                  <img
                    src={project.iconUrl}
                    alt={project.title + " icon"}
                    className="w-[30px] h-[30px] object-contain"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col">
                <h4 className="text-2xl font-poppins font-semibold">
                  {trans.name}
                </h4>
                <p className="mt-2 text-primary-color">
                  <span className="font-semibold text-black">
                    {t("projects.made")}{" "}
                  </span>
                  {project.technology}
                </p>
                <p className="mt-2 text-slate-500">{trans.description}</p>
                <div className="mt-5 flex items-center gap-2 font-poppins">
                  <Link
                    to={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-color font-semibold"
                  >
                    {t("projects.viewcode")} &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <hr className="border-slate-200" />
      <CTA />
    </section>
  )
}

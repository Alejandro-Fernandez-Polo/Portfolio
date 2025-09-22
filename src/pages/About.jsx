import { CTA } from "../components/CTA.jsx"
import { skills, experiences } from "../constants/index.js"
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "../libs/verticaltimeline"
import "../libs/verticaltimeline/style.min.css"
import { useTranslation, Trans } from "react-i18next"

export function About() {
  const { t, i18n } = useTranslation("about")
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

      <div className="py-10 flex flex-col">
        <h3 className="subhead-text">{t("skills.title")}</h3>

        <div className="mt-16 flex flex-wrap gap-16">
          {/* TODO: Poner un hover en el que se vea el nombre de la habilidad */}
          {skills.map((skill) => (
            <div key={skill.name} className="block-container w-20 h-20">
              <div className="btn-back rounded-xl"></div>
              <div className="btn-front rounded-xl flex justify-center items-center">
                <img
                  src={skill.imageUrl}
                  alt={skill.name}
                  className="w-1/2 h-1/2 object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="py-16">
        <h3 className="subhead-text">{t("experience.title")}</h3>
        <div className="mt-5 flex flex-col gap-3 text-slate-500">
          <p>{t("experience.description")}</p>
        </div>

        <div className="mt-12 flex">
          {/* TODO: arreglar colores en estilos */}
          <VerticalTimeline>
            {experiences.map((exp) => {
              const trans = t(`experience.${exp.id}`, { returnObjects: true })
              return (
                <VerticalTimelineElement
                  key={exp.id}
                  date={exp.date[i18n.language]} // cambia fecha según idioma
                  iconStyle={{ background: exp.iconBg }}
                  contentStyle={{
                    borderBottom: "8px solid " + exp.iconBg,
                    boxShadow: "none",
                  }}
                  icon={
                    <div className="flex justify-center items-center w-full h-full">
                      <img
                        src={exp.icon}
                        alt={exp.company_name}
                        className="w-[60%] h-[60%] object-contain"
                      />
                    </div>
                  }
                >
                  <h3 className="text-black text-xl font-poppins font-semibold">
                    {trans.title}
                  </h3>
                  <p
                    className="text-black-500 font-medium text-base"
                    style={{ margin: 0 }}
                  >
                    {exp.company_name}
                  </p>
                  <ul className="my-5 list-disc ml-5 space-y-2">
                    {trans.points.map((point, index) => (
                      <li
                        key={index}
                        className="text-black-500/50 font-normal pl-1 text-sm"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                </VerticalTimelineElement>
              )
            })}
          </VerticalTimeline>
        </div>
      </div>

      <hr className="border-slate-200" />
      <CTA />
    </section>
  )
}

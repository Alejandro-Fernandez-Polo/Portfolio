import { CTA } from "../components/CTA.jsx"
import { skills, experiences } from "../constants/index.js"
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "../libs/verticaltimeline"
import "../libs/verticaltimeline/style.min.css"

export function About() {
  return (
    <section className="max-container">
      <h1 className="head-text">
        Hello, I'm{" "}
        <span
          className="blue-gradient_text font-semibold 
        drop-shadow"
        >
          Alejandro
        </span>
      </h1>
      <div className="mt-5 flex flex-col gap-3 text-slate-500">
        <p>
          I am a computer engineering student and passionate about web
          development. I enjoy learning new technologies and applying them to
          real projects, always seeking to improve my skills and grow
          professionally.
        </p>
      </div>

      <div className="py-10 flex flex-col">
        <h3 className="subhead-text">
          My Skills
        </h3>

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
        <h3 className="subhead-text">
          Work Experience
        </h3>
        <div className="mt-5 flex flex-col gap-3 text-slate-500">
          <p>
            I may not have years of experience yet, but I’ve already built real
            web projects, solved tricky bugs, and worked in agile teams. Every
            challenge so far has been a chance to learn fast, adapt, and prove
            that enthusiasm can go a long way in development.
          </p>
        </div>

        <div className="mt-12 flex">
          {/* TODO: Poner mi experiencia */}
          <VerticalTimeline>
            {experiences.map((experience) => (
              <VerticalTimelineElement
                key={experience.company_name}
                date={experience.date}
                iconStyle={{ background: experience.iconBg }}
                icon={
                  <div className="flex justify-center items-center w-full h-full">
                    <img
                      src={experience.icon}
                      alt={experience.company_name}
                      className="w-[60%] h-[60%] object-contain"
                    />
                  </div>
                }
                contentStyle={{
                  borderBottom: "8px",
                  borderStyle: "solid",
                  borderBottomColor: experience.iconBg,
                  boxShadow: "none",
                }}
              >
                <div>
                  <h3 className="text-black text-xl font-poppins font-semibold">
                    {experience.title}
                  </h3>
                  <p
                    className="text-black-500 font-medium text-base"
                    style={{ margin: 0 }}
                  >
                    {experience.company_name}
                  </p>
                </div>
                <ul className="my-5 list-disc ml-5 space-y-2">
                  {experience.points.map((point, index) => (
                    <li
                      key={`experience-point-${index}`}
                      className="text-black-500/50 font-normal pl-1 text-sm"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </VerticalTimelineElement>
            ))}
          </VerticalTimeline>
        </div>
      </div>

      <hr className="border-slate-200" />
      <CTA />
    </section>
  )
}

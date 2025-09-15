import { skills, experiences } from "../constants/index.js"
import { Chrono } from 'react-chrono';

export function About() {

  return (
    <section className="max-w-5xl mx-auto sm:p-16 pb-12 !pt-[126px] px-8 min-h-[calc(100vh-80px)]">
      <h1 className="sm:text-5xl text-3xl font-semibold sm:leading-snug font-poppins">
        Hello, I'm{" "}
        <span
          className="bg-gradient-to-r from-[#00c6ff] to-[#0072ff] bg-clip-text text-transparent font-semibold 
        drop-shadow"
        >
          Alejandro
        </span>
      </h1>
      <div className="mt-5 flex flex-col gap-3 text-slate-500">
        <p>
          I'm a passionate software developer with a focus on building
          high-quality web applications.
        </p>
      </div>

      <div className="py-10 flex flex-col">
        <h3 className="font-semibold sm:text-3xl text-xl relative font-poppins">
          My Skills
        </h3>

        <div className="mt-16 flex flex-wrap gap-16">
          {skills.map((skill) => (
            <div className="block-container w-20 h-20">
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
        <h3 className="font-semibold sm:text-3xl text-xl relative font-poppins">
          Work Experience
        </h3>
        <div className="mt-5 flex flex-col gap-3 text-slate-500">
          <p>
            I have worked on various projects, collaborating with
            cross-functional teams to deliver high-quality products.
          </p>
        </div>

        <div className="mt-12 flex">
          {/* TODO: Formatearlo bien */}
          {/* TODO: Poner mi experiencia */}
          {/* TODO: Cambiar estilos */}
          <Chrono
            items={experiences}
            mode="VERTICAL_ALTERNATING"
            buttonTexts={{
              first: "Go to Beginning",
              last: "Go to End",
              next: "Next Event",
              previous: "Previous Event",
              play: "Start Auto-play",
              stop: "Stop Auto-play",
            }}
            disableToolbar={true}
          />
        </div>
      </div>
    </section>
  )
}

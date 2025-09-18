import { Link } from "react-router-dom"
import { CTA } from "../components/CTA.jsx"
import { projects } from "../constants/index.js"

export function Projects() {
  return (
    <section className="max-container">
      <h1 className="head-text">
        My{" "}
        <span
          className="blue-gradient_text font-semibold 
            drop-shadow"
        >
          Projects
        </span>
      </h1>
      <div className="mt-5 flex flex-col gap-3 text-slate-500">
        <p>
          This page presents a collection of my projects, spanning web design,
          React development, and object-oriented programming. Each project
          highlights different skills and stages of my learning journey,
          demonstrating experimentation, growth, and practical application.
          Together, they reflect the evolution of my abilities.
        </p>
      </div>

      <div className="flex flex-wrap my-20 gap-16">
        {projects.map((project) => (
          <div className="lg:w-[400px] w-full" key={project.name}>
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
                {project.name}
              </h4>
              <p className="mt-2 text-slate-500">{project.description}</p>
              <div className="mt-5 flex items-center gap-2 font-poppins">
                <Link
                  to={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-color font-semibold"
                >
                  View Project &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-slate-200" />
      <CTA />
    </section>
  )
}

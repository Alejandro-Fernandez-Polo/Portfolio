import { Link } from "react-router-dom";
import { CTA } from "../components/CTA.jsx";
import { projects } from "../constants/index.js"

export function Projects() {
  return (
    <section className="max-w-5xl mx-auto sm:p-16 pb-12 !pt-[126px] px-8 min-h-[calc(100vh-80px)]">
      <h1 className="sm:text-5xl text-3xl font-semibold sm:leading-snug font-poppins">
        My{" "}
        <span
          className="bg-gradient-to-r from-[#00c6ff] to-[#0072ff] bg-clip-text text-transparent font-semibold 
            drop-shadow"
        >
          Projects
        </span>
      </h1>
      <div className="mt-5 flex flex-col gap-3 text-slate-500">
        <p>
          Here are some of the projects I've worked on recently. Feel free to
          explore and check out the code on my GitHub!
          {/* TODO: Alargar */}
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
              <p className="mt-2 text-slate-500">
                {project.description}
              </p>
              <div className="mt-5 flex items-center gap-2 font-poppins">
                <Link
                  to={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-semibold"
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

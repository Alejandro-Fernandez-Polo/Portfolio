import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { projects } from "../constants/projects.js"
import { useReveal } from "../hooks/useReveal.js"
import "./css/Projects.css"

// El destacado se separa del carrusel; el P.0n sale de la posición en el array.
const pad = (n) => String(n).padStart(2, "0")
const positionById = new Map(projects.map((project, index) => [project.id, index]))
const featuredProject = projects.find((project) => project.featured)
const carouselProjects = projects.filter((project) => !project.featured)
// Dos copias: la posición `i` y `i + carouselProjects.length` son idénticas, así el
// salto sin transición al final del recorrido no se ve y el bucle queda infinito.
const trackItems = carouselProjects.concat(carouselProjects)
const loopLength = carouselProjects.length

function ProjectCard({ t, project, featured = false }) {
  return (
    <article className={`proj${featured ? " proj-featured" : ""}`}>
      <a className="proj-media" href={project.link} target="_blank" rel="noreferrer">
        <span className="proj-idx mono">P.{pad(positionById.get(project.id) + 1)}</span>
        <img src={project.img} alt={t(`${project.id}.name`)} loading="lazy" />
      </a>
      <div className="proj-meta">
        {featured && <p className="proj-kicker mono">{t("featured")}</p>}
        <h3>{t(`${project.id}.name`)}</h3>
        <p className="proj-desc">{t(`${project.id}.description`)}</p>
        <p className="proj-tech mono">
          <span>{t("made")}</span>
          {project.technology}
        </p>
        <a className="proj-link mono" href={project.link} target="_blank" rel="noreferrer">
          {t("viewcode")}&nbsp;↗
        </a>
      </div>
    </article>
  )
}

export default function Projects() {
  const { t } = useTranslation("projects")
  const sectionRef = useRef(null)
  const carouselRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const goRef = useRef(() => {})
  useReveal(sectionRef)

  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    const carousel = carouselRef.current
    if (!track || !viewport || !carousel) return

    const cycle = loopLength
    let index = 0
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const step = () =>
      track.children[0].getBoundingClientRect().width +
      (parseFloat(getComputedStyle(track).gap) || 0)

    const place = (animated) => {
      track.style.transition = animated ? "" : "none"
      track.style.transform = `translateX(${-index * step()}px)`
      if (!animated) void track.offsetWidth // reflow antes de reactivar la transición
    }

    const go = (direction) => {
      if (direction < 0 && index === 0) {
        index = cycle
        place(false) // salto silencioso a la copia de la posición 0
      }
      index += direction
      if (index > cycle) {
        index -= cycle
        place(false)
      }
      place(true)
    }
    goRef.current = go

    const onTransitionEnd = () => {
      if (index === cycle) {
        index = 0
        place(false) // la posición `cycle` se ve igual que la 0
      }
    }
    const onResize = () => {
      index = 0
      place(false)
    }

    let autoplayId = null
    const pause = () => {
      if (autoplayId) {
        clearInterval(autoplayId)
        autoplayId = null
      }
    }
    const resume = () => {
      if (!autoplayId && !reduceMotion) autoplayId = setInterval(() => go(1), 2200)
    }
    const onVisibility = () => (document.hidden ? pause() : resume())

    track.addEventListener("transitionend", onTransitionEnd)
    window.addEventListener("resize", onResize)
    carousel.addEventListener("mouseenter", pause)
    carousel.addEventListener("mouseleave", resume)
    carousel.addEventListener("focusin", pause)
    carousel.addEventListener("focusout", resume)
    document.addEventListener("visibilitychange", onVisibility)

    // Swipe: pointer events, así funciona con dedo y con ratón.
    let startX = 0
    let dx = 0
    let dragging = false
    const onPointerDown = (event) => {
      dragging = true
      startX = event.clientX
      dx = 0
      track.style.transition = "none"
      viewport.setPointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event) => {
      if (!dragging) return
      dx = event.clientX - startX
      track.style.transform = `translateX(${-index * step() + dx}px)`
    }
    const onPointerUp = () => {
      if (!dragging) return
      dragging = false
      track.style.transition = ""
      if (dx < -40) go(1)
      else if (dx > 40) go(-1)
      else place(true)
    }
    viewport.addEventListener("pointerdown", onPointerDown)
    viewport.addEventListener("pointermove", onPointerMove)
    viewport.addEventListener("pointerup", onPointerUp)
    viewport.addEventListener("pointercancel", onPointerUp)

    place(false)
    resume()

    return () => {
      pause()
      track.removeEventListener("transitionend", onTransitionEnd)
      window.removeEventListener("resize", onResize)
      carousel.removeEventListener("mouseenter", pause)
      carousel.removeEventListener("mouseleave", resume)
      carousel.removeEventListener("focusin", pause)
      carousel.removeEventListener("focusout", resume)
      document.removeEventListener("visibilitychange", onVisibility)
      viewport.removeEventListener("pointerdown", onPointerDown)
      viewport.removeEventListener("pointermove", onPointerMove)
      viewport.removeEventListener("pointerup", onPointerUp)
      viewport.removeEventListener("pointercancel", onPointerUp)
    }
  }, [])

  return (
    <section className="section section-projects" id="projects" ref={sectionRef}>
      <div className="container">
        <header className="sec-head reveal">
          <span className="sec-num mono">{t("sec")}</span>
          <h2 className="sec-title">{t("title")}</h2>
          <p className="sec-intro">{t("intro")}</p>
        </header>

        <ProjectCard t={t} project={featuredProject} featured />

        <div className="proj-carousel reveal" ref={carouselRef}>
          <button
            className="proj-btn prev mono"
            type="button"
            aria-label={t("prev")}
            onClick={() => goRef.current(-1)}
          >
            ←
          </button>
          <div className="proj-viewport" ref={viewportRef}>
            <div className="proj-track" ref={trackRef}>
              {trackItems.map((project, index) => (
                <ProjectCard key={`${project.id}-${index}`} t={t} project={project} />
              ))}
            </div>
          </div>
          <button
            className="proj-btn next mono"
            type="button"
            aria-label={t("next")}
            onClick={() => goRef.current(1)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  )
}

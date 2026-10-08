import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLang } from "../hooks/useLang.js"
import "./css/Navigation.css"

export default function Navigation({ toggleTheme }) {
  const [activeSection, setActiveSection] = useState("home")
  const { t, i18n } = useTranslation("navbar")
  const lang = useLang()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // La barra de progreso se actualiza por frame con CSS custom property:
  // meter el porcentaje en estado re-renderizaría el nav en cada scroll.
  const progressRef = useRef(null)

  const handleClick = (e, targetId) => {
    e.preventDefault()
    setIsMenuOpen(false) // Cerrar menú al hacer click

    if (targetId === "#" || targetId === "#home" || targetId === "#top") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    } else {
      const target = document.querySelector(targetId)
      if (target) {
        const offset = 80
        const targetPosition =
          target.getBoundingClientRect().top + window.pageYOffset - offset

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        })
      }
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  useEffect(() => {
    // El spy de scroll es el mismo de siempre (offset de 100px por sección);
    // lo único nuevo respecto al nav anterior es la barra de progreso.
    let ticking = false

    const update = () => {
      const scrollY = window.scrollY // Una sola lectura

      // Batch todas las lecturas de geometría
      const sections = document.querySelectorAll("section")
      const offsets = Array.from(sections).map((section) => ({
        id: section.id,
        offsetTop: section.offsetTop,
        offsetHeight: section.offsetHeight,
      }))

      offsets.forEach(({ id, offsetTop, offsetHeight }) => {
        if (
          scrollY >= offsetTop - 100 &&
          scrollY < offsetTop + offsetHeight - 100
        ) {
          setActiveSection(id)
        }
      })

      if (progressRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const progress = max > 0 ? Math.min(scrollY / max, 1) : 0
        progressRef.current.style.setProperty("--p", String(progress))
      }

      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }

    window.addEventListener("scroll", handleScroll)
    update() // Estado inicial: la página puede cargar con scroll restaurado
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { num: "01", href: "#skills", label: t("skills") },
    { num: "02", href: "#projects", label: t("projects") },
    { num: "03", href: "#experience", label: t("experience") },
    { num: "04", href: "#education", label: t("education") },
    { num: "05", href: "#contact", label: t("contact") },
  ]

  const menuItems = [{ num: "00", href: "#top", label: t("home") }, ...navItems]

  const changeLang = (next) => {
    i18n.changeLanguage(next)
    setIsMenuOpen(false)
  }

  return (
    <>
      <div className="scroll-progress" aria-hidden="true">
        <span className="scroll-progress-fill" ref={progressRef}></span>
      </div>

      <header className="site-head">
        <a className="wordmark" href="#top" onClick={(e) => handleClick(e, "#top")}>
          Alejandro&nbsp;Fernández
        </a>

        <nav className="nav-desk" aria-label="Principal">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className={activeSection === item.href.substring(1) ? "active" : ""}
            >
              <sup>{item.num}</sup>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="head-tools">
          <div className="lang" role="group" aria-label={t("language")}>
            <button
              className={`lang-btn${lang === "es" ? " on" : ""}`}
              data-lang="es"
              type="button"
              onClick={() => changeLang("es")}
            >
              ES
            </button>
            <span className="lang-sep" aria-hidden="true">
              /
            </span>
            <button
              className={`lang-btn${lang === "en" ? " on" : ""}`}
              data-lang="en"
              type="button"
              onClick={() => changeLang("en")}
            >
              EN
            </button>
          </div>

          <button
            className="theme-btn"
            type="button"
            aria-label={t("toggleTheme")}
            onClick={toggleTheme}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 0 0 18Z" className="theme-fill" />
            </svg>
          </button>

          <button
            className={`burger${isMenuOpen ? " open" : ""}`}
            type="button"
            aria-label={t("menu")}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <div
        className={`menu${isMenuOpen ? " open" : ""}`}
        id="mobile-menu"
        aria-hidden={!isMenuOpen}
      >
        <nav className="menu-links" aria-label={t("menu")}>
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
            >
              <sup>{item.num}</sup>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <p className="menu-foot mono">{t("menuFoot")}</p>
      </div>
    </>
  )
}

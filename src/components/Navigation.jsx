import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLang } from "../hooks/useLang.js"
import "./css/Navigation.css"

/**
 * Muestra la navegación fija y sus controles de idioma, tema y menú móvil.
 * @param {{ toggleTheme: () => void }} props Alternador de tema propiedad de la app.
 * @returns {import("react").JSX.Element} Navegación del sitio.
 */
export default function Navigation({ toggleTheme }) {
  const [activeSection, setActiveSection] = useState("home")
  const { t, i18n } = useTranslation("navbar")
  const lang = useLang()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // La barra de progreso se actualiza por frame con CSS custom property:
  // meter el porcentaje en estado re-renderizaría el nav en cada scroll.
  const progressRef = useRef(null)
  // Regla del bloque Experience + Education: las dos columnas son laterales,
  // así que el scroll no puede decir cuál lee el usuario. Educación se enciende
  // por intención del último click y se apaga al salir del bloque. Van en refs
  // porque el efecto del scroll se registra una sola vez (deps []).
  // El viaje del scroll suave pasa por fuera antes de llegar: la intención solo
  // se descarta cuando el scroll lleva 250ms detenido fuera del bloque.
  const educationIntentRef = useRef(false)
  const educationTimerRef = useRef(null)

  const handleClick = (e, targetId) => {
    e.preventDefault()
    setIsMenuOpen(false) // Cerrar menú al hacer click
    educationIntentRef.current = targetId === "#education"
    if (educationTimerRef.current) {
      clearTimeout(educationTimerRef.current)
      educationTimerRef.current = null
    }

    if (targetId === "#" || targetId === "#home" || targetId === "#top") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    } else {
      const target = document.querySelector(targetId)
      if (target) {
        // El offset coincide con la cabecera fija para que el título no quede tapado.
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

      // Agrupar las lecturas de geometría evita intercalarlas con escrituras del DOM.
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

      // La intención solo manda dentro de su bloque; fuera, se descarta cuando
      // el scroll deja de moverse (los frames del viaje suave la renuevan).
      if (educationIntentRef.current) {
        const block = document.getElementById("experience")
        const inside =
          block &&
          scrollY >= block.offsetTop - 100 &&
          scrollY < block.offsetTop + block.offsetHeight - 100
        if (inside) {
          setActiveSection("education")
          if (educationTimerRef.current) {
            clearTimeout(educationTimerRef.current)
            educationTimerRef.current = null
          }
        } else {
          if (educationTimerRef.current) clearTimeout(educationTimerRef.current)
          educationTimerRef.current = setTimeout(() => {
            educationIntentRef.current = false
            educationTimerRef.current = null
          }, 250)
        }
      }

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
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (educationTimerRef.current) clearTimeout(educationTimerRef.current)
    }
  }, [])

  const navItems = [
    { num: "01", href: "#projects", label: t("projects") },
    { num: "02", href: "#skills", label: t("skills") },
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

      {/* El menú cerrado sigue en el DOM porque la animación de salida lo
          necesita, así que se desactiva con `inert`: lo saca del foco, de los
          clics y del árbol de accesibilidad. Un `transform` no basta —mueve el
          elemento, no lo desactiva—, y el `aria-hidden` que había antes decía
          "no existe" mientras sus enlaces seguían siendo enfocables. React 18 no
          admite el prop booleano, de ahí el `inert=""`. */}
      <div
        className={`menu${isMenuOpen ? " open" : ""}`}
        id="mobile-menu"
        inert={isMenuOpen ? undefined : ""}
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

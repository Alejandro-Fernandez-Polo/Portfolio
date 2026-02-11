import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import spainFlag from "../assets/flags/spain.png"
import ukFlag from "../assets/flags/unitedkingdom.png"

export default function Navigation({ toggleTheme }) {
  const [activeSection, setActiveSection] = useState("home")
  const { t, i18n } = useTranslation("navbar")
  const [lang, setLang] = useState(i18n.language || i18n.resolvedLanguage || 'en')

  useEffect(() => {
    // Actualizar inmediatamente con el idioma actual resuelto
    setLang(i18n.resolvedLanguage || i18n.language || 'en')
    
    const handler = () => setLang(i18n.language)
    i18n.on("languageChanged", handler)
    return () => i18n.off("languageChanged", handler)
  }, [i18n])

  const handleClick = (e, targetId) => {
    e.preventDefault()

    if (targetId === "#" || targetId === "#home") {
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

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]")
    const updateActiveNav = () => {
      const scrollY = window.pageYOffset

      sections.forEach((section) => {
        const sectionHeight = section.offsetHeight
        const sectionTop = section.offsetTop - 150
        const sectionId = section.getAttribute("id")

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          setActiveSection(sectionId)
        }
      })
    }

    window.addEventListener("scroll", updateActiveNav)
    updateActiveNav()

    return () => window.removeEventListener("scroll", updateActiveNav)
  }, [])

  const navItems = [
    { href: "#home", label: t("home") },
    { href: "#experience", label: t("experience") },
    { href: "#skills", label: t("skills") },
    { href: "#projects", label: t("projects") },
    { href: "#education", label: t("education") },
    { href: "#contact", label: t("contact") },
  ]

  return (
    <nav>
      <div className="nav-background">
        <div className="nav-pill">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              style={{
                color:
                  activeSection === item.href.substring(1)
                    ? "var(--accent)"
                    : "var(--text-primary)",
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            onClick={() => i18n.changeLanguage("en")}
            style={{
              color:
                lang === "en"
                  ? "var(--accent)"
                  : "var(--text-primary)",
            }}
          >
            ENG
          </a>
          <a
            onClick={() => i18n.changeLanguage("es")}
            style={{
              color:
                lang === "es"
                  ? "var(--accent)"
                  : "var(--text-primary)",
            }}
          >
            ESP
          </a>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            style={{ display: "none" }}
          >
            <defs>
              <filter id="goo">
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="10"
                  result="blur"
                />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  result="goo"
                />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>
          </svg>
          <div>
            <label htmlFor="switch" className="toggle">
              <input
                type="checkbox"
                className="input"
                id="switch"
                onClick={toggleTheme}
              />
              <div className="icon icon--moon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <div className="icon icon--sun">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"></path>
                </svg>
              </div>
            </label>
          </div>
        </div>
      </div>
    </nav>
  )
}

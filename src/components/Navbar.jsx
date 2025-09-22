import { NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import spainFlag from "../assets/flags/spain.png"
import ukFlag from "../assets/flags/unitedkingdom.png"

export function Navbar() {
  const { t, i18n } = useTranslation("navbar")
  const [lang, setLang] = useState(i18n.language)
  const location = useLocation()

  useEffect(() => {
    const handler = () => setLang(i18n.language)
    i18n.on("languageChanged", handler)
    return () => i18n.off("languageChanged", handler)
  }, [i18n])

  // Detecta si estamos en la página Home
  const isHome = location.pathname === "/"

  return (
    <header className="header">
      <NavLink
        to="/"
        className="w-10 h-10 rounded-lg bg-white items-center justify-center 
        flex font-bold shadow-md"
      >
        <p className="blue-gradient_text">AF</p>
      </NavLink>
      <nav
        className={`flex text-lg gap-7 font-medium${
          isHome ? " text-white" : ""
        }`}
      >
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `${
              isActive
                ? "text-primary-color"
                : isHome
                ? "text-white"
                : "text-black"
            } flex items-center`
          }
        >
          {t("about")}
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `${
              isActive
                ? "text-primary-color"
                : isHome
                ? "text-white"
                : "text-black"
            } flex items-center`
          }
        >
          {t("projects")}
        </NavLink>
        <NavLink
          to="/contact"
          className={({ isActive }) =>
            `${
              isActive
                ? "text-primary-color"
                : isHome
                ? "text-white"
                : "text-black"
            } flex items-center`
          }
        >
          {t("contact")}
        </NavLink>
        <input
          type="checkbox"
          id="language-toggle"
          checked={i18n.language === "en"}
          onChange={() =>
            i18n.changeLanguage(i18n.language === "en" ? "es" : "en")
          }
        />
        <label id="button" htmlFor="language-toggle">
          <div
            id="knob"
            className="w-6 h-6 rounded-full bg-center bg-cover"
            style={{
              backgroundImage: `url(${lang === "en" ? ukFlag : spainFlag})`,
            }}
          ></div>
          <div
            id="language-text"
            className={isHome ? "text-white" : "text-black"}
          >
            {i18n.language === "en" ? "English" : "Español"}
          </div>
        </label>
      </nav>
    </header>
  )
}

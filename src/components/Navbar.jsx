import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import spainFlag from "../assets/flags/spain.png"
import ukFlag from "../assets/flags/unitedkingdom.png"

export function Navbar() {
  const { t, i18n } = useTranslation("navbar")

  return (
    <header className="header">
      <NavLink
        to="/"
        className="w-10 h-10 rounded-lg bg-white items-center justify-center 
        flex font-bold shadow-md"
      >
        <p className="blue-gradient_text">AF</p>
      </NavLink>
      <nav className="flex text-lg gap-7 font-medium">
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `${
              isActive ? "text-primary-color" : "text-black"
            } flex items-center`
          }
        >
          {t("about")}
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `${
              isActive ? "text-primary-color" : "text-black"
            } flex items-center`
          }
        >
          {t("projects")}
        </NavLink>
        <NavLink
          to="/contact"
          className={({ isActive }) =>
            `${
              isActive ? "text-primary-color" : "text-black"
            } flex items-center`
          }
        >
          {t("contact")}
        </NavLink>
        <input
          type="checkbox"
          id="language-toggle"
          checked={i18n.language === "en"}
          onChange={() => {
            if (i18n.language === "es") {
              i18n.changeLanguage("en")
            } else {
              i18n.changeLanguage("es")
            }
          }}
        />
        <label id="button" htmlFor="language-toggle">
          <div
            id="knob"
            className="w-6 h-6 rounded-full bg-center bg-cover"
            style={{
              backgroundImage: `url(${
                i18n.language === "es" ? spainFlag : ukFlag
              })`,
            }}
          ></div>
          <div id="language-text">
            {i18n.language === "en" ? "English" : "Español"}
          </div>
        </label>
      </nav>
    </header>
  )
}

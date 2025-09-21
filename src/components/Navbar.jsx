import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next";


export function Navbar() {
  const { i18n } = useTranslation()
  const { t } = useTranslation("navbar")

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
        <button onClick={() => i18n.changeLanguage("en")}>EN</button>
        <button onClick={() => i18n.changeLanguage("es")}>ES</button>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            isActive ? "text-primary-color" : "text-black"
          }
        >
          {t("about")}
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            isActive ? "text-primary-color" : "text-black"
          }
        >
          {t("projects")}
        </NavLink>
        <NavLink
          to="/contact"
          className={({ isActive }) =>
            isActive ? "text-primary-color" : "text-black"
          }
        >
          {t("contact")}
        </NavLink>
      </nav>
    </header>
  )
}

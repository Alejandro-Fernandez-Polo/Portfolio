import { NavLink } from "react-router-dom"

export function Navbar() {
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
            isActive ? "text-primary-color" : "text-black"
          }
        >
          About
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            isActive ? "text-primary-color" : "text-black"
          }
        >
          Projects
        </NavLink>
        <NavLink
          to="/contact"
          className={({ isActive }) =>
            isActive ? "text-primary-color" : "text-black"
          }
        >
          Contact
        </NavLink>
      </nav>
    </header>
  )
}

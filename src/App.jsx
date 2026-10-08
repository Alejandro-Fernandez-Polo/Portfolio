import { useState, useEffect, useRef, lazy, Suspense } from "react"
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import { useLang } from "./hooks/useLang.js"
import { useCursor } from "./hooks/useCursor.js"

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  )
  const cursorRef = useRef(null)
  const lang = useLang()
  useCursor(cursorRef)
  const Experience = lazy(() => import("./components/Experience"))
  const Skills = lazy(() => import("./components/Skills"))
  const Projects = lazy(() => import("./components/Projects"))
  const Education = lazy(() => import("./components/Education"))
  const Contact = lazy(() => import("./components/Contact"))
  const Footer = lazy(() => import("./components/Footer"))

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark"
      localStorage.setItem("theme", newTheme)
      return newTheme
    })
  }

  return (
    <>
      <Navigation theme={theme} toggleTheme={toggleTheme} />
      {/* El contenedor lo pone cada sección (patrón del prototipo); el id es el
          destino de los enlaces #top del wordmark y del menú móvil. */}
      <main id="top">
        <Hero />
        <Suspense fallback={<div>Loading...</div>}>
          <Experience />
          <Skills />
          <Projects />
          <Education />
          <Contact />
          <Footer />
        </Suspense>
      </main>
      <div className="cursor" ref={cursorRef} aria-hidden="true" />
    </>
  )
}

export default App

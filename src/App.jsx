import { useState, useEffect, useRef, lazy, Suspense } from "react"
import { Toaster } from "sonner"
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
          destino de los enlaces #top del wordmark y del menú móvil.
          Education no aparece aquí: lo monta Experience dentro de su grid. */}
      <main id="top">
        <Hero />
        <Suspense fallback={<div>Loading...</div>}>
          <Projects />
          <Skills />
          <Experience />
          <Contact />
          <Footer />
        </Suspense>
      </main>
      <div className="cursor" ref={cursorRef} aria-hidden="true" />
      {/* El toaster sigue el tema de la app (data-theme) desde el estado. */}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        theme={theme}
      />
    </>
  )
}

export default App

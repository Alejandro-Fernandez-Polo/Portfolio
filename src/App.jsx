import { useState, useEffect, useRef, lazy, Suspense } from "react"
import { Toaster } from "sonner"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import { useLang } from "./hooks/useLang.js"
import { useCursor } from "./hooks/useCursor.js"

const productionHosts = new Set([
  "alejandrofernandezpolo.com",
  "www.alejandrofernandezpolo.com",
])

function sanitizeVercelEvent(event) {
  try {
    // Shared UGR links carry encrypted state in the fragment; analytics needs only the page path.
    const url = new URL(event.url, window.location.origin)
    return {
      ...event,
      url: `${url.origin}${url.pathname}`,
      ...(event.route ? { route: url.pathname } : {}),
    }
  } catch {
    return event
  }
}

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  )
  const cursorRef = useRef(null)
  const lang = useLang()
  useCursor(cursorRef)
  const collectVercelMetrics =
    import.meta.env.PROD && productionHosts.has(window.location.hostname)
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
      {collectVercelMetrics && (
        <>
          <Analytics mode="production" beforeSend={sanitizeVercelEvent} />
          <SpeedInsights beforeSend={sanitizeVercelEvent} />
        </>
      )}
    </>
  )
}

export default App

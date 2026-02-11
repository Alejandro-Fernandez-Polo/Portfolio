import { useState, useEffect, lazy, Suspense } from "react"
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import "./libs/i18n/i18n"

function App() {
  const [theme, setTheme] = useState("dark")
  const Experience = lazy(() => import("./components/Experience"))
  const Skills = lazy(() => import("./components/Skills"))
  const Projects = lazy(() => import("./components/Projects"))
  const Education = lazy(() => import("./components/Education"))
  const Certifications = lazy(() => import("./components/Certifications"))
  const Contact = lazy(() => import("./components/Contact"))
  const Footer = lazy(() => import("./components/Footer"))

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <>
      <Navigation theme={theme} toggleTheme={toggleTheme} />
      <main className="container">
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
    </>
  )
}

export default App

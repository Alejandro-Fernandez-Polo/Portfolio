import { useState, useEffect, lazy, Suspense } from "react"
import Navigation from './components/Navigation'
import GradientBackground from './components/GradientBackground'
import Hero from './components/Hero'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Education from './components/Education'
import Certifications from './components/Certifications'
import Contact from './components/Contact'
import Footer from './components/Footer'
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
      <div className="container">
        <Hero />
        <Suspense fallback={<div>Loading...</div>}>
          <Experience />
          <Skills />
          <Projects />
          <Education />
          <Contact />
          <Footer />
        </Suspense>
      </div>
    </>
  )
}

export default App

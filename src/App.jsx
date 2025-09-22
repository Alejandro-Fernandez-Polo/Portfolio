import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { Footer } from "./components/Footer"
import { Home, About, Projects, Contact } from "./pages"
import "./libs/i18n/i18n"; // importante para inicializar i18n
import { Analytics } from "@vercel/analytics/react"

function App() {
  return (
    <main className="background">
      <Analytics />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/*"
            element={
              <>
                <Routes>
                  <Route path="/about" element={<About />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/contact" element={<Contact />} />
                </Routes>
                <Footer />
              </>
            }
          />
        </Routes>
      </Router>
    </main>
  )
}

export default App

import { Link } from "react-router-dom"

export function CTA() {
  return (
    <section className="cta">
      <p className="cta-text max-md:text-center">
        Interested in working together? <br className="sm:block hidden" />
        Let's get in touch!
      </p>
      <Link to="/contact" className="btn">
        Contact
      </Link>
    </section>
  )
}

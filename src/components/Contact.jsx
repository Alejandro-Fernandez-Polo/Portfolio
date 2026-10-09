import { useRef, useState } from "react"
import emailjs from "@emailjs/browser"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { socialLinks } from "../constants/social.jsx"
import { useReveal } from "../hooks/useReveal.js"
import "./css/Contact.css"

export default function Contact() {
  const { t } = useTranslation("contact")
  const sectionRef = useRef(null)
  useReveal(sectionRef)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const serviceId = import.meta.env.VITE_APP_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY

    // Sin claves no hay envío: se avisa con el mismo toast de error.
    if (!serviceId || !templateId || !publicKey) {
      toast.error(t("alerts.error"))
      return
    }

    setIsLoading(true)
    // `toast.promise` cubre el ciclo completo: enviando → éxito/error.
    toast
      .promise(
        emailjs.send(
          serviceId,
          templateId,
          {
            from_name: formData.name,
            to_name: "Alejandro",
            from_email: formData.email,
            to_email: "afernanpolo@gmail.com",
            message: formData.message,
          },
          publicKey,
        ),
        {
          loading: t("form.sending"),
          success: () => {
            setFormData({ name: "", email: "", message: "" })
            return t("alerts.success")
          },
          error: t("alerts.error"),
        },
      )
      .finally(() => setIsLoading(false))
  }

  return (
    <section className="section section-band" id="contact" ref={sectionRef}>
      <div className="container contact-grid">
        <div className="contact-left">
          <header className="sec-head reveal">
            <span className="sec-num mono">{t("sec")}</span>
            <h2 className="sec-title">{t("title")}</h2>
          </header>

          <div className="contact-info reveal">
            <div className="info-row mono">
              <span className="info-label">{t("info.location")}</span>
              <span>{t("info.my_location")}</span>
            </div>
            <div className="info-row mono">
              <span className="info-label">{t("info.email")}</span>
              <a href="mailto:afernanpolo@gmail.com">afernanpolo@gmail.com</a>
            </div>
          </div>

          {/* Socials en texto mono (estilo del Hero). El email ya está arriba,
              así que aquí solo van las redes. */}
          <ul className="socials mono reveal">
            {socialLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`social.${link.id}`)}
                >
                  {t(`social.${link.id}`)} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>

        <form className="contact-form reveal" onSubmit={handleSubmit}>
          <div className="field">
            <label className="mono" htmlFor="name">
              {t("info.name")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder={t("form.name_placeholder")}
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label className="mono" htmlFor="email">
              {t("info.emailLabel")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t("form.email_placeholder")}
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="mono" htmlFor="message">
              {t("info.message")}
            </label>
            <textarea
              id="message"
              name="message"
              rows="4"
              placeholder={t("form.message_placeholder")}
              value={formData.message}
              onChange={handleChange}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={isLoading}>
            {isLoading ? t("form.sending") : t("form.send")}
          </button>
        </form>
      </div>
    </section>
  )
}

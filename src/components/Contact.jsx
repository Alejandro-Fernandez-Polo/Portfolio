import { useState } from 'react'
import emailjs from "@emailjs/browser"
import { useTranslation } from "react-i18next"
import { useAlert } from "../hooks/useAlert.js"
import { Alert } from "../components/Alert.jsx"
import "./css/Contact.css"

export default function Contact() {
  const { t } = useTranslation("contact")
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
    const [isLoading, setIsLoading] = useState(false)
    const { alert, showAlert, hideAlert } = useAlert()

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    emailjs
      .send(
        import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          to_name: "Alejandro",
          from_email: formData.email,
          to_email: "afernanpolo@gmail.com",
          message: formData.message,
        },
        import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY,
      )
      .then(() => {
        setIsLoading(false)
        showAlert({ show: true, text: t("alerts.success"), type: "success" })
        setTimeout(() => {
          hideAlert()
          setFormData({ name: "", email: "", message: "" })
        }, 2000)
      })
      .catch((error) => {
        setIsLoading(false)
        console.log(error)
        showAlert({
          show: true,
          text: t("alerts.error"),
          type: "danger",
        })
        setTimeout(() => {
          hideAlert()
        }, 2000)
      })
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

const socialLinks = [
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    href: "https://www.linkedin.com/in/alejandro-fernández-polo",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
    href: "https://github.com/Alejandro-Fernandez-Polo",
  },
]

  return (
    <section id="contact">
      <div className="contact-section">
        <div className="contact-info">
          <h3>{t("title")}</h3>
          {alert.show && <Alert {...alert} />}
          <div className="contact-item">
            <div className="contact-icon">
              <svg className="mail-link" viewBox="0 0 24 24">
                <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                <rect x="2" y="4" width="20" height="16" rx="2" />
              </svg>
            </div>
            <div>
              <h4>Email:</h4>
              <p>afernanpolo@gmail.com</p>
            </div>
          </div>
          <div className="contact-item">
            <div className="contact-icon">
              <svg
                viewBox="0 0 24 24"
                version="1.2"
                baseProfile="tiny"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.657 5.304c-3.124-3.073-8.189-3.073-11.313 0-3.124 3.074-3.124 8.057 0 11.13l5.656 5.565 5.657-5.565c3.124-3.073 3.124-8.056 0-11.13zm-5.657 8.195c-.668 0-1.295-.26-1.768-.732-.975-.975-.975-2.561 0-3.536.472-.472 1.1-.732 1.768-.732s1.296.26 1.768.732c.975.975.975 2.562 0 3.536-.472.472-1.1.732-1.768.732z" />
              </svg>
            </div>
            <div>
              <h4>{t("info.location")}</h4>
              <p>{t("info.my_location")}</p>
            </div>
          </div>
          <div className="social-links">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                name="name"
                placeholder={t("form.name_placeholder")}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder={t("form.email_placeholder")}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <textarea
              name="message"
              placeholder={t("form.message_placeholder")}
              value={formData.message}
              onChange={handleChange}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? t("form.sending") : t("form.send")}
          </button>
        </form>
      </div>
    </section>
  )
}

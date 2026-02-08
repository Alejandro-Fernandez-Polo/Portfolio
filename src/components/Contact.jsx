import { useState } from 'react'
import emailjs from "@emailjs/browser"
import { useTranslation } from "react-i18next"
import { useAlert } from "../hooks/useAlert.js"
import { Alert } from "../components/Alert.jsx"

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
    // alert('¡Gracias por tu mensaje! Me pondré en contacto contigo pronto.')
    // setFormData({ name: '', email: '', message: '' })
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

  const contactInfo = [
    {
      icon: '📧',
      label: 'Email:',
      value: 'contact@example.com'
    },
    {
      icon: '📍',
      label: 'Location:',
      value: 'Madrid, Spain'
    }
  ]

  const socialLinks = [
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect x="2" y="9" width="4" height="12"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      ),
      href: '#'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
        </svg>
      ),
      href: '#'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: '#'
    }
  ]

  return (
    <section id="contact">
      <div className="contact-section">
        <div className="contact-info">
          <h3>{t("title")}</h3>
          {alert.show && <Alert {...alert} />}
          <div className="contact-item">
            <div className="contact-icon">📧</div>
            <div>
              <h4>Email:</h4>
              <p>afernanpolo@gmail.com</p>
            </div>
          </div>
          <div className="contact-item">
            <div className="contact-icon">📍</div>
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

import { useState } from 'react'
import emailjs from "@emailjs/browser"
import { useTranslation } from "react-i18next"
import { useAlert } from "../hooks/useAlert.js"
import { Alert } from "../components/Alert.jsx"
import { socialLinks } from "../constants/social.jsx"
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
    const serviceId = import.meta.env.VITE_APP_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY

    if (!serviceId || !templateId || !publicKey) {
      showAlert({
        show: true,
        text: t("alerts.error"),
        type: "danger",
      })
      setTimeout(() => {
        hideAlert()
      }, 2000)
      return
    }

    setIsLoading(true)
    emailjs
      .send(
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
      )
      .then(() => {
        setIsLoading(false)
        showAlert({ show: true, text: t("alerts.success"), type: "success" })
        setTimeout(() => {
          hideAlert()
          setFormData({ name: "", email: "", message: "" })
        }, 2000)
      })
      .catch(() => {
        setIsLoading(false)
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
              <h4>{t("info.email")}</h4>
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
            {socialLinks.map((link) => (
              <a
                key={link.id}
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

import { Suspense, useState } from "react"
import emailjs from "@emailjs/browser"
import { Canvas } from "@react-three/fiber"
import { Loader } from "../components/Loader"
import { useAlert } from "../hooks/useAlert.js"
import { Alert } from "../components/Alert.jsx"
import { Viking } from "../models/Viking"
import { useTranslation } from "react-i18next"

export function Contact() {
  const { t } = useTranslation("contact")
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState("Walk")
  const { alert, showAlert, hideAlert } = useAlert()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }
  const handleFocus = () => setCurrentAnimation("Crouch")
  const handleBlur = () => setCurrentAnimation("Walk")
  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setCurrentAnimation("Run")

    emailjs.send(
      import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
      {
        from_name: form.name,
        to_name: "Alejandro",
        from_email: form.email,
        to_email: "afernanpolo@gmail.com",
        message: form.message,
      },
      import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY
    ).then(() => {
      setIsLoading(false)
      showAlert({ show: true, text: t("alerts.success"), type: "success" })
      setTimeout(() => {
        hideAlert()
        setCurrentAnimation("Walk")
        setForm({ name: "", email: "", message: "" })
      }, 2000)
    }).catch((error) => {
      setIsLoading(false)
      setCurrentAnimation("Walk")
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
  
  return (
    <section className="relative flex lg:flex-row flex-col max-container">
      {alert.show && <Alert {...alert} />}
      <div className="flex-1 min-w-[50%] flex flex-col">
        <h1 className="head-text">{t("title")}</h1>

        <form
          className="w-full flex flex-col mt-14 gap-7"
          onSubmit={handleSubmit}
        >
          <label className="text-black-500 font-semibold">
            {t("form.name")}
            <input
              type="text"
              name="name"
              className="input"
              placeholder={t("form.name_placeholder")}
              required
              value={form.name}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </label>
          <label className="text-black-500 font-semibold">
            {t("form.email")}
            <input
              type="email"
              name="email"
              className="input"
              placeholder={t("form.email_placeholder")}
              required
              value={form.email}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </label>
          <label className="text-black-500 font-semibold">
            {t("form.message")}
            <textarea
              name="message"
              rows={4}
              className="textarea"
              placeholder={t("form.message_placeholder")}
              required
              value={form.message}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </label>
          <button
            type="submit"
            className="btn"
            disabled={isLoading}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            {isLoading ? t("form.sending") : t("form.send")}
          </button>
        </form>
      </div>

      <div className="lg:w-1/2 w-full lg:h-auto md:h-[500px] h-[350px]">
        <Canvas
          camera={{
            position: [0, 0, 5],
            fov: 75,
            near: 0.1,
            far: 1000,
          }}
        >
          <directionalLight position={[0, 0, 1]} intensity={2.5} />
          <ambientLight intensity={0.5} />
          <Suspense fallback={<Loader />}>
            <Viking
              currentAnimation={currentAnimation}
              position={[0, -2.5, 0]}
              rotation={[12.6, 0.5, 0]}
              scale={[1, 1, 1]}
            />
          </Suspense>
        </Canvas>
      </div>
    </section>
  )
}

import { Suspense, useState } from "react"
import emailjs from "@emailjs/browser"
import { Canvas } from "@react-three/fiber"
import { Loader } from "../components/Loader"
import { Fox } from "../models/Fox"
import { useAlert } from "../hooks/useAlert.js"
import { Alert } from "../components/Alert.jsx"

export function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState("idle")

  const { alert, showAlert, hideAlert } = useAlert()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }
  const handleFocus = () => setCurrentAnimation("walk")
  const handleBlur = () => setCurrentAnimation("idle")
  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setCurrentAnimation("hit")

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
      showAlert({ show: true, text: "Message sent successfully!", type: "success" })
      setTimeout(() => {
        hideAlert()
        setCurrentAnimation("idle")
        setForm({ name: "", email: "", message: "" })
      }, 2000)
    }).catch((error) => {
      setIsLoading(false)
      setCurrentAnimation("idle")
      console.log(error)
      showAlert({
        show: true,
        text: "Ahh, something went wrong. Please try again.",
        type: "danger",
      })
      setTimeout(() => {
        hideAlert()
      }, 2000)
    })
  }
  
  return (
    <section className="relative flex lg:flex-row flex-col max-w-5xl mx-auto sm:p-16 pb-12 !pt-[126px] px-8 min-h-[calc(100vh)]">
      {alert.show && <Alert {...alert} />}
      <div className="flex-1 min-w-[50%] flex flex-col">
        <h1 className="sm:text-5xl text-3xl font-semibold sm:leading-snug font-poppins">
          Get in Touch
        </h1>

        <form
          className="w-full flex flex-col mt-14 gap-7"
          onSubmit={handleSubmit}
        >
          <label className="text-black-500 font-semibold">
            Name
            <input
              type="text"
              name="name"
              className="input"
              placeholder="Jose"
              required
              value={form.name}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </label>
          <label className="text-black-500 font-semibold">
            Email
            <input
              type="email"
              name="email"
              className="input"
              placeholder="jose@example.com"
              required
              value={form.email}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </label>
          <label className="text-black-500 font-semibold">
            Your Message
            <textarea
              name="message"
              rows={4}
              className="textarea"
              placeholder="Let me know how I can help you!"
              required
              value={form.message}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </label>
          <button
            type="submit"
            className="text-white bg-gradient-to-r from-[#00c6ff] to-[#0072ff] focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center"
            disabled={isLoading}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            {isLoading ? "Sending..." : "Send Message"}
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
            <Fox
              currentAnimation={currentAnimation}
              position={[0.5, 0.35, 0]}
              rotation={[12.6, -0.6, 0]}
              scale={[0.5, 0.5, 0.5]}
            />
          </Suspense>
        </Canvas>
      </div>
    </section>
  )
}

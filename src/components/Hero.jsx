import { useTranslation, Trans } from "react-i18next"
import recImage from "../assets/images/perfil.png"
import "./css/Hero.css"

export default function Hero() {
  const { t, i18n } = useTranslation("hero")

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
    <section className="hero" id="home">
      <div className="hero-content">
        <h1>
          ALEJANDRO
          <br />
          FERNÁNDEZ
        </h1>
        <h2>{t("title")}</h2>
        <p>{t("intro")}</p>

        <div className="social-links ">
          <a
            href="mailto:afernanpolo@gmail.com"
            className="social-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="mail-link" viewBox="0 0 24 24">
              <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
              <rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
          </a>
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
      <div className="hero-image">
        <div className="hero-illustration">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <circle cx="350" cy="100" r="30" fill="var(--accent)" opacity="0.2">
              <animate
                attributeName="cy"
                values="100;80;100"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="320"
              cy="170"
              r="20"
              fill="var(--accent-light)"
              opacity="0.3"
            >
              <animate
                attributeName="cx"
                values="320;340;320"
                dur="5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="370"
              cy="220"
              r="15"
              fill="var(--accent)"
              opacity="0.25"
            >
              <animate
                attributeName="r"
                values="15;20;15"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="80"
              cy="240"
              r="35"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              opacity="0.4"
            >
              <animate
                attributeName="r"
                values="35;40;35"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx="50"
              cy="120"
              r="25"
              fill="none"
              stroke="var(--accent-light)"
              strokeWidth="2"
              opacity="0.3"
            >
              <animate
                attributeName="r"
                values="25;30;25"
                dur="5s"
                repeatCount="indefinite"
              />
            </circle>
            

            {/* Imagen central redonda */}
            <defs>
              <clipPath id="circleClip">
                <circle cx="195" cy="175" r="125" />
              </clipPath>
              <radialGradient id="screenGlow">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
                <stop
                  offset="100%"
                  stopColor="var(--accent-light)"
                  stopOpacity="0.2"
                />
              </radialGradient>
            </defs>

            <image
              href={recImage}
              x="70"
              y="50"
              width="250"
              height="250"
              clipPath="url(#circleClip)"
              preserveAspectRatio="xMidYMid slice"
            />
            <circle cx="195" cy="175" r="127" fill="none" opacity="0.6" />
          </svg>
        </div>
      </div>
    </section>
  )
}

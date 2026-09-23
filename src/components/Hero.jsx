import { useTranslation } from "react-i18next"
import recImage from "../assets/images/perfil.png"
import { socialLinks } from "../constants/social.jsx"
import "./css/Hero.css"

export default function Hero() {
  const { t, i18n } = useTranslation("hero")

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
              alt="Profile"
              loading="eager" // Añadir eager para contenido above the fold
              fetchpriority="high" // Priorizar esta imagen
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

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { profile } from "../assets/images"
import { skills } from "../constants/skills.js"
import { socialLinks } from "../constants/social.jsx"
import "./css/Hero.css"

const madridClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

function skillsForGroups(groupTitles) {
  return skills
    .filter((group) => groupTitles.includes(group.title))
    .flatMap((group) => group.content.map((skill) => skill.name))
}

// The ticker uses the skills catalog as its source so the same technology list
// cannot drift between this introduction and the Skills section.
const tickerRows = [
  {
    className: "ticker-row",
    items: skillsForGroups(["Frontend", "Tools & Platforms"]),
  },
  {
    className: "ticker-row ticker-row-alt",
    items: skillsForGroups(["Backend", "Database and CMS"]),
  },
]

export default function Hero() {
  const { t } = useTranslation("hero")
  const [clock, setClock] = useState(() => madridClock.format(new Date()))

  useEffect(() => {
    const intervalId = window.setInterval(
      () => setClock(madridClock.format(new Date())),
      15000,
    )

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <>
      <section className="hero" id="home">
        <svg className="shape shape-star" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 4 60 40 96 50 60 60 50 96 40 60 4 50 40 40Z" />
        </svg>
        <svg className="shape shape-ast" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 8v84M14 29l72 42M86 29 14 71" />
        </svg>

        <div className="hero-kickers hero-anim" style={{ "--d": "0s" }}>
          <p className="kicker">
            <span className="dot" aria-hidden="true" />
            <span>{t("kicker")}</span>
          </p>
          <p className="clock mono" aria-label={t("clock")}>
            <time className="clock-time">{clock}</time>
            <span className="clock-dot" aria-hidden="true" />
          </p>
        </div>

        <div className="hero-main">
          <h1 className="hero-title">
            <span className="line hero-anim" style={{ "--d": ".08s" }}>
              {t("line1")}
            </span>
            <span className="line hero-anim" style={{ "--d": ".18s" }}>
              <span className="sticker">{t("line2")}</span>
            </span>
          </h1>
          <figure className="hero-photo hero-anim" style={{ "--d": ".26s" }}>
            <img
              src={profile}
              alt={t("photoAlt")}
              loading="eager"
              fetchpriority="high"
            />
            <figcaption className="mono">{t("photoCaption")}</figcaption>
          </figure>
        </div>

        <div className="hero-card hero-anim" style={{ "--d": ".36s" }}>
          <p className="hero-intro">{t("intro")}</p>
        </div>

        <div className="hero-foot hero-anim" style={{ "--d": ".5s" }}>
          <ul className="socials mono">
            <li>
              <a href="mailto:afernanpolo@gmail.com" aria-label={t("social.email")}>
                {t("social.email")} ↗
              </a>
            </li>
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
          <a className="scroll-cue mono" href="#skills">
            {t("scroll")}
          </a>
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        {tickerRows.map((row) => {
          const text = `${row.items.join(" // ")} // `

          return (
            <div className={row.className} key={row.className}>
              <div className="ticker-track">
                <span>{text}</span>
                <span>{text}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

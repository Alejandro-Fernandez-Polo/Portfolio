import { Link } from "react-router-dom"
import { useTranslation, Trans } from "react-i18next"

export default function HomeInfo ({ currentStage }) {
  const { t } = useTranslation("home")
  if (currentStage === 1)
    return (
      <h1 className="sm:text-xl sm:leading-snug text-center neo-brutalism-blue py-4 px-8 text-white mx-5">
        <Trans
          i18nKey="hero.greeting"
          defaults= {t("hero.greeting")}
          components={{
            1: <span className="font-semibold" />,
            br: <br />,
          }}
        />
      </h1>
    )

  if (currentStage === 2) {
    return (
      <div className="info-box neo-brutalism-blue">
        <p className="font-medium text-center sm:text-xl">
          {t("cards.about.text")}
        </p>
        <Link to="/about" className="neo-brutalism-white neo-btn">
          {t("cards.about.button")} &rarr;
        </Link>
      </div>
    )
  }

  if (currentStage === 3) {
    return (
      <div className="info-box neo-brutalism-blue">
        <p className="font-medium text-center sm:text-xl">
          {t("cards.projects.text")}
        </p>
        <Link to="/projects" className="neo-brutalism-white neo-btn">
          {t("cards.projects.button")} &rarr;
        </Link>
      </div>
    )
  }

  if (currentStage === 4) {
    return (
      <div className="info-box neo-brutalism-blue">
        <p className="font-medium text-center sm:text-xl">
          {t("cards.contact.text")}
        </p>

        <Link to="/contact" className="neo-brutalism-white neo-btn">
          {t("cards.contact.button")} &rarr;
        </Link>
      </div>
    )
  }

  return null
}
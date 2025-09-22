import { Link } from "react-router-dom"
import { useTranslation, Trans } from "react-i18next"

export function CTA() {
    const { t } = useTranslation("cta")
  return (
    <section className="cta">
      <p className="cta-text max-md:text-center">
        <Trans
          i18nKey="title"
          defaults={t("title")}
          components={{
            1: <br className="sm:block hidden" />,
          }}
        />
      </p>
      <Link to="/contact" className="btn">
        {t("button")}
      </Link>
    </section>
  )
}

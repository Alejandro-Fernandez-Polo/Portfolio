import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import navbarEn from "../../locales/en/navbar.json"
import heroEn from "../../locales/en/hero.json"
import experienceEn from "../../locales/en/experience.json"
import projectsEn from "../../locales/en/projects.json"
import educationEn from "../../locales/en/education.json"
import contactEn from "../../locales/en/contact.json"
import skillsEn from "../../locales/en/skills.json"
import footerEn from "../../locales/en/footer.json"

import navbarEs from "../../locales/es/navbar.json"
import heroEs from "../../locales/es/hero.json"
import experienceEs from "../../locales/es/experience.json"
import projectsEs from "../../locales/es/projects.json"
import educationEs from "../../locales/es/education.json"
import contactEs from "../../locales/es/contact.json"
import skillsEs from "../../locales/es/skills.json"
import footerEs from "../../locales/es/footer.json"

// Mantener aquí ambos idiomas y los ocho namespaces evita que un cambio de idioma
// deje traducciones incompletas o dependa de otro mapa cargado en runtime.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        hero: heroEn,
        experience: experienceEn,
        contact: contactEn,
        projects: projectsEn,
        navbar: navbarEn,
        education: educationEn,
        skills: skillsEn,
        footer: footerEn,
      },
      es: {
        hero: heroEs,
        experience: experienceEs,
        contact: contactEs,
        projects: projectsEs,
        navbar: navbarEs,
        education: educationEs,
        skills: skillsEs,
        footer: footerEs,
      },
    },
    fallbackLng: "en",
    ns: ["hero", "experience", "contact", "projects", "navbar", "education", "skills", "footer"],
    defaultNS: "hero",
    // React escapa el texto interpolado; desactivar el escape de i18next evita duplicarlo.
    interpolation: { escapeValue: false },
    detection: {
      order: [
        "navigator",
        "htmlTag",
        "cookie",
        "localStorage",
        "path",
        "subdomain",
      ],
      caches: ["localStorage", "cookie"],
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
    },
  })

export default i18n

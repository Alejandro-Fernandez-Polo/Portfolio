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

import navbarEs from "../../locales/es/navbar.json"
import heroEs from "../../locales/es/hero.json"
import experienceEs from "../../locales/es/experience.json"
import projectsEs from "../../locales/es/projects.json"
import educationEs from "../../locales/es/education.json"
import contactEs from "../../locales/es/contact.json"
import skillsEs from "../../locales/es/skills.json"

i18n
  .use(LanguageDetector) // 👈 aquí añadimos el detector
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
      },
      es: {
        hero: heroEs,
        experience: experienceEs,
        contact: contactEs,
        projects: projectsEs,
        navbar: navbarEs,
        education: educationEs,
        skills: skillsEs,
      },
    },
    fallbackLng: "en", // idioma por defecto si no encuentra el del navegador
    ns: ["hero","experience", "contact", "projects", "navbar", "education", "skills"], // namespaces disponibles
    defaultNS: "hero", // 👈 como no usas "common", mejor apunta a uno real
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
      caches: ["localStorage", "cookie"], // guarda la preferencia
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
    },
  })

export default i18n

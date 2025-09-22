import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import homeEn from "../../locales/en/home.json"
import navbarEn from "../../locales/en/navbar.json"
import aboutEn from "../../locales/en/about.json"
import projectsEn from "../../locales/en/projects.json"
import contactEn from "../../locales/en/contact.json"
import ctaEn from "../../locales/en/cta.json"

import homeEs from "../../locales/es/home.json"
import navbarEs from "../../locales/es/navbar.json"
import aboutEs from "../../locales/es/about.json"
import projectsEs from "../../locales/es/projects.json"
import contactEs from "../../locales/es/contact.json"
import ctaEs from "../../locales/es/cta.json"

i18n
  .use(LanguageDetector) // 👈 aquí añadimos el detector
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        home: homeEn,
        about: aboutEn,
        contact: contactEn,
        projects: projectsEn,
        navbar: navbarEn,
        cta: ctaEn,
      },
      es: {
        home: homeEs,
        about: aboutEs,
        contact: contactEs,
        projects: projectsEs,
        navbar: navbarEs,
        cta: ctaEs,
      },
    },
    fallbackLng: "en", // idioma por defecto si no encuentra el del navegador
    ns: ["home", "about", "contact", "projects", "navbar", "cta"],
    defaultNS: "home", // 👈 como no usas "common", mejor apunta a uno real
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
  })

export default i18n

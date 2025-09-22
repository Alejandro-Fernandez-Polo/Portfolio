import i18n from "i18next"
import { initReactI18next } from "react-i18next"

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

i18n.use(initReactI18next).init({
  resources: {
    en: {
      // common: commonEn,
      home: homeEn,
      about: aboutEn,
      contact: contactEn,
      projects: projectsEn,
      navbar: navbarEn,
      cta: ctaEn,
    },
    es: {
      //   common: commonEs,
      home: homeEs,
      about: aboutEs,
      contact: contactEs,
      projects: projectsEs,
      navbar: navbarEs,
      cta: ctaEs,
    },
  },
  lng: "en", // idioma por defecto
  fallbackLng: "en",
  ns: ["common", "home", "about", "contact", "projects", "navbar", "cta"], // namespaces
  defaultNS: "common",
  interpolation: { escapeValue: false },
})

export default i18n

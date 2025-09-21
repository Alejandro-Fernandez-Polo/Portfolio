import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import homeEn from "../../locales/en/home.json"
import navbarEn from "../../locales/en/navbar.json"

import homeEs from "../../locales/es/home.json"
import navbarEs from "../../locales/es/navbar.json"

i18n.use(initReactI18next).init({
  resources: {
    en: {
      // common: commonEn,
      home: homeEn,
      // about: aboutEn,
      // contact: contactEn,
      // projects: projectsEn,
      navbar: navbarEn,
    },
    es: {
      //   common: commonEs,
      home: homeEs,
      //   about: aboutEs,
      //   contact: contactEs,
      //   projects: projectsEs,
      navbar: navbarEs,
    },
  },
  lng: "en", // idioma por defecto
  fallbackLng: "en",
  ns: ["common", "home", "about", "contact", "projects", "navbar"], // namespaces
  defaultNS: "common",
  interpolation: { escapeValue: false },
})

export default i18n

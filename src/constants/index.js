//TODO: poner mis datos
import { atg, pergolas } from "../assets/images"
import {
  reactlogo,
  contact,
  css,
  express,
  git,
  github,
  html,
  javascript,
  linkedin,
  mongodb,
  nodejs,
  codigodesconocido,
  react,
  vehicle,
  tailwindcss,
  design,
  postman,
  laravel,
  php,
  java,
  sql,
  wordpress,
  bootstrap,
  docker,
} from "../assets/icons"

export const skills = [
  {
    imageUrl: php,
    name: "Php",
    type: "Backend",
  },
  {
    imageUrl: java,
    name: "Java",
    type: "Backend",
  },
  {
    imageUrl: laravel,
    name: "Laravel",
    type: "Backend",
  },
  {
    imageUrl: sql,
    name: "SQL",
    type: "Database",
  },
  {
    imageUrl: wordpress,
    name: "WordPress",
    type: "CMS",
  },
  {
    imageUrl: docker,
    name: "Docker",
    type: "DevOps",
  },
  {
    imageUrl: html,
    name: "HTML",
    type: "Frontend",
  },
  {
    imageUrl: css,
    name: "CSS",
    type: "Frontend",
  },
  {
    imageUrl: javascript,
    name: "JavaScript",
    type: "Frontend",
  },
  {
    imageUrl: react,
    name: "React",
    type: "Frontend",
  },
  {
    imageUrl: nodejs,
    name: "Node.js",
    type: "Backend",
  },
  {
    imageUrl: tailwindcss,
    name: "Tailwind CSS",
    type: "Frontend",
  },
  {
    imageUrl: git,
    name: "Git",
    type: "Version Control",
  },
  {
    imageUrl: github,
    name: "GitHub",
    type: "Version Control",
  },
  {
    imageUrl: express,
    name: "Express",
    type: "Backend",
  },
  {
    imageUrl: mongodb,
    name: "MongoDB",
    type: "Database",
  },
  {
    imageUrl: bootstrap,
    name: "Bootstrap",
    type: "Frontend",
  },
  {
    imageUrl: postman,
    name: "POSTMAN",
    type: "Testing",
  },
]

export const groupedSkills = [
  {
    title: "Frontend",
    content: [
      { imageUrl: html, name: "HTML", type: "Frontend" },
      { imageUrl: css, name: "CSS", type: "Frontend" },
      { imageUrl: javascript, name: "JavaScript", type: "Frontend" },
      { imageUrl: react, name: "React", type: "Frontend" },
      { imageUrl: tailwindcss, name: "Tailwind CSS", type: "Frontend" },
      { imageUrl: bootstrap, name: "Bootstrap", type: "Frontend" },
    ],
  },
  {
    title: "Backend",
    content: [
      { imageUrl: php, name: "Php", type: "Backend" },
      { imageUrl: java, name: "Java", type: "Backend" },
      { imageUrl: laravel, name: "Laravel", type: "Backend" },
      { imageUrl: nodejs, name: "Node.js", type: "Backend" },
      { imageUrl: express, name: "Express", type: "Backend" },
    ],
  },
  {
    title: "Database and CMS",
    content: [
      { imageUrl: sql, name: "SQL", type: "Database" },
      { imageUrl: mongodb, name: "MongoDB", type: "Database" },
      { imageUrl: wordpress, name: "WordPress", type: "CMS" },
    ],
  },
  {
    title: "Tools & Platforms",
    content: [
      { imageUrl: docker, name: "Docker", type: "DevOps" },
      { imageUrl: git, name: "Git", type: "Version Control" },
      { imageUrl: github, name: "GitHub", type: "Version Control" },
      { imageUrl: postman, name: "POSTMAN", type: "Testing" },
    ],
  },
]

export const experiences = [
  {
    id: "atg", // clave que conecta con traducciones
    company_name: "ATG Analytical", // si también quieres traducir, lo sacamos al JSON
    icon: atg,
    iconBg: "#ffa987",
    date: { en: "April 2024 - June 2024", es: "Abril 2024 - Junio 2024" },
  },
  {
    id: "pergolas",
    company_name: "Pérgolas y Estructuras Javier Aibar",
    icon: pergolas,
    iconBg: "#544b38",
    date: {
      en: "June 2023 - September 2023",
      es: "Junio 2023 - Septiembre 2023",
    },
  },
]

export const education = [
  {
    id: "grado",
    date: {
      en: "September 2022 - June 2024",
      es: "Septiembre 2022 - Junio 2024",
    },
  },
  {
    id: "carrera",
    date: {
      en: "September 2024 - Present",
      es: "Septiembre 2024 - Presente",
    },
  },
]

export const socialLinks = [
  {
    name: "Contact",
    iconUrl: contact,
    link: "/contact",
  },
  {
    name: "GitHub",
    iconUrl: github,
    link: "https://github.com/Alejandro-Fernandez-Polo",
  },
  {
    name: "LinkedIn",
    iconUrl: linkedin,
    link: "https://www.linkedin.com/in/alejandro-fern%C3%A1ndez-polo/",
  },
]

export const projects = [
  //TODO: Añadir tecnologías usadas
  {
    id: "codigodesconocido", // clave que conecta con traducciones
    iconUrl: codigodesconocido,
    theme: "btn-back-black",
    technology: "React, Flask, Node.js, MongoBD, MySQL, Docker",
    link: "https://github.com/Alejandro-Fernandez-Polo/DAW/tree/main/Final_project/Codigo-Desconocido",
  },
  {
    id: "vehicle", // clave que conecta con traducciones
    iconUrl: vehicle,
    theme: "btn-back-green",
    technology: "Java",
    link: "https://github.com/Alejandro-Fernandez-Polo/UNED/tree/main/POO/PEC_POO_24-25",
  },
  {
    id: "design", // clave que conecta con traducciones
    iconUrl: design,
    theme: "btn-back-pink",
    technology: "HTML, CSS, JavaScript, Laravel, AJAX, PHP",
    link: "https://github.com/Alejandro-Fernandez-Polo/DAW",
  },
  {
    id: "reactlogo", // clave que conecta con traducciones
    iconUrl: reactlogo,
    theme: "btn-back-blue",
    technology: "React, Flask, Node.js, MongoBD, MySQL, Docker",
    link: "HTML, CSS, JavaScript, React",
  },
  // {
  //   iconUrl: estate,
  //   theme: "btn-back-red",
  //   name: "Real-Estate Application",
  //   description:
  //     "Developed a web application for real estate listings, facilitating property searches and connecting buyers with sellers.",
  //   link: "https://github.com/adrianhajdin/projects_realestate",
  // },
  // {
  //   iconUrl: summiz,
  //   theme: "btn-back-yellow",
  //   name: "AI Summarizer Application",
  //   description:
  //     "App that leverages AI to automatically generate concise & informative summaries from lengthy text content, or blogs.",
  //   link: "https://github.com/adrianhajdin/project_ai_summarizer",
  // },
]

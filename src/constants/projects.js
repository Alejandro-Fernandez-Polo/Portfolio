import {
  codigodesconocido,
  gestionvehiculos,
  proyectosdaw,
  proyectosreact,
} from "../assets/images/index.js"

/**
 * Catálogo de proyectos: cada id conecta la tarjeta con sus claves de idioma.
 * `featured` selecciona la tarjeta fija que queda fuera del carrusel.
 */
export const projects = [
  {
    id: "codigodesconocido", // clave que conecta con traducciones
    img: codigodesconocido,
    technology: "React, Flask, Node.js, MongoDB, MySQL, Docker",
    link: "https://github.com/Alejandro-Fernandez-Polo/DAW/tree/main/Final_project/Codigo-Desconocido",
    featured: true,
  },
  {
    id: "vehicle",
    img: gestionvehiculos,
    technology: "Java",
    link: "https://github.com/Alejandro-Fernandez-Polo/UNED/tree/main/POO/PEC_POO_24-25",
  },
  {
    id: "design",
    img: proyectosdaw,
    technology: "HTML, CSS, JavaScript, Laravel, AJAX, PHP",
    link: "https://github.com/Alejandro-Fernandez-Polo/DAW",
  },
  {
    id: "reactlogo",
    img: proyectosreact,
    technology: "React, Flask, Node.js, MongoDB, MySQL, Docker",
    link: "https://github.com/Alejandro-Fernandez-Polo/Learn_React",
  },
]

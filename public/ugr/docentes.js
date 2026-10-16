/* UGR Horario - Docentes (capa de datos)
 *
 * Declara los dos globales de la capa de docentes: "DOCENTES" son las
 * asignaciones (qué profesor da la teoría de una letra de grupo —groupLetter
 * "A"— o las prácticas de un subgrupo —"A1"-) y "PROFESORES" son los perfiles,
 * uno por (asignatura, modalidad, nombre).
 *
 * Las asignaciones son las que publica la ETSIIT en sus guías docentes: las
 * deriva tools/ugr-pipeline/guias.js de guias-docentes.json. Los perfiles son la
 * muestra del autor (sample-docents.json); el volcado completo de la hoja viaja
 * cifrado en datasets/ugr/gi/package.enc.json y se superpone al escribir la
 * contraseña. Fichero generado: no lo edites a mano; cambia los fixtures y
 * ejecuta tools/ugr-pipeline/emit-seed.mjs.
 */
const DOCENTES = [
  {
    "key": "FFT-A",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "FFT-E",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "FFT-F",
    "name": "Pedro García Fernández",
    "subjectCode": "FFT",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "FFT-C",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "FFT-D",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "FFT-B",
    "name": "José Luis Padilla de la Torre",
    "subjectCode": "FFT",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "FFT-A1",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-E1",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-E2",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-E3",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-A2",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-A3",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-B1",
    "name": "Pablo Escobedo Araque",
    "subjectCode": "FFT",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-B3",
    "name": "Pablo Escobedo Araque",
    "subjectCode": "FFT",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-F1",
    "name": "Pedro García Fernández",
    "subjectCode": "FFT",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-F2",
    "name": "Pedro García Fernández",
    "subjectCode": "FFT",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-D2",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-D3",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-C1",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-C2",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-D1",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FFT-B2",
    "name": "Marco Antonio Villena Sanchez",
    "subjectCode": "FFT",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-E",
    "name": "Jesús García Miranda",
    "subjectCode": "ALEM",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "ALEM-F",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "ALEM",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "ALEM-A",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "ALEM-D",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "ALEM-B",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "ALEM-C",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "ALEM-D2",
    "name": "Celia Cordovilla Sánchez",
    "subjectCode": "ALEM",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-D1",
    "name": "Celia Cordovilla Sánchez",
    "subjectCode": "ALEM",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-E1",
    "name": "Jesús García Miranda",
    "subjectCode": "ALEM",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-E2",
    "name": "Jesús García Miranda",
    "subjectCode": "ALEM",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-E3",
    "name": "Jesús García Miranda",
    "subjectCode": "ALEM",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-D3",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "ALEM",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-F1",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "ALEM",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-F2",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "ALEM",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-A1",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-A2",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-A3",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-B1",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-B2",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-B3",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-C1",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALEM-C2",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-E",
    "name": "José Luis Garrido Bullejos",
    "subjectCode": "SO",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "SO-A",
    "name": "Miguel Lastra Leidinger",
    "subjectCode": "SO",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "SO-D",
    "name": "Alejandro José León Salas",
    "subjectCode": "SO",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "SO-C",
    "name": "Patricia Paderewski Rodríguez",
    "subjectCode": "SO",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "SO-B",
    "name": "Pablo Antonio Pico Valencia",
    "subjectCode": "SO",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "SO-A3",
    "name": "Germán Arroyo Moreno",
    "subjectCode": "SO",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-D3",
    "name": "Daniel Bolaños Martínez",
    "subjectCode": "SO",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-B1",
    "name": "Daniel Bolaños Martínez",
    "subjectCode": "SO",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-B3",
    "name": "Daniel Bolaños Martínez",
    "subjectCode": "SO",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-E2",
    "name": "María José Gacto Colorado",
    "subjectCode": "SO",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-B2",
    "name": "María José Gacto Colorado",
    "subjectCode": "SO",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-C1",
    "name": "María José Gacto Colorado",
    "subjectCode": "SO",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-A1",
    "name": "José Luis Garrido Bullejos",
    "subjectCode": "SO",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-D1",
    "name": "Alejandro José León Salas",
    "subjectCode": "SO",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-D2",
    "name": "Alejandro José León Salas",
    "subjectCode": "SO",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-E3",
    "name": "Alejandro José León Salas",
    "subjectCode": "SO",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-A2",
    "name": "Carlos Molina Fernández",
    "subjectCode": "SO",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-C2",
    "name": "Patricia Paderewski Rodríguez",
    "subjectCode": "SO",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-C3",
    "name": "Patricia Paderewski Rodríguez",
    "subjectCode": "SO",
    "groupLetter": "C3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SO-E1",
    "name": "Ángel Ruiz Zafra",
    "subjectCode": "SO",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-B",
    "name": "José Miguel Mantas Ruiz",
    "subjectCode": "SCD",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "SCD-C",
    "name": "José Ángel Segura Muros",
    "subjectCode": "SCD",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "SCD-D",
    "name": "José Ángel Segura Muros",
    "subjectCode": "SCD",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "SCD-A",
    "name": "Carlos Ureña Almagro",
    "subjectCode": "SCD",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "SCD-E",
    "name": "Pedro Villar Castro",
    "subjectCode": "SCD",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "SCD-A2",
    "name": "Miguel Lastra Leidinger",
    "subjectCode": "SCD",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-A3",
    "name": "Miguel Lastra Leidinger",
    "subjectCode": "SCD",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-B2",
    "name": "José Miguel Mantas Ruiz",
    "subjectCode": "SCD",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-B3",
    "name": "José Miguel Mantas Ruiz",
    "subjectCode": "SCD",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-A1",
    "name": "Ana María Sánchez López",
    "subjectCode": "SCD",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-E2",
    "name": "Ana María Sánchez López",
    "subjectCode": "SCD",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-B1",
    "name": "Ana María Sánchez López",
    "subjectCode": "SCD",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-C3",
    "name": "Ana María Sánchez López",
    "subjectCode": "SCD",
    "groupLetter": "C3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-D1",
    "name": "José Ángel Segura Muros",
    "subjectCode": "SCD",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-D2",
    "name": "José Ángel Segura Muros",
    "subjectCode": "SCD",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-E1",
    "name": "Andrés Silva Pérez",
    "subjectCode": "SCD",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-D3",
    "name": "Pedro Villar Castro",
    "subjectCode": "SCD",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-C1",
    "name": "Pedro Villar Castro",
    "subjectCode": "SCD",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SCD-C2",
    "name": "Pedro Villar Castro",
    "subjectCode": "SCD",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-A",
    "name": "Ignacio Aguilera Martos",
    "subjectCode": "DDSI",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "DDSI-B",
    "name": "Ignacio José Blanco Medina",
    "subjectCode": "DDSI",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "DDSI-D",
    "name": "David Criado Ramón",
    "subjectCode": "DDSI",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "DDSI-C",
    "name": "Carlos Alberto Cruz Corona",
    "subjectCode": "DDSI",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "DDSI-A3",
    "name": "Ignacio Aguilera Martos",
    "subjectCode": "DDSI",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-A2",
    "name": "Francisco Javier Baldán Lozano",
    "subjectCode": "DDSI",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-B3",
    "name": "Francisco Javier Baldán Lozano",
    "subjectCode": "DDSI",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-D1",
    "name": "Francisco Javier Baldán Lozano",
    "subjectCode": "DDSI",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-B1",
    "name": "Ignacio José Blanco Medina",
    "subjectCode": "DDSI",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-D2",
    "name": "David Criado Ramón",
    "subjectCode": "DDSI",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-C1",
    "name": "Carlos Alberto Cruz Corona",
    "subjectCode": "DDSI",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-C2",
    "name": "Carlos Alberto Cruz Corona",
    "subjectCode": "DDSI",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-A1",
    "name": "María José Martín Bautista",
    "subjectCode": "DDSI",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DDSI-B2",
    "name": "Daniel Peralta Cámara",
    "subjectCode": "DDSI",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-A",
    "name": "Germán Arroyo Moreno",
    "subjectCode": "IG",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "IG-C",
    "name": "Antonio López Fernández",
    "subjectCode": "IG",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "IG-E",
    "name": "Domingo Martín Perandrés",
    "subjectCode": "IG",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "IG-B",
    "name": "Juan Carlos Torres Cantero",
    "subjectCode": "IG",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "IG-D",
    "name": "Juan Carlos Torres Cantero",
    "subjectCode": "IG",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "IG-A3",
    "name": "Santiago Carbó García",
    "subjectCode": "IG",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-E1",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "IG",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-E2",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "IG",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-B1",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "IG",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-B3",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "IG",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-A1",
    "name": "Luis López Escudero",
    "subjectCode": "IG",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-A2",
    "name": "Luis López Escudero",
    "subjectCode": "IG",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-B2",
    "name": "Luis López Escudero",
    "subjectCode": "IG",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-C1",
    "name": "Antonio López Fernández",
    "subjectCode": "IG",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-C2",
    "name": "Antonio López Fernández",
    "subjectCode": "IG",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-D2",
    "name": "Guillermo Medialdea Burgos",
    "subjectCode": "IG",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IG-D1",
    "name": "Guillermo Medialdea Burgos",
    "subjectCode": "IG",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-A",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "ISE-B",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "ISE-C",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "ISE-D",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "ISE-E",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "ISE-C2",
    "name": "Eusebio Naif Al-Soliman Fuentes",
    "subjectCode": "ISE",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-B2",
    "name": "Oresti Baños Legrán",
    "subjectCode": "ISE",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-E3",
    "name": "Juan Helios García Guzmán",
    "subjectCode": "ISE",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-D1",
    "name": "Juan Helios García Guzmán",
    "subjectCode": "ISE",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-C1",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-A1",
    "name": "Alberto Guillén Perales",
    "subjectCode": "ISE",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-B3",
    "name": "Alberto Guillén Perales",
    "subjectCode": "ISE",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-D2",
    "name": "Diego Navarro Cabrera",
    "subjectCode": "ISE",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-E2",
    "name": "Diego Navarro Cabrera",
    "subjectCode": "ISE",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-A2",
    "name": "Alberto Ortega Ruiz",
    "subjectCode": "ISE",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-B1",
    "name": "Alberto Ortega Ruiz",
    "subjectCode": "ISE",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-E1",
    "name": "Ciro Rodríguez León",
    "subjectCode": "ISE",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISE-A3",
    "name": "Ciro Rodríguez León",
    "subjectCode": "ISE",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "DGP-A1",
    "name": "Juan José Escobar Pérez",
    "subjectCode": "DGP",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DGP-A2",
    "name": "María Belén Prados Suárez",
    "subjectCode": "DGP",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DGP-A3",
    "name": "María Belén Prados Suárez",
    "subjectCode": "DGP",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "DGP-A4",
    "name": "María Belén Prados Suárez",
    "subjectCode": "DGP",
    "groupLetter": "A4",
    "modalidad": "Prácticas"
  },
  {
    "key": "MDA-A1",
    "name": "Juan José Escobar Pérez",
    "subjectCode": "MDA",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MDA-A3",
    "name": "Juan José Escobar Pérez",
    "subjectCode": "MDA",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MDA-A2",
    "name": "María José Rodríguez Fortiz",
    "subjectCode": "MDA",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-B",
    "name": "Juan Fernández Olivares",
    "subjectCode": "IA",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "IA-D",
    "name": "Juan Fernández Olivares",
    "subjectCode": "IA",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "IA-E",
    "name": "Juan Fernández Olivares",
    "subjectCode": "IA",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "IA-A",
    "name": "Antonio González Muñoz",
    "subjectCode": "IA",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "IA-C",
    "name": "Antonio González Muñoz",
    "subjectCode": "IA",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "IA-B2",
    "name": "María Isabel Abellán Benítez",
    "subjectCode": "IA",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-E1",
    "name": "Juan Fernández Olivares",
    "subjectCode": "IA",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-E2",
    "name": "Juan Fernández Olivares",
    "subjectCode": "IA",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-B1",
    "name": "Rubén Garralón López",
    "subjectCode": "IA",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-D2",
    "name": "Francisco G.Raúl Pérez Rodríguez",
    "subjectCode": "IA",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-D3",
    "name": "Francisco G.Raúl Pérez Rodríguez",
    "subjectCode": "IA",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-C1",
    "name": "Francisco G.Raúl Pérez Rodríguez",
    "subjectCode": "IA",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-C2",
    "name": "Francisco G.Raúl Pérez Rodríguez",
    "subjectCode": "IA",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-D1",
    "name": "Francisco G.Raúl Pérez Rodríguez",
    "subjectCode": "IA",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-A1",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "IA",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-A2",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "IA",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-A3",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "IA",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "IA-B3",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "IA",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "DSD-A",
    "name": "José Luis Garrido Bullejos",
    "subjectCode": "DSD",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "DSD-B",
    "name": "José Ángel Segura Muros",
    "subjectCode": "DSD",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "DSD-A1",
    "name": "Luis López Escudero",
    "subjectCode": "DSD",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DSD-A2",
    "name": "Luis López Escudero",
    "subjectCode": "DSD",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DSD-B1",
    "name": "José Ángel Segura Muros",
    "subjectCode": "DSD",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DSD-B2",
    "name": "José Ángel Segura Muros",
    "subjectCode": "DSD",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DS-A",
    "name": "María del Mar Abad Grau",
    "subjectCode": "DS",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "DS-B",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "DS",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "DS-A1",
    "name": "María del Mar Abad Grau",
    "subjectCode": "DS",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DS-A2",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "DS",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DS-B1",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "DS",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DS-B2",
    "name": "Alberto Jesús Durán López",
    "subjectCode": "DS",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DIU-B",
    "name": "Miguel Gea Megías",
    "subjectCode": "DIU",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "DIU-A",
    "name": "Rosana Montes Soldado",
    "subjectCode": "DIU",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "DIU-B1",
    "name": "Antonio Javier Fernández Ares",
    "subjectCode": "DIU",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "DIU-B2",
    "name": "Miguel Gea Megías",
    "subjectCode": "DIU",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "DIU-A2",
    "name": "Brunil Dalila Romero Mariño",
    "subjectCode": "DIU",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SIBW-A1",
    "name": "José María Guirao Miras",
    "subjectCode": "SIBW",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SIBW-A2",
    "name": "Carmen Josefa Martínez Cruz",
    "subjectCode": "SIBW",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SIBW-B2",
    "name": "Carmen Josefa Martínez Cruz",
    "subjectCode": "SIBW",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "CEGE-A",
    "name": "Francisco Juan López Martín",
    "subjectCode": "CEGE",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "CA-A",
    "name": "Jerónimo Alaminos Prats",
    "subjectCode": "CA",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "CA-B",
    "name": "Gerardo Martín Escolano",
    "subjectCode": "CA",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "CA-D",
    "name": "Gerardo Martín Escolano",
    "subjectCode": "CA",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "CA-E",
    "name": "Miguel Martínez Teruel",
    "subjectCode": "CA",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "CA-C",
    "name": "Abraham Rueda Zoca",
    "subjectCode": "CA",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "CA-A1",
    "name": "Jerónimo Alaminos Prats",
    "subjectCode": "CA",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-F1",
    "name": "Jerónimo Alaminos Prats",
    "subjectCode": "CA",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-A2",
    "name": "Jerónimo Alaminos Prats",
    "subjectCode": "CA",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-D2",
    "name": "Gerardo Martín Escolano",
    "subjectCode": "CA",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-D3",
    "name": "Gerardo Martín Escolano",
    "subjectCode": "CA",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-D1",
    "name": "Gerardo Martín Escolano",
    "subjectCode": "CA",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-E1",
    "name": "Miguel Martínez Teruel",
    "subjectCode": "CA",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-E2",
    "name": "Miguel Martínez Teruel",
    "subjectCode": "CA",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-E3",
    "name": "Miguel Martínez Teruel",
    "subjectCode": "CA",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-F2",
    "name": "Esteban Martínez Vañó",
    "subjectCode": "CA",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-A3",
    "name": "Esteban Martínez Vañó",
    "subjectCode": "CA",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-B3",
    "name": "Esteban Martínez Vañó",
    "subjectCode": "CA",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-B1",
    "name": "Abraham Rueda Zoca",
    "subjectCode": "CA",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-B2",
    "name": "Abraham Rueda Zoca",
    "subjectCode": "CA",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-C1",
    "name": "Abraham Rueda Zoca",
    "subjectCode": "CA",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "CA-C2",
    "name": "Abraham Rueda Zoca",
    "subjectCode": "CA",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-F",
    "name": "Manuel Jesús Cobo Martín",
    "subjectCode": "FP",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "FP-A",
    "name": "Juan Carlos Cubero Talavera",
    "subjectCode": "FP",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "FP-C",
    "name": "Juan Carlos Cubero Talavera",
    "subjectCode": "FP",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "FP-B",
    "name": "Manuel Lozano Márquez",
    "subjectCode": "FP",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "FP-E",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "FP",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "FP-D",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "FP",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "FP-A1",
    "name": "Juan Carlos Cubero Talavera",
    "subjectCode": "FP",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-A2",
    "name": "Juan Carlos Cubero Talavera",
    "subjectCode": "FP",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-A3",
    "name": "Juan Carlos Cubero Talavera",
    "subjectCode": "FP",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-E1",
    "name": "Salvador López Joya",
    "subjectCode": "FP",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-E2",
    "name": "Manuel Lozano Márquez",
    "subjectCode": "FP",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-B1",
    "name": "Manuel Lozano Márquez",
    "subjectCode": "FP",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-B2",
    "name": "Manuel Lozano Márquez",
    "subjectCode": "FP",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-B3",
    "name": "Manuel Lozano Márquez",
    "subjectCode": "FP",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-C1",
    "name": "Manuel Lozano Márquez",
    "subjectCode": "FP",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-D2",
    "name": "Javier Martínez Baena",
    "subjectCode": "FP",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-D3",
    "name": "Javier Martínez Baena",
    "subjectCode": "FP",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-F2",
    "name": "Javier Martínez Baena",
    "subjectCode": "FP",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-D1",
    "name": "Javier Martínez Baena",
    "subjectCode": "FP",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-E3",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "FP",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-F1",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "FP",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FP-C2",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "FP",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-B",
    "name": "María del Mar Abad Grau",
    "subjectCode": "FS",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "FS-F",
    "name": "María del Mar Abad Grau",
    "subjectCode": "FS",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "FS-A",
    "name": "Juan José Escobar Pérez",
    "subjectCode": "FS",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "FS-E",
    "name": "Pedro Manuel Martínez Jiménez",
    "subjectCode": "FS",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "FS-C",
    "name": "Rosana Montes Soldado",
    "subjectCode": "FS",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "FS-D",
    "name": "Rosana Montes Soldado",
    "subjectCode": "FS",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "FS-E2",
    "name": "María del Mar Abad Grau",
    "subjectCode": "FS",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-E3",
    "name": "María del Mar Abad Grau",
    "subjectCode": "FS",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-A1",
    "name": "Francisco de P. Araque Cuenca",
    "subjectCode": "FS",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-A3",
    "name": "Francisco de P. Araque Cuenca",
    "subjectCode": "FS",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-A2",
    "name": "Kawtar Benghazi Akhlaki Sekkate",
    "subjectCode": "FS",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-C1",
    "name": "Kawtar Benghazi Akhlaki Sekkate",
    "subjectCode": "FS",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-D1",
    "name": "Kawtar Benghazi Akhlaki Sekkate",
    "subjectCode": "FS",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-D3",
    "name": "Santiago Carbó García",
    "subjectCode": "FS",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-F2",
    "name": "Juan José Escobar Pérez",
    "subjectCode": "FS",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-B2",
    "name": "Juan José Escobar Pérez",
    "subjectCode": "FS",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-D2",
    "name": "Diego Jesús García Gil",
    "subjectCode": "FS",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-E1",
    "name": "Diego Jesús García Gil",
    "subjectCode": "FS",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-B3",
    "name": "Diego Jesús García Gil",
    "subjectCode": "FS",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-F1",
    "name": "María Victoria Luzón García",
    "subjectCode": "FS",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-B1",
    "name": "María Victoria Luzón García",
    "subjectCode": "FS",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FS-C2",
    "name": "Janet Pigueiras Del Real",
    "subjectCode": "FS",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-B",
    "name": "Manuela Expósito Ruiz",
    "subjectCode": "ES",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "ES-D",
    "name": "Antonio Jesús López Montoya",
    "subjectCode": "ES",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "ES-E",
    "name": "Antonio Jesús López Montoya",
    "subjectCode": "ES",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "ES-F",
    "name": "Antonio Jesús López Montoya",
    "subjectCode": "ES",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "ES-A",
    "name": "Nuria Rico Castro",
    "subjectCode": "ES",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "ES-C",
    "name": "María del Carmen Segovia García",
    "subjectCode": "ES",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "ES-E1",
    "name": "Sanae Fauzi",
    "subjectCode": "ES",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-F2",
    "name": "Sanae Fauzi",
    "subjectCode": "ES",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-A2",
    "name": "Sanae Fauzi",
    "subjectCode": "ES",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-E2",
    "name": "Antonio Jesús López Montoya",
    "subjectCode": "ES",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-E3",
    "name": "Antonio Jesús López Montoya",
    "subjectCode": "ES",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-A1",
    "name": "Fernando Martínez Álvarez",
    "subjectCode": "ES",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-B1",
    "name": "Fernando Martínez Álvarez",
    "subjectCode": "ES",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-B3",
    "name": "Fernando Martínez Álvarez",
    "subjectCode": "ES",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-C1",
    "name": "Fernando Martínez Álvarez",
    "subjectCode": "ES",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-D2",
    "name": "Pablo Morales Álvarez",
    "subjectCode": "ES",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-A3",
    "name": "Pablo Morales Álvarez",
    "subjectCode": "ES",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-B2",
    "name": "Pablo Morales Álvarez",
    "subjectCode": "ES",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-C2",
    "name": "Pablo Morales Álvarez",
    "subjectCode": "ES",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-D1",
    "name": "Pablo Morales Álvarez",
    "subjectCode": "ES",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-D3",
    "name": "Raquel Ortiz Martín",
    "subjectCode": "ES",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ES-F1",
    "name": "Raquel Ortiz Martín",
    "subjectCode": "ES",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IES-C",
    "name": "Javier Delgado Ceballos",
    "subjectCode": "IES",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "IES-A",
    "name": "Encarnación García Sánchez",
    "subjectCode": "IES",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "IES-F",
    "name": "David Alejandro Jiménez Jordán",
    "subjectCode": "IES",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "IES-B",
    "name": "María Esmeralda Lardón López",
    "subjectCode": "IES",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "IES-E",
    "name": "María Esmeralda Lardón López",
    "subjectCode": "IES",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "IES-D",
    "name": "Francisco Juan López Martín",
    "subjectCode": "IES",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-B",
    "name": "Celia Cordovilla Sánchez",
    "subjectCode": "LMD",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-D",
    "name": "Jesús García Miranda",
    "subjectCode": "LMD",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-E",
    "name": "Andrés Herrera Poyatos",
    "subjectCode": "LMD",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-A",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "LMD",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-C",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "LMD",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-F",
    "name": "Carlos Vela Cabello",
    "subjectCode": "LMD",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "LMD-B1",
    "name": "Celia Cordovilla Sánchez",
    "subjectCode": "LMD",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-B2",
    "name": "Celia Cordovilla Sánchez",
    "subjectCode": "LMD",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-B3",
    "name": "Celia Cordovilla Sánchez",
    "subjectCode": "LMD",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-D3",
    "name": "Jesús García Miranda",
    "subjectCode": "LMD",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-D1",
    "name": "Jesús García Miranda",
    "subjectCode": "LMD",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-D2",
    "name": "Andrés Herrera Poyatos",
    "subjectCode": "LMD",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-E1",
    "name": "Andrés Herrera Poyatos",
    "subjectCode": "LMD",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-E2",
    "name": "Andrés Herrera Poyatos",
    "subjectCode": "LMD",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-E3",
    "name": "Andrés Herrera Poyatos",
    "subjectCode": "LMD",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-F2",
    "name": "Andrés Herrera Poyatos",
    "subjectCode": "LMD",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-A1",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "LMD",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-A2",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "LMD",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-A3",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "LMD",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-C1",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "LMD",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-C2",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "LMD",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "LMD-F1",
    "name": "Carlos Vela Cabello",
    "subjectCode": "LMD",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-B",
    "name": "Francisco José Cortijo Bon",
    "subjectCode": "MP",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "MP-A",
    "name": "Javier Martínez Baena",
    "subjectCode": "MP",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "MP-E",
    "name": "Juan Antonio Morente Molinera",
    "subjectCode": "MP",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "MP-C",
    "name": "David Alejandro Pelta Mochcovsky",
    "subjectCode": "MP",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "MP-D",
    "name": "Daniel Peralta Cámara",
    "subjectCode": "MP",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "MP-F",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "MP",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "MP-B1",
    "name": "Francisco José Cortijo Bon",
    "subjectCode": "MP",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-B2",
    "name": "Francisco José Cortijo Bon",
    "subjectCode": "MP",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-B3",
    "name": "Francisco José Cortijo Bon",
    "subjectCode": "MP",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-D1",
    "name": "Antonio Manjavacas Lucas",
    "subjectCode": "MP",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-A1",
    "name": "Javier Martínez Baena",
    "subjectCode": "MP",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-A2",
    "name": "Javier Martínez Baena",
    "subjectCode": "MP",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-A3",
    "name": "Javier Martínez Baena",
    "subjectCode": "MP",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-E1",
    "name": "Juan Antonio Morente Molinera",
    "subjectCode": "MP",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-E2",
    "name": "Juan Antonio Morente Molinera",
    "subjectCode": "MP",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-E3",
    "name": "Juan Antonio Morente Molinera",
    "subjectCode": "MP",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-C1",
    "name": "David Alejandro Pelta Mochcovsky",
    "subjectCode": "MP",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-C2",
    "name": "David Alejandro Pelta Mochcovsky",
    "subjectCode": "MP",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-D2",
    "name": "Daniel Peralta Cámara",
    "subjectCode": "MP",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-D3",
    "name": "Daniel Peralta Cámara",
    "subjectCode": "MP",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-F1",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "MP",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MP-F2",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "MP",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-F",
    "name": "Richard Rafael Carrillo Sánchez",
    "subjectCode": "TOC",
    "groupLetter": "F",
    "modalidad": "Teoría"
  },
  {
    "key": "TOC-A",
    "name": "Jesús Alberto Garrido Alcázar",
    "subjectCode": "TOC",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "TOC-E",
    "name": "Jesús González Peñalver",
    "subjectCode": "TOC",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "TOC-B",
    "name": "Eva Martínez Ortigosa",
    "subjectCode": "TOC",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "TOC-C",
    "name": "Beatriz Prieto Campos",
    "subjectCode": "TOC",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "TOC-D",
    "name": "Manuel Rodríguez Álvarez",
    "subjectCode": "TOC",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "TOC-F1",
    "name": "Richard Rafael Carrillo Sánchez",
    "subjectCode": "TOC",
    "groupLetter": "F1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-F2",
    "name": "Richard Rafael Carrillo Sánchez",
    "subjectCode": "TOC",
    "groupLetter": "F2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-A1",
    "name": "Jesús Alberto Garrido Alcázar",
    "subjectCode": "TOC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-A2",
    "name": "Jesús Alberto Garrido Alcázar",
    "subjectCode": "TOC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-A3",
    "name": "Jesús Alberto Garrido Alcázar",
    "subjectCode": "TOC",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-E1",
    "name": "Jesús González Peñalver",
    "subjectCode": "TOC",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-E2",
    "name": "Jesús González Peñalver",
    "subjectCode": "TOC",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-E3",
    "name": "Jesús González Peñalver",
    "subjectCode": "TOC",
    "groupLetter": "E3",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-D3",
    "name": "Eva Martínez Ortigosa",
    "subjectCode": "TOC",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-B1",
    "name": "Eva Martínez Ortigosa",
    "subjectCode": "TOC",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-B2",
    "name": "Eva Martínez Ortigosa",
    "subjectCode": "TOC",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-B3",
    "name": "Eva Martínez Ortigosa",
    "subjectCode": "TOC",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-D1",
    "name": "Eva Martínez Ortigosa",
    "subjectCode": "TOC",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-C1",
    "name": "Beatriz Prieto Campos",
    "subjectCode": "TOC",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-C2",
    "name": "Beatriz Prieto Campos",
    "subjectCode": "TOC",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TOC-D2",
    "name": "Manuel Rodríguez Álvarez",
    "subjectCode": "TOC",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-B",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "EC-E",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "EC-A",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "EC-C",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "EC-D",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "EC-E1",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-E2",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-B1",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-B2",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-B3",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-D1",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-D2",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-D3",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-C2",
    "name": "Francisco J. Fernández Baldomero",
    "subjectCode": "EC",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-A2",
    "name": "Álvaro González Redondo",
    "subjectCode": "EC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-A3",
    "name": "Álvaro González Redondo",
    "subjectCode": "EC",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-C3",
    "name": "Álvaro González Redondo",
    "subjectCode": "EC",
    "groupLetter": "C3",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-A1",
    "name": "Niceto Rafael Luque Sola",
    "subjectCode": "EC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "EC-C1",
    "name": "Niceto Rafael Luque Sola",
    "subjectCode": "EC",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-B",
    "name": "Joaquín Fernández Valdivia",
    "subjectCode": "ED",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "ED-C",
    "name": "Miguel García Silvente",
    "subjectCode": "ED",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "ED-A",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "ED",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "ED-D",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "ED-E",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "ED-D3",
    "name": "Salvador López Joya",
    "subjectCode": "ED",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-A3",
    "name": "Salvador López Joya",
    "subjectCode": "ED",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-C1",
    "name": "Salvador López Joya",
    "subjectCode": "ED",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-C3",
    "name": "Salvador López Joya",
    "subjectCode": "ED",
    "groupLetter": "C3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-E2",
    "name": "Antonio Manjavacas Lucas",
    "subjectCode": "ED",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-C2",
    "name": "Antonio Manjavacas Lucas",
    "subjectCode": "ED",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-A1",
    "name": "Andrea Morales Garzón",
    "subjectCode": "ED",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-A2",
    "name": "Andrea Morales Garzón",
    "subjectCode": "ED",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-B3",
    "name": "Andrea Morales Garzón",
    "subjectCode": "ED",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-D1",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-D2",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-E1",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-B1",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "ED",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ED-B2",
    "name": "María Cristina Zuheros Montes",
    "subjectCode": "ED",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-D",
    "name": "Zoraida Callejas Carrión",
    "subjectCode": "PDOO",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "PDOO-B",
    "name": "Carmen Josefa Martínez Cruz",
    "subjectCode": "PDOO",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "PDOO-E",
    "name": "Nuria Medina Medina",
    "subjectCode": "PDOO",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "PDOO-A",
    "name": "Andrés Silva Pérez",
    "subjectCode": "PDOO",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "PDOO-C",
    "name": "Andrés Silva Pérez",
    "subjectCode": "PDOO",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "PDOO-A1",
    "name": "Sergio Alonso Burgos",
    "subjectCode": "PDOO",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-C1",
    "name": "Sergio Alonso Burgos",
    "subjectCode": "PDOO",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-C3",
    "name": "Sergio Alonso Burgos",
    "subjectCode": "PDOO",
    "groupLetter": "C3",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-D1",
    "name": "María del Campo Bermúdez Edo",
    "subjectCode": "PDOO",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-D2",
    "name": "María del Campo Bermúdez Edo",
    "subjectCode": "PDOO",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-B2",
    "name": "María del Campo Bermúdez Edo",
    "subjectCode": "PDOO",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-B1",
    "name": "Carmen Josefa Martínez Cruz",
    "subjectCode": "PDOO",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-E2",
    "name": "Bartolomé Ortiz Viso",
    "subjectCode": "PDOO",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-D3",
    "name": "Janet Pigueiras Del Real",
    "subjectCode": "PDOO",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-E1",
    "name": "Juan Ruiz De Miras",
    "subjectCode": "PDOO",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-A2",
    "name": "Juan Ruiz De Miras",
    "subjectCode": "PDOO",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-A3",
    "name": "Juan Ruiz De Miras",
    "subjectCode": "PDOO",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-B3",
    "name": "Juan Ruiz De Miras",
    "subjectCode": "PDOO",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "PDOO-C2",
    "name": "Andrés Silva Pérez",
    "subjectCode": "PDOO",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-C",
    "name": "Francisco Javier Abad Ortega",
    "subjectCode": "ALG",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "ALG-E",
    "name": "Francisco Javier Abad Ortega",
    "subjectCode": "ALG",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "ALG-B",
    "name": "Miguel García Silvente",
    "subjectCode": "ALG",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "ALG-A",
    "name": "Juan Francisco Huete Guadix",
    "subjectCode": "ALG",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "ALG-D",
    "name": "Miguel López Pérez",
    "subjectCode": "ALG",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "ALG-A3",
    "name": "María Isabel Abellán Benítez",
    "subjectCode": "ALG",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-B2",
    "name": "María Isabel Abellán Benítez",
    "subjectCode": "ALG",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-C1",
    "name": "Antonio Bautista Bailón Morillas",
    "subjectCode": "ALG",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-D2",
    "name": "Salvador López Joya",
    "subjectCode": "ALG",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-D3",
    "name": "Salvador López Joya",
    "subjectCode": "ALG",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-E1",
    "name": "Salvador López Joya",
    "subjectCode": "ALG",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-C2",
    "name": "Salvador López Joya",
    "subjectCode": "ALG",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-A1",
    "name": "Miguel López Pérez",
    "subjectCode": "ALG",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-B1",
    "name": "Miguel López Pérez",
    "subjectCode": "ALG",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-B3",
    "name": "Miguel López Pérez",
    "subjectCode": "ALG",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "ALG-E2",
    "name": "Antonio Manjavacas Lucas",
    "subjectCode": "ALG",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-B",
    "name": "Mancia Anguita López",
    "subjectCode": "AC",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "AC-C",
    "name": "María Isabel García Arenas",
    "subjectCode": "AC",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "AC-D",
    "name": "María Isabel García Arenas",
    "subjectCode": "AC",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "AC-E",
    "name": "María Isabel García Arenas",
    "subjectCode": "AC",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "AC-A",
    "name": "Christian Agustín Morillas Gutiérrez",
    "subjectCode": "AC",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "AC-A1",
    "name": "Mancia Anguita López",
    "subjectCode": "AC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-A2",
    "name": "Álvaro González Redondo",
    "subjectCode": "AC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-A3",
    "name": "Álvaro González Redondo",
    "subjectCode": "AC",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-B1",
    "name": "Álvaro González Redondo",
    "subjectCode": "AC",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-B2",
    "name": "Álvaro González Redondo",
    "subjectCode": "AC",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-B3",
    "name": "Álvaro González Redondo",
    "subjectCode": "AC",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-D1",
    "name": "Míriam Mengíbar Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-C2",
    "name": "Míriam Mengíbar Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-C3",
    "name": "Míriam Mengíbar Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "C3",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-D2",
    "name": "Aurora Polo Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-D3",
    "name": "Aurora Polo Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-E1",
    "name": "Javier Ubago Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-E2",
    "name": "Javier Ubago Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AC-C1",
    "name": "Víctor Vázquez Rodríguez",
    "subjectCode": "AC",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-E",
    "name": "Christoph Norbert Bergmeir",
    "subjectCode": "FBD",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "FBD-B",
    "name": "Ignacio José Blanco Medina",
    "subjectCode": "FBD",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "FBD-A",
    "name": "Antonio Gabriel López Herrera",
    "subjectCode": "FBD",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "FBD-C",
    "name": "Antonio Gabriel López Herrera",
    "subjectCode": "FBD",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "FBD-D",
    "name": "Antonio Gabriel López Herrera",
    "subjectCode": "FBD",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "FBD-D3",
    "name": "Christoph Norbert Bergmeir",
    "subjectCode": "FBD",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-E1",
    "name": "Christoph Norbert Bergmeir",
    "subjectCode": "FBD",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-D2",
    "name": "Natalia Ana Díaz Rodríguez",
    "subjectCode": "FBD",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-E2",
    "name": "Natalia Ana Díaz Rodríguez",
    "subjectCode": "FBD",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-D1",
    "name": "Natalia Ana Díaz Rodríguez",
    "subjectCode": "FBD",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-B1",
    "name": "Juan Miguel Medina Rodríguez",
    "subjectCode": "FBD",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-B2",
    "name": "Juan Miguel Medina Rodríguez",
    "subjectCode": "FBD",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-B3",
    "name": "Juan Miguel Medina Rodríguez",
    "subjectCode": "FBD",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-A1",
    "name": "Olga Pons Capote",
    "subjectCode": "FBD",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-A2",
    "name": "Olga Pons Capote",
    "subjectCode": "FBD",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-A3",
    "name": "Olga Pons Capote",
    "subjectCode": "FBD",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-C1",
    "name": "Carlos Gustavo Porcel Gallego",
    "subjectCode": "FBD",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FBD-C2",
    "name": "Carlos Gustavo Porcel Gallego",
    "subjectCode": "FBD",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-A",
    "name": "María del Mar Abad Grau",
    "subjectCode": "FIS",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "FIS-E",
    "name": "Pedro Manuel Martínez Jiménez",
    "subjectCode": "FIS",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "FIS-B",
    "name": "Nuria Medina Medina",
    "subjectCode": "FIS",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "FIS-D",
    "name": "Francisco Velasco Anguita",
    "subjectCode": "FIS",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "FIS-E2",
    "name": "María del Mar Abad Grau",
    "subjectCode": "FIS",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-A3",
    "name": "Daniel Bolaños Martínez",
    "subjectCode": "FIS",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-C1",
    "name": "Daniel Bolaños Martínez",
    "subjectCode": "FIS",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-C2",
    "name": "Daniel Bolaños Martínez",
    "subjectCode": "FIS",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-A2",
    "name": "Diego Jesús García Gil",
    "subjectCode": "FIS",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-B2",
    "name": "Diego Jesús García Gil",
    "subjectCode": "FIS",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-A1",
    "name": "Pedro Manuel Martínez Jiménez",
    "subjectCode": "FIS",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-E1",
    "name": "Pedro Manuel Martínez Jiménez",
    "subjectCode": "FIS",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-B1",
    "name": "Nuria Medina Medina",
    "subjectCode": "FIS",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-D2",
    "name": "José Ángel Segura Muros",
    "subjectCode": "FIS",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FIS-D1",
    "name": "Francisco Velasco Anguita",
    "subjectCode": "FIS",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-C",
    "name": "Juan Manuel López Soler",
    "subjectCode": "FR",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "FR-B",
    "name": "Antonio Miguel Mora García",
    "subjectCode": "FR",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "FR-A",
    "name": "Jorge Navarro Ortiz",
    "subjectCode": "FR",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "FR-D",
    "name": "Jonathan Prados Garzón",
    "subjectCode": "FR",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "FR-E",
    "name": "Jonathan Prados Garzón",
    "subjectCode": "FR",
    "groupLetter": "E",
    "modalidad": "Teoría"
  },
  {
    "key": "FR-B2",
    "name": "Andrés Biedma Pérez",
    "subjectCode": "FR",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-B3",
    "name": "Andrés Biedma Pérez",
    "subjectCode": "FR",
    "groupLetter": "B3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-D2",
    "name": "Natalia Chinchilla Romero",
    "subjectCode": "FR",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-E1",
    "name": "Irene Gosálvez White",
    "subjectCode": "FR",
    "groupLetter": "E1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-A1",
    "name": "Jonathan Prados Garzón",
    "subjectCode": "FR",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-A2",
    "name": "Jonathan Prados Garzón",
    "subjectCode": "FR",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-A3",
    "name": "Antonio Ruiz Moya",
    "subjectCode": "FR",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-B1",
    "name": "Antonio Ruiz Moya",
    "subjectCode": "FR",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-C1",
    "name": "Cleofás Segura Gómez",
    "subjectCode": "FR",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-C2",
    "name": "Cleofás Segura Gómez",
    "subjectCode": "FR",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-D1",
    "name": "Cleofás Segura Gómez",
    "subjectCode": "FR",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "FR-E2",
    "name": "Daniel Vallejo España",
    "subjectCode": "FR",
    "groupLetter": "E2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-C",
    "name": "José Antonio García Soria",
    "subjectCode": "MC",
    "groupLetter": "C",
    "modalidad": "Teoría"
  },
  {
    "key": "MC-D",
    "name": "José Antonio García Soria",
    "subjectCode": "MC",
    "groupLetter": "D",
    "modalidad": "Teoría"
  },
  {
    "key": "MC-A",
    "name": "Serafín Moral García",
    "subjectCode": "MC",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "MC-B",
    "name": "Serafín Moral García",
    "subjectCode": "MC",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "MC-D3",
    "name": "María Isabel Abellán Benítez",
    "subjectCode": "MC",
    "groupLetter": "D3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-D2",
    "name": "José Antonio García Soria",
    "subjectCode": "MC",
    "groupLetter": "D2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-C1",
    "name": "José Antonio García Soria",
    "subjectCode": "MC",
    "groupLetter": "C1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-D1",
    "name": "José Antonio García Soria",
    "subjectCode": "MC",
    "groupLetter": "D1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-B1",
    "name": "Serafín Moral García",
    "subjectCode": "MC",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-B2",
    "name": "Serafín Moral García",
    "subjectCode": "MC",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-A1",
    "name": "Nuria Rodríguez Barroso",
    "subjectCode": "MC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-A2",
    "name": "Nuria Rodríguez Barroso",
    "subjectCode": "MC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-A3",
    "name": "Nicolás Segura Kunsagi",
    "subjectCode": "MC",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "MC-C2",
    "name": "Juan Luis Suárez Díaz",
    "subjectCode": "MC",
    "groupLetter": "C2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AA-B",
    "name": "Salvador García López",
    "subjectCode": "AA",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "AA-A",
    "name": "Francisco Herrera Triguero",
    "subjectCode": "AA",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "AA-A1",
    "name": "Salvador López Joya",
    "subjectCode": "AA",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "AA-B2",
    "name": "Salvador López Joya",
    "subjectCode": "AA",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AA-A2",
    "name": "Manuel Pegalajar Cuéllar",
    "subjectCode": "AA",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "AA-A3",
    "name": "Manuel Pegalajar Cuéllar",
    "subjectCode": "AA",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "IC-B1",
    "name": "Juan Luis Castro Peña",
    "subjectCode": "IC",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IC-A1",
    "name": "Andrea Morales Garzón",
    "subjectCode": "IC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "IC-A2",
    "name": "Andrea Morales Garzón",
    "subjectCode": "IC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "IC-A3",
    "name": "Andrea Morales Garzón",
    "subjectCode": "IC",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "IC-B2",
    "name": "Andrea Morales Garzón",
    "subjectCode": "IC",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "MH-B",
    "name": "Óscar Cordón García",
    "subjectCode": "MH",
    "groupLetter": "B",
    "modalidad": "Teoría"
  },
  {
    "key": "MH-A",
    "name": "Francisco Herrera Triguero",
    "subjectCode": "MH",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "TSI-A2",
    "name": "David Criado Ramón",
    "subjectCode": "TSI",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TSI-B1",
    "name": "David Criado Ramón",
    "subjectCode": "TSI",
    "groupLetter": "B1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TSI-B2",
    "name": "David Criado Ramón",
    "subjectCode": "TSI",
    "groupLetter": "B2",
    "modalidad": "Prácticas"
  },
  {
    "key": "TSI-A1",
    "name": "Pablo Mesejo Santiago",
    "subjectCode": "TSI",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TSI-A3",
    "name": "Pablo Mesejo Santiago",
    "subjectCode": "TSI",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "SWAP-A",
    "name": "Míriam Mengíbar Rodríguez",
    "subjectCode": "SWAP",
    "groupLetter": "A",
    "modalidad": "Teoría"
  },
  {
    "key": "SWAP-A2",
    "name": "Míriam Mengíbar Rodríguez",
    "subjectCode": "SWAP",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SWAP-A1",
    "name": "José Manuel Soto Hidalgo",
    "subjectCode": "SWAP",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TDRC-A1",
    "name": "Andrés Biedma Pérez",
    "subjectCode": "TDRC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "TDRC-A2",
    "name": "Cleofás Segura Gómez",
    "subjectCode": "TDRC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ABD-A2",
    "name": "Ignacio José Blanco Medina",
    "subjectCode": "ABD",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "ABD-A1",
    "name": "David Criado Ramón",
    "subjectCode": "ABD",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISI-A1",
    "name": "Fernando Berzal Galiano",
    "subjectCode": "ISI",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "ISI-A2",
    "name": "Miguel López Pérez",
    "subjectCode": "ISI",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "SMD-A1",
    "name": "Antonio Javier Fernández Ares",
    "subjectCode": "SMD",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "SMD-A2",
    "name": "José Samos Jiménez",
    "subjectCode": "SMD",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "VC-A2",
    "name": "Pablo Mesejo Santiago",
    "subjectCode": "VC",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "VC-A3",
    "name": "Pablo Mesejo Santiago",
    "subjectCode": "VC",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "VC-A1",
    "name": "Siham Tabik Ouled Hrour",
    "subjectCode": "VC",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PL-A2",
    "name": "Ramón López-Cózar Delgado",
    "subjectCode": "PL",
    "groupLetter": "A2",
    "modalidad": "Prácticas"
  },
  {
    "key": "PL-A1",
    "name": "Jorge Revelles Moreno",
    "subjectCode": "PL",
    "groupLetter": "A1",
    "modalidad": "Prácticas"
  },
  {
    "key": "PL-A3",
    "name": "Jorge Revelles Moreno",
    "subjectCode": "PL",
    "groupLetter": "A3",
    "modalidad": "Prácticas"
  },
  {
    "key": "II-A",
    "name": "Miguel Damas Hermoso",
    "subjectCode": "II",
    "groupLetter": "A",
    "modalidad": "Teoría"
  }
];

const PROFESORES = [
  {
    "key": "SO|Teoría|Miguel Lastra Leidinger",
    "name": "Miguel Lastra Leidinger",
    "subjectCode": "SO",
    "modalidad": "Teoría",
    "asignatura": "SO",
    "dificultad": "gris",
    "razon": "Correcto pero menos evidencia pública",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Prácticas|Miguel Lastra Leidinger",
    "name": "Miguel Lastra Leidinger",
    "subjectCode": "SO",
    "modalidad": "Prácticas",
    "asignatura": "SO",
    "dificultad": "gris",
    "razon": "Correcto pero menos evidencia pública",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Teoría|Pablo Antonio Pico Valencia",
    "name": "Pablo Antonio Pico Valencia",
    "subjectCode": "SO",
    "modalidad": "Teoría",
    "asignatura": "SO",
    "dificultad": "gris",
    "razon": "Menos evidencia de docencia en SO",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Prácticas|Pablo Antonio Pico Valencia",
    "name": "Pablo Antonio Pico Valencia",
    "subjectCode": "SO",
    "modalidad": "Prácticas",
    "asignatura": "SO",
    "dificultad": "gris",
    "razon": "Menos evidencia de docencia en SO",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Teoría|Patricia Paderewski Rodríguez",
    "name": "Patricia Paderewski Rodríguez",
    "subjectCode": "SO",
    "modalidad": "Teoría",
    "asignatura": "SO",
    "dificultad": "naranja",
    "razon": "Larga trayectoria en SO, experiencia con Linux",
    "opinions": [
      "Explica medianamente bien, si asistes a las clases te llevas cosillas entendidas a casa, que se agradece mucho en esta asignatura, pero no esperes enterarte de todo. Va rapídito pero es soportable. Es simpática y atiende bien las dudas en tutoría. Los exámenes son asefables pero corrige de forma dura."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Prácticas|Patricia Paderewski Rodríguez",
    "name": "Patricia Paderewski Rodríguez",
    "subjectCode": "SO",
    "modalidad": "Prácticas",
    "asignatura": "SO",
    "dificultad": "naranja",
    "razon": "Larga trayectoria en SO, experiencia con Linux",
    "opinions": [
      "Explica medianamente bien, si asistes a las clases te llevas cosillas entendidas a casa, que se agradece mucho en esta asignatura, pero no esperes enterarte de todo. Va rapídito pero es soportable. Es simpática y atiende bien las dudas en tutoría. Los exámenes son asefables pero corrige de forma dura."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Teoría|Alejandro José León Salas",
    "name": "Alejandro José León Salas",
    "subjectCode": "SO",
    "modalidad": "Teoría",
    "asignatura": "SO",
    "dificultad": "naranja",
    "razon": "Experiencia directa, vinculación con Linux",
    "opinions": [
      "Le echa ganas a la asignatura pero explica demasiado rápido y la asignatura es infumable. Sus exámenes son a papel y muy largos. Es normal corrigiendo y no tarda mucho. Puede bajar la nota mínima para aprobarste (4 con algo en vez de 5)"
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Prácticas|Alejandro José León Salas",
    "name": "Alejandro José León Salas",
    "subjectCode": "SO",
    "modalidad": "Prácticas",
    "asignatura": "SO",
    "dificultad": "naranja",
    "razon": "Experiencia directa, vinculación con Linux",
    "opinions": [
      "Le echa ganas a la asignatura pero explica demasiado rápido y la asignatura es infumable. Sus exámenes son a papel y muy largos. Es normal corrigiendo y no tarda mucho. Puede bajar la nota mínima para aprobarste (4 con algo en vez de 5)"
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Teoría|José Luis Garrido Bullejos",
    "name": "José Luis Garrido Bullejos",
    "subjectCode": "SO",
    "modalidad": "Teoría",
    "asignatura": "SO",
    "dificultad": "naranja",
    "razon": "Catedrático. Máxima categoría. Experiencia consolidada",
    "opinions": [
      "Este hombre es una enciclopedia andante, saber sabe como ninguno por lo que también espera que tu sepas lo mismo que Google, es muy apagado a la bibliografía de la asignatura, sí o si te va a hacer falta rellenar información de ellos ya que las diapositivas son meh, lo que de verdad importa es atender a lo que te dice, porque habla entre líneas y te da el examen hecho, lo que pasa que cualquiera se acuerda tan específicamente de lo que dijo. Importantísimo también que te vea con interés e incluso participando en clase, le gusta mucho que tomes parte en ellas sobre todo si hacéis preguntas interesantes, que vea que entendéis el tema. De igual manera es recomendable ir a tutoría a preguntarle cualquier cosa. Os pide que le hagáis la relación de ejercicios y que la corrijáis juntos porque si no él no hace ejercicios en clase. No es muy frecuente pero a lo mejor le da por hacer un ejercicio que cuenta un 10% de la nota de algo que haya puesto énfasis o que vea interesante de cara al examen o que investiguemos por nuestra cuenta. Los exámenes son otro rollo, preguntas complejas e incluso rebuscadas de verdadero o falso justificando y luego algún ejercicio práctico que normalmente también estará dado con una vuelta de rosca. Tarda MUCHÍSIMO en corregir osea que se sufre mucho teniendo en cuenta que es SO."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SO|Prácticas|José Luis Garrido Bullejos",
    "name": "José Luis Garrido Bullejos",
    "subjectCode": "SO",
    "modalidad": "Prácticas",
    "asignatura": "SO",
    "dificultad": "naranja",
    "razon": "Catedrático. Máxima categoría. Experiencia consolidada",
    "opinions": [
      "Este hombre es una enciclopedia andante, saber sabe como ninguno por lo que también espera que tu sepas lo mismo que Google, es muy apagado a la bibliografía de la asignatura, sí o si te va a hacer falta rellenar información de ellos ya que las diapositivas son meh, lo que de verdad importa es atender a lo que te dice, porque habla entre líneas y te da el examen hecho, lo que pasa que cualquiera se acuerda tan específicamente de lo que dijo. Importantísimo también que te vea con interés e incluso participando en clase, le gusta mucho que tomes parte en ellas sobre todo si hacéis preguntas interesantes, que vea que entendéis el tema. De igual manera es recomendable ir a tutoría a preguntarle cualquier cosa. Os pide que le hagáis la relación de ejercicios y que la corrijáis juntos porque si no él no hace ejercicios en clase. No es muy frecuente pero a lo mejor le da por hacer un ejercicio que cuenta un 10% de la nota de algo que haya puesto énfasis o que vea interesante de cara al examen o que investiguemos por nuestra cuenta. Los exámenes son otro rollo, preguntas complejas e incluso rebuscadas de verdadero o falso justificando y luego algún ejercicio práctico que normalmente también estará dado con una vuelta de rosca. Tarda MUCHÍSIMO en corregir osea que se sufre mucho teniendo en cuenta que es SO."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Teoría|Germán Arroyo Moreno",
    "name": "Germán Arroyo Moreno",
    "subjectCode": "IG",
    "modalidad": "Teoría",
    "asignatura": "IG",
    "dificultad": "amarillo",
    "razon": "+20 años en gráficos, OpenGL/GLSL. Enfoque práctico",
    "opinions": [
      "Suele explicar las prácticas a su manera y las defensas consiste en hacer modificaciones en los códigos de tus prácticas para ver si lo has hecho tú (a veces las defensas son muy enredadas). Profesor que deja un poco que desees en las explicaciones pero si que trabajas y te esfuerzas puedes sacar muy buena nota con él."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Prácticas|Germán Arroyo Moreno",
    "name": "Germán Arroyo Moreno",
    "subjectCode": "IG",
    "modalidad": "Prácticas",
    "asignatura": "IG",
    "dificultad": "amarillo",
    "razon": "+20 años en gráficos, OpenGL/GLSL. Enfoque práctico",
    "opinions": [
      "Suele explicar las prácticas a su manera y las defensas consiste en hacer modificaciones en los códigos de tus prácticas para ver si lo has hecho tú (a veces las defensas son muy enredadas). Profesor que deja un poco que desees en las explicaciones pero si que trabajas y te esfuerzas puedes sacar muy buena nota con él."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Teoría|Juan Carlos Torres Cantero",
    "name": "Juan Carlos Torres Cantero",
    "subjectCode": "IG",
    "modalidad": "Teoría",
    "asignatura": "IG",
    "dificultad": "naranja",
    "razon": "Catedrático, máximo dominio pero enfoque teórico",
    "opinions": [
      "Aunque de primeras parezca que no, es un buen profesor y se preocupa por que entiendas las cosas. Además, súper recommendable ir a revisión para el examen final de teoría. Si tienes más de un 3, puedes llevarte una sorpresa. Sus explicaciones en clase dejan mucho que desear. Es mejor ir a tutorías en donde lo explica todo mejor. Es estricto corrigiendo pero aconsejable ir a revisión ya que es posible subir nota pero tienes que rebatirle mucho dado que hay cosas que pones bien en el examen pero él te dice que está mal y luego no sabe muy bien como argumentarlo. El examen no se parece al modelo que proporciona además de que corrige totalmente aleatorio. En las revisiones dice que él tiene su método y no te explica nada, además de equivocarse intentando defender cómo ha corregido, te dice que solicites tribu nal y resulta que él es el director del departamento."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Prácticas|Juan Carlos Torres Cantero",
    "name": "Juan Carlos Torres Cantero",
    "subjectCode": "IG",
    "modalidad": "Prácticas",
    "asignatura": "IG",
    "dificultad": "naranja",
    "razon": "Catedrático, máximo dominio pero enfoque teórico",
    "opinions": [
      "Aunque de primeras parezca que no, es un buen profesor y se preocupa por que entiendas las cosas. Además, súper recommendable ir a revisión para el examen final de teoría. Si tienes más de un 3, puedes llevarte una sorpresa. Sus explicaciones en clase dejan mucho que desear. Es mejor ir a tutorías en donde lo explica todo mejor. Es estricto corrigiendo pero aconsejable ir a revisión ya que es posible subir nota pero tienes que rebatirle mucho dado que hay cosas que pones bien en el examen pero él te dice que está mal y luego no sabe muy bien como argumentarlo. El examen no se parece al modelo que proporciona además de que corrige totalmente aleatorio. En las revisiones dice que él tiene su método y no te explica nada, además de equivocarse intentando defender cómo ha corregido, te dice que solicites tribu nal y resulta que él es el director del departamento."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Teoría|Antonio López Fernández",
    "name": "Antonio López Fernández",
    "subjectCode": "IG",
    "modalidad": "Teoría",
    "asignatura": "IG",
    "dificultad": "cyan",
    "razon": "Continuidad teoría-prácticas, accesible",
    "opinions": [
      "Es muy buena gente y todo lo que te preguntas se va a implica en ayudarte pero las clases son muy aburridas y probablemente no te enteres de nada ni de las diapositivas ni de sus explicaciones de teoría pero no importa demasiado ya que el examen no es nada difícil y de hecho prácticamente dice como hacer los ejercicios durante el examen. La parte más importante de esta asignatura y donde realmente vas a dedicar el tiempo (al menos con este profesor) es en las prácticas. Como consejo diría que es conveniente tener más o menos buena relación con él (haciendo bien las prácticas, yendo a clase...) y sobre todo atender mucho y copiad con todo detalle cuando hace los ejercicios en clase porque no vais a tener más ejercicios ni explicaciones que las de clase y los ejercicios del examen son prácticamente iguales así que si no los copiáis (y muy prefiblemente entendéis) luego cuando vayáis a estudiar no vais a tener nada más allá de lo que os pasen."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Prácticas|Antonio López Fernández",
    "name": "Antonio López Fernández",
    "subjectCode": "IG",
    "modalidad": "Prácticas",
    "asignatura": "IG",
    "dificultad": "cyan",
    "razon": "Continuidad teoría-prácticas, accesible",
    "opinions": [
      "Es muy buena gente y todo lo que te preguntas se va a implica en ayudarte pero las clases son muy aburridas y probablemente no te enteres de nada ni de las diapositivas ni de sus explicaciones de teoría pero no importa demasiado ya que el examen no es nada difícil y de hecho prácticamente dice como hacer los ejercicios durante el examen. La parte más importante de esta asignatura y donde realmente vas a dedicar el tiempo (al menos con este profesor) es en las prácticas. Como consejo diría que es conveniente tener más o menos buena relación con él (haciendo bien las prácticas, yendo a clase...) y sobre todo atender mucho y copiad con todo detalle cuando hace los ejercicios en clase porque no vais a tener más ejercicios ni explicaciones que las de clase y los ejercicios del examen son prácticamente iguales así que si no los copiáis (y muy prefiblemente entendéis) luego cuando vayáis a estudiar no vais a tener nada más allá de lo que os pasen."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Teoría|Domingo Martín Perandrés",
    "name": "Domingo Martín Perandrés",
    "subjectCode": "IG",
    "modalidad": "Teoría",
    "asignatura": "IG",
    "dificultad": "naranja",
    "razon": "Buen perfil técnico pero menos evidencia pública",
    "opinions": [
      "Explica el temario de prácticas de forma detallada a nivel teórico. Saca a los alumnos a la pizarra a hacer ejercicios que propone y suele hacer preguntas en clase. Es MUY estricto corrigiendo el examen de la ordinaria. Realmente no es tan tan malo, pero es una persona metódica y le gustan las cosas bien hechas. Valora muchísimo que asistas, que le pongas interés, que preguntes, que hagas los ejercicios, que corrijas las cosas que te diga, etc... Si bien es algo estricto a la hora de corregir y de hacer ejercicios, explica bastante bien la asignatura y habiendo asistido a todas las clases puedo afirmar que todo lo que pide en el examen lo da en clase. Además de que el trato al alumnado fue bastante bueno, se le pueden preguntar dudas sin problema y más allá de que pueda asustar un poco el inicio de curso con la tarea que pone de \"para quién quiera aprobar\" a mí me parece un buen profesor. Nos permitió hacer dos clases de dudas cerca del examen lo cual se agradece bastante porque explica como quiere que hagamos los ejercicios y algunos consejos para ejercicios algo difíciles de suelen. Suela aprobar el 50% de los matriculados."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "IG|Prácticas|Domingo Martín Perandrés",
    "name": "Domingo Martín Perandrés",
    "subjectCode": "IG",
    "modalidad": "Prácticas",
    "asignatura": "IG",
    "dificultad": "naranja",
    "razon": "Buen perfil técnico pero menos evidencia pública",
    "opinions": [
      "Explica el temario de prácticas de forma detallada a nivel teórico. Saca a los alumnos a la pizarra a hacer ejercicios que propone y suele hacer preguntas en clase. Es MUY estricto corrigiendo el examen de la ordinaria. Realmente no es tan tan malo, pero es una persona metódica y le gustan las cosas bien hechas. Valora muchísimo que asistas, que le pongas interés, que preguntes, que hagas los ejercicios, que corrijas las cosas que te diga, etc... Si bien es algo estricto a la hora de corregir y de hacer ejercicios, explica bastante bien la asignatura y habiendo asistido a todas las clases puedo afirmar que todo lo que pide en el examen lo da en clase. Además de que el trato al alumnado fue bastante bueno, se le pueden preguntar dudas sin problema y más allá de que pueda asustar un poco el inicio de curso con la tarea que pone de \"para quién quiera aprobar\" a mí me parece un buen profesor. Nos permitió hacer dos clases de dudas cerca del examen lo cual se agradece bastante porque explica como quiere que hagamos los ejercicios y algunos consejos para ejercicios algo difíciles de suelen. Suela aprobar el 50% de los matriculados."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ISE|Teoría|Héctor Emilio Pomares Cintas",
    "name": "Héctor Emilio Pomares Cintas",
    "subjectCode": "ISE",
    "modalidad": "Teoría",
    "asignatura": "ISE",
    "dificultad": "naranja",
    "razon": "Catedrático, altísimo nivel pero alta exigencia",
    "opinions": [
      "Explica bastante bien y resuelve bastante bien las dudas (no es como otros que las preguntas algo y te hablan de 40 cosas menos lo que le has preguntado), a simple vista parece soso/monótono pero en realidad es gracioso y las clases se hacen relativamente amenas. Recomiendo ir a clase ya que la asignatura, si bien no es muy compleja, tiene bastante contenido tanto de ejercicios como de teoría y ir a clase te da bastante ventaja en la ordinaria ya que te puedes dedicar a hacer los ejercicios/exámenes resueltos en lugar de estar leyendo diapositivas lo cuál es importante ya que en el examen corrigen un poco en binario y tienes que controlar bien el tiempo, así que interesa saber hacer los ejercicios bien aunque no sean muy difíciles."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ISE|Prácticas|Héctor Emilio Pomares Cintas",
    "name": "Héctor Emilio Pomares Cintas",
    "subjectCode": "ISE",
    "modalidad": "Prácticas",
    "asignatura": "ISE",
    "dificultad": "naranja",
    "razon": "Catedrático, altísimo nivel pero alta exigencia",
    "opinions": [
      "Explica bastante bien y resuelve bastante bien las dudas (no es como otros que las preguntas algo y te hablan de 40 cosas menos lo que le has preguntado), a simple vista parece soso/monótono pero en realidad es gracioso y las clases se hacen relativamente amenas. Recomiendo ir a clase ya que la asignatura, si bien no es muy compleja, tiene bastante contenido tanto de ejercicios como de teoría y ir a clase te da bastante ventaja en la ordinaria ya que te puedes dedicar a hacer los ejercicios/exámenes resueltos en lugar de estar leyendo diapositivas lo cuál es importante ya que en el examen corrigen un poco en binario y tienes que controlar bien el tiempo, así que interesa saber hacer los ejercicios bien aunque no sean muy difíciles."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ISE|Teoría|Pablo García Sánchez",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "modalidad": "Teoría",
    "asignatura": "ISE",
    "dificultad": "verde",
    "razon": "Práctico, cercano al sector, Software Libre",
    "opinions": [
      "Es bastante bueno y sabe del tema. Pone empeño y resuelve dudas aunque no da tiempo a copiar las explicaciones en clase. Se lleva genial con los alumnos y como es joven es más comprensible con las cosas, explica bien, fomenta que participes y es muy enrollao. Le gusta mucho charlar de otra cosa que no sea dar clase. Los exámenes, dentro de lo que cabean, son asequibles y corrige bien, además es muy propenso a ayudarte en cuanto a dudas"
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ISE|Prácticas|Pablo García Sánchez",
    "name": "Pablo García Sánchez",
    "subjectCode": "ISE",
    "modalidad": "Prácticas",
    "asignatura": "ISE",
    "dificultad": "verde",
    "razon": "Práctico, cercano al sector, Software Libre",
    "opinions": [
      "Es bastante bueno y sabe del tema. Pone empeño y resuelve dudas aunque no da tiempo a copiar las explicaciones en clase. Se lleva genial con los alumnos y como es joven es más comprensible con las cosas, explica bien, fomenta que participes y es muy enrollao. Le gusta mucho charlar de otra cosa que no sea dar clase. Los exámenes, dentro de lo que cabean, son asequibles y corrige bien, además es muy propenso a ayudarte en cuanto a dudas"
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Teoría|Carlos Jesús Fernández Basso",
    "name": "Carlos Jesús Fernández Basso",
    "subjectCode": "DDSI",
    "modalidad": "Teoría",
    "asignatura": "DDSI",
    "dificultad": "gris",
    "razon": "Enfoque práctico, menos evidencia pública",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Prácticas|Carlos Jesús Fernández Basso",
    "name": "Carlos Jesús Fernández Basso",
    "subjectCode": "DDSI",
    "modalidad": "Prácticas",
    "asignatura": "DDSI",
    "dificultad": "gris",
    "razon": "Enfoque práctico, menos evidencia pública",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Teoría|Ignacio José Blanco Medina",
    "name": "Ignacio José Blanco Medina",
    "subjectCode": "DDSI",
    "modalidad": "Teoría",
    "asignatura": "DDSI",
    "dificultad": "verde",
    "razon": "Trayectoria consolidada en bases de datos y SI",
    "opinions": [
      "Extrovertido y buena gente, se hace el duro a veces pero no lo es. Te suele aprobar con buena nota y te busca horario de tutoría aunque no aparezca esa hora como disponible en Prado. Explica bien, aunque a veces es difícil de seguir y es fácil aprobar"
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Prácticas|Ignacio José Blanco Medina",
    "name": "Ignacio José Blanco Medina",
    "subjectCode": "DDSI",
    "modalidad": "Prácticas",
    "asignatura": "DDSI",
    "dificultad": "verde",
    "razon": "Trayectoria consolidada en bases de datos y SI",
    "opinions": [
      "Extrovertido y buena gente, se hace el duro a veces pero no lo es. Te suele aprobar con buena nota y te busca horario de tutoría aunque no aparezca esa hora como disponible en Prado. Explica bien, aunque a veces es difícil de seguir y es fácil aprobar"
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Teoría|Carlos Alberto Cruz Corona",
    "name": "Carlos Alberto Cruz Corona",
    "subjectCode": "DDSI",
    "modalidad": "Teoría",
    "asignatura": "DDSI",
    "dificultad": "cyan",
    "razon": "Titular, enfoque multidisciplinar aplicado",
    "opinions": [
      "De los mejores de la asignatura. Es muy despreocupado y la carga es mínima."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Prácticas|Carlos Alberto Cruz Corona",
    "name": "Carlos Alberto Cruz Corona",
    "subjectCode": "DDSI",
    "modalidad": "Prácticas",
    "asignatura": "DDSI",
    "dificultad": "cyan",
    "razon": "Titular, enfoque multidisciplinar aplicado",
    "opinions": [
      "De los mejores de la asignatura. Es muy despreocupado y la carga es mínima."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Teoría|David Criado Ramón",
    "name": "David Criado Ramón",
    "subjectCode": "DDSI",
    "modalidad": "Teoría",
    "asignatura": "DDSI",
    "dificultad": "gris",
    "razon": "Menos información pública verificable",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "DDSI|Prácticas|David Criado Ramón",
    "name": "David Criado Ramón",
    "subjectCode": "DDSI",
    "modalidad": "Prácticas",
    "asignatura": "DDSI",
    "dificultad": "gris",
    "razon": "Menos información pública verificable",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Teoría|José Carlos Rosales González",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "modalidad": "Teoría",
    "asignatura": "ALEM",
    "dificultad": "naranja",
    "razon": "Catedrático, +100 artículos, muy teórico y denso",
    "opinions": [
      "En clase solo lee PDF aunque tiene clases grabadas y sus apuntes son buenos. Estricto a la hora de corregir ya que es todo bien o todo mal. Conviene ir a tutorías pero no a las revisiones del examen final (no se lo toma bien). Llevando la asignatura al día se aprueba."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Prácticas|José Carlos Rosales González",
    "name": "José Carlos Rosales González",
    "subjectCode": "ALEM",
    "modalidad": "Prácticas",
    "asignatura": "ALEM",
    "dificultad": "naranja",
    "razon": "Catedrático, +100 artículos, muy teórico y denso",
    "opinions": [
      "En clase solo lee PDF aunque tiene clases grabadas y sus apuntes son buenos. Estricto a la hora de corregir ya que es todo bien o todo mal. Conviene ir a tutorías pero no a las revisiones del examen final (no se lo toma bien). Llevando la asignatura al día se aprueba."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Teoría|Juan Manuel Urbano Blanco",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "modalidad": "Teoría",
    "asignatura": "ALEM",
    "dificultad": "negro",
    "razon": "Enseñanza estructurada, pausado y metódico",
    "opinions": [
      "La relación con el alumnado es de todo menos buena, su forma de corregir es terrible, en las clases explica demasiado rápido (así todo el curso) y no te enteras de nada, reprocha la poca comprensión de sus clases a los alumnos por \"no estudiar\". No te da ninguna información de cómo va a evaluarte, no te explica nada sobre los exámenes finales y si le preguntas se enfada. Es un tío muy estricto pero si haces las cosas como a él le gusta puedes aprobar."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Prácticas|Juan Manuel Urbano Blanco",
    "name": "Juan Manuel Urbano Blanco",
    "subjectCode": "ALEM",
    "modalidad": "Prácticas",
    "asignatura": "ALEM",
    "dificultad": "negro",
    "razon": "Enseñanza estructurada, pausado y metódico",
    "opinions": [
      "La relación con el alumnado es de todo menos buena, su forma de corregir es terrible, en las clases explica demasiado rápido (así todo el curso) y no te enteras de nada, reprocha la poca comprensión de sus clases a los alumnos por \"no estudiar\". No te da ninguna información de cómo va a evaluarte, no te explica nada sobre los exámenes finales y si le preguntas se enfada. Es un tío muy estricto pero si haces las cosas como a él le gusta puedes aprobar."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Teoría|Jesús García Miranda",
    "name": "Jesús García Miranda",
    "subjectCode": "ALEM",
    "modalidad": "Teoría",
    "asignatura": "ALEM",
    "dificultad": "amarillo",
    "razon": "Veterano, opción intermedia",
    "opinions": [
      "Mejor profesor de la ETSIIT. Pone preguntas con \"una vuelta de tornillo\" de más, pero sus explicaciones y su implicación están a la altura. Está siempre disponible y te explica lo que haga falta, es cercano y amable. En las clases de teoría no suele apuntar mucho en la pizarra, explica las diapositivas y de vez en cuando hace algún ejemplo. No hay parciales, el examen final no es fácil y es largo (3 horas aproximadamente). Además el examen consta con bastantes ejercicios que cambian cada año, aunque la estructura general del examen es similar (un ejercicio por tema más o menos). A la hora de la corrección es relativamente estricto."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Prácticas|Jesús García Miranda",
    "name": "Jesús García Miranda",
    "subjectCode": "ALEM",
    "modalidad": "Prácticas",
    "asignatura": "ALEM",
    "dificultad": "amarillo",
    "razon": "Veterano, opción intermedia",
    "opinions": [
      "Mejor profesor de la ETSIIT. Pone preguntas con \"una vuelta de tornillo\" de más, pero sus explicaciones y su implicación están a la altura. Está siempre disponible y te explica lo que haga falta, es cercano y amable. En las clases de teoría no suele apuntar mucho en la pizarra, explica las diapositivas y de vez en cuando hace algún ejemplo. No hay parciales, el examen final no es fácil y es largo (3 horas aproximadamente). Además el examen consta con bastantes ejercicios que cambian cada año, aunque la estructura general del examen es similar (un ejercicio por tema más o menos). A la hora de la corrección es relativamente estricto."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Teoría|José Antonio Jiménez Madrid",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "ALEM",
    "modalidad": "Teoría",
    "asignatura": "ALEM",
    "dificultad": "amarillo",
    "razon": "Enfoque teórico pero metódico",
    "opinions": [
      "Es muy buena gente, sus clases no son una maravilla pero es bueno. La relación con el alumnado es excelente, responde a todas las dudas y da muchas más horas de tutoría de las que debería ya que se nota que es profesor por vocación. En prado sube multitud de contenido de ampliación y divulgación para quienes estén interesados. Tiene muy buen carácter y le encanta resolver dudas en tutorías. Es un poco caótico pero le gusta mucho su asignatura."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ALEM|Prácticas|José Antonio Jiménez Madrid",
    "name": "José Antonio Jiménez Madrid",
    "subjectCode": "ALEM",
    "modalidad": "Prácticas",
    "asignatura": "ALEM",
    "dificultad": "amarillo",
    "razon": "Enfoque teórico pero metódico",
    "opinions": [
      "Es muy buena gente, sus clases no son una maravilla pero es bueno. La relación con el alumnado es excelente, responde a todas las dudas y da muchas más horas de tutoría de las que debería ya que se nota que es profesor por vocación. En prado sube multitud de contenido de ampliación y divulgación para quienes estén interesados. Tiene muy buen carácter y le encanta resolver dudas en tutorías. Es un poco caótico pero le gusta mucho su asignatura."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Teoría|Carlos Ureña Almagro",
    "name": "Carlos Ureña Almagro",
    "subjectCode": "SCD",
    "modalidad": "Teoría",
    "asignatura": "SCD",
    "dificultad": "amarillo",
    "razon": "Perfil dual gráficas+concurrencia, menos directo",
    "opinions": [
      "Explica bien la teoría y sus exámenes son asefables. Corrige de manera justa."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Prácticas|Carlos Ureña Almagro",
    "name": "Carlos Ureña Almagro",
    "subjectCode": "SCD",
    "modalidad": "Prácticas",
    "asignatura": "SCD",
    "dificultad": "amarillo",
    "razon": "Perfil dual gráficas+concurrencia, menos directo",
    "opinions": [
      "Explica bien la teoría y sus exámenes son asefables. Corrige de manera justa."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Teoría|Luis Gonzaga Baca Ruiz",
    "name": "Luis Gonzaga Baca Ruiz",
    "subjectCode": "SCD",
    "modalidad": "Teoría",
    "asignatura": "SCD",
    "dificultad": "cyan",
    "razon": "Titular, +45 publicaciones, especialista en concurrencia",
    "opinions": [
      "Muy buen profesor y muy buena relacion con el alumnado, sus examenes son super asefables, suele preguntar unos 6 puntos de teoria en tipo test (bastante sencillo) y el resto en uno o dos problemas de la teoria dada en clase (semáforos, monitores...). Regala puntos por participar, tanto en teoria como practicas, por lo que hay gente que aprueba la asignatura sin hacer ni siquiera un examen. Corrige muy rápido y la probabilidad de sacar muy buena nota con él es alta si te lo propones. Con estudiar sus diapositivas vas sobrado tanto en el test como los ejercicios."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Prácticas|Luis Gonzaga Baca Ruiz",
    "name": "Luis Gonzaga Baca Ruiz",
    "subjectCode": "SCD",
    "modalidad": "Prácticas",
    "asignatura": "SCD",
    "dificultad": "cyan",
    "razon": "Titular, +45 publicaciones, especialista en concurrencia",
    "opinions": [
      "Muy buen profesor y muy buena relacion con el alumnado, sus examenes son super asefables, suele preguntar unos 6 puntos de teoria en tipo test (bastante sencillo) y el resto en uno o dos problemas de la teoria dada en clase (semáforos, monitores...). Regala puntos por participar, tanto en teoria como practicas, por lo que hay gente que aprueba la asignatura sin hacer ni siquiera un examen. Corrige muy rápido y la probabilidad de sacar muy buena nota con él es alta si te lo propones. Con estudiar sus diapositivas vas sobrado tanto en el test como los ejercicios."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Teoría|José Ángel Segura Muros",
    "name": "José Ángel Segura Muros",
    "subjectCode": "SCD",
    "modalidad": "Teoría",
    "asignatura": "SCD",
    "dificultad": "gris",
    "razon": "Experiencia consolidada en sistemas distribuidos",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Prácticas|José Ángel Segura Muros",
    "name": "José Ángel Segura Muros",
    "subjectCode": "SCD",
    "modalidad": "Prácticas",
    "asignatura": "SCD",
    "dificultad": "gris",
    "razon": "Experiencia consolidada en sistemas distribuidos",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Teoría|Pedro Villar Castro",
    "name": "Pedro Villar Castro",
    "subjectCode": "SCD",
    "modalidad": "Teoría",
    "asignatura": "SCD",
    "dificultad": "amarillo",
    "razon": "Titular, experiencia continua en SCD",
    "opinions": [
      "Explica las diapositivas de memoria aunque los ejercicios los explica bien y hace bastantes. En las tutorías no es malo pero tampoco esperes que te arregle el código. Corrige los exámenes muy a la baja. No hace parciales como otros profesores y su examen de la ordinaria son ejercicios de la relación, así que aunque sea larga conviene hacerla entera porque suelen ser muchos ejercicios de ahí."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "SCD|Prácticas|Pedro Villar Castro",
    "name": "Pedro Villar Castro",
    "subjectCode": "SCD",
    "modalidad": "Prácticas",
    "asignatura": "SCD",
    "dificultad": "amarillo",
    "razon": "Titular, experiencia continua en SCD",
    "opinions": [
      "Explica las diapositivas de memoria aunque los ejercicios los explica bien y hace bastantes. En las tutorías no es malo pero tampoco esperes que te arregle el código. Corrige los exámenes muy a la baja. No hace parciales como otros profesores y su examen de la ordinaria son ejercicios de la relación, así que aunque sea larga conviene hacerla entera porque suelen ser muchos ejercicios de ahí."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Teoría|Pedro Cartujo Cassinello",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "modalidad": "Teoría",
    "asignatura": "FFT",
    "dificultad": "amarillo",
    "razon": "Bonachón pero explica fatal, bueno corrigiendo",
    "opinions": [
      "Bonachón pero explica fatal. Muy recomendable acudir a tutorías para la revisión del examen. Repite preguntas de hace años y es bueno corrigiendo. Si suspendes en la extraordinaria con al menos un 3 ve a la revisión, puedes llevarte una sorpresa y aprobar."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Prácticas|Pedro Cartujo Cassinello",
    "name": "Pedro Cartujo Cassinello",
    "subjectCode": "FFT",
    "modalidad": "Prácticas",
    "asignatura": "FFT",
    "dificultad": "amarillo",
    "razon": "Bonachón pero explica fatal, bueno corrigiendo",
    "opinions": [
      "Bonachón pero explica fatal. Muy recomendable acudir a tutorías para la revisión del examen. Repite preguntas de hace años y es bueno corrigiendo. Si suspendes en la extraordinaria con al menos un 3 ve a la revisión, puedes llevarte una sorpresa y aprobar."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Teoría|José Luis Padilla De la Torre",
    "name": "José Luis Padilla De la Torre",
    "subjectCode": "FFT",
    "modalidad": "Teoría",
    "asignatura": "FFT",
    "dificultad": "rojo",
    "razon": "Explica bien pero muchísimo temario, examen muy duro",
    "opinions": [
      "Explica muy bien pero es muchísimo temario y a diferencia de otros no hace parciales. Examen final muy duro y aprueba poca gente."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Prácticas|José Luis Padilla De la Torre",
    "name": "José Luis Padilla De la Torre",
    "subjectCode": "FFT",
    "modalidad": "Prácticas",
    "asignatura": "FFT",
    "dificultad": "rojo",
    "razon": "Explica bien pero muchísimo temario, examen muy duro",
    "opinions": [
      "Explica muy bien pero es muchísimo temario y a diferencia de otros no hace parciales. Examen final muy duro y aprueba poca gente."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Teoría|Ignacio Melchor Ferrer",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "modalidad": "Teoría",
    "asignatura": "FFT",
    "dificultad": "verde",
    "razon": "Explica muy bien, muchos ejámplos, recomendado",
    "opinions": [
      "Explica muy bien, se hacen muchos ejercicios (incluso clases de repaso antes del examen). Sus videos son clave. Muy recomendado."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Prácticas|Ignacio Melchor Ferrer",
    "name": "Ignacio Melchor Ferrer",
    "subjectCode": "FFT",
    "modalidad": "Prácticas",
    "asignatura": "FFT",
    "dificultad": "verde",
    "razon": "Explica muy bien, muchos ejámplos, recomendado",
    "opinions": [
      "Explica muy bien, se hacen muchos ejercicios (incluso clases de repaso antes del examen). Sus videos son clave. Muy recomendado."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Teoría|Pedro García Fernández",
    "name": "Pedro García Fernández",
    "subjectCode": "FFT",
    "modalidad": "Teoría",
    "asignatura": "FFT",
    "dificultad": "gris",
    "razon": "Perfil desconocido",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "FFT|Prácticas|Pedro García Fernández",
    "name": "Pedro García Fernández",
    "subjectCode": "FFT",
    "modalidad": "Prácticas",
    "asignatura": "FFT",
    "dificultad": "gris",
    "razon": "Perfil desconocido",
    "opinions": [],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "EC|Teoría|Francisco Javier Fernández Baldomero",
    "name": "Francisco Javier Fernández Baldomero",
    "subjectCode": "EC",
    "modalidad": "Teoría",
    "asignatura": "EC",
    "dificultad": "naranja",
    "razon": "Estadísticas bajas, material incompleto",
    "opinions": [
      "Imposible seguir en clase y se refleja en sus estadísticas (60% aprobado con 5 o 6, solo 3 personas con un 7, 1 persona con un 8). Cambia mucho de tema y se concentra en cosas 0 importantes (por ejemplo sin exageración, el 80% de las clases se te pasaba los primeros 15 min explicando el sistema de evaluación porque un alumno empanado le había mandado un correo y otra vez se pasó unos 5 min escribiendo 1s para explicar lo que era FFFFFFFF en binario). Esto desmotiva al alumno para ir a clases pero el gran problema es que sus apuntes no están NADA completos. No se puede estudiar de ellos. Mucha gente cree aprobar su examen final es solo una cuestion de hacer infinitos tests, y yo no lo recomiendo. Es mucho mejor, hacer menos tests y tratar de conseguir su bibliografía principal en pdf y ir haciendo Ctrl+F en conceptos que no entiendas, o conseguir los libros en biblioteca e ir leyendo. Además de buscar en YouTube explicaciones de otras universidades españolas. Muy recomendable apuntar como hacer los problemas de clase a medida que vas entregando (si es que entregas alguno porque no te motiva para nada el decir que cuentan poco) porque para el examen final ya te habras olvidado el procedimiento para resolverlos. Es casi imposible aprobar la asignatura sin tener un máximo en la nota de clase (problemas + tests de clase), priorizar esto. Por estas razones, por su forma de dar la clase y armar el material para que el alumnno estudie, rojo sangre es el color correcto."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "EC|Prácticas|Francisco Javier Fernández Baldomero",
    "name": "Francisco Javier Fernández Baldomero",
    "subjectCode": "EC",
    "modalidad": "Prácticas",
    "asignatura": "EC",
    "dificultad": "naranja",
    "razon": "Estadísticas bajas, material incompleto",
    "opinions": [
      "Imposible seguir en clase y se refleja en sus estadísticas (60% aprobado con 5 o 6, solo 3 personas con un 7, 1 persona con un 8). Cambia mucho de tema y se concentra en cosas 0 importantes (por ejemplo sin exageración, el 80% de las clases se te pasaba los primeros 15 min explicando el sistema de evaluación porque un alumno empanado le había mandado un correo y otra vez se pasó unos 5 min escribiendo 1s para explicar lo que era FFFFFFFF en binario). Esto desmotiva al alumno para ir a clases pero el gran problema es que sus apuntes no están NADA completos. No se puede estudiar de ellos. Mucha gente cree aprobar su examen final es solo una cuestion de hacer infinitos tests, y yo no lo recomiendo. Es mucho mejor, hacer menos tests y tratar de conseguir su bibliografía principal en pdf y ir haciendo Ctrl+F en conceptos que no entiendas, o conseguir los libros en biblioteca e ir leyendo. Además de buscar en YouTube explicaciones de otras universidades españolas. Muy recomendable apuntar como hacer los problemas de clase a medida que vas entregando (si es que entregas alguno porque no te motiva para nada el decir que cuentan poco) porque para el examen final ya te habras olvidado el procedimiento para resolverlos. Es casi imposible aprobar la asignatura sin tener un máximo en la nota de clase (problemas + tests de clase), priorizar esto. Por estas razones, por su forma de dar la clase y armar el material para que el alumnno estudie, rojo sangre es el color correcto."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "EC|Teoría|Antonio Cañas Vargas",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "modalidad": "Teoría",
    "asignatura": "EC",
    "dificultad": "verde",
    "razon": "Creador de SWAD, muy buen recurso",
    "opinions": [
      "Un profesor muy bueno y cercano. Te responde las dudas de forma ULTRA completa y muy rápido en cualquier momento. Explica bien, pero entre que la asignatura NO es fácil de seguir y que él tampoco es precisamente el alma de la fiesta, como te pierdas o te distraigas más de la cuenta (que no es raro) la clase se te puede hacer bastante aburrida porque no le enteres de nada. Corrige bien y te da muchos recursos para poder subir nota (los \"kahoots\" de todas las clases, los ejercicios...) y aunque creas que el examen final te lo haya hechoWTal, la magia de cañas lo mismo te te have llevarte una sorpresa. Recomendable. Es el creador de SWAD btw."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "EC|Prácticas|Antonio Cañas Vargas",
    "name": "Antonio Cañas Vargas",
    "subjectCode": "EC",
    "modalidad": "Prácticas",
    "asignatura": "EC",
    "dificultad": "verde",
    "razon": "Creador de SWAD, muy buen recurso",
    "opinions": [
      "Un profesor muy bueno y cercano. Te responde las dudas de forma ULTRA completa y muy rápido en cualquier momento. Explica bien, pero entre que la asignatura NO es fácil de seguir y que él tampoco es precisamente el alma de la fiesta, como te pierdas o te distraigas más de la cuenta (que no es raro) la clase se te puede hacer bastante aburrida porque no le enteres de nada. Corrige bien y te da muchos recursos para poder subir nota (los \"kahoots\" de todas las clases, los ejercicios...) y aunque creas que el examen final te lo haya hechoWTal, la magia de cañas lo mismo te te have llevarte una sorpresa. Recomendable. Es el creador de SWAD btw."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Teoría|Francisco Javier Rodríguez Díaz",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "ED",
    "modalidad": "Teoría",
    "asignatura": "ED",
    "dificultad": "naranja",
    "razon": "Estricto corrigiendo, buena persona",
    "opinions": [
      "Sus clases son muy aburridas y se dedica a leer los PDFs (el material subido a Prado no aporta demasiado). A la hora de corregir los exámenes es muy estricto y al mínimo error pone un 0 directamente en el ejercicio. Recomendable tener buena nota en las prácticas y prepararte muy bien al menos tres ejercicios del examen para no llevarse sorpresas. Es muy buena persona. Te resuelve las dudas que tengas con mucha amabilidad. Incluso ofrece aumentar los deadlines de las tareas si el alumnno lo necesita."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Prácticas|Francisco Javier Rodríguez Díaz",
    "name": "Francisco Javier Rodríguez Díaz",
    "subjectCode": "ED",
    "modalidad": "Prácticas",
    "asignatura": "ED",
    "dificultad": "naranja",
    "razon": "Estricto corrigiendo, buena persona",
    "opinions": [
      "Sus clases son muy aburridas y se dedica a leer los PDFs (el material subido a Prado no aporta demasiado). A la hora de corregir los exámenes es muy estricto y al mínimo error pone un 0 directamente en el ejercicio. Recomendable tener buena nota en las prácticas y prepararte muy bien al menos tres ejercicios del examen para no llevarse sorpresas. Es muy buena persona. Te resuelve las dudas que tengas con mucha amabilidad. Incluso ofrece aumentar los deadlines de las tareas si el alumnno lo necesita."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Teoría|Joaquín Fernández Valdivia",
    "name": "Joaquín Fernández Valdivia",
    "subjectCode": "ED",
    "modalidad": "Teoría",
    "asignatura": "ED",
    "dificultad": "verde",
    "razon": "100% recomendable, el mejor de ED",
    "opinions": [
      "Puedes aprobar la asignatura sacando un 2 en el final, ya que da varios puntos entre prácticas y entregas de teoría. Además, explica muy bien, es rápido corrigiendo y siempre está disponible para lo que haga falta. Ayuda en todo lo que pueda. Profesor que vive por y para sus alumnos. Es muy cercano y además facilita todo para poder aprobar la asignatura. Explicaciones claras y muchísimo temario y ejercicios disponibles para poder practicar de cara al examen. Se nota que le gusta su asignatura y dar clase; lo mejor de ED sin duda alguna. Al final del cuatrimestre, da una charla muy interesante acerca del futuro que se nos viene como ingenieros. 100% recomendable."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Prácticas|Joaquín Fernández Valdivia",
    "name": "Joaquín Fernández Valdivia",
    "subjectCode": "ED",
    "modalidad": "Prácticas",
    "asignatura": "ED",
    "dificultad": "verde",
    "razon": "100% recomendable, el mejor de ED",
    "opinions": [
      "Puedes aprobar la asignatura sacando un 2 en el final, ya que da varios puntos entre prácticas y entregas de teoría. Además, explica muy bien, es rápido corrigiendo y siempre está disponible para lo que haga falta. Ayuda en todo lo que pueda. Profesor que vive por y para sus alumnos. Es muy cercano y además facilita todo para poder aprobar la asignatura. Explicaciones claras y muchísimo temario y ejercicios disponibles para poder practicar de cara al examen. Se nota que le gusta su asignatura y dar clase; lo mejor de ED sin duda alguna. Al final del cuatrimestre, da una charla muy interesante acerca del futuro que se nos viene como ingenieros. 100% recomendable."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Teoría|Miguel García Silvente",
    "name": "Miguel García Silvente",
    "subjectCode": "ED",
    "modalidad": "Teoría",
    "asignatura": "ED",
    "dificultad": "rojo",
    "razon": "Organización deficiente, exámenes duros",
    "opinions": [
      "El profesor se organiza bastante mal en cuanto a tiempos y coordinación entre teoría y prácticas, lo que hace que algunos temas se den tarde, con prisas o incluso no se lleguen a ver (grafos no se da). Además, a veces lo explicado en teoría no es suficiente para resolver los ejercicios (como por ejemplo en árboles binarios). Los exámenes son más difíciles que los del departamento y los enunciados no siempre son claros, ni en exámenes ni en la relación de ejercicios. La comunicación con el profesor no es muy fluida durante el curso, aunque mejora antes de los exámenes. Eso sí, si vas a tutoría, te resuelve las dudas."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Prácticas|Miguel García Silvente",
    "name": "Miguel García Silvente",
    "subjectCode": "ED",
    "modalidad": "Prácticas",
    "asignatura": "ED",
    "dificultad": "rojo",
    "razon": "Organización deficiente, exámenes duros",
    "opinions": [
      "El profesor se organiza bastante mal en cuanto a tiempos y coordinación entre teoría y prácticas, lo que hace que algunos temas se den tarde, con prisas o incluso no se lleguen a ver (grafos no se da). Además, a veces lo explicado en teoría no es suficiente para resolver los ejercicios (como por ejemplo en árboles binarios). Los exámenes son más difíciles que los del departamento y los enunciados no siempre son claros, ni en exámenes ni en la relación de ejercicios. La comunicación con el profesor no es muy fluida durante el curso, aunque mejora antes de los exámenes. Eso sí, si vas a tutoría, te resuelve las dudas."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Teoría|Rosa María Rodríguez Sánchez",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "modalidad": "Teoría",
    "asignatura": "ED",
    "dificultad": "verde",
    "razon": "Explicaciones desde 0, muy completa",
    "opinions": [
      "Explica todo desde 0. Las explicaciones son buenas y en profundidad. Si vas al día es casi imposible perderse. Las clases son algunas aburridas y lentas pero dado que es una asignatura que se basa en la comprensión lo acabas agradeciendo. Además pone a disposición de los alumnos videos de las clases por lo que si no vas puedes igualmente verlos y enterarte."
    ],
    "cruzada": false,
    "comentarios": []
  },
  {
    "key": "ED|Prácticas|Rosa María Rodríguez Sánchez",
    "name": "Rosa María Rodríguez Sánchez",
    "subjectCode": "ED",
    "modalidad": "Prácticas",
    "asignatura": "ED",
    "dificultad": "verde",
    "razon": "Explicaciones desde 0, muy completa",
    "opinions": [
      "Explica todo desde 0. Las explicaciones son buenas y en profundidad. Si vas al día es casi imposible perderse. Las clases son algunas aburridas y lentas pero dado que es una asignatura que se basa en la comprensión lo acabas agradeciendo. Además pone a disposición de los alumnos videos de las clases por lo que si no vas puedes igualmente verlos y enterarte."
    ],
    "cruzada": false,
    "comentarios": []
  }
];

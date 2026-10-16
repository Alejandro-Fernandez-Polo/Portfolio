/**
 * Ficha de una asignatura: reglas puras.
 *
 * A diferencia del perfil de un profesor, la dificultad y la descripción son de
 * la **asignatura** y van **por modalidad**: el catálogo las guarda como
 * `dificultad: { teoria, practicas }` y `descripcion: { teoria, practicas }`
 * porque teoría y prácticas no tienen por qué coincidir. Esta ficha las separa.
 *
 * Los dos datos solo existen en el catálogo completo (el volcado, con
 * contraseña); una muestra sin volcado devuelve la ficha sin dificultades ni
 * descripciones, y el llamante decide qué mostrar.
 *
 * Sin DOM, sin estado y sin globals: la asignatura llega por parámetro.
 */

/** Modalidades y la clave con la que el catálogo guarda cada una. */
const MODALIDADES = [
  ["Teoría", "teoria"],
  ["Prácticas", "practicas"],
];

/**
 * Ficha de una asignatura lista para pintar.
 *
 * @param {Object} subject asignatura del catálogo activo.
 * @returns {{codigo: string, nombre: string, curso: number, cuatrimestre: number,
 *   creditos: number, caracter: string, mencion: string,
 *   dificultades: Array<{modalidad: string, clave: string}>,
 *   descripciones: Array<{modalidad: string, texto: string}>}}
 *   `clave` es la de color de la escala de dificultad; las listas van vacías si
 *   el catálogo (una muestra) no trae esos datos.
 */
export function buildAsignaturaFicha(subject) {
  const s = subject || {};
  const dificultades = [];
  const descripciones = [];

  for (const [modalidad, key] of MODALIDADES) {
    const clave = s.dificultad && s.dificultad[key];
    if (clave) dificultades.push({ modalidad, clave });

    const texto = s.descripcion && s.descripcion[key];
    if (typeof texto === "string" && texto.trim()) {
      descripciones.push({ modalidad, texto: texto.trim() });
    }
  }

  return {
    codigo: s.codigo || "",
    nombre: s.nombre || "",
    curso: Number(s.curso) || 0,
    cuatrimestre: Number(s.cuatrimestre) || 0,
    creditos: Number(s.creditos) || 0,
    caracter: s.caracter || "",
    mencion: s.mencion || "",
    dificultades,
    descripciones,
  };
}

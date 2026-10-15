/**
 * Ficha de un profesor y listado del claustro: reglas puras.
 *
 * En el catálogo, un profesor es una entrada por (asignatura, modalidad,
 * nombre): su dificultad, su opinión y sus comentarios son de esa terna, no de
 * la persona, porque el mismo profesor puede ser «Difícil» dando la teoría de
 * una asignatura y «Normal» dando sus prácticas. Aquí se agrupan esas entradas
 * por nombre —la única identidad que comparten— y se ordenan para pintarlas.
 *
 * Sin DOM, sin estado y sin globals: el llamante decide dónde y cómo se ve.
 */

import { DIFFICULTY_SCORES, MODALIDADES } from "../../solver/catalog.js";

const MODALITY_KEYS = { Teoría: "teoria", Prácticas: "practicas" };

/**
 * Posición de una dificultad en la escala. Se ordena de la más suave a la más
 * dura usando los mismos pesos que el solver, y `null` (sin puntuación) queda
 * al final.
 *
 * @param {string|null} dificultad clave de color.
 * @returns {number} peso; 0 cuando no hay puntuación.
 */
function difficultyRank(dificultad) {
  return DIFFICULTY_SCORES[dificultad] ?? 0;
}

function compareModality(a, b) {
  return MODALIDADES.indexOf(a) - MODALIDADES.indexOf(b);
}

function compareEntries(a, b) {
  return a.subjectCode.localeCompare(b.subjectCode) || compareModality(a.modalidad, b.modalidad);
}

function isProfesor(profesor) {
  return !!profesor && typeof profesor === "object" && !!profesor.name;
}

/**
 * Entradas de un profesor, ordenadas por asignatura y modalidad.
 *
 * @param {Array} profesores perfiles del catálogo activo.
 * @param {string} name nombre del profesor.
 * @returns {Array} entradas del profesor; vacío si no tiene ninguna.
 */
export function profesorEntries(profesores, name) {
  return (Array.isArray(profesores) ? profesores : [])
    .filter((profesor) => isProfesor(profesor) && profesor.name === name)
    .sort(compareEntries);
}

/**
 * Dificultades distintas de un conjunto de entradas, sin repetir y en orden de
 * escala, para poder pintar una insignia por valor.
 *
 * @param {Array} entries entradas de un profesor.
 * @returns {string[]} claves de color.
 */
function distinctDifficulties(entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (entry.dificultad) seen.add(entry.dificultad);
  }
  return [...seen].sort((a, b) => difficultyRank(b) - difficultyRank(a));
}

/**
 * Ficha de un profesor: todas sus entradas con lo que hace falta para pintarlas
 * (dificultad, razón, opiniones, comentarios) más el plan de la asignatura
 * (nombre, carácter, mención y la descripción de esa modalidad).
 *
 * `focus` es la entrada desde la que se ha abierto la ficha (el grupo cuyo
 * nombre se ha pulsado): va **primero y marcada**. Sin `focus` —cuando se abre
 * desde el listado de profesores— no se marca ninguna.
 *
 * @param {Array} profesores perfiles del catálogo activo.
 * @param {Array} subjects asignaturas del catálogo activo.
 * @param {string} name nombre del profesor.
 * @param {{subjectCode: string, modalidad: string}|null} [focus] entrada pulsada.
 * @returns {{name: string, entries: Array}} ficha lista para pintar.
 */
export function buildProfesorFicha(profesores, subjects, name, focus = null) {
  const byCode = new Map((Array.isArray(subjects) ? subjects : []).map((s) => [s.codigo, s]));

  const entries = profesorEntries(profesores, name).map((profesor) => {
    const subject = byCode.get(profesor.subjectCode) || null;
    const highlighted =
      !!focus &&
      focus.subjectCode === profesor.subjectCode &&
      (focus.modalidad || "Teoría") === profesor.modalidad;
    return {
      key: profesor.key,
      subjectCode: profesor.subjectCode,
      modalidad: profesor.modalidad,
      dificultad: profesor.dificultad || null,
      razon: profesor.razon || "",
      opinions: Array.isArray(profesor.opinions) ? profesor.opinions : [],
      comentarios: Array.isArray(profesor.comentarios) ? profesor.comentarios : [],
      cruzada: profesor.cruzada === true,
      nombreAsignatura: subject ? subject.nombre : "",
      caracter: subject ? subject.caracter || "" : "",
      mencion: subject ? subject.mencion || "" : "",
      descripcion:
        subject && subject.descripcion
          ? subject.descripcion[MODALITY_KEYS[profesor.modalidad]] || ""
          : "",
      highlighted,
    };
  });

  if (focus) {
    const first = entries.findIndex((entry) => entry.highlighted);
    if (first > 0) entries.unshift(entries.splice(first, 1)[0]);
  }

  return { name, entries };
}

/**
 * Listado del claustro para la pestaña de datos: una fila por profesor, con lo
 * mínimo para reconocerlo (sus asignaturas y sus dificultades). El contenido
 * largo vive en la ficha.
 *
 * @param {Array} profesores perfiles del catálogo activo.
 * @param {{query?: string}} [options] filtro por nombre o código de asignatura.
 * @returns {Array<{name: string, asignaturas: Array<{code: string,
 *   modalidad: string}>, dificultades: string[], total: number}>}
 */
export function listProfesores(profesores, options = {}) {
  const query = String(options.query || "").trim().toLowerCase();
  const byName = new Map();

  for (const profesor of Array.isArray(profesores) ? profesores : []) {
    if (!isProfesor(profesor)) continue;
    if (!byName.has(profesor.name)) byName.set(profesor.name, []);
    byName.get(profesor.name).push(profesor);
  }

  const rows = [];
  for (const [name, entries] of byName) {
    const sorted = entries.sort(compareEntries);
    rows.push({
      name,
      asignaturas: sorted.map((p) => ({ code: p.subjectCode, modalidad: p.modalidad })),
      dificultades: distinctDifficulties(sorted),
      total: sorted.length,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));

  if (!query) return rows;
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(query) ||
      row.asignaturas.some((asignatura) => asignatura.code.toLowerCase().includes(query)),
  );
}

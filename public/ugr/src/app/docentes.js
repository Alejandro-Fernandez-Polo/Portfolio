/**
 * Índice de docentes de `/ugr`: las **dos capas** del dato y su fusión.
 *
 * `DOCENTES` son las **asignaciones** (qué profesor da la teoría de una letra de
 * grupo o las prácticas de un subgrupo) y `PROFESORES` son los **perfiles**, uno
 * por (asignatura, modalidad, nombre). El perfil no cuelga de la asignación: se
 * busca por la terna, con la misma clave que construye `profesorKey` en
 * `solver/catalog.js`. Así la asignación es del usuario y el perfil de la hoja, y
 * ninguno de los dos duplica al otro.
 *
 * Sobre esa base se aplican las **valoraciones propias**: para la misma terna
 * manda la tuya (la regla es del dominio; aquí solo se compone el índice). Es
 * idempotente —parte siempre de la base— para poder rehacerse al cambiar de
 * catálogo o al guardar/borrar una valoración.
 *
 * Lo consumen el panel de grupos, el calendario, el generador y la ficha del
 * profesor; el dueño de la caché de valoraciones es el llamante, que se la cede
 * por `setReviews`.
 */

import { ownReviewToProfesor } from "./domain/profesores-propios.js";

/** Índice de una lista por una clave calculada. */
function indexByKey(list, keyOf) {
  return (Array.isArray(list) ? list : []).reduce((acc, entry) => {
    const key = keyOf(entry);
    if (key) acc[key] = entry;
    return acc;
  }, {});
}

/**
 * @param {Object} [deps] datos de arranque.
 * @param {Array} [deps.docents] asignaciones iniciales (`DOCENTES`).
 * @param {Array} [deps.profesores] perfiles iniciales (`PROFESORES`).
 * @param {() => Object|null} [deps.catalogApi] frontera del catálogo (para el peso de la dificultad).
 * @returns {Object} el índice montado.
 */
export function createDocentIndex({ docents = [], profesores = [], catalogApi = () => null } = {}) {
  const docentesByKey = {};
  /** La base del catálogo activo, sin las valoraciones propias. */
  const catalogoProfesoresByKey = {};
  /** La **fusión** que lee el render: catálogo con las propias por encima. */
  const profesoresByKey = {};
  /** Nombres con alguna valoración: los que pueden abrir ficha. */
  const nombresConFicha = new Set();
  /** Las valoraciones propias vigentes (referencia; el llamante es su dueño). */
  let reviews = [];

  const getProfKey = (codigo, letra) => codigo + "-" + letra;
  const getProfesorKey = (asignacion) =>
    asignacion.subjectCode + "|" + (asignacion.modalidad || "Teoría") + "|" + asignacion.name;

  /** Rehace la fusión: la base del catálogo y, encima, las valoraciones propias. */
  function rebuildMerged() {
    Object.keys(profesoresByKey).forEach((key) => {
      delete profesoresByKey[key];
    });
    nombresConFicha.clear();
    const add = (p) => {
      if (!p || !p.key) return;
      profesoresByKey[p.key] = p;
      // La ficha agrupa todo lo que se sabe de un profesor, así que se abre
      // aunque no haya valoración de *esta* asignatura: si tiene alguna en otra,
      // el nombre es un botón y la ficha la enseña.
      if (p.name) nombresConFicha.add(p.name);
    };
    Object.keys(catalogoProfesoresByKey).forEach((key) => add(catalogoProfesoresByKey[key]));
    reviews.forEach((review) => add(ownReviewToProfesor(review)));
  }

  /** Rehace las dos capas con lo que sirva el catálogo activo. */
  function rebuild(docents_, profesores_) {
    Object.keys(docentesByKey).forEach((key) => {
      delete docentesByKey[key];
    });
    (Array.isArray(docents_) ? docents_ : []).forEach((d) => {
      if (d && d.key) docentesByKey[d.key] = d;
    });
    Object.keys(catalogoProfesoresByKey).forEach((key) => {
      delete catalogoProfesoresByKey[key];
    });
    (Array.isArray(profesores_) ? profesores_ : []).forEach((p) => {
      if (p && p.key) catalogoProfesoresByKey[p.key] = p;
    });
    rebuildMerged();
  }

  /** Cambia las valoraciones propias y rehace la fusión. */
  function setReviews(list) {
    reviews = Array.isArray(list) ? list : [];
    rebuildMerged();
  }

  function getDocent(key) {
    return docentesByKey[key] || null;
  }

  /**
   * Perfil del profesor asignado a un grupo (teoría) o subgrupo (prácticas).
   * `null` cuando no hay asignación o cuando el volcado no trae perfil para esa
   * terna —los nombres del maestro antiguo que no están en la hoja—, que es «sin
   * dificultad», no «difícil».
   */
  function getProfesor(codigo, letra) {
    const asignacion = getDocent(getProfKey(codigo, letra));
    if (!asignacion) return null;
    return profesoresByKey[getProfesorKey(asignacion)] || null;
  }

  function getProfName(codigo, letra) {
    const asignacion = getDocent(getProfKey(codigo, letra));
    return asignacion && asignacion.name ? asignacion.name : "";
  }

  function getDificultad(codigo, letra) {
    const info = getProfesor(codigo, letra);
    return info && info.dificultad ? info.dificultad : null;
  }

  function getDifficultyScore(dificultad) {
    const api = catalogApi();
    // Sin catálogo no se inventa un peso: «sin puntuación» (`null`) es un valor
    // legítimo que el motor y las métricas entienden.
    if (api && typeof api.difficultyScore === "function") return api.difficultyScore(dificultad);
    return null;
  }

  /** Perfiles del catálogo activo como lista: el índice es por clave. */
  function profesoresList() {
    return Object.keys(profesoresByKey).map((key) => profesoresByKey[key]);
  }

  function hasFicha(nombre) {
    return nombresConFicha.has(nombre);
  }

  rebuild(docents, profesores);

  return { rebuild, setReviews, getDocent, getProfesor, getProfName, getDificultad, getDifficultyScore, profesoresList, hasFicha };
}

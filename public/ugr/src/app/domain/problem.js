/**
 * Construcción del problema que recibe el solver.
 *
 * Extraído del monolito `public/ugr/app.js` sin cambio de comportamiento y
 * ampliado con dos decisiones de producto: la dificultad «Desconocido» no
 * puntúa (`difficultyScore` devuelve `null`) y el **modo profesores** deja a los
 * docentes fuera de la generación.
 *
 * Funciones puras —sin DOM, sin globals, sin estado—: el catálogo, el estado
 * de selección y los lookups de dificultad llegan por parámetro. El monolito
 * conserva la lectura de `state`, `SUBJECTS` y `__ugrProgress` en un adaptador
 * delgado y delega aquí; así el interruptor entra por parámetro en vez de por
 * un global nuevo.
 */

/**
 * Puntuación por grupo (`CODE-LETRA` → peso) de la parte del profesor del
 * coste. Solo entran las dificultades **con** puntuación: un `null` —lo que
 * devuelve el catálogo para `gris` y para cualquier valor desconocido— se
 * omite, y el motor trata la ausencia de clave como penalización 0.
 *
 * @param {string[]} codes códigos de asignatura ya filtrados (los del dominio).
 * @param {Array} catalog catálogo activo (`SUBJECTS` en producción).
 * @param {(codigo: string, letra: string) => string|null} dificultadOf
 *   lookup de dificultad de un grupo.
 * @param {(d: string|null) => number|null} scoreOf peso de una dificultad;
 *   `null` (o el resultado `null` de la función) = sin puntuación.
 * @returns {Record<string, number>} mapa de puntuaciones; `{}` si no hay
 *   ninguna dificultad conocida.
 */
export function buildDocentScores(codes, catalog, dificultadOf, scoreOf) {
  const byCode = new Map((catalog || []).map((s) => [s.codigo, s]));
  const scores = {};
  for (const code of codes || []) {
    const subject = byCode.get(code);
    if (!subject) continue;
    for (const group of subject.grupos || []) {
      const score = scoreOf(dificultadOf(code, group.letra));
      if (score != null) scores[`${code}-${group.letra}`] = score;
    }
  }
  return scores;
}

/**
 * Problema del solver a partir de la selección del usuario.
 *
 * Tres filtros se aplican en este orden: la asignatura tiene que existir en el
 * catálogo, estar en el cuatrimestre activo y no estar superada (el solver no
 * planifica lo aprobado). Las superadas se devuelven en `excludedPassed` para
 * que el llamante pueda informarlo en pantalla.
 *
 * Con `ignoreDocents` («Ignorar profesores», preferencia `ui.ignoreDocents`)
 * se vacía `docentScores` —el término del profesor desaparece del coste sin
 * tocar el motor— y se retira el filtro `blockGroups` de `filters`: ese bloqueo
 * lo escribe el panel «Bloquear profesores» y con el modo activo quedaría
 * decidiendo en silencio desde una interfaz oculta. El dato **no** se borra del
 * almacén del usuario: al apagar el modo vuelve a aplicarse tal cual.
 *
 * @param {Object} [input]
 * @param {Record<string, boolean>} [input.selectedSubjects] mapa `codigo → sí`.
 * @param {Array} [input.catalog] catálogo activo (`SUBJECTS` en producción).
 * @param {number} [input.cuatrimestre] cuatrimestre activo.
 * @param {string[]} [input.passedCodes] códigos superados (`__ugrProgress`).
 * @param {Array} [input.filters] filtros del solver (`FilterSpec[]`).
 * @param {boolean} [input.ignoreDocents] modo profesores activo.
 * @param {(codigo: string, letra: string) => string|null} [input.dificultad]
 *   lookup de dificultad inyectado por el llamante.
 * @param {(d: string|null) => number|null} [input.difficultyScore] peso de una
 *   dificultad inyectado por el llamante.
 * @returns {{subjects: string[], excludedPassed: string[], filters: Array,
 *   catalogVersion: string, docentScores: Record<string, number>}}
 *   `catalogVersion` sigue siendo `"legacy"`: el problema viaja al solver con
 *   esa etiqueta y cambiarla alteraría la clave de la caché.
 */
export function buildProblem({
  selectedSubjects = {},
  catalog = [],
  cuatrimestre = 1,
  passedCodes = [],
  filters = [],
  ignoreDocents = false,
  dificultad = () => null,
  difficultyScore = () => null,
} = {}) {
  const inTerm = Object.keys(selectedSubjects).filter((code) => {
    if (!selectedSubjects[code]) return false;
    const subject = catalog.find((s) => s.codigo === code);
    return !!subject && subject.cuatrimestre === cuatrimestre;
  });

  const passed = new Set(passedCodes);
  const subjects = [];
  const excludedPassed = [];
  for (const code of inTerm) {
    if (passed.has(code)) excludedPassed.push(code);
    else subjects.push(code);
  }

  return {
    subjects,
    excludedPassed,
    filters: ignoreDocents ? filters.filter((f) => f.type !== "blockGroups") : filters,
    catalogVersion: "legacy",
    docentScores: ignoreDocents
      ? {}
      : buildDocentScores(subjects, catalog, dificultad, difficultyScore),
  };
}

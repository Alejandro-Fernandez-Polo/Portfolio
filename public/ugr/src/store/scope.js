/**
 * Los dos mundos de `/ugr`: los datos de **ejemplo** y los **personales**.
 *
 * El store guarda un documento de `userState` por mundo —claves `"sample"` y
 * `"current"`— y las filas que cuelgan de él (configuraciones guardadas y
 * valoraciones propias) llevan `scope`. Así, lo que alguien hace probando la
 * app con datos de ejemplo no se mezcla con lo que tiene marcado de verdad.
 * La caché de soluciones queda fuera a propósito: es un dato derivado del
 * problema, no del usuario, y compartirla no filtra nada de nadie.
 *
 * Las filas escritas antes de que existieran los mundos no llevan `scope`; se
 * leen como **personales**, que es lo que eran. Tratarlas como muestra las
 * haría desaparecer de la vista de quien ya las tenía.
 */

export const SCOPE_SAMPLE = "sample";
export const SCOPE_PERSONAL = "personal";

/** Los dos mundos, en el orden en que se ofrecen. */
export const SCOPES = Object.freeze([SCOPE_SAMPLE, SCOPE_PERSONAL]);

/** Mundo con el que arranca un navegador recién estrenado. */
export const DEFAULT_SCOPE = SCOPE_SAMPLE;

/** Clave del documento `userState` de cada mundo. */
const USER_STATE_KEYS = Object.freeze({
  [SCOPE_SAMPLE]: "sample",
  [SCOPE_PERSONAL]: "current",
});

/**
 * @param {*} valor
 * @returns {boolean} `true` solo para un scope conocido.
 */
export function isScope(valor) {
  return valor === SCOPE_SAMPLE || valor === SCOPE_PERSONAL;
}

/**
 * Un scope utilizable. Lo que no se reconoce cae en **personal**: es el lado
 * donde vive lo que el usuario ya tenía, así que ante la duda no se oculta.
 *
 * @param {*} valor
 * @returns {"sample"|"personal"}
 */
export function normalizeScope(valor) {
  return isScope(valor) ? valor : SCOPE_PERSONAL;
}

/**
 * Con qué mundo arrancar cuando no hay ninguno elegido todavía. Un navegador
 * que ya tiene estado personal sigue en él —actualizar la app no puede
 * cambiarle los datos de sitio—; uno nuevo empieza en la muestra y lo dice.
 *
 * @param {{hasPersonalState?: boolean}} [estado]
 * @returns {"sample"|"personal"}
 */
export function initialScope({ hasPersonalState } = {}) {
  return hasPersonalState ? SCOPE_PERSONAL : DEFAULT_SCOPE;
}

/**
 * @param {string} scope
 * @returns {string} clave del documento `userState` (`"sample"` o `"current"`).
 */
export function userStateKey(scope) {
  return USER_STATE_KEYS[normalizeScope(scope)];
}

/**
 * El inverso de `userStateKey`: de una clave de documento a su mundo.
 *
 * @param {string} key
 * @returns {"sample"|"personal"}
 */
export function scopeOfUserStateKey(key) {
  return key === USER_STATE_KEYS[SCOPE_SAMPLE] ? SCOPE_SAMPLE : SCOPE_PERSONAL;
}

/**
 * El mundo de una fila guardada (`configs`, `reviews`). Sin `scope` es una
 * fila anterior a los mundos, es decir, personal.
 *
 * @param {Object} fila
 * @returns {"sample"|"personal"}
 */
export function scopeOfRow(fila) {
  return isScope(fila && fila.scope) ? fila.scope : SCOPE_PERSONAL;
}

/**
 * Se queda con las filas de un mundo.
 *
 * @param {Array} filas
 * @param {string} scope
 * @returns {Array}
 */
export function filterByScope(filas, scope) {
  const objetivo = normalizeScope(scope);
  return (Array.isArray(filas) ? filas : []).filter((fila) => scopeOfRow(fila) === objetivo);
}

/**
 * El otro mundo.
 *
 * @param {string} scope
 * @returns {"sample"|"personal"}
 */
export function otherScope(scope) {
  return normalizeScope(scope) === SCOPE_SAMPLE ? SCOPE_PERSONAL : SCOPE_SAMPLE;
}

/**
 * Clave primaria de una valoración propia. Lleva el mundo delante porque el
 * mismo profesor puede estar valorado en los dos y cada valoración es de su
 * mundo: con `docentKey` a secas, la segunda pisaría a la primera.
 *
 * @param {string} scope
 * @param {string} docentKey clave canónica del profesor.
 * @returns {string} por ejemplo `personal|SO|teoria|Lastra`.
 */
export function reviewId(scope, docentKey) {
  return `${normalizeScope(scope)}|${docentKey}`;
}

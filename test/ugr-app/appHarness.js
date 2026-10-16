/**
 * Arnés de caracterización del monolito `/ugr`.
 *
 * Arranca `public/ugr/app.js` **de verdad**: su DOM real (el `index.html` que se
 * sirve), su grafo ESM real (las features y el dominio resuelven por sí solos) y
 * un store de mentira con el **reducer real** —sin IndexedDB, pero con las
 * mismas reglas—. Lo único que se sustituye es el borde de persistencia.
 *
 * Por qué existe: con el arnés anterior (`new Function` sobre el fuente) los
 * `import()` dinámicos del monolito no resuelven —«A dynamic import callback was
 * not specified»—, así que las features quedaban fuera y `renderSubjects` /
 * `renderCalendar` eran no-ops: el camino que de verdad se usa no se podía
 * pinnear. Con jsdom + el grafo real sí.
 *
 * Uso: el fichero de test que importe esto **debe** declarar
 * `// @vitest-environment jsdom` en su primera línea, y su `vitest.config.js`
 * necesita `publicDir: false` y el alias `/ugr/` (ver la config del repo).
 *
 * No es un `.test.js`, así que Vitest no lo recoge como suite.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { vi } from "vitest";
import { reducer, initialState } from "../../public/ugr/src/store/reducer.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_PATH = join(ROOT, "public/ugr/app.js");
const INDEX_PATH = join(ROOT, "public/ugr/index.html");

/**
 * Store de mentira con el reducer real. `dispatch` acumula los comandos
 * recibidos (para poder afirmar qué llegó al store, no solo cómo quedó) y
 * notifica a los suscriptores con las mismas reglas que el store de verdad.
 *
 * @param {Object} [seed] estado inicial sobre `initialState`.
 */
export function makeStore(seed = {}) {
  let state = { ...initialState, ...seed };
  const subscribers = new Set();
  const dispatched = [];
  // Tabla `reviews` en memoria, con la misma forma que `store/reviews.js`: el
  // monolito la lee con `listReviews` (su caché es `ownReviews`) y escribe con
  // `saveReviews`/`deleteReview`.
  const reviews = new Map();
  return {
    getState: () => state,
    subscribe(handler) {
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
    dispatch(cmd) {
      dispatched.push(cmd);
      const next = reducer(state, cmd);
      if (next !== state) {
        state = next;
        subscribers.forEach((handler) => handler(state));
      }
    },
    dispatched,
    listReviews: async () => [...reviews.values()],
    saveReviews: async (lista) => {
      const validas = (Array.isArray(lista) ? lista : []).filter((r) => r && r.docentKey);
      if (validas.length === 0) return { ok: false, error: "empty" };
      validas.forEach((r) => reviews.set(r.docentKey, r));
      return { ok: true, count: validas.length };
    },
    deleteReview: async (docentKey) => {
      if (!docentKey) return { ok: false, error: "missing_key" };
      reviews.delete(docentKey);
      return { ok: true };
    },
    reviews,
  };
}

/** Cuerpo del `index.html` de `/ugr`, sin sus `<script>`. */
function indexBody() {
  const html = readFileSync(INDEX_PATH, "utf8");
  return html
    .slice(html.indexOf("<body"), html.indexOf("</body>") + 7)
    .replace(/<script[\s\S]*?<\/script>/g, "");
}

/**
 * Arranca el monolito con el DOM y los globals que espera.
 *
 * @param {Object} [options]
 * @param {Array} options.subjects asignaturas (`SUBJECTS`).
 * @param {Array} [options.docentes] asignaciones (`DOCENTES`).
 * @param {Array} [options.profesores] perfiles (`PROFESORES`).
 * @param {Array} [options.convalidaciones] tabla oficial (`CONVALIDACIONES`).
 * @param {Array} [options.propuestasIniciales] propuestas semilla
 * @param {Object} [options.storage] pares clave/valor que se siembran en
 *   `localStorage` antes de arrancar (para los caminos que leen al evaluarse,
 *   como los filtros del solver).
 * @param {Object} [options.progress] puente del progreso (`window.__ugrProgress`),
 *   para el camino de «asignaturas superadas».
 * @param {Object} [options.store] store propio; si no, uno vacío.
 * @returns {Promise<{legacy: Object, store: Object, storage: Storage}>}
 *   `legacy` es `window.__ugrLegacy` (el contrato que expone el monolito).
 */
export async function bootUgrApp(options = {}) {
  // Registro ESM limpio: cada test arranca una instancia nueva del monolito y de
  // sus features (si no, la segunda importación devolvería la cacheada).
  vi.resetModules();

  globalThis.SUBJECTS = JSON.parse(JSON.stringify(options.subjects || []));
  globalThis.DOCENTES = options.docentes || [];
  globalThis.PROFESORES = options.profesores || [];
  globalThis.CONVALIDACIONES = options.convalidaciones || [];
  globalThis.PROPUESTAS = [];

  document.body.innerHTML = indexBody();
  globalThis.localStorage.clear();
  // Semilla opcional: hay caminos que leen `localStorage` al evaluarse el cierre
  // (los filtros del solver, por ejemplo), así que sembrar aquí es la única
  // forma de caracterizarlos.
  Object.entries(options.storage || {}).forEach(([clave, valor]) => globalThis.localStorage.setItem(clave, valor));

  const store = options.store || makeStore();
  globalThis.window.__ugrStore = store;
  // Puente del solver: sin él el monolito avisa de que «el motor no está
  // disponible»; con un doble se puede caracterizar todo el camino de generar.
  // Se limpia siempre porque el `window` de jsdom se comparte entre arranques
  // del mismo fichero: si no, el motor de un test se le colaría al siguiente.
  if (options.solver) globalThis.window.__ugrSolver = options.solver;
  else delete globalThis.window.__ugrSolver;
  // Puentes del catálogo y del paquete cifrado: son las fronteras que el
  // monolito conoce por `window`, así que se doblan aquí para poder
  // caracterizarlas (cambiar de catálogo e importar el volcado).
  if (options.catalog) globalThis.window.__ugrCatalog = options.catalog;
  else delete globalThis.window.__ugrCatalog;
  if (options.package) globalThis.window.__ugrPackage = options.package;
  else delete globalThis.window.__ugrPackage;
  // Puente del progreso: es de donde el solver saca las asignaturas superadas.
  if (options.progress) globalThis.window.__ugrProgress = options.progress;
  else delete globalThis.window.__ugrProgress;

  await import(APP_PATH);
  const legacy = globalThis.window.__ugrLegacy;
  await legacy.init();
  await flush();
  return { legacy, store, storage: globalThis.localStorage };
}

/**
 * Deja correr las tareas pendientes. Las features pintan en microtareas/rAF, así
 * que sin esto se afirmaría sobre un DOM a medio pintar.
 */
export function flush() {
  return new Promise((resolve) => setTimeout(resolve, 30));
}

/** Clic en la tarjeta de una asignatura de la rejilla de selección. */
export function clickSubject(codigo) {
  const card = document.querySelector(`.subject-card[data-codigo="${codigo}"]`);
  if (!card) throw new Error(`no hay tarjeta para ${codigo}`);
  card.click();
}

/** Texto normalizado (espacios colapsados) de un elemento. */
export function textOf(selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
}

/** Configuraciones guardadas tal y como quedaron en `localStorage`. */
export function savedConfigsFromStorage(storage) {
  const all = [];
  for (let slot = 0; slot < 3; slot++) {
    const raw = storage.getItem(`ugr-horario-saved-configs-${slot}`);
    if (raw) all.push(...JSON.parse(raw));
  }
  return all;
}

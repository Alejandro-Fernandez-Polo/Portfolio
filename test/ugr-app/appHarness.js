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
  globalThis.CONVALIDACIONES = [];
  globalThis.PROPUESTAS = [];
  globalThis.PROPUESTAS_INICIALES = [];

  document.body.innerHTML = indexBody();
  globalThis.localStorage.clear();

  const store = options.store || makeStore();
  globalThis.window.__ugrStore = store;

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

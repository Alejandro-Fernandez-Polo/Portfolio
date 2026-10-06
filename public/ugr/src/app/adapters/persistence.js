/**
 * Persistencia residual legacy de `/ugr`.
 *
 * Envuelve SOLO las claves de `localStorage` que hoy conserva `app.js` fuera
 * del store, con claves, formatos, orden y fallbacks idénticos al monolito, de
 * modo que sustituir esas funciones por este adaptador sea invisible para el
 * comportamiento observable. No migra formatos ni mueve datos entre
 * almacenamientos, y no toca dominios propiedad del store (`selection`,
 * `blocks`, `propuestas` del store, `ui.compareIds`, `progress`): esos siguen
 * usando comandos y selectores del store.
 *
 * `storage` es inyectable para tests; si se omite se usa
 * `globalThis.localStorage`. Con storage nulo o indisponible las lecturas
 * devuelven sus defaults y las escrituras se ignoran, sin lanzar: la
 * persistencia residual es mejor esfuerzo y no debe tumbar la acción que la
 * pide.
 */

/** Ranuras de configuraciones guardadas — réplica de `CONFIG_STORAGE_SLOTS` (app.js L26). */
const CONFIG_STORAGE_SLOTS = 3;

const SAVED_CONFIGS_PREFIX = "ugr-horario-saved-configs";
const SOLVER_FILTERS_KEY = "ugr-solver-filters";
const SUBJECTS_KEY = "ugr-horario-subjects";
const SAVED_PROPUESTAS_KEY = "ugr-propuestas-guardadas";
const DEGRADED_STATE_KEY = "ugr-horario-state";

/**
 * Tipos de filtro admitidos al cargar — réplica exacta de `SOLVER_FILTER_TYPES`
 * (app.js L293). Se mantiene local en vez de reutilizar `FILTER_REGISTRY`
 * (src/solver/filters.js) porque el registro acepta además
 * `sameDayTheoryPractice`, que `loadSolverFilters` descarta al leer, y filtrar
 * de otra forma cambiaría el resultado que ven los features. Cuando `app.js`
 * consuma este adaptador la lista canónica deberá vivir en un solo sitio.
 */
const SOLVER_FILTER_TYPES = [
  "freeDays",
  "maxDays",
  "maxMorningDays",
  "maxAfternoonDays",
  "earliestStart",
  "latestEnd",
  "blockGroups",
  "preferTurno",
  "maxGaps",
];

/**
 * Storage por defecto. El getter de `localStorage` puede lanzar (cookies
 * bloqueadas, contexto sin ventana): en ese caso se trata como "sin storage"
 * en vez de romper la composición.
 *
 * @returns {Storage|null}
 */
function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * @param {Storage|null} storage
 * @param {string} key
 * @returns {string|null} crudo, o `null` si no hay storage o no se puede leer
 */
function readRaw(storage, key) {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    // Storage indisponible (sin permisos/modo privado): el caller recibe su
    // default en lugar de una excepción.
    return null;
  }
}

/**
 * Escritura a ciegas: solo garantiza que no lanza por indisponibilidad del
 * storage. No valida el valor (eso es responsabilidad del llamante) y no
 * migra nada.
 *
 * @param {Storage|null} storage
 * @param {string} key
 * @param {string} value
 */
function writeRaw(storage, key, value) {
  if (!storage) return; // sin storage no hay dónde escribir; no debe lanzar
  try {
    storage.setItem(key, value);
  } catch {
    // Cuota llena o modo privado: el monolito dejaba la acción a medias con la
    // excepción sin manejar; aquí el límite de persistencia la absorbe.
  }
}

/**
 * @param {Storage|null} storage
 * @param {string} key
 */
function removeRaw(storage, key) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Igual que la escritura: un storage inoperante no debe romper el flujo.
  }
}

/**
 * Lectura JSON con el mismo fallback que el monolito: ausente o vacío →
 * `fallback`; JSON roto → `fallback` (el dato corrupto se ignora y no tumba el
 * arranque).
 *
 * @param {Storage|null} storage
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function readJson(storage, key, fallback) {
  const raw = readRaw(storage, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {Storage|null} storage
 * @param {string} key
 * @param {*} value
 */
function writeJson(storage, key, value) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch {
    // Valor no serializable (p. ej. referencias circulares): no hay formato que
    // guardar y la acción no debe romperse por eso.
    return;
  }
  writeRaw(storage, key, json);
}

/**
 * Crea el adaptador de persistencia residual. Cada método replica la
 * implementación indicada de `app.js`; ver `src/app/contracts.js` para el
 * contrato completo (`UgrPersistence`).
 *
 * @param {{storage?: Storage}} [options] `storage` omitido →
 *   `globalThis.localStorage`; `null` explícito → desactiva la persistencia
 *   (útil en tests y en contextos sin almacenamiento).
 * @returns {import("../contracts.js").UgrPersistence}
 */
export function createPersistenceAdapter({ storage } = {}) {
  const store = storage === undefined ? defaultStorage() : storage;

  /** @param {number} slot */
  const configKey = (slot) => `${SAVED_CONFIGS_PREFIX}-${slot}`;

  /**
   * Reparte las configuraciones en las tres ranuras. Primero se vacían todas
   * (para que no queden entradas huérfanas al reducir la lista) y después se
   * reparte round-robin, en el mismo orden que `app.js` L46-59.
   *
   * @param {Array} list
   */
  function saveAllConfigs(list) {
    for (let i = 0; i < CONFIG_STORAGE_SLOTS; i++) removeRaw(store, configKey(i));
    const configs = Array.isArray(list) ? list : []; // entrada inválida: no hay nada que repartir
    for (let i = 0; i < configs.length; i++) {
      const key = configKey(i % CONFIG_STORAGE_SLOTS);
      let existing;
      try {
        existing = JSON.parse(readRaw(store, key) || "[]");
      } catch {
        existing = []; // ranura corrupta o carrera con otra pestaña: se reparte desde cero
      }
      if (!Array.isArray(existing)) existing = [];
      existing.push(configs[i]);
      writeJson(store, key, existing);
    }
  }

  /**
   * Concatena en orden de ranura 0→2 e ignora por separado el JSON corrupto:
   * una ranura rota pierde solo sus entradas, no las demás (`app.js` L32-44).
   *
   * @returns {Array}
   */
  function loadSavedConfigs() {
    let all = [];
    for (let i = 0; i < CONFIG_STORAGE_SLOTS; i++) {
      const raw = readRaw(store, configKey(i));
      if (!raw) continue;
      try {
        all = all.concat(JSON.parse(raw));
      } catch {
        // Ranura corrupta ignorada (fallback del monolito).
      }
    }
    return all;
  }

  /**
   * Filtros del solver (`app.js` L2359-2369): array, o `[]` si no está, si el
   * JSON no es un array o si el tipo no es admitido.
   *
   * @returns {Array}
   */
  function loadSolverFilters() {
    const parsed = readJson(store, SOLVER_FILTERS_KEY, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f) => f && SOLVER_FILTER_TYPES.includes(f.type));
  }

  /**
   * @param {Array} filters
   */
  function saveSolverFilters(filters) {
    writeJson(store, SOLVER_FILTERS_KEY, filters);
  }

  /**
   * Snapshot de materias (`app.js` L3601-3612). Devuelve `null` cuando no hay
   * snapshot utilizable (ausente, corrupto o array vacío) para que el llamante
   * conserve sus datos actuales: el monolito solo reemplazaba `SUBJECTS` con un
   * array no vacío. La rama de catálogo (`window.__ugrCatalog`) no es
   * responsabilidad de este adaptador; aquí vive solo el fallback residual.
   *
   * @returns {Array|null}
   */
  function loadSubjects() {
    const parsed = readJson(store, SUBJECTS_KEY, null);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  }

  /**
   * @param {Array} list
   */
  function saveSubjects(list) {
    writeJson(store, SUBJECTS_KEY, list);
  }

  /**
   * Propuestas guardadas internas (`app.js` L62). El monolito las parseaba sin
   * guarda durante la inicialización; aquí un JSON roto o un valor no-array se
   * trata como corrupto y devuelve `[]`, porque este adaptador no puede
   * permitirse tumbar el arranque.
   *
   * @returns {Array}
   */
  function loadSavedPropuestas() {
    const parsed = readJson(store, SAVED_PROPUESTAS_KEY, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * @param {Array} list
   */
  function saveSavedPropuestas(list) {
    writeJson(store, SAVED_PROPUESTAS_KEY, list);
  }

  /**
   * Espejo del estado en modo degradado (`app.js` L399-404). Devuelve `null`
   * si no existe o el JSON está roto, para que el llamante conserve su estado
   * actual (el monolito no fusionaba nada en ese caso). Solo se acepta un
   * objeto plano: cualquier otra forma se trata como espejo corrupto.
   *
   * @returns {Object|null}
   */
  function loadDegradedState() {
    const parsed = readJson(store, DEGRADED_STATE_KEY, null);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  }

  /**
   * Escritura del espejo degradado (`app.js` L383): aquí solo persiste el
   * estado crudo, sin decidir cuándo toca guardar (eso lo decide el llamante
   * según `isStoreAuthoritative()`).
   *
   * @param {Object} state
   */
  function saveDegradedState(state) {
    writeJson(store, DEGRADED_STATE_KEY, state);
  }

  return {
    loadSavedConfigs,
    saveAllConfigs,
    loadSolverFilters,
    saveSolverFilters,
    loadSubjects,
    saveSubjects,
    loadSavedPropuestas,
    saveSavedPropuestas,
    loadDegradedState,
    saveDegradedState,
  };
}

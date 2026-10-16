import { createLegacyDataAdapter } from "./adapters/legacyData.js";
import { createPersistenceAdapter } from "./adapters/persistence.js";
import { timeToMinutes, timesOverlap } from "./domain/schedule.js";
import { calcPropuestaCreditos } from "./domain/proposals.js";
import {
  calculateConfigMetrics,
  calculateConfigDeadHours,
  calculateConfigDays,
  calculateConfigFreeDays,
  findConflicts,
} from "./domain/metrics.js";
import {
  getSubgrupoForApellido,
  buildGroupChoice,
  applyTurnoPreference,
  applyApellidoSubgroups,
} from "./domain/selection.js";
import { buildActiveSchedule, buildConflictSet } from "./domain/calendar.js";
import { buildDocentScores, buildProblem } from "./domain/problem.js";
import { buildProfesorFicha, listProfesores } from "./domain/profesor.js";
import {
  DIFICULTAD_OPCIONES,
  buildProfesorPrompt,
  mergeProfesores,
  normalizeOwnReview,
  ownReviewToProfesor,
  ownReviewsToJSON,
  parseOwnReviewsJSON,
} from "./domain/profesores-propios.js";
import { buildAsignaturaFicha } from "./domain/asignatura.js";
import {
  filterSubjectsByMention,
  listPlanSubjects,
  mencionOptions,
  tipoClave,
  tipoDeAsignatura,
} from "./domain/plan.js";
import {
  isConfigFavorited,
  findDuplicateConfig,
  buildConfigFromState,
  sortSavedConfigs,
  applyConfigToState,
  removeConfigById,
  buildSingleConfigExport,
  buildBatchConfigExport,
  parseConfigImport,
  configFilename,
  isConfigBlocked,
  buildBlockPayload,
  selectVisibleConfigs,
  paginateConfigs,
} from "./domain/configs.js";

/**
 * Composición de la app `/ugr`.
 *
 * Recibe TODO por argumento (store, catálogo, solver, progreso, datos clásicos,
 * storage, raíz DOM y flag degradado) y construye los dos adaptadores de
 * frontera: el módulo no toca `window`, `localStorage` ni globals por nombre,
 * de modo que la misma composición puede montarse en el navegador o probarse
 * con dependencias de mentira.
 *
 * Todavía no hay features que montar (los bloques siguientes irán entrando en
 * `mount()`), pero el ciclo de vida ya es el definitivo: `mount()` es
 * idempotente, `destroy()` drena el registro de teardown y ambos pueden
 * repetirse, porque devtools permite reiniciar `init()` sin duplicar nada.
 *
 * @param {import("./contracts.js").UgrAppDependencies} dependencies
 * @returns {{deps: Object, isMounted: () => boolean, mount: () => void, destroy: () => void}}
 */
export function createUgrApp(dependencies) {
  const input = dependencies || {};

  // `legacyData` llega como referencias/thunks crudos (el monolito resuelve
  // `SUBJECTS` y compañía en el momento de cada lectura) y `persistence` como
  // opciones de storage; los adaptadores encapsulan esos formatos.
  const legacyData = createLegacyDataAdapter(input.legacyData || {});
  const persistence = createPersistenceAdapter(input.persistence || {});

  const deps = {
    store: input.store,
    catalog: input.catalog,
    solver: input.solver,
    progress: input.progress,
    legacyData,
    persistence,
    // Reglas puras de dominio: el IIFE clásico `app.js` no puede importar ESM
    // y delega aquí en lugar de duplicar la implementación. `metrics.js` añade
    // métricas de configuración y conflictos; `selection.js`/`calendar.js` la
    // selección, la regla por apellido y el horario activo; `configs.js` las
    // reglas puras de las configuraciones guardadas (búsqueda, orden, objeto
    // persistible, aplicar una config al estado, borrar por id, export/import,
    // evaluación de bloqueos y construcción del payload de `blocks/add` —el
    // almacenamiento de los bloqueos sigue en el store, que inyecta el
    // llamante— y el pipeline puro de listado que usa `renderSavedConfigs`);
    // `problem.js` construye el problema del solver (cuatrimestre, superadas,
    // puntuaciones de profesor y modo profesores). Los `subjects`/lookups
    // concretos los inyecta el llamante en cada invocación.
    domain: {
      timeToMinutes,
      timesOverlap,
      calcPropuestaCreditos,
      calculateConfigMetrics,
      calculateConfigDeadHours,
      calculateConfigDays,
      calculateConfigFreeDays,
      findConflicts,
      getSubgrupoForApellido,
      buildGroupChoice,
      applyTurnoPreference,
      applyApellidoSubgroups,
      buildActiveSchedule,
      buildConflictSet,
      buildDocentScores,
      buildProblem,
      buildProfesorFicha,
      listProfesores,
      DIFICULTAD_OPCIONES,
      normalizeOwnReview,
      parseOwnReviewsJSON,
      ownReviewToProfesor,
      mergeProfesores,
      ownReviewsToJSON,
      buildProfesorPrompt,
      buildAsignaturaFicha,
      mencionOptions,
      filterSubjectsByMention,
      tipoDeAsignatura,
      tipoClave,
      listPlanSubjects,
      isConfigFavorited,
      findDuplicateConfig,
      buildConfigFromState,
      sortSavedConfigs,
      applyConfigToState,
      removeConfigById,
      buildSingleConfigExport,
      buildBatchConfigExport,
      parseConfigImport,
      configFilename,
      isConfigBlocked,
      buildBlockPayload,
      selectVisibleConfigs,
      paginateConfigs,
    },
    root: input.root,
    degraded: !!input.degraded,
  };

  // Registro único de limpiezas (listeners, suscripciones, timers). Vacío hoy:
  // cada feature registrado en `mount()` añadirá aquí su cleanup para que
  // `destroy()` sea el único desmontaje, sin que la composición conozca a los
  // features de antemano.
  const teardowns = new Set();
  let mounted = false;

  /**
   * @param {() => void} fn cleanup idempotente de un feature/suscripción
   */
  function addTeardown(fn) {
    if (typeof fn === "function") teardowns.add(fn);
  }

  function runTeardowns() {
    for (const fn of teardowns) {
      try {
        fn();
      } catch (err) {
        // Un cleanup roto no debe impedir desmontar el resto ni marcar la
        // instancia como desmontada.
        console.error("[ugr] error en teardown", err);
      }
    }
    teardowns.clear();
  }

  /**
   * Monta la app. No-op mientras no haya features: existe para que el ciclo
   * `mount`/`destroy` sea consumible desde el primer bloque y para que un
   * segundo `mount()` sin `destroy()` intermedio no duplique nada.
   */
  function mount() {
    if (mounted) return;
    mounted = true;
  }

  /**
   * Desmonta todo lo que `mount()` haya instalado. Idempotente: una segunda
   * llamada no re-ejecuta teardowns ya vaciados. Tras desmontar se puede volver
   * a montar la misma instancia (reinicio desde devtools).
   */
  function destroy() {
    runTeardowns();
    mounted = false;
  }

  function isMounted() {
    return mounted;
  }

  return {
    deps,
    isMounted,
    mount,
    destroy,
  };
}

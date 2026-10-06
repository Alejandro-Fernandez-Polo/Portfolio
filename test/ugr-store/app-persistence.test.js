import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { reducer, initialState } from "../../public/ugr/src/store/reducer.js";
import { timeToMinutes, timesOverlap } from "../../public/ugr/src/app/domain/schedule.js";
import { calcPropuestaCreditos } from "../../public/ugr/src/app/domain/proposals.js";
import {
  calculateConfigMetrics,
  calculateConfigDeadHours,
  calculateConfigDays,
  findConflicts,
} from "../../public/ugr/src/app/domain/metrics.js";
import {
  getSubgrupoForApellido,
  buildGroupChoice,
  applyTurnoPreference,
  applyApellidoSubgroups,
} from "../../public/ugr/src/app/domain/selection.js";
import { buildActiveSchedule, buildConflictSet } from "../../public/ugr/src/app/domain/calendar.js";
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
} from "../../public/ugr/src/app/domain/configs.js";

// Contrato de persistencia C3 de public/ugr/app.js: el store (IDB) es la capa
// de persistencia, `localStorage['ugr-horario-state']` queda como fallback
// degradado/pre-migración, y ningún estado por defecto puede pisar datos ya
// migrados durante el arranque.
//
// app.js es un IIFE de script clásico sin imports: aquí se ejecuta con stubs
// de los globals de navegador que toca al cargar (no hay jsdom en el repo y no
// se pueden añadir dependencias). El store real se sustituye por un fake que
// usa el reducer de verdad, que es lo que define el comportamiento a testear.
const APP_PATH = fileURLToPath(new URL("../../public/ugr/app.js", import.meta.url));

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function makeLocalStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

function makeStore(seed) {
  let state = seed ? { ...initialState, ...seed } : initialState;
  const subs = new Set();
  return {
    getState: () => state,
    dispatch: (cmd) => {
      const ns = reducer(state, cmd);
      if (ns !== state) {
        state = ns;
        for (const h of subs) h(state);
      }
    },
    subscribe: (h) => {
      subs.add(h);
      return () => subs.delete(h);
    },
  };
}

// Store "migrado": lo que migrateLegacy deja en IDB tras mover un
// ugr-horario-state existente.
const MIGRATED = {
  profile: { apellido: "García", turnoPreferente: "mañana" },
  selection: {
    cuatrimestreActivo: 2,
    selectedSubjects: { FFT: true },
    groupChoices: { FFT: { teoria: "A", practica: "A1" } },
  },
  propuestas: {
    items: [{ id: "p-store", mappings: [], totalCreditos: 0 }],
    activeId: "p-store",
    vista: "oficial",
  },
  ui: { ...initialState.ui, compareIds: ["cfg-1"] },
};

const ESPEJO = {
  apellido: "EspejoViejo",
  turnoPreferente: "indiferente",
  selectedSubjects: { ED: true },
  groupChoices: {},
  cuatrimestreActivo: 1,
  propuestas: [{ id: "p-espejo", mappings: [], totalCreditos: 0 }],
  propuestaActivaId: "p-espejo",
  vistaConvalidaciones: "oficial",
};

// Cada test re-evalúa el IIFE para que `state`/`stateHydrated` arranquen de
// cero. Se evalúa con `new Function` en lugar de `import()`: Vite rechaza
// transformar public/ugr/app.js en contexto de test (vite:import-analysis)
// porque su import('/ugr/src/share/shareCrypto.js') apunta a un JS bajo
// public/, que solo puede cargarse por <script>. El IIFE no tiene imports
// estáticos, así que se ejecuta tal cual contra los globals de arriba.
function bootApp({ store = null, degraded = false, mirror, mirrorStr = null } = {}) {
  const entries = {};
  if (mirrorStr !== null) entries["ugr-horario-state"] = mirrorStr;
  else if (mirror) entries["ugr-horario-state"] = JSON.stringify(mirror);
  const localStorage = makeLocalStorage(entries);
  defineGlobal("localStorage", localStorage);
  // data.js define SUBJECTS, propuestas.js PROPUESTAS_INICIALES y
  // convalidaciones.js CONVALIDACIONES como globals de script: se simulan aquí.
  defineGlobal("SUBJECTS", []);
  defineGlobal("PROPUESTAS_INICIALES", [{ id: "p-init", mappings: [], totalCreditos: 0 }]);
  defineGlobal("CONVALIDACIONES", []);

  const windowObj = {
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  };
  if (store) windowObj.__ugrStore = store;
  if (degraded) windowObj.__ugrDegraded = true;
  // Reglas de dominio (T02.x + B3-a + B4-a/B4-b): `loadState()`/`updateAll()`
  // y las funciones de selección/calendario/configuraciones delegan en
  // `getDomain()`, que en producción las recibe de la composición ESM
  // (`deps.domain`). Aquí no se monta la composición, así que se inyecta el
  // MISMO módulo ESM real por el escape hatch, con el dominio completo
  // (27 funciones), sin duplicar nada.
  windowObj.__ugrAppDomain = {
    timeToMinutes,
    timesOverlap,
    calcPropuestaCreditos,
    calculateConfigMetrics,
    calculateConfigDeadHours,
    calculateConfigDays,
    findConflicts,
    getSubgrupoForApellido,
    buildGroupChoice,
    applyTurnoPreference,
    applyApellidoSubgroups,
    buildActiveSchedule,
    buildConflictSet,
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
  };
  defineGlobal("window", windowObj);
  defineGlobal("document", {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  });

  new Function(readFileSync(APP_PATH, "utf8"))();
  return { legacy: windowObj.__ugrLegacy, window: windowObj, localStorage };
}

describe("app.js (C3): el store es la persistencia", () => {
  beforeEach(() => {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.SUBJECTS;
    delete globalThis.PROPUESTAS_INICIALES;
    delete globalThis.CONVALIDACIONES;
    delete globalThis.document;
  });

  it("antes de hidratar, ningún push llega al store (el estado por defecto no pisa lo migrado)", async () => {
    const store = makeStore(MIGRATED);
    const { legacy, localStorage } = await bootApp({ store });

    // Camino real: saveState() es alcanzable antes de terminar el arranque
    // (p. ej. desde la sincronización de catálogo). Sin hidratar, debe ser no-op.
    legacy.saveState();

    expect(store.getState().selection.selectedSubjects).toEqual({ FFT: true });
    expect(store.getState().profile.apellido).toBe("García");
    expect(store.getState().propuestas.items).toHaveLength(1);
    expect(localStorage.getItem("ugr-horario-state")).toBeNull();
  });

  it("loadState() hidrata perfil/selección/propuestas/compareIds desde el store y el espejo no gana", async () => {
    const store = makeStore(MIGRATED);
    const espejoStr = JSON.stringify(ESPEJO);
    const { legacy, localStorage } = await bootApp({ store, mirror: ESPEJO });

    legacy.loadState();
    const s = legacy.getState();
    expect(s.apellido).toBe("García");
    expect(s.turnoPreferente).toBe("mañana");
    expect(s.selectedSubjects).toEqual({ FFT: true });
    expect(s.cuatrimestreActivo).toBe(2);
    expect(s.propuestas.map((p) => p.id)).toEqual(["p-store"]);

    legacy.saveState();
    // compareIds hidratado: si no lo estuviera, el push enviaría [] y lo borraría.
    expect(store.getState().ui.compareIds).toEqual(["cfg-1"]);
    // Modo normal: el espejo no se reescribe (queda retirado, solo fallback).
    expect(localStorage.getItem("ugr-horario-state")).toBe(espejoStr);
  });

  it("store virgen (pre-migración) → fallback a localStorage", async () => {
    const store = makeStore();
    const { legacy } = await bootApp({ store, mirror: ESPEJO });

    legacy.loadState();
    const s = legacy.getState();
    expect(s.apellido).toBe("EspejoViejo");
    expect(s.selectedSubjects).toEqual({ ED: true });
    expect(s.propuestas.map((p) => p.id)).toEqual(["p-espejo"]);
  });

  it("modo degradado: saveState() escribe el espejo aunque el store exista en memoria", async () => {
    const store = makeStore(MIGRATED);
    const degradado = { ...ESPEJO, apellido: "Degradado" };
    const { legacy, localStorage } = await bootApp({ store, degraded: true, mirror: degradado });

    legacy.loadState();
    expect(legacy.getState().apellido).toBe("Degradado");

    localStorage.removeItem("ugr-horario-state");
    legacy.saveState();

    const written = JSON.parse(localStorage.getItem("ugr-horario-state"));
    expect(written.apellido).toBe("Degradado");
    // El store en memoria no es persistible: no debe ser la vía de guardado.
    expect(store.getState().profile.apellido).toBe("García");
  });

  it("modo normal: saveState() no toca el espejo y persiste en el store", async () => {
    const store = makeStore();
    const espejoStr = JSON.stringify(ESPEJO);
    const { legacy, localStorage } = await bootApp({ store, mirrorStr: espejoStr });

    legacy.loadState();
    expect(legacy.getState().apellido).toBe("EspejoViejo");

    legacy.saveState();

    expect(localStorage.getItem("ugr-horario-state")).toBe(espejoStr);
    expect(store.getState().profile.apellido).toBe("EspejoViejo");
    expect(store.getState().selection.selectedSubjects).toEqual({ ED: true });
  });

  it("sin store (bootstrap no cargó) → localStorage sigue siendo la persistencia", async () => {
    const { legacy, localStorage } = await bootApp({ mirror: ESPEJO });

    legacy.loadState();
    expect(legacy.getState().apellido).toBe("EspejoViejo");

    localStorage.removeItem("ugr-horario-state");
    legacy.saveState();

    const written = JSON.parse(localStorage.getItem("ugr-horario-state"));
    expect(written.apellido).toBe("EspejoViejo");
    expect(written.selectedSubjects).toEqual({ ED: true });
  });

  it("init() ordena hidratar → suscribir → push (invariante de arranque)", () => {
    const src = readFileSync(APP_PATH, "utf8");
    const start = src.indexOf("async function init()");
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf("\n  }", start));
    const at = (needle) => {
      const i = body.indexOf(needle);
      expect(i, `init() debe contener ${needle}`).toBeGreaterThan(-1);
      return i;
    };
    expect(at("loadState();")).toBeLessThan(at("ensureProfileStoreSubscription();"));
    expect(at("loadState();")).toBeLessThan(at("pushProfileToStore();"));
    expect(at("loadState();")).toBeLessThan(at("pushSelectionToStore();"));
    expect(at("loadState();")).toBeLessThan(at("pushPropuestasToStore();"));
    expect(at("loadState();")).toBeLessThan(at("pushCompareIdsToStore();"));
  });
});

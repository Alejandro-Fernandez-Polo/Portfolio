import { describe, it, expect, beforeEach, vi } from "vitest";

// Solo se mockea db.js: en vitest, migrateLegacy.js (dentro de public/) y este
// test resuelven instancias distintas de store/commands.js, así que el
// `dispatch` de la migración no es observable desde aquí (en producción
// bootstrap y migrateLegacy comparten el módulo). Por eso este fichero cubre
// el contrato C3 de la migración sin depender del estado en memoria del store:
//   - buildPlan sigue traduciendo el espejo a comandos (fuente de verdad),
//   - run() ejecuta la transacción one-time y marca el meta,
//   - el espejo ugr-horario-state NO se reescribe (scheduleDoubleWrite retirado),
//   - cleanupLegacy/resetLegacy retiran exactamente las LEGACY_KEYS.
vi.mock("../../public/ugr/src/store/db.js", () => ({
  open: vi.fn(async () => ({ ok: true })),
  isAvailable: vi.fn(() => true),
  getStoreMode: vi.fn(() => "ready"),
  get: vi.fn(async (store, key) => {
    if (store === "meta") return globalThis.__ugrTestMeta.get(key);
    // verify() solo exige que exista un userState (y la comparación de
    // selección se salta cuando el espejo no trae selectedSubjects).
    if (store === "userState" && key === "current") return { selection: { selectedSubjects: {} } };
    return undefined;
  }),
  put: vi.fn(async (store, value) => {
    if (store === "meta") globalThis.__ugrTestMeta.set(value.key, value);
  }),
  del: vi.fn(async () => undefined),
  getAll: vi.fn(async () => []),
  byIndex: vi.fn(async () => []),
  transact: vi.fn(async (_stores, fn) => fn()),
  close: vi.fn(),
  stats: vi.fn(async () => null),
}));

import * as legacyKeys from "../../public/ugr/src/migrate/legacyKeys.js";
import { run, resetLegacy } from "../../public/ugr/src/migrate/migrateLegacy.js";

function makeLocalStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

// Espejo completo: es lo que buildPlan debe convertir en comandos del store.
const LEGACY_STATE = {
  selectedSubjects: { FFT: true, ED: true },
  groupChoices: { FFT: { teoria: "A", practica: "A1" } },
  apellido: "García",
  turnoPreferente: "mañana",
  cuatrimestreActivo: 2,
  propuestas: [{ id: "p-legacy", mappings: [], totalCreditos: 0 }],
  propuestaActivaId: "p-legacy",
  vistaConvalidaciones: "oficial",
};

// Espejo de arranque sin selección: verify() solo compara selectedSubjects si
// el espejo la trae, así la transacción one-time se ejercita entera (snapshot →
// buildPlan → transact → verify → markMigration) sin depender de la instancia
// de commands.js que ve migrateLegacy.
const ESPEJO_SIN_SELECCION = {
  apellido: "García",
  turnoPreferente: "mañana",
  cuatrimestreActivo: 1,
  propuestas: [{ id: "p-legacy", mappings: [], totalCreditos: 0 }],
  propuestaActivaId: "p-legacy",
  vistaConvalidaciones: "oficial",
};

beforeEach(() => {
  globalThis.__ugrTestMeta = new Map();
  globalThis.localStorage = makeLocalStorage({
    "ugr-horario-state": JSON.stringify(ESPEJO_SIN_SELECCION),
    "ugr-propuestas": JSON.stringify(LEGACY_STATE.propuestas),
  });
  globalThis.window = {
    __ugrLegacy: { dispatch: vi.fn(), getState: () => ({ marker: "rewritten" }) },
  };
});

describe("migración one-time ugr-horario-state → store (sin doble escritura)", () => {
  it("buildPlan sigue traduciendo el espejo a comandos del store", () => {
    const plan = legacyKeys.buildPlan({ "ugr-horario-state": LEGACY_STATE });
    const types = plan.commands.map((c) => c.type);
    expect(types).toContain("profile/setApellido");
    expect(types).toContain("profile/setTurno");
    expect(types).toContain("selection/setAll");
    expect(types).toContain("selection/setGroups");
    expect(types).toContain("propuestas/setAll");
    expect(plan.commands.find((c) => c.type === "profile/setApellido").payload.apellido).toBe("García");
    expect(plan.commands.find((c) => c.type === "selection/setAll").payload.selectedSubjects).toEqual({
      FFT: true,
      ED: true,
    });
  });

  it("run() ejecuta la migración one-time sin reescribir el espejo ni enganchar doble escritura", async () => {
    const espejoAntes = globalThis.localStorage.getItem("ugr-horario-state");
    const dispatchOriginal = globalThis.window.__ugrLegacy.dispatch;

    const result = await run();

    expect(result.ok).toBe(true);
    expect(result.migrated.propuestas).toBe(1);
    // La transacción completó y dejó la marca de migración aplicada.
    expect(globalThis.__ugrTestMeta.has("migration:legacy-v1")).toBe(true);

    // El espejo no se reescribe desde el store.
    expect(globalThis.localStorage.getItem("ugr-horario-state")).toBe(espejoAntes);
    // scheduleDoubleWrite fue retirado: nadie envuelve el dispatch legacy para
    // copiar el estado a localStorage.
    expect(globalThis.window.__ugrLegacy.dispatch).toBe(dispatchOriginal);
    expect(legacyKeys.scheduleDoubleWrite).toBeUndefined();
    expect(legacyKeys.saveToLegacy).toBeUndefined();
  });

  it("segunda ejecución es un no-op (migración marcada como aplicada)", async () => {
    const first = await run();
    expect(first.ok).toBe(true);
    const espejoAntes = globalThis.localStorage.getItem("ugr-horario-state");

    const second = await run();

    expect(second.skipped).toBe(true);
    expect(globalThis.localStorage.getItem("ugr-horario-state")).toBe(espejoAntes);
  });

  it("cleanupLegacy y resetLegacy retiran exactamente las claves LEGACY_KEYS", async () => {
    expect(legacyKeys.LEGACY_KEYS.map((k) => k.key)).toContain("ugr-horario-state");

    legacyKeys.cleanupLegacy();
    for (const { key } of legacyKeys.LEGACY_KEYS) {
      expect(globalThis.localStorage.getItem(key), key).toBeNull();
    }

    globalThis.localStorage.setItem("ugr-horario-state", "reincrustado");
    resetLegacy();
    expect(globalThis.localStorage.getItem("ugr-horario-state")).toBeNull();
  });
});

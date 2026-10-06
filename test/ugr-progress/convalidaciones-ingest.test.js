import { describe, it, expect, beforeEach, vi } from "vitest";

// db.js y commands.js se mockean: la ingesta toca IndexedDB (marcador en meta)
// y el store, que en node no existen. El mock de commands usa el reducer real
// para que el despacho de progress/setEquivalenceEstados ejecute el contrato
// de verdad (mismo patrón que test/ugr-modules/progress.test.js).
vi.mock("../../public/ugr/src/store/db.js", () => ({
  open: vi.fn(() => Promise.resolve({ ok: true })),
  isAvailable: vi.fn(() => true),
  getStoreMode: vi.fn(() => "ready"),
  get: vi.fn(() => Promise.resolve(undefined)),
  put: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  getAll: vi.fn(() => Promise.resolve([])),
  byIndex: vi.fn(() => Promise.resolve([])),
  transact: vi.fn((_stores, fn) => fn()),
  close: vi.fn(),
  stats: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../../public/ugr/src/store/commands.js", async () => {
  const { reducer, initialState } = await vi.importActual("../../public/ugr/src/store/reducer.js");
  let state = initialState;
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
    initStore: async () => state,
    flush: async () => {},
    getDeviceId: () => "test-device",
    // Reset del estado entre tests: el mock comparte `state` a nivel de módulo.
    reset: () => {
      state = initialState;
    },
  };
});

import { ingestConvalidacionesEstados } from "../../public/ugr/src/migrate/convalidacionesEstados.js";
import { getEquivalenceEstados } from "../../public/ugr/src/store/selectors.js";
import * as db from "../../public/ugr/src/store/db.js";
import * as commands from "../../public/ugr/src/store/commands.js";

// Entradas con la forma de CONVALIDACIONES (convalidaciones.js): el id NO es
// el código UGR, se resuelve contra este array.
const CONVALIDACIONES = [
  { id: "011013-FFT", origen: "UNED", uned: { codigo: "011013" }, ugr: { codigo: "FFT" }, creditos: 6 },
  { id: "FP-COMBINADA", origen: "UNED+GS", uned: { codigo: "901020" }, ugr: { codigo: "FP" }, creditos: 6 },
];

function setLegacy(value) {
  globalThis.localStorage = {
    _v: value,
    getItem() {
      return this._v;
    },
    setItem(k, v) {
      this._v = v;
    },
    removeItem() {
      this._v = null;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  commands.reset();
  globalThis.CONVALIDACIONES = CONVALIDACIONES;
  db.isAvailable.mockReturnValue(true);
  db.get.mockResolvedValue(undefined);
  db.put.mockResolvedValue(undefined);
});

describe("ingestConvalidacionesEstados: ingesta legacy → store", () => {
  it("vuelca ugr-convalidaciones a progress.equivalences con upsert por id", async () => {
    setLegacy(JSON.stringify({
      "011013-FFT": { estado: "concedida" },
      "FP-COMBINADA": { estado: "pendiente" },
    }));
    const res = await ingestConvalidacionesEstados();
    expect(res.ok).toBe(true);
    expect(res.ingested).toBe(2);
    const eq = commands.getState().progress.equivalences;
    expect(eq).toHaveLength(2);
    expect(eq[0]).toMatchObject({ id: "011013-FFT", estado: "concedida" });
    expect(eq[1]).toMatchObject({ id: "FP-COMBINADA", estado: "pendiente" });
  });

  it("no ingresa nada si la clave legacy está vacía", async () => {
    setLegacy(null);
    const res = await ingestConvalidacionesEstados();
    expect(res.ok).toBe(true);
    expect(res.ingested).toBe(0);
    expect(commands.getState().progress.equivalences).toHaveLength(0);
  });

  it("descarta estados inválidos y ids sin entrada en CONVALIDACIONES", async () => {
    setLegacy(JSON.stringify({
      "011013-FFT": { estado: " CONCEDIDA " },
      "X-ROTA": { estado: "aprobada" },
      "SIN-ENTRADA": { estado: "solicitada" },
    }));
    const res = await ingestConvalidacionesEstados();
    expect(res.ingested).toBe(1);
    const eq = commands.getState().progress.equivalences;
    expect(eq).toHaveLength(1);
    expect(eq[0]).toMatchObject({ id: "011013-FFT", estado: "concedida" });
  });

  it("no ingresa nada sin el array CONVALIDACIONES", async () => {
    globalThis.CONVALIDACIONES = undefined;
    setLegacy(JSON.stringify({ "011013-FFT": { estado: "concedida" } }));
    const res = await ingestConvalidacionesEstados();
    expect(res.skipped).toBe("sin CONVALIDACIONES");
    expect(commands.getState().progress.equivalences).toHaveLength(0);
  });
});

describe("ingestConvalidacionesEstados: idempotencia", () => {
  it("no repite la ingesta cuando el marcador ya está (una vez)", async () => {
    setLegacy(JSON.stringify({ "011013-FFT": { estado: "concedida" } }));
    db.get.mockResolvedValue({ key: "migration:convalidaciones-estados-v1" });
    const res = await ingestConvalidacionesEstados();
    expect(res.skipped).toBe(true);
    expect(res.ingested).toBe(0);
    expect(commands.getState().progress.equivalences).toHaveLength(0);
  });

  it("en modo degradado ingesta sin consultar el marcador", async () => {
    db.isAvailable.mockReturnValue(false);
    setLegacy(JSON.stringify({ "011013-FFT": { estado: "concedida" } }));
    const res = await ingestConvalidacionesEstados();
    expect(res.ok).toBe(true);
    expect(res.degraded).toBe(true);
    expect(res.ingested).toBe(1);
    expect(db.get).not.toHaveBeenCalled();
    expect(commands.getState().progress.equivalences[0]).toMatchObject({
      id: "011013-FFT",
      estado: "concedida",
    });
  });
});

describe("selector getEquivalenceEstados", () => {
  it("devuelve el mapa { [id]: estado } desde el store", async () => {
    setLegacy(JSON.stringify({
      "011013-FFT": { estado: "concedida" },
      "FP-COMBINADA": { estado: "solicitada" },
    }));
    await ingestConvalidacionesEstados();
    expect(getEquivalenceEstados()).toEqual({
      "011013-FFT": "concedida",
      "FP-COMBINADA": "solicitada",
    });
  });

  it("ignora entradas sin estado válido", () => {
    commands.dispatch({
      type: "progress/setEquivalenceEstados",
      payload: { entries: [{ id: "A", estado: "concedida" }, { id: "B", estado: "rota" }] },
    });
    expect(getEquivalenceEstados()).toEqual({ A: "concedida" });
  });
});

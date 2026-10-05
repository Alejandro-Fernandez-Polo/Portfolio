import { describe, it, expect } from "vitest";

// Humo de importación REAL: este test no mockea db.js ni commands.js, así que
// parsea y ejecuta el módulo del store con su Dexie de verdad. Los tests que
// mockean commands.js (bundle, progress module) no cubrirían un error de
// sintaxis aquí —que en el navegador rompería todo el bootstrap de /ugr—.
import * as commands from "../../public/ugr/src/store/commands.js";
import { initialState } from "../../public/ugr/src/store/reducer.js";

const API = [
  "initStore",
  "getState",
  "dispatch",
  "subscribe",
  "flush",
  "applyCommandsInTransaction",
  "getDeviceId",
];

describe("store/commands.js: import real (humo de sintaxis)", () => {
  it("exporta toda la fachada del store", () => {
    for (const name of API) {
      expect(typeof commands[name], name).toBe("function");
    }
  });

  it("getState es null antes de initStore (sin estado hidratado)", () => {
    expect(commands.getState()).toBeNull();
  });

  it("dispatch sin hidratar es un no-op y no lanza", () => {
    expect(() => commands.dispatch({ type: "progress/setStatus", payload: { code: "FFT", status: "sup" } })).not.toThrow();
    expect(commands.getState()).toBeNull();
  });

  it("subscribe registra y devuelve su desuscripción", () => {
    const off = commands.subscribe(() => {});
    expect(typeof off).toBe("function");
    expect(off()).toBe(true);
  });

  it("el initialState del reducer trae progress a plena forma (contrato que normalizeProgress respeta)", () => {
    expect(initialState.progress).toEqual({ credits: {}, equivalences: [], plan: { totalECTS: 240 } });
  });
});

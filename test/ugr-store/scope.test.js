import { describe, it, expect } from "vitest";

import {
  DEFAULT_SCOPE,
  SCOPE_PERSONAL,
  SCOPE_SAMPLE,
  SCOPES,
  filterByScope,
  initialScope,
  isScope,
  normalizeScope,
  otherScope,
  reviewId,
  scopeOfRow,
  scopeOfUserStateKey,
  userStateKey,
} from "../../public/ugr/src/store/scope.js";
import { createPersistenceAdapter } from "../../public/ugr/src/app/adapters/persistence.js";

// Los dos mundos: lo que alguien hace probando la app con datos de ejemplo no
// puede aparecer en sus datos personales, ni al revés. Estas pruebas fijan las
// dos reglas que lo sostienen: cada documento/fila sabe su mundo, y lo que no
// lo dice es personal (nunca se esconde lo que el usuario ya tenía).

describe("scope: vocabulario", () => {
  it("declara los dos mundos y arranca en la muestra", () => {
    expect(SCOPES).toEqual([SCOPE_SAMPLE, SCOPE_PERSONAL]);
    expect(DEFAULT_SCOPE).toBe(SCOPE_SAMPLE);
  });

  it("reconoce solo los dos nombres", () => {
    expect(isScope("sample")).toBe(true);
    expect(isScope("personal")).toBe(true);
    expect(isScope("otro")).toBe(false);
    expect(isScope(undefined)).toBe(false);
  });

  it("lo que no se reconoce cae en personal", () => {
    expect(normalizeScope("muestra")).toBe(SCOPE_PERSONAL);
    expect(normalizeScope(null)).toBe(SCOPE_PERSONAL);
  });

  it("el otro mundo es el que no se pidió", () => {
    expect(otherScope("sample")).toBe("personal");
    expect(otherScope("personal")).toBe("sample");
    expect(otherScope("basura")).toBe("sample");
  });
});

describe("scope: con qué mundo arranca un navegador", () => {
  it("estrena en la muestra", () => {
    expect(initialScope()).toBe(SCOPE_SAMPLE);
    expect(initialScope({ hasPersonalState: false })).toBe(SCOPE_SAMPLE);
  });

  it("quien ya tenía datos personales se queda en ellos", () => {
    expect(initialScope({ hasPersonalState: true })).toBe(SCOPE_PERSONAL);
  });
});

describe("scope: documentos y filas", () => {
  it("cada mundo tiene su documento de userState", () => {
    expect(userStateKey(SCOPE_SAMPLE)).toBe("sample");
    expect(userStateKey(SCOPE_PERSONAL)).toBe("current");
    expect(scopeOfUserStateKey("sample")).toBe(SCOPE_SAMPLE);
    expect(scopeOfUserStateKey("current")).toBe(SCOPE_PERSONAL);
  });

  it("una fila sin mundo es personal (los datos anteriores a los mundos)", () => {
    expect(scopeOfRow({ id: 1 })).toBe(SCOPE_PERSONAL);
    expect(scopeOfRow({ id: 1, scope: "sample" })).toBe("sample");
    expect(scopeOfRow(null)).toBe(SCOPE_PERSONAL);
  });

  it("filtrar no deja pasar nada del otro mundo", () => {
    const filas = [
      { id: 1, scope: "sample" },
      { id: 2, scope: "personal" },
      { id: 3 },
    ];
    expect(filterByScope(filas, "sample").map((f) => f.id)).toEqual([1]);
    expect(filterByScope(filas, "personal").map((f) => f.id)).toEqual([2, 3]);
    expect(filterByScope(null, "sample")).toEqual([]);
  });

  it("la clave de una valoración lleva el mundo delante", () => {
    expect(reviewId("personal", "SO|teoria|Lastra")).toBe("personal|SO|teoria|Lastra");
    expect(reviewId("sample", "SO|teoria|Lastra")).not.toBe(
      reviewId("personal", "SO|teoria|Lastra"),
    );
  });
});

/** Almacenamiento de mentira, solo para lo que se escribe. */
function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
    leerTodo: () => [...data.values()].flatMap((v) => JSON.parse(v)),
  };
}

describe("configuraciones guardadas por mundo", () => {
  it("cada mundo lee solo lo suyo, aunque compartan ranuras", () => {
    const storage = fakeStorage();
    let scope = "sample";
    const adapter = createPersistenceAdapter({ storage, getScope: () => scope });

    adapter.saveAllConfigs([{ id: "s1", name: "de muestra" }]);
    scope = "personal";
    adapter.saveAllConfigs([{ id: "p1", name: "personal" }]);

    expect(adapter.loadSavedConfigs().map((c) => c.id)).toEqual(["p1"]);
    scope = "sample";
    expect(adapter.loadSavedConfigs().map((c) => c.id)).toEqual(["s1"]);
  });

  it("guardar en un mundo no borra lo del otro", () => {
    const storage = fakeStorage();
    let scope = "personal";
    const adapter = createPersistenceAdapter({ storage, getScope: () => scope });

    adapter.saveAllConfigs([{ id: "p1" }]);
    scope = "sample";
    adapter.saveAllConfigs([{ id: "s1" }, { id: "s2" }]);
    scope = "personal";

    expect(adapter.loadSavedConfigs().map((c) => c.id)).toEqual(["p1"]);
    expect(storage.leerTodo().map((c) => c.id).sort()).toEqual(["p1", "s1", "s2"]);
  });

  it("borrar todas vacía solo el mundo activo", () => {
    const storage = fakeStorage();
    let scope = "sample";
    const adapter = createPersistenceAdapter({ storage, getScope: () => scope });

    adapter.saveAllConfigs([{ id: "s1" }]);
    scope = "personal";
    adapter.saveAllConfigs([{ id: "p1" }]);
    adapter.clearSavedConfigs();
    expect(adapter.loadSavedConfigs()).toEqual([]);

    scope = "sample";
    expect(adapter.loadSavedConfigs().map((c) => c.id)).toEqual(["s1"]);
  });

  it("las configuraciones anteriores a los mundos se leen como personales", () => {
    const storage = fakeStorage();
    // Formato antiguo: sin `scope` en las filas.
    storage.setItem("ugr-horario-saved-configs-0", JSON.stringify([{ id: "vieja" }]));
    const adapter = createPersistenceAdapter({ storage, getScope: () => "personal" });
    expect(adapter.loadSavedConfigs().map((c) => c.id)).toEqual(["vieja"]);
  });

  it("sin getScope todo cuenta como personal (comportamiento anterior)", () => {
    const storage = fakeStorage();
    const adapter = createPersistenceAdapter({ storage });
    adapter.saveAllConfigs([{ id: "a" }]);
    expect(adapter.loadSavedConfigs().map((c) => c.id)).toEqual(["a"]);
  });
});

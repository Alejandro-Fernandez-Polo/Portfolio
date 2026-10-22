import { describe, it, expect, vi } from "vitest";

import { createScopeMode, setupScopeMode } from "../../public/ugr/src/ui/scope-mode.js";

// El conmutador de mundo: pinta el aviso de que lo que se ve es la muestra y
// pide el cambio al store. Al cambiar, la página se recarga (las vistas
// rehidratan su copia desde el documento del otro mundo).

function makeElement(id) {
  const listeners = {};
  return {
    id,
    textContent: "",
    hidden: false,
    disabled: false,
    dataset: {},
    addEventListener(tipo, fn) {
      (listeners[tipo] = listeners[tipo] || []).push(fn);
    },
    click() {
      (listeners.click || []).forEach((fn) => fn());
    },
  };
}

function makeDoc(ids) {
  const mapa = {};
  for (const id of ids) mapa[id] = makeElement(id);
  return { mapa, getElementById: (id) => mapa[id] || null };
}

const IDS = ["world-badge", "world-status", "btn-world-switch", "sample-banner", "sample-banner-switch"];

describe("scope-mode: pintado", () => {
  it("en la muestra enseña la insignia, el botón y el aviso permanente", () => {
    const doc = makeDoc(IDS);
    const mode = createScopeMode({ document: doc, getScope: () => "sample" });
    expect(mode.render()).toBe("sample");
    expect(doc.mapa["world-badge"].textContent).toBe("Datos de muestra");
    expect(doc.mapa["world-badge"].dataset.scope).toBe("sample");
    expect(doc.mapa["btn-world-switch"].textContent).toBe("Usar mis datos");
    expect(doc.mapa["sample-banner"].hidden).toBe(false);
  });

  it("en los datos personales el aviso desaparece", () => {
    const doc = makeDoc(IDS);
    const mode = createScopeMode({ document: doc, getScope: () => "personal" });
    mode.render();
    expect(doc.mapa["world-badge"].textContent).toBe("Mis datos");
    expect(doc.mapa["btn-world-switch"].textContent).toBe("Ir a los datos de muestra");
    expect(doc.mapa["sample-banner"].hidden).toBe(true);
  });
});

describe("scope-mode: cambio de mundo", () => {
  it("pide el mundo nuevo, activa su catálogo y recarga", async () => {
    const doc = makeDoc(IDS);
    let scope = "sample";
    const setScope = vi.fn(async (nuevo) => {
      scope = nuevo;
      return { ok: true, scope: nuevo };
    });
    const activateCatalog = vi.fn(async () => ({ ok: true }));
    const reload = vi.fn();
    const mode = createScopeMode({
      document: doc,
      getScope: () => scope,
      setScope,
      activateCatalog,
      reload,
    });

    const res = await mode.switchTo("personal");
    expect(res.ok).toBe(true);
    expect(setScope).toHaveBeenCalledWith("personal");
    expect(activateCatalog).toHaveBeenCalledWith("personal");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("no hace nada si ya se está en ese mundo", async () => {
    const doc = makeDoc(IDS);
    const setScope = vi.fn();
    const reload = vi.fn();
    const mode = createScopeMode({ document: doc, getScope: () => "personal", setScope, reload });
    const res = await mode.switchTo("personal");
    expect(res.ok).toBe(true);
    expect(setScope).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("sin almacenamiento avisa y no recarga", async () => {
    const doc = makeDoc(IDS);
    const reload = vi.fn();
    const mode = createScopeMode({
      document: doc,
      getScope: () => "sample",
      setScope: async () => ({ ok: false, error: "store_unavailable" }),
      reload,
    });
    const res = await mode.switchTo("personal");
    expect(res.ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(doc.mapa["world-status"].textContent).toMatch(/sin almacenamiento/i);
  });

  it("un fallo al activar el catálogo no deshace el cambio de mundo", async () => {
    const doc = makeDoc(IDS);
    const reload = vi.fn();
    const mode = createScopeMode({
      document: doc,
      getScope: () => "sample",
      setScope: async () => ({ ok: true }),
      activateCatalog: async () => {
        throw new Error("boom");
      },
      reload,
    });
    const res = await mode.switchTo("personal");
    expect(res.ok).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("scope-mode: enganche de botones", () => {
  it("los dos botones cambian al otro mundo", async () => {
    const doc = makeDoc(IDS);
    const setScope = vi.fn(async () => ({ ok: true }));
    const reload = vi.fn();
    setupScopeMode({
      document: doc,
      getScope: () => "sample",
      setScope,
      reload,
    });

    doc.mapa["btn-world-switch"].click();
    doc.mapa["sample-banner-switch"].click();
    await Promise.resolve();
    await Promise.resolve();
    expect(setScope).toHaveBeenCalledWith("personal");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("el botón de ayuda abre el recorrido", () => {
    const doc = makeDoc([...IDS, "btn-help"]);
    const start = vi.fn(() => ({ ok: true }));
    setupScopeMode({
      document: doc,
      getScope: () => "sample",
      tutorial: { start },
    });
    doc.mapa["btn-help"].click();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("si el recorrido no está disponible, lo dice sin romper", () => {
    const doc = makeDoc([...IDS, "btn-help"]);
    setupScopeMode({
      document: doc,
      getScope: () => "sample",
      tutorial: { start: () => ({ ok: false, reason: "driver_missing" }) },
    });
    doc.mapa["btn-help"].click();
    expect(doc.mapa["world-status"].textContent).toMatch(/recorrido guiado/i);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { bootUgrApp, clickSubject, flush, textOf } from "./appHarness.js";

// Caracterización del bloque **catálogo + paquete cifrado** del monolito: el de
// más riesgo de los que quedan (301 líneas, decide con qué catálogo se resuelven
// los horarios y sustituye datos del usuario) y el que **no tenía ninguna**
// cobertura a nivel de app.
//
// Es el primer paso de V4 y sigue la lección de la fase 2: **primero la red**,
// después extraer. Lo que se fija aquí es el contrato del monolito con sus dos
// fronteras (`window.__ugrCatalog` y `window.__ugrPackage`), dobladas.

const CATALOGO_MUESTRA = {
  id: "UGR/GI/2026-1",
  university: "UGR",
  degree: "GI",
  version: "2026-1",
  subjectCount: 93,
  sources: ["muestra"],
};
const CATALOGO_VOLCADO = {
  id: "UGR/GI/2026-1+volcado",
  university: "UGR",
  degree: "GI",
  version: "2026-1",
  subjectCount: 93,
  sources: ["volcado"],
};

/** Frontera del catálogo con registro de llamadas. */
function fakeCatalog({ activo = CATALOGO_MUESTRA.id } = {}) {
  const llamadas = { setActive: [], save: [], exportar: [] };
  return {
    llamadas,
    listCatalogs: async () => [CATALOGO_MUESTRA, CATALOGO_VOLCADO],
    getActiveCatalogKey: () => activo,
    getCatalog: () => null,
    setActiveCatalogKey: async (id) => {
      llamadas.setActive.push(id);
      activo = id;
      return { ok: true, id };
    },
    saveCatalog: async (catalog, opts) => {
      llamadas.save.push({ catalog, opts });
      return { ok: true, id: opts?.id || "guardado" };
    },
    exportCatalog: async (id) => {
      llamadas.exportar.push(id);
      return { meta: {}, subjects: [] };
    },
  };
}

/** Frontera del paquete cifrado. */
function fakePackage({ exito = true, catalogo = null, reason = "passphrase" } = {}) {
  const llamadas = { passwords: [] };
  return {
    llamadas,
    PACKAGE_ERRORS: { passphrase: "Contraseña incorrecta.", missing: "No hay paquete." },
    unlockPackage: async (password) => {
      llamadas.passwords.push(password);
      if (!exito) return { ok: false, reason };
      return { ok: true, id: CATALOGO_VOLCADO.id, catalog: catalogo };
    },
  };
}

const catalogoDelPaquete = {
  meta: { university: "UGR", degree: "GI", version: "2026-1", sources: ["volcado"] },
  subjects: [{ codigo: "SO", nombre: "Sistemas Operativos", creditos: 6, curso: 2, cuatrimestre: 1, grupos: [] }],
  docents: [{}, {}, {}],
  profesores: [{}, {}],
};

const opciones = () => [...document.getElementById("catalog-select").options].map((o) => o.textContent);

describe("catálogo activo y paquete cifrado (monolito real)", () => {
  let app;
  let confirmOriginal;
  let respuestas;

  beforeEach(() => {
    confirmOriginal = globalThis.confirm;
    respuestas = [];
    globalThis.confirm = () => respuestas.shift() ?? false;
  });

  afterEach(() => {
    globalThis.confirm = confirmOriginal;
  });

  it("el desplegable distingue la muestra del archivo con contraseña y marca el activo", async () => {
    const catalog = fakeCatalog();
    app = await bootUgrApp({ subjects: [], catalog });
    await flush();

    const select = document.getElementById("catalog-select");
    expect(select.disabled).toBe(false);
    expect(opciones()).toHaveLength(2);
    expect(opciones()[0]).toContain("muestra");
    expect(opciones()[1]).toContain("archivo con contraseña");
    expect(select.value).toBe(CATALOGO_MUESTRA.id);
    expect(app.store.getState().ui.view).toBe("horario");
  });

  it("cambiar de catálogo lo activa y refresca la vista", async () => {
    const catalog = fakeCatalog();
    app = await bootUgrApp({ subjects: [], catalog });
    await flush();

    const select = document.getElementById("catalog-select");
    select.value = CATALOGO_VOLCADO.id;
    select.dispatchEvent(new globalThis.Event("change"));
    await flush();

    expect(catalog.llamadas.setActive).toEqual([CATALOGO_VOLCADO.id]);
    expect(document.getElementById("catalog-select").value).toBe(CATALOGO_VOLCADO.id);
  });

  it("sin contraseña no llama al paquete y lo dice", async () => {
    const pkg = fakePackage();
    app = await bootUgrApp({ subjects: [], catalog: fakeCatalog(), package: pkg });
    await flush();

    document.getElementById("btn-package-unlock").click();
    await flush();

    expect(pkg.llamadas.passwords).toEqual([]);
    expect(textOf("#package-status")).toContain("Escribe la contraseña");
  });

  it("con la contraseña mala enseña el mensaje de ese motivo", async () => {
    const pkg = fakePackage({ exito: false, reason: "passphrase" });
    app = await bootUgrApp({ subjects: [], catalog: fakeCatalog(), package: pkg });
    await flush();

    document.getElementById("package-password").value = "nope";
    document.getElementById("btn-package-unlock").click();
    await flush();

    expect(pkg.llamadas.passwords).toEqual(["nope"]);
    expect(textOf("#package-status")).toBe("Contraseña incorrecta.");
    expect(document.getElementById("btn-package-unlock").disabled).toBe(false);
  });

  it("el paquete bueno se guarda con su id propio y pasa a activo, con aviso y copia previa", async () => {
    const catalog = fakeCatalog();
    const pkg = fakePackage({ exito: true, catalogo: catalogoDelPaquete });
    respuestas = [false, true]; // ¿copia de seguridad? no · ¿importar? sí
    app = await bootUgrApp({ subjects: [], catalog, package: pkg });
    await flush();

    document.getElementById("package-password").value = "1234";
    document.getElementById("btn-package-unlock").click();
    await flush();

    // Se guarda con el id del paquete (no con el de la muestra) y se activa.
    expect(catalog.llamadas.save).toHaveLength(1);
    expect(catalog.llamadas.save[0].opts).toEqual({ id: CATALOGO_VOLCADO.id });
    expect(catalog.llamadas.setActive).toEqual([CATALOGO_VOLCADO.id]);
    // El estado cuenta lo que trae y el campo se vacía (la contraseña no se guarda).
    expect(textOf("#package-status")).toContain("3 asignaciones y 2 perfiles");
    expect(document.getElementById("package-password").value).toBe("");
  });

  it("declinar la importación no guarda ni activa nada", async () => {
    const catalog = fakeCatalog();
    const pkg = fakePackage({ exito: true, catalogo: catalogoDelPaquete });
    respuestas = [false, false]; // copia: no · importar: no
    app = await bootUgrApp({ subjects: [], catalog, package: pkg });
    await flush();

    document.getElementById("package-password").value = "1234";
    document.getElementById("btn-package-unlock").click();
    await flush();

    expect(catalog.llamadas.save).toEqual([]);
    expect(catalog.llamadas.setActive).toEqual([]);
    expect(textOf("#package-status")).toContain("Importación cancelada");
  });
});

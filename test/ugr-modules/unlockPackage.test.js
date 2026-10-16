import { describe, it, expect, vi } from "vitest";

import { encrypt } from "../../public/ugr/src/backup/crypto.js";
import { TIMEOUTS } from "../../public/ugr/src/modules/http.js";
import {
  PACKAGE_URL,
  esCatalogoImportado,
  packageCatalogId,
  parsePackagePayload,
  unlockPackage,
} from "../../public/ugr/src/package/unlockPackage.js";

// El paquete cifrado del autor: descargarlo, abrirlo con la contraseña y
// comprobar que trae un catálogo. Lo que se fija aquí es que cada fallo tenga su
// motivo (no hay paquete, no se descarga, contraseña incorrecta, catálogo
// inválido) y que el catálogo importado se guarde con un identificador distinto
// al de la muestra: si coincidieran, importar el volcado la pisaría.

const META = {
  university: "UGR",
  degree: "GI",
  plan: "2022",
  version: "2026-1",
  hash: "",
  sources: ["volcado", "guías"],
};

const CATALOGO = {
  meta: META,
  subjects: [
    {
      codigo: "SO",
      nombre: "Sistemas Operativos",
      curso: 2,
      cuatrimestre: 1,
      creditos: 6,
      grupos: [{ letra: "A", turno: "mañana", teoria: [], practicas: { subgrupos: [] } }],
    },
  ],
  docents: [{ key: "SO-A", name: "Ana Ruiz", subjectCode: "SO", groupLetter: "A", modalidad: "Teoría" }],
  profesores: [],
  menciones: [],
  extraSubjects: [],
};

/** Respuesta de mentira con lo que hace falta de una `Response`. */
const respuesta = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

/** Paquete de verdad, cifrado con la contraseña que se le pase. */
async function paquete(password, payload = { catalog: CATALOGO }) {
  return encrypt(JSON.stringify(payload), password);
}

describe("unlockPackage", () => {
  it("abre el paquete con la contraseña y devuelve el catálogo con su id", async () => {
    const res = await unlockPackage("1234", {
      fetchImpl: async () => respuesta(await paquete("1234")),
    });
    expect(res.ok).toBe(true);
    expect(res.catalog.subjects[0].codigo).toBe("SO");
    expect(res.id).toBe("UGR/GI/2026-1+volcado");
  });

  it("pide el paquete a su URL y sin caché", async () => {
    let pedido = null;
    await unlockPackage("1234", {
      fetchImpl: async (url, options) => {
        pedido = { url, options };
        return respuesta(await paquete("1234"));
      },
    });
    expect(pedido.url).toBe(PACKAGE_URL);
    expect(pedido.options.cache).toBe("no-store");
    // La señal es lo que permite abortar la descarga al agotarse el plazo.
    expect(pedido.options.signal).toBeInstanceOf(AbortSignal);
  });

  it("con otra contraseña no abre", async () => {
    const res = await unlockPackage("otra", {
      fetchImpl: async () => respuesta(await paquete("1234")),
    });
    expect(res).toEqual({ ok: false, reason: "passphrase" });
  });

  it("sin contraseña no se molesta en descargar", async () => {
    let pedido = false;
    const res = await unlockPackage("", {
      fetchImpl: async () => {
        pedido = true;
        return respuesta({});
      },
    });
    expect(res).toEqual({ ok: false, reason: "empty" });
    expect(pedido).toBe(false);
  });

  it("un despliegue sin paquete lo dice (404)", async () => {
    const res = await unlockPackage("1234", { fetchImpl: async () => respuesta({}, 404) });
    expect(res).toEqual({ ok: false, reason: "missing" });
  });

  it("un fallo de red no se confunde con una contraseña mala", async () => {
    const res = await unlockPackage("1234", {
      fetchImpl: async () => {
        throw new Error("sin red");
      },
    });
    expect(res).toEqual({ ok: false, reason: "network" });
  });

  it("un paquete que no contesta nunca → network, sin dejar el panel esperando", async () => {
    vi.useFakeTimers();
    try {
      const pendiente = unlockPackage("1234", { fetchImpl: () => new Promise(() => {}) });
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(TIMEOUTS.package);

      expect(await pendiente).toEqual({ ok: false, reason: "network" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("un paquete que no trae catálogo se rechaza", async () => {
    const res = await unlockPackage("1234", {
      fetchImpl: async () => respuesta(await paquete("1234", { otraCosa: 1 })),
    });
    expect(res).toEqual({ ok: false, reason: "shape" });
  });

  it("un catálogo sin asignaturas se rechaza con sus errores", async () => {
    const res = await unlockPackage("1234", {
      fetchImpl: async () =>
        respuesta(await paquete("1234", { catalog: { ...CATALOGO, subjects: [] } })),
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid");
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe("packageCatalogId", () => {
  it("no coincide con el de la muestra: importar el volcado no la pisa", () => {
    expect(packageCatalogId(META)).toBe("UGR/GI/2026-1+volcado");
    expect(packageCatalogId(META)).not.toBe("UGR/GI/2026-1");
  });

  it("sin meta completa no hay identificador", () => {
    expect(packageCatalogId({ university: "UGR" })).toBe("");
    expect(packageCatalogId(null)).toBe("");
  });
});

describe("esCatalogoImportado", () => {
  it("reconoce el catálogo del paquete por su fuente", () => {
    expect(esCatalogoImportado(META)).toBe(true);
    expect(esCatalogoImportado({ sources: ["legacy", "muestra"] })).toBe(false);
    expect(esCatalogoImportado({})).toBe(false);
  });
});

describe("parsePackagePayload", () => {
  it("acepta `{ catalog }` y rechaza lo que no lo es", () => {
    expect(parsePackagePayload(JSON.stringify({ catalog: CATALOGO })).ok).toBe(true);
    expect(parsePackagePayload("no es json")).toEqual({ ok: false, reason: "parse" });
    expect(parsePackagePayload(JSON.stringify({ catalog: { subjects: "no" } }))).toEqual({
      ok: false,
      reason: "shape",
    });
  });
});

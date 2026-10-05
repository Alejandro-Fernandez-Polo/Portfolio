import { describe, it, expect } from "vitest";
import { parseJSON } from "../../public/ugr/src/ingest/parseJSON.js";

function validJSON() {
  return JSON.stringify({
    meta: { university: "UAM", degree: "GSI", plan: "2026", version: "v1", hash: "h1" },
    subjects: [
      {
        codigo: "M1",
        nombre: "Matemáticas I",
        curso: 1,
        cuatrimestre: 1,
        creditos: 6,
        grupos: [
          {
            letra: "A",
            turno: "mañana",
            teoria: [{ dia: "lunes", inicio: "09:00", fin: "10:00" }],
            practicas: { subgrupos: [] },
          },
        ],
      },
    ],
    docents: [],
  });
}

describe("parseJSON", () => {
  it("parsea y valida un catálogo correcto", () => {
    const res = parseJSON(validJSON());
    expect(res.errors).toEqual([]);
    expect(res.catalog.meta.university).toBe("UAM");
    expect(res.catalog.subjects).toHaveLength(1);
  });

  it("acepta BOM inicial", () => {
    const res = parseJSON(`\uFEFF${validJSON()}`);
    expect(res.catalog).toBeTruthy();
    expect(res.errors).toEqual([]);
  });

  it("reporta JSON inválido con path vacío y sin lanzar", () => {
    const res = parseJSON("{ no es json");
    expect(res.catalog).toBeUndefined();
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].path).toBe("");
    expect(res.errors[0].message).toContain("JSON inválido");
  });

  it("reporta errores de type en la raíz", () => {
    const res = parseJSON("[1,2]");
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("");
    expect(res.errors[0].message).toContain("object");
  });

  it("reporta errores con path cuando subjects no es array", () => {
    const catalog = JSON.parse(validJSON());
    catalog.subjects = {};
    const res = parseJSON(JSON.stringify(catalog));
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("subjects");
  });

  it("reporta el campo obligatorio ausente con path profundo", () => {
    const catalog = JSON.parse(validJSON());
    delete catalog.subjects[0].codigo;
    const res = parseJSON(JSON.stringify(catalog));
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("subjects[0].codigo");
    expect(res.errors[0].message).toBe("campo obligatorio");
  });

  it("reporta días inválidos con path hasta la sesión", () => {
    const catalog = JSON.parse(validJSON());
    catalog.subjects[0].grupos[0].teoria[0].dia = "domingo";
    const res = parseJSON(JSON.stringify(catalog));
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("subjects[0].grupos[0].teoria[0].dia");
  });

  it("reporta propiedades no permitidas", () => {
    const catalog = JSON.parse(validJSON());
    catalog.extra = true;
    const res = parseJSON(JSON.stringify(catalog));
    expect(res.catalog).toBeUndefined();
    expect(res.errors.some((e) => e.path === "extra")).toBe(true);
  });

  it("no lanza con entradas que no son texto", () => {
    for (const input of [null, undefined, 42, {}, []]) {
      const res = parseJSON(input);
      expect(res.catalog).toBeUndefined();
      expect(res.errors[0].path).toBe("");
    }
  });
});

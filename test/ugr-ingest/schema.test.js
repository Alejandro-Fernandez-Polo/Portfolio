import { describe, it, expect } from "vitest";
import { validate, CATALOG_SCHEMA, validateCatalogJSON } from "../../public/ugr/src/ingest/schema.js";

function validCatalog() {
  return {
    meta: { university: "UGR", degree: "GI", plan: "2022", version: "v1", hash: "abc123" },
    subjects: [
      {
        codigo: "FFT",
        nombre: "Fundamentos Físicos",
        curso: 1,
        cuatrimestre: 1,
        creditos: 6,
        grupos: [
          {
            letra: "A",
            turno: "mañana",
            teoria: [{ dia: "lunes", inicio: "09:30", fin: "11:30" }],
            practicas: {
              subgrupos: ["A1"],
              A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }],
            },
          },
        ],
      },
    ],
    docents: [],
  };
}

describe("validate (validador de esquema)", () => {
  it("acepta un valor que cumple el esquema", () => {
    const schema = { type: "object", required: ["a"], properties: { a: { type: "string" } } };
    expect(validate(schema, { a: "x" })).toEqual({ ok: true, errors: [] });
  });

  it("reporta errores de type con path", () => {
    const schema = { type: "object", properties: { a: { type: "number" } } };
    const res = validate(schema, { a: "1" });
    expect(res.ok).toBe(false);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].path).toBe("a");
    expect(res.errors[0].message).toContain("number");
  });

  it("soporta type boolean y arrays de tipos (null)", () => {
    expect(validate({ type: "boolean" }, true).ok).toBe(true);
    expect(validate({ type: "boolean" }, "si").ok).toBe(false);
    expect(validate({ type: ["string", "null"] }, null).ok).toBe(true);
    expect(validate({ type: ["string", "null"] }, 5).ok).toBe(false);
  });

  it("reporta required ausente en la ruta del hijo", () => {
    const schema = { type: "object", required: ["meta"], properties: { meta: { type: "object", required: ["university"] } } };
    const res = validate(schema, { meta: {} });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("meta.university");
    expect(res.errors[0].message).toBe("campo obligatorio");
  });

  it("valida propiedades anidadas", () => {
    const schema = { type: "object", properties: { meta: { type: "object", properties: { plan: { type: "string" } } } } };
    expect(validate(schema, { meta: { plan: 2022 } }).ok).toBe(false);
    expect(validate(schema, { meta: { plan: "2022" } }).ok).toBe(true);
  });

  it("marca propiedades extra cuando additionalProperties es false", () => {
    const schema = { type: "object", properties: { a: { type: "string" } }, additionalProperties: false };
    const res = validate(schema, { a: "x", extra: 1 });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("extra");
    expect(res.errors[0].message).toBe("propiedad no permitida");
  });

  it("valida items de arrays con índice en el path", () => {
    const schema = { type: "array", items: { type: "object", required: ["x"], properties: { x: { type: "number" } } } };
    const res = validate(schema, [{ x: 1 }, { x: "2" }, {}]);
    expect(res.ok).toBe(false);
    expect(res.errors.map((e) => e.path)).toEqual(["[1].x", "[2].x"]);
  });

  it("valida enum", () => {
    const schema = { type: "string", enum: ["a", "b"] };
    expect(validate(schema, "a").ok).toBe(true);
    const res = validate(schema, "c");
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("");
    expect(res.errors[0].message).toContain("no permitido");
  });

  it("aplica additionalProperties como esquema a claves dinámicas", () => {
    const schema = {
      type: "object",
      properties: { subgrupos: { type: "array", items: { type: "string" } } },
      additionalProperties: { type: "array", items: { type: "string" } },
    };
    expect(validate(schema, { subgrupos: [], A1: ["x"] }).ok).toBe(true);
    const res = validate(schema, { subgrupos: [], A1: "no" });
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("A1");
  });

  it("no profundiza tras un error de type", () => {
    const schema = { type: "object", required: ["a"], properties: { a: { type: "string" } } };
    const res = validate(schema, 42);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].path).toBe("");
  });
});

describe("CATALOG_SCHEMA / validateCatalogJSON", () => {
  it("acepta un catálogo canónico válido", () => {
    const res = validateCatalogJSON(validCatalog());
    expect(res).toEqual({ ok: true, errors: [] });
  });

  it("rechaza meta sin hash con path meta.hash", () => {
    const catalog = validCatalog();
    delete catalog.meta.hash;
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("meta.hash");
  });

  it("rechaza subjects que no es un array", () => {
    const catalog = validCatalog();
    catalog.subjects = {};
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("subjects");
  });

  it("rechaza un campo obligatorio ausente en una asignatura", () => {
    const catalog = validCatalog();
    delete catalog.subjects[0].codigo;
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("subjects[0].codigo");
  });

  it("rechaza cuatrimestre fuera de enum", () => {
    const catalog = validCatalog();
    catalog.subjects[0].cuatrimestre = 3;
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("subjects[0].cuatrimestre");
  });

  it("rechaza días fuera del enum con path profundo", () => {
    const catalog = validCatalog();
    catalog.subjects[0].grupos[0].teoria[0].dia = "sabado";
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("subjects[0].grupos[0].teoria[0].dia");
  });

  it("rechaza propiedades raíz desconocidas", () => {
    const catalog = validCatalog();
    catalog.importedAt = 1;
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("importedAt");
  });

  it("valida las sesiones dinámicas de practicas", () => {
    const catalog = validCatalog();
    catalog.subjects[0].grupos[0].practicas.A1 = "no-es-array";
    const res = validateCatalogJSON(catalog);
    expect(res.ok).toBe(false);
    expect(res.errors[0].path).toBe("subjects[0].grupos[0].practicas.A1");
  });

  it("acepta docentes con dificultad null", () => {
    const catalog = validCatalog();
    catalog.docents = [
      {
        key: "FFT-A",
        name: "Ana",
        subjectCode: "FFT",
        groupLetter: "A",
        profile: { dificultad: null, razon: "", opinion: "" },
      },
    ];
    expect(validateCatalogJSON(catalog).ok).toBe(true);
  });
});

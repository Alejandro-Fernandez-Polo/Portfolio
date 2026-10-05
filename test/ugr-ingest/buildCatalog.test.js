import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildCatalog,
  rowsToRecords,
  deriveTurno,
  REQUIRED_MAPPING_FIELDS,
  FIELD_DEFAULTS,
  CATALOG_TEMPLATE_HEADERS,
  TEMPLATE_MAPPING,
  buildTemplateCSV,
} from "../../public/ugr/src/ingest/buildCatalog.js";
import { validateCatalogJSON } from "../../public/ugr/src/ingest/schema.js";
import { parseCSV } from "../../public/ugr/src/ingest/parseCSV.js";

const HEADERS = [
  "Asignatura",
  "Nombre",
  "Curso",
  "Cuatrimestre",
  "Créditos",
  "Grupo",
  "Turno",
  "Tipo",
  "Subgrupo",
  "Día",
  "Inicio",
  "Fin",
];

const DATA = [
  ["FFT", "Fundamentos Físicos", "1", "1", "6", "A", "", "Teoría", "", "Lunes", "09:30", "11:30"],
  ["FFT", "Fundamentos Físicos", "1", "1", "6", "A", "", "Práctica", "A1", "Martes", "11:30", "12:30"],
  ["FFT", "Fundamentos Físicos", "1", "1", "6", "A", "", "Práctica", "A2", "Miércoles", "11:30", "12:30"],
  ["AO", "Arquitectura de Ordenadores", "4", "2", "6", "B", "", "Práctica", "", "Jueves", "16:00", "18:00"],
];

function recordsFrom(data = DATA, headers = HEADERS) {
  return rowsToRecords(headers, data);
}

function buildOk(rows, mapping = TEMPLATE_MAPPING, meta) {
  const res = buildCatalog({ rows, mapping, meta });
  expect(res.errors).toEqual([]);
  return res.catalog;
}

describe("metadatos de mapping", () => {
  it("declara los campos obligatorios mínimos", () => {
    expect(REQUIRED_MAPPING_FIELDS).toEqual(["codigo", "grupo", "dia", "inicio", "fin"]);
    expect(FIELD_DEFAULTS.cuatrimestre).toBe(1);
    expect(FIELD_DEFAULTS.tipo).toBe("practica");
  });

  it("deriva el turno a partir de la hora (<14:00 mañana, >=14:00 tarde)", () => {
    expect(deriveTurno("13:59")).toBe("mañana");
    expect(deriveTurno("14:00")).toBe("tarde");
    expect(deriveTurno("09:30")).toBe("mañana");
  });
});

describe("buildCatalog (mapeo correcto)", () => {
  it("ensambla un catálogo válido con teoría y prácticas", () => {
    const catalog = buildOk(recordsFrom());
    expect(validateCatalogJSON(catalog).ok).toBe(true);
    expect(catalog.subjects).toHaveLength(2);

    const fft = catalog.subjects[0];
    expect(fft.codigo).toBe("FFT");
    expect(fft.curso).toBe(1);
    expect(fft.cuatrimestre).toBe(1);
    expect(fft.creditos).toBe(6);
    expect(fft.grupos).toHaveLength(1);

    const grupoA = fft.grupos[0];
    expect(grupoA.letra).toBe("A");
    expect(grupoA.turno).toBe("mañana");
    expect(grupoA.teoria).toEqual([{ dia: "lunes", inicio: "09:30", fin: "11:30" }]);
    expect(grupoA.practicas.subgrupos).toEqual(["A1", "A2"]);
    expect(grupoA.practicas.A1).toEqual([{ dia: "martes", inicio: "11:30", fin: "12:30" }]);
    expect(grupoA.practicas.A2).toEqual([{ dia: "miercoles", inicio: "11:30", fin: "12:30" }]);

    const ao = catalog.subjects[1];
    expect(ao.grupos[0].turno).toBe("tarde");
    expect(ao.grupos[0].practicas.subgrupos).toEqual(["B"]);
    expect(ao.grupos[0].teoria).toEqual([]);
  });

  it("aplica meta por defecto y calcula hash", () => {
    const catalog = buildOk(recordsFrom());
    expect(catalog.meta.university).toBe("custom");
    expect(catalog.meta.degree).toBe("custom");
    expect(catalog.meta.version).toBe("user-import");
    expect(catalog.meta.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(catalog.docents).toEqual([]);
  });

  it("respeta la meta recibida", () => {
    const catalog = buildOk(recordsFrom(), TEMPLATE_MAPPING, {
      university: "UAM",
      degree: "GSI",
      plan: "2026",
      version: "user-42",
      sources: ["plantilla_horario.csv"],
    });
    expect(catalog.meta.university).toBe("UAM");
    expect(catalog.meta.degree).toBe("GSI");
    expect(catalog.meta.plan).toBe("2026");
    expect(catalog.meta.version).toBe("user-42");
    expect(catalog.meta.sources).toEqual(["plantilla_horario.csv"]);
    expect(catalog.meta.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("usa el turno explícito de la columna por encima de la hora", () => {
    const data = [
      ["FFT", "Física", "1", "1", "6", "A", "Tarde", "Teoría", "", "Lunes", "09:00", "10:00"],
      ["FFT", "Física", "1", "1", "6", "A", "", "Práctica", "A1", "Miércoles", "10:00", "11:00"],
    ];
    const catalog = buildOk(recordsFrom(data));
    expect(catalog.subjects[0].grupos[0].turno).toBe("tarde");
  });

  it("rechaza turno explícito inconsistente dentro del mismo grupo", () => {
    const data = [
      ["FFT", "Física", "1", "1", "6", "A", "Tarde", "Teoría", "", "Lunes", "09:00", "10:00"],
      ["FFT", "Física", "1", "1", "6", "A", "Mañana", "Teoría", "", "Miércoles", "10:00", "11:00"],
    ];
    const res = buildCatalog({ rows: recordsFrom(data), mapping: TEMPLATE_MAPPING });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("turno");
    expect(res.errors[0].row).toBe(1);
  });

  it("aplica defaults cuando faltan columnas opcionales", () => {
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin"];
    const data = [
      ["M1", "A", "Lunes", "09:00", "10:00"],
      ["M1", "A", "Martes", "09:00", "10:00"],
    ];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const catalog = buildOk(recordsFrom(data, headers), mapping);
    const subject = catalog.subjects[0];
    expect(subject.nombre).toBe("M1");
    expect(subject.curso).toBe(1);
    expect(subject.cuatrimestre).toBe(1);
    expect(subject.creditos).toBe(0);
    const grupo = subject.grupos[0];
    expect(grupo.turno).toBe("mañana");
    expect(grupo.teoria).toEqual([]);
    expect(grupo.practicas.subgrupos).toEqual(["A"]);
    expect(grupo.practicas.A).toHaveLength(2);
  });

  it("interpreta las sesiones como prácticas cuando no hay columna Tipo", () => {
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin"];
    const data = [["M1", "B", "Jueves", "16:00", "17:00"]];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const catalog = buildOk(recordsFrom(data, headers), mapping);
    const grupo = catalog.subjects[0].grupos[0];
    expect(grupo.practicas.subgrupos).toEqual(["B"]);
    expect(grupo.teoria).toEqual([]);
  });

  it("acepta alias de tipo (T, Práctica, laboratorio)", () => {
    const headers = ["Asignatura", "Grupo", "Tipo", "Día", "Inicio", "Fin"];
    const data = [
      ["M1", "A", "T", "Lunes", "09:00", "10:00"],
      ["M1", "A", "Práctica", "Martes", "09:00", "10:00"],
      ["M1", "A", "laboratorio", "Miércoles", "09:00", "10:00"],
    ];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", tipo: "Tipo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const catalog = buildOk(recordsFrom(data, headers), mapping);
    const grupo = catalog.subjects[0].grupos[0];
    expect(grupo.teoria).toHaveLength(1);
    expect(grupo.practicas.subgrupos).toEqual(["A"]);
    expect(grupo.practicas.A).toHaveLength(2);
  });

  it("deduplica sesiones exactamente repetidas", () => {
    const data = [
      ["M1", "A", "", "Teoría", "", "Lunes", "09:00", "10:00"],
      ["M1", "A", "", "Teoría", "", "Lunes", "09:00", "10:00"],
    ];
    const headers = ["Asignatura", "Grupo", "Turno", "Tipo", "Subgrupo", "Día", "Inicio", "Fin"];
    const catalog = buildOk(recordsFrom(data, headers));
    expect(catalog.subjects[0].grupos[0].teoria).toHaveLength(1);
  });

  it("adopción: una celda vacía inicial no impide un valor explícito posterior", () => {
    const headers = ["Asignatura", "Nombre", "Grupo", "Día", "Inicio", "Fin"];
    const data = [
      ["M1", "", "A", "Lunes", "09:00", "10:00"],
      ["M1", "Matemáticas", "A", "Martes", "09:00", "10:00"],
    ];
    const mapping = { codigo: "Asignatura", nombre: "Nombre", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const catalog = buildOk(recordsFrom(data, headers), mapping);
    expect(catalog.subjects[0].nombre).toBe("Matemáticas");
  });
});

describe("buildCatalog (errores por fila, sin lanzar)", () => {
  it("devuelve error por fila con día inválido", () => {
    const data = [
      ["M1", "A", "Lunes", "09:00", "10:00"],
      ["M1", "A", "Sábado", "09:00", "10:00"],
    ];
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin"];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].row).toBe(1);
    expect(res.errors[0].path).toBe("dia");
  });

  it("devuelve error cuando falta el código", () => {
    const data = [["", "A", "Lunes", "09:00", "10:00"]];
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin"];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("codigo");
    expect(res.errors[0].row).toBe(0);
  });

  it("devuelve error cuando fin no es posterior a inicio", () => {
    const data = [["M1", "A", "Lunes", "10:00", "09:00"]];
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin"];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("fin");
    expect(res.errors[0].message).toContain("posterior");
  });

  it("marca campos opcionales inválidos en lugar de usar el default", () => {
    const data = [["M1", "A", "Lunes", "09:00", "10:00", "x", "3"]];
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin", "Curso", "Cuatrimestre"];
    const mapping = {
      codigo: "Asignatura",
      grupo: "Grupo",
      dia: "Día",
      inicio: "Inicio",
      fin: "Fin",
      curso: "Curso",
      cuatrimestre: "Cuatrimestre",
    };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors.map((e) => e.path).sort()).toEqual(["cuatrimestre", "curso"]);
  });

  it("rechaza tipo de sesión desconocido", () => {
    const data = [["M1", "A", "Examen", "Lunes", "09:00", "10:00"]];
    const headers = ["Asignatura", "Grupo", "Tipo", "Día", "Inicio", "Fin"];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", tipo: "Tipo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("tipo");
  });

  it("acumula errores de varias filas", () => {
    const data = [
      ["", "A", "Lunes", "09:00", "10:00"],
      ["M1", "", "Martes", "09:00", "10:00"],
      ["M1", "A", "Domingo", "09:00", "10:00"],
    ];
    const headers = ["Asignatura", "Grupo", "Día", "Inicio", "Fin"];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors.map((e) => e.row)).toEqual([0, 1, 2]);
  });

  it("reporta inconsistencia entre filas con path canónico", () => {
    const data = [
      ["M1", "A", "1", "Lunes", "09:00", "10:00"],
      ["M1", "A", "2", "Martes", "09:00", "10:00"],
    ];
    const headers = ["Asignatura", "Grupo", "Curso", "Día", "Inicio", "Fin"];
    const mapping = { codigo: "Asignatura", grupo: "Grupo", curso: "Curso", dia: "Día", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(data, headers), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].row).toBe(1);
    expect(res.errors[0].path).toBe("subjects[0].curso");
  });

  it("falla si falta un campo obligatorio del mapping", () => {
    const mapping = { codigo: "Asignatura", grupo: "Grupo", inicio: "Inicio", fin: "Fin" };
    const res = buildCatalog({ rows: recordsFrom(), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("mapping.dia");
    expect(res.errors[0].row).toBeNull();
  });

  it("falla si la columna mapeada no existe en las filas", () => {
    const mapping = { ...TEMPLATE_MAPPING, codigo: "NoExiste" };
    const res = buildCatalog({ rows: recordsFrom(), mapping });
    expect(res.catalog).toBeUndefined();
    expect(res.errors[0].path).toBe("mapping.codigo");
    expect(res.errors[0].message).toContain("no encontrada");
  });

  it("no lanza con entradas basura", () => {
    for (const args of [undefined, null, {}, { rows: "x" }, { rows: [], mapping: {} }, { rows: [1], mapping: 3 }]) {
      expect(() => buildCatalog(args)).not.toThrow();
      const res = buildCatalog(args);
      expect(Array.isArray(res.errors)).toBe(true);
      expect(res.catalog).toBeUndefined();
    }
  });
});

describe("plantilla CSV", () => {
  it("buildTemplateCSV genera cabecera y filas parseables", () => {
    const csv = buildTemplateCSV();
    const res = parseCSV(csv);
    expect(res.delimiter).toBe(",");
    expect(res.hasHeader).toBe(true);
    expect(res.headers).toEqual(CATALOG_TEMPLATE_HEADERS);
    expect(res.rows.length).toBeGreaterThanOrEqual(3);
    expect(res.problems).toEqual([]);

    const records = rowsToRecords(res.headers, res.rows.slice(1));
    const catalog = buildOk(records);
    expect(catalog.subjects[0].grupos[0].teoria).toHaveLength(1);
    expect(catalog.subjects[0].grupos[0].practicas.subgrupos).toEqual(["A1"]);
  });

  it("el archivo físico coincide con las cabeceras de la plantilla", () => {
    const url = new URL("../../public/ugr/datasets/plantilla_horario.csv", import.meta.url);
    const text = readFileSync(url, "utf8");
    const res = parseCSV(text);
    expect(res.hasHeader).toBe(true);
    expect(res.headers).toEqual(CATALOG_TEMPLATE_HEADERS);
    expect(text.split(/\r\n|\n/)[0]).toBe(CATALOG_TEMPLATE_HEADERS.join(","));
    expect(res.rows).toHaveLength(2);

    const records = rowsToRecords(res.headers, res.rows.slice(1));
    const catalog = buildOk(records);
    expect(catalog.subjects).toHaveLength(1);
    expect(catalog.subjects[0].codigo).toBe("FFT");
    expect(catalog.subjects[0].grupos[0].teoria).toHaveLength(1);
    expect(catalog.subjects[0].grupos[0].practicas.subgrupos).toEqual([]);
  });
});

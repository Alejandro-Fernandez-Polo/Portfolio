import { describe, it, expect } from "vitest";

import {
  buildUnedOptions,
  buildUgrOptions,
  findActivePropuesta,
  formatCursoCuatri,
  getUgrMeta,
  resolveUgrCodigo,
  sortMappingsByCurso,
} from "../../public/ugr/src/app/domain/proposals.js";

// Reglas puras de las propuestas de convalidación: la propuesta activa, la ficha
// de un código UGR, el orden del detalle y las opciones de los dos desplegables
// de mapeo. Salieron del monolito al extraer la vista; aquí se prueban sin DOM.

const SUBJECTS = [
  { codigo: "FFT", nombre: "Fundamentos Físicos y Tecnológicos", curso: 1, cuatrimestre: 1 },
  { codigo: "AL", nombre: "Álgebra Lineal", curso: 1, cuatrimestre: 1 },
  { codigo: "CA", nombre: "Cálculo", curso: 2, cuatrimestre: 1 },
];

const CONV = [
  {
    id: "011013-FFT",
    uned: { codigo: "011013", nombre: "Fundamentos Físicos de la Informática" },
    ugr: { codigo: "FFT", nombre: "Fundamentos Físicos y Tecnológicos" },
  },
  {
    id: "01102-CA",
    uned: { codigo: "01102-", nombre: "Fundamentos Matemáticos de la Informática" },
    ugr: { codigo: "CA", nombre: "Cálculo" },
  },
  { id: "sin-ugr", uned: { codigo: "999", nombre: "Sin correspondencia directa" } },
];

const EQUIV = { "12": "CA", "14": "FS" };

const metaDe = (codigo) => getUgrMeta(codigo, { subjects: SUBJECTS, convalidaciones: CONV, equivalencias: EQUIV });

describe("findActivePropuesta", () => {
  const lista = [{ id: "a" }, { id: "b" }];

  it("devuelve la del id pedido", () => {
    expect(findActivePropuesta(lista, "b")).toEqual({ id: "b" });
  });

  it("cae a la primera si el id ya no existe", () => {
    expect(findActivePropuesta(lista, "z")).toEqual({ id: "a" });
  });

  it("sin lista devuelve null", () => {
    expect(findActivePropuesta([], "a")).toBeNull();
    expect(findActivePropuesta(null, "a")).toBeNull();
  });
});

describe("resolveUgrCodigo", () => {
  it("aplica la equivalencia (y sin distinguir mayúsculas)", () => {
    expect(resolveUgrCodigo("12", EQUIV)).toBe("CA");
    expect(resolveUgrCodigo(" 12 ", EQUIV)).toBe("CA");
  });

  it("un código sin equivalencia se queda tal cual", () => {
    expect(resolveUgrCodigo("FFT", EQUIV)).toBe("FFT");
  });

  it("sin código no inventa nada", () => {
    expect(resolveUgrCodigo("", EQUIV)).toBe("");
    expect(resolveUgrCodigo(null, EQUIV)).toBeNull();
  });
});

describe("getUgrMeta", () => {
  const data = { subjects: SUBJECTS, convalidaciones: CONV, equivalencias: EQUIV };

  it("el catálogo manda: curso y cuatrimestre", () => {
    expect(getUgrMeta("CA", data)).toEqual({ curso: 2, cuatrimestre: 1, nombre: "Cálculo", codigoReal: "CA" });
  });

  it("reconoce los créditos optativos por sus tres nombres", () => {
    ["OPT", "optativas", "creditos_optativos"].forEach((codigo) => {
      expect(getUgrMeta(codigo, data).curso).toBe("Opt");
    });
  });

  it("un código con equivalencia se resuelve antes de buscar", () => {
    expect(getUgrMeta("12", data).nombre).toBe("Cálculo");
  });

  it("lo que solo está en la tabla oficial deja el curso sin conocer", () => {
    const dataConOficial = {
      subjects: [],
      convalidaciones: [{ ugr: { codigo: "ZZ", nombre: "Solo oficial" } }],
      equivalencias: {},
    };
    expect(getUgrMeta("ZZ", dataConOficial)).toEqual({
      curso: "-",
      cuatrimestre: "-",
      nombre: "Solo oficial",
      codigoReal: "ZZ",
    });
  });

  it("un código desconocido y el vacío no dan ficha", () => {
    expect(getUgrMeta("NOEXISTE", data)).toBeNull();
    expect(getUgrMeta("", data)).toBeNull();
  });
});

describe("formatCursoCuatri", () => {
  it("escribe curso y cuatrimestre", () => {
    expect(formatCursoCuatri({ curso: 1, cuatrimestre: 2 })).toBe("1º · 2ºC");
  });

  it("las optativas se llaman por su nombre", () => {
    expect(formatCursoCuatri({ curso: "Opt", cuatrimestre: "-" })).toBe("Optativa");
  });

  it("sin curso conocido no escribe nada", () => {
    expect(formatCursoCuatri({ curso: "-", cuatrimestre: "-" })).toBe("");
    expect(formatCursoCuatri(null)).toBe("");
  });
});

describe("sortMappingsByCurso", () => {
  const mapeoFFT = { reconocidaCodigo: "FFT" };
  const mapeoAL = { reconocidaCodigo: "AL" };
  const mapeoCA = { reconocidaCodigo: "CA" };

  it("sin orden devuelve la misma lista (no copia)", () => {
    const mappings = [mapeoCA, mapeoFFT];
    expect(sortMappingsByCurso(mappings, null, metaDe)).toBe(mappings);
  });

  it("ascendente por curso", () => {
    expect(sortMappingsByCurso([mapeoCA, mapeoFFT], "asc", metaDe)).toEqual([mapeoFFT, mapeoCA]);
  });

  it("descendente por curso", () => {
    expect(sortMappingsByCurso([mapeoFFT, mapeoCA], "desc", metaDe)).toEqual([mapeoCA, mapeoFFT]);
  });

  it("a igual curso, desempata por código", () => {
    expect(sortMappingsByCurso([mapeoFFT, mapeoAL], "asc", metaDe)).toEqual([mapeoAL, mapeoFFT]);
  });

  it("un bloque se coloca por su reconocida más temprana", () => {
    const bloque = { tipo: "bloque", reconocidas: [{ codigo: "CA" }, { codigo: "FFT" }] };
    expect(sortMappingsByCurso([mapeoCA, bloque], "asc", metaDe)).toEqual([bloque, mapeoCA]);
  });

  it("un código desconocido se va al final", () => {
    const raro = { reconocidaCodigo: "NOEXISTE" };
    expect(sortMappingsByCurso([raro, mapeoCA], "asc", metaDe)).toEqual([mapeoCA, raro]);
  });
});

describe("buildUgrOptions", () => {
  it("junta catálogo y tabla oficial, sin repetir, y deja OPT al final", () => {
    const opciones = buildUgrOptions(SUBJECTS, CONV);
    expect(opciones.map((o) => o.codigo)).toEqual(["AL", "CA", "FFT", "OPT"]);
    expect(opciones.find((o) => o.codigo === "OPT").nombre).toBe("Créditos Optativos");
  });

  it("con listas vacías sigue ofreciendo los optativos", () => {
    expect(buildUgrOptions([], [])).toEqual([{ codigo: "OPT", nombre: "Créditos Optativos" }]);
  });
});

describe("buildUnedOptions", () => {
  it("junta la tabla oficial con las cursadas de las propuestas semilla", () => {
    const semilla = [
      { mappings: [{ cursadaCodigo: "901020", cursada: "Programación" }, { cursadas: [{ codigo: "901066", nombre: "IC I" }] }] },
    ];
    const codigos = buildUnedOptions(CONV, semilla).map((o) => o.codigo);
    // Solo el atajo `DAW` se adelanta; el resto va por código.
    expect(codigos).toEqual(["DAW", "011013", "01102-", "901020", "901020+DAW", "901066", "999"]);
  });
});

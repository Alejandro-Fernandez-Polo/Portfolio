import { describe, it, expect } from "vitest";
import {
  VALID_DAYS,
  DEFAULT_META,
  fromLegacySubjects,
  catalogVersion,
  getSubject,
  getGroup,
  getSubgroups,
  validateCatalog,
  timeToMinutes,
  minutesToTime,
  isValidTime,
} from "../../public/ugr/src/solver/catalog.js";

const FFT = {
  codigo: "FFT",
  nombre: "Fundamentos Físicos y Tecnológicos",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [
        { dia: "lunes", inicio: "9:30", fin: "10:30" },
        { dia: "lunes", inicio: "10:30", fin: "11:30" },
      ],
      practicas: {
        subgrupos: ["A1", "A2"],
        A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }],
        A2: [{ dia: "miercoles", inicio: "10:30", fin: "11:30" }],
      },
    },
  ],
};

const SIN_PRACTICAS = {
  codigo: "AO",
  nombre: "Arquitectura de Ordenadores",
  curso: 4,
  cuatrimestre: 2,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "jueves", inicio: "9:30", fin: "11:30" }],
      practicas: { subgrupos: [] },
    },
  ],
};

const SIN_TEORIA = {
  codigo: "FS",
  nombre: "Fundamentos del Software",
  curso: 2,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "D",
      turno: "tarde",
      teoria: [],
      practicas: {
        subgrupos: ["D1"],
        D1: [{ dia: "viernes", inicio: "17:30", fin: "19:30" }],
      },
    },
  ],
};

const FIXTURE = [FFT, SIN_PRACTICAS, SIN_TEORIA];

describe("time helpers", () => {
  it("parses times", () => {
    expect(timeToMinutes("9:30")).toBe(570);
    expect(timeToMinutes("18:30")).toBe(1110);
    expect(Number.isNaN(timeToMinutes("nope"))).toBe(true);
    expect(Number.isNaN(timeToMinutes("9:99"))).toBe(true);
  });

  it("formats times", () => {
    expect(minutesToTime(570)).toBe("9:30");
    expect(minutesToTime(1110)).toBe("18:30");
  });

  it("validates time strings", () => {
    expect(isValidTime("8:00")).toBe(true);
    expect(isValidTime("08:00")).toBe(true);
    expect(isValidTime("8:0")).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
  });
});

describe("fromLegacySubjects", () => {
  it("builds a catalog with default meta", () => {
    const catalog = fromLegacySubjects(FIXTURE);
    expect(catalog.meta).toEqual(DEFAULT_META);
    expect(catalog.subjects).toHaveLength(3);
  });

  it("does not mutate the input", () => {
    const snapshot = JSON.parse(JSON.stringify(FIXTURE));
    fromLegacySubjects(FIXTURE);
    expect(FIXTURE).toEqual(snapshot);
  });

  it("normalizes subjects and keeps groups/sessions", () => {
    const catalog = fromLegacySubjects(FIXTURE);
    const fft = getSubject(catalog, "FFT");
    expect(fft.curso).toBe(1);
    expect(fft.grupos[0].letra).toBe("A");
    expect(fft.grupos[0].practicas.subgrupos).toEqual(["A1", "A2"]);
    expect(fft.grupos[0].practicas.A1[0].inicio).toBe("11:30");
  });

  it("tolerates empty subgrupos and empty teoria", () => {
    const catalog = fromLegacySubjects(FIXTURE);
    expect(getSubgroups(getGroup(getSubject(catalog, "AO"), "A"))).toEqual([]);
    expect(getGroup(getSubject(catalog, "FS"), "D").teoria).toEqual([]);
    expect(validateCatalog(catalog).ok).toBe(true);
  });

  it("merges meta overrides", () => {
    const catalog = fromLegacySubjects(FIXTURE, { degree: "Custom" });
    expect(catalog.meta.degree).toBe("Custom");
    expect(catalog.meta.university).toBe("UGR");
  });

  it("throws on non-array input", () => {
    expect(() => fromLegacySubjects(null)).toThrow(TypeError);
  });
});

describe("catalogVersion", () => {
  it("is stable and changes with subject count", () => {
    const a = fromLegacySubjects(FIXTURE);
    const b = fromLegacySubjects(FIXTURE);
    expect(catalogVersion(a)).toBe(catalogVersion(b));
    const c = fromLegacySubjects(FIXTURE.slice(0, 2));
    expect(catalogVersion(a)).not.toBe(catalogVersion(c));
  });
});

describe("validateCatalog", () => {
  it("passes a valid catalog", () => {
    expect(validateCatalog(fromLegacySubjects(FIXTURE))).toEqual({ ok: true, errors: [] });
  });

  it("detects duplicate codes", () => {
    const catalog = fromLegacySubjects([FFT, FFT]);
    const result = validateCatalog(catalog);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicado"))).toBe(true);
  });

  it("detects invalid days", () => {
    const bad = JSON.parse(JSON.stringify(FFT));
    bad.grupos[0].teoria[0].dia = "sabado";
    const result = validateCatalog(fromLegacySubjects([bad]));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("día inválido"))).toBe(true);
  });

  it("detects invalid time ranges", () => {
    const bad = JSON.parse(JSON.stringify(FFT));
    bad.grupos[0].teoria[0].fin = "9:00";
    const result = validateCatalog(fromLegacySubjects([bad]));
    expect(result.errors.some((e) => e.includes("fin <= inicio"))).toBe(true);
  });

  it("VALID_DAYS excludes weekend", () => {
    expect(VALID_DAYS).not.toContain("sabado");
    expect(VALID_DAYS).not.toContain("domingo");
  });
});

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
  difficultyScore,
  DIFFICULTY_SCORES,
  difficultyFromLabel,
  normalizeDocent,
  normalizeProfesor,
  normalizeSubject,
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

describe("difficultyScore", () => {
  it("puntúa toda la escala conocida", () => {
    expect(difficultyScore("cyan")).toBe(6);
    expect(difficultyScore("verde")).toBe(5);
    expect(difficultyScore("amarillo")).toBe(4);
    expect(difficultyScore("naranja")).toBe(3);
    expect(difficultyScore("rojo")).toBe(2);
    expect(difficultyScore("negro")).toBe(1);
  });

  it("«Desconocido» (`gris`) no puntúa: null, no un 3 por defecto", () => {
    expect(DIFFICULTY_SCORES).not.toHaveProperty("gris");
    expect(difficultyScore("gris")).toBeNull();
  });

  it("un valor fuera de la escala tampoco puntúa", () => {
    expect(difficultyScore("turquesa")).toBeNull();
    expect(difficultyScore(null)).toBeNull();
    expect(difficultyScore(undefined)).toBeNull();
  });
});

describe("normalizeProfesor (perfil del volcado)", () => {
  const base = { subjectCode: "FFT", modalidad: "Prácticas", name: "Alba Delgado" };

  it("conserva las opiniones múltiples y descarta las vacías", () => {
    const p = normalizeProfesor({
      ...base,
      dificultad: "cyan",
      opinions: ["Primera", "  ", "Segunda"],
    });
    expect(p.opinions).toEqual(["Primera", "Segunda"]);
  });

  it("convierte el `opinion` singular de la hoja en una lista de uno", () => {
    const p = normalizeProfesor({ ...base, dificultad: null, opinion: "Explica desde cero" });
    expect(p.opinions).toEqual(["Explica desde cero"]);
    expect(p).not.toHaveProperty("opinion");
  });

  it("si vienen las dos formas, manda `opinions[]`", () => {
    const p = normalizeProfesor({ ...base, opinion: "vieja", opinions: ["nueva"] });
    expect(p.opinions).toEqual(["nueva"]);
  });

  it("sin opiniones devuelve lista vacía, nunca undefined", () => {
    const p = normalizeProfesor({ ...base });
    expect(p.opinions).toEqual([]);
    expect(p.dificultad).toBeNull();
  });

  it("la clave es la terna (asignatura, modalidad, nombre)", () => {
    expect(normalizeProfesor(base).key).toBe("FFT|Prácticas|Alba Delgado");
  });

  it("sin la terna completa no hay profesor", () => {
    expect(normalizeProfesor({ subjectCode: "FFT", name: "Ana" })).toBeNull();
    expect(normalizeProfesor({ subjectCode: "FFT", modalidad: "Teoría" })).toBeNull();
    expect(normalizeProfesor(null)).toBeNull();
  });

  it("los comentarios pierden el `autor` y conservan el resto", () => {
    const p = normalizeProfesor({
      ...base,
      comentarios: [
        {
          autor: "OSCAR GARCIA CALLEJAS",
          fecha: "2023-02-23",
          texto: "Corrige en binario",
          campo: "opinion",
          celda: "G12",
          anclaje: "directo",
        },
        { autor: "quien sea", texto: "   " },
      ],
    });
    expect(p.comentarios).toEqual([
      { fecha: "2023-02-23", texto: "Corrige en binario", campo: "opinion", celda: "G12", anclaje: "directo" },
    ]);
    expect(JSON.stringify(p)).not.toContain("OSCAR");
  });
});

describe("normalizeDocent (asignación)", () => {
  it("deriva la clave de asignatura y destino cuando falta `key`", () => {
    const d = normalizeDocent({ name: "Ana", subjectCode: "FFT", groupLetter: "B" });
    expect(d.key).toBe("FFT-B");
    expect(d.groupLetter).toBe("B");
  });

  it("sin perfil: la dificultad y las opiniones ya no viven aquí", () => {
    const d = normalizeDocent({ key: "FFT-A", name: "Ana", profile: { dificultad: "cyan" } });
    expect(d).not.toHaveProperty("profile");
    expect(d.modalidad).toBe("Teoría");
  });

  it("la modalidad por defecto es teoría y las prácticas se declaran", () => {
    const teoria = normalizeDocent({ key: "FFT-A", name: "Ana" });
    const practicas = normalizeDocent({ key: "FFT-A1", name: "Ana", modalidad: "Prácticas" });
    expect(teoria.modalidad).toBe("Teoría");
    expect(practicas.modalidad).toBe("Prácticas");
    expect(normalizeDocent({ key: "FFT-A", name: "Ana", modalidad: "inventada" }).modalidad).toBe("Teoría");
  });

  it("sin clave no hay asignación", () => {
    expect(normalizeDocent({ name: "Ana" })).toBeNull();
    expect(normalizeDocent(null)).toBeNull();
  });
});

describe("difficultyFromLabel", () => {
  it("traduce las siete etiquetas de la hoja a las claves de color de la app", () => {
    expect(difficultyFromLabel("Muy fácil")).toBe("cyan");
    expect(difficultyFromLabel("Fácil")).toBe("verde");
    expect(difficultyFromLabel("Normal")).toBe("amarillo");
    expect(difficultyFromLabel("Difícil")).toBe("naranja");
    expect(difficultyFromLabel("Muy difícil")).toBe("rojo");
    expect(difficultyFromLabel("Extremo (3% aprobados)")).toBe("negro");
    expect(difficultyFromLabel("Se desconoce")).toBe("gris");
  });

  it("una etiqueta desconocida no se convierte en una dificultad inventada", () => {
    expect(difficultyFromLabel("Regular")).toBeNull();
    expect(difficultyFromLabel("")).toBeNull();
    expect(difficultyFromLabel(undefined)).toBeNull();
  });

  it("«Se desconoce» entra como gris, que ya vale 0 puntos", () => {
    expect(difficultyScore(difficultyFromLabel("Se desconoce"))).toBeNull();
  });
});

describe("la asignatura con el plan del volcado", () => {
  it("acepta dificultad y descripción por modalidad y las normaliza a teoria/practicas", () => {
    const s = normalizeSubject({
      ...FFT,
      caracter: "Obligatoria",
      mencion: "Común",
      dificultad: { "Teoría": "rojo", "Prácticas": "gris" },
      descripcion: { "Teoría": "Con demostraciones" },
    });
    expect(s.caracter).toBe("Obligatoria");
    expect(s.mencion).toBe("Común");
    expect(s.dificultad).toEqual({ teoria: "rojo", practicas: "gris" });
    expect(s.descripcion).toEqual({ teoria: "Con demostraciones" });
  });

  it("sin plan no inventa claves (una muestra sin volcado no las trae)", () => {
    const s = normalizeSubject(FFT);
    expect(s).not.toHaveProperty("caracter");
    expect(s).not.toHaveProperty("mencion");
    expect(s).not.toHaveProperty("dificultad");
    expect(s).not.toHaveProperty("descripcion");
  });
});

import { describe, it, expect } from "vitest";

import { buildMaster } from "../../tools/ugr-pipeline/extract-private-master.mjs";

// El extractor del volcado convertido en maestro privado. Se prueba la
// transformación pura con un volcado de mentira: lo que se fija aquí es que
// nada se pierda **salvo el autor de los comentarios**, que las etiquetas de la
// hoja se traduzcan a las claves de la app, que las filas repetidas se fundan en
// vez de perderse y que un dato que no encaje haga fallar la extracción en vez de
// colarse en silencio.

const LEGACY = [
  {
    codigo: "SO",
    nombre: "Sistemas Operativos",
    curso: 2,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [
      {
        letra: "A",
        turno: "mañana",
        teoria: [{ dia: "lunes", inicio: "9:30", fin: "10:30" }],
        practicas: { subgrupos: [] },
      },
    ],
  },
];

/** Fila del volcado con los valores por defecto de una asignatura del catálogo. */
function row(overrides) {
  return {
    curso: "2º",
    cuatrimestre: "Primer cuatrimestre",
    tipo: "Teoría",
    asignatura: "SO",
    profesor: "Ana Ruiz",
    dificultadAsignatura: "Muy difícil",
    dificultadProfesor: "Difícil",
    opinion: "Explica con calma",
    descripcionAsignatura: "Con demostraciones",
    cruzada: false,
    comentarios: [],
    ...overrides,
  };
}

const INDICE = [
  { codigo: "SO", nombreCompleto: "Sistemas Operativos", curso: "2.0", cuatrimestre: "1.0", tipo: "Obligatoria", mencion: "Común" },
  { codigo: "RI", nombreCompleto: "Recuperación de Información", curso: "4.0", cuatrimestre: "1.0", tipo: "Obligatoria de Rama", mencion: "SI" },
  { codigo: "RI", nombreCompleto: "Robótica Industrial", curso: "4.0", cuatrimestre: "2.0", tipo: "Optativa", mencion: "CSI" },
];

function dump(rows, extra = {}) {
  return {
    docentes: rows,
    indiceAsignaturas: INDICE,
    menciones: [{ codigo: "CSI", nombre: "Computación y Sistemas Inteligentes", descripcion: "La rama de IA" }],
    tutoresTfg: [{ nombre: "David Griol", dificultad: "Extremo (3% aprobados)", opinion: "Contesta tarde" }],
    masteres: [{ nombre: "Profesorado (Oficial)", dificultad: "Fácil", opinion: "Un trámite" }],
    comentariosDescartados: [{ curso: "1º", autor: "Anónimo", texto: "qye" }],
    ...extra,
  };
}

describe("buildMaster", () => {
  it("traduce las etiquetas de la hoja a las claves de dificultad de la app", () => {
    const { catalog } = buildMaster(dump([row()]), LEGACY);
    const [profesor] = catalog.profesores;
    expect(profesor.dificultad).toBe("naranja"); // Difícil
    expect(catalog.subjects[0].dificultad).toEqual({ teoria: "rojo" }); // Muy difícil
    expect(catalog.tutoresTfg[0].dificultad).toBe("negro"); // Extremo
    expect(catalog.masteres[0].dificultad).toBe("verde"); // Fácil
  });

  it("«Se desconoce» entra como gris, no como naranja por defecto", () => {
    const { catalog } = buildMaster(dump([row({ dificultadProfesor: "Se desconoce" })]), LEGACY);
    expect(catalog.profesores[0].dificultad).toBe("gris");
  });

  it("descarta el `autor` de cada comentario y conserva el resto", () => {
    const conComentario = row({
      comentarios: [
        { autor: "OSCAR GARCIA CALLEJAS", fecha: "2023-02-23", texto: "Corrige en binario", campo: "opinion", celda: "G12", anclaje: "directo" },
      ],
    });
    const { catalog } = buildMaster(dump([conComentario]), LEGACY);
    expect(catalog.profesores[0].comentarios).toEqual([
      { fecha: "2023-02-23", texto: "Corrige en binario", campo: "opinion", celda: "G12", anclaje: "directo" },
    ]);
    expect(JSON.stringify(catalog)).not.toContain("OSCAR");
  });

  it("parte la asignatura en dificultad y descripción por modalidad", () => {
    const rows = [
      row({ tipo: "Teoría" }),
      row({ tipo: "Prácticas", dificultadAsignatura: "Normal", descripcionAsignatura: "En el laboratorio", opinion: "" }),
    ];
    const { catalog } = buildMaster(dump(rows), LEGACY);
    expect(catalog.subjects[0].dificultad).toEqual({ teoria: "rojo", practicas: "amarillo" });
    expect(catalog.subjects[0].descripcion).toEqual({
      teoria: "Con demostraciones",
      practicas: "En el laboratorio",
    });
  });

  it("crea un perfil por (asignatura, modalidad) aunque el profesor sea el mismo", () => {
    const rows = [row({ tipo: "Teoría" }), row({ tipo: "Prácticas", opinion: "En prácticas es otra cosa" })];
    const { catalog } = buildMaster(dump(rows), LEGACY);
    expect(catalog.profesores.map((p) => p.key)).toEqual([
      "SO|Teoría|Ana Ruiz",
      "SO|Prácticas|Ana Ruiz",
    ]);
    expect(catalog.profesores[1].opinions).toEqual(["En prácticas es otra cosa"]);
  });

  it("funde las filas repetidas y une sus opiniones en vez de perder una", () => {
    const rows = [row(), row({ opinion: "Otra opinión distinta" })];
    const { catalog, stats } = buildMaster(dump(rows), LEGACY);
    expect(stats.mergedRows).toBe(1);
    expect(catalog.profesores).toHaveLength(1);
    expect(catalog.profesores[0].opinions).toEqual(["Explica con calma", "Otra opinión distinta"]);
  });

  it("conserva la etiqueta cruda de la hoja: es lo único que separa las dos `RI`", () => {
    const rows = [
      row({ asignatura: "RI", profesor: "Uno" }),
      row({ asignatura: "RI (optativa)", profesor: "Dos" }),
    ];
    const { catalog } = buildMaster(dump(rows), LEGACY);
    expect(catalog.profesores.map((p) => `${p.subjectCode}|${p.asignatura}`)).toEqual([
      "RI|RI",
      "RI|RI (optativa)",
    ]);
  });

  it("separa las asignaturas del plan que la app no planifica", () => {
    const { catalog } = buildMaster(dump([row()]), LEGACY);
    expect(catalog.subjects.map((s) => s.codigo)).toEqual(["SO"]);
    expect(catalog.extraSubjects).toEqual([
      { codigo: "RI", nombre: "Recuperación de Información", curso: 4, cuatrimestre: 1, caracter: "Obligatoria de Rama", mencion: "SI" },
      { codigo: "RI", nombre: "Robótica Industrial", curso: 4, cuatrimestre: 2, caracter: "Optativa", mencion: "CSI" },
    ]);
  });

  it("enriquece la asignatura con su carácter y su mención del plan", () => {
    const { catalog } = buildMaster(dump([row()]), LEGACY);
    expect(catalog.subjects[0].caracter).toBe("Obligatoria");
    expect(catalog.subjects[0].mencion).toBe("Común");
  });

  it("recibe las asignaciones de las guías docentes, no del volcado", () => {
    // El volcado no trae letras de grupo; las guías sí, y el punto final de la
    // guía no puede colarse en el nombre (la app cruza profesor por nombre).
    const { catalog } = buildMaster(dump([row()]), LEGACY, [
      {
        nombre: "Sistemas Operativos",
        curso: "2026/2027",
        teorico: [{ nombre: "Ana Ruiz.", grupos: ["A"] }],
        practico: [{ nombre: "Luis Pérez", grupos: ["1", "2"] }],
      },
    ]);
    expect(catalog.docents).toEqual([
      { key: "SO-A", name: "Ana Ruiz", subjectCode: "SO", groupLetter: "A", modalidad: "Teoría" },
    ]);
    expect(catalog.meta.sampleDocents).toBe(false);
  });

  it("sin guías no inventa asignaciones", () => {
    const { catalog } = buildMaster(dump([row()]), LEGACY);
    expect(catalog.docents).toEqual([]);
  });

  it("falla en voz alta con una etiqueta de dificultad que no conoce", () => {
    expect(() => buildMaster(dump([row({ dificultadProfesor: "Regular" })]), LEGACY)).toThrow(
      /etiquetas de dificultad desconocidas: Regular/,
    );
  });

  it("falla si una pareja (asignatura, modalidad) con filas se queda sin dificultad", () => {
    expect(() => buildMaster(dump([row({ dificultadAsignatura: "" })]), LEGACY)).toThrow(
      /sin dificultad en el plan: SO\|Teoría/,
    );
  });
});

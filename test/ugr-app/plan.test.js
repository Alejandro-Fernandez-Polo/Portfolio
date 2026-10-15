import { describe, it, expect } from "vitest";

import {
  filterSubjectsByMention,
  listPlanSubjects,
  mencionClave,
  mencionOptions,
  tipoClave,
  tipoDeAsignatura,
} from "../../public/ugr/src/app/domain/plan.js";

// El plan en la lista de asignaturas: la etiqueta de tipo y el filtro por
// mención. La regla del filtro es la que pidió el autor: elegir una mención
// oculta **solo** las asignaturas de otras menciones, nunca las del núcleo común.

const SUBJECTS = [
  { codigo: "CA", nombre: "Cálculo", curso: 1, cuatrimestre: 1, caracter: "Básica", mencion: "Común" },
  { codigo: "SO", nombre: "Sistemas Operativos", curso: 2, cuatrimestre: 1, caracter: "Obligatoria", mencion: "Común" },
  { codigo: "DSD", nombre: "Desarrollo de Software", curso: 3, cuatrimestre: 2, caracter: "Obligatoria de Rama", mencion: "IS" },
  { codigo: "AA", nombre: "Aprendizaje Automático", curso: 3, cuatrimestre: 2, caracter: "Obligatoria de Rama", mencion: "CSI" },
  { codigo: "PGV", nombre: "Programación Gráfica", curso: 4, cuatrimestre: 1, caracter: "Optativa", mencion: "IS" },
  { codigo: "SINPLAN", nombre: "Sin plan", curso: 1, cuatrimestre: 2 },
];

describe("tipoDeAsignatura", () => {
  it("junta el carácter y la mención cuando la asignatura es de una especialidad", () => {
    expect(tipoDeAsignatura(SUBJECTS[2])).toBe("Obligatoria de Rama · Mención IS");
    expect(tipoDeAsignatura(SUBJECTS[4])).toBe("Optativa · Mención IS");
  });

  it("no pone mención en las del núcleo común", () => {
    expect(tipoDeAsignatura(SUBJECTS[0])).toBe("Básica");
    expect(tipoDeAsignatura(SUBJECTS[1])).toBe("Obligatoria");
  });

  it("devuelve vacío si el catálogo no trae el plan", () => {
    expect(tipoDeAsignatura(SUBJECTS[5])).toBe("");
    expect(tipoDeAsignatura(null)).toBe("");
  });
});

describe("listPlanSubjects", () => {
  // Códigos que no están en el catálogo del fixture: el plan sin horario nunca
  // repite una asignatura del catálogo (el extractor lo impide).
  const DEL_PLAN = [
    { codigo: "RMS", nombre: "Redes Móviles", curso: 4, cuatrimestre: 1, caracter: "Obligatoria de Rama", mencion: "CSI" },
    { codigo: "TE", nombre: "Tecnologías Educativas", curso: 4, cuatrimestre: 2, caracter: "Optativa", mencion: "TI" },
  ];

  it("junta las del catálogo y las del plan, y marca de dónde viene cada una", () => {
    const filas = listPlanSubjects(SUBJECTS, DEL_PLAN);
    expect(filas).toHaveLength(SUBJECTS.length + DEL_PLAN.length);
    expect(filas.find((f) => f.codigo === "SO").enCatalogo).toBe(true);
    expect(filas.find((f) => f.codigo === "RMS").enCatalogo).toBe(false);
  });

  it("las ordena por curso, cuatrimestre, tipo y nombre", () => {
    const filas = listPlanSubjects(SUBJECTS, DEL_PLAN);
    expect(filas.map((f) => f.codigo)).toEqual([
      // 1º/1: la básica. 1º/2: la que no trae plan, que va al final de su cuatrimestre.
      "CA", "SINPLAN",
      // 2º/1: la obligatoria común.
      "SO",
      // 3º/2: las dos de rama, por mención (CSI antes que IS).
      "AA", "DSD",
      // 4º/1: primero la de rama y después la optativa; 4º/2: la optativa de TI.
      "RMS", "PGV", "TE",
    ]);
  });

  it("dentro del mismo cuatrimestre manda el tipo, no el código", () => {
    // PGV (optativa) tiene código anterior a RMS (obligatoria de rama) y aun así
    // va después: el tipo pesa más que el código.
    const filas = listPlanSubjects(SUBJECTS, DEL_PLAN).filter((f) => f.curso === 4 && f.cuatrimestre === 1);
    expect(filas.map((f) => f.codigo)).toEqual(["RMS", "PGV"]);
  });

  it("a igual tipo, ordena por nombre", () => {
    const mismoTipo = [
      { codigo: "ZZ", nombre: "Zeta", curso: 1, cuatrimestre: 1, caracter: "Optativa", mencion: "IS" },
      { codigo: "AA", nombre: "Alfa", curso: 1, cuatrimestre: 1, caracter: "Optativa", mencion: "IS" },
    ];
    expect(listPlanSubjects(mismoTipo).map((f) => f.nombre)).toEqual(["Alfa", "Zeta"]);
  });

  it("sin plan sin horario devuelve solo las del catálogo, todas marcadas", () => {
    const filas = listPlanSubjects(SUBJECTS);
    expect(filas).toHaveLength(SUBJECTS.length);
    expect(filas.every((f) => f.enCatalogo)).toBe(true);
    expect(listPlanSubjects(null, DEL_PLAN)).toHaveLength(DEL_PLAN.length);
  });

  it("las del plan sin horario aportan sus menciones al desplegable", () => {
    expect(mencionOptions(listPlanSubjects(SUBJECTS, DEL_PLAN)).map((o) => o.codigo)).toEqual(["CSI", "IS", "TI"]);
  });
});

describe("mencionClave", () => {
  it("da la clave de la mención, y `comun` cuando no es de ninguna", () => {
    expect(mencionClave({ mencion: "CSI" })).toBe("csi");
    expect(mencionClave({ mencion: "IS" })).toBe("is");
    expect(mencionClave({ mencion: "TI" })).toBe("ti");
    expect(mencionClave({ mencion: "SI" })).toBe("si");
    expect(mencionClave({ mencion: "IC" })).toBe("ic");
    expect(mencionClave({ mencion: "Común" })).toBe("comun");
    expect(mencionClave({})).toBe("comun");
    expect(mencionClave(null)).toBe("comun");
  });

  it("no mira el carácter: en el horario el color distingue menciones, no tipos", () => {
    expect(mencionClave({ mencion: "TI", caracter: "Optativa" })).toBe(
      mencionClave({ mencion: "TI", caracter: "Obligatoria de Rama" }),
    );
  });
});

describe("tipoClave", () => {
  it("da un color por mención, distinguiendo sus obligatorias de sus optativas", () => {
    expect(tipoClave({ caracter: "Optativa", mencion: "CSI" })).toBe("csi-optativa");
    expect(tipoClave({ caracter: "Obligatoria de Rama", mencion: "CSI" })).toBe("csi-obligatoria");
    expect(tipoClave({ caracter: "Optativa", mencion: "IS" })).toBe("is-optativa");
    expect(tipoClave({ caracter: "Obligatoria de Rama", mencion: "TI" })).toBe("ti-obligatoria");
  });

  it("«Obligatoria de Rama» es la obligatoria de su mención, no otro cubo", () => {
    expect(tipoClave({ caracter: "Obligatoria de Rama", mencion: "SI" })).toBe("si-obligatoria");
    expect(tipoClave({ caracter: "Obligatoria de Rama", mencion: "IC" })).toBe("ic-obligatoria");
  });

  it("el trabajo fin de grado tiene su propio cubo", () => {
    expect(tipoClave({ caracter: "Trabajo Fin de Grado", mencion: "Común" })).toBe("comun-tfg");
  });

  it("el núcleo común va aparte, con su carácter", () => {
    expect(tipoClave({ caracter: "Básica", mencion: "Común" })).toBe("comun-basica");
    expect(tipoClave({ caracter: "Obligatoria", mencion: "Común" })).toBe("comun-obligatoria");
    expect(tipoClave({ caracter: "Optativa", mencion: "Común" })).toBe("comun-optativa");
    expect(tipoClave({ caracter: "Básica" })).toBe("comun-basica");
  });

  it("sin plan o con un carácter desconocido no hay color", () => {
    expect(tipoClave(SUBJECTS[5])).toBe("");
    expect(tipoClave({ caracter: "Rarísima", mencion: "CSI" })).toBe("");
    expect(tipoClave(null)).toBe("");
  });
});

describe("mencionOptions", () => {
  it("lista las menciones presentes, ordenadas y con su nombre largo", () => {
    const options = mencionOptions(SUBJECTS, [
      { codigo: "IS", nombre: "Ingeniería del Software" },
      { codigo: "CSI", nombre: "Computación y Sistemas Inteligentes" },
    ]);
    expect(options).toEqual([
      { codigo: "CSI", nombre: "Computación y Sistemas Inteligentes" },
      { codigo: "IS", nombre: "Ingeniería del Software" },
    ]);
  });

  it("no ofrece el núcleo común ni las que no tienen mención", () => {
    expect(mencionOptions(SUBJECTS).map((o) => o.codigo)).toEqual(["CSI", "IS"]);
    expect(mencionOptions(SUBJECTS.map((s) => ({ ...s, mencion: "Común" })))).toEqual([]);
    expect(mencionOptions(null)).toEqual([]);
  });
});

describe("filterSubjectsByMention", () => {
  it("sin mención elegida no filtra nada", () => {
    expect(filterSubjectsByMention(SUBJECTS, "")).toHaveLength(SUBJECTS.length);
    expect(filterSubjectsByMention(SUBJECTS)).toHaveLength(SUBJECTS.length);
  });

  it("con una mención elegida oculta solo las de otras menciones", () => {
    const visibles = filterSubjectsByMention(SUBJECTS, "IS").map((s) => s.codigo);
    expect(visibles).toEqual(["CA", "SO", "DSD", "PGV", "SINPLAN"]);
    expect(visibles).not.toContain("AA");
  });

  it("las básicas, las obligatorias y las que no traen mención siguen viéndose", () => {
    // La regla es la misma para la lista de datos y para la tabla del progreso:
    // elegir una mención oculta solo las de las otras, nunca las que no tienen.
    const visibles = filterSubjectsByMention(SUBJECTS, "CSI").map((s) => s.codigo);
    expect(visibles).toEqual(["CA", "SO", "AA", "SINPLAN"]);
  });
});


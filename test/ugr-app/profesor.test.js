import { describe, it, expect } from "vitest";

import {
  buildProfesorFicha,
  listProfesores,
  profesorEntries,
} from "../../public/ugr/src/app/domain/profesor.js";

// La ficha y el listado del claustro: agrupar por nombre los perfiles del
// catálogo —que son de (asignatura, modalidad, nombre)— y ordenarlos para
// pintarlos. Lo que se fija aquí es el orden, el resaltado de la entrada
// pulsada y el plan que se cuelga de cada entrada.

const SUBJECTS = [
  {
    codigo: "SO",
    nombre: "Sistemas Operativos",
    caracter: "Obligatoria",
    mencion: "Común",
    descripcion: { teoria: "Con demostraciones", practicas: "En el laboratorio" },
  },
  { codigo: "IG", nombre: "Informática Gráfica", caracter: "Optativa", mencion: "IS" },
];

function profesor(overrides) {
  const merged = {
    name: "Ana Ruiz",
    dificultad: "naranja",
    razon: "",
    opinions: [],
    comentarios: [],
    cruzada: false,
    ...overrides,
  };
  return { ...merged, key: `${merged.subjectCode}|${merged.modalidad}|${merged.name}` };
}

const PROFESORES = [
  profesor({ subjectCode: "SO", modalidad: "Teoría" }),
  profesor({ subjectCode: "SO", modalidad: "Prácticas", dificultad: "verde", opinions: ["En prácticas es otra cosa"] }),
  profesor({ subjectCode: "IG", modalidad: "Teoría", dificultad: "gris" }),
  profesor({ subjectCode: "SO", modalidad: "Teoría", name: "Otro Profesor", dificultad: null }),
];

describe("profesorEntries", () => {
  it("solo devuelve las entradas de ese profesor, ordenadas por asignatura y modalidad", () => {
    expect(profesorEntries(PROFESORES, "Ana Ruiz").map((p) => `${p.subjectCode}|${p.modalidad}`)).toEqual([
      "IG|Teoría",
      "SO|Teoría",
      "SO|Prácticas",
    ]);
  });

  it("un profesor desconocido no tiene entradas", () => {
    expect(profesorEntries(PROFESORES, "Nadie")).toEqual([]);
    expect(profesorEntries(null, "Ana Ruiz")).toEqual([]);
  });
});

describe("buildProfesorFicha", () => {
  it("cuelga de cada entrada el plan de la asignatura, sin la descripción (es de la asignatura)", () => {
    const ficha = buildProfesorFicha(PROFESORES, SUBJECTS, "Ana Ruiz");
    const [ig, soTeoria, soPracticas] = ficha.entries;
    expect(ig).toMatchObject({
      subjectCode: "IG",
      nombreAsignatura: "Informática Gráfica",
      caracter: "Optativa",
      mencion: "IS",
    });
    expect(soTeoria).toMatchObject({ caracter: "Obligatoria", mencion: "Común", dificultad: "naranja" });
    expect(soPracticas).toMatchObject({ dificultad: "verde" });
    // La descripción del plan NO viaja en la ficha del profesor: tiene su sitio
    // en la ficha de la asignatura.
    for (const entry of ficha.entries) expect(entry.descripcion).toBeUndefined();
  });

  it("la entrada pulsada va primero y marcada, y solo esa", () => {
    const ficha = buildProfesorFicha(PROFESORES, SUBJECTS, "Ana Ruiz", {
      subjectCode: "SO",
      modalidad: "Prácticas",
    });
    expect(ficha.entries[0].key).toBe("SO|Prácticas|Ana Ruiz");
    expect(ficha.entries[0].highlighted).toBe(true);
    expect(ficha.entries.filter((e) => e.highlighted)).toHaveLength(1);
    expect(ficha.entries.map((e) => e.subjectCode)).toEqual(["SO", "IG", "SO"]);
  });

  it("sin foco no se marca nada (se abre desde el listado de profesores)", () => {
    const ficha = buildProfesorFicha(PROFESORES, SUBJECTS, "Ana Ruiz", null);
    expect(ficha.entries.some((e) => e.highlighted)).toBe(false);
    expect(ficha.entries[0].subjectCode).toBe("IG");
  });

  it("recoge opiniones y comentarios de la entrada, no del profesor entero", () => {
    const conComentario = profesor({
      subjectCode: "SO",
      modalidad: "Prácticas",
      comentarios: [{ fecha: "2023-02-23", texto: "Corrige en binario", campo: "opinion", celda: "G12", anclaje: "directo" }],
    });
    const ficha = buildProfesorFicha([conComentario], SUBJECTS, "Ana Ruiz");
    expect(ficha.entries[0].comentarios).toHaveLength(1);
    expect(ficha.entries[0].comentarios[0].texto).toBe("Corrige en binario");
  });

  it("aguanta una asignatura que no está en el catálogo (catálogo sin horario para ella)", () => {
    const suelto = profesor({ subjectCode: "XX", modalidad: "Teoría" });
    const ficha = buildProfesorFicha([suelto], SUBJECTS, "Ana Ruiz");
    expect(ficha.entries[0]).toMatchObject({
      subjectCode: "XX",
      nombreAsignatura: "",
      caracter: "",
      mencion: "",
    });
  });

  it("marca las entradas propias, incluidas las que no tienen asignatura", () => {
    const propio = profesor({ subjectCode: "SO", modalidad: "Teoría", propio: true, dificultad: "negro" });
    const sinAsignatura = { key: "Ana Ruiz", name: "Ana Ruiz", subjectCode: "", modalidad: "", dificultad: "rojo", razon: "", opinions: ["Suelta"], comentarios: [], propio: true };
    const ficha = buildProfesorFicha([propio, sinAsignatura], SUBJECTS, "Ana Ruiz");
    expect(ficha.entries.every((e) => e.propio === true)).toBe(true);
    // La que no tiene asignatura va primero (código vacío) y no cuelga plan.
    expect(ficha.entries[0]).toMatchObject({ subjectCode: "", modalidad: "", nombreAsignatura: "", caracter: "" });
  });
});

describe("listProfesores", () => {
  it("una fila por profesor con sus asignaturas y sus dificultades distintas, en orden de escala", () => {
    const rows = listProfesores(PROFESORES);
    expect(rows.map((r) => r.name)).toEqual(["Ana Ruiz", "Otro Profesor"]);
    expect(rows[0].asignaturas).toEqual([
      { code: "IG", modalidad: "Teoría" },
      { code: "SO", modalidad: "Teoría" },
      { code: "SO", modalidad: "Prácticas" },
    ]);
    // naranja pesa 3, verde 5, gris 0 → de la más suave a la más dura, gris al final
    expect(rows[0].dificultades).toEqual(["verde", "naranja", "gris"]);
    expect(rows[0].total).toBe(3);
    // Del catálogo no hay nada propio que editar.
    expect(rows[0].ownKeys).toEqual([]);
    expect(rows[1].dificultades).toEqual([]);
  });

  it("marca las valoraciones propias y deja sin asignaturas la que no está asociada", () => {
    const propia = profesor({ subjectCode: "SO", modalidad: "Teoría", propio: true });
    const sinAsignatura = { key: "Ana Ruiz", name: "Ana Ruiz", subjectCode: "", modalidad: "", dificultad: "rojo", opinions: [], propio: true };
    const rows = listProfesores([...PROFESORES, propia, sinAsignatura]);
    const ana = rows.find((r) => r.name === "Ana Ruiz");
    // La suelta va primero por el código vacío; su clave es el nombre.
    expect(ana.ownKeys).toEqual(["Ana Ruiz", "SO|Teoría|Ana Ruiz"]);
    expect(ana.asignaturas).toEqual([
      { code: "IG", modalidad: "Teoría" },
      { code: "SO", modalidad: "Teoría" },
      { code: "SO", modalidad: "Teoría" },
      { code: "SO", modalidad: "Prácticas" },
    ]);
  });

  it("filtra por nombre o por código de asignatura, sin distinguir mayúsculas", () => {
    expect(listProfesores(PROFESORES, { query: "ruiz" }).map((r) => r.name)).toEqual(["Ana Ruiz"]);
    expect(listProfesores(PROFESORES, { query: "ig" }).map((r) => r.name)).toEqual(["Ana Ruiz"]);
    expect(listProfesores(PROFESORES, { query: "  " })).toHaveLength(2);
    expect(listProfesores(PROFESORES, { query: "zzz" })).toEqual([]);
  });

  it("ignora entradas sin nombre", () => {
    expect(listProfesores([{ subjectCode: "SO" }, null])).toEqual([]);
  });
});

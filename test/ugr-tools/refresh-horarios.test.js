import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import { conHorarioOficial } from "../../tools/ugr-pipeline/refresh-horarios.mjs";
import { practicasPorAsignatura } from "../../tools/ugr-pipeline/horarios.js";

// El repaso del horario de `data.js` con lo que publica la ETSIIT. `data.js` es
// el horario que resuelve la app: sus subgrupos de prácticas estaban a medias,
// la teoría se había quedado vieja en algún grupo y las optativas de cuarto —que
// el horario sí publica— no estaban. Lo que se fija aquí es que el repaso
// arregle, añada y no toque lo que no debe; y, sobre el fichero de verdad, que
// `data.js` y el horario digan lo mismo: esa es la guarda que habría cazado los
// subgrupos que faltaban.

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const GRUPOS_PATH = path.join(ROOT, "tools/ugr-pipeline/horarios-grupos.json");
const GUIAS_PATH = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const DECLARACION = "const SUBJECTS = ";

const sesion = (dia, inicio, fin) => ({ dia, inicio, fin });
const grupo = (letra, teoria, practicas = {}, turno = "mañana") => ({
  letra,
  turno,
  teoria,
  practicas: { subgrupos: Object.keys(practicas), ...practicas },
});
const subject = (codigo, nombre, grupos) => ({
  codigo,
  nombre,
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos,
});

const HORARIO = {
  SO: {
    A: {
      teoria: [sesion("lunes", "9:30", "10:30"), sesion("lunes", "10:30", "11:30")],
      practicas: { A1: [sesion("martes", "9:30", "10:30")], A2: [sesion("miercoles", "9:30", "10:30")] },
    },
  },
  DGP: {
    A: {
      teoria: [sesion("jueves", "10:30", "11:30")],
      practicas: { A1: [sesion("jueves", "8:30", "9:30")] },
    },
  },
};

describe("conHorarioOficial", () => {
  it("repasa la teoría y las prácticas de las asignaturas que ya están", () => {
    const { subjects, cambios } = conHorarioOficial({
      subjects: [
        subject("SO", "Sistemas Operativos", [
          grupo("A", [sesion("viernes", "8:30", "9:30")], { A1: [sesion("viernes", "9:30", "10:30")] }),
        ]),
      ],
      grupos: HORARIO,
    });
    expect(cambios.teoria).toEqual(["SO-A"]);
    expect(cambios.practicas).toEqual(["SO-A1"]);
    expect(cambios.subgruposAnadidos).toEqual(["SO-A2"]);
    expect(subjects[0].grupos[0].teoria).toEqual(HORARIO.SO.A.teoria);
    expect(subjects[0].grupos[0].practicas.A1).toEqual(HORARIO.SO.A.practicas.A1);
    expect(subjects[0].grupos[0].practicas.subgrupos).toEqual(["A1", "A2"]);
  });

  it("quita los subgrupos que el horario no lista", () => {
    const { subjects, cambios } = conHorarioOficial({
      subjects: [
        subject("SO", "Sistemas Operativos", [
          grupo("A", HORARIO.SO.A.teoria, {
            A1: HORARIO.SO.A.practicas.A1,
            A2: HORARIO.SO.A.practicas.A2,
            A3: [sesion("viernes", "9:30", "10:30")],
          }),
        ]),
      ],
      grupos: HORARIO,
    });
    expect(cambios.subgruposQuitados).toEqual(["SO-A3"]);
    expect(subjects[0].grupos[0].practicas.A3).toBeUndefined();
  });

  it("incorpora las asignaturas del plan que el horario publica, con sus créditos", () => {
    const { subjects, cambios } = conHorarioOficial({
      subjects: [subject("SO", "Sistemas Operativos", [grupo("A", [], {})])],
      grupos: HORARIO,
      plan: [{ codigo: "DGP", nombre: "Dirección y Gestión de Proyectos", curso: 4, cuatrimestre: 1, caracter: "Optativa", mencion: "IS" }],
      guias: [{ nombre: "Dirección y Gestión de Proyectos (Especialidad Ingeniería del Software)", creditos: 6 }],
    });
    expect(cambios.anadidas).toEqual(["DGP"]);
    const nueva = subjects.find((s) => s.codigo === "DGP");
    expect(nueva).toMatchObject({ nombre: "Dirección y Gestión de Proyectos", curso: 4, cuatrimestre: 1, creditos: 6 });
    expect(nueva.grupos[0].practicas.subgrupos).toEqual(["A1"]);
  });

  it("no incorpora dos veces una asignatura que el plan trae repetida", () => {
    const { subjects, cambios } = conHorarioOficial({
      subjects: [subject("SO", "Sistemas Operativos", [grupo("A", [], {})])],
      grupos: HORARIO,
      plan: [
        { codigo: "DGP", nombre: "Dirección y Gestión de Proyectos", curso: 4, cuatrimestre: 1 },
        { codigo: "DGP", nombre: "Otra cosa con el mismo código", curso: 4, cuatrimestre: 2 },
      ],
    });
    expect(cambios.anadidas).toEqual(["DGP"]);
    expect(cambios.codigosRepetidos).toEqual(["DGP"]);
    expect(subjects.filter((s) => s.codigo === "DGP")).toHaveLength(1);
  });

  it("deja intactas las asignaturas cuyo horario no publica grupos", () => {
    const sinHorario = subject("ZZ", "Sin horario", [grupo("A", [sesion("lunes", "8:30", "9:30")], {})]);
    const { subjects, cambios } = conHorarioOficial({ subjects: [sinHorario], grupos: HORARIO });
    expect(cambios.sinHorario).toEqual(["ZZ"]);
    expect(subjects[0]).toEqual(sinHorario);
  });

  it("conserva el turno de los grupos que ya existían", () => {
    const { subjects } = conHorarioOficial({
      subjects: [subject("SO", "Sistemas Operativos", [grupo("A", [], {}, "tarde")])],
      grupos: HORARIO,
    });
    expect(subjects[0].grupos[0].turno).toBe("tarde");
  });
});

describe("data.js y los horarios", () => {
  const source = readFileSync(DATA_PATH, "utf8");
  const subjects = JSON.parse(
    source.slice(source.indexOf(DECLARACION) + DECLARACION.length, source.lastIndexOf("]") + 1),
  );
  const { asignaturas } = JSON.parse(readFileSync(GRUPOS_PATH, "utf8"));
  const canon = (lista) => (lista || []).map((s) => `${s.dia} ${s.inicio} ${s.fin}`).sort().join("|");

  it("todo grupo del horario está en data.js, con su teoría y sus prácticas", () => {
    const descuadres = [];
    for (const subject of subjects) {
      const porLetra = asignaturas[subject.codigo];
      if (!porLetra) continue;
      for (const [letra, delHorario] of Object.entries(porLetra)) {
        const grupo = subject.grupos.find((g) => g.letra === letra);
        if (!grupo) {
          descuadres.push(`${subject.codigo}-${letra}: no está en data.js`);
          continue;
        }
        if (canon(grupo.teoria) !== canon(delHorario.teoria)) {
          descuadres.push(`${subject.codigo}-${letra}: teoría distinta`);
        }
        for (const [etiqueta, sesiones] of Object.entries(delHorario.practicas)) {
          if (canon(grupo.practicas?.[etiqueta]) !== canon(sesiones)) {
            descuadres.push(`${subject.codigo}-${etiqueta}: prácticas distintas`);
          }
        }
      }
    }
    expect(descuadres).toEqual([]);
  });

  it("data.js no inventa subgrupos que el horario no tenga", () => {
    const practicas = practicasPorAsignatura(asignaturas);
    const sobran = [];
    for (const subject of subjects) {
      if (!practicas[subject.codigo]) continue;
      for (const grupo of subject.grupos) {
        for (const etiqueta of grupo.practicas?.subgrupos || []) {
          if (!practicas[subject.codigo][etiqueta]) sobran.push(`${subject.codigo}-${etiqueta}`);
        }
      }
    }
    expect(sobran).toEqual([]);
  });

  it("todas las asignaturas del horario están en data.js", () => {
    // El repaso incorpora las que faltaban (las optativas de cuarto): si alguna
    // se quedara fuera, su horario no se podría planificar.
    const enData = new Set(subjects.map((s) => s.codigo));
    const fuera = Object.keys(asignaturas).filter((codigo) => !enData.has(codigo));
    expect(fuera).toEqual([]);
  });

  it("el plan de la muestra cubre todas las asignaturas del catálogo", () => {
    const fixture = JSON.parse(readFileSync(path.join(ROOT, "tools/ugr-pipeline/sample-docents.json"), "utf8"));
    const delPlan = new Set(fixture.plan.map((p) => p.codigo));
    const sinPlan = subjects.filter((s) => !delPlan.has(s.codigo)).map((s) => s.codigo);
    expect(sinPlan).toEqual([]);
    // Y las que se quedan en el plan sin horario no repiten a una del catálogo.
    const delCatalogo = new Set(subjects.map((s) => `${s.codigo}|${s.nombre}`));
    expect(fixture.extraSubjects.filter((e) => delCatalogo.has(`${e.codigo}|${e.nombre}`))).toEqual([]);
    expect(readFileSync(GUIAS_PATH, "utf8").length).toBeGreaterThan(0);
  });
});

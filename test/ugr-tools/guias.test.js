import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect } from "vitest";

import {
  buildAsignaciones,
  normalizePersonName,
  parseGuia,
  subjectMatchKey,
} from "../../tools/ugr-pipeline/guias.js";
import { guiaUrls } from "../../tools/ugr-pipeline/scrape-guias.mjs";
import { subgruposPorAsignatura } from "../../tools/ugr-pipeline/horarios.js";

// Lectura de las guías docentes de la ETSIIT: de ahí salen las asignaciones de
// grupo (qué profesor da la teoría de una letra y las prácticas de un
// subgrupo), que no están en los horarios. Lo que se fija aquí es el parseo, la
// numeración de prácticas → etiqueta del horario y el cruce con el catálogo,
// incluido lo que **no** se emite: una asignación sin destino en el horario no
// se inventa.

const ROOT = path.resolve(import.meta.dirname, "../..");
const GUIAS_FIXTURE = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const SUBGRUPOS_FIXTURE = path.join(ROOT, "tools/ugr-pipeline/horarios-subgrupos.json");
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");

/** Página mínima con la forma que tienen las guías de verdad. */
function pagina({ titulo = "Guía docente de Sistemas Operativos (2961123)", curso = "Curso 2026/2027", secciones = "" } = {}) {
  return `<html><body><h1>${titulo}</h1><p>${curso}</p>
<h2>Profesorado</h2>${secciones}<h2>Tutorías</h2><p>Martes de 9:30 a 11:30</p></body></html>`;
}

const SECCION = (titulo, lineas) =>
  `<h3>${titulo}</h3><ul>${lineas.map((l) => `<li>${l}</li>`).join("")}</ul>`;

describe("parseGuia", () => {
  it("lee el nombre, el curso y el profesorado con sus grupos", () => {
    const guia = parseGuia(
      pagina({
        secciones:
          SECCION("Teórico", ["María del Mar Abad Grau. Grupos: B y F", "Juan José Escobar Pérez. Grupo: A"]) +
          SECCION("Práctico", ["Francisco de P. Araque Cuenca Grupos: 1 y 3", "Janet Pigueiras Del Real Grupo: 8"]),
      }),
    );
    expect(guia.nombre).toBe("Sistemas Operativos (2961123)");
    expect(guia.curso).toBe("2026/2027");
    expect(guia.teorico).toEqual([
      { nombre: "María del Mar Abad Grau", grupos: ["B", "F"] },
      { nombre: "Juan José Escobar Pérez", grupos: ["A"] },
    ]);
    expect(guia.practico).toEqual([
      { nombre: "Francisco de P. Araque Cuenca", grupos: ["1", "3"] },
      { nombre: "Janet Pigueiras Del Real", grupos: ["8"] },
    ]);
  });

  it("no inventa profesorado cuando la guía no lo trae (las optativas de mención)", () => {
    const guia = parseGuia(pagina({ titulo: "Guía docente de Robótica Industrial (29611A9)", secciones: "" }));
    expect(guia.teorico).toEqual([]);
    expect(guia.practico).toEqual([]);
    expect(guia.nombre).toBe("Robótica Industrial (29611A9)");
  });
});

describe("normalizePersonName", () => {
  it("quita el punto final que la guía pone tras el nombre en la teoría", () => {
    expect(normalizePersonName("María del Mar Abad Grau.")).toBe("María del Mar Abad Grau");
    expect(normalizePersonName("  Juan  José  Escobar Pérez. ")).toBe("Juan José Escobar Pérez");
    expect(normalizePersonName("Janet Pigueiras Del Real")).toBe("Janet Pigueiras Del Real");
  });
});

describe("subjectMatchKey", () => {
  it("cruza los nombres con o sin especialidad y con o sin acentos", () => {
    expect(subjectMatchKey("Aprendizaje Automático (Especialidad Computación y Sistemas Inteligentes) (296113C)")).toBe(
      subjectMatchKey("Aprendizaje Automatico"),
    );
    expect(subjectMatchKey("Álgebra Lineal y Estructuras Matemáticas")).toBe(
      subjectMatchKey("algebra lineal y estructuras matematicas"),
    );
  });
});

describe("subgruposPorAsignatura", () => {
  it("saca las etiquetas de las páginas del horario, en orden de letra y número", () => {
    const paginas = [
      "1º A Grado en Ingeniería InformáticaFS(A1)FP(A2)ALEM(A3)FS(A2)FS(A3)",
      "1º B Grado en Ingeniería InformáticaFS(B1)FS(B2)FS(B3)",
    ];
    expect(subgruposPorAsignatura(paginas, ["FS", "FP", "ALEM"])).toEqual({
      ALEM: ["A3"],
      FP: ["A2"],
      FS: ["A1", "A2", "A3", "B1", "B2", "B3"],
    });
  });

  it("no inventa códigos: solo devuelve los que el catálogo conoce", () => {
    expect(subgruposPorAsignatura(["ZZZ(A1)FS(A1)"], ["FS"])).toEqual({ FS: ["A1"] });
  });
});

describe("buildAsignaciones", () => {
  const subject = (codigo, nombre, grupos) => ({ codigo, nombre, curso: 1, cuatrimestre: 1, grupos });
  const grupo = (letra, subgrupos = []) => ({
    letra,
    teoria: [],
    practicas: { subgrupos, ...Object.fromEntries(subgrupos.map((s) => [s, []])) },
  });

  const subjects = [
    subject("SO", "Sistemas Operativos", [grupo("A", ["A1", "A2"]), grupo("B")]),
    subject("XX", "Asignatura sin guía", [grupo("A")]),
  ];

  // La numeración de las prácticas es la posición en esta lista, que es la que
  // publican los horarios.
  const subgrupos = { SO: ["A1", "A2", "A3", "B1"] };

  const guias = [
    {
      nombre: "Sistemas Operativos (2961123)",
      teorico: [{ nombre: "Ana Ruiz.", grupos: ["A", "B"] }],
      practico: [
        { nombre: "Luis Pérez", grupos: ["1", "2"] },
        { nombre: "Marta Gil", grupos: ["4"] },
      ],
    },
  ];

  it("cruza la guía con el catálogo: letras de teoría y números de prácticas", () => {
    const { asignaciones } = buildAsignaciones({ guias, subjects, subgrupos });
    expect(asignaciones).toEqual([
      { key: "SO-A", name: "Ana Ruiz", subjectCode: "SO", groupLetter: "A", modalidad: "Teoría" },
      { key: "SO-B", name: "Ana Ruiz", subjectCode: "SO", groupLetter: "B", modalidad: "Teoría" },
      { key: "SO-A1", name: "Luis Pérez", subjectCode: "SO", groupLetter: "A1", modalidad: "Prácticas" },
      { key: "SO-A2", name: "Luis Pérez", subjectCode: "SO", groupLetter: "A2", modalidad: "Prácticas" },
    ]);
  });

  it("no emite una asignación sin destino: el grupo 4 sería B1 y el horario no tiene ese subgrupo", () => {
    const { asignaciones, sinEtiqueta } = buildAsignaciones({ guias, subjects, subgrupos });
    expect(sinEtiqueta).toEqual(["SO-B1"]);
    expect(asignaciones.some((a) => a.name === "Marta Gil")).toBe(false);
  });

  it("informa de un número que el horario no lista, en vez de colocarlo en otro sitio", () => {
    const { asignaciones, sinEtiqueta } = buildAsignaciones({
      guias,
      subjects,
      subgrupos: { SO: ["A1", "A2", "A3"] },
    });
    expect(sinEtiqueta).toEqual(["SO-nº4"]);
    expect(asignaciones.some((a) => a.name === "Marta Gil")).toBe(false);
  });

  it("informa de la asignatura del catálogo que no cruza con ninguna guía", () => {
    const { sinGuia } = buildAsignaciones({ guias, subjects, subgrupos });
    expect(sinGuia).toEqual(["XX"]);
  });

  it("con dos nombres para el mismo grupo se queda el primero y lo cuenta", () => {
    const doble = [
      {
        nombre: "Sistemas Operativos",
        teorico: [{ nombre: "Ana Ruiz.", grupos: ["A"] }],
        practico: [
          { nombre: "Luis Pérez", grupos: ["1"] },
          { nombre: "Marta Gil", grupos: ["1"] },
        ],
      },
    ];
    const { asignaciones, conflictos } = buildAsignaciones({
      guias: doble,
      subjects: [subjects[0]],
      subgrupos,
    });
    expect(asignaciones.filter((a) => a.key === "SO-A1").map((a) => a.name)).toEqual(["Luis Pérez"]);
    expect(conflictos).toEqual(["SO-A1: Luis Pérez / Marta Gil"]);
  });
});

describe("guiaUrls", () => {
  it("saca las guías de la página de la titulación, sin repetir y en https", () => {
    const html = `
      <a href="http://etsiit.ugr.es/informacion-academica/grados/x/calculo/11/guia-docente">Ver guía</a>
      <a href="/informacion-academica/grados/x/sistemas-operativos/11/guia-docente">Ver guía</a>
      <a href="/informacion-academica/grados/x/calculo/11/guia-docente">Ver guía</a>
      <a href="/informacion-academica/grados/x/calculo/11">Asignatura</a>`;
    expect(guiaUrls(html)).toEqual([
      "https://etsiit.ugr.es/informacion-academica/grados/x/calculo/11/guia-docente",
      "https://etsiit.ugr.es/informacion-academica/grados/x/sistemas-operativos/11/guia-docente",
    ]);
  });
});

describe("volcado de las guías", () => {
  const fixture = JSON.parse(readFileSync(GUIAS_FIXTURE, "utf8"));

  it("trae las guías del curso en vigor y con su URL", () => {
    expect(fixture.guias.length).toBeGreaterThan(40);
    expect(fixture.curso).toMatch(/^20\d\d\/20\d\d$/);
    expect(fixture.guias.every((g) => g.url.startsWith("https://") && g.nombre)).toBe(true);
  });

  it("los subgrupos del horario cuadran con los grupos de prácticas de las guías", () => {
    // Las dos fuentes son independientes —la guía lista profesores por número y
    // el horario dibuja etiquetas— y tienen que dar el mismo total: si alguna se
    // descoloca (o el parseo del PDF deja de leer bien), se ve aquí. Las
    // optativas que no tienen grupos en el horario (DGP, MDA, DI) no se cuentan.
    const horarios = JSON.parse(readFileSync(SUBGRUPOS_FIXTURE, "utf8"));
    expect(horarios.curso).toBe(fixture.curso);
    const catalogo = {};
    vm.runInNewContext(
      `${readFileSync(DATA_PATH, "utf8")}\nthis.__S__ = SUBJECTS;`,
      catalogo,
      { filename: DATA_PATH },
    );
    const porNombre = new Map(fixture.guias.map((g) => [subjectMatchKey(g.nombre), g]));
    const descuadres = [];
    let sinHorario = 0;
    for (const subject of catalogo.__S__) {
      const guia = porNombre.get(subjectMatchKey(subject.nombre));
      const numeros = new Set((guia?.practico || []).flatMap((p) => p.grupos.map(Number)));
      if (!numeros.size) continue;
      const etiquetas = horarios.asignaturas[subject.codigo] || [];
      if (!etiquetas.length) {
        sinHorario += 1;
        continue;
      }
      const maximo = Math.max(...numeros);
      if (etiquetas.length !== maximo) {
        descuadres.push(`${subject.codigo}: horario ${etiquetas.length} vs guía ${maximo}`);
      }
    }
    expect(descuadres).toEqual([]);
    expect(sinHorario).toBeLessThanOrEqual(3);
  });

  it("la mayoría trae profesorado, con letras en la teoría y números en las prácticas", () => {
    // Guarda contra un cambio de forma de la web: si el parseo dejara de
    // encontrar la sección, el volcado saldría vacío y las asignaciones con él.
    const conProfesorado = fixture.guias.filter((g) => g.teorico.length || g.practico.length);
    expect(conProfesorado.length).toBeGreaterThan(40);
    const teoria = conProfesorado.flatMap((g) => g.teorico);
    const practicas = conProfesorado.flatMap((g) => g.practico);
    expect(teoria.every((t) => t.grupos.length && t.grupos.every((x) => /^[A-F]$/.test(x)))).toBe(true);
    expect(practicas.every((p) => p.grupos.length && p.grupos.every((x) => /^\d+$/.test(x)))).toBe(true);
  });
});

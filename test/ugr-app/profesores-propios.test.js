import { describe, it, expect } from "vitest";

import {
  DIFICULTAD_OPCIONES,
  buildProfesorPrompt,
  mergeProfesores,
  normalizeOwnReview,
  ownReviewToProfesor,
  ownReviewsToJSON,
  parseOwnReviewsJSON,
} from "../../public/ugr/src/app/domain/profesores-propios.js";

// Los profesores propios: las valoraciones que añade el usuario encima del
// catálogo. Lo que se fija aquí es la forma canónica de una valoración (con
// asignatura y sin ella), la lectura del JSON de importación, la fusión «manda
// la tuya» y el prompt que se copia.

describe("normalizeOwnReview", () => {
  it("exige un nombre", () => {
    expect(normalizeOwnReview(null)).toBeNull();
    expect(normalizeOwnReview({ subjectCode: "SO" })).toBeNull();
    expect(normalizeOwnReview({ name: "   " })).toBeNull();
  });

  it("con asignatura y modalidad la clave es la terna, como la del catálogo", () => {
    const review = normalizeOwnReview({
      name: "Ana Ruiz",
      subjectCode: "SO",
      modalidad: "Prácticas",
      dificultad: "naranja",
      opinions: ["  Explica bien  ", "", "Corrige duro"],
    });
    expect(review).toMatchObject({
      docentKey: "SO|Prácticas|Ana Ruiz",
      name: "Ana Ruiz",
      subjectCode: "SO",
      modalidad: "Prácticas",
      dificultad: "naranja",
      opinions: ["Explica bien", "Corrige duro"],
    });
  });

  it("sin asignatura la clave es el nombre y no hay modalidad", () => {
    const review = normalizeOwnReview({ name: "Ana Ruiz", dificultad: "rojo" });
    expect(review).toMatchObject({ docentKey: "Ana Ruiz", subjectCode: "", modalidad: "" });
  });

  it("con asignatura y sin modalidad, la teoría es el defecto", () => {
    expect(normalizeOwnReview({ name: "Ana", subjectCode: "SO" }).modalidad).toBe("Teoría");
  });

  it("acepta la dificultad por clave o por la etiqueta de la hoja", () => {
    expect(normalizeOwnReview({ name: "A", dificultad: "Difícil" }).dificultad).toBe("naranja");
    expect(normalizeOwnReview({ name: "A", dificultad: "Se desconoce" }).dificultad).toBe("gris");
    // Sin valoración es legítimo; un valor inventado no.
    expect(normalizeOwnReview({ name: "A", dificultad: "" }).dificultad).toBeNull();
    expect(normalizeOwnReview({ name: "A", dificultad: "imposible" })).toBeNull();
  });

  it("acepta la `opinion` singular heredada como una opinión más", () => {
    expect(normalizeOwnReview({ name: "A", opinion: "Solo una" }).opinions).toEqual(["Solo una"]);
  });

  it("la escala del formulario sale del mapa de etiquetas, de fácil a difícil", () => {
    expect(DIFICULTAD_OPCIONES[0]).toEqual({ key: "cyan", label: "Muy fácil" });
    expect(DIFICULTAD_OPCIONES.map((o) => o.key)).toEqual([
      "cyan", "verde", "amarillo", "naranja", "rojo", "negro", "gris",
    ]);
  });
});

describe("parseOwnReviewsJSON", () => {
  it("lee un array y un objeto con `profesores`", () => {
    expect(parseOwnReviewsJSON('[{"name":"Ana","dificultad":"rojo"}]').reviews).toHaveLength(1);
    expect(parseOwnReviewsJSON('{"profesores":[{"name":"Ana"}]}').reviews).toHaveLength(1);
    expect(parseOwnReviewsJSON('{"reviews":[{"name":"Ana"}]}').reviews).toHaveLength(1);
  });

  it("dice por qué no vale lo que no vale, sin tirar el resto", () => {
    const out = parseOwnReviewsJSON('[{"name":"Ana"},{"dificultad":"rojo"},{"name":"Bea","dificultad":"zzz"}]');
    expect(out.reviews).toHaveLength(1);
    expect(out.errors).toHaveLength(2);
    expect(out.errors[0]).toContain("Entrada 2");
  });

  it("un texto que no es JSON o una lista ausente se explican", () => {
    expect(parseOwnReviewsJSON("no json").reviews).toEqual([]);
    expect(parseOwnReviewsJSON("no json").errors[0]).toContain("JSON válido");
    expect(parseOwnReviewsJSON('{"otra":"cosa"}').errors[0]).toContain("lista de profesores");
  });
});

describe("mergeProfesores", () => {
  const catalogo = [
    { key: "SO|Teoría|Ana Ruiz", name: "Ana Ruiz", subjectCode: "SO", modalidad: "Teoría", dificultad: "amarillo" },
    { key: "IG|Teoría|Bea", name: "Bea", subjectCode: "IG", modalidad: "Teoría", dificultad: "verde" },
  ];

  it("la tuya manda para la misma terna y no toca las demás", () => {
    const propia = normalizeOwnReview({ name: "Ana Ruiz", subjectCode: "SO", modalidad: "Teoría", dificultad: "negro" });
    const { profesores, keys } = mergeProfesores(catalogo, [propia]);
    const ana = profesores.find((p) => p.key === "SO|Teoría|Ana Ruiz");
    expect(ana.dificultad).toBe("negro");
    expect(ana.propio).toBe(true);
    expect(profesores.find((p) => p.key === "IG|Teoría|Bea").dificultad).toBe("verde");
    expect([...keys]).toEqual(["SO|Teoría|Ana Ruiz"]);
  });

  it("una valoración sin asignatura se añade aparte, con el nombre por clave", () => {
    const suelta = normalizeOwnReview({ name: "Ana Ruiz", dificultad: "rojo" });
    const { profesores } = mergeProfesores(catalogo, [suelta]);
    expect(profesores).toHaveLength(3);
    expect(profesores.find((p) => p.key === "Ana Ruiz")).toMatchObject({ subjectCode: "", modalidad: "" });
  });
});

describe("ownReviewToProfesor", () => {
  it("tiene la forma de un perfil del catálogo y la marca `propio`", () => {
    const perfil = ownReviewToProfesor(
      normalizeOwnReview({ name: "Ana", subjectCode: "SO", dificultad: "verde", opinions: ["Bien"] }),
    );
    expect(perfil).toMatchObject({
      key: "SO|Teoría|Ana",
      dificultad: "verde",
      opinions: ["Bien"],
      propio: true,
      cruzada: false,
      comentarios: [],
    });
  });
});

describe("ownReviewsToJSON", () => {
  it("exporta el esquema canónico y se puede volver a importar", () => {
    const review = normalizeOwnReview({ name: "Ana", subjectCode: "SO", dificultad: "rojo", opinions: ["Dura"] });
    const json = ownReviewsToJSON([review]);
    expect(JSON.parse(json)[0]).toEqual({
      name: "Ana",
      subjectCode: "SO",
      modalidad: "Teoría",
      dificultad: "rojo",
      opinions: ["Dura"],
    });
    expect(parseOwnReviewsJSON(json).reviews).toHaveLength(1);
  });
});

describe("buildProfesorPrompt", () => {
  it("lleva la escala, las reglas y la estructura de asignaturas del catálogo", () => {
    const prompt = buildProfesorPrompt([
      { codigo: "SO", nombre: "Sistemas Operativos", grupos: [
        { letra: "A", practicas: { subgrupos: ["A1", "A2"] } },
        { letra: "B", practicas: { subgrupos: ["B1"] } },
      ] },
      { codigo: "LP", nombre: "Lógica", grupos: [{ letra: "A" }] },
    ]);
    expect(prompt).toContain("naranja (Difícil)");
    expect(prompt).toContain("SO — Sistemas Operativos — A, B / A1, A2, B1");
    expect(prompt).toContain("LP — Lógica — A");
    expect(prompt).toContain("No inventes asignaturas");
  });

  it("aguanta asignaturas sin grupos", () => {
    const prompt = buildProfesorPrompt([{ codigo: "X", nombre: "Sin grupos", grupos: [] }]);
    expect(prompt).toContain("X — Sin grupos — sin grupos");
  });
});

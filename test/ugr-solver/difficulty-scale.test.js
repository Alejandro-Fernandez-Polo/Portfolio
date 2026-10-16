import { describe, it, expect } from "vitest";

import {
  DIFFICULTY_BY_LABEL,
  DIFFICULTY_SCORES,
  DIFFICULTY_UI_LABELS,
  MAX_DIFFICULTY_SCORE,
  difficultyLabel,
  difficultyToken,
} from "../../public/ugr/src/solver/catalog.js";

// La escala de dificultad tiene **una** fuente de verdad por cosa: la hoja manda
// en las etiquetas que se parsean (`DIFFICULTY_BY_LABEL`), la interfaz en las que
// se enseñan (`DIFFICULTY_UI_LABELS`) y el CSS en el color (`--diff-*`, del que
// aquí solo se guarda el **token**). Estos casos impiden que vuelvan a separarse.

describe("escala de dificultad: etiquetas de la hoja vs de la interfaz", () => {
  it("cubre las mismas claves que la escala", () => {
    // Sin lista a mano: las claves de la interfaz son las de la escala más `gris`.
    expect(Object.keys(DIFFICULTY_UI_LABELS).sort()).toEqual(
      [...Object.keys(DIFFICULTY_SCORES), "gris"].sort(),
    );
    expect(Object.keys(DIFFICULTY_UI_LABELS)).toHaveLength(7);
  });

  it("son dos voces a propósito, no una mal copiada", () => {
    // La hoja dice «Extremo (3% aprobados)» y «Se desconoce»; la pantalla, «Extremo» y «Desconocido».
    expect(DIFFICULTY_BY_LABEL["Extremo (3% aprobados)"]).toBe("negro");
    expect(DIFFICULTY_UI_LABELS.negro).toBe("Extremo");
    expect(DIFFICULTY_BY_LABEL["Se desconoce"]).toBe("gris");
    expect(DIFFICULTY_UI_LABELS.gris).toBe("Desconocido");
  });

  it("una dificultad desconocida cae al gris, como antes", () => {
    expect(difficultyLabel("inventada")).toBe("Desconocido");
    expect(difficultyLabel(null)).toBe("Desconocido");
    expect(difficultyToken("inventada")).toBe("var(--diff-gris)");
  });
});

describe("la escala: techo y color", () => {
  it("el techo se deriva de la escala", () => {
    expect(MAX_DIFFICULTY_SCORE).toBe(6);
    expect(MAX_DIFFICULTY_SCORE).toBe(Math.max(...Object.values(DIFFICULTY_SCORES)));
  });

  it("el color es un token del CSS, nunca un valor", () => {
    expect(difficultyToken("naranja")).toBe("var(--diff-naranja)");
    // Y ningún valor hexadecimal en la salida: el valor vive en la hoja.
    for (const clave of Object.keys(DIFFICULTY_UI_LABELS)) {
      expect(difficultyToken(clave)).toMatch(/^var\(--diff-[a-z]+\)$/);
      expect(difficultyToken(clave)).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });
});

// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { bootUgrApp, flush, textOf } from "./appHarness.js";

// Caracterización de la **ficha de asignatura**: la dificultad y la descripción
// del plan por modalidad, que solo trae el catálogo completo. En la muestra sale
// la explicación de por qué viene vacía, que es lo que evita pensar que falta algo.

const FFT_CON_FICHA = {
  codigo: "FFT",
  nombre: "Fundamentos Físicos y Tecnológicos",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  dificultad: { teoria: "verde", practicas: "rojo" },
  descripcion: { teoria: "Ondas, campos y semiconductores.", practicas: "Laboratorio de medidas." },
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "lunes", inicio: "09:30", fin: "10:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }] },
    },
  ],
};

const FFT_MUESTRA = {
  codigo: "FFT",
  nombre: "Fundamentos Físicos y Tecnológicos",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [{ letra: "A", turno: "mañana", teoria: [{ dia: "lunes", inicio: "09:30", fin: "10:30" }], practicas: { subgrupos: ["A1"], A1: [] } }],
};

const modal = () => document.getElementById("asignatura-modal");
const abrirDesdeLaTarjeta = (codigo) => {
  const punto = document.querySelector(`.subject-diff[data-diff-codigo="${codigo}"]`);
  if (!punto) throw new Error("la tarjeta no tiene puntos de dificultad");
  punto.click();
};

describe("la ficha de asignatura (monolito real)", () => {
  it("los puntos de dificultad de la tarjeta abren la ficha con la dificultad y la descripción", async () => {
    await bootUgrApp({ subjects: [FFT_CON_FICHA] });
    await flush();

    abrirDesdeLaTarjeta("FFT");
    await flush();

    expect(modal().hidden).toBe(false);
    expect(textOf("#asignatura-modal-title")).toBe("Fundamentos Físicos y Tecnológicos");
    expect(textOf("#asignatura-modal-body")).toContain("FFT · 1º curso · 1º cuatrimestre · 6 ECTS");
    // Una fila por modalidad, con su insignia de dificultad.
    expect(textOf("#asignatura-modal-body")).toContain("Dificultad de la asignatura");
    expect(document.querySelectorAll("#asignatura-modal-body .asignatura-ficha-row")).toHaveLength(4);
    expect(textOf("#asignatura-modal-body")).toContain("Fácil");
    expect(textOf("#asignatura-modal-body")).toContain("Muy difícil");
    expect(textOf("#asignatura-modal-body")).toContain("Ondas, campos y semiconductores.");
  });

  it("una ficha sin datos explica que vienen con el catálogo completo", async () => {
    // Ojo: por la interfaz esta rama no se alcanza —los puntos de dificultad, que
    // son la única entrada a la ficha, solo existen si la asignatura trae
    // dificultad—, así que se fija por el contrato de la vista.
    await bootUgrApp({ subjects: [FFT_MUESTRA] });
    await flush();

    document.dispatchEvent(new CustomEvent("ugr:openAsignatura", { detail: { codigo: "FFT" } }));
    await flush();

    expect(modal().hidden).toBe(false);
    expect(textOf("#asignatura-modal-body")).toContain("no trae dificultad ni descripción");
    expect(textOf("#asignatura-modal-body")).toContain("el archivo con contraseña");
  });

  it("se cierra con el botón, con Escape y pulsando fuera", async () => {
    await bootUgrApp({ subjects: [FFT_CON_FICHA] });
    await flush();

    abrirDesdeLaTarjeta("FFT");
    expect(modal().hidden).toBe(false);
    document.getElementById("asignatura-modal-close").click();
    expect(modal().hidden).toBe(true);

    abrirDesdeLaTarjeta("FFT");
    modal().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(modal().hidden).toBe(true);

    abrirDesdeLaTarjeta("FFT");
    modal().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(modal().hidden).toBe(true);
  });

  it("un código que no está en el catálogo no abre nada", async () => {
    await bootUgrApp({ subjects: [FFT_CON_FICHA] });
    await flush();

    document.dispatchEvent(new CustomEvent("ugr:openAsignatura", { detail: { codigo: "NOEXISTE" } }));
    await flush();

    expect(modal().hidden).toBe(true);
  });
});

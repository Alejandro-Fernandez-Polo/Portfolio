// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { bootUgrApp, clickSubject, flush, textOf } from "./appHarness.js";

// Caracterización del **resumen de la selección**: el panel con sus contadores, la
// lista de conflictos, la barra superior con la meta de créditos y los botones
// que dependen de que haya algo seleccionado.

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
      teoria: [{ dia: "lunes", inicio: "09:30", fin: "10:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }] },
    },
  ],
};

const CA = {
  codigo: "CA",
  nombre: "Cálculo",
  curso: 2,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      // Solapa con FFT: mismo día y tramo compartido.
      teoria: [{ dia: "lunes", inicio: "10:00", fin: "11:00" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "jueves", inicio: "09:30", fin: "10:30" }] },
    },
  ],
};

const TARDE = {
  codigo: "TAR",
  nombre: "Materia de tarde",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "tarde",
      teoria: [{ dia: "lunes", inicio: "17:30", fin: "18:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "viernes", inicio: "17:30", fin: "18:30" }] },
    },
  ],
};

const TFG = {
  codigo: "TFG",
  nombre: "Trabajo Fin de Grado",
  curso: 4,
  cuatrimestre: 1,
  creditos: 30,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "viernes", inicio: "09:30", fin: "10:30" }],
      practicas: { subgrupos: [], },
    },
  ],
};

const stats = () => [...document.querySelectorAll("#summary-content .summary-stat")].map((s) => s.textContent.replace(/\s+/g, ""));

describe("el resumen de la selección (monolito real)", () => {
  it("sin selección invita a elegir y deshabilita los botones", async () => {
    await bootUgrApp({ subjects: [FFT, CA] });
    await flush();

    expect(textOf("#summary-content")).toContain("Selecciona asignaturas");
    expect(textOf("#conflicts-list")).toContain("Sin conflictos");
    expect(document.getElementById("btn-export").disabled).toBe(true);
    expect(document.getElementById("btn-share").disabled).toBe(true);
    expect(document.getElementById("selected-count").textContent).toBe("0");
  });

  it("cuenta asignaturas, créditos, horas y conflictos, y lista el solape", async () => {
    await bootUgrApp({ subjects: [FFT, CA] });
    clickSubject("FFT");
    await flush();
    clickSubject("CA");
    await flush();

    // Cada contador: valor y etiqueta (sin espacio entre ellos en el DOM).
    expect(stats()).toEqual(["2Asignaturas", "12CréditosECTS", "4.0hHoras/semana", "1Conflictos"]);
    expect(document.getElementById("conflicts-panel").classList.contains("has-conflicts")).toBe(true);
    const conflicto = textOf("#conflicts-list");
    expect(conflicto).toContain("Fundamentos Físicos y Tecnológicos");
    expect(conflicto).toContain("Cálculo");
    expect(conflicto).toContain("Lunes 09:30-10:30");
    expect(document.getElementById("btn-export").disabled).toBe(false);
    expect(document.getElementById("btn-share").disabled).toBe(false);
  });

  it("la barra superior lleva la cuenta y la meta de créditos", async () => {
    await bootUgrApp({ subjects: [FFT, CA, TFG] });
    clickSubject("FFT");
    await flush();
    clickSubject("CA");
    await flush();

    expect(document.getElementById("selected-count").textContent).toBe("2");
    expect(document.getElementById("total-credits").textContent).toBe("12");
    const meta = document.getElementById("credit-meta");
    // La meta son 30: doce no la alcanzan.
    expect(meta.textContent).toBe("(meta: 30)");
    expect(meta.classList.contains("over")).toBe(false);

    // Con una materia de 30 se alcanza y se pasa.
    clickSubject("TFG");
    await flush();
    expect(document.getElementById("total-credits").textContent).toBe("42");
    expect(meta.textContent).toBe("(meta: 30 \u2713)");
    expect(meta.classList.contains("over")).toBe(true);
  });

  it("el turno se pinta como insignia cuando todas van a la misma franja", async () => {
    await bootUgrApp({ subjects: [FFT, TARDE] });
    clickSubject("FFT");
    await flush();
    expect(textOf("#summary-content")).toContain("Turno: Mañana");

    clickSubject("TAR");
    await flush();
    expect(textOf("#summary-content")).toContain("Turno: Mixto");
  });
});

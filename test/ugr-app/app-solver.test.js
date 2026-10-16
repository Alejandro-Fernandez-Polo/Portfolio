// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";

import { bootUgrApp, clickSubject, flush, savedConfigsFromStorage, textOf } from "./appHarness.js";

// Caracterización de la interfaz del **solver** en el monolito: generar, la
// tabla de resultados y guardar un resultado. Hueco que quedó a la vista en la
// fase 2 (la regresión del paso 2 vivía justo aquí) y que se cubre con el puente
// del solver doblado: en jsdom no hay worker, así que se inyecta un motor falso
// con la misma forma que `solveTopK`.
//
// Lo que se fija es el contrato del monolito con el motor, no el motor (ese ya
// tiene sus tests en `test/ugr-solver/`).

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

/** Motor doble con la forma de `solveTopK` que espera `runSolver`. */
function fakeSolver(cuantos = 1) {
  return {
    // La comprobación de viabilidad responde que sí: el camino queda libre.
    check: async () => true,
    solveTopK: async () => ({
      items: Array.from({ length: cuantos }, () => ({
        selectedSubjects: { FFT: true },
        groupChoices: { FFT: { teoria: "A", practica: "A1" } },
        cost: 10,
        costBreakdown: { deadHours: 0 },
      })),
      stats: { approximate: false },
      fromCache: false,
    }),
  };
}

const filas = () => [...document.querySelectorAll("#saved-configs-list tbody tr")];
const botonesGuardar = () => document.querySelectorAll('#saved-configs-list [data-action="save-solver"]').length;
const botonesBorrar = () => document.querySelectorAll('#saved-configs-list [data-action="delete"]').length;

describe("interfaz del solver (monolito real, motor doblado)", () => {
  let app;

  beforeEach(async () => {
    app = await bootUgrApp({ subjects: [FFT], solver: fakeSolver(3) });
  });

  it("el botón de generar está bloqueado sin selección y se habilita al marcar una materia", async () => {
    expect(document.getElementById("btn-solver-generate").disabled).toBe(true);
    clickSubject("FFT");
    await flush();
    // La viabilidad se comprueba con debounce (300 ms) antes de liberar el botón.
    await new Promise((r) => setTimeout(r, 400));
    expect(document.getElementById("btn-solver-generate").disabled).toBe(false);
  });

  it("generar llena la tabla con los resultados del solver, cada uno con su botón Guardar", async () => {
    clickSubject("FFT");
    await flush();
    document.getElementById("btn-solver-generate").click();
    await flush();

    expect(textOf("#solver-status")).toContain("3 horarios generados");
    expect(filas()).toHaveLength(3);
    expect(botonesGuardar()).toBe(3);
    // Un resultado del solver no se borra: se guarda.
    expect(botonesBorrar()).toBe(0);
  });

  it("guardar un resultado del solver lo añade como configuración guardada y persistida", async () => {
    clickSubject("FFT");
    await flush();
    document.getElementById("btn-solver-generate").click();
    await flush();

    document.querySelector('#saved-configs-list [data-action="save-solver"]').click();
    await flush();

    // Quedan los 3 resultados del solver + la guardada (borrable).
    expect(filas()).toHaveLength(4);
    expect(botonesGuardar()).toBe(3);
    expect(botonesBorrar()).toBe(1);

    const guardadas = savedConfigsFromStorage(app.storage);
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].name).toContain("Generado 1");
    expect(guardadas[0].selectedSubjects).toEqual({ FFT: true });
  });

  it("sin motor disponible avisa en vez de quedarse en blanco", async () => {
    const sinMotor = await bootUgrApp({ subjects: [FFT] }); // sin `solver`
    clickSubject("FFT");
    await flush();
    document.getElementById("btn-solver-generate").click();
    await flush();
    expect(textOf("#solver-status")).toContain("motor no está disponible");
    expect(filas()).toHaveLength(0);
    expect(sinMotor.legacy.getState().selectedSubjects).toEqual({ FFT: true });
  });
});

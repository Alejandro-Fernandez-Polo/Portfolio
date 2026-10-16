// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";

import {
  bootUgrApp,
  clickSubject,
  flush,
  makeStore,
  savedConfigsFromStorage,
  textOf,
} from "./appHarness.js";

// Caracterización del camino **selección → calendario → configuración** en el
// monolito `public/ugr/app.js`. Fija lo que hace hoy, de punta a punta y por el
// camino real (clic en la tarjeta → estado → store → DOM), que es lo que ninguna
// suite cubría: las reglas puras ya estaban pinnadas en `test/ugr-app/`, pero la
// **orquestación** del IIFE no.
//
// Regla del recorrido: esto fotografía el comportamiento actual. Si algo de aquí
// parece un bug, se anota en el ledger (planes/TECH-DEBT.md) en vez de
// «arreglarlo» aquí.

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
      practicas: { subgrupos: ["A1", "A2"], A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }], A2: [{ dia: "miercoles", inicio: "11:30", fin: "12:30" }] },
    },
  ],
};

// Sin solape con FFT (10:30 en punto, cuando FFT acaba).
const ALG = {
  codigo: "ALG",
  nombre: "Algorítmica",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "lunes", inicio: "10:30", fin: "11:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "lunes", inicio: "12:30", fin: "13:30" }] },
    },
    {
      letra: "B",
      turno: "tarde",
      teoria: [{ dia: "lunes", inicio: "17:30", fin: "18:30" }],
      practicas: { subgrupos: ["B1"], B1: [{ dia: "martes", inicio: "18:30", fin: "19:30" }] },
    },
  ],
};

// Solapa con FFT a propósito (mismo tramo que su teoría).
const SOLAPE = {
  codigo: "SOL",
  nombre: "Asignatura que solapa",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "lunes", inicio: "09:30", fin: "10:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "jueves", inicio: "09:30", fin: "10:30" }] },
    },
  ],
};

const TRES = [FFT, ALG, SOLAPE];

describe("camino selección → calendario → configuración (monolito real)", () => {
  let app;

  beforeEach(async () => {
    app = await bootUgrApp({ subjects: TRES });
    // Los empujes del arranque se miden por separado (ver el primer test) para
    // que el contador refleje solo lo que provoca cada interacción.
    app.initPushes = app.store.dispatched.filter((cmd) => cmd.type === "selection/setAll");
    app.store.dispatched.length = 0;
  });

  it("arranca con la rejilla pintada, sin selección y sembrando la selección en el store", () => {
    expect(document.querySelectorAll(".subject-card")).toHaveLength(3);
    expect(app.legacy.getState().selectedSubjects).toEqual({});
    expect(textOf("#summary-content")).toContain("Selecciona asignaturas");
    // Caracterizado: el arranque empuja la selección al store dos veces —el
    // push explícito del arranque y el que hace `saveState()` durante la
    // sincronización del catálogo—. Es la siembra del store, no un fallo.
    expect(app.initPushes).toHaveLength(1);
  });

  it("seleccionar una tarjeta: elige el primer grupo, llega al store y repinta resumen y calendario", async () => {
    clickSubject("FFT");
    await flush();

    const s = app.legacy.getState();
    expect(s.selectedSubjects).toEqual({ FFT: true });
    expect(s.groupChoices.FFT).toEqual({ teoria: "A", practica: "A1" });

    // El store (la persistencia) recibe la selección completa, no un delta.
    expect(app.store.getState().selection.selectedSubjects).toEqual({ FFT: true });
    expect(app.store.getState().selection.groupChoices).toEqual({ FFT: { teoria: "A", practica: "A1" } });

    // Resumen: asignaturas, créditos, horas y turno.
    const resumen = textOf("#summary-content");
    expect(resumen).toContain("6");
    expect(resumen).toContain("2.0h");
    expect(resumen).toContain("Turno: Mañana");
    expect(resumen).toContain("0Conflictos");

    // Calendario: teoría del grupo A y práctica del subgrupo A1.
    const calendario = textOf("#calendar");
    expect(calendario).toContain("FFT");
    expect(calendario).toContain("Teoría");
    expect(calendario).toContain("Grupo A");
    expect(calendario).toContain("Práctica");
    expect(calendario).toContain("Subgrupo A1");
  });

  it("desmarcar la tarjeta limpia selección y grupos, y vacía el resumen", async () => {
    clickSubject("FFT");
    await flush();
    clickSubject("FFT");
    await flush();

    const s = app.legacy.getState();
    // Desmarcar **borra** la clave (no la deja en `false`): el estado guardado no
    // acumula claves muertas.
    expect(s.selectedSubjects).toEqual({});
    expect(app.store.getState().selection.selectedSubjects).toEqual({});
    // La elección de grupo sí se conserva: es la que recuerda la materia
    // (`initGroupChoice` respeta la que ya existe al volver a marcarla).
    expect(s.groupChoices.FFT).toEqual({ teoria: "A", practica: "A1" });
    expect(textOf("#summary-content")).toContain("Selecciona asignaturas");
  });

  it("dos asignaturas que solapan cuentan un conflicto y lo marcan en el calendario", async () => {
    clickSubject("FFT");
    await flush();
    clickSubject("SOL");
    await flush();

    expect(textOf("#summary-content")).toContain("1Conflictos");
    expect(document.querySelectorAll("#calendar .cal-event.conflict").length).toBeGreaterThan(0);
  });

  it("guardar configuración exige nombre y selección, y persiste la forma exacta", async () => {
    // Sin nombre no guarda.
    clickSubject("FFT");
    await flush();
    document.getElementById("btn-save-config").click();
    await flush();
    expect(savedConfigsFromStorage(app.storage)).toHaveLength(0);

    // Con nombre sí, y con la forma que consume `loadConfig`.
    document.getElementById("config-name").value = "Mi horario";
    document.getElementById("btn-save-config").click();
    await flush();

    const guardadas = savedConfigsFromStorage(app.storage);
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({ name: "Mi horario" });
    expect(guardadas[0].selectedSubjects).toEqual({ FFT: true });
    expect(guardadas[0].groupChoices).toEqual({ FFT: { teoria: "A", practica: "A1" } });
    expect(typeof guardadas[0].id).toBe("number");
    expect(textOf("#saved-configs-list")).toContain("Mi horario");
    // El campo de nombre se vacía tras guardar.
    expect(document.getElementById("config-name").value).toBe("");
  });

  it("cargar una configuración devuelve la selección y los grupos", async () => {
    clickSubject("FFT");
    await flush();
    document.getElementById("config-name").value = "Mi horario";
    document.getElementById("btn-save-config").click();
    await flush();

    // Se desmarca a mano para comprobar que cargar la restituye.
    clickSubject("FFT");
    await flush();
    expect(app.legacy.getState().selectedSubjects).toEqual({});

    document.querySelector('#saved-configs-list [data-action="load"]').click();
    await flush();

    const s = app.legacy.getState();
    expect(s.selectedSubjects).toEqual({ FFT: true });
    expect(s.groupChoices.FFT).toEqual({ teoria: "A", practica: "A1" });
    expect(textOf("#summary-content")).toContain("FFT");
  });

  it("la selección llega al store una sola vez por clic y el estado guardado es idempotente", async () => {
    clickSubject("FFT");
    await flush();

    const setAll = app.store.dispatched.filter((cmd) => cmd.type === "selection/setAll");
    // Un clic = un `setAll` (con el reducer real, los siguientes son no-op y no
    // vuelven a notificar). Si esto subiera, cada clic reescribiría el userState.
    expect(setAll).toHaveLength(1);
    expect(setAll[0].payload.selectedSubjects).toEqual({ FFT: true });
  });

  it("reutilizar el arnés con otro store no arrastra la selección anterior", async () => {
    const segundo = await bootUgrApp({ subjects: TRES, store: makeStore() });
    expect(segundo.legacy.getState().selectedSubjects).toEqual({});
    expect(segundo.store.getState().selection.selectedSubjects).toEqual({});
  });

  // ─── La tabla de configuraciones (vista extraída a ESM) ────────────────────
  // Lo que se movió en la fase 2 no estaba cubierto por nadie: estos casos lo
  // fijan por el camino real (guardar desde la UI y leer el DOM).

  /** Guarda una configuración con una sola asignatura seleccionada. */
  async function guardarUnaSola(codigo, nombre) {
    clickSubject(codigo);
    await flush();
    document.getElementById("config-name").value = nombre;
    document.getElementById("btn-save-config").click();
    await flush();
    clickSubject(codigo); // se desmarca para la siguiente
    await flush();
  }

  const nombresEnTabla = () =>
    [...document.querySelectorAll("#saved-configs-list .col-name")].map((td) => td.textContent);

  it("la tabla ordena al pulsar una cabecera y marca la columna activa", async () => {
    // Ojo con la columna «Nombre»: ordena por el **sufijo `#N`** del nombre
    // (la convención de los nombres automáticos), no alfabéticamente. El orden
    // de partida ya es ascendente numérico: 2 < 10.
    await guardarUnaSola("FFT", "Conf #10");
    await guardarUnaSola("ALG", "Conf #2");
    expect(nombresEnTabla()).toEqual(["Conf #2", "Conf #10"]);

    document.querySelector('#saved-configs-list th[data-sort="name"]').click();
    await flush();

    // Primer clic en la columna activa: invierte a descendente.
    expect(nombresEnTabla()).toEqual(["Conf #10", "Conf #2"]);
    const thTras = document.querySelector('#saved-configs-list th[data-sort="name"]');
    expect(thTras.className).toContain("sort-active");
    expect(thTras.textContent).toContain("\u25BC");

    // Y el siguiente vuelve a ascendente.
    thTras.click();
    await flush();
    expect(nombresEnTabla()).toEqual(["Conf #2", "Conf #10"]);
  });

  it("la columna «Días libres» usa las iniciales y el guion cuando no hay ninguno", async () => {
    await guardarUnaSola("FFT", "Zeta");
    // FFT ocupa lunes (teoría) y martes (práctica A1) → libres: X, J, V.
    const fila = [...document.querySelectorAll("#saved-configs-list tbody tr")]
      .find((tr) => tr.querySelector(".col-name")?.textContent === "Zeta");
    expect(fila.querySelector(".col-freedays").textContent).toBe("X, J, V");
  });

  it("la estrella marca la favorita y el filtro de favoritos la deja sola", async () => {
    await guardarUnaSola("FFT", "Zeta");
    await guardarUnaSola("ALG", "Alfa");

    document.querySelector('#saved-configs-list [data-action="favorite"]').click();
    await flush();
    expect(document.querySelectorAll("#saved-configs-list .btn-fav.active")).toHaveLength(1);

    document.getElementById("btn-toggle-favorites").click();
    await flush();
    expect(nombresEnTabla()).toHaveLength(1);
    expect(document.getElementById("btn-toggle-favorites").textContent).toContain("activado");
  });
});

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

// ─── El panel del generador ───────────────────────────────────
// Lo que se toca antes y durante la generación: filtros, estrategia, bloqueos,
// progreso, cancelación y comprobación de viabilidad. El motor va doblado (aquí
// no hay worker) y el doble **lee el DOM** mientras corre, que es la única forma
// de fijar lo que se pinta a mitad de camino.

const FFT2 = {
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
    {
      letra: "B",
      turno: "tarde",
      teoria: [{ dia: "lunes", inicio: "17:30", fin: "18:30" }],
      practicas: { subgrupos: ["B1"], B1: [{ dia: "jueves", inicio: "17:30", fin: "18:30" }] },
    },
  ],
};

const DOCENTES = [
  { key: "FFT-A", name: "Pedro Cartujo", subjectCode: "FFT", groupLetter: "A", modalidad: "Teoría" },
  { key: "FFT-B", name: "Ana Ruiz", subjectCode: "FFT", groupLetter: "B", modalidad: "Teoría" },
];

const PROFESORES = [
  { key: "FFT|Teoría|Pedro Cartujo", name: "Pedro Cartujo", subjectCode: "FFT", modalidad: "Teoría", dificultad: "verde" },
  { key: "FFT|Teoría|Ana Ruiz", name: "Ana Ruiz", subjectCode: "FFT", modalidad: "Teoría", dificultad: "rojo" },
];

/** Motor doble que anota lo que recibe y lo que ve el usuario mientras corre. */
function motorDoble({ feasible = true, items = 3, cache = false, approximate = false } = {}) {
  const llamadas = { viabilidad: [], generar: [], cancelar: 0, progreso: [] };
  return {
    llamadas,
    checkFeasible: async (problem) => {
      llamadas.viabilidad.push(problem);
      return { feasible };
    },
    solveTopK: async (problem, opts) => {
      llamadas.generar.push({ problem, opts });
      if (opts.onProgress) {
        opts.onProgress({ nodes: 2000, found: 2 });
        llamadas.progreso.push({
          width: document.getElementById("solver-progress-fill").style.width,
          status: textOf("#solver-status"),
          cancelarVisible: document.getElementById("btn-solver-cancel").style.display !== "none",
        });
      }
      return {
        items: Array.from({ length: items }, () => ({
          selectedSubjects: { FFT: true },
          groupChoices: { FFT: { teoria: "A", practica: "A1" } },
          cost: 10,
          costBreakdown: { deadHours: 0 },
        })),
        stats: { approximate },
        fromCache: cache,
      };
    },
    cancel: () => {
      llamadas.cancelar += 1;
    },
  };
}

/** Motor que no responde hasta que el test se lo pide (para cancelar). */
function motorQueEspera() {
  const llamadas = { generar: 0, cancelar: 0 };
  let resolver = null;
  return {
    llamadas,
    checkFeasible: async () => ({ feasible: true }),
    solveTopK: () => {
      llamadas.generar += 1;
      return new Promise((r) => {
        resolver = r;
      });
    },
    cancel: () => {
      llamadas.cancelar += 1;
    },
    resolver: (items) => resolver({ items, stats: { approximate: false }, fromCache: false }),
  };
}

/** Arranca con el catálogo de dos grupos, sus docentes y el motor pedido. */
async function bootPanel({ motor, storage, progress } = {}) {
  const doble = motor || motorDoble();
  const app = await bootUgrApp({
    subjects: [FFT2],
    docentes: DOCENTES,
    profesores: PROFESORES,
    solver: doble,
    storage,
    progress,
  });
  return { app, doble };
}

/** Los filtros tal y como quedaron en `localStorage`. */
const filtrosGuardados = (app) => JSON.parse(app.storage.getItem("ugr-solver-filters") || "[]");
const filtro = (app, type) => filtrosGuardados(app).find((f) => f.type === type);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const cambio = (el, valor) => {
  el.value = valor;
  el.dispatchEvent(new Event("change"));
};

describe("el panel del generador (monolito real, motor doblado)", () => {
  it("arranca con los filtros que ya estaban guardados", async () => {
    const { app } = await bootPanel({
      storage: {
        "ugr-solver-filters": JSON.stringify([
          { type: "maxDays", value: 4, weight: 1 },
          { type: "freeDays", value: ["viernes"], weight: 1 },
        ]),
      },
    });

    await flush();
    expect(document.getElementById("solver-max-days").value).toBe("4");
    expect(document.querySelector('[data-solver-day="viernes"]').checked).toBe(true);
    expect(document.getElementById("solver-strategy").value).toBe("balanced");
    expect(filtro(app, "maxDays")).toEqual({ type: "maxDays", value: 4, weight: 1 });
  });

  it("marcar un día libre guarda el filtro y desmarcarlo lo quita", async () => {
    const { app } = await bootPanel();
    await flush();

    const viernes = document.querySelector('[data-solver-day="viernes"]');
    viernes.checked = true;
    viernes.dispatchEvent(new Event("change"));
    await flush();

    expect(filtro(app, "freeDays").value).toEqual(["viernes"]);
    expect(viernes.checked).toBe(true);

    viernes.checked = false;
    viernes.dispatchEvent(new Event("change"));
    await flush();

    // Sin días, el filtro no se guarda vacío: desaparece.
    expect(filtro(app, "freeDays")).toBeUndefined();
  });

  it("los topes numéricos y el turno se guardan, y vaciarlos quita el filtro", async () => {
    const { app } = await bootPanel();
    await flush();

    cambio(document.getElementById("solver-max-days"), "4");
    cambio(document.getElementById("solver-max-morning"), "3");
    await flush();
    expect(filtro(app, "maxDays").value).toBe(4);
    expect(filtro(app, "maxMorningDays").value).toBe(3);

    cambio(document.getElementById("solver-max-days"), "");
    await flush();
    expect(filtro(app, "maxDays")).toBeUndefined();

    cambio(document.getElementById("solver-prefer-turno"), "solo-mañana");
    await flush();
    expect(filtro(app, "preferTurno").value).toBe("solo-mañana");

    // «Indiferente» no es un filtro: es su ausencia.
    cambio(document.getElementById("solver-prefer-turno"), "indiferente");
    await flush();
    expect(filtro(app, "preferTurno")).toBeUndefined();
  });

  it("«mismo grupo»: el de prácticas exige el de teoría y se apaga con él", async () => {
    const { app } = await bootPanel();
    await flush();

    expect(document.getElementById("solver-same-practice").disabled).toBe(true);

    const teoria = document.getElementById("solver-same-theory");
    teoria.checked = true;
    teoria.dispatchEvent(new Event("change"));
    await flush();

    expect(filtro(app, "sameTheoryPerCourse").value).toBe(true);
    expect(document.getElementById("solver-same-practice").disabled).toBe(false);

    const practicas = document.getElementById("solver-same-practice");
    practicas.checked = true;
    practicas.dispatchEvent(new Event("change"));
    await flush();
    expect(filtro(app, "samePracticePerCourse").value).toBe(true);

    // Apagar el de teoría apaga también el de prácticas (no tiene sentido solo).
    const teoria2 = document.getElementById("solver-same-theory");
    teoria2.checked = false;
    teoria2.dispatchEvent(new Event("change"));
    await flush();

    expect(filtro(app, "sameTheoryPerCourse")).toBeUndefined();
    expect(filtro(app, "samePracticePerCourse")).toBeUndefined();
    expect(document.getElementById("solver-same-practice").disabled).toBe(true);
    expect(document.getElementById("solver-same-practice").checked).toBe(false);
  });

  it("bloquear un profesor bloquea sus grupos y el botón los cuenta", async () => {
    const { app } = await bootPanel();
    await flush();

    document.getElementById("btn-toggle-solver-profs").click();
    await flush();
    expect(document.querySelector(".solver-prof-body").style.display).toBe("block");

    const pedro = document.querySelector('[data-prof-name="Pedro Cartujo"]');
    pedro.checked = true;
    pedro.dispatchEvent(new Event("change"));
    await flush();

    expect(filtro(app, "blockGroups").value).toEqual(["FFT-A"]);
    expect(document.getElementById("btn-toggle-solver-profs").textContent).toContain("(1)");

    const pedro2 = document.querySelector('[data-prof-name="Pedro Cartujo"]');
    pedro2.checked = false;
    pedro2.dispatchEvent(new Event("change"));
    await flush();

    expect(filtro(app, "blockGroups")).toBeUndefined();
    expect(document.getElementById("btn-toggle-solver-profs").textContent).toBe("Bloquear profesores");
  });

  it("la búsqueda esconde los profesores que no encajan", async () => {
    await bootPanel();
    await flush();

    const items = () => [...document.querySelectorAll(".solver-prof-item")];
    expect(items()).toHaveLength(2);

    const buscador = document.getElementById("solver-prof-search");
    buscador.value = "ana";
    buscador.dispatchEvent(new Event("input"));
    await flush();

    const visibles = items().filter((i) => i.style.display !== "none").map((i) => i.dataset.search.split(" ")[0]);
    expect(visibles).toEqual(["ana"]);
  });

  it("«Ignorar profesores» quita el panel de bloqueo y el preset que los usa", async () => {
    const { app } = await bootPanel();
    await flush();

    // Se elige el preset que depende de los profesores…
    cambio(document.getElementById("solver-strategy"), "professors");
    await flush();
    expect(app.storage.getItem("ugr-solver-strategy")).toBe("professors");

    document.getElementById("solver-ignore-docents").checked = true;
    document.getElementById("solver-ignore-docents").dispatchEvent(new Event("change"));
    await flush();

    // …y al encender el modo vuelve a «Equilibrado» y desaparece de la lista.
    expect(app.storage.getItem("ugr-solver-strategy")).toBe("balanced");
    expect(document.querySelector("#solver-strategy [value='professors']")).toBeNull();
    expect(document.getElementById("btn-toggle-solver-profs")).toBeNull();
  });

  it("la estrategia guardada es la que viaja como pesos al motor", async () => {
    // Se siembra la estrategia en vez de cambiarla por el desplegable: así el
    // caso no depende del evento y fija el camino de verdad —la que quedó de la
    // sesión anterior es la que recibe el motor.
    const { app, doble } = await bootPanel({ storage: { "ugr-solver-strategy": "compact" } });
    await flush();
    expect(document.getElementById("solver-strategy").value).toBe("compact");

    clickSubject("FFT");
    await flush();

    document.getElementById("btn-solver-generate").click();
    await flush();

    expect(doble.llamadas.generar[0].opts.weights.deadHours).toBe(1000);

    // Y elegir otra en el panel la deja guardada para la próxima.
    cambio(document.getElementById("solver-strategy"), "shortWeek");
    await flush();
    expect(app.storage.getItem("ugr-solver-strategy")).toBe("shortWeek");
  });

  it("generar: recorta las soluciones pedidas, informa del progreso y del final", async () => {
    const { app, doble } = await bootPanel();
    clickSubject("FFT");
    await flush();

    cambio(document.getElementById("solver-topk"), "9999");
    document.getElementById("btn-solver-generate").click();
    await flush();

    // El problema que llega al motor: la selección del cuatrimestre activo
    // (el dominio lo entrega como códigos, no como fichas).
    expect(doble.llamadas.generar[0].problem.subjects).toEqual(["FFT"]);
    // El tope se recorta al rango del motor (1..500).
    expect(doble.llamadas.generar[0].opts.k).toBe(500);
    expect(doble.llamadas.generar[0].opts.apellido).toBe("");

    // A mitad de camino: la barra, el aviso y el botón de cancelar.
    expect(doble.llamadas.progreso[0].width).toBe("10%");
    expect(doble.llamadas.progreso[0].status).toBe("2 soluciones · 2000 nodos");
    expect(doble.llamadas.progreso[0].cancelarVisible).toBe(true);

    // Y al acabar: el recuento, sin cancelar y con el botón libre otra vez.
    expect(textOf("#solver-status")).toContain("3 horarios generados");
    expect(document.getElementById("btn-solver-cancel").style.display).toBe("none");
    expect(document.getElementById("btn-solver-generate").disabled).toBe(false);
    expect(filas()).toHaveLength(3);
    expect(app.legacy.getState().selectedSubjects).toEqual({ FFT: true });
  });

  it("cancelar avisa, llama al motor y descarta el resultado que llegue tarde", async () => {
    const motor = motorQueEspera();
    const { app } = await bootPanel({ motor });
    clickSubject("FFT");
    await flush();

    document.getElementById("btn-solver-generate").click();
    await flush();
    expect(document.getElementById("btn-solver-cancel").style.display).not.toBe("none");

    document.getElementById("btn-solver-cancel").click();
    await flush();

    expect(motor.llamadas.cancelar).toBe(1);
    expect(textOf("#solver-status")).toBe("Generación cancelada.");
    expect(document.getElementById("btn-solver-generate").disabled).toBe(false);

    // Lo que llegue después ya no pinta nada: la generación está descartada.
    motor.resolver([
      {
        selectedSubjects: { FFT: true },
        groupChoices: { FFT: { teoria: "A", practica: "A1" } },
        cost: 10,
        costBreakdown: { deadHours: 0 },
      },
    ]);
    await flush();

    expect(filas()).toHaveLength(0);
    expect(textOf("#solver-status")).toBe("Generación cancelada.");
    expect(app.legacy.getState().selectedSubjects).toEqual({ FFT: true });
  });

  it("el fallo del motor se enseña en el estado y no deja el panel ocupado", async () => {
    const motor = motorDoble();
    motor.solveTopK = async () => {
      throw new Error("se rompió el motor");
    };
    await bootPanel({ motor });
    clickSubject("FFT");
    await flush();

    document.getElementById("btn-solver-generate").click();
    await flush();

    expect(textOf("#solver-status")).toBe("Error: se rompió el motor");
    expect(document.getElementById("btn-solver-cancel").style.display).toBe("none");
    expect(document.getElementById("btn-solver-generate").disabled).toBe(false);
    expect(filas()).toHaveLength(0);
  });

  it("la viabilidad avisa, bloquea el botón y no repite la consulta si nada cambió", async () => {
    const { doble } = await bootPanel({ motor: motorDoble({ feasible: false }) });
    clickSubject("FFT");
    await esperar(400);

    expect(textOf("#solver-feasibility")).toBe("Ningún horario cumple esos filtros.");
    expect(document.getElementById("solver-feasibility").classList.contains("is-blocking")).toBe(true);
    expect(document.getElementById("btn-solver-generate").disabled).toBe(true);

    // El arranque y el clic ya han consultado; lo que se fija es el **delta**.
    const consultas = doble.llamadas.viabilidad.length;
    expect(consultas).toBeGreaterThan(0);

    // Un filtro nuevo sí se comprueba; el mismo valor otra vez, no.
    cambio(document.getElementById("solver-max-days"), "3");
    await esperar(400);
    expect(doble.llamadas.viabilidad.length).toBe(consultas + 1);

    cambio(document.getElementById("solver-max-days"), "3");
    await esperar(400);
    expect(doble.llamadas.viabilidad.length).toBe(consultas + 1);
  });

  it("cuando no se puede comprobar lo dice, pero no bloquea el botón", async () => {
    await bootPanel({ motor: motorDoble({ feasible: null }) });
    clickSubject("FFT");
    await esperar(400);

    expect(textOf("#solver-feasibility")).toContain("No se pudo comprobar");
    expect(document.getElementById("btn-solver-generate").disabled).toBe(false);
  });

  it("las asignaturas superadas se quedan fuera y se avisa en vez de generar", async () => {
    const { doble } = await bootPanel({ progress: { getPassedCodes: () => ["FFT"] } });
    clickSubject("FFT");
    await flush();

    document.getElementById("btn-solver-generate").click();
    await flush();

    expect(textOf("#solver-status")).toBe("Todas las asignaturas seleccionadas de este cuatrimestre están superadas.");
    expect(doble.llamadas.generar).toHaveLength(0);
  });

  it("si el bloqueo deja una asignatura sin grupos, avisa y no genera", async () => {
    const { doble } = await bootPanel();
    clickSubject("FFT");
    await flush();

    document.getElementById("btn-toggle-solver-profs").click();
    await flush();
    ["Pedro Cartujo", "Ana Ruiz"].forEach((nombre) => {
      const cb = document.querySelector(`[data-prof-name="${nombre}"]`);
      cb.checked = true;
      cb.dispatchEvent(new Event("change"));
    });
    await flush();

    document.getElementById("btn-solver-generate").click();
    await flush();

    expect(textOf("#solver-status")).toBe("El bloqueo de profesores deja sin grupos: FFT.");
    expect(doble.llamadas.generar).toHaveLength(0);
  });
});

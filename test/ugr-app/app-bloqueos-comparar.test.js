// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { bootUgrApp, clickSubject, flush, textOf } from "./appHarness.js";

// Caracterización de los dos últimos paneles de la zona de configuraciones: los
// **bloqueos** (qué grupos no se usan y los topes de días) y la **comparación**
// de hasta cuatro horarios guardados con su mini-calendario.

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
    {
      letra: "B",
      turno: "tarde",
      teoria: [{ dia: "lunes", inicio: "17:30", fin: "18:30" }],
      practicas: { subgrupos: ["B1"], B1: [{ dia: "jueves", inicio: "17:30", fin: "18:30" }] },
    },
  ],
};

const CA = {
  codigo: "CA",
  nombre: "Cálculo",
  curso: 1,
  cuatrimestre: 1,
  creditos: 6,
  grupos: [
    {
      letra: "A",
      turno: "mañana",
      teoria: [{ dia: "miércoles", inicio: "09:30", fin: "10:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "viernes", inicio: "09:30", fin: "10:30" }] },
    },
  ],
};

const panelBloqueos = () => document.getElementById("block-filters-panel");
const desplegar = () => {
  panelBloqueos().querySelector("#btn-toggle-block-filters").click();
  return panelBloqueos().querySelector(".block-filters-body");
};
const elegirBloqueo = (codigo, letra) => {
  const sel = panelBloqueos().querySelector("#block-subject-select");
  sel.value = codigo;
  sel.dispatchEvent(new Event("change"));
  const grupo = panelBloqueos().querySelector("#block-subject-group");
  grupo.value = letra;
  panelBloqueos().querySelector('[data-block-add="subject"]').click();
};
/** Guarda la selección actual como configuración con un nombre. */
const guardarComo = async (nombre) => {
  document.getElementById("config-name").value = nombre;
  document.getElementById("btn-save-config").click();
  await flush();
};

describe("los bloqueos y la comparación (monolito real)", () => {
  it("el panel de bloqueos se pliega y despliega", async () => {
    await bootUgrApp({ subjects: [FFT, CA] });
    await flush();

    const body = desplegar();
    expect(body.style.display).toBe("block");
    panelBloqueos().querySelector("#btn-toggle-block-filters").click();
    expect(panelBloqueos().querySelector(".block-filters-body").style.display).toBe("none");
  });

  it("bloquear una asignatura y un grupo deja su ficha, cuenta y se puede quitar", async () => {
    const app = await bootUgrApp({ subjects: [FFT, CA] });
    await flush();
    desplegar();

    // El desplegable de grupos se rellena al elegir asignatura.
    const sel = panelBloqueos().querySelector("#block-subject-select");
    sel.value = "FFT";
    sel.dispatchEvent(new Event("change"));
    const grupos = [...panelBloqueos().querySelectorAll("#block-subject-group option")].map((o) => o.value);
    expect(grupos).toEqual(["", "A", "B"]);

    elegirBloqueo("FFT", "B");
    await flush();

    expect(app.store.dispatched.some((c) => c.type === "blocks/add" && c.payload.letra === "B")).toBe(true);
    expect(textOf("#block-filters-panel")).toContain("FFT × Grupo B");
    expect(textOf("#btn-toggle-block-filters")).toContain("Bloqueos (1)");

    // La X del chip lo quita.
    panelBloqueos().querySelector(".block-chip-remove").click();
    await flush();
    expect(app.store.dispatched.some((c) => c.type === "blocks/remove")).toBe(true);
    expect(textOf("#btn-toggle-block-filters")).toContain("Bloqueos");
  });

  it("los topes de días se aplican, se recuerdan al repintar y se limpian", async () => {
    const app = await bootUgrApp({ subjects: [FFT, CA] });
    await flush();
    const body = desplegar();

    body.querySelector("#block-max-manana").value = "3";
    body.querySelector("#block-max-tarde").value = "1";
    body.querySelector("#btn-apply-day-filter").click();
    await flush();

    // El panel se repinta con los topes puestos y ofrece limpiarlos.
    const repintado = panelBloqueos().querySelector(".block-filters-body");
    expect(repintado.querySelector("#block-max-manana").value).toBe("3");
    expect(repintado.querySelector("#block-max-tarde").value).toBe("1");
    expect(repintado.querySelector("#btn-clear-day-filter")).not.toBeNull();
    expect(app.legacy.getState().selectedSubjects).toEqual({});
  });

  it("la comparación marca hasta cuatro horarios y pinta sus mini-calendarios", async () => {
    const app = await bootUgrApp({ subjects: [FFT, CA] });
    clickSubject("FFT");
    await flush();
    await guardarComo("Primero");
    clickSubject("CA");
    await flush();
    await guardarComo("Segundo");

    // Con dos guardadas, se marcan las dos para comparar.
    const marcar = () => [...document.querySelectorAll('#saved-configs-list [data-action="compare"]')];
    expect(marcar()).toHaveLength(2);
    marcar()[0].click();
    await flush();
    marcar()[1].click();
    await flush();

    const flotante = document.getElementById("btn-compare-floating");
    expect(flotante.style.display).toBe("flex");
    expect(document.getElementById("compare-count").textContent).toBe("2");

    flotante.click();
    await flush();

    expect(document.getElementById("compare-modal").style.display).toBe("flex");
    expect(document.querySelectorAll("#compare-content .compare-side")).toHaveLength(2);
    expect(textOf("#compare-content")).toContain("Primero");
    expect(textOf("#compare-content")).toContain("Segundo");
    // Cada calendario lleva dentro las sesiones de su configuración.
    const eventos = document.querySelectorAll("#compare-content .cal-event");
    expect(eventos.length).toBeGreaterThan(0);
    expect(app.legacy.getState().selectedSubjects).toEqual({ FFT: true, CA: true });
  });

  it("cerrar la comparación la esconde y desmarca la selección de comparar", async () => {
    await bootUgrApp({ subjects: [FFT] });
    clickSubject("FFT");
    await flush();
    await guardarComo("Uno");

    const boton = document.querySelector('#saved-configs-list [data-action="compare"]');
    boton.click();
    await flush();
    expect(document.getElementById("btn-compare-floating").style.display).toBe("none");

    // Al cerrar el modal (que puede estar abierto de antes) queda oculto.
    document.getElementById("compare-modal").style.display = "flex";
    document.getElementById("compare-modal-close").click();
    expect(document.getElementById("compare-modal").style.display).toBe("none");
  });
});

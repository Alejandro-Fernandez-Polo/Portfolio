// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { bootUgrApp, clickSubject, flush, textOf } from "./appHarness.js";

// Caracterización del **panel de grupos**: elegir la teoría y el subgrupo de
// prácticas de una materia seleccionada, el subgrupo que toca por apellido y la
// ficha del profesor desde cada grupo.

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
      practicas: {
        subgrupos: ["A1", "A2"],
        A1: [{ dia: "martes", inicio: "11:30", fin: "12:30" }],
        A2: [{ dia: "miercoles", inicio: "11:30", fin: "12:30" }],
      },
    },
    {
      letra: "B",
      turno: "tarde",
      teoria: [{ dia: "lunes", inicio: "17:30", fin: "18:30" }],
      practicas: { subgrupos: ["B1"], B1: [{ dia: "jueves", inicio: "17:30", fin: "18:30" }] },
    },
  ],
};

/** Ana tiene perfil (ficha y dificultad); Marta es un nombre de la guía sin valoración. */
const DOCENTES = [
  { key: "FFT-A", name: "Ana Ruiz", subjectCode: "FFT", groupLetter: "A", modalidad: "Teoría" },
  { key: "FFT-A1", name: "Marta Gómez", subjectCode: "FFT", groupLetter: "A1", modalidad: "Prácticas" },
];
const PROFESORES = [
  { key: "FFT|Teoría|Ana Ruiz", name: "Ana Ruiz", subjectCode: "FFT", modalidad: "Teoría", dificultad: "verde" },
];

function fakeCatalog() {
  const catalogo = { id: "UGR/GI/2026-1", subjects: [FFT], docentes: DOCENTES, profesores: PROFESORES };
  return {
    listCatalogs: async () => [{ id: catalogo.id, subjectCount: 1 }],
    getActiveCatalogKey: () => catalogo.id,
    getCatalog: () => catalogo,
    getDocents: () => DOCENTES,
    getProfesores: () => PROFESORES,
    saveCatalog: async () => ({ ok: true, id: catalogo.id }),
    setActiveCatalogKey: async () => ({ ok: true }),
    exportCatalog: async () => ({ meta: {}, subjects: [] }),
  };
}

const panel = () => document.getElementById("group-config");
const opciones = (tipo) => [...document.querySelectorAll(`.group-option[data-type="${tipo}"]`)];
const porLetra = (letra) => document.querySelector(`.group-option[data-type="teoria"][data-letra="${letra}"]`);
const porSub = (sub) => document.querySelector(`.group-option[data-type="practica"][data-sub="${sub}"]`);

async function bootConSeleccion(options = {}) {
  const app = await bootUgrApp({ subjects: [FFT], docentes: DOCENTES, profesores: PROFESORES, catalog: fakeCatalog(), ...options });
  clickSubject("FFT");
  await flush();
  return app;
}

describe("el panel de grupos (monolito real)", () => {
  it("sin selección se esconde del todo y con ella aparece su interruptor", async () => {
    await bootUgrApp({ subjects: [FFT] });
    await flush();
    expect(panel().style.display).toBe("none");
    expect(document.getElementById("toggle-group-config").style.display).toBe("none");

    await bootConSeleccion();
    // El panel nace colapsado (así está en el HTML): lo que aparece es su
    // interruptor, y el contenido ya está pintado para cuando se abra.
    expect(document.getElementById("toggle-group-config").style.display).toBe("inline-flex");
    expect(panel().style.display).toBe("none");
    expect(textOf("#group-config-content")).toContain("FFT");
    // Una columna de teoría por grupo y la de prácticas del grupo elegido.
    expect(opciones("teoria")).toHaveLength(2);
    expect(opciones("practica")).toHaveLength(2);
  });

  it("elegir un grupo de teoría deja su primer subgrupo de prácticas y repinta", async () => {
    const app = await bootConSeleccion();
    // La elección inicial ya deja el primer grupo y su primer subgrupo.
    expect(app.legacy.getState().groupChoices).toEqual({ FFT: { teoria: "A", practica: "A1" } });
    expect(porSub("A1").classList.contains("selected")).toBe(true);

    porLetra("B").click();
    await flush();

    expect(app.legacy.getState().groupChoices).toEqual({ FFT: { teoria: "B", practica: "B1" } });
    expect(porSub("B1").classList.contains("selected")).toBe(true);
    // Y la elección viaja al store (la selección entera).
    expect(app.store.dispatched.some((c) => c.type === "selection/setAll" && c.payload.groupChoices?.FFT?.teoria === "B")).toBe(true);
  });

  it("elegir el subgrupo de prácticas lo guarda", async () => {
    const app = await bootConSeleccion();

    porSub("A2").click();
    await flush();

    expect(app.legacy.getState().groupChoices.FFT).toEqual({ teoria: "A", practica: "A2" });
    expect(porSub("A2").classList.contains("selected")).toBe(true);
  });

  it("el apellido marca el subgrupo que le toca como automático", async () => {
    const app = await bootConSeleccion();

    const apellido = document.getElementById("apellido");
    apellido.value = "García"; // G–M → subgrupo 2
    apellido.dispatchEvent(new Event("input"));
    await flush();

    expect(app.legacy.getState().groupChoices.FFT.practica).toBe("A2");
    expect(porSub("A2").classList.contains("preferred-practica")).toBe(true);
    expect(porSub("A2").textContent).toContain("auto");
    expect(porSub("A1").classList.contains("preferred-practica")).toBe(false);
  });

  it("el profesor sale con su insignia, es botón si tiene ficha y avisa de los que no", async () => {
    await bootConSeleccion();

    // Ana tiene perfil: botón (abre su ficha) y su insignia.
    const botonAna = document.querySelector('.prof-name-btn[data-prof-name="Ana Ruiz"]');
    expect(botonAna).not.toBeNull();
    expect(botonAna.dataset.profCodigo).toBe("FFT");
    const bloqueAna = botonAna.closest(".group-profesor");
    expect(bloqueAna.textContent).toContain("Fácil");

    // Marta no tiene valoración: texto plano y el aviso arriba, porque si no
    // parecería inventada.
    expect(document.querySelector('.prof-name-btn[data-prof-name="Marta Gómez"]')).toBeNull();
    expect([...document.querySelectorAll(".group-profesor .prof-name")].map((n) => n.textContent)).toContain("Marta Gómez");
    expect(textOf("#group-config-content")).toContain("todavía no tienen valoración");
  });

  it("«Ignorar profesores» apaga el bloque del profesor", async () => {
    const app = await bootConSeleccion();

    const interruptor = document.getElementById("solver-ignore-docents");
    interruptor.checked = true;
    interruptor.dispatchEvent(new Event("change"));
    await flush();

    expect(document.querySelectorAll("#group-config-content .group-profesor")).toHaveLength(0);
    expect(document.querySelector("#group-config-content .prof-name-btn")).toBeNull();
    expect(app.legacy.getState().selectedSubjects).toEqual({ FFT: true });
  });

  it("el interruptor pliega y despliega el panel", async () => {
    await bootConSeleccion();

    const toggle = document.getElementById("toggle-group-config");
    toggle.click();
    expect(panel().style.display).toBe("block");
    expect(toggle.classList.contains("open")).toBe(true);

    toggle.click();
    expect(panel().style.display).toBe("none");
    expect(toggle.classList.contains("open")).toBe(false);
  });
});

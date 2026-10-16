// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { bootUgrApp, clickSubject, flush, textOf } from "./appHarness.js";

// Caracterización del **índice de docentes**: las dos capas (asignaciones y
// perfiles) y, sobre todo, la fusión —**manda la tuya**— que leen el panel de
// grupos, el calendario, el generador y la ficha del profesor.
//
// Se mira por la interfaz: lo que se fija es que el índice sirva lo que el resto
// de la app espera, no su estructura interna.

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

const DOCENTES = [
  { key: "FFT-A", name: "Ana Ruiz", subjectCode: "FFT", groupLetter: "A", modalidad: "Teoría" },
  // Este subgrupo lo da alguien **sin perfil** en el catálogo.
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
    difficultyScore: () => null,
    saveCatalog: async () => ({ ok: true, id: catalogo.id }),
    setActiveCatalogKey: async () => ({ ok: true }),
    exportCatalog: async () => ({ meta: {}, subjects: [] }),
  };
}

const bloqueTeoria = () => document.querySelector('#group-config-content .group-option[data-type="teoria"] .group-profesor');
const bloquePractica = () => document.querySelector('#group-config-content .group-option[data-type="practica"] .group-profesor');

/** Da de alta una valoración propia desde el formulario de la pestaña de datos. */
async function valorarPropia({ nombre, subjectCode, modalidad, dificultad }) {
  document.querySelector('.nav-tab[data-view="datos"]').click();
  await flush();
  document.getElementById("btn-add-profesor").click();
  document.getElementById("profesor-form-name").value = nombre;
  const subject = document.getElementById("profesor-form-subject");
  subject.value = subjectCode;
  subject.dispatchEvent(new Event("change"));
  const mod = document.getElementById("profesor-form-modalidad");
  mod.value = modalidad;
  document.getElementById("profesor-form-dificultad").value = dificultad;
  document.getElementById("profesor-form-save").click();
  await flush();
}

describe("el índice de docentes (monolito real, dos capas fusionadas)", () => {
  it("de entrada sirve el perfil del catálogo", async () => {
    await bootUgrApp({ subjects: [FFT], docentes: DOCENTES, profesores: PROFESORES, catalog: fakeCatalog() });
    clickSubject("FFT");
    await flush();

    expect(bloqueTeoria().textContent).toContain("Ana Ruiz");
    expect(bloqueTeoria().textContent).toContain("Fácil");
    // Marta no tiene perfil: sale el nombre y el aviso de que no está valorada.
    expect(bloquePractica().textContent).toContain("Marta Gómez");
    expect(textOf("#group-config-content")).toContain("todavía no tienen valoración");
  });

  it("la valoración propia manda sobre el catálogo para la misma terna", async () => {
    await bootUgrApp({ subjects: [FFT], docentes: DOCENTES, profesores: PROFESORES, catalog: fakeCatalog() });
    clickSubject("FFT");
    await flush();
    expect(bloqueTeoria().textContent).toContain("Fácil");

    await valorarPropia({ nombre: "Ana Ruiz", subjectCode: "FFT", modalidad: "Teoría", dificultad: "rojo" });

    expect(bloqueTeoria().textContent).toContain("Muy difícil");
    expect(bloqueTeoria().textContent).not.toContain("Fácil");
  });

  it("una valoración propia da ficha a un nombre que no la tenía", async () => {
    await bootUgrApp({ subjects: [FFT], docentes: DOCENTES, profesores: PROFESORES, catalog: fakeCatalog() });
    clickSubject("FFT");
    await flush();
    // Sin perfil de catálogo, el nombre de prácticas es texto plano.
    expect(bloquePractica().querySelector(".prof-name-btn")).toBeNull();

    await valorarPropia({ nombre: "Marta Gómez", subjectCode: "FFT", modalidad: "Prácticas", dificultad: "amarillo" });

    // Ahora es botón y su ficha enseña la valoración, marcada como tuya.
    const boton = bloquePractica().querySelector(".prof-name-btn");
    expect(boton).not.toBeNull();
    boton.click();
    await flush();
    expect(textOf("#profesor-modal-body")).toContain("Normal");
    expect(textOf("#profesor-modal-body")).toContain("tuya");
  });

  it("al borrar la valoración propia el índice vuelve al catálogo", async () => {
    await bootUgrApp({ subjects: [FFT], docentes: DOCENTES, profesores: PROFESORES, catalog: fakeCatalog() });
    clickSubject("FFT");
    await flush();
    await valorarPropia({ nombre: "Ana Ruiz", subjectCode: "FFT", modalidad: "Teoría", dificultad: "rojo" });
    expect(bloqueTeoria().textContent).toContain("Muy difícil");

    // Se borra desde la tabla de profesores (con confirmación aceptada).
    document.querySelector('.nav-tab[data-view="datos"]').click();
    await flush();
    window.confirm = () => true;
    document.querySelector("[data-delete-prof]").click();
    await flush();

    expect(bloqueTeoria().textContent).toContain("Fácil");
    document.querySelector('.nav-tab[data-view="horario"]').click();
    await flush();
  });
});

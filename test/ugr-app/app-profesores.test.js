// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { bootUgrApp, makeStore, flush, textOf } from "./appHarness.js";

// Caracterización de la pestaña **Profesores**: el listado del claustro, la ficha
// de un profesor y las valoraciones propias (alta, edición con cambio de clave,
// borrado, importación, exportación y el prompt que se copia).
//
// Las reglas puras de las valoraciones ya tienen sus casos en node
// (`profesores-propios.test.js`); lo que se fija aquí es el camino por el DOM, con
// la tabla `reviews` del store doblada en memoria.

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
      teoria: [{ dia: "lunes", inicio: "10:30", fin: "11:30" }],
      practicas: { subgrupos: ["A1"], A1: [{ dia: "jueves", inicio: "09:30", fin: "10:30" }] },
    },
  ],
};

/** Un mismo nombre en dos asignaturas y otro con una sola: así se ve la agrupación. */
const PROFESORES = [
  { key: "FFT|Teoría|Ana Ruiz", name: "Ana Ruiz", subjectCode: "FFT", modalidad: "Teoría", dificultad: "verde" },
  { key: "CA|Teoría|Ana Ruiz", name: "Ana Ruiz", subjectCode: "CA", modalidad: "Teoría", dificultad: "rojo" },
  { key: "FFT|Teoría|Pedro Cartujo", name: "Pedro Cartujo", subjectCode: "FFT", modalidad: "Teoría", dificultad: "gris" },
];

const DOCENTES = [
  { key: "FFT-A", name: "Ana Ruiz", subjectCode: "FFT", groupLetter: "A", modalidad: "Teoría" },
];

/**
 * El claustro sale del **catálogo activo**, no del global: se dobla la frontera
 * con las asignaturas, las asignaciones y los perfiles dentro, que es de donde
 * el monolito rehace sus índices.
 */
function fakeCatalog(sinPerfiles = false) {
  const catalogo = { id: "UGR/GI/2026-1", subjects: [FFT, CA], docentes: DOCENTES, profesores: PROFESORES };
  return {
    listCatalogs: async () => [{ id: catalogo.id, subjectCount: 2 }],
    getActiveCatalogKey: () => catalogo.id,
    getCatalog: () => catalogo,
    getDocents: () => DOCENTES,
    getProfesores: () => (sinPerfiles ? [] : PROFESORES),
    saveCatalog: async () => ({ ok: true, id: catalogo.id }),
    setActiveCatalogKey: async () => ({ ok: true }),
    exportCatalog: async () => ({ meta: {}, subjects: [] }),
  };
}

const el = (id) => document.getElementById(id);
const click = (id) => el(id).click();
const escribir = (id, valor) => {
  el(id).value = valor;
  return el(id);
};
const elegir = (id, valor) => escribir(id, valor).dispatchEvent(new Event("change"));
const filas = () => [...document.querySelectorAll("#profesores-container tbody tr")];

/** Arranca y entra en la pestaña de datos, que es la que pinta el claustro. */
async function bootProfesores(options = {}) {
  const app = await bootUgrApp({
    subjects: [FFT, CA],
    docentes: DOCENTES,
    profesores: PROFESORES,
    catalog: fakeCatalog(),
    ...options,
  });
  document.querySelector('.nav-tab[data-view="datos"]').click();
  await flush();
  return app;
}

describe("la pestaña de profesores (monolito real, store de reseñas doblado)", () => {
  it("lista el claustro con sus asignaturas y la insignia de dificultad", async () => {
    await bootProfesores();

    expect(filas()).toHaveLength(2);
    // Un nombre con dos asignaturas sale en una fila con las dos.
    expect(textOf("#profesores-container")).toContain("Ana Ruiz");
    expect(filas()[0].textContent).toContain("CA, FFT");
    // La insignia usa la etiqueta de pantalla de la escala.
    expect(filas()[0].textContent).toContain("Fácil");
    expect(filas()[0].textContent).toContain("Muy difícil");
    // Sin valoraciones propias no hay acciones.
    expect(document.querySelector("[data-edit-prof]")).toBeNull();
  });

  it("el buscador filtra el claustro y avisa cuando no queda nadie", async () => {
    await bootProfesores();

    const buscador = el("profesores-search");
    buscador.value = "cartujo";
    buscador.dispatchEvent(new Event("input"));
    await flush();

    expect(filas()).toHaveLength(1);
    expect(textOf("#profesores-container")).toContain("Pedro Cartujo");

    buscador.value = "nadie";
    buscador.dispatchEvent(new Event("input"));
    await flush();
    expect(textOf("#profesores-container")).toContain("Ningún profesor coincide con la búsqueda.");
  });

  it("la ficha se abre al pulsar un nombre, agrupa sus asignaturas y devuelve el foco al cerrar", async () => {
    await bootProfesores();

    const boton = document.querySelector('.prof-name-btn[data-prof-name="Ana Ruiz"]');
    boton.click();
    await flush();

    expect(el("profesor-modal").hidden).toBe(false);
    expect(textOf("#profesor-modal-title")).toBe("Ana Ruiz");
    // La ficha enseña al profesor en sus dos asignaturas.
    expect(document.querySelectorAll("#profesor-modal-body .profesor-ficha-entry")).toHaveLength(2);
    expect(textOf("#profesor-modal-body")).toContain("Fundamentos Físicos y Tecnológicos");

    el("profesor-modal-close").click();
    expect(el("profesor-modal").hidden).toBe(true);
    // El foco vuelve al botón que la abrió.
    expect(document.activeElement.dataset.profName).toBe("Ana Ruiz");
  });

  it("la ficha se cierra con Escape y pulsando fuera", async () => {
    await bootProfesores();

    document.querySelector('.prof-name-btn[data-prof-name="Pedro Cartujo"]').click();
    await flush();
    expect(el("profesor-modal").hidden).toBe(false);

    el("profesor-modal").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(el("profesor-modal").hidden).toBe(true);

    document.querySelector('.prof-name-btn[data-prof-name="Pedro Cartujo"]').click();
    await flush();
    expect(el("profesor-modal").hidden).toBe(false);
    el("profesor-modal").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el("profesor-modal").hidden).toBe(true);
  });

  it("el alta guarda una valoración propia en el store y la lista la marca como tuya", async () => {
    const app = await bootProfesores();

    click("btn-add-profesor");
    expect(el("profesor-form-modal").hidden).toBe(false);
    expect(textOf("#profesor-form-title")).toBe("Añadir profesor");
    // Los desplegables salen del catálogo activo y de la escala del dominio.
    expect(el("profesor-form-subject").options.length).toBe(3); // «Sin asignatura» + 2
    expect(el("profesor-form-dificultad").options.length).toBeGreaterThan(5);

    escribir("profesor-form-name", "Marta Gómez");
    elegir("profesor-form-subject", "FFT");
    elegir("profesor-form-dificultad", "amarillo");
    escribir("profesor-form-opinions", "Explica muy bien\nPuntual");
    click("profesor-form-save");
    await flush();

    const guardadas = [...app.store.reviews.values()];
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({
      name: "Marta Gómez",
      subjectCode: "FFT",
      modalidad: "Teoría",
      dificultad: "amarillo",
      opinions: ["Explica muy bien", "Puntual"],
    });
    expect(el("profesor-form-modal").hidden).toBe(true);
    expect(textOf("#profesores-status")).toBe("Guardado: Marta Gómez.");
    // Y aparece en el claustro con sus dos acciones.
    expect(textOf("#profesores-container")).toContain("Marta Gómez");
    expect(document.querySelector("[data-edit-prof]")).not.toBeNull();
  });

  it("el formulario no guarda sin nombre y lo dice en su línea de error", async () => {
    const app = await bootProfesores();

    click("btn-add-profesor");
    escribir("profesor-form-name", "  ");
    click("profesor-form-save");
    await flush();

    expect(el("profesor-form-error").hidden).toBe(false);
    expect(textOf("#profesor-form-error")).toContain("Pon un nombre");
    expect(app.store.reviews.size).toBe(0);
    expect(el("profesor-form-modal").hidden).toBe(false);
  });

  it("la modalidad se deshabilita sin asignatura", async () => {
    await bootProfesores();

    click("btn-add-profesor");
    expect(el("profesor-form-modalidad").disabled).toBe(true);

    elegir("profesor-form-subject", "CA");
    expect(el("profesor-form-modalidad").disabled).toBe(false);

    elegir("profesor-form-subject", "");
    expect(el("profesor-form-modalidad").disabled).toBe(true);
  });

  it("al editar y cambiar de asignatura, la valoración vieja no se queda huérfana", async () => {
    const app = await bootProfesores();

    // Alta…
    click("btn-add-profesor");
    escribir("profesor-form-name", "Marta Gómez");
    elegir("profesor-form-subject", "FFT");
    click("profesor-form-save");
    await flush();
    const claveVieja = [...app.store.reviews.keys()][0];
    expect(claveVieja).toContain("FFT");

    // …y edición cambiando de asignatura.
    document.querySelector("[data-edit-prof]").click();
    expect(el("profesor-form-modal").hidden).toBe(false);
    expect(textOf("#profesor-form-title")).toBe("Editar profesor");
    expect(el("profesor-form-name").value).toBe("Marta Gómez");
    elegir("profesor-form-subject", "CA");
    click("profesor-form-save");
    await flush();

    const claves = [...app.store.reviews.keys()];
    expect(claves).toHaveLength(1);
    expect(claves[0]).toContain("CA");
    expect(claves[0]).not.toBe(claveVieja);
  });

  it("borrar una valoración propia pide confirmación", async () => {
    const app = await bootProfesores();
    click("btn-add-profesor");
    escribir("profesor-form-name", "Marta Gómez");
    click("profesor-form-save");
    await flush();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    document.querySelector("[data-delete-prof]").click();
    await flush();
    expect(app.store.reviews.size).toBe(1);

    confirmSpy.mockReturnValue(true);
    document.querySelector("[data-delete-prof]").click();
    await flush();

    expect(app.store.reviews.size).toBe(0);
    expect(textOf("#profesores-status")).toBe("Borrada la valoración de Marta Gómez.");
    expect(document.querySelector("[data-edit-prof]")).toBeNull();
    vi.restoreAllMocks();
  });

  it("importar un JSON guarda las válidas y cuenta las descartadas", async () => {
    const app = await bootProfesores();

    const contenido = JSON.stringify({
      reviews: [
        { name: "Marta Gómez", subjectCode: "FFT", dificultad: "verde" },
        { name: "" }, // sin nombre: se descarta
      ],
    });
    const fichero = new File([contenido], "profesores-propios.json", { type: "application/json" });
    const input = el("import-profesores-input");
    Object.defineProperty(input, "files", { value: [fichero], configurable: true });
    input.dispatchEvent(new Event("change"));
    await flush();

    expect(app.store.reviews.size).toBe(1);
    expect(textOf("#profesores-status")).toContain("Importadas 1 valoraciones");
    expect(textOf("#profesores-status")).toContain("1 entrada(s) descartada(s)");
  });

  it("un fichero sin nada válido se queda en el aviso", async () => {
    const app = await bootProfesores();

    const fichero = new File(["no es json"], "basura.json", { type: "application/json" });
    const input = el("import-profesores-input");
    Object.defineProperty(input, "files", { value: [fichero], configurable: true });
    input.dispatchEvent(new Event("change"));
    await flush();

    expect(app.store.reviews.size).toBe(0);
    expect(textOf("#profesores-status")).not.toBe("");
  });

  it("exportar avisa si no hay nada y confirma cuántas salen", async () => {
    await bootProfesores();

    click("btn-export-profesores");
    await flush();
    expect(textOf("#profesores-status")).toContain("Todavía no has añadido ninguna valoración.");

    click("btn-add-profesor");
    escribir("profesor-form-name", "Marta Gómez");
    click("profesor-form-save");
    await flush();

    click("btn-export-profesores");
    await flush();
    expect(textOf("#profesores-status")).toContain("Exportadas 1 valoraciones.");
  });

  it("el prompt se abre con su texto y se copia (o se deja a mano)", async () => {
    await bootProfesores();

    click("btn-copy-profesor-prompt");
    expect(el("profesor-prompt-modal").hidden).toBe(false);
    const texto = el("profesor-prompt-text").value;
    expect(texto.length).toBeGreaterThan(100);
    expect(texto).toContain("Cálculo");

    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(globalThis.navigator, "clipboard", { value: { writeText }, configurable: true });
    click("profesor-prompt-copy");
    await flush();
    expect(writeText).toHaveBeenCalledWith(texto);
    expect(textOf("#profesores-status")).toBe("Prompt copiado al portapapeles.");

    // Sin permiso de portapapeles: no falla en silencio, lo dice.
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
      configurable: true,
    });
    click("profesor-prompt-copy");
    await flush();
    expect(textOf("#profesores-status")).toContain("cópialo a mano");

    el("profesor-prompt-close").click();
    expect(el("profesor-prompt-modal").hidden).toBe(true);
    delete globalThis.navigator.clipboard;
    vi.restoreAllMocks();
  });

  it("el interruptor de esta pestaña es el mismo que el del generador", async () => {
    const app = await bootProfesores();

    el("profesores-ignore-docents").checked = true;
    el("profesores-ignore-docents").dispatchEvent(new Event("change"));
    await flush();

    expect(app.store.dispatched.some((c) => c.type === "ui/setIgnoreDocents" && c.payload.ignoreDocents === true)).toBe(true);
    expect(el("solver-ignore-docents").checked).toBe(true);
  });

  it("sin almacén de valoraciones lo dice en vez de perder lo escrito", async () => {
    const store = makeStore();
    delete store.saveReviews;
    await bootProfesores({ store });

    click("btn-add-profesor");
    escribir("profesor-form-name", "Marta Gómez");
    click("profesor-form-save");
    await flush();

    expect(textOf("#profesor-form-error")).toContain("el almacén no está disponible");
    expect(el("profesor-form-modal").hidden).toBe(false);
  });
});

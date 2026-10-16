// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

import { createSavedConfigsView } from "../../public/ugr/src/app/features/savedConfigs.js";

// Test de la vista de configuraciones **por su interfaz**: lo que no cubría el
// camino del monolito. En particular la **unión** que enseña la tabla (guardadas
// + resultados del solver), que es justo lo que se me escapó al mover la lista:
// el solver aporta filas con botón «Guardar» y las mutaciones de la vista solo
// pueden tocar las guardadas.

const SUBJECTS = [
  {
    codigo: "FFT",
    nombre: "Fundamentos",
    curso: 1,
    cuatrimestre: 1,
    creditos: 6,
    grupos: [{ letra: "A", turno: "mañana", teoria: [{ dia: "lunes", inicio: "09:30", fin: "10:30" }], practicas: { subgrupos: [] } }],
  },
];

function config(overrides) {
  return {
    id: 1,
    name: "Guardada",
    selectedSubjects: { FFT: true },
    groupChoices: { FFT: { teoria: "A" } },
    turnoPreferente: "mañana",
    ...overrides,
  };
}

/** Vista con dobles de todo lo que el monolito inyecta. */
function makeView({ persisted = [], extra = [] } = {}) {
  const saved = [...persisted];
  const calls = { notify: [], downloaded: [], loaded: 0, confirmed: true };
  const view = createSavedConfigsView({
    document: globalThis.document,
    getState: () => ({ selectedSubjects: { FFT: true }, groupChoices: { FFT: { teoria: "A" } }, apellido: "Ruiz", turnoPreferente: "tarde" }),
    persistence: {
      loadSavedConfigs: () => [...saved],
      saveAllConfigs: (list) => { saved.length = 0; saved.push(...list); },
    },
    notify: (mensaje, tipo) => calls.notify.push({ mensaje, tipo }),
    confirmFn: () => calls.confirmed,
    onConfigLoaded: () => { calls.loaded++; },
    download: (data, filename) => calls.downloaded.push({ data, filename }),
    escape: (texto) => String(texto).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]),
    getSubjects: () => SUBJECTS,
    getExtraConfigs: () => extra,
    weekdays: ["lunes", "martes", "miercoles", "jueves", "viernes"],
    getBlocks: () => [],
    getCeilings: () => ({ maxManana: 0, maxTarde: 0 }),
    getCompareIds: () => [],
    getDificultad: () => null,
    difficultyScore: () => null,
    dayShort: { lunes: "L", martes: "M", miercoles: "X", jueves: "J", viernes: "V" },
    onLoad: () => {},
    onSaveSolver: () => {},
    onExport: () => {},
    onCompare: () => {},
  });
  // Contrato de arranque del monolito: crear la vista y cargarle la lista.
  view.loadFromStorage();
  return { view, calls, saved };
}

const filas = () => [...document.querySelectorAll("#saved-configs-list tbody tr")];

beforeEach(() => {
  document.body.innerHTML = `
    <input id="config-name">
    <input id="apellido">
    <select id="turno-preferente"><option value="mañana"></option><option value="tarde"></option></select>
    <div id="saved-configs-list"></div>`;
  vi.restoreAllMocks();
});

describe("vista de configuraciones (unidad)", () => {
  it("la tabla enseña las guardadas **y** los resultados del solver, con su botón Guardar", () => {
    const { view } = makeView({
      persisted: [config({ id: 1, name: "Guardada" })],
      extra: [config({ id: 2, name: "Solver", solver: true })],
    });
    view.render();

    expect(filas().map((tr) => tr.querySelector(".col-name").textContent)).toEqual(["Guardada", "Solver"]);
    const solverRow = filas()[1];
    expect(solverRow.querySelector('[data-action="save-solver"]')).not.toBeNull();
    // La guardada, en cambio, se borra.
    expect(filas()[0].querySelector('[data-action="delete"]')).not.toBeNull();
  });

  it("borrar y marcar favorita solo tocan las guardadas", () => {
    const { view, saved } = makeView({
      persisted: [config({ id: 1, name: "Guardada" })],
      extra: [config({ id: 2, name: "Solver", solver: true })],
    });
    view.render();

    view.remove(2);              // el resultado del solver no se borra aquí
    expect(saved).toHaveLength(1);

    view.toggleFavorite(1);
    expect(saved[0].favorite).toBe(true);
    expect(saved[1]).toBeUndefined(); // el extra sigue fuera de la lista persistida
  });

  it("borrar pide confirmación y borra de verdad cuando se acepta", () => {
    const { view, saved } = makeView({ persisted: [config({ id: 1, name: "Guardada" })] });
    view.render();
    view.remove(1);
    expect(saved).toHaveLength(0);
    expect(document.getElementById("saved-configs-list").textContent).toContain("No hay configuraciones guardadas");
  });

  it("guardar exige nombre y selección, y persiste con la forma de siempre", () => {
    const { view, saved, calls } = makeView();
    view.render();

    view.saveCurrent();
    expect(saved).toHaveLength(0);
    expect(calls.notify.at(-1).mensaje).toContain("nombre");

    document.getElementById("config-name").value = "Mi horario";
    view.saveCurrent();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Mi horario");
    expect(document.getElementById("config-name").value).toBe("");
  });

  it("cargar aplica la configuración, sincroniza el perfil y avisa al monolito", () => {
    const { view, calls } = makeView({ persisted: [config({ id: 1, name: "Guardada" })] });
    view.render();
    view.load(1);

    expect(calls.loaded).toBe(1);
    expect(document.getElementById("apellido").value).toBe("Ruiz");
    expect(document.getElementById("turno-preferente").value).toBe("tarde");
    expect(calls.notify.at(-1).mensaje).toContain("cargada");
  });

  it("exportar: una usa su nombre de fichero; todas avisa si no hay ninguna", () => {
    const vacia = makeView();
    vacia.view.render();
    vacia.view.exportAll();
    expect(vacia.calls.downloaded).toHaveLength(0);
    expect(vacia.calls.notify.at(-1).mensaje).toContain("No hay configuraciones");

    const { view, calls } = makeView({ persisted: [config({ id: 1, name: "Mi horario" })] });
    view.render();
    view.exportOne(1);
    expect(calls.downloaded[0].filename).toBe("config-mi-horario.json");
    view.exportAll();
    expect(calls.downloaded[1].filename).toBe("ugr-horario-configs.json");
  });

  it("el nombre que escribe el usuario se escapa al pintarlo", () => {
    const { view } = makeView({ persisted: [config({ id: 1, name: '<img src=x onerror="boom">' })] });
    view.render();

    const celda = document.querySelector("#saved-configs-list .col-name");
    expect(celda.innerHTML).toContain("&lt;img");
    expect(celda.querySelector("img")).toBeNull();
  });

  it("la puntuación de profesor se pinta sobre el techo de la escala, derivado del dominio", () => {
    const { view } = makeView({ persisted: [config({ id: 1 })] });
    // Un doble que puntúa: la escala del dominio da 6 como máximo.
    const conProfes = createSavedConfigsView({
      document: globalThis.document,
      getState: () => ({ selectedSubjects: { FFT: true }, groupChoices: { FFT: { teoria: "A" } }, apellido: "", turnoPreferente: "indiferente" }),
      persistence: { loadSavedConfigs: () => [config({ id: 1 })], saveAllConfigs: () => {} },
      notify: () => {},
      confirmFn: () => true,
      onConfigLoaded: () => {},
      download: () => {},
      escape: (t) => String(t),
      getSubjects: () => SUBJECTS,
      getExtraConfigs: () => [],
      weekdays: ["lunes", "martes", "miercoles", "jueves", "viernes"],
      getBlocks: () => [],
      getCeilings: () => ({}),
      getCompareIds: () => [],
      getDificultad: () => "cyan",
      difficultyScore: () => 6,
      dayShort: { lunes: "L" },
      onLoad: () => {}, onSaveSolver: () => {}, onExport: () => {}, onCompare: () => {},
    });
    conProfes.loadFromStorage();
    conProfes.render();

    expect(document.querySelector("#saved-configs-list .col-prof").textContent).toBe("6/6");
    expect(view).toBeTruthy();
  });
});

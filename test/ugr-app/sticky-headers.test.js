import { describe, it, expect } from "vitest";

import { setupStickyHeaders, RATIO_LARGA } from "../../public/ugr/src/ui/sticky-headers.js";

// Cabecera pegajosa de las tablas largas: la decisión se toma midiendo (alto de
// la tabla contra el de la ventana, ancho contra el del contenedor), así que el
// test la fija con un DOM falso de medidas conocidas — nada de jsdom.

function makeClassList() {
  const set = new Set();
  return {
    set,
    contains: (clase) => set.has(clase),
    toggle(clase, force) {
      const on = force === undefined ? !set.has(clase) : Boolean(force);
      if (on) set.add(clase);
      else set.delete(clase);
      return on;
    },
  };
}

function makeTable({ alto, scrollWidth = 1200, clientWidth = 1200 }) {
  return {
    parentElement: null,
    scrollWidth,
    clientWidth,
    classList: makeClassList(),
    getBoundingClientRect: () => ({ height: alto }),
  };
}

/** Envuelve la tabla en el contenedor de las tablas gestionadas. */
function envolver(table, { clientWidth = 1200 } = {}) {
  const classList = makeClassList();
  classList.set.add("manage-table-wrapper");
  const wrapper = { clientWidth, classList };
  table.parentElement = wrapper;
  return wrapper;
}

function makeDoc(tablas) {
  return {
    querySelectorAll: () => tablas,
    addEventListener() {},
    removeEventListener() {},
    body: {},
  };
}

function makeWin(innerHeight = 800) {
  return { innerHeight, addEventListener() {}, removeEventListener() {} };
}

describe("setupStickyHeaders", () => {
  it("marca el contenedor de una tabla más alta que vez y media la ventana", () => {
    const table = makeTable({ alto: 1.6 * 800 });
    const wrapper = envolver(table);
    setupStickyHeaders({ document: makeDoc([table]), window: makeWin(800) });
    expect(wrapper.classList.contains("is-tall")).toBe(true);
    expect(wrapper.classList.contains("is-tall-scroll")).toBe(false);
  });

  it("no toca las tablas cortas: el sticky dejaría una franja muerta", () => {
    const table = makeTable({ alto: RATIO_LARGA * 800 - 1 });
    const wrapper = envolver(table);
    setupStickyHeaders({ document: makeDoc([table]), window: makeWin(800) });
    expect(wrapper.classList.contains("is-tall")).toBe(false);
    expect(wrapper.classList.contains("is-tall-scroll")).toBe(false);
  });

  it("si la tabla no cabe a lo ancho, conserva el scroll y le pone tope de alto", () => {
    // Un ancestro con overflow crea contenedor de scroll y anula el sticky
    // contra la ventana: en ese caso la cabecera se pega dentro del contenedor.
    const table = makeTable({ alto: 4700, scrollWidth: 2000 });
    const wrapper = envolver(table, { clientWidth: 1200 });
    setupStickyHeaders({ document: makeDoc([table]), window: makeWin(800) });
    expect(wrapper.classList.contains("is-tall-scroll")).toBe(true);
    expect(wrapper.classList.contains("is-tall")).toBe(false);
  });

  it("una tabla sin contenedor propio se marca a sí misma", () => {
    const table = makeTable({ alto: 3000, scrollWidth: 600, clientWidth: 600 });
    setupStickyHeaders({ document: makeDoc([table]), window: makeWin(800) });
    expect(table.classList.contains("is-tall")).toBe(true);
  });

  it("vuelve a medir con refresh: la tabla que encoge deja de estar marcada", () => {
    const table = makeTable({ alto: 4700 });
    const wrapper = envolver(table);
    const api = setupStickyHeaders({ document: makeDoc([table]), window: makeWin(800) });
    expect(wrapper.classList.contains("is-tall")).toBe(true);
    table.getBoundingClientRect = () => ({ height: 300 });
    api.refresh();
    expect(wrapper.classList.contains("is-tall")).toBe(false);
  });

  it("sin altura de ventana no marca nada (vista oculta o entorno sin DOM)", () => {
    const table = makeTable({ alto: 4700 });
    const wrapper = envolver(table);
    setupStickyHeaders({ document: makeDoc([table]), window: makeWin(0) });
    expect(wrapper.classList.contains("is-tall")).toBe(false);
  });

  it("sin documento devuelve un api inerte en vez de reventar", () => {
    const api = setupStickyHeaders({ document: null, window: null });
    expect(typeof api.refresh).toBe("function");
    expect(() => {
      api.refresh();
      api.destroy();
    }).not.toThrow();
  });
});

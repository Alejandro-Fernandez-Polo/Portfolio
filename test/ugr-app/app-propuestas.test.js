// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";

import { bootUgrApp, flush, textOf } from "./appHarness.js";

// El bloque de propuestas vive en la vista «Convalidaciones» (oculta al
// arrancar): el panel solo se pinta al entrar en ella, así que los casos que
// miran la barra o el detalle entran primero, como haría la persona.

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

/** Tabla oficial mínima: da opciones a los desplegables y materia a la comparativa. */
const CONV = [
  {
    id: "011013-FFT",
    uned: { codigo: "011013", nombre: "Fundamentos Físicos de la Informática" },
    ugr: { codigo: "FFT", nombre: "Fundamentos Físicos y Tecnológicos" },
  },
  {
    id: "01102-CA",
    uned: { codigo: "01102-", nombre: "Fundamentos Matemáticos de la Informática" },
    ugr: { codigo: "CA", nombre: "Cálculo" },
  },
];

const el = (id) => document.getElementById(id);
const click = (id) => el(id).click();
const set = (id, value) => {
  el(id).value = value;
  return el(id);
};
/** Elige una opción del desplegable y avisa, como el navegador. */
const elegir = (id, value) => set(id, value).dispatchEvent(new Event("change"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const filas = () => Array.from(el("propuesta-detalle").querySelectorAll("tbody tr[class*='propuesta-']"));

function propuesta(extra = {}) {
  return { id: "prop-1", nombre: "Base", enBloque: false, nota: "", mappings: [], ...extra };
}

function mapeoFFT(extra = {}) {
  return {
    cursada: "Fundamentos Físicos de la Informática",
    cursadaCodigo: "011013",
    reconocida: "Fundamentos Físicos y Tecnológicos",
    reconocidaCodigo: "FFT",
    reconocidaNombre: "Fundamentos Físicos y Tecnológicos (FFT)",
    calificacion: 7.5,
    creditos: 6,
    ...extra,
  };
}

function mapeoCA(extra = {}) {
  return {
    cursada: "Fundamentos Matemáticos de la Informática",
    cursadaCodigo: "01102-",
    reconocida: "Cálculo",
    reconocidaCodigo: "CA",
    reconocidaNombre: "Cálculo (CA)",
    calificacion: 7.8,
    creditos: 6,
    ...extra,
  };
}

/** Arranca con el catálogo y la tabla oficial mínimos que el bloque necesita. */
function boot(options = {}) {
  return bootUgrApp({ subjects: [FFT, CA], convalidaciones: CONV, ...options });
}

/** Entra en la vista de convalidaciones, que es la que pinta el panel. */
async function entrar() {
  document.querySelector('.nav-tab[data-view="convalidaciones"]').click();
  await flush();
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.history.replaceState(null, "", "/ugr/");
});

describe("propuestas de convalidación (monolito real)", () => {
  it("sin propuestas el panel queda vacío y el detalle invita a crear una", async () => {
    const app = await boot();
    await entrar();

    expect(app.legacy.getState().propuestas).toEqual([]);
    expect(textOf("#propuestas-summary")).toBe("Sin propuestas");
    expect(textOf("#propuesta-badge")).toBe("");
    expect(textOf("#propuesta-detalle")).toContain("Crea una propuesta para empezar");
    expect(el("propuesta-select").options.length).toBe(0);
  });

  it("crear una propuesta vacía la deja activa, en el selector y abre el modal de mapeo", async () => {
    const app = await boot();
    await entrar();
    vi.spyOn(window, "prompt").mockReturnValue("  Mi propuesta  ");

    click("btn-nueva-vacia-propuesta");
    await wait(300);

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(1);
    expect(s.propuestas[0].nombre).toBe("Mi propuesta");
    expect(s.propuestaActivaId).toBe(s.propuestas[0].id);
    expect(el("propuesta-select").value).toBe(s.propuestas[0].id);
    expect(textOf("#propuesta-select")).toContain("Mi propuesta (0 ECTS)");
    expect(textOf("#propuestas-summary")).toContain("Activa: Mi propuesta");
    // El modal de mapeo se abre solo, para añadir la primera equivalencia.
    expect(el("propuesta-mapeo-modal").style.display).toBe("flex");
    expect(textOf("#propuesta-mapeo-title")).toContain("Nuevo mapeo");
    expect(JSON.parse(app.storage.getItem("ugr-propuestas"))).toHaveLength(1);
  });

  it("cancelar el prompt no crea nada", async () => {
    const app = await boot();
    vi.spyOn(window, "prompt").mockReturnValue(null);

    click("btn-nueva-vacia-propuesta");
    await wait(300);

    expect(app.legacy.getState().propuestas).toEqual([]);
  });

  it("el modal de nueva propuesta copia los mapeos de la activa", async () => {
    const app = await boot({ propuestasIniciales: [propuesta({ mappings: [mapeoFFT()] })] });

    click("btn-nueva-propuesta");
    expect(textOf("#propuesta-modal-title")).toContain("Nueva Propuesta");
    expect(el("propuesta-nombre").value).toBe("");

    set("propuesta-nombre", "Copia de la base");
    el("propuesta-enbloque").checked = false;
    click("propuesta-modal-save");
    await flush();

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(2);
    const nueva = s.propuestas[1];
    expect(nueva.nombre).toBe("Copia de la base");
    expect(nueva.mappings).toHaveLength(1);
    expect(nueva.totalCreditos).toBe(6);
    // Y queda activa: el push al store congela los tres valores antes de
    // despachar, así que el `setAll` (que deja `activeId` en el primer item) ya
    // no pisa la elección.
    expect(s.propuestaActivaId).toBe(nueva.id);
    expect(el("propuesta-modal").style.display).toBe("none");
    expect(textOf("#toast-container")).toContain("Propuesta guardada");
  });

  it("sin nombre el modal no guarda y avisa", async () => {
    const app = await boot({ propuestasIniciales: [propuesta()] });

    click("btn-nueva-propuesta");
    set("propuesta-nombre", "   ");
    click("propuesta-modal-save");
    await flush();

    expect(app.legacy.getState().propuestas).toHaveLength(1);
    expect(textOf("#toast-container")).toContain("Introduce un nombre");
  });

  it("renombrar la activa la cambia en el selector y en el resumen", async () => {
    const app = await boot({ propuestasIniciales: [propuesta()] });

    click("btn-renombrar-propuesta");
    expect(textOf("#propuesta-modal-title")).toContain("Renombrar");
    expect(el("propuesta-nombre").value).toBe("Base");

    set("propuesta-nombre", "Base renombrada");
    click("propuesta-modal-save");
    await flush();

    expect(app.legacy.getState().propuestas[0].nombre).toBe("Base renombrada");
    expect(textOf("#propuestas-summary")).toContain("Activa: Base renombrada");
    expect(textOf("#propuesta-select")).toContain("Base renombrada");
  });

  it("duplicar copia la activa con el sufijo (copia)", async () => {
    const app = await boot({ propuestasIniciales: [propuesta({ mappings: [mapeoFFT()] })] });

    click("btn-duplicar-propuesta");
    await flush();

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(2);
    expect(s.propuestas[1].nombre).toBe("Base (copia)");
    expect(s.propuestas[1].mappings).toEqual(s.propuestas[0].mappings);
    expect(s.propuestaActivaId).toBe(s.propuestas[1].id);
    expect(textOf("#toast-container")).toContain("Propuesta duplicada");
  });

  it("eliminar la activa pide confirmación y deja la primera de las que quedan", async () => {
    const app = await boot({
      propuestasIniciales: [propuesta({ id: "prop-1" }), propuesta({ id: "prop-2", nombre: "Segunda" })],
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    click("btn-eliminar-propuesta");
    await flush();
    expect(app.legacy.getState().propuestas).toHaveLength(2);

    confirmSpy.mockReturnValue(true);
    click("btn-eliminar-propuesta");
    await flush();

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(1);
    expect(s.propuestas[0].id).toBe("prop-2");
    expect(s.propuestaActivaId).toBe("prop-2");
    expect(textOf("#toast-container")).toContain("Propuesta eliminada");
  });

  it("cambiar de propuesta activa desde el selector la deja activa y repinta el detalle", async () => {
    const app = await boot({
      propuestasIniciales: [
        propuesta({ id: "prop-1", mappings: [mapeoFFT()] }),
        propuesta({ id: "prop-2", nombre: "Segunda", mappings: [mapeoCA()] }),
      ],
    });
    await entrar();
    expect(textOf("#propuesta-detalle")).toContain("Fundamentos Físicos");

    elegir("propuesta-select", "prop-2");
    await flush();

    expect(app.legacy.getState().propuestaActivaId).toBe("prop-2");
    expect(el("propuesta-select").value).toBe("prop-2");
    expect(textOf("#propuesta-detalle")).toContain("Cálculo");
    expect(textOf("#propuestas-summary")).toContain("Activa: Segunda");
  });

  it("la barra resume entradas y créditos, y el detalle lista los mapeos con su total", async () => {
    const app = await boot({
      propuestasIniciales: [propuesta({ mappings: [mapeoFFT(), mapeoCA()] })],
    });
    await entrar();

    expect(textOf("#propuesta-badge")).toBe("2 entradas · 12 ECTS");
    expect(textOf("#propuestas-summary")).toBe("1 propuesta(s) · Activa: Base");
    expect(filas()).toHaveLength(2);
    expect(textOf("#propuesta-detalle")).toContain("Fundamentos Físicos de la Informática (011013)");
    expect(textOf("#propuesta-detalle")).toContain("Total de créditos reconocidos");
    expect(textOf("#propuesta-detalle")).toContain("12 (*)");
    // Los botones de añadir viven en el detalle, no en la barra.
    expect(el("btn-add-mapeo-individual")).not.toBeNull();
    expect(el("btn-add-mapeo-bloque")).not.toBeNull();
    // Y el panel no toca el orden hasta que se pide.
    expect(filas()[0].className).toContain("curso-1");
  });

  it("la cabecera ordena los mapeos por curso en tres estados: asc, desc y sin orden", async () => {
    await boot({
      // A propósito al revés del orden natural: así el primer clic se nota.
      propuestasIniciales: [propuesta({ mappings: [mapeoCA(), mapeoFFT()] })],
    });
    await entrar();

    expect(filas()[0].className).toContain("curso-2");
    click("th-orden-curso");
    await flush();
    expect(filas()[0].className).toContain("curso-1");
    click("th-orden-curso");
    await flush();
    expect(filas()[0].className).toContain("curso-2");
    click("th-orden-curso");
    await flush();
    // Tercer clic: vuelve al orden original (el de los mapeos).
    expect(filas()[0].className).toContain("curso-2");
    expect(textOf("#th-orden-curso")).toContain("↕");
  });

  it("añadir un mapeo individual desde el detalle lo guarda, lo pinta y suma sus créditos", async () => {
    const app = await boot({ propuestasIniciales: [propuesta()] });
    await entrar();

    click("btn-add-mapeo-individual");
    expect(el("propuesta-mapeo-modal").style.display).toBe("flex");
    expect(el("mapeo-tipo").value).toBe("individual");
    expect(textOf("#propuesta-mapeo-title")).toContain("Nuevo mapeo");

    // Elegir en la lista oficial rellena los campos ocultos de código.
    elegir("mapeo-cursada-select", "011013|Fundamentos Físicos de la Informática");
    expect(el("mapeo-cursada").value).toBe("Fundamentos Físicos de la Informática");
    expect(el("mapeo-cursada-codigo").value).toBe("011013");
    elegir("mapeo-reconocida-select", "FFT|Fundamentos Físicos y Tecnológicos");
    expect(el("mapeo-reconocida-codigo").value).toBe("FFT");

    set("mapeo-calif", "8.5");
    click("propuesta-mapeo-save");
    await flush();

    const activa = app.legacy.getState().propuestas[0];
    expect(activa.mappings).toHaveLength(1);
    expect(activa.mappings[0]).toMatchObject({
      cursadaCodigo: "011013",
      reconocidaCodigo: "FFT",
      calificacion: 8.5,
      creditos: 6,
    });
    expect(activa.mappings[0].reconocidaNombre).toBe("Fundamentos Físicos y Tecnológicos (FFT)");
    expect(activa.totalCreditos).toBe(6);
    expect(el("propuesta-mapeo-modal").style.display).toBe("none");
    expect(textOf("#propuesta-badge")).toBe("1 entradas · 6 ECTS");
    expect(textOf("#toast-container")).toContain("Mapeo añadido");
  });

  it("un mapeo sin cursada ni código UGR no se guarda y avisa", async () => {
    const app = await boot({ propuestasIniciales: [propuesta()] });
    await entrar();

    click("btn-add-mapeo-individual");
    click("propuesta-mapeo-save");
    await flush();

    expect(app.legacy.getState().propuestas[0].mappings).toEqual([]);
    expect(textOf("#toast-container")).toContain("Rellena cursada y código UGR");
    expect(el("propuesta-mapeo-modal").style.display).toBe("flex");
  });

  it("eliminar un mapeo pide confirmación y recalcula el total", async () => {
    const app = await boot({
      propuestasIniciales: [propuesta({ mappings: [mapeoFFT(), mapeoCA()] })],
    });
    await entrar();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    document.querySelector('#propuesta-detalle [data-del-mapeo="0"]').click();
    await flush();

    const activa = app.legacy.getState().propuestas[0];
    expect(activa.mappings).toHaveLength(1);
    expect(activa.mappings[0].reconocidaCodigo).toBe("CA");
    expect(activa.totalCreditos).toBe(6);
    expect(textOf("#toast-container")).toContain("Mapeo eliminado");
  });

  it("guardar la activa con nombre la lista, y cargarla la devuelve como propuesta nueva", async () => {
    const app = await boot({ propuestasIniciales: [propuesta({ mappings: [mapeoFFT()] })] });
    await entrar();

    set("propuesta-guardada-nombre", "Snapshot 1");
    click("btn-guardar-propuesta-interna");
    await flush();

    const guardadas = JSON.parse(app.storage.getItem("ugr-propuestas-guardadas"));
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0].nombre).toBe("Snapshot 1");
    expect(textOf("#propuestas-guardadas-list")).toContain("Snapshot 1");
    expect(textOf("#propuestas-guardadas-list")).toContain("1 entradas · 6 ECTS");

    // Se borra la original y se recupera desde la instantánea: vuelve con sus mapeos.
    vi.spyOn(window, "confirm").mockReturnValue(true);
    click("btn-eliminar-propuesta");
    await flush();
    expect(app.legacy.getState().propuestas).toEqual([]);

    document.querySelector('#propuestas-guardadas-list [data-pg-action="load"]').click();
    await flush();

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(1);
    expect(s.propuestas[0].mappings).toHaveLength(1);
    expect(s.propuestaActivaId).toBe(s.propuestas[0].id);
    expect(textOf("#toast-container")).toContain('Propuesta "Snapshot 1" cargada');
  });

  it("no se guarda una propuesta sin mapeos", async () => {
    const app = await boot({ propuestasIniciales: [propuesta()] });

    set("propuesta-guardada-nombre", "Vacía");
    click("btn-guardar-propuesta-interna");
    await flush();

    expect(app.storage.getItem("ugr-propuestas-guardadas")).toBeNull();
    expect(textOf("#toast-container")).toContain("La propuesta activa está vacía");
  });

  it("eliminar una propuesta guardada pide confirmación y vacía la lista", async () => {
    const app = await boot({ propuestasIniciales: [propuesta({ mappings: [mapeoFFT()] })] });

    set("propuesta-guardada-nombre", "Snapshot 1");
    click("btn-guardar-propuesta-interna");
    await flush();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    document.querySelector('#propuestas-guardadas-list [data-pg-action="delete"]').click();
    await flush();

    expect(JSON.parse(app.storage.getItem("ugr-propuestas-guardadas"))).toEqual([]);
    expect(textOf("#propuestas-guardadas-list")).toContain("No hay propuestas guardadas");
    expect(textOf("#toast-container")).toContain("Propuesta guardada eliminada");
  });

  it("compartir copia el enlace con la propuesta codificada", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(globalThis.navigator, "clipboard", { value: { writeText }, configurable: true });
    await boot({ propuestasIniciales: [propuesta({ mappings: [mapeoFFT()] })] });

    click("btn-compartir-propuesta");
    await flush();

    const url = writeText.mock.calls[0][0];
    expect(url).toContain("?propuesta=");
    const data = JSON.parse(decodeURIComponent(atob(url.split("?propuesta=")[1])));
    expect(data.nombre).toBe("Base");
    expect(data.mappings).toHaveLength(1);
    expect(textOf("#toast-container")).toContain("Enlace de propuesta copiado");
    delete globalThis.navigator.clipboard;
  });

  it("un enlace en la URL carga la propuesta y la deja activa", async () => {
    const encoded = btoa(
      encodeURIComponent(JSON.stringify(propuesta({ id: "prop-link", nombre: "Desde el enlace", mappings: [mapeoFFT()] }))),
    );
    globalThis.history.replaceState(null, "", "/ugr/?propuesta=" + encoded);

    const app = await boot();

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(1);
    expect(s.propuestas[0].nombre).toBe("Desde el enlace");
    expect(s.propuestas[0].id).not.toBe("prop-link");
    expect(s.propuestaActivaId).toBe(s.propuestas[0].id);
    expect(s.vistaConvalidaciones).toBe("propuesta");
    expect(textOf("#toast-container")).toContain("Propuesta cargada desde enlace");
  });

  it("un parámetro de enlace ilegible se ignora sin romper el arranque", async () => {
    globalThis.history.replaceState(null, "", "/ugr/?propuesta=no-es-un-enlace");

    const app = await boot();

    expect(app.legacy.getState().propuestas).toEqual([]);
    expect(textOf("#toast-container")).toBe("");
  });

  it("cargar la instantánea de una propuesta viva añade una copia con su nombre y la deja activa", async () => {
    // Con la original viva, la instantánea vuelve como propuesta nueva: id
    // nuevo (no choca) pero **mismo nombre**, así que el selector enseña dos
    // iguales. La recién cargada pasa a ser la activa.
    const app = await boot({ propuestasIniciales: [propuesta({ mappings: [mapeoFFT()] })] });
    await entrar();

    set("propuesta-guardada-nombre", "Snapshot 1");
    click("btn-guardar-propuesta-interna");
    await flush();

    document.querySelector('#propuestas-guardadas-list [data-pg-action="load"]').click();
    await flush();

    const s = app.legacy.getState();
    expect(s.propuestas).toHaveLength(2);
    expect(s.propuestas[1].nombre).toBe("Base");
    expect(s.propuestas[1].id).not.toBe(s.propuestas[0].id);
    expect(s.propuestaActivaId).toBe(s.propuestas[1].id);
    expect(el("propuesta-select").options.length).toBe(2);
  });
});

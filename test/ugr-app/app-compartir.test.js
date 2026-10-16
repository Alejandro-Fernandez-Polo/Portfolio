// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { webcrypto } from "node:crypto";

import { encryptToFragment } from "../../public/ugr/src/share/shareCrypto.js";
import { bootUgrApp, clickSubject, flush, textOf } from "./appHarness.js";

// jsdom no trae WebCrypto y aquí el enlace se **cifra de verdad** (AES-GCM), en
// ida y vuelta, para caracterizar el bloque de compartir entero: el diálogo, la
// generación del enlace, su restauración y los errores. Importar el módulo
// también deja `window.__ugrShareCrypto`, que es el que usa la app.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}

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

const modal = () => document.getElementById("share-modal");
const abierto = () => modal().hidden === false;
const enlace = () => document.getElementById("share-link").value;

/**
 * El enlace se cifra con **PBKDF2 de 600 000 iteraciones**, así que hay que dar
 * tiempo a que termine: la espera de `flush` (30 ms) no llega.
 */
const esperarCifrado = () => new Promise((r) => setTimeout(r, 800));

/** Arranca la app, opcionalmente con una selección hecha o con un hash puesto. */
async function boot({ conSeleccion = false, hash = "" } = {}) {
  globalThis.location.hash = hash;
  const app = await bootUgrApp({ subjects: [FFT] });
  if (conSeleccion) {
    clickSubject("FFT");
    await flush();
  }
  return app;
}

/** Fragmento cifrado con el mismo módulo que usa la app, con el estado dado. */
function fragmento(estado, frase) {
  return encryptToFragment(JSON.stringify({ v: 1, ...estado }), frase);
}

afterEach(() => {
  globalThis.location.hash = "";
});

describe("compartir enlace cifrado (monolito real, cifrado de verdad)", () => {
  it("el botón está bloqueado sin selección y se habilita al marcarla", async () => {
    await boot();
    expect(document.getElementById("btn-share").disabled).toBe(true);

    const conSeleccion = await boot({ conSeleccion: true });
    expect(document.getElementById("btn-share").disabled).toBe(false);
    expect(conSeleccion.legacy.getState().selectedSubjects).toEqual({ FFT: true });
  });

  it("abrir el diálogo en modo compartir y sin frase avisa y no genera nada", async () => {
    await boot({ conSeleccion: true });
    document.getElementById("btn-share").click();
    await flush();

    expect(abierto()).toBe(true);
    expect(textOf("#share-modal-title")).toContain("Compartir enlace cifrado");
    expect(textOf("#share-submit")).toContain("Generar enlace");

    document.getElementById("share-submit").click();
    await flush();
    expect(textOf("#share-error")).toContain("Introduce una frase de paso");
    expect(enlace()).toBe("");
    expect(document.getElementById("share-result").hidden).toBe(true);
  });

  it("con frase genera el enlace cifrado y lo enseña en el diálogo", async () => {
    await boot({ conSeleccion: true });
    document.getElementById("btn-share").click();
    await flush();

    document.getElementById("share-passphrase").value = "frase-secreta";
    document.getElementById("share-submit").click();
    await esperarCifrado();

    expect(enlace()).toContain("#data=");
    expect(document.getElementById("share-result").hidden).toBe(false);
    // El hash queda puesto para poder recargar el enlace tal cual.
    expect(globalThis.location.hash.startsWith("#data=")).toBe(true);
    // Y avisa por dónde: al portapapeles o a copiar a mano.
    expect(textOf("#toast-container")).toMatch(/copiad|Copia el enlace/);
  });

  it("cancelar cierra el diálogo y deja el hash puesto (es el enlace que acabas de generar)", async () => {
    await boot({ conSeleccion: true });
    document.getElementById("btn-share").click();
    await flush();
    document.getElementById("share-passphrase").value = "frase-secreta";
    document.getElementById("share-submit").click();
    await esperarCifrado();
    expect(globalThis.location.hash.startsWith("#data=")).toBe(true);

    document.getElementById("share-cancel").click();
    await flush();
    expect(abierto()).toBe(false);
    // Cerrar en modo **compartir** no toca el hash a propósito: es el enlace
    // recién generado (solo el modo restauración lo limpia).
    expect(globalThis.location.hash.startsWith("#data=")).toBe(true);
  });

  it("un enlace en el hash abre el diálogo en modo restauración y con la frase buena restaura el estado", async () => {
    const fragment = await fragmento(
      {
        selectedSubjects: { FFT: true },
        groupChoices: { FFT: { teoria: "A", practica: "A1" } },
        apellido: "Ruiz",
        turnoPreferente: "mañana",
        cuatrimestreActivo: 1,
        solverFilters: [],
        solverStrategy: "balanced",
      },
      "frase-secreta",
    );

    const app = await boot({ hash: `#data=${fragment}` });
    await flush();

    expect(abierto()).toBe(true);
    expect(textOf("#share-modal-title")).toContain("Restaurar");
    expect(textOf("#share-submit")).toContain("Descifrar y restaurar");

    document.getElementById("share-passphrase").value = "frase-secreta";
    document.getElementById("share-submit").click();
    await esperarCifrado();

    const s = app.legacy.getState();
    expect(s.selectedSubjects).toEqual({ FFT: true });
    expect(s.groupChoices).toEqual({ FFT: { teoria: "A", practica: "A1" } });
    expect(s.apellido).toBe("Ruiz");
    expect(abierto()).toBe(false);
    expect(globalThis.location.hash).not.toContain("#data=");
    expect(textOf("#toast-container")).toContain("estado restaurado");
  });

  it("con la frase mala avisa y no toca el estado", async () => {
    const fragment = await fragmento({ selectedSubjects: { FFT: true }, groupChoices: { FFT: { teoria: "A" } } }, "la-buena");
    const app = await boot({ hash: `#data=${fragment}` });
    await flush();

    document.getElementById("share-passphrase").value = "la-mala";
    document.getElementById("share-submit").click();
    await esperarCifrado();

    expect(textOf("#share-error")).toContain("Frase de paso incorrecta");
    expect(app.legacy.getState().selectedSubjects).toEqual({});
    expect(abierto()).toBe(true);
  });

  it("un enlace corrupto en el hash se descarta con aviso", async () => {
    const app = await boot({ hash: "#data=esto-no-es-un-enlace" });
    await flush();

    expect(abierto()).toBe(false);
    expect(textOf("#toast-container")).toContain("no es válido o está corrupto");
    expect(globalThis.location.hash).not.toContain("#data=");
    expect(app.legacy.getState().selectedSubjects).toEqual({});
  });
});

import { describe, it, expect, vi } from "vitest";

import {
  TUTORIAL_CONFIG,
  TUTORIAL_STEPS,
  createTutorial,
  resolveDriverFactory,
} from "../../public/ugr/src/ui/tutorial.js";

// El recorrido guiado se apoya en el global que deja el Driver.js vendorizado.
// Aquí se prueba la decisión, no la librería: qué pasos hay, con qué textos y
// que sin la librería no se rompe nada.

describe("recorrido guiado: pasos", () => {
  it("cada paso apunta a un elemento y trae título y explicación", () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(5);
    for (const paso of TUTORIAL_STEPS) {
      expect(paso.element).toMatch(/^[#.\[]/);
      expect(paso.popover.title.length).toBeGreaterThan(0);
      expect(paso.popover.description.length).toBeGreaterThan(0);
    }
  });

  it("empieza por el conmutador de mundo y no repite elemento", () => {
    const elementos = TUTORIAL_STEPS.map((p) => p.element);
    expect(elementos[0]).toBe("#btn-world-switch");
    expect(new Set(elementos).size).toBe(elementos.length);
  });

  it("los textos de los botones van en castellano y el progreso se ve", () => {
    expect(TUTORIAL_CONFIG.nextBtnText).toBe("Siguiente");
    expect(TUTORIAL_CONFIG.prevBtnText).toBe("Anterior");
    expect(TUTORIAL_CONFIG.doneBtnText).toBe("Listo");
    expect(TUTORIAL_CONFIG.showProgress).toBe(true);
  });
});

describe("recorrido guiado: apertura", () => {
  it("sin el global de Driver.js no hay constructor", () => {
    expect(resolveDriverFactory({})).toBe(null);
    expect(resolveDriverFactory({ driver: {} })).toBe(null);
  });

  it("lo encuentra en window.driver.js.driver", () => {
    const factory = () => {};
    expect(resolveDriverFactory({ driver: { js: { driver: factory } } })).toBe(factory);
  });

  it("sin librería, start() lo dice y no lanza", () => {
    const tutorial = createTutorial({ win: {} });
    expect(tutorial.available()).toBe(false);
    expect(tutorial.start()).toEqual({ ok: false, reason: "driver_missing" });
  });

  it("abre el recorrido con los pasos y los textos configurados", () => {
    const drive = vi.fn();
    const destroy = vi.fn();
    const creadas = [];
    const factory = vi.fn((config) => {
      const instancia = { config, drive, destroy };
      creadas.push(instancia);
      return instancia;
    });

    const tutorial = createTutorial({ win: { driver: { js: { driver: factory } } } });
    expect(tutorial.start()).toEqual({ ok: true });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(drive).toHaveBeenCalledTimes(1);
    expect(creadas[0].config.steps).toBe(TUTORIAL_STEPS);
    expect(creadas[0].config.nextBtnText).toBe("Siguiente");
  });

  it("abrir otra vez cierra el anterior antes de pintar el nuevo", () => {
    const destroy = vi.fn();
    const factory = vi.fn(() => ({ drive() {}, destroy }));
    const tutorial = createTutorial({ win: { driver: { js: { driver: factory } } } });
    tutorial.start();
    tutorial.start();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("si la librería falla al arrancar, se devuelve el motivo", () => {
    const tutorial = createTutorial({
      win: {
        driver: {
          js: {
            driver: () => {
              throw new Error("boom");
            },
          },
        },
      },
    });
    expect(tutorial.start()).toEqual({ ok: false, reason: "drive_failed" });
  });
});

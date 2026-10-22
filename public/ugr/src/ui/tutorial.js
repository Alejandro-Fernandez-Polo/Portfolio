/**
 * Recorrido guiado de `/ugr` con **Driver.js** (MIT), vendorizado en
 * `vendor/driver.js`: sin CDN ni paso de compilación, para que la app siga
 * funcionando con la red cortada, igual que el SDK de Sentry.
 *
 * Se abre **solo** desde el botón de ayuda. No se lanza sola la primera vez ni
 * se recuerda como «vista»: un recorrido que aparece encima sin que nadie lo
 * pida estorba más de lo que enseña, y guardar la marca obligaría a inventar un
 * estado que no cambia nada. El aviso de que los datos son de muestra **no**
 * depende del recorrido: vive en su propia banda y se queda aunque se cierre.
 */

/** Pasos del recorrido, en el orden en que se leen. */
export const TUTORIAL_STEPS = Object.freeze([
  {
    element: "#btn-world-switch",
    popover: {
      title: "Datos de muestra o los tuyos",
      description:
        "La app arranca con datos de ejemplo para que puedas probarlo todo. Lo que hagas ahí no toca tus datos personales: el botón cambia de mundo y cada uno guarda lo suyo.",
    },
  },
  {
    element: "#main-nav",
    popover: {
      title: "Tres vistas",
      description:
        "Horario para montarlo, Datos para el catálogo y los profesores, y Progreso para lo que llevas aprobado y lo que te falta.",
    },
  },
  {
    element: "#subject-selection",
    popover: {
      title: "Elige asignaturas",
      description:
        "Marca las del cuatrimestre que quieras cursar. El desplegable de mención esconde las de las otras especialidades, nunca el núcleo común.",
    },
  },
  {
    element: "#control-panel",
    popover: {
      title: "Genera combinaciones",
      description:
        "Con las asignaturas marcadas, la app reparte grupos de teoría y prácticas sin solapes. Los filtros (días, horas, profesores bloqueados) acotan el resultado.",
    },
  },
  {
    element: "#calendar-section",
    popover: {
      title: "El horario",
      description:
        "Cada combinación se pinta en el calendario. Las vistas de semana y lista enseñan el mismo horario de dos maneras.",
    },
  },
  {
    element: "#saved-configs",
    popover: {
      title: "Guarda lo que te sirva",
      description:
        "Una combinación que te guste se guarda con nombre, se compara con otra y se exporta. Todo eso viaja en el respaldo del mundo en el que estés.",
    },
  },
]);

/** Ajustes del recorrido: textos en castellano y progreso visible. */
export const TUTORIAL_CONFIG = Object.freeze({
  showProgress: true,
  progressText: "{{current}} de {{total}}",
  nextBtnText: "Siguiente",
  prevBtnText: "Anterior",
  doneBtnText: "Listo",
  allowClose: true,
  smoothScroll: true,
  overlayOpacity: 0.6,
  stagePadding: 6,
  stageRadius: 8,
});

/**
 * El constructor de Driver.js, si está disponible. El paquete IIFE deja el
 * global en `window.driver.js.driver`.
 *
 * @param {Object} [win] ventana donde buscar el global (inyectable en tests).
 * @returns {Function|null}
 */
export function resolveDriverFactory(win) {
  const global = win || (typeof window !== "undefined" ? window : null);
  const driver = global && global.driver;
  const factory = driver && driver.js && driver.js.driver;
  return typeof factory === "function" ? factory : null;
}

/**
 * @param {{win?: Object, steps?: Array, config?: Object}} [options]
 * @returns {{start: () => Object, destroy: () => void, available: () => boolean}}
 */
export function createTutorial({ win, steps = TUTORIAL_STEPS, config } = {}) {
  let instance = null;

  function available() {
    return !!resolveDriverFactory(win);
  }

  /**
   * Abre el recorrido. Si ya había uno abierto, lo cierra antes: dos capas a la
   * vez dejan el foco en un sitio impredecible.
   *
   * @returns {{ok: boolean, reason?: string}}
   */
  function start() {
    const crear = resolveDriverFactory(win);
    if (!crear) return { ok: false, reason: "driver_missing" };
    if (!Array.isArray(steps) || steps.length === 0) return { ok: false, reason: "no_steps" };
    if (instance) destroy();
    try {
      instance = crear({ ...TUTORIAL_CONFIG, ...(config || {}), steps });
      instance.drive();
      return { ok: true };
    } catch {
      instance = null;
      return { ok: false, reason: "drive_failed" };
    }
  }

  function destroy() {
    if (!instance) return;
    try {
      instance.destroy();
    } catch {
      // Cerrar un recorrido roto no debe romper la página.
    }
    instance = null;
  }

  return { start, destroy, available };
}

/**
 * El conmutador entre los **datos de muestra** y los **datos personales**, y
 * el aviso permanente de que lo que se está viendo es la muestra.
 *
 * El mundo activo lo decide el store (`src/store/commands.js`); aquí solo se
 * pinta y se pide el cambio. Al cambiar, la página se recarga: las vistas
 * guardan su propia copia de la selección, el progreso y las configuraciones, y
 * rehidratarlas todas en caliente es mucho más frágil que volver a arrancar con
 * el documento del otro mundo ya cargado.
 */

import { SCOPE_PERSONAL, SCOPE_SAMPLE, normalizeScope, otherScope } from "../store/scope.js";

/** Textos del conmutador por mundo. */
const TEXTS = {
  [SCOPE_SAMPLE]: { badge: "Datos de muestra", switchLabel: "Usar mis datos" },
  [SCOPE_PERSONAL]: { badge: "Mis datos", switchLabel: "Ir a los datos de muestra" },
};

const SWITCH_BUTTONS = ["btn-world-switch", "sample-banner-switch"];

/**
 * @param {Object} deps
 * @param {Document} deps.document raíz DOM.
 * @param {(mensaje: string) => void} [deps.notify] escribe un aviso para el usuario.
 * @param {() => string} [deps.getScope] mundo activo; por defecto, el del store.
 * @param {(scope: string) => Promise<Object>} [deps.setScope] cambia de mundo.
 * @param {(scope: string) => Promise<Object>} [deps.activateCatalog] activa el
 *   catálogo recordado de ese mundo.
 * @param {() => void} [deps.reload] recarga la página tras el cambio.
 * @param {{start: () => Object}} [deps.tutorial] recorrido guiado del botón de ayuda.
 * @returns {{render: () => string, switchTo: (scope: string) => Promise<Object>, bind: () => void}}
 */
export function createScopeMode({
  document,
  notify,
  getScope,
  setScope,
  activateCatalog,
  reload,
  tutorial,
} = {}) {
  let switching = false;

  function readScope() {
    try {
      return normalizeScope(typeof getScope === "function" ? getScope() : SCOPE_PERSONAL);
    } catch {
      return SCOPE_PERSONAL;
    }
  }

  function element(id) {
    return document && typeof document.getElementById === "function"
      ? document.getElementById(id)
      : null;
  }

  function writeStatus(texto) {
    if (typeof notify === "function") {
      notify(texto || "");
      return;
    }
    const status = element("world-status");
    if (status) status.textContent = texto || "";
  }

  function setDisabled(disabled) {
    for (const id of SWITCH_BUTTONS) {
      const botón = element(id);
      if (botón) botón.disabled = disabled;
    }
  }

  /** Pinta insignia, botones y aviso según el mundo activo. */
  function render() {
    const scope = readScope();
    const texto = TEXTS[scope] || TEXTS[SCOPE_PERSONAL];

    const badge = element("world-badge");
    if (badge) {
      badge.textContent = texto.badge;
      if (badge.dataset) badge.dataset.scope = scope;
    }

    for (const id of SWITCH_BUTTONS) {
      const botón = element(id);
      if (botón) botón.textContent = texto.switchLabel;
    }

    const banner = element("sample-banner");
    if (banner) banner.hidden = scope !== SCOPE_SAMPLE;

    return scope;
  }

  /**
   * Cambia al mundo pedido y recarga. Los dos mundos se conservan enteros: ir
   * y volver no pierde nada de ninguno.
   *
   * @param {string} target
   * @returns {Promise<{ok: boolean, scope?: string, error?: string}>}
   */
  async function switchTo(target) {
    if (switching) return { ok: false, error: "busy" };
    const scope = normalizeScope(target);
    if (scope === readScope()) {
      render();
      return { ok: true, scope };
    }

    switching = true;
    setDisabled(true);
    writeStatus("Cambiando de datos…");
    try {
      const cambiado = typeof setScope === "function" ? await setScope(scope) : { ok: false, error: "store_unavailable" };
      if (!cambiado || !cambiado.ok) {
        writeStatus("No se puede cambiar de datos sin almacenamiento: los dos mundos no se podrían separar.");
        return { ok: false, error: (cambiado && cambiado.error) || "store_unavailable" };
      }
      // El catálogo del otro mundo se activa antes de recargar para que el
      // arranque ya lo encuentre puesto; si falla, el mundo sigue siendo el
      // nuevo y el catálogo se puede cambiar a mano en «Datos».
      if (typeof activateCatalog === "function") {
        try {
          await activateCatalog(scope);
        } catch {
          /* el cambio de mundo ya está hecho: el catálogo no lo deshace */
        }
      }
      if (typeof reload === "function") reload();
      else render();
      return { ok: true, scope };
    } finally {
      switching = false;
      setDisabled(false);
    }
  }

  /** Engancha los botones (idempotente: se marcan al enlazarse). */
  function bind() {
    for (const id of SWITCH_BUTTONS) {
      const botón = element(id);
      if (!botón || botón.dataset?.scopeBound) continue;
      if (botón.dataset) botón.dataset.scopeBound = "1";
      botón.addEventListener("click", () => switchTo(otherScope(readScope())));
    }
    const ayuda = element("btn-help");
    if (ayuda && tutorial && !ayuda.dataset?.helpBound) {
      if (ayuda.dataset) ayuda.dataset.helpBound = "1";
      ayuda.addEventListener("click", () => {
        const resultado = tutorial.start();
        if (resultado && resultado.ok === false) {
          writeStatus("El recorrido guiado no está disponible en este navegador.");
        }
      });
    }
    return true;
  }

  return { render, switchTo, bind };
}

/**
 * Monta el conmutador: engancha los botones y pinta el estado del mundo.
 *
 * @param {Object} deps los mismos de `createScopeMode`.
 * @returns {{render: Function, switchTo: Function, bind: Function}}
 */
export function setupScopeMode(deps) {
  const mode = createScopeMode(deps);
  mode.bind();
  mode.render();
  return mode;
}

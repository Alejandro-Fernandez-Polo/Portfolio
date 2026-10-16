/**
 * Vista de **compartir el horario por enlace cifrado**.
 *
 * El estado (selección, grupos, perfil y filtros) se cifra con AES-GCM y viaja
 * dentro del fragmento `#data=…`: sin estado en claro y sin servidor. El mismo
 * diálogo sirve para **generar** el enlace y para **restaurar** uno recibido.
 *
 * El dominio no entra aquí: esto es el borde (DOM, `history`, portapapeles y el
 * módulo de cifrado). El estado y los filtros siguen siendo del llamante, que
 * los cede por getters y los aplica por intents.
 */

const SHARE_HASH_PREFIX = "#data=";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {Window} deps.window ventana (`location`, `history`, `hashchange`).
 * @param {() => Object} deps.getState estado corriente (se muta al restaurar).
 * @param {() => Array} deps.getFilters filtros del solver corrientes.
 * @param {() => string} deps.getStrategy estrategia del generador corriente.
 * @param {(filtros: Array, estrategia: string) => void} deps.onApplyFilters
 *   aplicar filtros y estrategia del enlace.
 * @param {() => void} deps.onProfileChanged volcar el perfil al store.
 * @param {() => void} deps.onPruneSelections descartar selección fuera del catálogo.
 * @param {() => void} deps.onStateApplied persistir y repintar tras restaurar.
 * @param {(mensaje: string, tipo: string) => void} deps.notify aviso al usuario.
 * @param {Array<string>} deps.filterTypes tipos de filtro admitidos.
 * @param {Object} deps.strategies estrategias del generador (para validar).
 * @returns {{open: (modo: string) => void, checkUrl: () => void}}
 */
export function createShareView({
  document,
  window,
  getState,
  getFilters,
  getStrategy,
  onApplyFilters,
  onProfileChanged,
  onPruneSelections,
  onStateApplied,
  notify,
  filterTypes,
  strategies,
}) {
  let mode = null;
  let returnFocus = null;
  let fragment = null;
  let hashListenerReady = false;

  /** El módulo de cifrado: el atajo de pruebas o el import dinámico. */
  function cryptoApi() {
    if (window.__ugrShareCrypto) return Promise.resolve(window.__ugrShareCrypto);
    return import("../../share/shareCrypto.js").then(() => window.__ugrShareCrypto);
  }

  function els() {
    return {
      modal: document.getElementById("share-modal"),
      title: document.getElementById("share-modal-title"),
      desc: document.getElementById("share-modal-desc"),
      form: document.getElementById("share-form"),
      passphrase: document.getElementById("share-passphrase"),
      error: document.getElementById("share-error"),
      result: document.getElementById("share-result"),
      link: document.getElementById("share-link"),
      submit: document.getElementById("share-submit"),
      cancel: document.getElementById("share-cancel"),
    };
  }

  function showError(message) {
    const el = els();
    el.error.textContent = message;
    el.error.hidden = false;
    el.passphrase.setAttribute("aria-invalid", "true");
  }

  function hideError() {
    const el = els();
    el.error.textContent = "";
    el.error.hidden = true;
    el.passphrase.removeAttribute("aria-invalid");
  }

  function open(modo) {
    const el = els();
    mode = modo;
    if (!returnFocus) returnFocus = document.activeElement;
    el.title.textContent = modo === "share" ? "Compartir enlace cifrado" : "Restaurar enlace compartido";
    el.desc.textContent = modo === "share"
      ? "Tu selección, tus grupos y tus filtros se cifran con AES-GCM y viajan dentro del enlace (#data=...), sin estado en claro y sin servidor."
      : "Este enlace contiene estado cifrado. Escribe la frase de paso con la que se generó para restaurarlo.";
    el.submit.textContent = modo === "share" ? "Generar enlace" : "Descifrar y restaurar";
    el.submit.disabled = false;
    el.passphrase.value = "";
    el.link.value = "";
    el.result.hidden = true;
    hideError();
    el.modal.hidden = false;
    el.passphrase.focus();
  }

  function close() {
    const el = els();
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    // Al cerrar un enlace **restaurado** se limpia el fragmento; al cerrar el que
    // acabas de generar, no: es el enlace que el usuario se lleva.
    if (mode === "restore") clearHash();
    mode = null;
    fragment = null;
    const target = returnFocus;
    returnFocus = null;
    if (target && typeof target.focus === "function" && document.contains(target)) target.focus();
  }

  function clearHash() {
    if (!window.location.hash.startsWith(SHARE_HASH_PREFIX)) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  /** El estado que viaja en el enlace: solo lo que hace falta para reproducirlo. */
  function buildState() {
    const state = getState();
    const selectedSubjects = {};
    Object.keys(state.selectedSubjects).forEach((codigo) => {
      if (state.selectedSubjects[codigo]) selectedSubjects[codigo] = true;
    });
    const groupChoices = {};
    Object.keys(selectedSubjects).forEach((codigo) => {
      const choice = state.groupChoices[codigo];
      if (choice && typeof choice === "object") {
        groupChoices[codigo] = {
          teoria: typeof choice.teoria === "string" ? choice.teoria : null,
          practica: typeof choice.practica === "string" ? choice.practica : null,
        };
      }
    });
    return {
      v: 1,
      selectedSubjects,
      groupChoices,
      apellido: state.apellido || "",
      turnoPreferente: state.turnoPreferente || "indiferente",
      cuatrimestreActivo: state.cuatrimestreActivo === 2 ? 2 : 1,
      solverFilters: getFilters().map((f) => ({ type: f.type, value: f.value, weight: f.weight })),
      solverStrategy: getStrategy(),
    };
  }

  /**
   * Lee lo que trae el enlace, descartando lo que no sea válido: una selección
   * vacía o una versión desconocida hacen que el enlace no sirva.
   *
   * @param {string} raw texto plano descifrado.
   * @returns {Object|null} estado utilizable, o `null`.
   */
  function parseState(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    if (data.v !== 1) return null;

    const selectedSubjects = {};
    if (data.selectedSubjects && typeof data.selectedSubjects === "object" && !Array.isArray(data.selectedSubjects)) {
      Object.keys(data.selectedSubjects).forEach((codigo) => {
        if (data.selectedSubjects[codigo]) selectedSubjects[codigo] = true;
      });
    }
    if (Object.keys(selectedSubjects).length === 0) return null;

    const groupChoices = {};
    if (data.groupChoices && typeof data.groupChoices === "object" && !Array.isArray(data.groupChoices)) {
      Object.keys(data.groupChoices).forEach((codigo) => {
        const choice = data.groupChoices[codigo];
        if (!choice || typeof choice !== "object" || Array.isArray(choice)) return;
        if (typeof choice.teoria !== "string" || !choice.teoria) return;
        groupChoices[codigo] = {
          teoria: choice.teoria,
          practica: typeof choice.practica === "string" ? choice.practica : null,
        };
      });
    }

    const solverFilters = Array.isArray(data.solverFilters)
      ? data.solverFilters
          .filter((f) => f && typeof f === "object" && !Array.isArray(f) && filterTypes.includes(f.type))
          .map((f) => ({ type: f.type, value: f.value, weight: typeof f.weight === "number" ? f.weight : 1 }))
      : [];

    return {
      selectedSubjects,
      groupChoices,
      apellido: typeof data.apellido === "string" ? data.apellido.trim().slice(0, 60) : "",
      turnoPreferente: ["indiferente", "mañana", "tarde"].includes(data.turnoPreferente)
        ? data.turnoPreferente
        : "indiferente",
      cuatrimestreActivo: data.cuatrimestreActivo === 2 ? 2 : 1,
      solverFilters,
      solverStrategy: strategies[data.solverStrategy] ? data.solverStrategy : "balanced",
    };
  }

  /** Aplica el estado del enlace y deja que el llamante persista y repinte. */
  function applyState(shared) {
    const state = getState();
    state.selectedSubjects = { ...shared.selectedSubjects };
    state.groupChoices = JSON.parse(JSON.stringify(shared.groupChoices));
    state.apellido = shared.apellido;
    state.turnoPreferente = shared.turnoPreferente;
    onProfileChanged();
    state.cuatrimestreActivo = shared.cuatrimestreActivo;
    onPruneSelections();

    onApplyFilters(shared.solverFilters, shared.solverStrategy);

    const apellidoInput = document.getElementById("apellido");
    const turnoSelect = document.getElementById("turno-preferente");
    if (apellidoInput) apellidoInput.value = state.apellido;
    if (turnoSelect) turnoSelect.value = state.turnoPreferente;
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", parseInt(tab.dataset.cuatrimestre) === state.cuatrimestreActivo);
    });

    onStateApplied();
  }

  function copyLink(url) {
    const done = () => notify("Enlace cifrado copiado al portapapeles", "success");
    const nav = window.navigator;
    if (nav && nav.clipboard && nav.clipboard.writeText) {
      nav.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(url) {
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.body.removeChild(input);
    if (copied) {
      notify("Enlace cifrado copiado al portapapeles", "success");
    } else {
      notify("Copia el enlace manualmente desde el diálogo", "info");
    }
    const linkInput = document.getElementById("share-link");
    if (linkInput && !document.getElementById("share-modal").hidden) {
      linkInput.focus();
      linkInput.select();
    }
  }

  /** Genera el enlace (modo compartir) o descifra y aplica el recibido. */
  async function submit(e) {
    if (e) e.preventDefault();
    const el = els();
    const passphrase = el.passphrase.value;
    if (!passphrase) {
      showError("Introduce una frase de paso.");
      return;
    }
    if (!window.crypto || !window.crypto.subtle) {
      showError("Este navegador no soporta WebCrypto, no se puede cifrar el enlace.");
      return;
    }
    hideError();
    el.submit.disabled = true;
    try {
      const api = await cryptoApi();
      if (!api) throw new Error("NO_CRYPTO");
      if (mode === "share") {
        const payload = await api.encryptToFragment(JSON.stringify(buildState()), passphrase);
        const hashFragment = SHARE_HASH_PREFIX + payload;
        const url = window.location.origin + window.location.pathname + window.location.search + hashFragment;
        window.history.replaceState(null, "", hashFragment);
        el.link.value = url;
        el.result.hidden = false;
        el.link.focus();
        el.link.select();
        copyLink(url);
      } else {
        const plain = await api.decryptFromFragment(fragment, passphrase);
        const shared = parseState(plain);
        if (!shared) {
          showError("El enlace no contiene un estado válido.");
          clearHash();
          return;
        }
        applyState(shared);
        clearHash();
        close();
        notify("Enlace descifrado: estado restaurado", "success");
      }
    } catch (err) {
      const code = err && err.message;
      if (code === "BAD_PASSPHRASE") {
        showError("Frase de paso incorrecta: no se ha podido descifrar el enlace.");
      } else if (code === "BAD_FORMAT") {
        showError("El enlace está corrupto o no es compatible.");
        clearHash();
      } else {
        showError("No se ha podido procesar el enlace. Inténtalo de nuevo.");
      }
    } finally {
      el.submit.disabled = false;
    }
  }

  /** Un `#data=` en la URL (al arrancar o al pegar uno nuevo) abre la restauración. */
  function startRestore() {
    const raw = window.location.hash;
    if (!raw.startsWith(SHARE_HASH_PREFIX)) return;
    fragment = raw;
    cryptoApi()
      .then((api) => {
        if (!api || !api.parseFragment(raw)) {
          clearHash();
          notify("El enlace compartido no es válido o está corrupto", "error");
          return;
        }
        if (mode === "restore") return;
        open("restore");
      })
      .catch(() => {
        clearHash();
        notify("No se ha podido leer el enlace compartido", "error");
      });
  }

  /** Engancha el diálogo (idempotente) y mira si la URL ya trae un enlace. */
  function checkUrl() {
    if (!hashListenerReady) {
      hashListenerReady = true;
      window.addEventListener("hashchange", () => {
        if (!window.location.hash.startsWith(SHARE_HASH_PREFIX)) return;
        if (mode === "restore") {
          // Otro enlace pegado con el diálogo abierto: se cambia el fragmento y
          // se limpia la frase, sin volver a abrirlo.
          fragment = window.location.hash;
          els().passphrase.value = "";
          hideError();
          return;
        }
        startRestore();
      });
    }
    startRestore();
  }

  /** Monta el diálogo: envío, cierre, foco atrapado y `Escape`. */
  function setup() {
    const el = els();
    el.form.addEventListener("submit", submit);
    el.cancel.addEventListener("click", close);
    document.getElementById("share-modal-close").addEventListener("click", close);
    el.modal.addEventListener("click", (e) => {
      if (e.target === el.modal) close();
    });
    el.modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(el.modal.querySelectorAll("button, input, select, textarea, a[href]"))
        .filter((node) => !node.disabled && node.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  return { open, checkUrl, setup };
}

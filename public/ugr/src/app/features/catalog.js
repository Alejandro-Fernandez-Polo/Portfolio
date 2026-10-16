/**
 * Vista del **catálogo activo** y del **paquete cifrado** del autor.
 *
 * Es la extracción del bloque que vivía en el monolito: el desplegable de
 * catálogos, la exportación del activo y el flujo de desbloqueo con contraseña
 * (aviso de lo que trae, oferta de copia previa, confirmación e importación como
 * catálogo propio).
 *
 * No conoce el almacén: todo lo que toca el catálogo se lo pide a la frontera
 * (`getCatalogApi`) y el módulo del paquete llega inyectado, porque quien sabe
 * resolver el `import()` y el atajo de pruebas es el llamante. Lo que sí decide
 * aquí es **el flujo y su texto**, que es lo que el usuario lee.
 */

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Object} deps.getCatalogApi frontera del catálogo
 *   (`listCatalogs`, `getActiveCatalogKey`, `setActiveCatalogKey`, …).
 * @param {(texto: string) => string} deps.escape escapador de HTML.
 * @param {(mensaje: string, tipo: string) => void} deps.notify aviso al usuario.
 * @param {(mensaje: string) => boolean} deps.confirmFn confirmación.
 * @param {(data: Object, filename: string) => void} deps.download descarga JSON.
 * @param {() => void} deps.onCatalogChanged refresco total tras cambiar de
 *   catálogo (repinta vistas, solver, configuraciones y claustro).
 * @param {() => void} deps.exportAll exportación completa de los datos del
 *   usuario, para la **copia previa** antes de importar el paquete.
 * @param {() => Promise<Object>} deps.getPackageModule módulo del paquete
 *   cifrado (`unlockPackage` + `PACKAGE_ERRORS`).
 * @returns {{renderSelector: () => Promise<void>, setup: () => void}}
 */
export function createCatalogView({
  document,
  getCatalogApi,
  escape,
  notify,
  confirmFn,
  download,
  onCatalogChanged,
  exportAll,
  getPackageModule,
}) {
  let bound = false;

  /**
   * Pinta el desplegable de catálogos. La marca distingue la **muestra** del
   * **archivo con contraseña**: los dos traen las mismas asignaturas, así que sin
   * ella el desplegable los enseñaría iguales.
   */
  async function renderSelector() {
    const select = document.getElementById("catalog-select");
    if (!select) return;
    const api = getCatalogApi();
    if (!api || typeof api.listCatalogs !== "function") {
      select.disabled = true;
      return;
    }
    let list = [];
    try {
      list = await api.listCatalogs();
    } catch {
      list = [];
    }
    if (!list.length) {
      select.innerHTML = '<option value="">Catálogo local (sin tienda)</option>';
      select.disabled = true;
      return;
    }
    select.innerHTML = list
      .map((c) => {
        const marca = (c.sources || []).includes("volcado") ? "archivo con contraseña" : "muestra";
        const label =
          [c.university, c.degree, c.version, `${c.subjectCount} asignaturas`, marca]
            .filter(Boolean)
            .join(" · ") || c.id;
        return `<option value="${escape(c.id)}">${escape(label)}</option>`;
      })
      .join("");
    select.disabled = false;
    select.value = api.getActiveCatalogKey();
  }

  /** Descarga el catálogo activo en JSON. */
  async function exportActive() {
    const api = getCatalogApi();
    if (!api || typeof api.exportCatalog !== "function") {
      notify("Exportación de catálogo no disponible", "error");
      return;
    }
    const id = api.getActiveCatalogKey();
    try {
      const data = await api.exportCatalog(id);
      if (!data) {
        notify("Catálogo no disponible", "error");
        return;
      }
      download(data, `catalogo-${String(id).replace(/\//g, "_")}.json`);
      notify("Catálogo exportado", "success");
    } catch {
      notify("Error al exportar el catálogo", "error");
    }
  }

  /** Desplegable de catálogos: cambiar de catálogo lo activa y refresca todo. */
  function setupSelector() {
    if (!bound) {
      // El puente del kernel avisa por evento cuando el catálogo cambia solo.
      document.addEventListener("ugr:catalogUpdated", onCatalogChanged);
      bound = true;
    }
    const select = document.getElementById("catalog-select");
    if (select && !select.dataset.catalogBound) {
      select.dataset.catalogBound = "1";
      select.addEventListener("change", async (e) => {
        const id = e.target.value;
        const api = getCatalogApi();
        if (!api || !id || typeof api.setActiveCatalogKey !== "function") return;
        const res = await api.setActiveCatalogKey(id);
        if (!res || !res.ok) {
          notify("No se pudo activar ese catálogo", "error");
          renderSelector();
          return;
        }
        onCatalogChanged();
      });
    }
    const exportBtn = document.getElementById("btn-catalog-export");
    if (exportBtn && !exportBtn.dataset.catalogBound) {
      exportBtn.dataset.catalogBound = "1";
      exportBtn.addEventListener("click", exportActive);
    }
    renderSelector();
  }

  /** Estado del paquete cifrado, con su clase de error. */
  function setStatus(texto, tipo) {
    const status = document.getElementById("package-status");
    if (!status) return;
    status.textContent = texto || "";
    status.className = tipo ? `package-status ${tipo}` : "package-status";
  }

  /**
   * Abre el paquete con la contraseña y lo importa como catálogo **propio**:
   * identificador distinto al de la muestra (así se puede volver a ella desde
   * «Catálogo activo»), con aviso de lo que trae y oferta de copia previa,
   * porque pasa a ser el catálogo con el que se resuelven los horarios.
   *
   * La contraseña **no se guarda**: se pide cada vez y el campo se vacía.
   */
  async function importar() {
    const input = document.getElementById("package-password");
    const button = document.getElementById("btn-package-unlock");
    if (!input || !button) return;
    const password = input.value;
    if (!password) {
      setStatus("Escribe la contraseña del paquete.", "error");
      input.focus();
      return;
    }
    const api = getCatalogApi();
    if (!api || typeof api.saveCatalog !== "function") {
      setStatus("Sin almacenamiento no se puede importar el catálogo.", "error");
      return;
    }

    button.disabled = true;
    setStatus("Abriendo el paquete…");
    try {
      const mod = await getPackageModule();
      const res = await mod.unlockPackage(password);
      if (!res || !res.ok) {
        const mensaje = (mod.PACKAGE_ERRORS && mod.PACKAGE_ERRORS[res && res.reason]) || "No se pudo abrir el paquete.";
        setStatus(mensaje, "error");
        return;
      }

      const asignaciones = Array.isArray(res.catalog.docents) ? res.catalog.docents.length : 0;
      const perfiles = Array.isArray(res.catalog.profesores) ? res.catalog.profesores.length : 0;
      if (confirmFn(`El paquete trae ${asignaciones} asignaciones y ${perfiles} perfiles de profesor.\n\n¿Descargar antes una copia de tus datos actuales?`)) {
        exportAll();
      }
      if (!confirmFn("El catálogo del volcado pasará a ser el activo. El que usas ahora seguirá guardado y podrás volver a él desde «Catálogo activo».\n\n¿Importar?")) {
        setStatus("Importación cancelada.");
        return;
      }

      setStatus("Guardando el catálogo…");
      const guardado = await api.saveCatalog(res.catalog, { id: res.id });
      if (!guardado || !guardado.ok) {
        const detalle = guardado && guardado.error ? ` (${guardado.error})` : "";
        setStatus(`No se pudo guardar el catálogo importado${detalle}.`, "error");
        return;
      }
      const activado = await api.setActiveCatalogKey(guardado.id);
      if (!activado || !activado.ok) {
        setStatus("El catálogo se guardó, pero no se pudo activar.", "error");
        return;
      }
      input.value = "";
      setStatus(`Catálogo del volcado activo: ${asignaciones} asignaciones y ${perfiles} perfiles.`);
      notify("Catálogo del volcado importado", "success");
    } catch {
      setStatus("No se pudo abrir el paquete.", "error");
    } finally {
      button.disabled = false;
    }
  }

  /** Monta la vista: desplegable, exportación y flujo de la contraseña. */
  function setup() {
    setupSelector();
    const input = document.getElementById("package-password");
    const button = document.getElementById("btn-package-unlock");
    if (!input || !button || button.dataset.packageBound) return;
    button.dataset.packageBound = "1";
    button.addEventListener("click", importar);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        importar();
      }
    });
  }

  return { renderSelector, setup };
}

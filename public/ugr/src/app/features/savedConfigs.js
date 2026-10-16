/**
 * Vista de las configuraciones guardadas de `/ugr`: la tabla, su orden, su
 * paginación y sus acciones.
 *
 * Es la **extracción** del bloque que vivía en el monolito: aquí están la lista
 * de configuraciones guardadas, su persistencia residual, el DOM y el estado de
 * la vista (orden, página, «solo favoritos»). El llamante le inyecta lo que es
 * suyo —el estado del que se construye una configuración, el catálogo, los
 * avisos y las confirmaciones— y las rutas que siguen en el monolito (cargar,
 * exportar, el solver) leen y escriben la lista por `getAll`/`append`/
 * `replaceAll`.
 *
 * El orden y los filtros (bloqueos, favoritos, techos de días) son reglas puras
 * y vienen del dominio; aquí solo se inyectan el catálogo y los lookups legacy.
 *
 * `document` es inyectable (el del IIFE; simulado en tests).
 */

import {
  calculateConfigDeadHours,
  calculateConfigDays,
  calculateConfigFreeDays,
  calculateConfigMetrics,
} from "../domain/metrics.js";
import {
  applyConfigToState,
  buildBatchConfigExport,
  buildConfigFromState,
  buildSingleConfigExport,
  configFilename,
  findDuplicateConfig,
  isConfigFavorited,
  paginateConfigs,
  removeConfigById,
  selectVisibleConfigs,
} from "../domain/configs.js";
import { MAX_DIFFICULTY_SCORE } from "../../solver/catalog.js";

/** Configuraciones por página (legacy `CONFIG_PAGE_SIZE`). */
const PAGE_SIZE = 50;

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Object} deps.getState lee el estado corriente del monolito
 *   (para construir la configuración al guardar).
 * @param {Object} deps.persistence persistencia residual de configuraciones
 *   (`{loadSavedConfigs, saveAllConfigs}` del adaptador).
 * @param {(mensaje: string, tipo: string) => void} deps.notify aviso al usuario.
 * @param {(mensaje: string) => boolean} deps.confirmFn confirmación (borrado).
 * @param {() => void} deps.onConfigLoaded lo que el monolito hace al cargar una
 *   configuración (empujar el perfil al store, persistir y repintar).
 * @param {(data: Object, filename: string) => void} deps.download descarga JSON.
 * @param {(texto: string) => string} deps.escape escapador de HTML (el nombre
 *   de una configuración lo escribe el usuario).
 * @param {() => Array} deps.getSubjects lee el catálogo corriente.
 * @param {() => Array} deps.getExtraConfigs configuraciones que **no** viven
 *   aquí y que la tabla enseña igual (los resultados del solver, con su botón
 *   «Guardar»); las mutaciones de esta vista solo tocan las guardadas.
 * @param {string[]} deps.weekdays días laborables, para «Días libres».
 * @param {() => Array} deps.getBlocks lee los bloqueos del store.
 * @param {() => Object} deps.getCeilings lee los techos de días de mañana/tarde
 *   del panel de bloqueos (`{maxManana, maxTarde}`).
 * @param {() => Array} deps.getCompareIds lee los ids en comparación.
 * @param {(codigo: string, letra: string) => ?} deps.getDificultad dificultad.
 * @param {(d: ?) => ?} deps.difficultyScore puntuación de una dificultad.
 * @param {Object} deps.dayShort iniciales por día (legacy `DAY_SHORT`).
 * @param {(id: number) => void} deps.onLoad cargar una configuración.
 * @param {(id: number) => void} deps.onSaveSolver guardar un resultado del solver.
 * @param {(id: number) => void} deps.onExport exportar una configuración.
 * @param {(id: number) => void} deps.onCompare añadir/quitar de la comparación.
 * @returns {Object} la vista y sus operaciones: `render`, `resetPage`, `getAll`,
 *   `loadFromStorage`, `replaceAll`, `append`, `saveCurrent`, `remove`,
 *   `toggleFavorite`, `load`, `exportOne` y `exportAll`.
 */
export function createSavedConfigsView({
  document,
  getState,
  persistence,
  notify,
  confirmFn,
  onConfigLoaded,
  download,
  escape,
  getSubjects,
  getExtraConfigs,
  weekdays,
  getBlocks,
  getCeilings,
  getCompareIds,
  getDificultad,
  difficultyScore,
  dayShort,
  onLoad,
  onSaveSolver,
  onExport,
  onCompare,
}) {
  let configs = [];
  let page = 1;
  let sortField = "name";
  let sortDir = "asc";
  let showFavoritesOnly = false;

  /** La página vuelve a la primera cuando cambia la lista (alta o borrado). */
  function resetPage() {
    page = 1;
  }

  function persist() {
    if (persistence && typeof persistence.saveAllConfigs === "function") {
      persistence.saveAllConfigs(configs);
    }
  }

  /** Lee la lista de la persistencia (lo hace el arranque del monolito). */
  function loadFromStorage() {
    try {
      configs = persistence && typeof persistence.loadSavedConfigs === "function"
        ? persistence.loadSavedConfigs()
        : [];
    } catch {
      configs = [];
    }
    return configs;
  }

  function getAll() {
    return configs;
  }

  /**
   * Lo que enseña la tabla: las guardadas **más** las que aporta el llamante
   * (resultados del solver). Es la misma unión de siempre; las mutaciones de
   * esta vista solo tocan `configs`, nunca las de fuera.
   */
  function displayedConfigs() {
    const extra = typeof getExtraConfigs === "function" ? getExtraConfigs() : [];
    return configs.concat(Array.isArray(extra) ? extra : []);
  }

  /** Sustituye la lista entera (importación masiva, reinicio, borrado total). */
  function replaceAll(list) {
    configs = Array.isArray(list) ? list : [];
    persist();
    return configs;
  }

  /** Añade configuraciones al final (resultado del solver, importación). */
  function append(list) {
    const incoming = Array.isArray(list) ? list : [list];
    incoming.forEach((config) => config && configs.push(config));
    persist();
    return configs;
  }

  /**
   * Guarda lo que hay en el formulario. Exige nombre y al menos una materia
   * seleccionada, avisa si ya existe una configuración con los mismos grupos y
   * emite `ugr:configSaved` **después** de persistir (la telemetría cuenta
   * configuraciones guardadas, no intentos).
   */
  function saveCurrent() {
    const nameInput = document.getElementById("config-name");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
      notify("Introduce un nombre para la configuración", "error");
      return;
    }
    const state = getState();
    const selectedCodes = Object.keys(state.selectedSubjects).filter(c => state.selectedSubjects[c]);
    if (selectedCodes.length === 0) {
      notify("Selecciona al menos una asignatura", "error");
      return;
    }

    const config = buildConfigFromState(state, Date.now(), name);
    const duplicate = findDuplicateConfig(configs, state.groupChoices, state.selectedSubjects);
    configs.push(config);
    if (duplicate) {
      notify(`Aviso: "${duplicate.name}" tiene los mismos grupos`, "info");
    }
    persist();
    document.dispatchEvent(new Event("ugr:configSaved"));
    if (nameInput) nameInput.value = "";
    resetPage();
    render();
    notify(`"${name}" guardada`, "success");
  }

  /** Borra una configuración, con confirmación. */
  function remove(id) {
    const config = configs.find(c => c.id === id);
    if (!config) return;
    if (!confirmFn(`¿Eliminar "${config.name}"?`)) return;
    configs = removeConfigById(configs, id);
    persist();
    resetPage();
    render();
    notify(`"${config.name}" eliminada`, "info");
  }

  /** Marca/desmarca una configuración como favorita. */
  function toggleFavorite(id) {
    const config = configs.find(c => c.id === id);
    if (!config) return;
    config.favorite = !config.favorite;
    persist();
    render();
  }

  /**
   * Carga una configuración en el estado: la aplica, sincroniza los campos del
   * perfil que viven en la cabecera y deja al monolito persistir y repintar el
   * resto de vistas (el store y las otras secciones son suyos).
   */
  function load(id) {
    const config = displayedConfigs().find(c => c.id === id);
    if (!config) return;
    applyConfigToState(getState(), config);
    const apellido = document.getElementById("apellido");
    const turno = document.getElementById("turno-preferente");
    const state = getState();
    if (apellido) apellido.value = state.apellido;
    if (turno) turno.value = state.turnoPreferente;
    onConfigLoaded();
    notify(`"${config.name}" cargada`, "success");
  }

  /** Exporta una configuración (guardada o resultado del solver). */
  function exportOne(id) {
    const config = displayedConfigs().find(c => c.id === id);
    if (!config) return;
    const data = buildSingleConfigExport(config, new Date().toISOString());
    download(data, configFilename(config.name));
    notify(`"${config.name}" exportada`, "success");
  }

  /** Exporta todas las guardadas en un envoltorio batch. */
  function exportAll() {
    if (configs.length === 0) {
      notify("No hay configuraciones propias que exportar", "info");
      return;
    }
    const data = buildBatchConfigExport(configs, new Date().toISOString());
    download(data, "ugr-horario-configs.json");
    notify(`${configs.length} configuración(es) exportada(s)`, "success");
  }

  function toolbarHtml() {
    return '<div class="saved-configs-toolbar">'
      + `<button class="btn btn-sm ${showFavoritesOnly ? "btn-primary" : "btn-secondary"}" id="btn-toggle-favorites">\u2605 Favoritos${showFavoritesOnly ? " (activado)" : ""}</button>`
      + "</div>";
  }

  function arrow(field) {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  }

  function headerHtml(freeDaysSortable) {
    let html = "<thead><tr>";
    html += '<th class="col-fav-head">\u2605</th>';
    html += `<th data-sort="name" class="sortable${sortField === "name" ? " sort-active" : ""}">Nombre${arrow("name")}</th>`;
    html += `<th data-sort="count" class="sortable${sortField === "count" ? " sort-active" : ""}">N. Asig${arrow("count")}</th>`;
    html += `<th data-sort="turno" class="sortable${sortField === "turno" ? " sort-active" : ""}">Turno${arrow("turno")}</th>`;
    html += `<th data-sort="manana" class="sortable${sortField === "manana" ? " sort-active" : ""}">D\u00EDas M${arrow("manana")}</th>`;
    html += `<th data-sort="tarde" class="sortable${sortField === "tarde" ? " sort-active" : ""}">D\u00EDas T${arrow("tarde")}</th>`;
    // La columna «Días libres» solo es ordenable si hay algo que ordenar: con
    // todas las configuraciones con los mismos días libres, el clic no movería
    // nada y la cabecera no debe invitar a pulsarla.
    html += freeDaysSortable
      ? `<th data-sort="freeDays" class="sortable${sortField === "freeDays" ? " sort-active" : ""}">D\u00EDas libres${arrow("freeDays")}</th>`
      : '<th class="col-freedays">D\u00EDas libres</th>';
    html += `<th data-sort="deadHours" class="sortable${sortField === "deadHours" ? " sort-active" : ""}">Huecos${arrow("deadHours")}</th>`;
    html += `<th data-sort="profScore" class="sortable${sortField === "profScore" ? " sort-active" : ""}">Prof${arrow("profScore")}</th>`;
    html += `<th data-sort="sameGroup" class="sortable${sortField === "sameGroup" ? " sort-active" : ""}">Grupo${arrow("sameGroup")}</th>`;
    html += '<th class="col-actions-head">Acciones</th>';
    html += "</tr></thead>";
    return html;
  }

  function rowHtml(config, subjects) {
    const count = Object.keys(config.selectedSubjects).filter(c => config.selectedSubjects[c]).length;
    const metrics = calculateConfigMetrics(config.selectedSubjects, config.groupChoices, {
      subjects,
      dificultad: getDificultad,
      difficultyScore,
    });
    const dayCounts = calculateConfigDays(config.selectedSubjects, config.groupChoices, { subjects });
    const freeDays = calculateConfigFreeDays(config.selectedSubjects, config.groupChoices, {
      subjects,
      weekdays,
    });
    const favorited = isConfigFavorited(config);
    const comparing = getCompareIds().includes(config.id);
    let html = "<tr>";
    html += `<td class="col-fav"><button class="btn-fav ${favorited ? "active" : ""}" data-action="favorite" data-id="${config.id}">${favorited ? "\u2605" : "\u2606"}</button></td>`;
    html += `<td class="col-name">${escape(config.name)}</td>`;
    html += `<td class="col-count">${count}</td>`;
    html += `<td class="col-turno">${config.turnoPreferente}</td>`;
    html += `<td class="col-manana">${dayCounts.manana}</td>`;
    html += `<td class="col-tarde">${dayCounts.tarde}</td>`;
    // Días sin ninguna clase, con las iniciales L,M,X,J,V; guion si no hay
    // ninguno libre.
    html += `<td class="col-freedays">${freeDays.map(day => dayShort[day] || "").join(", ") || "\u2014"}</td>`;
    const dead = config.deadHours != null
      ? config.deadHours
      : calculateConfigDeadHours(config.selectedSubjects, config.groupChoices, { subjects });
    html += `<td class="col-deadhours">${dead}</td>`;
    // Sin nada que puntuar (`profCount === 0`) se pinta un hueco, no «0/0»: es
    // el caso normal cuando no hay dificultades, cuando todas son «Desconocidas»
    // y cuando el modo profesores está activo.
    html += `<td class="col-prof">${metrics.profCount ? `${metrics.profScore}/${metrics.profCount * MAX_DIFFICULTY_SCORE}` : "\u2014"}</td>`;
    html += `<td class="col-group ${metrics.sameGroupPerYear ? "group-ok" : "group-warn"}">${metrics.sameGroupPerYear ? "\u2713 Uniforme" : "\u2717 Mixtos"}</td>`;
    html += '<td class="col-actions">';
    html += `<button class="btn btn-sm btn-secondary" data-action="load" data-id="${config.id}">Cargar</button>`;
    html += `<button class="btn btn-sm ${comparing ? "btn-danger" : "btn-secondary"}" data-action="compare" data-id="${config.id}">${comparing ? "Quitar" : "Comparar"}</button>`;
    html += `<button class="btn btn-sm btn-secondary" data-action="export-config" data-id="${config.id}">Exportar</button>`;
    if (config.solver) {
      html += `<button class="btn btn-sm btn-primary" data-action="save-solver" data-id="${config.id}">Guardar</button>`;
    } else {
      html += `<button class="btn btn-sm btn-danger" data-action="delete" data-id="${config.id}">Eliminar</button>`;
    }
    html += "</td></tr>";
    return html;
  }

  function paginationHtml(totalEntries, totalPages) {
    if (totalPages <= 1) return "";
    let html = '<div class="pagination">';
    html += `<button class="btn btn-sm btn-secondary" id="cfg-page-prev" ${page <= 1 ? "disabled" : ""}>\u2190 Anterior</button>`;
    html += `<span class="page-info">P\u00e1gina ${page} de ${totalPages} (${totalEntries} entradas)</span>`;
    html += `<button class="btn btn-sm btn-secondary" id="cfg-page-next" ${page >= totalPages ? "disabled" : ""}>Siguiente \u2192</button>`;
    html += "</div>";
    return html;
  }

  function bindHeader(container) {
    container.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortField = field;
          sortDir = field === "name" || field === "turno" ? "asc" : "desc";
        }
        page = 1;
        render();
      });
    });
  }

  function bindRows(container) {
    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id);
        if (btn.dataset.action === "load") onLoad(id);
        else if (btn.dataset.action === "delete") remove(id);
        else if (btn.dataset.action === "save-solver") onSaveSolver(id);
        else if (btn.dataset.action === "export-config") onExport(id);
        else if (btn.dataset.action === "compare") onCompare(id);
        else if (btn.dataset.action === "favorite") toggleFavorite(id);
      });
    });
  }

  function bindToolbar(container) {
    const toggleFavBtn = container.querySelector("#btn-toggle-favorites");
    if (!toggleFavBtn) return;
    toggleFavBtn.addEventListener("click", () => {
      showFavoritesOnly = !showFavoritesOnly;
      page = 1;
      render();
    });
  }

  function bindPagination(container) {
    const prevBtn = container.querySelector("#cfg-page-prev");
    const nextBtn = container.querySelector("#cfg-page-next");
    if (prevBtn) prevBtn.addEventListener("click", () => { page--; render(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { page++; render(); });
  }

  function render() {
    const container = document.getElementById("saved-configs-list");
    if (!container) return;
    const displayConfigs = displayedConfigs();
    if (displayConfigs.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay configuraciones guardadas.</p>';
      return;
    }

    const subjects = getSubjects();
    const freeDaysCounts = new Set(
      displayConfigs.map(c => calculateConfigFreeDays(c.selectedSubjects, c.groupChoices, { subjects, weekdays }).length),
    );
    const freeDaysSortable = freeDaysCounts.size > 1;

    // Orden + filtros (bloqueos, favoritos, techos de días) son reglas del
    // dominio; aquí solo se inyecta el catálogo y los lookups legacy.
    const ceilings = getCeilings() || {};
    const filtered = selectVisibleConfigs(displayConfigs, {
      sortField,
      sortDir,
      showFavoritesOnly,
      maxManana: ceilings.maxManana,
      maxTarde: ceilings.maxTarde,
      blocks: getBlocks(),
      subjects,
      dificultad: getDificultad,
      difficultyScore,
    });

    const toolbar = toolbarHtml();
    if (filtered.length === 0) {
      container.innerHTML = toolbar + '<p class="empty-state">No hay resultados con los filtros actuales.</p>';
      bindToolbar(container);
      return;
    }

    const { totalEntries, totalPages, page: safePage, entries } = paginateConfigs(filtered, page, PAGE_SIZE);
    page = safePage;

    container.innerHTML = toolbar
      + '<table class="saved-configs-table">'
      + headerHtml(freeDaysSortable)
      + `<tbody>${entries.map(c => rowHtml(c, subjects)).join("")}</tbody></table>`
      + paginationHtml(totalEntries, totalPages);

    bindToolbar(container);
    bindHeader(container);
    bindRows(container);
    bindPagination(container);
  }

  return {
    render,
    resetPage,
    getAll,
    loadFromStorage,
    replaceAll,
    append,
    saveCurrent,
    remove,
    toggleFavorite,
    load,
    exportOne,
    exportAll,
  };
}

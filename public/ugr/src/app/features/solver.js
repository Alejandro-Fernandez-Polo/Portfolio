/**
 * Vista del **panel del generador** de `/ugr`.
 *
 * Reúne lo que se toca antes y durante la generación: los filtros y su
 * persistencia, la estrategia, el bloqueo de profesores, el problema que se le
 * pasa al motor, la comprobación de viabilidad (con su caché por firma), el
 * progreso, la cancelación y la tabla de resultados.
 *
 * Es la vista, no el motor: el motor (`src/solver/`) y la construcción del
 * problema (`app/domain/problem.js`) se consumen tal cual, y el puente con el
 * hilo aparte sigue siendo `window.__ugrSolver`. Lo que sí posee es el estado de
 * la pantalla —filtros, estrategia, resultados, viabilidad—, que el monolito lee
 * por `getFilters`/`getStrategy`/`getResults` y el resto de la app refleja por
 * los intents que se le inyectan.
 *
 * `document` y `window` son inyectables (los del IIFE; simulados en tests).
 */

import { blockedEmptySubjects, buildProblem, feasibilitySignature } from "../domain/problem.js";

/** Estrategias del generador: etiqueta y pesos que recibe el motor. */
const STRATEGIES = {
  balanced: { label: "Equilibrado", weights: { deadHours: 1, days: 0.8, afternoons: 0.6, mornings: 0, earlyStart: 0.4, loadVariance: 0.5, filters: 1, professor: 0.5 } },
  professors: { label: "Mejores profesores", weights: { professor: 1000, deadHours: 1, days: 0.3, afternoons: 0, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
  morning: { label: "Priorizar mañana", weights: { afternoons: 1000, professor: 1, deadHours: 0.5, days: 0.3, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
  afternoon: { label: "Priorizar tarde", weights: { mornings: 1000, professor: 1, deadHours: 0.5, days: 0.3, afternoons: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
  compact: { label: "Menos horas muertas", weights: { deadHours: 1000, professor: 1, days: 0.3, afternoons: 0, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
  shortWeek: { label: "Menos días", weights: { days: 1000, deadHours: 1, professor: 0.5, afternoons: 0, mornings: 0, earlyStart: 0.2, loadVariance: 0.2, filters: 1 } },
};

/**
 * Opciones del desplegable de turno, de mañana a tarde. Las dos «solo» son duras
 * (recortan los grupos del otro turno) y las dos «preferente» blandas (solo
 * puntúan). «Indiferente» no escribe filtro.
 */
const TURNO_OPTIONS = [
  ["solo-mañana", "Solo por la mañana"],
  ["mañana", "Preferente por la mañana"],
  ["indiferente", "Indiferente"],
  ["tarde", "Preferente por la tarde"],
  ["solo-tarde", "Solo por la tarde"],
];

/** Clave de `localStorage` de los filtros. */
const FILTERS_KEY = "ugr-solver-filters";
/** Clave de `localStorage` de la estrategia. */
const STRATEGY_KEY = "ugr-solver-strategy";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {Window} deps.window ventana (`localStorage` y el puente `__ugrSolver`).
 * @param {() => Object} deps.getState estado corriente (selección y perfil).
 * @param {() => Array} deps.getSubjects catálogo activo.
 * @param {() => Array<string>} deps.getPassedCodes asignaturas superadas.
 * @param {Array<string>} deps.filterTypes tipos de filtro admitidos.
 * @param {() => boolean} deps.isIgnoringDocents lee el modo «ignorar profesores».
 * @param {(activado: boolean) => void} deps.onToggleIgnoreDocents el mismo interruptor que la sección de profesores.
 * @param {Array<string>} deps.weekdays días laborables.
 * @param {Object} deps.dayLabels nombre de cada día.
 * @param {(clave: string) => Object|null} deps.getDocentInfo asignación de un grupo.
 * @param {(codigo: string, letra: string) => Object|null} deps.getProfesorInfo perfil de un grupo.
 * @param {(codigo: string, letra: string) => ?} deps.getDificultad dificultad del grupo (o `null`).
 * @param {(d: ?) => string} deps.difficultyToken token CSS del color de la dificultad.
 * @param {(d: ?) => number|null} deps.difficultyScore peso de la dificultad.
 * @param {() => boolean} deps.hasSelectedInTerm ¿hay selección en el cuatrimestre?
 * @param {() => void} deps.onResultsCleared los resultados se han vaciado (reiniciar la página de la tabla).
 * @param {() => void} deps.onResultsReady los resultados están listos (repintar la tabla de configuraciones).
 * @param {(resultado: Object) => void} deps.onSaveResult guardar un resultado como configuración.
 * @param {(mensaje: string, tipo: string) => void} deps.notify aviso al usuario.
 * @returns {Object} la vista montada.
 */
export function createSolverView({
  document,
  window,
  getState,
  getSubjects,
  getPassedCodes,
  filterTypes,
  isIgnoringDocents,
  onToggleIgnoreDocents,
  weekdays,
  dayLabels,
  getDocentInfo,
  getProfesorInfo,
  getDificultad,
  difficultyToken,
  difficultyScore,
  hasSelectedInTerm,
  onResultsCleared,
  onResultsReady,
  onSaveResult,
  notify,
}) {
  // Filtros y estrategia: se leen al montar (el IIFE ya no los lee antes).
  let filters = leerFiltros();
  let strategy = leerEstrategia();
  /** Resultados de la última generación (los pinta la tabla de configuraciones). */
  let results = [];
  let busy = false;
  let runSeq = 0;
  let idSeq = 1000000000;

  // Viabilidad: si el motor dice que no hay ninguna combinación, el botón queda
  // bloqueado; la marca evita repetir la consulta sin cambios.
  let infeasible = false;
  let feasibilityTimer = null;
  let feasibilitySeq = 0;
  let feasibilityKey = "";

  function leerFiltros() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FILTERS_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((f) => f && filterTypes.includes(f.type));
    } catch {
      return [];
    }
  }

  function leerEstrategia() {
    const guardada = window.localStorage.getItem(STRATEGY_KEY) || "balanced";
    return STRATEGIES[guardada] ? guardada : "balanced";
  }

  const el = (id) => document.getElementById(id);
  const find = (type) => filters.find((f) => f.type === type);
  const guardarFiltros = () => {
    window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  };
  const guardarEstrategia = () => {
    window.localStorage.setItem(STRATEGY_KEY, strategy);
  };

  function setFilter(type, value) {
    filters = filters.filter((f) => f.type !== type);
    if (value !== null && value !== undefined && value !== "") {
      filters.push({ type, value, weight: 1 });
    }
    guardarFiltros();
    // Cualquier cambio de filtro puede dejar el problema sin solución: se
    // comprueba (con debounce) para avisar y bloquear el botón si no hay nada.
    scheduleFeasibility();
  }

  /** Aplica filtros y estrategia de golpe (los trae la restauración de un enlace). */
  function applyFilters(nuevosFiltros, nuevaEstrategia) {
    filters = nuevosFiltros;
    guardarFiltros();
    strategy = nuevaEstrategia;
    guardarEstrategia();
  }

  /** La estrategia de profesores depende de datos que el modo apagado retira. */
  function onIgnoreDocentsChanged() {
    if (isIgnoringDocents() && strategy === "professors") {
      strategy = "balanced";
      guardarEstrategia();
    }
  }

  // ─── El problema que se le pasa al motor ─────────────────────

  function buildProblemActual() {
    return buildProblem({
      selectedSubjects: getState().selectedSubjects,
      catalog: getSubjects(),
      cuatrimestre: getState().cuatrimestreActivo,
      passedCodes: getPassedCodes(),
      filters,
      ignoreDocents: isIgnoringDocents(),
      dificultad: getDificultad,
      difficultyScore,
    });
  }

  function sinGrupos(problem) {
    return blockedEmptySubjects(problem, {
      subjects: getSubjects(),
      blocked: find("blockGroups")?.value || [],
      ignoreDocents: isIgnoringDocents(),
    });
  }

  // ─── Comprobación de viabilidad ──────────────────────────────

  function setFeasibilityMessage(text, active) {
    const bloque = el("solver-feasibility");
    if (bloque) {
      bloque.textContent = text;
      bloque.classList.toggle("is-blocking", active === true);
    }
    infeasible = active === true;
    refreshGenerateButton();
  }

  /** La comprobación con debounce: tocar varios filtros seguidos deja una consulta. */
  function scheduleFeasibility() {
    if (feasibilityTimer) window.clearTimeout(feasibilityTimer);
    feasibilityTimer = window.setTimeout(runFeasibilityCheck, 300);
  }

  async function runFeasibilityCheck() {
    feasibilityTimer = null;
    const bridge = window.__ugrSolver;
    let problem;
    try {
      problem = buildProblemActual();
    } catch {
      return; // dominio aún sin montar: no hay nada que comprobar
    }
    if (!bridge || typeof bridge.checkFeasible !== "function" || problem.subjects.length === 0) {
      // Sin asignaturas no hay nada que generar, así que no se bloquea nada.
      setFeasibilityMessage("", false);
      feasibilityKey = feasibilitySignature(problem);
      return;
    }
    const key = feasibilitySignature(problem);
    if (key === feasibilityKey) return;
    feasibilityKey = key;

    const seq = ++feasibilitySeq;
    let result;
    try {
      result = await bridge.checkFeasible(problem, { apellido: getState().apellido });
    } catch {
      result = { feasible: null };
    }
    if (seq !== feasibilitySeq) return; // llegó tarde: hay otra consulta en curso
    if (result && result.feasible === false) {
      setFeasibilityMessage("Ningún horario cumple esos filtros.", true);
    } else if (result && result.feasible === null) {
      setFeasibilityMessage("No se pudo comprobar si hay alguna combinación: hay demasiadas posibilidades.", false);
    } else {
      setFeasibilityMessage("", false);
    }
  }

  // ─── El botón de generar y el estado de la generación ────────

  /**
   * El botón está libre solo si hay selección, no hay trabajo en curso y la
   * comprobación de viabilidad no ha dicho que no hay ninguna combinación.
   */
  function refreshGenerateButton() {
    const gen = el("btn-solver-generate");
    if (gen) gen.disabled = busy || !hasSelectedInTerm() || infeasible;
  }

  function setStatus(text) {
    const estado = el("solver-status");
    if (estado) estado.textContent = text || "";
  }

  function setBusy(busy_) {
    busy = busy_;
    const cancelar = el("btn-solver-cancel");
    const progreso = el("solver-progress");
    refreshGenerateButton();
    if (cancelar) cancelar.style.display = busy ? "" : "none";
    if (progreso) progreso.style.display = busy ? "" : "none";
  }

  function setProgress(stats) {
    const fill = el("solver-progress-fill");
    if (!fill || !stats) return;
    const pct = Math.min(95, ((stats.nodes || 0) / 20000) * 100);
    fill.style.width = pct + "%";
    setStatus(`${stats.found || 0} soluciones · ${stats.nodes || 0} nodos`);
  }

  function toConfig(item, index) {
    const elegida = STRATEGIES[strategy] ? strategy : "balanced";
    return {
      id: idSeq++,
      name: `Generado ${index + 1} · ${STRATEGIES[elegida].label}`,
      selectedSubjects: { ...item.selectedSubjects },
      groupChoices: JSON.parse(JSON.stringify(item.groupChoices)),
      apellido: getState().apellido,
      turnoPreferente: getState().turnoPreferente,
      solver: true,
      strategy: elegida,
      cost: item.cost,
      deadHours: item.costBreakdown ? item.costBreakdown.deadHours : null,
    };
  }

  async function run() {
    if (busy) return;
    const bridge = window.__ugrSolver;
    if (!bridge) {
      setStatus("El motor no está disponible.");
      return;
    }
    const problem = buildProblemActual();
    if (problem.subjects.length === 0) {
      setStatus(problem.excludedPassed.length
        ? "Todas las asignaturas seleccionadas de este cuatrimestre están superadas."
        : "No hay asignaturas seleccionadas en este cuatrimestre.");
      return;
    }
    const empty = sinGrupos(problem);
    if (empty.length) {
      setStatus(`El bloqueo de profesores deja sin grupos: ${empty.join(", ")}.`);
      return;
    }
    const kInput = el("solver-topk");
    const k = Math.max(1, Math.min(500, parseInt(kInput?.value || "200", 10) || 200));
    const runId = ++runSeq;
    results = [];
    onResultsCleared();
    setBusy(true);
    setStatus("Generando…");
    const weights = (STRATEGIES[strategy] || STRATEGIES.balanced).weights;
    try {
      const result = await bridge.solveTopK(problem, {
        k,
        weights,
        apellido: getState().apellido,
        onProgress: (stats) => {
          if (runId === runSeq) setProgress(stats);
        },
      });
      if (runId !== runSeq) return;
      results = result.items.map(toConfig);
      onResultsReady();
      const approx = result.stats.approximate ? " (aprox.)" : "";
      const omitted = problem.excludedPassed.length ? ` · ${problem.excludedPassed.length} superadas omitidas` : "";
      setStatus(`${results.length} horarios generados${approx}${result.fromCache ? " · caché" : ""}${omitted}`);
    } catch (err) {
      if (runId === runSeq) setStatus("Error: " + (err && err.message ? err.message : err));
    } finally {
      if (runId === runSeq) setBusy(false);
    }
  }

  function cancel() {
    runSeq++;
    if (window.__ugrSolver) window.__ugrSolver.cancel();
    setBusy(false);
    setStatus("Generación cancelada.");
  }

  /** Guardar un resultado del solver como configuración propia. */
  function saveResult(id) {
    const cfg = results.find((c) => c.id === id);
    if (!cfg) return;
    onSaveResult(cfg);
    notify("Horario guardado", "success");
    onResultsReady();
  }

  /** El catálogo ha cambiado: fuera resultados y estado del panel. */
  function clear() {
    if (busy) cancel();
    results = [];
    setStatus("");
  }

  // ─── El panel de filtros ─────────────────────────────────────

  function professorOptions() {
    const byName = new Map();
    getSubjects().forEach((s) => {
      (s.grupos || []).forEach((g) => {
        const key = `${s.codigo}-${g.letra}`;
        const info = getDocentInfo(key);
        if (!info || !info.name) return;
        if (!byName.has(info.name)) {
          byName.set(info.name, {
            name: info.name,
            dificultad: (getProfesorInfo(s.codigo, g.letra) || {}).dificultad || null,
            keys: [],
            subjects: new Set(),
          });
        }
        const entry = byName.get(info.name);
        entry.keys.push(key);
        entry.subjects.add(s.codigo);
      });
    });
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function toggleProfessorBlock(name, blocked, options) {
    const option = options.find((o) => o.name === name);
    if (!option) return;
    const set = new Set(find("blockGroups")?.value || []);
    option.keys.forEach((k) => {
      if (blocked) set.add(k);
      else set.delete(k);
    });
    setFilter("blockGroups", set.size ? [...set] : null);
  }

  function renderPanel() {
    const panel = el("solver-filters-panel");
    if (!panel) return;

    const maxDays = find("maxDays")?.value;
    const maxMorning = find("maxMorningDays")?.value;
    const maxAfternoon = find("maxAfternoonDays")?.value;
    const turno = find("preferTurno")?.value || "indiferente";
    const earliestStart = find("earliestStart")?.value || "";
    const latestEnd = find("latestEnd")?.value || "";
    const blocked = new Set(find("blockGroups")?.value || []);
    const sameTheory = find("sameTheoryPerCourse")?.value === true;
    const samePractice = find("samePracticePerCourse")?.value === true;
    // Con «Ignorar profesores» no se construyen las opciones: ni se pinta el
    // bloque ni se ofrece el preset «Mejores profesores».
    const ignoring = isIgnoringDocents();
    const profOptions = ignoring ? [] : professorOptions();
    const blockedCount = profOptions.filter((o) => o.keys.every((k) => blocked.has(k))).length;

    let html = "";
    html += '<div class="solver-filter-row">';
    html += '<label>Preferencia <select id="solver-strategy">';
    Object.entries(STRATEGIES).forEach(([key, s]) => {
      if (ignoring && key === "professors") return;
      html += `<option value="${key}" ${strategy === key ? "selected" : ""}>${s.label}</option>`;
    });
    html += "</select></label>";
    // «Ignorar profesores»: el mismo interruptor está también en la sección
    // «Profesores» (donde vive el dato); los dos escriben la misma preferencia.
    html += '<label class="solver-ignore-docents"><input type="checkbox" id="solver-ignore-docents"' +
      `${ignoring ? " checked" : ""}> Ignorar profesores</label>`;
    html += "</div>";
    html += '<div class="solver-filter-row">';
    html += '<span class="solver-filter-label">Días libres:</span>';
    weekdays.forEach((d) => {
      const active = (find("freeDays")?.value || []).includes(d);
      html += `<label class="solver-day-check"><input type="checkbox" data-solver-day="${d}" ${active ? "checked" : ""}> ${dayLabels[d]}</label>`;
    });
    html += "</div>";

    html += '<div class="solver-filter-row">';
    html += `<label>Máx. días con clase <input type="number" id="solver-max-days" min="0" max="5" value="${maxDays ?? ""}"></label>`;
    html += `<label>Máx. días de mañana <input type="number" id="solver-max-morning" min="0" max="5" value="${maxMorning ?? ""}"></label>`;
    html += `<label>Máx. días de tarde <input type="number" id="solver-max-afternoon" min="0" max="5" value="${maxAfternoon ?? ""}"></label>`;
    html += "</div>";

    html += '<div class="solver-filter-row">';
    html += '<label>Turno <select id="solver-prefer-turno">';
    TURNO_OPTIONS.forEach(([value, label]) => {
      html += `<option value="${value}" ${turno === value ? "selected" : ""}>${label}</option>`;
    });
    html += "</select></label>";
    html += `<label>No empezar antes de <input type="time" id="solver-earliest-start" value="${earliestStart}"></label>`;
    html += `<label>No acabar después de <input type="time" id="solver-latest-end" value="${latestEnd}"></label>`;
    html += "</div>";

    // Mismo grupo por curso. El segundo check exige el primero, así que se queda
    // deshabilitado (y desmarcado) mientras no esté activo.
    html += '<div class="solver-filter-row">';
    html += `<label class="solver-same-group"><input type="checkbox" id="solver-same-theory"${sameTheory ? " checked" : ""}> Mismo grupo de teoría por curso</label>`;
    html += `<label class="solver-same-group"><input type="checkbox" id="solver-same-practice"${samePractice ? " checked" : ""}${sameTheory ? "" : " disabled"}> Mismo grupo de teoría y de prácticas por curso</label>`;
    html += "</div>";

    // El panel «Bloquear profesores» solo existe con los profesores activos:
    // con el modo encendido el bloqueo no se aplica, y mostrar el botón
    // invitaría a usar algo que el motor ignora.
    if (!ignoring) {
      html += '<div class="solver-prof-block">';
      html += `<button type="button" class="btn btn-sm btn-secondary" id="btn-toggle-solver-profs">Bloquear profesores${blockedCount ? ` (${blockedCount})` : ""}</button>`;
      html += '<div class="solver-prof-body" style="display:none">';
      html += '<input type="search" id="solver-prof-search" placeholder="Buscar profesor o asignatura...">';
      html += '<div class="solver-prof-list" id="solver-prof-list">';
      if (profOptions.length === 0) {
        html += '<p class="empty-state">No hay datos de profesores.</p>';
      } else {
        profOptions.forEach((o) => {
          const isBlocked = o.keys.every((k) => blocked.has(k));
          const subjects = [...o.subjects].sort().join(", ");
          const diff = o.dificultad ? difficultyToken(o.dificultad) : "";
          html += `<label class="solver-prof-item" data-search="${o.name.toLowerCase()} ${subjects.toLowerCase()}">`;
          html += `<input type="checkbox" data-prof-name="${o.name}" ${isBlocked ? "checked" : ""}>`;
          html += `<span class="solver-prof-diff" style="background:${diff}"></span>`;
          html += `<span class="solver-prof-name">${o.name}</span>`;
          html += `<span class="solver-prof-meta">${subjects}</span>`;
          html += "</label>";
        });
      }
      html += "</div></div></div>";
    }

    panel.innerHTML = html;

    const strategySelect = panel.querySelector("#solver-strategy");
    if (strategySelect) {
      strategySelect.addEventListener("change", () => {
        strategy = STRATEGIES[strategySelect.value] ? strategySelect.value : "balanced";
        guardarEstrategia();
      });
    }

    const ignoreDocentsInput = panel.querySelector("#solver-ignore-docents");
    if (ignoreDocentsInput) {
      ignoreDocentsInput.addEventListener("change", () => {
        onToggleIgnoreDocents(ignoreDocentsInput.checked);
      });
    }

    panel.querySelectorAll("[data-solver-day]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const days = new Set(find("freeDays")?.value || []);
        if (cb.checked) days.add(cb.dataset.solverDay);
        else days.delete(cb.dataset.solverDay);
        setFilter("freeDays", days.size ? [...days] : null);
      });
    });

    const bindNumber = (id, type) => {
      const input = panel.querySelector(id);
      if (!input) return;
      input.addEventListener("change", () => {
        setFilter(type, input.value === "" ? null : Number(input.value));
      });
    };
    bindNumber("#solver-max-days", "maxDays");
    bindNumber("#solver-max-morning", "maxMorningDays");
    bindNumber("#solver-max-afternoon", "maxAfternoonDays");

    const turnoSelect = panel.querySelector("#solver-prefer-turno");
    if (turnoSelect) {
      turnoSelect.addEventListener("change", () => {
        setFilter("preferTurno", turnoSelect.value === "indiferente" ? null : turnoSelect.value);
      });
    }
    const earliestInput = panel.querySelector("#solver-earliest-start");
    if (earliestInput) {
      earliestInput.addEventListener("change", () => {
        setFilter("earliestStart", earliestInput.value || null);
      });
    }
    const latestInput = panel.querySelector("#solver-latest-end");
    if (latestInput) {
      latestInput.addEventListener("change", () => {
        setFilter("latestEnd", latestInput.value || null);
      });
    }

    const sameTheoryInput = panel.querySelector("#solver-same-theory");
    const samePracticeInput = panel.querySelector("#solver-same-practice");
    if (sameTheoryInput) {
      sameTheoryInput.addEventListener("change", () => {
        setFilter("sameTheoryPerCourse", sameTheoryInput.checked ? true : null);
        // El subgrupo de prácticas no tiene sentido sin el grupo de teoría: al
        // apagar el primero se apaga también el segundo.
        if (!sameTheoryInput.checked) setFilter("samePracticePerCourse", null);
        renderPanel();
      });
    }
    if (samePracticeInput) {
      samePracticeInput.addEventListener("change", () => {
        setFilter("samePracticePerCourse", samePracticeInput.checked ? true : null);
      });
    }

    const profToggle = panel.querySelector("#btn-toggle-solver-profs");
    const profBody = panel.querySelector(".solver-prof-body");
    if (profToggle && profBody) {
      profToggle.addEventListener("click", () => {
        profBody.style.display = profBody.style.display === "none" ? "block" : "none";
      });
    }
    const profSearch = panel.querySelector("#solver-prof-search");
    if (profSearch) {
      profSearch.addEventListener("input", () => {
        const q = profSearch.value.trim().toLowerCase();
        panel.querySelectorAll(".solver-prof-item").forEach((item) => {
          item.style.display = !q || item.dataset.search.includes(q) ? "" : "none";
        });
      });
    }
    panel.querySelectorAll("[data-prof-name]").forEach((cb) => {
      cb.addEventListener("change", () => {
        toggleProfessorBlock(cb.dataset.profName, cb.checked, profOptions);
        const size = (find("blockGroups")?.value || []).length;
        if (profToggle) {
          profToggle.textContent = `Bloquear profesores${size ? ` (${profOptions.filter((o) => o.keys.every((k) => (find("blockGroups")?.value || []).includes(k))).length})` : ""}`;
        }
      });
    });
  }

  // ─── Montaje ────────────────────────────────────────────────

  function setup() {
    renderPanel();
    const gen = el("btn-solver-generate");
    const cancelar = el("btn-solver-cancel");
    if (gen) gen.addEventListener("click", run);
    if (cancelar) cancelar.addEventListener("click", cancel);
  }

  return {
    setup,
    renderPanel,
    refreshGenerateButton,
    scheduleFeasibility,
    onIgnoreDocentsChanged,
    isBusy: () => busy,
    cancel,
    clear,
    getFilters: () => filters,
    getStrategy: () => strategy,
    getStrategies: () => STRATEGIES,
    applyFilters,
    getResults: () => results,
    saveResult,
  };
}

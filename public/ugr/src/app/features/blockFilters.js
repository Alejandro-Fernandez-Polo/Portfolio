/**
 * Vista de los **bloqueos** de `/ugr`: qué grupos no se usan al planificar y los
 * topes de días de mañana y de tarde.
 *
 * Extraída del monolito. Los bloqueos viven en el store (`blocks/*`, que lee el
 * solver) y los topes son de esta vista, que los recuerda mientras dure la
 * sesión; la ficha del bloqueo la construye el dominio (`buildBlockPayload`) y
 * aquí solo se leen los desplegables.
 *
 * `document` es inyectable (el del IIFE; simulado en tests).
 */

import { buildBlockPayload } from "../domain/configs.js";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Array} deps.getSubjects catálogo activo.
 * @param {() => Array} deps.getBlocks bloqueos vigentes (del store).
 * @param {(cmd: Object) => void} deps.dispatchBlock despacha un comando de bloqueos.
 * @param {() => void} deps.onFiltersChanged la tabla de configuraciones ha cambiado (rehacer página y repintar).
 * @returns {{render: () => void, setup: () => void, getCeilings: () => Object}} la vista.
 */
export function createBlockFiltersView({ document, getSubjects, getBlocks, dispatchBlock, onFiltersChanged }) {
  /** Topes de días por turno: los pone esta lista y los lee la tabla. */
  let maxManana = 0;
  let maxTarde = 0;

  const el = (id) => document.getElementById(id);

  function add(type) {
    // Validar y construir el payload es regla pura (`buildBlockPayload`); aquí
    // solo se leen los selects del panel. El `return` temprano con payload nulo
    // es legacy: NO se re-renderiza cuando la validación falla (ni con `type`
    // desconocida, que en ese caso solo re-renderiza, como siempre).
    if (type === "subject" || type === "subject-only" || type === "curso") {
      const payload = buildBlockPayload(type, {
        subject: (el("block-subject-select") || {}).value,
        group: (el("block-subject-group") || {}).value,
        curso: (el("block-curso-select") || {}).value,
        cursoGroup: (el("block-curso-group") || {}).value,
      });
      if (!payload) return;
      dispatchBlock({ type: "blocks/add", payload });
    }
    onFiltersChanged();
    render();
  }

  function remove(index) {
    dispatchBlock({ type: "blocks/remove", payload: { index } });
    onFiltersChanged();
    render();
  }

  function render() {
    const panel = el("block-filters-panel");
    if (!panel) return;

    const subjects = getSubjects().filter((s) => s.grupos && s.grupos.length > 0);
    const allGroups = new Set();
    subjects.forEach((s) => s.grupos.forEach((g) => allGroups.add(g.letra)));
    const groupOptions = [...allGroups].sort().map((g) => `<option value="${g}">${g}</option>`).join("");

    const cursoGroups = {};
    subjects.forEach((s) => {
      if (!cursoGroups[s.curso]) cursoGroups[s.curso] = new Set();
      s.grupos.forEach((g) => cursoGroups[s.curso].add(g.letra));
    });

    let html = '<div class="block-filters-container">';
    html += '<button class="btn btn-sm btn-secondary block-filters-toggle" id="btn-toggle-block-filters">';
    const blocks = getBlocks();
    html += `Bloqueos${blocks.length > 0 ? ` (${blocks.length})` : ""}`;
    html += "</button>";
    html += '<div class="block-filters-body" style="display:none">';

    if (blocks.length > 0) {
      html += '<div class="block-filters-active">';
      blocks.forEach((f, i) => {
        let label;
        if (f.type === "subject") {
          label = `${f.codigo} \u00D7 Grupo ${f.letra}`;
        } else if (f.type === "subject-only") {
          label = `${f.codigo} (todas)`;
        } else {
          label = `${f.curso}\u00BA Curso \u00D7 Grupo ${f.letra}`;
        }
        html += `<span class="block-chip">${label}<button class="block-chip-remove" data-block-idx="${i}">\u00D7</button></span>`;
      });
      html += "</div>";
    }

    html += '<div class="block-filters-form">';
    html += '<div class="block-filter-row">';
    html += '<span class="block-filter-label">Asignatura:</span>';
    html += '<select id="block-subject-select" class="block-filter-select">';
    html += '<option value="">Seleccionar...</option>';
    subjects.forEach((s) => {
      html += `<option value="${s.codigo}">${s.nombre} (${s.curso}\u00BA)</option>`;
    });
    html += "</select>";
    html += '<select id="block-subject-group" class="block-filter-select"><option value="">Grupo</option></select>';
    html += '<button class="btn btn-sm btn-primary" data-block-add="subject">+ Bloquear</button>';
    html += '<button class="btn btn-sm btn-primary" data-block-add="subject-only">+ Bloquear Asig.</button>';
    html += "</div>";

    html += '<div class="block-filter-row">';
    html += '<span class="block-filter-label">Curso:</span>';
    html += '<select id="block-curso-select" class="block-filter-select">';
    html += '<option value="">Seleccionar...</option>';
    [1, 2, 3, 4].forEach((c) => {
      html += `<option value="${c}">${c}\u00BA Curso</option>`;
    });
    html += "</select>";
    html += '<select id="block-curso-group" class="block-filter-select"><option value="">Grupo</option></select>';
    html += '<button class="btn btn-sm btn-primary" data-block-add="curso">+ Bloquear Curso</button>';
    html += "</div>";

    html += '<div class="block-filter-row">';
    html += '<span class="block-filter-label">M\u00E1x d\u00EDas:</span>';
    html += '<label class="day-filter-label">Ma\u00F1ana:</label>';
    html += '<input type="number" id="block-max-manana" class="block-filter-input" min="0" max="5" value="' + maxManana + '">';
    html += '<label class="day-filter-label">Tarde:</label>';
    html += '<input type="number" id="block-max-tarde" class="block-filter-input" min="0" max="5" value="' + maxTarde + '">';
    html += '<button class="btn btn-sm btn-primary" id="btn-apply-day-filter">Aplicar</button>';
    if (maxManana > 0 || maxTarde > 0) {
      html += '<button class="btn btn-sm btn-danger" id="btn-clear-day-filter">Limpiar</button>';
    }
    html += "</div>";

    html += "</div>";
    html += "</div>";
    html += "</div>";

    panel.innerHTML = html;

    panel.querySelector("#btn-toggle-block-filters").addEventListener("click", () => {
      const body = panel.querySelector(".block-filters-body");
      body.style.display = body.style.display === "none" ? "block" : "none";
    });

    panel.querySelectorAll(".block-chip-remove").forEach((btn) => {
      btn.addEventListener("click", () => remove(parseInt(btn.dataset.blockIdx)));
    });

    panel.querySelectorAll("[data-block-add]").forEach((btn) => {
      btn.addEventListener("click", () => add(btn.dataset.blockAdd));
    });

    const subjectSelect = panel.querySelector("#block-subject-select");
    const subjectGroup = panel.querySelector("#block-subject-group");
    if (subjectSelect && subjectGroup) {
      subjectSelect.addEventListener("change", () => {
        const subj = subjects.find((s) => s.codigo === subjectSelect.value);
        if (subj) {
          subjectGroup.innerHTML = '<option value="">Grupo</option>' +
            subj.grupos.map((g) => `<option value="${g.letra}">${g.letra} (${g.turno})</option>`).join("");
        } else {
          subjectGroup.innerHTML = '<option value="">Grupo</option>';
        }
      });
    }

    const cursoSelect = panel.querySelector("#block-curso-select");
    const cursoGroup = panel.querySelector("#block-curso-group");
    if (cursoSelect && cursoGroup) {
      cursoSelect.addEventListener("change", () => {
        const c = parseInt(cursoSelect.value);
        if (c && cursoGroups[c]) {
          cursoGroup.innerHTML = '<option value="">Grupo</option>' +
            [...cursoGroups[c]].sort().map((g) => `<option value="${g}">${g}</option>`).join("");
        } else {
          cursoGroup.innerHTML = '<option value="">Grupo</option>';
        }
      });
    }

    const applyDayBtn = panel.querySelector("#btn-apply-day-filter");
    if (applyDayBtn) {
      applyDayBtn.addEventListener("click", () => {
        const mananaInput = panel.querySelector("#block-max-manana");
        const tardeInput = panel.querySelector("#block-max-tarde");
        maxManana = parseInt(mananaInput.value) || 0;
        maxTarde = parseInt(tardeInput.value) || 0;
        onFiltersChanged();
        render();
      });
    }

    const clearDayBtn = panel.querySelector("#btn-clear-day-filter");
    if (clearDayBtn) {
      clearDayBtn.addEventListener("click", () => {
        maxManana = 0;
        maxTarde = 0;
        onFiltersChanged();
        render();
      });
    }
  }

  return { render, setup: render, getCeilings: () => ({ maxManana, maxTarde }) };
}

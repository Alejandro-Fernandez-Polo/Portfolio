/**
 * Vistas del **resumen de la selección** de `/ugr`: el panel con sus contadores,
 * la lista de conflictos, la barra superior con la meta de créditos y el estado de
 * los botones que dependen de que haya algo seleccionado.
 *
 * Extraída del monolito. Las cuentas son del dominio (`buildSelectionSummary` y
 * `findConflicts`); aquí solo se pintan, y lo que el monolito sabe —los conflictos
 * detectados y el panel de control del generador— entra por getter o por intent.
 *
 * `document` es inyectable (el del IIFE; simulado en tests).
 */

import { buildSelectionSummary } from "../domain/metrics.js";

/** Cómo se ve cada turno: clase y texto. Cuál es, lo dice el dominio. */
const TURNO_BADGE = {
  "mañana": ["mañana", "Turno: Mañana"],
  tarde: ["tarde", "Turno: Tarde"],
  mixto: ["mixed", "Turno: Mixto"],
};

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Object} deps.getState estado corriente (selección).
 * @param {() => Array} deps.getSubjects catálogo activo.
 * @param {() => Array} deps.getConflicts conflictos detectados de la selección.
 * @param {Object} deps.dayLabels nombre de cada día.
 * @param {() => void} deps.onUpdateControlPanel el panel de control del generador (aviso y botón).
 * @returns {{renderConflicts: Function, renderSummary: Function, updateSummaryBar: Function, updateButtons: Function}}
 *   la vista.
 */
export function createSummaryView({ document, getState, getSubjects, getConflicts, dayLabels, onUpdateControlPanel }) {
  const el = (id) => document.getElementById(id);

  function renderConflicts() {
    const panel = el("conflicts-panel");
    const list = el("conflicts-list");
    if (!panel || !list) return;
    const conflicts = getConflicts();

    panel.classList.toggle("has-conflicts", conflicts.length > 0);

    if (conflicts.length === 0) {
      list.innerHTML = '<p class="empty-state">Sin conflictos.</p>';
      return;
    }

    let html = "";
    conflicts.forEach((c) => {
      html += `<div class="conflict-item">`;
      html += `<div class="conflict-icon">⚠</div>`;
      html += `<div class="conflict-details">`;
      html += `<strong>${c.nombre1}</strong> ${c.tipo1} `;
      html += `(<span>${dayLabels[c.dia]} ${c.inicio}-${c.fin}</span>) `;
      html += `se solapa con `;
      html += `<strong>${c.nombre2}</strong> ${c.tipo2}`;
      html += `</div></div>`;
    });

    list.innerHTML = html;
  }

  function renderSummary() {
    const state = getState();
    const content = el("summary-content");
    // La regla (créditos, horas y turno de la selección) vive en el dominio; aquí
    // solo se pinta.
    const summary = buildSelectionSummary(state.selectedSubjects, state.groupChoices, getSubjects());

    if (summary.count === 0) {
      content.innerHTML = '<p class="empty-state">Selecciona asignaturas para ver el resumen.</p>';
      return;
    }

    const subjects = getSubjects();
    const tags = summary.codes
      .filter((codigo) => subjects.some((s) => s.codigo === codigo))
      .map((codigo) => `<span class="summary-subject-tag">${codigo}</span>`);
    const turno = TURNO_BADGE[summary.turno];

    let html = `<div class="summary-grid">`;
    html += `<div class="summary-stat"><div class="stat-value">${summary.count}</div><div class="stat-label">Asignaturas</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${summary.credits}</div><div class="stat-label">Créditos ECTS</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${summary.hours.toFixed(1)}h</div><div class="stat-label">Horas/semana</div></div>`;
    html += `<div class="summary-stat"><div class="stat-value">${getConflicts().length}</div><div class="stat-label">Conflictos</div></div>`;
    html += `</div>`;

    if (turno) {
      html += `<div style="text-align:center;margin-bottom:0.8rem;"><span class="turno-badge ${turno[0]}">${turno[1]}</span></div>`;
    }

    html += `<div class="summary-subjects">${tags.join("")}</div>`;

    content.innerHTML = html;
  }

  function updateSummaryBar() {
    const state = getState();
    const summary = buildSelectionSummary(state.selectedSubjects, state.groupChoices, getSubjects());
    el("selected-count").textContent = summary.count;
    el("total-credits").textContent = summary.credits;

    const meta = el("credit-meta");
    meta.textContent = summary.credits >= 30 ? `(meta: 30 ✓)` : `(meta: 30)`;
    meta.classList.toggle("over", summary.credits > 30);
  }

  function updateButtons() {
    const state = getState();
    const hasSelection = Object.keys(state.selectedSubjects).some((c) => state.selectedSubjects[c]);

    el("btn-export").disabled = !hasSelection;
    el("btn-share").disabled = !hasSelection;
    onUpdateControlPanel();
  }

  return { renderConflicts, renderSummary, updateSummaryBar, updateButtons };
}

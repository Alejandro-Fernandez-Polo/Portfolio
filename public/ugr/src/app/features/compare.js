/**
 * Vista de la **comparación** de horarios de `/ugr`: marcar hasta cuatro
 * configuraciones guardadas y verlas lado a lado en mini-calendarios.
 *
 * Extraída del monolito. La marca (`compareIds`) sigue siendo del llamante
 * —vive también en el store para sobrevivir a una recarga— y la agenda de cada
 * configuración sale del dominio (`buildActiveSchedule`); aquí quedan la ventana,
 * el mini-calendario y el botón flotante.
 *
 * `document` es inyectable (el del IIFE; simulado en tests).
 */

import { buildActiveSchedule } from "../domain/calendar.js";
import { timeToMinutes } from "../domain/schedule.js";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Array} deps.getSubjects catálogo activo.
 * @param {() => Array} deps.getDisplayConfigs configuraciones comparables (guardadas + resultados del solver).
 * @param {() => Array<string>} deps.getCompareIds las marcadas para comparar.
 * @param {() => void} deps.onCompareChanged la marca ha cambiado (persistir y repintar la tabla).
 * @param {() => void} deps.onCompareDone la comparación se ha abierto (desmarcar y repintar).
 * @param {Object} deps.dayLabels nombre de cada día.
 * @param {Array<string>} deps.weekdays días laborables.
 * @param {number} deps.startHour hora inicial de la rejilla.
 * @param {number} deps.endHour hora final (exclusiva) de la rejilla.
 * @param {(codigo: string, letra: string) => ?} deps.getDificultad dificultad del grupo (o `null`).
 * @param {(d: ?) => string} deps.getDificultadLabel etiqueta de la dificultad.
 * @param {() => boolean} deps.isIgnoringDocents lee el modo «ignorar profesores».
 * @param {(entry: Object, mini: boolean) => string} deps.buildEventLabel etiqueta accesible de una sesión.
 * @returns {{setup: () => void, toggle: (id: string) => void, updateButton: () => void, open: (ids: Array) => void}}
 *   la vista.
 */
export function createCompareView({
  document,
  getSubjects,
  getDisplayConfigs,
  getCompareIds,
  onCompareChanged,
  onCompareDone,
  dayLabels,
  weekdays,
  startHour,
  endHour,
  getDificultad,
  getDificultadLabel,
  isIgnoringDocents,
  buildEventLabel,
}) {
  const el = (id) => document.getElementById(id);
  const MAX_COMPARAR = 4;

  /** La agenda de una configuración, sin tocar el estado de la pantalla. */
  function entriesFor(config) {
    return buildActiveSchedule(config.selectedSubjects, config.groupChoices, getSubjects());
  }

  function miniCalendar(container, entries) {
    let html = '<div class="cal-header"></div>';
    weekdays.forEach((d) => {
      html += `<div class="cal-header">${dayLabels[d]}</div>`;
    });
    for (let h = startHour; h < endHour; h++) {
      html += `<div class="cal-time">${h}:00</div>`;
      weekdays.forEach((dia) => {
        html += `<div class="cal-cell" data-dia="${dia}" data-hour="${h}"></div>`;
      });
    }
    container.innerHTML = html;

    entries.forEach((entry) => {
      const startMin = timeToMinutes(entry.inicio);
      const endMin = timeToMinutes(entry.fin);
      const startRow = Math.floor((startMin - startHour * 60) / 60);
      const topOffset = ((startMin - startHour * 60) % 60) / 60 * 100;
      const height = ((endMin - startMin) / 60) * 100;
      const cell = container.querySelector(`.cal-cell[data-dia="${entry.dia}"][data-hour="${startHour + startRow}"]`);
      if (!cell) return;
      const eventDiv = document.createElement("div");
      eventDiv.className = "cal-event";
      eventDiv.dataset.subject = entry.codigo;
      eventDiv.tabIndex = 0;
      eventDiv.setAttribute("role", "group");
      eventDiv.setAttribute("aria-label", buildEventLabel ? buildEventLabel(entry, false) : "");
      eventDiv.style.top = topOffset + "%";
      eventDiv.style.height = height + "%";
      eventDiv.innerHTML = `<div class="event-label">${entry.codigo}</div><div class="event-type">${entry.tipo}</div>`;
      if (entry.letra) {
        // Con «Ignorar profesores» tampoco se pinta el punto de dificultad en
        // las miniaturas: el modo es «no influye» **y** «no se muestra».
        const diff = isIgnoringDocents() ? null : getDificultad(entry.codigo, entry.letra);
        if (diff) {
          const dot = document.createElement("span");
          dot.className = `event-diff-dot mini diff-${diff}`;
          dot.title = getDificultadLabel(diff);
          eventDiv.appendChild(dot);
        }
      }
      cell.style.position = "relative";
      cell.appendChild(eventDiv);
    });
  }

  /** Marca o desmarca una configuración para comparar (máximo cuatro). */
  function toggle(id) {
    const ids = getCompareIds();
    const idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
    } else if (ids.length < MAX_COMPARAR) {
      ids.push(id);
    }
    // La marca se persiste con el empujón del llamante: sin él solo viviría en
    // memoria.
    onCompareChanged();
  }

  function updateButton() {
    const btn = el("btn-compare-floating");
    const countEl = el("compare-count");
    const marcadas = getCompareIds().length;
    if (marcadas >= 2) {
      btn.style.display = "flex";
      countEl.textContent = marcadas;
    } else {
      btn.style.display = "none";
    }
  }

  function open(ids) {
    const allConfigs = getDisplayConfigs();
    const configs = ids.map((id) => allConfigs.find((c) => c.id === id)).filter(Boolean);
    if (configs.length < 2) return;

    const container = el("compare-content");
    let html = `<div class="compare-grid">`;
    configs.forEach((cfg) => {
      html += `<div class="compare-side">`;
      html += `<div class="compare-label">${cfg.name}</div>`;
      html += `<div class="compare-calendar-wrap"><div class="compare-cal mini-calendar" data-cfg-id="${cfg.id}"></div></div>`;
      html += `</div>`;
    });
    html += "</div>";
    container.innerHTML = html;

    configs.forEach((cfg) => {
      const calEl = container.querySelector(`.compare-cal[data-cfg-id="${cfg.id}"]`);
      if (calEl) miniCalendar(calEl, entriesFor(cfg));
    });

    el("compare-modal").style.display = "flex";
  }

  function close() {
    el("compare-modal").style.display = "none";
  }

  /** La ventana y el botón flotante (que abre con lo marcado y lo desmarca). */
  function setup() {
    const closeBtn = el("compare-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", close);
    const modal = el("compare-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === e.currentTarget) close();
      });
    }
    const flotante = el("btn-compare-floating");
    if (flotante) {
      flotante.addEventListener("click", () => {
        if (getCompareIds().length >= 2) {
          open([...getCompareIds()]);
          onCompareDone();
        }
      });
    }
  }

  return { setup, toggle, updateButton, open };
}

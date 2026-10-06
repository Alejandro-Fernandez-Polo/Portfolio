/**
 * Vista del calendario: render de semana/lista, tooltip y controles de vista
 * (Bloque 3, rebanadas B3-c y B3-d).
 *
 * Réplica sin cambio de comportamiento de `renderCalendar`,
 * `renderCalendarList`, `getEntryTurno`, `getEntryDificultadLabel`,
 * `buildEventLabel`, `getBusyHours`, `showTooltip`, `hideTooltip`,
 * `getCalendarView`, `setCalendarView`, `setupCalendarViewToggle`,
 * `isCalendarCompact`, `applyCalendarCompact`, `setCalendarCompact` y
 * `setupCalendarCompactToggle` del monolito `public/ugr/app.js`, que ahora
 * delega aquí vía `import()` dinámico (`ensureCalendarViewFeature`).
 *
 * Nada de globals: el DOM, la ventana, la persistencia, el estado, el
 * catálogo, las entradas del horario, las constantes de rejilla
 * (`days`/`dayLabels`/`startHour`/`endHour` — se quedan en el IIFE porque
 * otras vistas las usan) y los helpers de dificultad/profesor llegan por
 * parámetro; los conflictos se leen del estado corriente vía `getConflicts`.
 * `buildConflictSet` y `timeToMinutes` NO se duplican: se importan del
 * dominio ESM (B3-a/T02.x), que es su única implementación.
 *
 * A diferencia de otros renders, los listeners de los toggles se enganchan a
 * botones estáticos del HTML (no reconstruidos por `innerHTML`), así que
 * re-montar `init()` SÍ los duplicaría: por eso `mount()`/`destroy()` son
 * idempotentes y guardan las referencias de handler para poder desenganchar.
 * Los listeners de tooltip, en cambio, se recrean con cada `render()` porque
 * viven en los `div.cal-event` que ese render reconstruye.
 */

import { buildConflictSet } from '../domain/calendar.js';
import { timeToMinutes } from '../domain/schedule.js';

/**
 * Crea la vista del calendario inyectada por `app.js`.
 *
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM (el del IIFE, simulado en tests).
 * @param {Window} deps.window ventana (viewport del tooltip).
 * @param {Storage} deps.storage persistencia (`window.localStorage` en prod).
 * @param {() => Object} deps.getState lee el objeto `state` corriente.
 * @param {() => Array} deps.getSubjects lee el catálogo `SUBJECTS` corriente.
 * @param {() => Array} deps.getConflicts lee el array `conflicts` corriente.
 * @param {() => Array} deps.getActiveSchedule entradas del horario activo.
 * @param {string[]} deps.days días laborables de la rejilla (legacy `DAYS`).
 * @param {Object} deps.dayLabels etiqueta por día (legacy `DAY_LABELS`).
 * @param {number} deps.startHour primera hora de la rejilla.
 * @param {number} deps.endHour hora final exclusiva de la rejilla.
 * @param {(codigo: string, letra: string) => ?} deps.getDificultad dificultad.
 * @param {(d: ?) => string} deps.getDificultadLabel etiqueta de dificultad.
 * @param {(d: ?) => string} deps.getDificultadColor color de dificultad.
 * @param {(codigo: string, letra: string) => string} deps.getProfName profesor.
 * @returns {{mount: () => void, destroy: () => void, getView: () => string,
 *   setView: (view: string) => void, applyView: () => void,
 *   isCompact: () => boolean, setCompact: (compact: boolean) => void,
 *   applyCompact: () => void, render: () => void, renderList: () => void,
 *   buildEventLabel: (entry: Object, isConflict: boolean) => string,
 *   getBusyHours: (entries: Array<Object>) => Set<number>}}
 */
export function createCalendarView({
  document,
  window,
  storage,
  getState,
  getSubjects,
  getConflicts,
  getActiveSchedule,
  days,
  dayLabels,
  startHour,
  endHour,
  getDificultad,
  getDificultadLabel,
  getDificultadColor,
  getProfName,
}) {
  let mounted = false;

  // Referencias vivas de los botones y de sus handlers: sin la MISMA función
  // que se pasó a `addEventListener`, `removeEventListener` no hace nada.
  let weekBtnEl = null;
  let listBtnEl = null;
  let compactBtnEl = null;
  let onWeekClick = null;
  let onListClick = null;
  let onCompactClick = null;

  /** Vista persistida: solo `'list'` desvía del legacy `'week'`. */
  function getView() {
    return storage.getItem('ugr-calendar-view') === 'list' ? 'list' : 'week';
  }

  /** Cambia y persiste la vista; cualquier valor ajeno a `'list'` es `'week'`. */
  function setView(view) {
    const next = view === 'list' ? 'list' : 'week';
    storage.setItem('ugr-calendar-view', next);
    applyView();
  }

  /**
   * Sincroniza `#calendar`/`#calendar-list` y el `aria-pressed` de los
   * toggles con la vista persistida. Sale sin tocar nada si falta algún nodo
   * (mismo guard que el legacy) y termina siempre re-aplicando el modo
   * compacto, que depende de la vista activa.
   */
  function applyView() {
    const cal = document.getElementById('calendar');
    const list = document.getElementById('calendar-list');
    const weekBtn = document.getElementById('btn-view-week');
    const listBtn = document.getElementById('btn-view-list');
    if (!cal || !list || !weekBtn || !listBtn) return;

    const isList = getView() === 'list';

    cal.hidden = isList;
    list.hidden = !isList;
    weekBtn.setAttribute('aria-pressed', String(!isList));
    listBtn.setAttribute('aria-pressed', String(isList));

    if (isList) renderList();
    applyCompact();
  }

  /** Modo compacto persistido (`'1'` = activo), igual que el legacy. */
  function isCompact() {
    return storage.getItem('ugr-calendar-compact') === '1';
  }

  /** Persiste el modo compacto y lo repinta. */
  function setCompact(compact) {
    storage.setItem('ugr-calendar-compact', compact ? '1' : '0');
    applyCompact();
  }

  /**
   * Aplica la clase `is-compact` y el estado del botón. El botón se oculta
   * en vista lista: en esa vista la rejilla no existe, no hay qué zoom-ear.
   */
  function applyCompact() {
    const cal = document.getElementById('calendar');
    const btn = document.getElementById('btn-view-compact');
    const compact = isCompact();
    if (cal) cal.classList.toggle('is-compact', compact);
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(compact));
    btn.hidden = getView() === 'list';
  }

  /**
   * Engancha los toggles y pinta el estado inicial. Idempotente: un segundo
   * `mount()` (p. ej. `init()` reiniciado desde consola) no añade listeners.
   * Los botones de semana/lista van en bloque (como el legacy: o los dos o
   * ninguno); el compacto es independiente.
   */
  function mount() {
    if (mounted) return;

    weekBtnEl = document.getElementById('btn-view-week');
    listBtnEl = document.getElementById('btn-view-list');
    compactBtnEl = document.getElementById('btn-view-compact');

    if (weekBtnEl && listBtnEl) {
      onWeekClick = () => setView('week');
      onListClick = () => setView('list');
      weekBtnEl.addEventListener('click', onWeekClick);
      listBtnEl.addEventListener('click', onListClick);
    }
    if (compactBtnEl) {
      onCompactClick = () => setCompact(!isCompact());
      compactBtnEl.addEventListener('click', onCompactClick);
    }

    mounted = true;
    applyView();
    applyCompact();
  }

  /** Desengancha todo; seguro de llamar varias veces y re-montable después. */
  function destroy() {
    if (!mounted) return;

    if (weekBtnEl && onWeekClick) weekBtnEl.removeEventListener('click', onWeekClick);
    if (listBtnEl && onListClick) listBtnEl.removeEventListener('click', onListClick);
    if (compactBtnEl && onCompactClick) compactBtnEl.removeEventListener('click', onCompactClick);

    weekBtnEl = null;
    listBtnEl = null;
    compactBtnEl = null;
    onWeekClick = null;
    onListClick = null;
    onCompactClick = null;
    mounted = false;
  }

  // ─── Etiquetas y ocupación (B3-d) ───────────────────────────

  /** Turno de la teoría elegida ('Mañana'/'Tarde'); '—' sin grupo o sujeto. */
  function getEntryTurno(entry) {
    const subject = getSubjects().find(s => s.codigo === entry.codigo);
    const choice = getState().groupChoices[entry.codigo];
    const group = subject && choice ? subject.grupos.find(g => g.letra === choice.teoria) : null;
    return group ? (group.turno === 'mañana' ? 'Mañana' : 'Tarde') : '—';
  }

  /** Dificultad del profesor del subgrupo elegido; '' sin letra o sin dato. */
  function getEntryDificultadLabel(entry) {
    if (!entry.letra) return '';
    const diff = getDificultad(entry.codigo, entry.letra);
    return diff ? getDificultadLabel(diff) : '';
  }

  /** `aria-label` accesible de un evento (rejilla y mini-calendarios). */
  function buildEventLabel(entry, isConflict) {
    const diffLabel = getEntryDificultadLabel(entry);
    return `${entry.codigo} — ${entry.tipo}, ${dayLabels[entry.dia].toLowerCase()} ${entry.inicio}–${entry.fin}, ${entry.grupo}` +
      `${diffLabel ? `, dificultad del profesor: ${diffLabel}` : ''}` +
      `${isConflict ? ', en conflicto: solape de horario' : ''}`;
  }

  /**
   * Horas (enteras) con al menos una sesión, para no pintar filas vacías.
   * Sesiones fuera de `days` o empezadas antes de `startHour` se ignoran
   * (mismo corte legacy: `startRow < 0` descarta la entrada entera).
   */
  function getBusyHours(entries) {
    const busy = new Set();
    entries.forEach(entry => {
      if (days.indexOf(entry.dia) === -1) return;
      const startMin = timeToMinutes(entry.inicio);
      const endMin = timeToMinutes(entry.fin);
      const startRow = Math.floor((startMin - startHour * 60) / 60);
      if (startRow < 0 || startRow > endHour - startHour - 1) return;
      const lastMin = Math.max(endMin, startMin + 1);
      for (let h = startHour + startRow; h < endHour && h * 60 < lastMin; h++) {
        busy.add(h);
      }
    });
    return busy;
  }

  // ─── Tooltip ────────────────────────────────────────────────

  /** Posiciona `#tooltip` junto al evento y lo muestra (con clamp de viewport). */
  function showTooltip(e, entry) {
    const tt = document.getElementById('tooltip');
    const prof = entry.letra ? getProfName(entry.codigo, entry.letra) : '';
    const diff = entry.letra ? getDificultad(entry.codigo, entry.letra) : null;
    const diffLabel = diff ? getDificultadLabel(diff) : '';
    const diffColor = diff ? getDificultadColor(diff) : '';
    tt.innerHTML = `
      <div class="tt-title">${entry.nombre}</div>
      <div>${entry.tipo} - ${entry.grupo}</div>
      <div>${dayLabels[entry.dia]} ${entry.inicio} - ${entry.fin}</div>
      ${prof ? `<div class="tt-prof">${prof}${diffLabel ? ` — <span style="color:${diffColor}">${diffLabel}</span>` : ''}</div>` : ''}
    `;
    tt.style.display = 'block';
    const rect = e.target.getBoundingClientRect();
    tt.style.left = (rect.right + 8) + 'px';
    tt.style.top = rect.top + 'px';

    // Keep within viewport
    const ttRect = tt.getBoundingClientRect();
    if (ttRect.right > window.innerWidth) {
      tt.style.left = (rect.left - ttRect.width - 8) + 'px';
    }
    if (ttRect.bottom > window.innerHeight) {
      tt.style.top = (window.innerHeight - ttRect.height - 8) + 'px';
    }
  }

  function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
  }

  // ─── Render semana ──────────────────────────────────────────

  /** Re-construye la rejilla `#calendar` y termina re-aplicando la vista. */
  function render() {
    const cal = document.getElementById('calendar');
    const entries = getActiveSchedule();
    const conflictSet = buildConflictSet(getConflicts());
    const busyHours = getBusyHours(entries);

    let html = '';

    // Header row
    html += `<div class="cal-header"></div>`;
    days.forEach(d => {
      html += `<div class="cal-header">${dayLabels[d]}</div>`;
    });

    // Time rows
    for (let h = startHour; h < endHour; h++) {
      const rowClass = busyHours.has(h) ? '' : ' cal-hour-empty';
      html += `<div class="cal-time${rowClass}">${h}:00</div>`;
      days.forEach(dia => {
        html += `<div class="cal-cell${rowClass}" data-dia="${dia}" data-hour="${h}"></div>`;
      });
    }

    cal.innerHTML = html;

    // Place events
    entries.forEach(entry => {
      const startMin = timeToMinutes(entry.inicio);
      const endMin = timeToMinutes(entry.fin);
      const dayIndex = days.indexOf(entry.dia);
      if (dayIndex === -1) return;

      const startRow = Math.floor((startMin - startHour * 60) / 60);
      const topOffset = ((startMin - startHour * 60) % 60) / 60 * 100;
      const height = ((endMin - startMin) / 60) * 100;

      const cellSelector = `.cal-cell[data-dia="${entry.dia}"][data-hour="${startHour + startRow}"]`;
      const cell = cal.querySelector(cellSelector);
      if (!cell) return;

      const isConflict = conflictSet.has(`${entry.codigo}-${entry.dia}-${entry.inicio}`);

      const eventDiv = document.createElement('div');
      eventDiv.className = `cal-event ${isConflict ? 'conflict' : ''}`;
      eventDiv.dataset.subject = entry.codigo;
      eventDiv.tabIndex = 0;
      eventDiv.setAttribute('role', 'group');
      eventDiv.setAttribute('aria-label', buildEventLabel(entry, isConflict));
      eventDiv.style.top = topOffset + '%';
      eventDiv.style.height = height + '%';
      eventDiv.innerHTML = `
        <div class="event-label">${entry.codigo}</div>
        <div class="event-type">${entry.tipo} ${entry.grupo}</div>
      `;

      if (entry.letra) {
        const diff = getDificultad(entry.codigo, entry.letra);
        if (diff) {
          const dot = document.createElement('span');
          dot.className = `event-diff-dot diff-${diff}`;
          dot.title = getDificultadLabel(diff);
          eventDiv.appendChild(dot);
        }
      }

      // Tooltip
      eventDiv.addEventListener('mouseenter', (e) => showTooltip(e, entry));
      eventDiv.addEventListener('mouseleave', hideTooltip);
      eventDiv.addEventListener('focus', (e) => showTooltip(e, entry));
      eventDiv.addEventListener('blur', hideTooltip);

      cell.style.position = 'relative';
      cell.appendChild(eventDiv);
    });

    applyView();
  }

  // ─── Render lista (fallback accesible) ──────────────────────

  /** Tablas por día en `#calendar-list`, con conflicto, turno y dificultad. */
  function renderList() {
    const listEl = document.getElementById('calendar-list');
    if (!listEl) return;

    const entries = getActiveSchedule();
    const conflictSet = buildConflictSet(getConflicts());

    let html = '<div class="cal-list">';

    days.forEach(dia => {
      const dayEntries = entries
        .filter(e => e.dia === dia)
        .sort((a, b) => timeToMinutes(a.inicio) - timeToMinutes(b.inicio));

      html += `<table class="cal-list-table">
        <caption>${dayLabels[dia]}</caption>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            <th scope="col">Asignatura</th>
            <th scope="col">Grupo</th>
            <th scope="col">Tipo</th>
            <th scope="col">Turno</th>
            <th scope="col">Dificultad del profesor</th>
          </tr>
        </thead>
        <tbody>`;

      if (dayEntries.length === 0) {
        html += `<tr class="cal-list-empty"><td colspan="6">Sin sesiones este día</td></tr>`;
      } else {
        dayEntries.forEach(entry => {
          const isConflict = conflictSet.has(`${entry.codigo}-${entry.dia}-${entry.inicio}`);
          const diffLabel = getEntryDificultadLabel(entry);
          html += `<tr${isConflict ? ' class="is-conflict"' : ''}>
            <th scope="row" class="cal-list-time">${entry.inicio}–${entry.fin}</th>
            <td class="cal-list-subject">
              <span class="cal-list-code">${entry.codigo}</span>
              <span class="cal-list-name">${entry.nombre}</span>
              ${isConflict ? '<span class="cal-list-tag">Conflicto</span>' : ''}
            </td>
            <td>${entry.grupo}</td>
            <td>${entry.tipo}</td>
            <td>${getEntryTurno(entry)}</td>
            <td>${diffLabel || '—'}</td>
          </tr>`;
        });
      }

      html += `</tbody></table>`;
    });

    html += '</div>';
    listEl.innerHTML = html;
  }

  return {
    mount,
    destroy,
    getView,
    setView,
    applyView,
    isCompact,
    setCompact,
    applyCompact,
    render,
    renderList,
    buildEventLabel,
    getBusyHours,
  };
}

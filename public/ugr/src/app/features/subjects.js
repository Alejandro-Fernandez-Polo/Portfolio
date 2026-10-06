/**
 * Vista/controlador de materias (Bloque 3, rebanada B3-b).
 *
 * Réplica sin cambio de comportamiento de `renderSubjects`, `toggleSubject`,
 * `initGroupChoice` y `applyGroupPreference` del monolito `public/ugr/app.js`,
 * que ahora delega aquí vía `import()` dinámico (`ensureSubjectsView`).
 *
 * Nada de globals: el DOM, el estado vivo, el catálogo, los conflictos y la
 * persistencia llegan por parámetro (thunks, para leer SIEMPRE el valor
 * corriente — `state` y `conflicts` se reasignan en el IIFE). Las reglas de
 * cálculo de grupo se importan del dominio puro `../domain/selection.js`; aquí
 * solo vive el guard de "ya existe" y la orquestación de renders.
 *
 * Los listeners se re-enganchan tras cada `innerHTML` (nodos nuevos cada
 * render), igual que el legacy: no hay riesgo de listeners duplicados.
 */
import { buildGroupChoice, applyTurnoPreference } from "../domain/selection.js";

/**
 * Crea la vista de materias inyectada por `app.js`.
 *
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM (el del IIFE, simulado en tests).
 * @param {() => Object} deps.getState lee el objeto `state` corriente.
 * @param {() => Array} deps.getSubjects lee el catálogo `SUBJECTS` corriente.
 * @param {() => Array} deps.getConflicts lee el array `conflicts` corriente.
 * @param {() => void} deps.saveState persiste (store/espejo) el estado.
 * @param {() => void} deps.updateAll re-renderiza el resto de vistas.
 * @returns {{render: () => void, toggleSubject: (codigo: string) => void,
 *   selectCourse: (curso: number, cuatrimestre: number) => void}}
 */
export function createSubjectsView({
  document,
  getState,
  getSubjects,
  getConflicts,
  saveState,
  updateAll,
}) {
  /**
   * Elección por defecto de una materia si aún no la tiene. El `null` de
   * `buildGroupChoice` (sin grupos) no se guarda: el legacy salía sin asignar
   * y no debe crearse una entrada `null` en el mapa.
   */
  function initGroupChoice(subject) {
    const state = getState();
    if (state.groupChoices[subject.codigo]) return;
    const choice = buildGroupChoice(subject);
    if (choice) state.groupChoices[subject.codigo] = choice;
  }

  /**
   * Aplica el turno preferente a la elección de la materia (mutación in
   * place); los no-ops (`indiferente`, sin elección) los resuelve el dominio.
   */
  function applyGroupPreference(subject) {
    const state = getState();
    applyTurnoPreference(
      state.groupChoices[subject.codigo],
      subject,
      state.turnoPreferente
    );
  }

  /** Alterna la selección de una materia; al marcar inicializa su grupo. */
  function toggleSubject(codigo) {
    const state = getState();
    const subject = getSubjects().find(s => s.codigo === codigo);
    const wasSelected = state.selectedSubjects[codigo];
    state.selectedSubjects[codigo] = !wasSelected;

    if (!wasSelected) {
      // Selecting: init group choice
      if (subject) {
        initGroupChoice(subject);
        applyGroupPreference(subject);
      }
    }

    saveState();
    updateAll();
  }

  /** Marca/desmarca todas las materias de un curso del cuatrimestre dado. */
  function selectCourse(curso, cuatrimestre) {
    const state = getState();
    const courseSubjects = getSubjects().filter(
      s => s.curso === curso && s.cuatrimestre === cuatrimestre
    );
    const allSelected = courseSubjects.every(s => state.selectedSubjects[s.codigo]);
    courseSubjects.forEach(s => {
      state.selectedSubjects[s.codigo] = !allSelected;
      if (!allSelected && !state.groupChoices[s.codigo]) {
        initGroupChoice(s);
      }
    });
    if (!allSelected) {
      courseSubjects.forEach(s => applyGroupPreference(s));
    }
    saveState();
    updateAll();
  }

  /** Pinta `subjects-container` con las materias del cuatrimestre activo. */
  function render() {
    const state = getState();
    const subjectsCatalog = getSubjects();
    const conflictsList = getConflicts();
    const container = document.getElementById('subjects-container');
    const cuat = state.cuatrimestreActivo;
    const subjects = subjectsCatalog.filter(s => s.cuatrimestre === cuat);

    // Group by course
    const byCourse = {};
    subjects.forEach(s => {
      if (!byCourse[s.curso]) byCourse[s.curso] = [];
      byCourse[s.curso].push(s);
    });

    const totalSubjects = subjectsCatalog.length;
    document.getElementById('total-subjects').textContent = totalSubjects;

    let html = '';
    [1, 2, 3, 4].forEach(curso => {
      const courseSubjects = byCourse[curso];
      if (!courseSubjects || !courseSubjects.length) return;

      html += `<div class="course-group">`;
      html += `<div class="course-group-header">`;
      html += `<h3>${curso}º Curso</h3>`;
      html += `<button class="btn-select-all" data-curso="${curso}" data-cuatrimestre="${cuat}">Seleccionar todo</button>`;
      html += `</div>`;
      html += `<div class="subjects-grid">`;

      courseSubjects.forEach(s => {
        const isSelected = state.selectedSubjects[s.codigo];
        const hasConflict = conflictsList.some(c => c.codigo1 === s.codigo || c.codigo2 === s.codigo);
        const isAprobada = !!s.aprobada;
        const cls = [
          'subject-card',
          isSelected ? 'selected' : '',
          hasConflict ? 'has-conflict' : '',
          isAprobada ? 'aprobada' : ''
        ].filter(Boolean).join(' ');

        html += `<div class="${cls}" data-codigo="${s.codigo}">`;
        if (isAprobada) {
          html += `<span class="badge-aprobada">Aprobada</span>`;
        }
        html += `<div class="check-indicator ${isSelected ? 'checked' : 'unchecked'}">${isSelected ? '✓' : ''}</div>`;
        html += `<div class="subject-code">${s.codigo}</div>`;
        html += `<div class="subject-name">${s.nombre}</div>`;
        if (isAprobada && s.corresponde) {
          html += `<div class="subject-corresponde">Convalida ${s.corresponde}</div>`;
        }
        html += `<div class="subject-credits">${s.creditos} ECTS</div>`;
        html += `</div>`;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;

    // Bind click events
    container.querySelectorAll('.subject-card').forEach(card => {
      card.addEventListener('click', () => {
        const codigo = card.dataset.codigo;
        toggleSubject(codigo);
      });
    });

    // Bind select all buttons
    container.querySelectorAll('.btn-select-all').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curso = parseInt(btn.dataset.curso);
        const cuatrimestre = parseInt(btn.dataset.cuatrimestre);
        selectCourse(curso, cuatrimestre);
      });
    });
  }

  return { render, toggleSubject, selectCourse };
}

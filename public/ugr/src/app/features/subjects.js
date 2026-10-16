/**
 * Vista/controlador de materias.
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
import { filterSubjectsByMention, mencionClave, mencionOptions } from "../domain/plan.js";

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
 * @param {() => Array} [deps.getMenciones] lee las menciones del catálogo (para
 *   el desplegable de mención).
 * @param {(clave: string) => string} [deps.getDificultadLabel] etiqueta de una
 *   dificultad (para el tooltip de los puntos de la asignatura).
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
  getMenciones,
  getDificultadLabel,
}) {
  /** Mención elegida en el desplegable: vacío es «todas». */
  let mencionElegida = "";

  /** Materias del catálogo que la mención elegida deja visibles. */
  function subjectsVisibles() {
    return filterSubjectsByMention(getSubjects(), mencionElegida);
  }

  /**
   * Pinta el desplegable de mención con lo que traiga el catálogo y conserva la
   * elegida si sigue existiendo. Sin menciones (catálogo sin plan) no se pinta.
   */
  function renderMencionSelect() {
    const select = document.getElementById("subjects-mencion");
    if (!select) return;
    const opciones = mencionOptions(getSubjects(), typeof getMenciones === "function" ? getMenciones() : []);
    select.innerHTML =
      '<option value="">Todas las menciones</option>' +
      opciones
        .map((o) => {
          const etiqueta = o.nombre ? `${o.codigo} — ${o.nombre}` : o.codigo;
          return `<option value="${o.codigo}">${etiqueta}</option>`;
        })
        .join("");
    select.value = opciones.some((o) => o.codigo === mencionElegida) ? mencionElegida : "";
    mencionElegida = select.value;
    select.hidden = opciones.length === 0;
    if (!select.dataset.mencionBound) {
      select.dataset.mencionBound = "1";
      select.addEventListener("change", () => {
        mencionElegida = select.value;
        render();
      });
    }
  }
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
    // Se **borra** la clave al desmarcar en vez de escribir `false`: una clave
    // falsa viaja al store y se queda en el userState guardado. Todo el código
    // filtra por veracidad, así que lo que se ve no cambia; lo que cambia es que
    // el estado no acumula claves muertas. `groupChoices` sí se conserva: es la
    // elección recordada de la materia (`initGroupChoice` respeta la que ya hay).
    if (wasSelected) delete state.selectedSubjects[codigo];
    else state.selectedSubjects[codigo] = true;

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

  /** Marca/desmarca todas las materias visibles de un curso del cuatrimestre. */
  function selectCourse(curso, cuatrimestre) {
    const state = getState();
    // Solo las visibles: con una mención elegida, «Seleccionar todo» no debe
    // marcar las que el filtro ha escondido.
    const courseSubjects = subjectsVisibles().filter(
      s => s.curso === curso && s.cuatrimestre === cuatrimestre
    );
    const allSelected = courseSubjects.every(s => state.selectedSubjects[s.codigo]);
    courseSubjects.forEach(s => {
      // Mismo criterio que en `toggleSubject`: sin claves `false`.
      if (allSelected) delete state.selectedSubjects[s.codigo];
      else state.selectedSubjects[s.codigo] = true;
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

  /**
   * Puntos de dificultad de la **asignatura** (T = teoría, P = prácticas), que
   * el catálogo guarda por modalidad. Solo se pintan si la trae (el archivo con
   * contraseña); el botón abre la ficha, donde están también las descripciones.
   */
  function subjectDiffHtml(subject) {
    const d = subject.dificultad;
    if (!d) return "";
    const items = [];
    if (d.teoria) items.push(["T", "Teoría", d.teoria]);
    if (d.practicas) items.push(["P", "Prácticas", d.practicas]);
    if (!items.length) return "";
    const etiqueta = (modalidad, clave) =>
      `${modalidad}: ${typeof getDificultadLabel === "function" ? getDificultadLabel(clave) : clave}`;
    return (
      `<button type="button" class="subject-diff" data-diff-codigo="${subject.codigo}"`
      + ` aria-label="Ver dificultad y descripción de ${subject.codigo}">`
      + items
        .map(
          ([sigla, modalidad, clave]) =>
            `<span class="subject-diff-item" title="${etiqueta(modalidad, clave)}">`
            + `<span class="subject-diff-dot diff-${clave}"></span>${sigla}</span>`,
        )
        .join("")
      + "</button>"
    );
  }

  /** Pinta `subjects-container` con las materias del cuatrimestre activo. */
  function render() {
    const state = getState();
    const subjectsCatalog = getSubjects();
    const conflictsList = getConflicts();
    const container = document.getElementById('subjects-container');
    const cuat = state.cuatrimestreActivo;
    renderMencionSelect();
    // El filtro de mención es el mismo que el de la lista de datos: elegir una
    // mención solo deja invisibles las asignaturas de las otras, nunca las
    // básicas ni las obligatorias comunes.
    const subjects = subjectsVisibles().filter(s => s.cuatrimestre === cuat);

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
        // La mención va en la clase (color de la tarjeta) y en una etiqueta con
        // su código: el color solo no basta para leerlo.
        const mencion = mencionClave(s);
        const cls = [
          'subject-card',
          `mencion-${mencion}`,
          isSelected ? 'selected' : '',
          hasConflict ? 'has-conflict' : '',
          isAprobada ? 'aprobada' : ''
        ].filter(Boolean).join(' ');

        html += `<div class="${cls}" data-codigo="${s.codigo}">`;
        if (isAprobada) {
          html += `<span class="badge-aprobada">Aprobada</span>`;
        }
        html += `<div class="check-indicator ${isSelected ? 'checked' : 'unchecked'}">${isSelected ? '✓' : ''}</div>`;
        // El tipo va primero (qué es la asignatura) y la mención después.
        const etiquetas = [];
        if (s.caracter) etiquetas.push(`<span class="subject-tipo">${s.caracter}</span>`);
        if (mencion !== 'comun') etiquetas.push(`<span class="subject-mencion">${s.mencion}</span>`);
        if (etiquetas.length) html += `<div class="subject-etiquetas">${etiquetas.join('')}</div>`;
        html += `<div class="subject-code">${s.codigo}</div>`;
        html += `<div class="subject-name">${s.nombre}</div>`;
        const diff = subjectDiffHtml(s);
        if (diff) html += diff;
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

    // Los puntos de dificultad de la asignatura abren su ficha; no deben
    // seleccionar la materia, así que frenan el clic de la tarjeta.
    container.querySelectorAll('.subject-diff').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent('ugr:openAsignatura', {
          detail: { codigo: btn.dataset.diffCodigo },
        }));
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

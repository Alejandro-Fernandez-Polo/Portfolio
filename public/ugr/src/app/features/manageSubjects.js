/**
 * Vista de **gestionar asignaturas**: la lista del catálogo activo, el modal de
 * alta y edición (con sus grupos, sesiones de teoría y subgrupos de práctica) y
 * el borrado.
 *
 * Es la extracción del bloque más acoplado que quedaba en el monolito: muta el
 * catálogo (`SUBJECTS`, **en sitio**, porque el resto de la app comparte esa
 * referencia), toca la selección del estado y pide al llamante que persista y
 * repinte. Aquí se decide **qué** se hace y **cómo se ve**; el almacenamiento y
 * el estado siguen siendo del llamante.
 *
 * Los datos del plan (carácter, mención) y las reglas de la lista vienen del
 * dominio; el estado del modal vive **aquí** (antes en un global de `window`).
 */

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Array} deps.getSubjects catálogo corriente (**mutable en sitio**).
 * @param {() => Object} deps.getState estado corriente de la app.
 * @param {() => Object} deps.getDomain reglas puras del dominio.
 * @param {() => Array} deps.getExtraSubjects asignaturas del plan sin horario.
 * @param {() => Array} deps.getMenciones menciones del catálogo activo.
 * @param {(texto: string) => string} deps.escape escapador de HTML.
 * @param {(mensaje: string, tipo: string) => void} deps.notify aviso al usuario.
 * @param {(mensaje: string) => boolean} deps.confirmFn confirmación.
 * @param {() => void} deps.persist persiste el catálogo (instantánea de materias).
 * @param {() => void} deps.onBoard vuelca el estado al store.
 * @param {() => void} deps.onChanged repinta el resto de vistas.
 * @param {(codigo: string, opener: HTMLElement|null) => void} deps.onOpenAsignatura
 *   abrir la ficha de la asignatura.
 * @param {string[]} deps.days días laborables del calendario.
 * @param {Object} deps.dayLabels etiqueta por día.
 * @returns {{render: () => void, setup: () => void}}
 */
export function createManageSubjectsView({
  document,
  getSubjects,
  getState,
  getDomain,
  getExtraSubjects,
  getMenciones,
  escape,
  notify,
  confirmFn,
  persist,
  onBoard,
  onChanged,
  onOpenAsignatura,
  days,
  dayLabels,
}) {
  /** Grupos que se están editando en el modal (antes, un global de `window`). */
  let modalGroups = [];

  const byId = (id) => document.getElementById(id);

  // ─── La lista ───────────────────────────────────────────────
  function render() {
    const container = byId("manage-subjects-container");
    if (!container) return;
    const select = byId("manage-subjects-mencion");
    // La lista es el plan entero: las asignaturas del catálogo (con horario, que
    // se editan aquí) y las del plan que la app no planifica, en modo lectura.
    const lista = getDomain().listPlanSubjects(getSubjects(), getExtraSubjects());
    const options = getDomain().mencionOptions(lista, getMenciones());
    const elegida = select ? select.value : "";

    // Las opciones se rehacen con el catálogo activo y se conserva la elegida si
    // sigue existiendo. Un catálogo sin plan no tiene menciones que ofrecer, así
    // que el desplegable no se pinta.
    if (select) {
      select.innerHTML =
        '<option value="">Todas las menciones</option>' +
        options
          .map((o) => {
            const etiqueta = o.nombre ? `${o.codigo} — ${o.nombre}` : o.codigo;
            return `<option value="${escape(o.codigo)}">${escape(etiqueta)}</option>`;
          })
          .join("");
      select.value = options.some((o) => o.codigo === elegida) ? elegida : "";
      select.hidden = options.length === 0;
    }

    const visibles = getDomain().filterSubjectsByMention(lista, select ? select.value : "");

    let html = '<div class="manage-table-wrapper"><table class="manage-table">';
    html += "<thead><tr>";
    html += "<th>Nombre</th><th>Tipo</th><th>Curso</th><th>Cuat.</th><th>ECTS</th><th>Grupos</th><th>Acciones</th>";
    html += "</tr></thead><tbody>";

    visibles.forEach((s) => {
      const tipo = getDomain().tipoDeAsignatura(s);
      const clave = getDomain().tipoClave(s);
      html += "<tr>";
      html += `<td><button type="button" class="ficha-name-btn" data-ficha-codigo="${escape(s.codigo)}">${escape(s.nombre)}</button></td>`;
      html += `<td class="td-tipo${clave ? ` td-tipo-${clave}` : ""}">${tipo ? escape(tipo) : '<span class="td-tipo-vacio">—</span>'}</td>`;
      html += `<td>${s.curso}º</td>`;
      html += `<td>${s.cuatrimestre}</td>`;
      // Las del plan sin horario no traen ECTS ni grupos, y no se editan aquí:
      // no están en el catálogo con el que se resuelven los horarios.
      html += `<td>${s.enCatalogo ? s.creditos : '<span class="td-tipo-vacio">—</span>'}</td>`;
      html += `<td>${s.enCatalogo ? s.grupos.length : '<span class="td-tipo-vacio">—</span>'}</td>`;
      html += '<td class="td-actions">';
      if (s.enCatalogo) {
        html += `<button class="btn btn-sm btn-secondary" data-action="edit" data-codigo="${s.codigo}">Editar</button> `;
        html += `<button class="btn btn-sm btn-danger" data-action="delete" data-codigo="${s.codigo}">Eliminar</button>`;
      } else {
        html += '<span class="td-solo-plan" title="Asignatura del plan sin horario: no entra en los horarios, así que no se edita aquí">Solo plan</span>';
      }
      html += "</td></tr>";
    });

    html += "</tbody></table></div>";
    container.innerHTML = html;

    container.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const codigo = btn.dataset.codigo;
        if (btn.dataset.action === "edit") openEdit(codigo);
        else if (btn.dataset.action === "delete") remove(codigo);
      });
    });

    // El nombre abre la ficha de la asignatura (dificultad y descripción del
    // plan). Las del plan sin horario también la tienen si el catálogo la trae.
    container.querySelectorAll("[data-ficha-codigo]").forEach((btn) => {
      btn.addEventListener("click", () => onOpenAsignatura(btn.dataset.fichaCodigo, btn));
    });
  }

  // ─── El modal ───────────────────────────────────────────────
  function openAdd() {
    byId("modal-title").textContent = "Nueva Asignatura";
    byId("modal-edit-codigo").value = "";
    byId("modal-codigo").value = "";
    byId("modal-nombre").value = "";
    byId("modal-curso").value = "1";
    byId("modal-cuatrimestre").value = "1";
    byId("modal-creditos").value = "6";
    byId("modal-aprobada").checked = false;
    byId("modal-corresponde").value = "";
    byId("modal-codigo").disabled = false;

    modalGroups = [];
    renderGroups();

    byId("subject-modal").style.display = "flex";
  }

  function openEdit(codigo) {
    const subject = getSubjects().find((s) => s.codigo === codigo);
    if (!subject) return;

    byId("modal-title").textContent = "Editar Asignatura";
    byId("modal-edit-codigo").value = codigo;
    byId("modal-codigo").value = codigo;
    byId("modal-nombre").value = subject.nombre;
    byId("modal-curso").value = subject.curso;
    byId("modal-cuatrimestre").value = subject.cuatrimestre;
    byId("modal-creditos").value = subject.creditos;
    byId("modal-aprobada").checked = !!subject.aprobada;
    byId("modal-corresponde").value = subject.corresponde || "";
    byId("modal-codigo").disabled = true;

    modalGroups = JSON.parse(JSON.stringify(subject.grupos));
    renderGroups();

    byId("subject-modal").style.display = "flex";
  }

  function close() {
    byId("subject-modal").style.display = "none";
  }

  /** Guarda lo que hay en el modal: alta o edición, con sus validaciones. */
  function save() {
    const editCodigo = byId("modal-edit-codigo").value;
    const codigo = byId("modal-codigo").value.trim().toUpperCase();
    const nombre = byId("modal-nombre").value.trim();
    const curso = parseInt(byId("modal-curso").value);
    const cuatrimestre = parseInt(byId("modal-cuatrimestre").value);
    const creditos = parseInt(byId("modal-creditos").value);

    if (!codigo) {
      notify("Introduce un código", "error");
      return;
    }
    if (!nombre) {
      notify("Introduce un nombre", "error");
      return;
    }
    if (!creditos || creditos < 1) {
      notify("Créditos no válidos", "error");
      return;
    }

    const subjects = getSubjects();
    const isNew = !editCodigo;
    if (isNew) {
      if (subjects.find((s) => s.codigo === codigo)) {
        notify("Ya existe una asignatura con ese código", "error");
        return;
      }
    }

    const grupos = modalGroups.map((g) => {
      const practicas = { subgrupos: [] };
      (g.practicas.subgrupos || []).forEach((sub) => {
        practicas.subgrupos.push(sub);
        practicas[sub] = g.practicas[sub] || [];
      });
      return { letra: g.letra, turno: g.turno, teoria: g.teoria || [], practicas };
    });

    const aprobada = byId("modal-aprobada").checked;
    const corresponde = byId("modal-corresponde").value.trim();

    const subjectData = { codigo, nombre, curso, cuatrimestre, creditos, grupos };
    if (aprobada) {
      subjectData.aprobada = true;
      if (corresponde) subjectData.corresponde = corresponde;
    }

    const state = getState();
    if (isNew) {
      subjects.push(subjectData);
    } else {
      const idx = subjects.findIndex((s) => s.codigo === editCodigo);
      if (idx !== -1) {
        // Si el código cambiara, la selección vieja se quedaría apuntando a una
        // asignatura que ya no existe.
        if (editCodigo !== codigo) {
          delete state.selectedSubjects[editCodigo];
          delete state.groupChoices[editCodigo];
        }
        subjects[idx] = subjectData;
      }
    }

    persist();
    onBoard();
    close();
    render();
    onChanged();
    notify(isNew ? `"${codigo}" creada` : `"${codigo}" actualizada`, "success");
  }

  /** Borra una asignatura del catálogo, con confirmación y limpiando su selección. */
  function remove(codigo) {
    const subjects = getSubjects();
    const subject = subjects.find((s) => s.codigo === codigo);
    if (!subject) return;
    if (!confirmFn(`¿Eliminar "${subject.nombre}" (${subject.codigo})?`)) return;

    const idx = subjects.findIndex((s) => s.codigo === codigo);
    if (idx !== -1) subjects.splice(idx, 1);

    const state = getState();
    delete state.selectedSubjects[codigo];
    delete state.groupChoices[codigo];
    persist();
    onBoard();
    render();
    onChanged();
    notify(`"${subject.codigo}" eliminada`, "success");
  }

  // ─── Los grupos dentro del modal ────────────────────────────
  function addGroup() {
    const usedLetters = modalGroups.map((g) => g.letra);
    const nextLetter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !usedLetters.includes(l));
    if (!nextLetter) {
      notify("Máximo 26 grupos", "error");
      return;
    }
    modalGroups.push({ letra: nextLetter, turno: "mañana", teoria: [], practicas: { subgrupos: [] } });
    renderGroups();
  }

  function removeGroup(index) {
    modalGroups.splice(index, 1);
    renderGroups();
  }

  function renderGroups() {
    const container = byId("modal-groups-container");
    if (!container) return;

    if (modalGroups.length === 0) {
      container.innerHTML = '<p class="empty-state">Sin grupos. Añade uno para empezar.</p>';
      return;
    }

    let html = "";
    modalGroups.forEach((g, gi) => {
      html += '<div class="modal-group-item">';
      html += '<div class="modal-group-header">';
      html += `<span class="modal-group-title">Grupo ${g.letra}</span>`;
      html += `<button class="btn btn-sm btn-danger" data-gi="${gi}">Eliminar</button>`;
      html += "</div>";

      html += '<div class="form-row">';
      html += '<div class="form-field">';
      html += "<label>Turno</label>";
      html += `<select data-gi="${gi}" data-field="turno">`;
      html += `<option value="mañana" ${g.turno === "mañana" ? "selected" : ""}>Mañana</option>`;
      html += `<option value="tarde" ${g.turno === "tarde" ? "selected" : ""}>Tarde</option>`;
      html += "</select></div>";
      html += "</div>";

      html += '<div class="form-field">';
      html += "<label>Horarios Teoría</label>";
      html += `<div class="modal-sessions" data-gi="${gi}" data-type="teoria">`;
      (g.teoria || []).forEach((s, si) => {
        html += '<div class="modal-session-row">';
        html += `<select data-gi="${gi}" data-type="teoria" data-si="${si}" data-field="dia">`;
        days.forEach((d) => {
          html += `<option value="${d}" ${s.dia === d ? "selected" : ""}>${dayLabels[d]}</option>`;
        });
        html += "</select>";
        html += `<input type="time" value="${s.inicio}" data-gi="${gi}" data-type="teoria" data-si="${si}" data-field="inicio">`;
        html += "<span>-</span>";
        html += `<input type="time" value="${s.fin}" data-gi="${gi}" data-type="teoria" data-si="${si}" data-field="fin">`;
        html += `<button class="btn btn-sm btn-danger" data-gi="${gi}" data-type="teoria" data-si="${si}">X</button>`;
        html += "</div>";
      });
      html += `<button class="btn btn-sm btn-secondary" data-gi="${gi}" data-add="teoria">+ Añadir</button>`;
      html += "</div>";

      html += '<div class="form-field">';
      html += "<label>Subgrupos de Práctica</label>";
      const subs = g.practicas.subgrupos || [];
      if (subs.length > 0) {
        subs.forEach((sub) => {
          html += '<div class="modal-subgroup">';
          html += `<div class="modal-subgroup-header"><strong>${sub}</strong></div>`;
          html += `<div class="modal-sessions" data-gi="${gi}" data-sub="${sub}">`;
          (g.practicas[sub] || []).forEach((s, si) => {
            html += '<div class="modal-session-row">';
            html += `<select data-gi="${gi}" data-sub="${sub}" data-si="${si}" data-field="dia">`;
            days.forEach((d) => {
              html += `<option value="${d}" ${s.dia === d ? "selected" : ""}>${dayLabels[d]}</option>`;
            });
            html += "</select>";
            html += `<input type="time" value="${s.inicio}" data-gi="${gi}" data-sub="${sub}" data-si="${si}" data-field="inicio">`;
            html += "<span>-</span>";
            html += `<input type="time" value="${s.fin}" data-gi="${gi}" data-sub="${sub}" data-si="${si}" data-field="fin">`;
            html += `<button class="btn btn-sm btn-danger" data-gi="${gi}" data-sub="${sub}" data-si="${si}">X</button>`;
            html += "</div>";
          });
          html += "</div>";
        });
      } else {
        html += '<p class="text-muted">Sin subgrupos definidos.</p>';
      }
      html += `<button class="btn btn-sm btn-secondary" data-gi="${gi}" data-add="subgrupo">+ Añadir Subgrupo</button>`;
      html += "</div>";

      html += "</div>";
    });

    container.innerHTML = html;

    container.querySelectorAll('[data-gi][data-field="turno"]').forEach((sel) => {
      sel.addEventListener("change", () => {
        modalGroups[parseInt(sel.dataset.gi)].turno = sel.value;
      });
    });

    container.querySelectorAll("button[data-gi]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const gi = parseInt(btn.dataset.gi);
        if (btn.dataset.add === "teoria") {
          modalGroups[gi].teoria.push({ dia: "lunes", inicio: "08:00", fin: "09:00" });
          renderGroups();
        } else if (btn.dataset.add === "subgrupo") {
          const subs = modalGroups[gi].practicas.subgrupos;
          const subName = modalGroups[gi].letra + (subs.length + 1);
          subs.push(subName);
          modalGroups[gi].practicas[subName] = [];
          renderGroups();
        } else if (!btn.dataset.add && !btn.dataset.si && btn.dataset.si !== "0") {
          removeGroup(gi);
        }
      });
    });

    container.querySelectorAll('[data-field="dia"], [data-field="inicio"], [data-field="fin"]').forEach((input) => {
      input.addEventListener("change", () => {
        const gi = parseInt(input.dataset.gi);
        const field = input.dataset.field;
        const si = parseInt(input.dataset.si);
        if (input.dataset.sub) {
          modalGroups[gi].practicas[input.dataset.sub][si][field] = input.value;
        } else {
          modalGroups[gi][input.dataset.type][si][field] = input.value;
        }
      });
    });

    container.querySelectorAll("button[data-si]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const gi = parseInt(btn.dataset.gi);
        const si = parseInt(btn.dataset.si);
        if (btn.dataset.sub) {
          modalGroups[gi].practicas[btn.dataset.sub].splice(si, 1);
        } else {
          modalGroups[gi][btn.dataset.type].splice(si, 1);
        }
        renderGroups();
      });
    });
  }

  /** Monta el bloque: el botón de alta, el pie del modal y el añadir grupo. */
  function setup() {
    const add = byId("btn-add-subject");
    if (add && !add.dataset.manageBound) {
      add.dataset.manageBound = "1";
      add.addEventListener("click", openAdd);
    }
    const closeBtn = byId("modal-close");
    if (closeBtn && !closeBtn.dataset.manageBound) {
      closeBtn.dataset.manageBound = "1";
      closeBtn.addEventListener("click", close);
    }
    const cancel = byId("modal-cancel");
    if (cancel && !cancel.dataset.manageBound) {
      cancel.dataset.manageBound = "1";
      cancel.addEventListener("click", close);
    }
    const saveBtn = byId("modal-save");
    if (saveBtn && !saveBtn.dataset.manageBound) {
      saveBtn.dataset.manageBound = "1";
      saveBtn.addEventListener("click", save);
    }
    const addGroupBtn = byId("btn-add-group");
    if (addGroupBtn && !addGroupBtn.dataset.manageBound) {
      addGroupBtn.dataset.manageBound = "1";
      addGroupBtn.addEventListener("click", addGroup);
    }
    const modal = byId("subject-modal");
    if (modal && !modal.dataset.manageBound) {
      modal.dataset.manageBound = "1";
      modal.addEventListener("click", (e) => {
        if (e.target.id === "subject-modal") close();
      });
    }
  }

  return { render, setup };
}

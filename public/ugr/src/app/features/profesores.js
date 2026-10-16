/**
 * Vista de la pestaña **Profesores** de `/ugr`: el listado del claustro, la ficha
 * de un profesor y las valoraciones propias.
 *
 * Extraída del monolito. Las reglas son del dominio (`app/domain/profesor.js`
 * para la ficha y el listado, `app/domain/profesores-propios.js` para la forma de
 * una valoración, su lectura y el prompt) y el guardado va a la tabla `reviews`
 * del store; aquí quedan el DOM y el estado de la pantalla —qué ficha está
 * abierta y qué valoración se está editando—.
 *
 * Lo que **no** es suyo: el índice de docentes y perfiles (`profesoresByKey`,
 * `docentesByKey`), que el monolito rehace al cambiar de catálogo y que también
 * leen el panel de grupos y el generador. Por eso entran por getter, junto con la
 * caché de valoraciones, y el repintado del resto de la app es un intent.
 *
 * `document` y `window` son inyectables (los del IIFE; simulados en tests).
 */

import { buildProfesorFicha, listProfesores } from "../domain/profesor.js";
import {
  DIFICULTAD_OPCIONES,
  buildProfesorPrompt,
  normalizeOwnReview,
  ownReviewsToJSON,
  parseOwnReviewsJSON,
} from "../domain/profesores-propios.js";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {Window} deps.window ventana (portapapeles).
 * @param {() => Array} deps.getSubjects catálogo activo (cambia al importar uno).
 * @param {() => Array} deps.getProfesores perfiles fusionados que lee el render.
 * @param {() => Array} deps.getOwnReviews caché de la tabla `reviews`.
 * @param {() => Promise<void>} deps.reloadOwnReviews recarga esa caché y rehace el índice.
 * @param {(reviews: Array) => Promise<Object|null>} deps.saveReviews guarda (null si no hay almacén).
 * @param {(clave: string) => Promise<Object|null>} deps.deleteReview borra una valoración (null si no hay almacén).
 * @param {(activado: boolean) => void} deps.onToggleIgnoreDocents el mismo interruptor que el generador.
 * @param {(d: ?) => string} deps.dificultadBadgeHtml insignia de dificultad (la comparte la ficha de asignatura).
 * @param {(texto: string) => string} deps.escape escapador de HTML.
 * @param {(data: Object, filename: string) => void} deps.download descarga JSON.
 * @param {(mensaje: string) => boolean} deps.confirmFn confirmación (borrado).
 * @param {() => void} deps.onChanged lo que hace el monolito tras cambiar una valoración.
 * @returns {Object} la vista montada.
 */
export function createProfesoresView({
  document,
  window,
  getSubjects,
  getProfesores,
  getOwnReviews,
  reloadOwnReviews,
  saveReviews,
  deleteReview,
  onToggleIgnoreDocents,
  syncIgnoreDocentsInputs,
  dificultadBadgeHtml,
  escape,
  download,
  confirmFn,
  onChanged,
}) {
  /** Botón que abrió la ficha, para devolverle el foco al cerrar. */
  let fichaOpener = null;
  /** Clave de la valoración que se está editando en el formulario ('' = alta). */
  let editingReviewKey = "";

  const el = (id) => document.getElementById(id);

  /**
   * Vuelve a encontrar el botón que abrió la ficha: mismo nombre y, si se abrió
   * desde un grupo, misma asignatura y modalidad. El listado de profesores no
   * lleva asignatura, así que ahí basta el nombre.
   */
  function findProfesorButton(name, subjectCode, modalidad) {
    for (const btn of document.querySelectorAll(".prof-name-btn")) {
      if (btn.dataset.profName !== name) continue;
      if (subjectCode && btn.dataset.profCodigo !== subjectCode) continue;
      if (modalidad && btn.dataset.profModalidad !== modalidad) continue;
      return btn;
    }
    return null;
  }

  function profesorModalEls() {
    return {
      modal: el("profesor-modal"),
      title: el("profesor-modal-title"),
      body: el("profesor-modal-body"),
      close: el("profesor-modal-close"),
    };
  }

  /** Una entrada de la ficha: el profesor en una asignatura y una modalidad. */
  function fichaEntryHtml(entry) {
    const dec = entry.highlighted ? " is-focus" : "";
    let html = `<article class="profesor-ficha-entry${dec}">`;
    html += '<div class="profesor-ficha-head">';
    // Una valoración sin asignatura no tiene código ni modalidad que enseñar.
    if (entry.subjectCode) {
      html += `<span class="profesor-ficha-code">${escape(entry.subjectCode)}</span>`;
    }
    if (entry.nombreAsignatura) {
      html += `<span class="profesor-ficha-subject">${escape(entry.nombreAsignatura)}</span>`;
    }
    if (entry.modalidad) {
      html += `<span class="profesor-ficha-modalidad">${escape(entry.modalidad)}</span>`;
    }
    html += dificultadBadgeHtml(entry.dificultad);
    if (entry.propio) {
      html += '<span class="prof-own-badge">tuya</span>';
    }
    if (entry.cruzada) {
      html += '<span class="profesor-ficha-flag" title="Acumula más de una opinión en la hoja">cruzada</span>';
    }
    html += "</div>";
    const plan = [entry.caracter, entry.mencion ? `Mención ${entry.mencion}` : ""].filter(Boolean).join(" · ");
    if (plan) html += `<div class="profesor-ficha-plan">${escape(plan)}</div>`;
    if (entry.razon) html += `<p class="profesor-ficha-razon">${escape(entry.razon)}</p>`;
    entry.opinions.forEach((text) => {
      html += `<p class="profesor-ficha-opinion">${escape(text)}</p>`;
    });
    if (entry.comentarios.length) {
      html += '<ul class="profesor-ficha-comentarios">';
      entry.comentarios.forEach((comentario) => {
        const meta = [comentario.fecha, comentario.campo].filter(Boolean).join(" · ");
        html += "<li>";
        if (meta) html += `<span class="profesor-ficha-comentario-meta">${escape(meta)}</span>`;
        html += `<span class="profesor-ficha-comentario-texto">${escape(comentario.texto)}</span>`;
        html += "</li>";
      });
      html += "</ul>";
    }
    if (!entry.razon && entry.opinions.length === 0 && entry.comentarios.length === 0) {
      html += '<p class="profesor-ficha-vacio">Sin opiniones ni comentarios.</p>';
    }
    html += "</article>";
    return html;
  }

  /**
   * Abre la ficha de un profesor. `focus` es la entrada pulsada (asignatura y
   * modalidad) y `opener` el botón, para devolverle el foco al cerrar. Desde el
   * listado de profesores no hay foco: no se resalta ninguna asignatura.
   */
  function openProfesorFicha(name, focus, opener) {
    const els = profesorModalEls();
    if (!els.modal || !els.title || !els.body || !name) return;
    const ficha = buildProfesorFicha(getProfesores(), getSubjects(), name, focus || null);
    if (!ficha.entries.length) return;
    els.title.textContent = ficha.name;
    els.body.innerHTML = `<div class="profesor-ficha">${ficha.entries.map(fichaEntryHtml).join("")}</div>`;
    fichaOpener = {
      name,
      subjectCode: (focus && focus.subjectCode) || "",
      modalidad: (focus && focus.modalidad) || "",
      element: opener || null,
    };
    els.modal.hidden = false;
    if (els.close) els.close.focus();
  }

  function closeProfesorFicha() {
    const els = profesorModalEls();
    if (!els.modal || els.modal.hidden) return;
    els.modal.hidden = true;
    // El foco vuelve a quien abrió la ficha, siempre que siga en el documento:
    // los paneles se repintan enteros, así que el botón puede haber muerto.
    const opener = fichaOpener;
    fichaOpener = null;
    if (!opener) return;
    // El panel se repinta entero ante cualquier cambio del estado, así que el
    // nodo que abrió la ficha puede estar muerto: si lo está, se busca por sus
    // datos en la pantalla (mismo nombre y misma entrada) en vez de rendirse.
    const vivo = opener.element && document.contains(opener.element)
      ? opener.element
      : findProfesorButton(opener.name, opener.subjectCode, opener.modalidad);
    if (vivo && typeof vivo.focus === "function") vivo.focus();
  }

  /** Aviso bajo la barra de acciones de la pestaña de profesores. */
  function setStatus(message, isError) {
    const status = el("profesores-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", !!isError);
  }

  /**
   * Acciones de una fila del claustro. Solo las valoraciones **propias** se
   * pueden editar o borrar, y cada una lleva su destino delante (asignatura y
   * modalidad, o «Sin asignatura») porque un mismo nombre puede tener varias.
   */
  function ownRowActionsHtml(row) {
    if (!row.ownKeys.length) return "—";
    return row.ownKeys
      .map((key) => {
        const parts = key.includes("|") ? key.split("|") : [];
        const destino = parts[0] ? `${parts[0]}${parts[1] === "Prácticas" ? " (P)" : ""}` : "Sin asignatura";
        return '<span class="prof-row-actions">' +
          `<span class="prof-own-badge">${escape(destino)}</span>` +
          `<button type="button" class="btn btn-sm btn-secondary" data-edit-prof="${escape(key)}">Editar</button>` +
          `<button type="button" class="btn btn-sm btn-danger" data-delete-prof="${escape(key)}">Borrar</button>` +
          "</span>";
      })
      .join(" ");
  }

  /** Listado del claustro de la pestaña de datos, con su buscador. */
  function renderList() {
    syncIgnoreDocentsInputs();
    const container = el("profesores-container");
    if (!container) return;
    const search = el("profesores-search");
    const rows = listProfesores(getProfesores(), { query: search ? search.value : "" });

    if (rows.length === 0) {
      container.innerHTML = '<p class="profesores-vacio">Ningún profesor coincide con la búsqueda.</p>';
      return;
    }

    let html = '<p class="profesores-hint">Un profesor tiene una valoración <strong>por asignatura y modalidad</strong>. Los nombres del horario salen de las <strong>guías oficiales</strong> de la ETSIIT; si alguno no está en esta lista es que todavía no tiene valoración. Las marcadas como <strong>tuya</strong> las has añadido tú y <strong>mandan sobre el catálogo</strong>: cambian la insignia del horario y el peso del generador.</p>';
    html += '<div class="manage-table-wrapper"><table class="manage-table profesores-table">';
    html += "<thead><tr><th>Profesor</th><th>Asignaturas</th><th>Dificultad</th><th>Acciones</th></tr></thead><tbody>";
    rows.forEach((row) => {
      const asignaturas = row.asignaturas.map((a) => (a.modalidad === "Prácticas" ? `${a.code} (P)` : a.code)).join(", ") || "—";
      const insignias = row.dificultades.map(dificultadBadgeHtml).join(" ") || "—";
      html += "<tr>";
      html += `<td><button type="button" class="prof-name-btn" data-prof-name="${escape(row.name)}">${escape(row.name)}</button></td>`;
      html += `<td class="profesores-asignaturas">${escape(asignaturas)}</td>`;
      html += `<td>${insignias}</td>`;
      html += `<td class="td-actions">${ownRowActionsHtml(row)}</td>`;
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    container.innerHTML = html;
  }

  // ─── Formulario de la valoración propia ─────────────────────

  function formEls() {
    return {
      modal: el("profesor-form-modal"),
      title: el("profesor-form-title"),
      name: el("profesor-form-name"),
      subject: el("profesor-form-subject"),
      modalidad: el("profesor-form-modalidad"),
      dificultad: el("profesor-form-dificultad"),
      opinions: el("profesor-form-opinions"),
      error: el("profesor-form-error"),
      del: el("profesor-form-delete"),
      save: el("profesor-form-save"),
      cancel: el("profesor-form-cancel"),
      close: el("profesor-form-close"),
    };
  }

  function showFormError(message) {
    const aviso = el("profesor-form-error");
    if (!aviso) return;
    aviso.textContent = message;
    aviso.hidden = false;
  }

  function hideFormError() {
    const aviso = el("profesor-form-error");
    if (!aviso) return;
    aviso.textContent = "";
    aviso.hidden = true;
  }

  /**
   * Rellena los dos desplegables del formulario con el catálogo **activo**: la
   * escala de dificultad del dominio y las asignaturas de esta sesión (que
   * cambian al importar otro catálogo).
   */
  function fillFormOptions() {
    const els = formEls();
    if (els.dificultad) {
      els.dificultad.innerHTML = '<option value="">Sin valoración</option>' +
        DIFICULTAD_OPCIONES.map((o) => `<option value="${o.key}">${escape(o.label)}</option>`).join("");
    }
    if (els.subject) {
      els.subject.innerHTML = '<option value="">Sin asignatura</option>' +
        getSubjects()
          .map((s) => `<option value="${escape(s.codigo)}">${escape(s.codigo)} — ${escape(s.nombre)}</option>`)
          .join("");
    }
  }

  /** Abre el formulario. Sin clave es un alta; con clave, la edición de esa. */
  function openForm(docentKey) {
    const els = formEls();
    if (!els.modal) return;
    fillFormOptions();
    const review = docentKey ? getOwnReviews().find((r) => r.docentKey === docentKey) : null;
    editingReviewKey = review ? review.docentKey : "";
    els.title.textContent = review ? "Editar profesor" : "Añadir profesor";
    els.name.value = review ? review.name : "";
    els.subject.value = review ? review.subjectCode || "" : "";
    els.modalidad.value = review && review.modalidad ? review.modalidad : "Teoría";
    els.dificultad.value = review && review.dificultad ? review.dificultad : "";
    els.opinions.value = review && Array.isArray(review.opinions) ? review.opinions.join("\n") : "";
    // La modalidad solo tiene sentido con asignatura: sin ella no hay terna que
    // sustituir y la valoración queda suelta.
    els.modalidad.disabled = !els.subject.value;
    if (els.del) els.del.hidden = !review;
    hideFormError();
    els.modal.hidden = false;
    if (els.name) els.name.focus();
  }

  function closeForm() {
    const els = formEls();
    if (!els.modal || els.modal.hidden) return;
    els.modal.hidden = true;
    editingReviewKey = "";
  }

  /** Guarda lo que hay en el formulario (alta o edición). */
  async function saveForm() {
    const els = formEls();
    if (!els.modal) return;
    const subjectCode = els.subject ? els.subject.value : "";
    const review = normalizeOwnReview({
      name: els.name ? els.name.value : "",
      subjectCode,
      modalidad: subjectCode ? (els.modalidad ? els.modalidad.value : "") : "",
      dificultad: els.dificultad ? els.dificultad.value : "",
      opinions: (els.opinions ? els.opinions.value : "").split("\n"),
      updatedAt: new Date().toISOString(),
    });
    if (!review) {
      showFormError("Pon un nombre y, si eliges dificultad, una de la lista.");
      return;
    }
    const previousKey = editingReviewKey;
    const result = await saveReviews([review]);
    if (!result) {
      showFormError("No se puede guardar: el almacén no está disponible (modo degradado).");
      return;
    }
    if (!result.ok) {
      showFormError("No se pudo guardar la valoración.");
      return;
    }
    // Al editar, cambiar de asignatura, modalidad o nombre cambia la clave: la
    // fila vieja se queda huérfana y hay que borrarla explícitamente.
    if (previousKey && previousKey !== review.docentKey) {
      await deleteReview(previousKey);
    }
    await reloadOwnReviews();
    closeForm();
    renderList();
    onChanged();
    setStatus(`Guardado: ${review.name}.`);
  }

  /** Borra una valoración propia, con confirmación. */
  async function deleteOwn(docentKey) {
    const review = getOwnReviews().find((r) => r.docentKey === docentKey);
    if (!review) return;
    if (!confirmFn(`¿Borrar tu valoración de ${review.name}?`)) return;
    const result = await deleteReview(docentKey);
    if (!result) {
      setStatus("No se puede borrar: el almacén no está disponible.", true);
      return;
    }
    if (!result.ok) {
      setStatus("No se pudo borrar la valoración.", true);
      return;
    }
    await reloadOwnReviews();
    closeForm();
    renderList();
    onChanged();
    setStatus(`Borrada la valoración de ${review.name}.`);
  }

  /** Importa un JSON de valoraciones. Es un upsert: no borra lo que ya haya. */
  async function importOwn(file) {
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      text = "";
    }
    const { reviews, errors } = parseOwnReviewsJSON(text);
    if (reviews.length === 0) {
      setStatus(errors[0] || "El fichero no traía ninguna valoración válida.", true);
      return;
    }
    const result = await saveReviews(reviews);
    if (!result) {
      setStatus("No se puede importar: el almacén no está disponible.", true);
      return;
    }
    if (!result.ok) {
      setStatus("No se pudo importar el fichero.", true);
      return;
    }
    await reloadOwnReviews();
    renderList();
    onChanged();
    const descartadas = errors.length ? ` (${errors.length} entrada(s) descartada(s))` : "";
    setStatus(`Importadas ${result.count} valoraciones${descartadas}.`, errors.length > 0);
  }

  /** Descarga tus valoraciones en el mismo JSON que acepta la importación. */
  function exportOwn() {
    const propias = getOwnReviews();
    if (propias.length === 0) {
      setStatus("Todavía no has añadido ninguna valoración.", true);
      return;
    }
    download(JSON.parse(ownReviewsToJSON(propias)), "profesores-propios.json");
    setStatus(`Exportadas ${propias.length} valoraciones.`);
  }

  function openPrompt() {
    const modal = el("profesor-prompt-modal");
    const text = el("profesor-prompt-text");
    if (!modal || !text) return;
    text.value = buildProfesorPrompt(getSubjects());
    modal.hidden = false;
    text.focus();
  }

  function closePrompt() {
    const modal = el("profesor-prompt-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
  }

  async function copyPrompt() {
    const text = el("profesor-prompt-text");
    if (!text) return;
    try {
      await window.navigator.clipboard.writeText(text.value);
      setStatus("Prompt copiado al portapapeles.");
    } catch {
      // Sin permiso de portapapeles (o sin API) el texto ya está a la vista y
      // seleccionado: se copia a mano en vez de fallar en silencio.
      text.select();
      setStatus("No se pudo copiar solo: el texto queda seleccionado, cópialo a mano.", true);
    }
  }

  // ─── Montaje ────────────────────────────────────────────────

  /** Engancha la ficha, el buscador, el formulario, la importación y el prompt. */
  function setup() {
    const els = profesorModalEls();
    if (els.modal) {
      if (els.close) els.close.addEventListener("click", closeProfesorFicha);
      els.modal.addEventListener("click", (e) => {
        if (e.target === els.modal) closeProfesorFicha();
      });
      els.modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeProfesorFicha();
        }
      });
    }
    // Delegado: el panel de grupos y el listado se repintan enteros, así que un
    // listener por botón se perdería en cada repintado.
    const groupConfig = el("group-config-content");
    if (groupConfig) {
      groupConfig.addEventListener("click", (e) => {
        const btn = e.target.closest(".prof-name-btn");
        if (!btn) return;
        openProfesorFicha(
          btn.dataset.profName,
          { subjectCode: btn.dataset.profCodigo, modalidad: btn.dataset.profModalidad },
          btn,
        );
      });
    }

    const lista = el("profesores-container");
    if (lista) {
      lista.addEventListener("click", (e) => {
        const btn = e.target.closest(".prof-name-btn");
        if (btn) {
          openProfesorFicha(btn.dataset.profName, null, btn);
          return;
        }
        const edit = e.target.closest("[data-edit-prof]");
        if (edit) {
          openForm(edit.dataset.editProf);
          return;
        }
        const remove = e.target.closest("[data-delete-prof]");
        if (remove) deleteOwn(remove.dataset.deleteProf);
      });
    }
    const search = el("profesores-search");
    if (search) search.addEventListener("input", renderList);

    const add = el("btn-add-profesor");
    if (add) add.addEventListener("click", () => openForm(""));

    const importBtn = el("btn-import-profesores");
    const importInput = el("import-profesores-input");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        importOwn(file);
      });
    }

    const exportBtn = el("btn-export-profesores");
    if (exportBtn) exportBtn.addEventListener("click", exportOwn);
    const promptBtn = el("btn-copy-profesor-prompt");
    if (promptBtn) promptBtn.addEventListener("click", openPrompt);
    const promptCopy = el("profesor-prompt-copy");
    if (promptCopy) promptCopy.addEventListener("click", copyPrompt);

    // El interruptor de esta sección es el mismo que el del generador.
    const ignore = el("profesores-ignore-docents");
    if (ignore) {
      ignore.addEventListener("change", () => onToggleIgnoreDocents(ignore.checked));
    }

    const form = formEls();
    if (form.modal) {
      if (form.close) form.close.addEventListener("click", closeForm);
      if (form.cancel) form.cancel.addEventListener("click", closeForm);
      if (form.save) form.save.addEventListener("click", saveForm);
      if (form.del) form.del.addEventListener("click", () => deleteOwn(editingReviewKey));
      if (form.subject) {
        form.subject.addEventListener("change", () => {
          if (form.modalidad) form.modalidad.disabled = !form.subject.value;
        });
      }
      form.modal.addEventListener("click", (e) => {
        if (e.target === form.modal) closeForm();
      });
      form.modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeForm();
        }
      });
    }

    const prompt = el("profesor-prompt-modal");
    if (prompt) {
      const closeBtn = el("profesor-prompt-close");
      if (closeBtn) closeBtn.addEventListener("click", closePrompt);
      prompt.addEventListener("click", (e) => {
        if (e.target === prompt) closePrompt();
      });
      prompt.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closePrompt();
        }
      });
    }
  }

  return { setup, renderList, openForm, closeForm, openPrompt, closePrompt };
}

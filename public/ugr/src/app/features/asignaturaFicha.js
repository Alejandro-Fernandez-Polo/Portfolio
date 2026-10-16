/**
 * Vista de la **ficha de asignatura** de `/ugr`: la dificultad y la descripción
 * del plan, por modalidad.
 *
 * Extraída del monolito. La ficha la compone el dominio (`buildAsignaturaFicha`);
 * aquí quedan la ventana y su contrato de apertura: la piden las tarjetas de
 * materia con el evento `ugr:openAsignatura` (viven en otra vista y no pueden
 * llamar a este cierre), y el foco vuelve a quien la abrió cuando eso pasa.
 *
 * Los datos son del **catálogo completo**; con la muestra viene vacía, y eso se
 * dice en pantalla en vez de dejar un hueco.
 *
 * `document` es inyectable (el del IIFE; simulado en tests).
 */

import { buildAsignaturaFicha } from "../domain/asignatura.js";

/**
 * @param {Object} deps dependencias del monolito.
 * @param {Document} deps.document raíz DOM.
 * @param {() => Array} deps.getSubjects catálogo activo.
 * @param {(texto: string) => string} deps.escape escapador de HTML.
 * @param {(d: ?) => string} deps.dificultadBadgeHtml insignia de dificultad.
 * @returns {{setup: () => void, open: (codigo: string, opener?: Object|null) => void, close: () => void}}
 *   la vista.
 */
export function createAsignaturaFichaView({ document, getSubjects, escape, dificultadBadgeHtml }) {
  /** Botón que abrió la ficha, para devolverle el foco al cerrar. */
  let opener = null;

  const el = (id) => document.getElementById(id);

  function els() {
    return {
      modal: el("asignatura-modal"),
      title: el("asignatura-modal-title"),
      body: el("asignatura-modal-body"),
      close: el("asignatura-modal-close"),
    };
  }

  function fichaHtml(ficha) {
    let html = '<div class="asignatura-ficha">';
    const meta = [
      ficha.codigo,
      ficha.curso ? `${ficha.curso}º curso` : "",
      ficha.cuatrimestre ? `${ficha.cuatrimestre}º cuatrimestre` : "",
      ficha.creditos ? `${ficha.creditos} ECTS` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (meta) html += `<p class="asignatura-ficha-meta">${escape(meta)}</p>`;

    const plan = [ficha.caracter, ficha.mencion ? `Mención ${ficha.mencion}` : ""].filter(Boolean).join(" · ");
    if (plan) html += `<p class="asignatura-ficha-plan">${escape(plan)}</p>`;

    if (ficha.dificultades.length) {
      html += '<h3 class="asignatura-ficha-sub">Dificultad de la asignatura</h3>';
      ficha.dificultades.forEach((d) => {
        html += '<div class="asignatura-ficha-row">' +
          `<span class="asignatura-ficha-modalidad">${escape(d.modalidad)}</span>` +
          `${dificultadBadgeHtml(d.clave)}</div>`;
      });
    }

    if (ficha.descripciones.length) {
      html += '<h3 class="asignatura-ficha-sub">Descripción</h3>';
      ficha.descripciones.forEach((d) => {
        html += '<div class="asignatura-ficha-row is-block">' +
          `<span class="asignatura-ficha-modalidad">${escape(d.modalidad)}</span>` +
          `<p class="asignatura-ficha-texto">${escape(d.texto)}</p></div>`;
      });
    }

    if (!ficha.dificultades.length && !ficha.descripciones.length) {
      html += '<p class="asignatura-ficha-vacio">Esta asignatura no trae dificultad ni descripción. ' +
        "Solo vienen con el catálogo completo (el archivo con contraseña).</p>";
    }

    html += "</div>";
    return html;
  }

  function open(codigo, openerEl) {
    const refs = els();
    if (!refs.modal || !refs.title || !refs.body || !codigo) return;
    const subject = getSubjects().find((s) => s.codigo === codigo);
    if (!subject) return;
    const ficha = buildAsignaturaFicha(subject);
    refs.title.textContent = ficha.nombre || ficha.codigo;
    refs.body.innerHTML = fichaHtml(ficha);
    opener = openerEl || null;
    refs.modal.hidden = false;
    if (refs.close) refs.close.focus();
  }

  function close() {
    const refs = els();
    if (!refs.modal || refs.modal.hidden) return;
    refs.modal.hidden = true;
    const quienAbrio = opener;
    opener = null;
    // El foco vuelve a quien abrió la ficha si el nodo sigue vivo (los paneles
    // se repintan enteros; el botón puede haber muerto).
    if (quienAbrio && document.contains(quienAbrio) && typeof quienAbrio.focus === "function") quienAbrio.focus();
  }

  /**
   * Engancha la ventana y escucha las peticiones de las tarjetas. Se monta una
   * sola vez por instancia (el llamante cachea la vista), así que el evento no
   * se duplica aunque `init()` se repita.
   */
  function setup() {
    const refs = els();
    if (!refs.modal) return;
    if (refs.close) refs.close.addEventListener("click", close);
    refs.modal.addEventListener("click", (e) => {
      if (e.target === refs.modal) close();
    });
    refs.modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });
    document.addEventListener("ugr:openAsignatura", (e) => {
      const codigo = e.detail && e.detail.codigo;
      if (codigo) open(codigo, null);
    });
  }

  return { setup, open, close };
}

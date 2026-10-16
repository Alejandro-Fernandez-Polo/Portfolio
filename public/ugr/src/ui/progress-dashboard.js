import { getModule } from "../kernel/registry.js";
import { filterSubjectsByMention, mencionOptions, tipoClave, tipoDeAsignatura } from "../app/domain/plan.js";
import { subscribe, flush } from "../store/commands.js";
import { getProgress } from "../store/selectors.js";
import { escapeHtml } from "../app/domain/text.js";
import {
  STATUS,
  PASSED_STATUSES,
  ECTS_PER_TERM,
  buildSubjectRows,
  buildCourseBars,
  buildCreditBreakdown,
  buildMenciones,
  buildSummary,
  buildProjection,
  buildConvalidaciones,
  subjectCourse,
  subjectEcts,
  DESTINO_LIBRE,
  esDestinoLibre,
} from "../progress/index.js";

// Orden de despliegue de los estados que el usuario **marca** en el <select>:
// de "tengo que empezarla" a "ya la tengo". «Convalidada» no está porque se
// **calcula** desde las convalidaciones aprobadas (ver `statusCell`), y solo se
// ofrece si un estado guardado de antes ya la traía.
const STATUS_ORDER = [STATUS.PENDIENTE, STATUS.EN_CURSO, STATUS.SUPERADA];
const STATUS_LABELS = {
  [STATUS.PENDIENTE]: "Pendiente",
  [STATUS.EN_CURSO]: "Cursando",
  [STATUS.SUPERADA]: "Superada",
  [STATUS.CONVALIDADA]: "Convalidada",
};

function courseLabel(curso) {
  if (curso === "Opt") return "Optativas";
  const numeric = Number(curso);
  return numeric ? `${numeric}º curso` : "Curso sin asignar";
}

function termLabel(term) {
  if (term === 1) return "1er cuatrimestre";
  return term ? `${term}º cuatrimestre` : "—";
}

/**
 * Catálogo activo: primero el módulo kernel y, si aún no cargó (o IndexedDB
 * está en modo degradado), el SUBJECTS global. data.js lo declara con `const`
 * en un script clásico, así que vive en el entorno léxico global y NO es
 * visible como globalThis.SUBJECTS.
 */
function getSubjects() {
  const catalog = getModule("catalog");
  const subjects = typeof catalog?.getSubjects === "function" ? catalog.getSubjects() : null;
  if (Array.isArray(subjects) && subjects.length) return subjects;
  return typeof SUBJECTS !== "undefined" && Array.isArray(SUBJECTS) ? SUBJECTS : [];
}

/**
 * Asignaturas del plan que el catálogo no planifica (el TFG, las prácticas de
 * empresa y la `RI` sin horario): cuentan para los créditos del grado igual que
 * las demás, aunque no tengan horario.
 */
function getPlanSubjects() {
  const catalog = getModule("catalog");
  const extra = typeof catalog?.getCatalog === "function" ? catalog.getCatalog()?.extraSubjects : null;
  return Array.isArray(extra) ? extra : [];
}

/** Menciones del catálogo activo (código y nombre largo). */
function getMenciones() {
  const catalog = getModule("catalog");
  const list = typeof catalog?.getCatalog === "function" ? catalog.getCatalog()?.menciones : null;
  return Array.isArray(list) ? list : [];
}

/**
 * ¿El catálogo activo es el del volcado, importado con la contraseña? El
 * resumen de cómo se consigue el título solo se enseña entonces.
 */
function esCatalogoImportado() {
  const catalog = getModule("catalog");
  const meta = typeof catalog?.getCatalog === "function" ? catalog.getCatalog()?.meta : null;
  return Array.isArray(meta?.sources) && meta.sources.includes("volcado");
}

function getProgressApi() {
  const api = typeof window !== "undefined" ? window.__ugrProgress : null;
  return api && typeof api.setStatus === "function" ? api : null;
}

function statusSelect(row, canWrite) {
  // El código es la clave del select: sirve de id estable para el <label> y
  // para recuperar el foco tras un re-render.
  const id = `progress-status-${String(row.code).replace(/[^\w-]/g, "-")}`;
  // Sin estado propio la opción elegida es «Sin marcar»: una asignatura sin
  // marcar no está pendiente, lo que está pendiente son los créditos.
  const sinMarcar = `<option value=""${row.marked ? "" : " selected"}>Sin marcar</option>`;
  // «Convalidada» no se ofrece: se **calcula** desde las convalidaciones
  // aprobadas. Solo aparece como opción si los datos ya la trajeran (un estado
  // guardado de antes), y entonces se enseña para poder verlo y quitarlo.
  const estados = row.marked && row.status === STATUS.CONVALIDADA ? [...STATUS_ORDER, STATUS.CONVALIDADA] : STATUS_ORDER;
  const options =
    sinMarcar +
    estados.map(
      (value) =>
        `<option value="${value}"${row.marked && value === row.status ? " selected" : ""}>${STATUS_LABELS[value]}</option>`,
    ).join("");
  // La etiqueta de la convalidación: sin ella, una asignatura que cuenta como
  // superada sin tener estado marcado parecería un error del cálculo.
  const etiqueta = row.convalidada
    ? '<span class="progress-convalidada" title="Lo reconoce una convalidación aprobada">convalidada</span>'
    : "";
  return `<label class="progress-visually-hidden" for="${id}">Estado de ${escapeHtml(row.code)} — ${escapeHtml(
    row.name,
  )}</label>
    <select id="${id}" class="progress-status-select" data-code="${escapeHtml(row.code)}"${
      canWrite ? "" : " disabled"
    }>${options}</select>${etiqueta}`;
}

/**
 * Suspensos anotados por asignatura: un contador informativo (no resta ECTS ni
 * toca el estado). Vive junto al selector de estado para que el grupo
 * «cuánto me cueste» esté en la misma celda.
 */
function failsInput(row, canWrite) {
  const id = `fails-${String(row.code).replace(/[^\w-]/g, "-")}`;
  return `<label class="progress-visually-hidden" for="${id}">Suspensos</label>
    <input type="number" min="0" max="20" step="1" class="progress-fails" id="${id}" data-code="${escapeHtml(
      row.code,
    )}" value="${row.fails}"${canWrite ? "" : " disabled"}>`;
}

/**
 * Bloque de backup/restore. `bundle.js` se importa en diferido:
 * solo quien exporta o importa paga el coste del módulo (y de su crypto).
 * Si algún elemento del bloque no existe (HTML antiguo), no se engancha nada.
 */
function setupBackupBlock() {
  const exportBtn = document.getElementById("btn-progress-export");
  const importBtn = document.getElementById("btn-progress-import");
  const fileInput = document.getElementById("progress-import-input");
  const statusEl = document.getElementById("progress-backup-status");
  const block = document.getElementById("progress-backup");
  if (!exportBtn || !importBtn || !fileInput || !statusEl) return;

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function setBusy(busy) {
    exportBtn.disabled = busy;
    importBtn.disabled = busy;
    // aria-busy mantiene informados a los lectores de pantalla durante la
    // operación; el mensaje final llega igualmente por role="status".
    if (block) block.setAttribute("aria-busy", busy ? "true" : "false");
  }

  exportBtn.addEventListener("click", async () => {
    setBusy(true);
    setStatus("Generando el backup…");
    try {
      // El store persiste con debounce (250 ms): sin flush, exportar justo
      // tras marcar una asignatura sacaría un snapshot atrasado de IDB.
      await flush();
      const { exportBundle } = await import("../backup/bundle.js");
      await exportBundle({ sections: ["userState", "configs", "progress", "reviews"] });
      setStatus("Backup descargado (.ugrbackup). Incluye tu progreso: guárdalo en un sitio seguro.");
    } catch (err) {
      setStatus(
        err?.message === "IDB_UNSUPPORTED"
          ? "No se puede exportar: IndexedDB no está disponible en esta sesión (modo degradado)."
          : `Error al exportar el backup: ${err?.message || err}`,
      );
    } finally {
      setBusy(false);
    }
  });

  // El input va oculto y lo dispara el botón: el control visible y accesible
  // es el botón con texto, no un file input sin etiqueta.
  importBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    // Vaciar el valor permite volver a elegir el mismo fichero: sin esto,
    // change no se dispara dos veces con la misma ruta.
    fileInput.value = "";
    if (!file) return;

    setBusy(true);
    setStatus("Importando el backup…");
    try {
      // flush() antes de leer el estado actual: el merge compara contra el
      // snapshot de IDB y este debe reflejar lo último marcado.
      await flush();
        const { importBundle, applyPlan } = await import("../backup/bundle.js");
      let imported;
      try {
        imported = await importBundle(file, { strategy: "merge" });
      } catch (err) {
        // BAD_PASSPHRASE: bundle cifrado sin frase de paso o con la incorrecta.
        if (err?.message !== "BAD_PASSPHRASE") throw err;
        const passphrase = window.prompt("Este backup está cifrado. Introduce la frase de paso:");
        // Cancelación del prompt: no romper, solo explicar qué falta.
        if (!passphrase) {
          setStatus("Importación cancelada: el backup cifrado necesita la frase de paso.");
          return;
        }
        imported = await importBundle(file, { strategy: "merge", passphrase });
      }
      await applyPlan(imported.plan);
      // El re-render no se pide a mano: applyPlan aplica el progreso con
      // comandos, notify() avisa al suscriptor del dashboard y render()
      // detecta el cambio en la clave del progreso.
      const applied = imported.plan.actions.length;
      setStatus(
        applied
          ? `Backup importado: ${applied} cambio${applied === 1 ? "" : "s"} aplicado${applied === 1 ? "" : "s"}.`
          : "Backup importado: no había nada nuevo que aplicar.",
      );
    } catch (err) {
      setStatus(
        err?.message === "IDB_UNSUPPORTED"
          ? "No se puede importar: IndexedDB no está disponible en esta sesión (modo degradado)."
          : err?.message === "BAD_PASSPHRASE"
            ? "La frase de paso no es correcta."
            : `Error al importar el backup: ${err?.message || err}`,
      );
    } finally {
      setBusy(false);
    }
  });
}

/**
 * Borrador del formulario de convalidaciones: los orígenes y los destinos que el
 * usuario ha ido **añadiendo** y que todavía no ha enviado.
 *
 * Vive en el ámbito del módulo, y no en el DOM, porque `render()` reescribe la
 * sección entera a cada cambio del store: si las listas se leyeran del DOM, el
 * repintado se llevaría por delante lo que el usuario ya había añadido. Es el
 * mismo problema que se resuelve conservando si el panel está abierto.
 *
 * `origenes` son texto libre (`{ nombre }`); `destinos`, asignaturas del catálogo
 * activo (`{ codigo, nombre, ects }`) más el destino reservado de créditos libres
 * (`libre: true`), sin repetidos por código. `libres` es la parte del campo de
 * créditos que no dan las asignaturas: se guarda para que el total siga cuadrando
 * cuando la lista de destinos cambie.
 */
const convalidacionesBorrador = { origenes: [], destinos: [], libres: 0 };

export function setupProgressDashboard() {
  const root = document.getElementById("progress-dashboard");
  // Modo degradado: sin la sección (HTML antiguo en caché, o vista no montada)
  // no hay nada que renderizar y la app no debe fallar por eso.
  if (!root) return;
  const summaryEl = document.getElementById("progress-summary");
  const emptyEl = document.getElementById("progress-empty");
  const mencionPickerEl = document.getElementById("progress-mencion");
  const creditosEl = document.getElementById("progress-creditos");
  const mencionesEl = document.getElementById("progress-menciones");
  const barsEl = document.getElementById("progress-course-bars");
  const projectionEl = document.getElementById("progress-projection");
  const subjectsEl = document.getElementById("progress-subjects");
  const mencionFiltroEl = document.getElementById("progress-subjects-mencion");
  const mencionFiltroBox = document.getElementById("progress-subjects-filter");
  if (!summaryEl || !barsEl || !projectionEl || !subjectsEl) return;
  if (root.dataset.progressBound === "1") return;
  root.dataset.progressBound = "1";
  // Una sola vez, junto al resto del dashboard: si el bloque no está en el
  // HTML, setupBackupBlock se sale sin enganchar nada.
  setupBackupBlock();

  // ─── Sección de convalidaciones ──────────────────────────────
  // Vive dentro de Progreso y se despliega con su botón. Los IDs los pide el
  // HTML; si falta alguno (HTML antiguo), la sección queda inerte y el resto
  // del dashboard sigue funcionando.
  const btnConvalidaciones = document.getElementById("btn-convalidaciones");
  const convalidacionesPanel = document.getElementById("convalidaciones-panel");
  const convalidacionDestinos = document.getElementById("convalidacion-destinos");
  const convalidacionesForm = document.getElementById("convalidaciones-form");
  const convalidacionOrigen = document.getElementById("convalidacion-origen");
  const convalidacionOrigenAnadir = document.getElementById("convalidacion-origen-anadir");
  const convalidacionDestinosAnadir = document.getElementById("convalidacion-destinos-anadir");
  const convalidacionesOrigenesLista = document.getElementById("convalidaciones-origenes-lista");
  const convalidacionesDestinosLista = document.getElementById("convalidaciones-destinos-lista");
  const convalidacionCreditos = document.getElementById("convalidacion-creditos");
  const convalidacionCreditosNota = document.getElementById("convalidacion-creditos-nota");
  const convalidacionCalificacion = document.getElementById("convalidacion-calificacion");
  const convalidacionesAviso = document.getElementById("convalidaciones-aviso");
  const convalidacionesGrupos = document.getElementById("convalidaciones-grupos");
  // El panel empieza plegado (hidden en el HTML). El estado vive aquí para
  // conservarlo al repintar: el botón lo alterna y render lo aplica.
  let convalidacionesAbierto = convalidacionesPanel ? !convalidacionesPanel.hidden : false;

  // El botón alterna el panel y su aria-expanded.
  if (btnConvalidaciones && convalidacionesPanel) {
    btnConvalidaciones.addEventListener("click", () => {
      convalidacionesAbierto = !convalidacionesAbierto;
      convalidacionesPanel.hidden = !convalidacionesAbierto;
      btnConvalidaciones.setAttribute("aria-expanded", convalidacionesAbierto ? "true" : "false");
    });
  }

  // ─── Alta por listas ─────────────────────────────────────────
  // El origen es texto libre y el destino una asignatura del catálogo: los dos
  // se van **añadiendo** a su lista y el envío junta las dos. El borrador es de
  // módulo (ver `convalidacionesBorrador`), así que sobrevive a los repintados.

  /** Vacío o solo espacios no es un origen: no se añade nada. */
  function anadirOrigen() {
    if (!convalidacionOrigen) return;
    const nombre = convalidacionOrigen.value.trim();
    if (!nombre) return;
    convalidacionesBorrador.origenes.push({ nombre });
    // Vaciar el campo deja listo el siguiente origen y evita reañadirlo sin querer.
    convalidacionOrigen.value = "";
    renderConvalidacionesBorrador();
    convalidacionOrigen.focus();
  }

  /**
   * El destino se guarda con **código y nombre**: el código es el enlace con el
   * catálogo y el nombre es lo que se enseña y permite recuperarlo si el código
   * cambia. La lista no admite repetidos por código. Se guarda además su `ects`
   * (o `libre`), para poder sumar los créditos sin volver a mirar el catálogo.
   */
  function anadirDestino() {
    if (!convalidacionDestinos) return;
    const option = convalidacionDestinos.selectedOptions[0] || convalidacionDestinos.options[convalidacionDestinos.selectedIndex];
    const codigo = option?.value || "";
    if (!codigo || convalidacionesBorrador.destinos.some((d) => d.codigo === codigo)) return;
    const nombre = option.dataset.nombre || option.textContent.trim();
    convalidacionesBorrador.destinos.push({
      codigo,
      nombre,
      ects: Number(option.dataset.ects) || 0,
      libre: esDestinoLibre({ codigo, nombre }),
    });
    renderConvalidacionesBorrador();
  }

  /** La suma de los ECTS de las asignaturas; los créditos libres no suman por sí solos. */
  function sumaCreditosAsignaturas() {
    return convalidacionesBorrador.destinos.reduce((sum, d) => sum + (d.libre ? 0 : Number(d.ects) || 0), 0);
  }

  /**
   * El campo de créditos: sin destino libre lo **calcula** la app (suma de ECTS del
   * catálogo) y es de solo lectura; con «Créditos libres» en la lista es editable y
   * su valor es la suma de las asignaturas **más** la parte libre, de modo que el
   * total siempre cuadre. `aria-readonly` y la clase acompañan al atributo para que
   * el bloqueo se vea y se oiga, y la nota explica de dónde sale el número.
   */
  function refrescarCreditos() {
    if (!convalidacionCreditos) return;
    const hayLibres = convalidacionesBorrador.destinos.some((d) => d.libre);
    const total = sumaCreditosAsignaturas() + (hayLibres ? convalidacionesBorrador.libres : 0);
    convalidacionCreditos.value = String(total);
    convalidacionCreditos.readOnly = !hayLibres;
    convalidacionCreditos.setAttribute("aria-readonly", hayLibres ? "false" : "true");
    convalidacionCreditos.classList.toggle("is-readonly", !hayLibres);
    if (convalidacionCreditosNota) {
      convalidacionCreditosNota.textContent = hayLibres
        ? "Se suman los créditos de las asignaturas que elijas; con «Créditos libres» en la lista, escribe tú el resto."
        : "Se suman solos los créditos de las asignaturas que elijas.";
    }
  }

  // Al teclear con «Créditos libres» delante, la parte libre es el total escrito
  // menos lo que ya suman las asignaturas: así, si luego se añade o se quita una,
  // el total sigue cuadrando sin tocar el número.
  if (convalidacionCreditos) {
    convalidacionCreditos.addEventListener("input", () => {
      const escrito = Number(convalidacionCreditos.value) || 0;
      convalidacionesBorrador.libres = Math.max(0, escrito - sumaCreditosAsignaturas());
    });
  }

  /**
   * Pinta las dos listas de chips desde el borrador. El texto es del usuario, así
   * que va escapado; el botón de quitar lleva en el `aria-label` qué quita para
   * que un lector de pantalla no oiga una fila de «Quitar» sin contexto.
   */
  function renderConvalidacionesBorrador() {
    const pintar = (contenedor, items, clave) => {
      if (!contenedor) return;
      contenedor.innerHTML = items
        .map(
          (item, indice) =>
            `<li class="convalidaciones-chip${item.libre ? " is-libre" : ""}"><span class="convalidaciones-chip-texto">${escapeHtml(
              item.nombre,
            )}</span><button type="button" class="convalidaciones-chip-quitar" data-lista="${clave}" data-indice="${indice}"
              aria-label="Quitar ${escapeHtml(item.nombre)}">&times;</button></li>`,
        )
        .join("");
    };
    pintar(convalidacionesOrigenesLista, convalidacionesBorrador.origenes, "origenes");
    pintar(convalidacionesDestinosLista, convalidacionesBorrador.destinos, "destinos");
    // La lista de destinos cambia los créditos: se refresca el campo con ella.
    refrescarCreditos();
  }

  if (convalidacionOrigenAnadir) convalidacionOrigenAnadir.addEventListener("click", anadirOrigen);
  if (convalidacionDestinosAnadir) convalidacionDestinosAnadir.addEventListener("click", anadirDestino);

  // Enter en el campo del origen añade a la lista en vez de enviar el formulario:
  // el envío implícito mandaría la convalidación con lo que hubiera a medias.
  if (convalidacionOrigen) {
    convalidacionOrigen.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      anadirOrigen();
    });
  }

  // El botón de quitar se delega en la lista: su contenido se repinta entero y un
  // listener por chip se perdería.
  for (const [contenedor, lista] of [
    [convalidacionesOrigenesLista, convalidacionesBorrador.origenes],
    [convalidacionesDestinosLista, convalidacionesBorrador.destinos],
  ]) {
    if (!contenedor) continue;
    contenedor.addEventListener("click", (event) => {
      const boton = event.target.closest("button[data-indice]");
      if (!boton || !contenedor.contains(boton)) return;
      const indice = Number(boton.dataset.indice);
      if (!Number.isInteger(indice)) return;
      // El borrador es de módulo: se muta en el sitio para que este listener, el
      // envío y el repintado vean siempre la misma lista.
      if (lista.length > indice) lista.splice(indice, 1);
      renderConvalidacionesBorrador();
    });
  }

  // Envío del formulario: junta las dos listas (N orígenes ↔ N destinos) y añade
  // la convalidación al store. Sin al menos un origen y un destino no se añade
  // nada y se explica en el aviso (role="status").
  if (convalidacionesForm && convalidacionOrigen && convalidacionDestinos) {
    convalidacionesForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const origenes = convalidacionesBorrador.origenes;
      const destinos = convalidacionesBorrador.destinos;
      if (!origenes.length || !destinos.length) {
        if (convalidacionesAviso) {
          const falta = [];
          if (!origenes.length) falta.push("al menos un origen");
          if (!destinos.length) falta.push("al menos una asignatura que lo reconozca");
          convalidacionesAviso.textContent = `Falta ${falta.join(" y ")}: añádelos a su lista antes de guardar.`;
        }
        return;
      }
      const api = getProgressApi();
      if (api && typeof api.setConvalidaciones === "function") {
        const nueva = {
          // Los orígenes son texto libre: van como `{ nombre }` y el modelo los
          // normaliza al guardarlos.
          origenes: origenes.map((o) => ({ nombre: o.nombre })),
          destinos: destinos.map((d) => ({ codigo: d.codigo, nombre: d.nombre })),
          creditos: Number(convalidacionCreditos?.value) || 0,
          calificacion: convalidacionCalificacion?.value.trim() || "",
        };
        api.setConvalidaciones([...getProgress().equivalences, nueva]);
      }
      convalidacionesForm.reset();
      // Vaciar el borrador después de enviar: el formulario y las dos listas
      // quedan listos para la siguiente convalidación (y sin parte libre, que se
      // recalcula sola desde los destinos).
      convalidacionesBorrador.libres = 0;
      origenes.length = 0;
      destinos.length = 0;
      renderConvalidacionesBorrador();
      if (convalidacionesAviso) convalidacionesAviso.textContent = "";
    });
  }

  // Los botones de estado y «Quitar» se delegan en el contenedor: el contenido
  // se repinta con innerHTML y un listener por fila se perdería.
  if (convalidacionesGrupos) {
    convalidacionesGrupos.addEventListener("click", (event) => {
      const boton = event.target.closest("button");
      if (!boton || !convalidacionesGrupos.contains(boton)) return;
      const api = getProgressApi();
      const id = boton.dataset.id;
      if (!api || !id) return;
      if (boton.dataset.accion === "estado" && typeof api.setEstadoConvalidacion === "function") {
        api.setEstadoConvalidacion(id, boton.dataset.estado);
      } else if (boton.dataset.accion === "quitar" && typeof api.setConvalidaciones === "function") {
        api.setConvalidaciones(getProgress().equivalences.filter((c) => c.id !== id));
      }
    });
  }

  // Clave de lo que cambia el render: si el store notifica por un cambio que
  // no afecta al progreso (selección del solver, UI…) no se repinta la tabla.
  let lastKey = null;

  // Mención del filtro de la lista de asignaturas: vacío es «todas». Es una
  // preferencia de la vista y no se guarda en el store, a diferencia de la
  // mención elegida, que sí forma parte del progreso.
  let mencionFiltro = "";

  function captureFocus() {
    const active = document.activeElement;
    return active && root.contains(active) && active.id ? active.id : "";
  }

  function restoreFocus(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el && typeof el.focus === "function") el.focus();
  }

  function renderSummary(summary) {
    // Los suspensos son informativos (no tocan los ECTS): solo se dicen si hay.
    const suspensos =
      summary.fails > 0
        ? `<p class="progress-hint">${summary.fails} suspenso${summary.fails === 1 ? "" : "s"} anotado${summary.fails === 1 ? "" : "s"} (informativo, no resta ECTS).</p>`
        : "";
    summaryEl.innerHTML = `<div class="progress-kpis">
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.ectsPassed}</span><span class="progress-kpi-label">ECTS superados</span></div>
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.ectsEnrolled}</span><span class="progress-kpi-label">ECTS en curso</span></div>
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.ectsPending}</span><span class="progress-kpi-label">ECTS pendientes</span></div>
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.pct}%</span><span class="progress-kpi-label">del grado (${summary.totalECTS} ECTS)</span></div>
      </div>
      <p class="progress-hint">${summary.counts.passed} asignaturas superadas · ${summary.counts.enrolled} en curso · ${summary.counts.pending} sin marcar</p>
      ${suspensos}`;
  }

  /**
   * Créditos por bloque del grado. Los totales salen del catálogo (suman los 240
   * de la titulación) y el resumen de cómo se consigue solo se enseña con el
   * catálogo del volcado, es decir, con la contraseña puesta.
   */
  function renderCreditos(breakdown, importado) {
    if (!creditosEl) return;
    const conCreditos = breakdown.filter((b) => b.total > 0);
    if (!conCreditos.length) {
      creditosEl.innerHTML = "";
      return;
    }
    const total = conCreditos.reduce((sum, b) => sum + b.total, 0);
    const passed = conCreditos.reduce((sum, b) => sum + b.passed, 0);
    const filas = conCreditos
      .map(
        (b) => `<tr>
          <th scope="row">${escapeHtml(b.etiqueta)}${
            b.detalle ? ` <span class="progress-mencion-nombre">${escapeHtml(b.detalle)}</span>` : ""
          }</th>
          <td>${b.passed}/${b.total} ECTS</td>
          <td>${b.count}</td>
        </tr>`,
      )
      .join("");
    const criterios = importado
      ? `<p class="progress-hint progress-criterios">El grado son <strong>240 ECTS</strong>: 60 de formación básica, 90 obligatorias, 48 de materias de mención, 30 optativas y 12 del trabajo fin de grado. Para obtener una mención hay que cursar <strong>todas</strong> las materias de su módulo: no vale sumar 48 ECTS mezclando especialidades.</p>`
      : "";
    creditosEl.innerHTML = `<h3>Créditos del grado</h3>
      <p class="progress-projection-text">${passed} de ${total} ECTS superados.</p>
      <div class="manage-table-wrapper">
        <table class="manage-table progress-table">
          <caption class="progress-visually-hidden">Créditos superados por bloque del plan</caption>
          <thead><tr><th scope="col">Bloque</th><th scope="col">Superados</th><th scope="col">Asignaturas</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      ${criterios}`;
  }

  /**
   * Desplegable de mención elegida: puede quedarse en «sin decidir». No filtra
   * nada por su cuenta —el progreso se marca asignatura a asignatura—, pero
   * decide qué mención enseñan el bloque de créditos y el panel de menciones.
   */
  function renderMencionPicker(mencion) {
    if (!mencionPickerEl) return;
    const opciones = getMenciones();
    mencionPickerEl.innerHTML =
      '<option value="">Sin decidir</option>' +
      opciones
        .map((m) => `<option value="${escapeHtml(m.codigo)}">${escapeHtml(m.codigo)} — ${escapeHtml(m.nombre || "")}</option>`)
        .join("");
    mencionPickerEl.value = opciones.some((m) => m.codigo === mencion) ? mencion : "";
    mencionPickerEl.hidden = opciones.length === 0;
    if (!mencionPickerEl.dataset.mencionBound) {
      mencionPickerEl.dataset.mencionBound = "1";
      mencionPickerEl.addEventListener("change", () => {
        const api = getProgressApi();
        if (api && typeof api.setMencion === "function") api.setMencion(mencionPickerEl.value);
        else render(true);
      });
    }
  }

  /**
   * Desplegable que filtra la lista de asignaturas por mención: «Todas» enseña
   * el plan entero y una mención oculta las asignaturas de **las otras**, nunca
   * las que no tienen mención. No toca el progreso —los estados se marcan
   * asignatura a asignatura— ni los créditos ni las barras, que siguen contando
   * el plan completo.
   */
  function renderMencionFiltro() {
    if (!mencionFiltroEl) return;
    const opciones = mencionOptions(getSubjects(), getMenciones());
    mencionFiltroEl.innerHTML =
      '<option value="">Todas las menciones</option>' +
      opciones
        .map(
          (o) =>
            `<option value="${escapeHtml(o.codigo)}">${escapeHtml(o.codigo)}${
              o.nombre ? ` — ${escapeHtml(o.nombre)}` : ""
            }</option>`,
        )
        .join("");
    mencionFiltroEl.value = opciones.some((o) => o.codigo === mencionFiltro) ? mencionFiltro : "";
    mencionFiltro = mencionFiltroEl.value;
    if (mencionFiltroBox) mencionFiltroBox.hidden = opciones.length === 0;
    if (!mencionFiltroEl.dataset.mencionFiltroBound) {
      mencionFiltroEl.dataset.mencionFiltroBound = "1";
      mencionFiltroEl.addEventListener("change", () => {
        mencionFiltro = mencionFiltroEl.value;
        render(true);
      });
    }
  }

  /** Estado de cada mención: ECTS de su módulo y materias que faltan. */
  function renderMenciones(menciones) {
    if (!mencionesEl) return;
    if (!menciones.length) {
      mencionesEl.innerHTML = "";
      return;
    }
    const filas = menciones
      .map((m) => {
        const estado = m.completa
          ? `<span class="progress-mencion-ok">Obtenida</span>`
          : `Faltan: ${escapeHtml(m.faltan.map((f) => f.code).join(", "))}`;
        const marca = m.elegida ? ' <span class="progress-mencion-elegida">elegida</span>' : "";
        return `<tr>
          <th scope="row">${escapeHtml(m.codigo)} <span class="progress-mencion-nombre">${escapeHtml(m.nombre)}</span>${marca}</th>
          <td>${m.passed}/${m.total} ECTS</td>
          <td>${estado}</td>
        </tr>`;
      })
      .join("");
    mencionesEl.innerHTML = `<h3>Menciones</h3>
      <p class="progress-projection-text">El título lleva <strong>una</strong> mención: se obtiene cursando <strong>todas</strong> las materias de su módulo de especialidad (48 ECTS). Los 48 ECTS de mención del plan se pueden cubrir con asignaturas de cualquier mención, pero entonces no se obtiene ninguna. Las <strong>30 optativas</strong> son aparte y las eliges tú.</p>
      <div class="manage-table-wrapper">
        <table class="manage-table progress-table">
          <caption class="progress-visually-hidden">Materias de mención y lo que falta</caption>
          <thead><tr><th scope="col">Mención</th><th scope="col">Superadas</th><th scope="col">Estado</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;
  }

  function renderCourseBars(bars) {
    // role/aria van en la barra, no en el contenedor: es el valor numérico el
    // que anuncia el progreso. El texto de al lado repite el dato para que el
    // color no sea la única señal. Con ECTS en curso la barra lleva dos tramos
    // y una segunda cifra (en un tono más suave) que ya los suma.
    barsEl.innerHTML =
      "<h3>Barras por curso</h3>" +
      bars
        .map((bar) => {
          const title = bar.curso === "plan" ? "Total del grado" : courseLabel(bar.curso);
          const conCurso = bar.enrolledECTS > 0;
          const base = `${bar.passedECTS} / ${bar.totalECTS} ECTS · ${bar.pct}%`;
          const conCursando = `${bar.passedECTS + bar.enrolledECTS} / ${bar.totalECTS} ECTS · ${bar.totalPct}%`;
          const metas = conCurso
            ? `<span class="progress-bar-meta">${base}</span>
               <span class="progress-bar-meta progress-bar-meta-enrolled">con cursando: ${conCursando}</span>`
            : `<span class="progress-bar-meta">${base}</span>`;
          const valorTexto = conCurso
            ? `${bar.passedECTS} de ${bar.totalECTS} ECTS superados y ${bar.enrolledECTS} en curso`
            : `${bar.passedECTS} de ${bar.totalECTS} ECTS superados`;
          const label = conCurso
            ? `${title}: ${valorTexto}, ${bar.totalPct}%`
            : `${title}: ${valorTexto}, ${bar.pct}%`;
          const tramoCurso = conCurso
            ? `<span class="progress-bar-fill-enrolled" style="width:${bar.enrolledPct}%"></span>`
            : "";
          return `<div class="progress-bar-row${bar.curso === "plan" ? " is-plan" : ""}">
            <div class="progress-bar-head">
              <span class="progress-bar-title">${escapeHtml(title)}</span>
              <span class="progress-bar-metas">${metas}</span>
            </div>
            <div class="progress-bar-track${conCurso ? " is-segmented" : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                 aria-valuenow="${bar.pct}" aria-valuetext="${escapeHtml(valorTexto)}" aria-label="${escapeHtml(label)}">
              <span class="progress-bar-fill" style="width:${bar.pct}%"></span>${tramoCurso}
            </div>
          </div>`;
        })
        .join("");
  }

  function renderProjection(projection, summary) {
    const head = "<h3>Proyección del plan</h3>";
    const text =
      projection.remainingECTS > 0
        ? `Quedan <strong>${projection.remainingECTS} ECTS</strong>: unos <strong>${projection.termsRemaining} cuatrimestres</strong> a ${ECTS_PER_TERM} ECTS (${projection.passedECTS}/${summary.totalECTS} ECTS superados, ${projection.pct}%).`
        : `Grado completado: ${projection.passedECTS} de ${summary.totalECTS} ECTS superados.`;
    projectionEl.innerHTML = `${head}<p class="progress-projection-text">${text}</p>`;
  }

  function renderSubjects(rows, canWrite, filtro = "") {
    // Con una mención elegida la tabla oculta las asignaturas de las **otras**
    // menciones; las que no tienen mención (el núcleo común) siguen a la vista.
    // Los ECTS de cada curso se calculan sobre **todas** las del curso: son los
    // del plan (60), no los de la mención.
    const visibles = filterSubjectsByMention(rows, filtro);
    const passedPorCurso = new Map();
    for (const row of rows) {
      if (!PASSED_STATUSES.includes(row.status)) continue;
      passedPorCurso.set(row.curso, (passedPorCurso.get(row.curso) || 0) + row.ects);
    }

    const hint = canWrite
      ? ""
      : `<p class="progress-hint progress-hint-warning">El módulo de progreso no está disponible en esta sesión: los estados son de solo lectura.</p>`;

    if (!visibles.length) {
      subjectsEl.innerHTML = `${hint}<p class="empty-state">No hay asignaturas que mostrar con ese filtro.</p>`;
      return;
    }

    // Las filas llegan ya ordenadas por curso: agrupar es detectar cambios de
    // curso seguidos, sin volver a ordenar aquí.
    const groups = [];
    for (const row of visibles) {
      const last = groups[groups.length - 1];
      if (!last || last.curso !== row.curso) groups.push({ curso: row.curso, rows: [row] });
      else last.rows.push(row);
    }

    let body = "";
    for (const group of groups) {
      // El máximo del curso es el del plan (60 ECTS), no la suma del catálogo:
      // trae las optativas de todas las menciones y nadie cursa las cinco.
      const totalECTS = 60;
      const passedECTS = passedPorCurso.get(group.curso) || 0;
      body += `<tr class="progress-course-sep"><th colspan="7" scope="rowgroup">${escapeHtml(
        courseLabel(group.curso),
      )} · ${passedECTS}/${totalECTS} ECTS superados</th></tr>`;
      for (const row of group.rows) {
        // El tipo va con el mismo color que en la lista de datos: es la misma
        // clasificación (carácter y mención) leída del plan.
        const tipo = tipoDeAsignatura(row);
        const clave = tipoClave(row);
        body += `<tr>
          <td class="td-codigo">${escapeHtml(row.code)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td class="td-tipo${clave ? ` td-tipo-${clave}` : ""}">${tipo ? escapeHtml(tipo) : "—"}</td>
          <td>${row.ects}</td>
          <td>${escapeHtml(termLabel(row.term))}</td>
          <td class="progress-status-cell">${statusSelect(row, canWrite)}${failsInput(row, canWrite)}</td>
        </tr>`;
      }
    }

    subjectsEl.innerHTML = `${hint}<div class="manage-table-wrapper">
      <table class="manage-table progress-table">
        <caption class="progress-visually-hidden">Asignaturas del catálogo con su estado</caption>
        <thead><tr>
          <th scope="col">Código</th><th scope="col">Asignatura</th><th scope="col">Tipo</th>
          <th scope="col">ECTS</th><th scope="col">Cuatrimestre</th><th scope="col">Estado y suspensos</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  }

  /**
   * Una fila de convalidación: orígenes, destinos (con nombre y ECTS, o marca
   * de fuera del catálogo), créditos, calificación y los botones de estado.
   * El texto del usuario (origen, calificación) va escapado: se interpola en
   * HTML. Los tres botones de estado reflejan con aria-pressed cuál es el
   * actual.
   */
  function filaConvalidacion(c) {
    const destinos = c.destinos
      .map(
        (d) =>
          `<span class="convalidaciones-destino${d.fueraDelCatalogo ? " is-fuera" : ""}">${escapeHtml(
            d.name,
          )}${d.ects ? ` (${d.ects} ECTS)` : ""}${d.fueraDelCatalogo ? " — fuera del catálogo" : ""}</span>`,
      )
      .join(", ");
    const origenes = c.origenes.map(escapeHtml).join(", ");
    const botones = [
      ["aprobada", "Aprobar"],
      ["rechazada", "Rechazar"],
      ["pendiente", "Pendiente"],
    ]
      .map(
        ([estado, texto]) =>
          `<button type="button" class="btn btn-small${c.estado === estado ? " is-activo" : ""}" data-accion="estado" data-estado="${estado}" data-id="${escapeHtml(
            c.id,
          )}" aria-pressed="${c.estado === estado ? "true" : "false"}">${texto}</button>`,
      )
      .join("");
    return `<div class="convalidaciones-fila" data-id="${escapeHtml(c.id)}">
      <div class="convalidaciones-fila-main">
        <div><strong>Origen:</strong> ${origenes}</div>
        <div><strong>Destinos:</strong> ${destinos}</div>
        <div><strong>Créditos:</strong> ${c.creditos || "—"}${
          c.calificacion ? ` · <strong>Calificación:</strong> ${escapeHtml(c.calificacion)}` : ""
        }</div>
      </div>
      <div class="convalidaciones-fila-actions">
        ${botones}
        <button type="button" class="btn btn-small btn-danger" data-accion="quitar" data-id="${escapeHtml(
          c.id,
        )}">Quitar</button>
      </div>
    </div>`;
  }

  /**
   * Repinta la sección de convalidaciones: el select de destinos (con el
   * catálogo activo, conservando la selección), las dos listas del borrador y
   * los tres grupos. No toca si el panel está abierto o cerrado — eso lo decide
   * el botón y el estado se aplica aquí.
   */
  function renderConvalidacionesPanel(convalidaciones, subjects) {
    if (!convalidacionesPanel || !btnConvalidaciones || !convalidacionesGrupos) return;
    convalidacionesPanel.hidden = !convalidacionesAbierto;
    btnConvalidaciones.setAttribute("aria-expanded", convalidacionesAbierto ? "true" : "false");

    // Destinos: las asignaturas del catálogo activo, con su curso, y delante la
    // opción de créditos libres (la fuente única de su código y su rótulo es el
    // modelo, no este HTML). Se conserva la opción elegida al repintar —se lee
    // antes de rellenar y se restaura después— para que el usuario no pierda lo
    // que tenía seleccionado aunque el catálogo cambie. El nombre va también en
    // `data-nombre` y los ECTS en `data-ects`: el chip de la lista los usa y así
    // no tiene que volver a buscar la asignatura ni sus créditos.
    if (convalidacionDestinos) {
      const elegido = convalidacionDestinos.value;
      const libre = `<option value="${escapeHtml(DESTINO_LIBRE.codigo)}" data-nombre="${escapeHtml(
        DESTINO_LIBRE.nombre,
      )}" data-ects="0">${escapeHtml(DESTINO_LIBRE.nombre)}</option>`;
      // El marcador va el primero y seleccionado: sin él, el desplegable tendría
      // una opción elegida de arranque y «Añadir» metería algo que nadie pidió.
      const marcador = '<option value="" selected>Elige una asignatura…</option>';
      convalidacionDestinos.innerHTML =
        marcador +
        libre +
        subjects
          .map((s) => {
            const code = s.codigo || s.code || "";
            if (!code) return "";
            const nombre = s.nombre || s.name || code;
            const curso = courseLabel(subjectCourse(s));
            return `<option value="${escapeHtml(code)}" data-nombre="${escapeHtml(nombre)}" data-ects="${subjectEcts(
              s,
            )}">${escapeHtml(nombre)} (${escapeHtml(curso)})</option>`;
          })
          .join("");
      if (elegido) {
        for (const option of convalidacionDestinos.options) {
          if (option.value === elegido) {
            option.selected = true;
            break;
          }
        }
      }
    }

    // Las dos listas del borrador se pintan desde el borrador (no desde el DOM):
    // es lo que hace que los orígenes y destinos ya añadidos sobrevivan a este
    // repintado.
    renderConvalidacionesBorrador();

    // Grupos: pendientes, rechazadas y aprobadas, con los destinos resueltos
    // contra el catálogo (nombre y ECTS, o marca de fuera del catálogo).
    const grupos = buildConvalidaciones(convalidaciones, subjects);
    if (!grupos.total) {
      convalidacionesGrupos.innerHTML =
        '<p class="empty-state">No hay convalidaciones todavía. Añade arriba lo que has cursado fuera y las asignaturas que te lo reconocen.</p>';
      return;
    }
    const bloque = (titulo, filas) => {
      if (!filas.length) {
        return `<div class="convalidaciones-grupo"><h3>${titulo}</h3><p class="progress-hint">Ninguna.</p></div>`;
      }
      const cuerpo = filas.map(filaConvalidacion).join("");
      return `<div class="convalidaciones-grupo"><h3>${titulo}</h3>${cuerpo}</div>`;
    };
    convalidacionesGrupos.innerHTML =
      bloque("Pendientes", grupos.pendientes) +
      bloque("Rechazadas", grupos.rechazadas) +
      bloque("Aprobadas", grupos.aprobadas);
  }

  function render(force = false) {
    const progress = getProgress();
    const subjects = getSubjects();
    const version = getModule("catalog")?.getVersion?.() || "";
    const key = JSON.stringify([progress, subjects.length, version]);
    if (!force && key === lastKey) return;
    lastKey = key;

    const focusId = captureFocus();
    const credits = progress.credits;
    // Convalidaciones (origen → destino, con su estado) y suspensos anotados:
    // viajan con el progreso y el view-model los cruza con el catálogo.
    const opciones = { convalidaciones: progress.equivalences, fails: progress.fails };
    // Las asignaturas del plan (TFG, prácticas) cuentan para los créditos y se
    // pueden marcar, aunque no tengan horario.
    const todos = [...subjects, ...getPlanSubjects()];
    const rows = buildSubjectRows(todos, credits, opciones);
    const summary = buildSummary(todos, credits, progress.plan, opciones);

    renderSummary(summary);
    renderMencionPicker(progress.mencion || "");
    renderMencionFiltro();
    renderCreditos(buildCreditBreakdown(todos, credits, progress.mencion || ""), esCatalogoImportado());
    renderMenciones(buildMenciones(subjects, credits, getMenciones(), progress.mencion || ""));
    if (emptyEl) emptyEl.hidden = rows.length > 0;
    if (rows.length) {
      renderCourseBars(buildCourseBars(todos, credits, progress.plan));
      renderSubjects(rows, Boolean(getProgressApi()), mencionFiltro);
    } else {
      barsEl.innerHTML = "";
      subjectsEl.innerHTML = "";
    }
    renderProjection(buildProjection(subjects, credits, progress.plan, opciones), summary);
    renderConvalidacionesPanel(progress.equivalences, subjects);
    restoreFocus(focusId);
  }

  // El cambio de estado se delega en el contenedor: el re-render sustituye los
  // selects, así que volver a enganchar uno en uno perdería el listener.
  subjectsEl.addEventListener("change", (event) => {
    const target = event.target;
    if (!target) return;
    if (target.tagName === "SELECT" && target.classList.contains("progress-status-select")) {
      const api = getProgressApi();
      const code = target.dataset.code;
      if (!api || !code) return;
      // setStatus false = el store rechazó el comando: repintar devuelve el
      // select al estado real en lugar de dejar un valor que no se guardó.
      if (!api.setStatus(code, target.value)) render(true);
    } else if (target.classList.contains("progress-fails")) {
      // Suspensos: contador informativo. El código va en data-code porque el
      // id del input tiene caracteres reemplazados y no sirve para recuperarlo.
      const api = getProgressApi();
      const code = target.dataset.code;
      if (!api || !code) return;
      api.setFails(code, target.value);
    }
  });

  // Sin refresh por pestaña: los estados viven en el store y subscribe()
  // repinta cuando cambian. El conmutador de app.js ya muestra la vista.
  document.addEventListener("ugr:catalogUpdated", () => render(true));
  subscribe(() => render(false));

  render(true);
}

import { getModule } from "../kernel/registry.js";
import { subscribe, flush } from "../store/commands.js";
import { getProgress } from "../store/selectors.js";
import {
  STATUS,
  PASSED_STATUSES,
  ECTS_PER_TERM,
  buildSubjectRows,
  buildCourseBars,
  buildSummary,
  buildProjection,
  buildEquivalenceRows,
} from "../progress/index.js";

// Orden de despliegue de los estados en el <select> (no el orden de STATUS):
// de "tengo que empezarla" a "ya la tengo".
const STATUS_ORDER = [STATUS.PENDIENTE, STATUS.EN_CURSO, STATUS.SUPERADA, STATUS.CONVALIDADA];
const STATUS_LABELS = {
  [STATUS.PENDIENTE]: "Pendiente",
  [STATUS.EN_CURSO]: "Cursando",
  [STATUS.SUPERADA]: "Superada",
  [STATUS.CONVALIDADA]: "Convalidada",
};
const ESTADO_LABELS = {
  pendiente: "Pendiente",
  solicitada: "Solicitada",
  concedida: "Concedida",
  denegada: "Denegada",
};
const SOURCE_LABELS = { uned: "UNED", gs: "Grado Superior" };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) =>
    ch === "&"
      ? "&amp;"
      : ch === "<"
        ? "&lt;"
        : ch === ">"
          ? "&gt;"
          : ch === '"'
            ? "&quot;"
            : "&#39;",
  );
}

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
 * Catálogo de equivalencias (global de convalidaciones.js): es la fuente de
 * las ENTRADAS, no de los estados — esos viven en el store
 * (progress.equivalences) y los lee buildEquivalenceRows de ahí. Se devuelve
 * el array crudo, sin attachar estados de localStorage. El array global es
 * un `const` de script clásico, igual que SUBJECTS, así que se comprueba
 * globalThis y después el identificador.
 */
function getRawConvalidaciones() {
  if (Array.isArray(globalThis.CONVALIDACIONES)) return globalThis.CONVALIDACIONES;
  if (typeof CONVALIDACIONES !== "undefined" && Array.isArray(CONVALIDACIONES)) {
    return CONVALIDACIONES;
  }
  return [];
}

function getProgressApi() {
  const api = typeof window !== "undefined" ? window.__ugrProgress : null;
  return api && typeof api.setStatus === "function" ? api : null;
}

function statusSelect(row, canWrite) {
  // El código es la clave del select: sirve de id estable para el <label> y
  // para recuperar el foco tras un re-render.
  const id = `progress-status-${String(row.code).replace(/[^\w-]/g, "-")}`;
  const options = STATUS_ORDER.map(
    (value) =>
      `<option value="${value}"${value === row.status ? " selected" : ""}>${STATUS_LABELS[value]}</option>`,
  ).join("");
  return `<label class="progress-visually-hidden" for="${id}">Estado de ${escapeHtml(row.code)} — ${escapeHtml(
    row.name,
  )}</label>
    <select id="${id}" class="progress-status-select" data-code="${escapeHtml(row.code)}"${
      canWrite ? "" : " disabled"
    }>${options}</select>`;
}

/**
 * Bloque de backup/restore (Fase 5.4). `bundle.js` se importa en diferido:
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

export function setupProgressDashboard() {
  const root = document.getElementById("progress-dashboard");
  // Modo degradado: sin la sección (HTML antiguo en caché, o vista no montada)
  // no hay nada que renderizar y la app no debe fallar por eso.
  if (!root) return;
  const summaryEl = document.getElementById("progress-summary");
  const emptyEl = document.getElementById("progress-empty");
  const barsEl = document.getElementById("progress-course-bars");
  const projectionEl = document.getElementById("progress-projection");
  const subjectsEl = document.getElementById("progress-subjects");
  const equivalencesEl = document.getElementById("progress-equivalences");
  if (!summaryEl || !barsEl || !projectionEl || !subjectsEl || !equivalencesEl) return;
  if (root.dataset.progressBound === "1") return;
  root.dataset.progressBound = "1";
  // Una sola vez, junto al resto del dashboard: si el bloque no está en el
  // HTML, setupBackupBlock se sale sin enganchar nada.
  setupBackupBlock();

  // Clave de lo que cambia el render: si el store notifica por un cambio que
  // no afecta al progreso (selección del solver, UI…) no se repinta la tabla.
  let lastKey = null;

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
    summaryEl.innerHTML = `<div class="progress-kpis">
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.ectsPassed}</span><span class="progress-kpi-label">ECTS superados</span></div>
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.ectsEnrolled}</span><span class="progress-kpi-label">ECTS en curso</span></div>
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.ectsPending}</span><span class="progress-kpi-label">ECTS pendientes</span></div>
        <div class="progress-kpi"><span class="progress-kpi-value">${summary.pct}%</span><span class="progress-kpi-label">del grado (${summary.totalECTS} ECTS)</span></div>
      </div>
      <p class="progress-hint">${summary.counts.passed} asignaturas superadas · ${summary.counts.enrolled} en curso · ${summary.counts.pending} pendientes</p>`;
  }

  function renderCourseBars(bars) {
    // role/aria van en la barra, no en el contenedor: es el valor numérico el
    // que anuncia el progreso. El texto de al lado repite el dato para que el
    // color no sea la única señal.
    barsEl.innerHTML =
      "<h3>Barras por curso</h3>" +
      bars
        .map((bar) => {
          const title = bar.curso === "plan" ? "Total del grado" : courseLabel(bar.curso);
          const label = `${title}: ${bar.passedECTS} de ${bar.totalECTS} ECTS superados, ${bar.pct}%`;
          return `<div class="progress-bar-row${bar.curso === "plan" ? " is-plan" : ""}">
            <div class="progress-bar-head">
              <span class="progress-bar-title">${escapeHtml(title)}</span>
              <span class="progress-bar-meta">${bar.passedECTS} / ${bar.totalECTS} ECTS · ${bar.pct}%</span>
            </div>
            <div class="progress-bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                 aria-valuenow="${bar.pct}" aria-valuetext="${escapeHtml(
                   `${bar.passedECTS} de ${bar.totalECTS} ECTS superados`,
                 )}" aria-label="${escapeHtml(label)}">
              <span class="progress-bar-fill" style="width:${bar.pct}%"></span>
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

  function renderSubjects(rows, canWrite) {
    // Las filas llegan ya ordenadas por curso: agrupar es detectar cambios de
    // curso seguidos, sin volver a ordenar aquí.
    const groups = [];
    for (const row of rows) {
      const last = groups[groups.length - 1];
      if (!last || last.curso !== row.curso) groups.push({ curso: row.curso, rows: [row] });
      else last.rows.push(row);
    }

    const hint = canWrite
      ? ""
      : `<p class="progress-hint progress-hint-warning">El módulo de progreso no está disponible en esta sesión: los estados son de solo lectura.</p>`;

    let body = "";
    for (const group of groups) {
      const totalECTS = group.rows.reduce((sum, row) => sum + row.ects, 0);
      const passedECTS = group.rows
        .filter((row) => PASSED_STATUSES.includes(row.status))
        .reduce((sum, row) => sum + row.ects, 0);
      body += `<tr class="progress-course-sep"><th colspan="5" scope="rowgroup">${escapeHtml(
        courseLabel(group.curso),
      )} · ${passedECTS}/${totalECTS} ECTS superados</th></tr>`;
      for (const row of group.rows) {
        body += `<tr>
          <td class="td-codigo">${escapeHtml(row.code)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${row.ects}</td>
          <td>${escapeHtml(termLabel(row.term))}</td>
          <td class="progress-status-cell">${statusSelect(row, canWrite)}</td>
        </tr>`;
      }
    }

    subjectsEl.innerHTML = `${hint}<div class="manage-table-wrapper">
      <table class="manage-table progress-table">
        <caption class="progress-visually-hidden">Asignaturas del catálogo con su estado</caption>
        <thead><tr>
          <th scope="col">Código</th><th scope="col">Asignatura</th><th scope="col">ECTS</th>
          <th scope="col">Cuatrimestre</th><th scope="col">Estado</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  }

  function renderEquivalences(rows) {
    if (!rows.length) {
      equivalencesEl.innerHTML =
        "<h3>Equivalencias</h3><p class=\"empty-state\">No hay equivalencias UNED / Grado Superior registradas todavía.</p>";
      return;
    }
    const orphans = rows.filter((row) => row.orphan).length;
    const body = rows
      .map((row) => {
        const estado = row.estado
          ? `<span class="progress-badge progress-badge-estado-${escapeHtml(row.estado)}">${
              ESTADO_LABELS[row.estado] || row.estado
            }</span>`
          : '<span class="progress-badge progress-badge-muted">Sin estado</span>';
        const plan = row.orphan
          ? `<span class="progress-badge progress-badge-orphan">⚠ Fuera del catálogo</span><small class="progress-orphan-reason">${escapeHtml(
              row.reason,
            )}</small>`
          : row.recognizedPassed
            ? '<span class="progress-badge progress-badge-passed">✓ Superada</span>'
            : '<span class="progress-badge progress-badge-pending">Pendiente</span>';
        const origin = `<span class="td-codigo">${escapeHtml(row.from.code || "—")}</span>${
          row.from.name ? `<br><small>${escapeHtml(row.from.name)}</small>` : ""
        }`;
        const target = `<span class="td-codigo">${escapeHtml(row.to.code || "—")}</span>${
          row.to.name ? `<br><small>${escapeHtml(row.to.name)}</small>` : ""
        }`;
        return `<tr class="${row.orphan ? "is-orphan" : ""}">
          <td>${origin}</td>
          <td>${target}</td>
          <td>${row.ects || "—"}</td>
          <td><span class="progress-badge progress-badge-source-${escapeHtml(row.source)}">${
            SOURCE_LABELS[row.source] || row.source
          }</span></td>
          <td>${estado}</td>
          <td>${plan}</td>
        </tr>`;
      })
      .join("");

    equivalencesEl.innerHTML = `<h3>Equivalencias UNED / Grado Superior → UGR</h3>
      <div class="manage-table-wrapper">
        <table class="manage-table progress-table">
          <caption class="progress-visually-hidden">Equivalencias de otras enseñanzas reconocidas en la UGR</caption>
          <thead><tr>
            <th scope="col">Origen</th><th scope="col">Reconocida UGR</th><th scope="col">ECTS</th>
            <th scope="col">Tipo</th><th scope="col">Estado convalidación</th><th scope="col">En el plan</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>${
        orphans
          ? `<p class="progress-hint">${
              orphans === 1
                ? "1 equivalencia apunta"
                : `${orphans} equivalencias apuntan`
            } a un código UGR que no está en el catálogo activo.</p>`
          : ""
      }`;
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
    const rows = buildSubjectRows(subjects, credits);
    const summary = buildSummary(subjects, credits, progress.plan);

    renderSummary(summary);
    if (emptyEl) emptyEl.hidden = rows.length > 0;
    if (rows.length) {
      renderCourseBars(buildCourseBars(subjects, credits, progress.plan));
      renderSubjects(rows, Boolean(getProgressApi()));
    } else {
      barsEl.innerHTML = "";
      subjectsEl.innerHTML = "";
    }
    renderProjection(buildProjection(subjects, credits, progress.plan), summary);
    renderEquivalences(
      buildEquivalenceRows(progress.equivalences, getRawConvalidaciones(), subjects, credits),
    );
    restoreFocus(focusId);
  }

  // El cambio de estado se delega en el contenedor: el re-render sustituye los
  // selects, así que volver a enganchar uno en uno perdería el listener.
  subjectsEl.addEventListener("change", (event) => {
    const select = event.target;
    if (!select || select.tagName !== "SELECT" || !select.classList.contains("progress-status-select")) return;
    const api = getProgressApi();
    const code = select.dataset.code;
    if (!api || !code) return;
    // setStatus false = el store rechazó el comando: repintar devuelve el
    // select al estado real en lugar de dejar un valor que no se guardó.
    if (!api.setStatus(code, select.value)) render(true);
  });

  // Sin refresh por pestaña: los estados viven en el store y subscribe()
  // repinta cuando cambian. El conmutador de app.js ya muestra la vista.
  document.addEventListener("ugr:catalogUpdated", () => render(true));
  subscribe(() => render(false));

  render(true);
}

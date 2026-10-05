import { parseCSV } from "../ingest/parseCSV.js";
import { parseTable } from "../ingest/parseTable.js";
import { parseJSON } from "../ingest/parseJSON.js";
import { buildCatalog, rowsToRecords, REQUIRED_MAPPING_FIELDS } from "../ingest/buildCatalog.js";
import { TEMPLATE_MAPPING, buildTemplateCSV } from "../ingest/template.js";

const FIELD_ORDER = [
  "codigo",
  "nombre",
  "curso",
  "cuatrimestre",
  "creditos",
  "grupo",
  "turno",
  "tipo",
  "subgrupo",
  "dia",
  "inicio",
  "fin",
];

const FIELD_LABELS = {
  codigo: "Código",
  nombre: "Nombre",
  curso: "Curso",
  cuatrimestre: "Cuatrimestre",
  creditos: "Créditos",
  grupo: "Grupo",
  turno: "Turno",
  tipo: "Tipo de sesión",
  subgrupo: "Subgrupo",
  dia: "Día",
  inicio: "Inicio",
  fin: "Fin",
};

const SYNONYMS = {
  codigo: ["codigo", "code", "cod", "asignatura", "asig"],
  nombre: ["nombre", "name", "titulo", "denominacion"],
  curso: ["curso", "course", "anyo"],
  cuatrimestre: ["cuatrimestre", "semestre", "term"],
  creditos: ["creditos", "ects"],
  grupo: ["grupo", "group", "letra"],
  turno: ["turno", "shift"],
  tipo: ["tipo", "type", "sesion"],
  subgrupo: ["subgrupo", "sub"],
  dia: ["dia", "day", "jornada"],
  inicio: ["inicio", "comienzo", "start", "desde"],
  fin: ["fin", "end", "hasta"],
};

const DAY_LABELS = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
};

const SAVE_ERRORS = {
  store_unavailable:
    "IndexedDB no está disponible: no se pudo guardar el catálogo (modo degradado). Exporta tus datos para no perderlos.",
  invalid_catalog: "El catálogo construido no supera la validación interna.",
  missing_meta: "Faltan datos de identificación (universidad, titulación o versión).",
  not_found: "No se encontró el catálogo guardado.",
};

const MAX_ERROR_ROWS = 50;
const MAX_PREVIEW_SUBJECTS = 40;

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

function stripAccents(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normHeader(value) {
  return stripAccents(String(value ?? "").toLowerCase()).replace(/\s+/g, " ").trim();
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function randomToken() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function detectMapping(headers) {
  const normalized = headers.map(normHeader);
  const used = new Set();
  const mapping = {};
  for (const field of FIELD_ORDER) {
    const target = normHeader(TEMPLATE_MAPPING[field] || "");
    if (!target) continue;
    const index = normalized.findIndex((value, i) => !used.has(i) && value === target);
    if (index >= 0) {
      mapping[field] = headers[index];
      used.add(index);
    }
  }
  for (const field of FIELD_ORDER) {
    if (mapping[field]) continue;
    const words = SYNONYMS[field] || [];
    let index = normalized.findIndex((value, i) => !used.has(i) && words.includes(value));
    if (index < 0) {
      index = normalized.findIndex(
        (value, i) => !used.has(i) && words.some((word) => word.length > 2 && value.includes(word)),
      );
    }
    if (index >= 0) {
      mapping[field] = headers[index];
      used.add(index);
    }
  }
  for (const field of FIELD_ORDER) {
    if (!mapping[field]) mapping[field] = "";
  }
  return mapping;
}

function countGroups(catalog) {
  return catalog.subjects.reduce((total, subject) => total + (subject.grupos || []).length, 0);
}

function countSessions(catalog) {
  let total = 0;
  for (const subject of catalog.subjects) {
    for (const group of subject.grupos || []) {
      total += (group.teoria || []).length;
      const practicas = group.practicas || {};
      for (const sg of practicas.subgrupos || []) {
        total += (Array.isArray(practicas[sg]) ? practicas[sg] : []).length;
      }
    }
  }
  return total;
}

function sessionLabel(session) {
  const day = DAY_LABELS[session.dia] || session.dia;
  return `${day} ${session.inicio}–${session.fin}`;
}

export function setupImportWizard() {
  const modal = document.getElementById("import-wizard-modal");
  const openBtn = document.getElementById("btn-open-import-wizard");
  if (!modal || !openBtn || openBtn.dataset.wizardBound === "1") return;
  openBtn.dataset.wizardBound = "1";

  const byId = (id) => document.getElementById(id);
  const panels = Array.from(modal.querySelectorAll(".wizard-panel"));
  const indicators = Array.from(modal.querySelectorAll(".wizard-step-indicator"));
  const sourceOptions = Array.from(modal.querySelectorAll(".wizard-source-option"));
  const radios = sourceOptions.map((option) => option.querySelector("input")).filter(Boolean);

  const closeBtn = byId("import-wizard-close");
  const backBtn = byId("wizard-back");
  const nextBtn = byId("wizard-next");
  const errorEl = byId("wizard-step-error");
  const textarea = byId("wizard-text");
  const fileInput = byId("wizard-file");
  const dropzone = byId("wizard-dropzone");
  const loadInfo = byId("wizard-load-info");
  const mappingWrap = byId("wizard-mapping");
  const sampleWrap = byId("wizard-map-sample");
  const warningsWrap = byId("wizard-map-warnings");
  const summaryWrap = byId("wizard-summary");
  const errorsWrap = byId("wizard-errors");
  const previewWrap = byId("wizard-preview");
  const universityInput = byId("wizard-university");
  const degreeInput = byId("wizard-degree");
  const planInput = byId("wizard-plan");
  const versionInput = byId("wizard-version");
  const successEl = byId("wizard-import-success");

  if (!nextBtn || !backBtn || !textarea || !mappingWrap || !versionInput) return;

  const state = {
    source: "csv",
    step: 1,
    text: "",
    headers: [],
    records: [],
    problems: [],
    mapping: {},
    catalog: null,
    errors: [],
    headerDetected: false,
    fallbackVersion: "",
  };

  function kind() {
    if (state.source === "json") return "json";
    if (state.source === "table") return "table";
    return "csv";
  }

  function sequence() {
    return kind() === "json" ? [1, 2, 4, 5] : [1, 2, 3, 4, 5];
  }

  function stepError(message) {
    errorEl.textContent = message || "";
  }

  function clearStepError() {
    errorEl.textContent = "";
  }

  function updateFileAccept() {
    fileInput.accept = kind() === "json" ? ".json,application/json" : ".csv,.tsv,.txt";
  }

  function selectSource(value) {
    state.source = value;
    radios.forEach((radio) => {
      radio.checked = radio.value === value;
    });
    sourceOptions.forEach((option) => {
      option.classList.toggle("selected", option.dataset.source === value);
    });
    updateFileAccept();
  }

  function fillTemplate() {
    const csv = buildTemplateCSV();
    textarea.value = csv;
    state.text = csv;
    loadInfo.textContent = "Plantilla de ejemplo cargada en el paso 2.";
  }

  function displayDataRow(index) {
    if (index === null || index === undefined) return "—";
    return String(index + 1);
  }

  function displaySourceRow(index) {
    if (index === null || index === undefined) return "—";
    return String(state.headerDetected ? index : index + 1);
  }

  function renderMapping() {
    mappingWrap.innerHTML = FIELD_ORDER.map((field) => {
      const required = REQUIRED_MAPPING_FIELDS.includes(field);
      const options = [
        '<option value="">— sin columna —</option>',
        ...state.headers.map(
          (header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`,
        ),
      ].join("");
      return `<div class="wizard-map-field">
        <label for="wizard-map-${field}">${escapeHtml(FIELD_LABELS[field])}${
          required ? ' <span class="wizard-req">*</span>' : ""
        }</label>
        <select id="wizard-map-${field}" data-field="${field}">${options}</select>
      </div>`;
    }).join("");

    FIELD_ORDER.forEach((field) => {
      const select = byId(`wizard-map-${field}`);
      if (!select) return;
      const value = state.headers.includes(state.mapping[field]) ? state.mapping[field] : "";
      select.value = value;
      state.mapping[field] = value;
      select.addEventListener("change", () => {
        state.mapping[field] = select.value;
        clearStepError();
      });
    });

    const rows = state.records.slice(0, 3);
    sampleWrap.innerHTML = state.headers.length
      ? `<div class="wizard-sample">
          <table class="wizard-sample-table">
            <thead><tr>${state.headers
              .map((header) => `<th>${escapeHtml(header)}</th>`)
              .join("")}</tr></thead>
            <tbody>${rows
              .map(
                (row) =>
                  `<tr>${state.headers
                    .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
                    .join("")}</tr>`,
              )
              .join("")}
            </tbody>
          </table>
          <p class="wizard-hint">${state.records.length} filas de datos · ${
            state.headers.length
          } columnas${state.headerDetected ? "" : " · sin cabecera detectada (numera las columnas)"}${
            state.problems.length ? ` · ${state.problems.length} avisos de lectura` : ""
          }</p>
        </div>`
      : "";

    warningsWrap.innerHTML = state.problems.length
      ? `<div class="wizard-warnings"><strong>Avisos de lectura (no bloquean):</strong><ul>${state.problems
          .slice(0, 20)
          .map(
            (problem) =>
              `<li>Fila ${escapeHtml(displaySourceRow(problem.row))}: ${escapeHtml(
                problem.message,
              )}</li>`,
          )
          .join("")}${
            state.problems.length > 20
              ? `<li>… y ${state.problems.length - 20} avisos más</li>`
              : ""
          }</ul></div>`
      : "";
  }

  function renderCatalogPreview(catalog) {
    const subjects = catalog.subjects.slice(0, MAX_PREVIEW_SUBJECTS);
    const body = subjects
      .map((subject) => {
        const groups = (subject.grupos || [])
          .map((group) => {
            const practicas = group.practicas || {};
            const lines = [];
            if ((group.teoria || []).length) {
              lines.push(
                `<div>Teoría: ${group.teoria.map(sessionLabel).map(escapeHtml).join(" · ")}</div>`,
              );
            }
            for (const sg of practicas.subgrupos || []) {
              const sessions = Array.isArray(practicas[sg]) ? practicas[sg] : [];
              lines.push(
                `<div>Práctica ${escapeHtml(sg)}: ${sessions
                  .map(sessionLabel)
                  .map(escapeHtml)
                  .join(" · ")}</div>`,
              );
            }
            const badge = group.turno === "tarde" ? "tarde" : "mañana";
            return `<div class="wizard-preview-group">
              <span class="wizard-preview-group-title">Grupo ${escapeHtml(group.letra)}
                <span class="turno-badge ${badge}">${escapeHtml(group.turno)}</span>
              </span>
              ${lines.join("")}
            </div>`;
          })
          .join("");
        return `<div class="wizard-preview-subject">
          <div class="wizard-preview-subject-head"><strong>${escapeHtml(
            subject.codigo,
          )}</strong> — ${escapeHtml(subject.nombre)}
            <span class="wizard-preview-meta">${escapeHtml(subject.curso)}º · ${escapeHtml(
              subject.cuatrimestre,
            )}º cuatr. · ${escapeHtml(subject.creditos)} ECTS</span>
          </div>
          ${groups}
        </div>`;
      })
      .join("");
    const rest = catalog.subjects.length - subjects.length;
    return `<h3 class="wizard-preview-title">Vista previa del catálogo</h3>${body}${
      rest > 0 ? `<p class="wizard-hint">… y ${rest} asignaturas más.</p>` : ""
    }`;
  }

  function renderPreview() {
    const catalog = state.catalog;
    const stats = [];
    if (catalog) {
      stats.push(["Asignaturas", catalog.subjects.length]);
      stats.push(["Grupos", countGroups(catalog)]);
      stats.push(["Sesiones", countSessions(catalog)]);
    }
    if (kind() === "json") {
      stats.push(["Errores", state.errors.length]);
    } else {
      const invalid = new Set(
        state.errors.filter((error) => error.row !== null && error.row !== undefined).map((error) => error.row),
      ).size;
      stats.push(["Filas válidas", Math.max(0, state.records.length - invalid)]);
      stats.push(["Filas inválidas", invalid]);
    }
    summaryWrap.innerHTML = stats
      .map(([label, value]) => `<span class="wizard-stat">${label}: <strong>${value}</strong></span>`)
      .join("");

    if (state.errors.length) {
      const shown = state.errors.slice(0, MAX_ERROR_ROWS);
      errorsWrap.innerHTML = `<div class="wizard-errors">
        <h3>${state.errors.length} error${state.errors.length === 1 ? "" : "es"} — el catálogo NO se ha creado</h3>
        <p class="wizard-hint">Filas numeradas sin contar la cabecera. Vuelve atrás para corregir los datos.</p>
        <table>
          <thead><tr><th>Fila</th><th>Campo</th><th>Error</th></tr></thead>
          <tbody>${shown
            .map(
              (error) =>
                `<tr><td>${escapeHtml(displayDataRow(error.row))}</td><td>${escapeHtml(
                  error.path || "—",
                )}</td><td>${escapeHtml(error.message)}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
        ${state.errors.length > shown.length ? `<p class="wizard-hint">… y ${state.errors.length - shown.length} errores más.</p>` : ""}
        <button type="button" class="btn btn-secondary btn-sm" id="wizard-fix">Corregir datos</button>
      </div>`;
      const fixBtn = byId("wizard-fix");
      if (fixBtn) fixBtn.addEventListener("click", back);
    } else {
      errorsWrap.innerHTML = "";
    }

    previewWrap.innerHTML = catalog
      ? renderCatalogPreview(catalog)
      : '<p class="empty-state">No se pudo construir la vista previa: corrige los errores para continuar.</p>';
  }

  function renderStep() {
    panels.forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.panel) === state.step);
    });
    const seq = sequence();
    const current = seq.indexOf(state.step);
    indicators.forEach((indicator) => {
      const step = Number(indicator.dataset.step);
      const position = seq.indexOf(step);
      indicator.classList.toggle("active", position === current);
      indicator.classList.toggle("done", position >= 0 && position < current);
      indicator.classList.toggle("skipped", position === -1);
    });
    backBtn.disabled = current <= 0;
    nextBtn.textContent =
      state.step === 5 ? "Importar catálogo" : state.step === 4 ? "Continuar" : "Siguiente";
    nextBtn.disabled = state.step === 4 && !state.catalog;
    if (state.step === 3) renderMapping();
    if (state.step === 4) renderPreview();
  }

  function goTo(step) {
    state.step = step;
    clearStepError();
    renderStep();
  }

  function prepareTable() {
    let headers;
    let dataRows;
    let headerDetected;
    if (kind() === "table") {
      const result = parseTable(state.text);
      state.problems = result.problems || [];
      if (!result.rows.length || !result.headers) {
        stepError("No se reconoce la tabla: falta la fila de cabecera.");
        return false;
      }
      headers = result.headers;
      dataRows = result.rows.slice(1);
      headerDetected = true;
    } else {
      const result = parseCSV(state.text);
      state.problems = result.problems || [];
      if (!result.rows.length) {
        stepError("El contenido está vacío.");
        return false;
      }
      headerDetected = Boolean(result.hasHeader);
      headers = headerDetected ? result.headers : result.rows[0].map((_, i) => `Columna ${i + 1}`);
      dataRows = headerDetected ? result.rows.slice(1) : result.rows;
    }
    if (!dataRows.length) {
      stepError("Solo se detectó la cabecera: no hay filas de datos.");
      return false;
    }
    const trimmed = headers.map((header) => String(header).trim());
    const headersChanged = JSON.stringify(trimmed) !== JSON.stringify(state.headers);
    state.headers = trimmed;
    state.headerDetected = headerDetected;
    state.records = rowsToRecords(headers, dataRows);
    if (headersChanged || !Object.values(state.mapping).some((value) => value)) {
      state.mapping = detectMapping(trimmed);
    }
    state.catalog = null;
    state.errors = [];
    return true;
  }

  function prepareJson() {
    const result = parseJSON(state.text);
    state.catalog = result.catalog || null;
    state.errors = (result.errors || []).map((error) => ({
      row: error.row ?? null,
      path: error.path || "json",
      message: error.message,
    }));
    state.headers = [];
    state.records = [];
    state.problems = [];
    return true;
  }

  function runBuild() {
    const result = buildCatalog({ rows: state.records, mapping: state.mapping, meta: {} });
    state.catalog = result.catalog || null;
    state.errors = result.errors || [];
  }

  async function loadFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      textarea.value = text;
      state.text = text;
      loadInfo.textContent = `Archivo «${file.name}» cargado (${text.length} caracteres).`;
      clearStepError();
    } catch (error) {
      stepError("No se pudo leer el archivo seleccionado.");
    }
  }

  function buildFinalCatalog() {
    const previous = state.catalog.meta || {};
    const sources = Array.isArray(previous.sources) ? previous.sources.slice() : [];
    if (!sources.includes("user-import")) sources.push("user-import");
    const hash =
      typeof previous.hash === "string" && previous.hash
        ? previous.hash
        : fnv1a(JSON.stringify(state.catalog.subjects));
    return {
      ...state.catalog,
      meta: {
        ...previous,
        university: universityInput.value.trim() || "custom",
        degree: degreeInput.value.trim() || "custom",
        plan: planInput.value.trim() || "custom",
        version: versionInput.value.trim() || state.fallbackVersion,
        hash,
        sources,
      },
    };
  }

  function saveErrorMessage(result) {
    const base =
      (result && SAVE_ERRORS[result.error]) ||
      `No se pudo guardar el catálogo (${result && result.error ? result.error : "error desconocido"}).`;
    if (result && Array.isArray(result.errors) && result.errors.length) {
      return `${base} ${result.errors.slice(0, 3).join(", ")}`;
    }
    return base;
  }

  async function runImport() {
    clearStepError();
    successEl.textContent = "";
    if (!state.catalog) {
      stepError("No hay ningún catálogo válido para importar.");
      return;
    }
    const api = window.__ugrCatalog;
    if (!api || typeof api.saveCatalog !== "function") {
      stepError("El módulo de catálogos no está disponible en esta sesión.");
      return;
    }
    nextBtn.disabled = true;
    try {
      const saved = await api.saveCatalog(buildFinalCatalog());
      if (!saved || !saved.ok) {
        stepError(saveErrorMessage(saved));
        return;
      }
      const activated = await api.setActiveCatalogKey(saved.id);
      if (!activated || !activated.ok) {
        stepError(
          `Catálogo «${saved.id}» guardado, pero no se pudo activar (${
            activated && activated.error ? activated.error : "error desconocido"
          }).`,
        );
        return;
      }
      successEl.textContent = `Catálogo «${saved.id}» importado y activado. Ya puedes generar horarios con él.`;
      window.setTimeout(closeWizard, 1800);
    } catch (error) {
      stepError(`Error inesperado al importar: ${error && error.message ? error.message : error}`);
    } finally {
      if (state.step === 5 && !successEl.textContent) nextBtn.disabled = false;
    }
  }

  async function next() {
    clearStepError();
    if (state.step === 1) {
      if (state.source === "template") fillTemplate();
      goTo(2);
      return;
    }
    if (state.step === 2) {
      state.text = textarea.value;
      if (!state.text.trim()) {
        stepError("Carga un archivo o pega el contenido para continuar.");
        return;
      }
      if (kind() === "json") {
        prepareJson();
        goTo(4);
      } else if (prepareTable()) {
        goTo(3);
      }
      return;
    }
    if (state.step === 3) {
      const missing = REQUIRED_MAPPING_FIELDS.filter((field) => !state.mapping[field]);
      if (missing.length) {
        stepError(`Falta mapear: ${missing.map((field) => FIELD_LABELS[field]).join(", ")}.`);
        return;
      }
      runBuild();
      goTo(4);
      return;
    }
    if (state.step === 4) {
      if (!state.catalog) {
        stepError("Corrige los errores del paso anterior para continuar.");
        return;
      }
      goTo(5);
      return;
    }
    await runImport();
  }

  function back() {
    clearStepError();
    const seq = sequence();
    const current = seq.indexOf(state.step);
    if (current > 0) goTo(seq[current - 1]);
  }

  function resetWizard() {
    state.source = "csv";
    state.step = 1;
    state.text = "";
    state.headers = [];
    state.records = [];
    state.problems = [];
    state.mapping = {};
    state.catalog = null;
    state.errors = [];
    state.headerDetected = false;
    state.fallbackVersion = `user-${randomToken()}`;
    textarea.value = "";
    loadInfo.textContent = "";
    successEl.textContent = "";
    universityInput.value = "";
    degreeInput.value = "";
    planInput.value = "custom";
    versionInput.value = "";
    versionInput.placeholder = state.fallbackVersion;
    selectSource("csv");
    clearStepError();
    renderStep();
  }

  function openWizard() {
    resetWizard();
    modal.classList.add("wizard-open");
  }

  function closeWizard() {
    modal.classList.remove("wizard-open");
  }

  openBtn.addEventListener("click", openWizard);
  closeBtn.addEventListener("click", closeWizard);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeWizard();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("wizard-open")) closeWizard();
  });

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      selectSource(radio.value);
      if (radio.value === "template") fillTemplate();
      clearStepError();
    });
  });

  textarea.addEventListener("input", () => {
    state.text = textarea.value;
    clearStepError();
  });

  fileInput.addEventListener("change", () => {
    loadFile(fileInput.files && fileInput.files[0]);
    fileInput.value = "";
  });

  ["dragover", "dragenter"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", (event) => {
    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length) loadFile(files[0]);
  });

  backBtn.addEventListener("click", back);
  nextBtn.addEventListener("click", next);

  selectSource("csv");
}

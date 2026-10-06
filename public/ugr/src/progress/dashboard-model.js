import { STATUS, PASSED_STATUSES, isValidStatus, normalizeEstado } from "./status.js";
import { isPassed } from "./filter.js";
import {
  summarize,
  projectDegree,
  mapEquivalences,
  subjectCode,
  subjectEcts,
  subjectCourse,
  subjectTerm,
  DEFAULT_TOTAL_ECTS,
} from "./summary.js";

/**
 * View-model puro del dashboard de progreso (Fase 5.2).
 *
 * Sin DOM y sin store: todo llega por parámetro, así el módulo es testeable en
 * node y la única capa que toca elementos es src/ui/progress-dashboard.js.
 * Todas las funciones toleran datos parciales (subjects/credits/plan ausentes
 * o de otro formato) y estados inválidos: un userState antiguo o un catálogo a
 * medias no debe romper el render.
 */

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function asCredits(value) {
  return value && typeof value === "object" ? value : {};
}

function subjectName(subject) {
  return subject?.nombre || subject?.name || "";
}

// Mismo criterio que summarize: sin estado válido la asignatura cuenta como
// pendiente, nunca como superada.
function effectiveStatus(credits, code) {
  const status = credits[code];
  return isValidStatus(status) ? status : STATUS.PENDIENTE;
}

// subjectCourse devuelve "Opt" para las optativas: se ordenan al final para
// que la UI pueda pintar su fila después de los cursos numéricos.
function courseRank(curso) {
  return curso === "Opt" ? Number.MAX_SAFE_INTEGER : Number(curso) || 0;
}

function byCourseTermName(a, b) {
  return (
    courseRank(a.curso) - courseRank(b.curso) ||
    a.term - b.term ||
    a.name.localeCompare(b.name) ||
    a.code.localeCompare(b.code)
  );
}

// Entero 0-100: los mismos números que muestra la UI y que lee aria-valuenow.
function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

/**
 * Una fila por asignatura con los datos normalizados para la tabla del
 * dashboard, ya con estado efectivo (pendiente si no estaba marcada).
 * El orden (curso → cuatrimestre → nombre) es el que reutilizan las barras y
 * la agrupación por curso de la UI.
 */
export function buildSubjectRows(subjects, credits) {
  const map = asCredits(credits);
  const rows = [];
  for (const subject of asList(subjects)) {
    const code = subjectCode(subject);
    // Sin código no hay clave de estado ni forma de llamar a setStatus.
    if (!code) continue;
    rows.push({
      code,
      name: subjectName(subject) || code,
      curso: subjectCourse(subject),
      term: subjectTerm(subject),
      ects: subjectEcts(subject),
      status: effectiveStatus(map, code),
    });
  }
  return rows.sort(byCourseTermName);
}

/**
 * Una barra por curso (más la de optativas si el catálogo las trae) y una
 * fila final `curso: "plan"` con el total de la titulación: sirve a la UI para
 * mostrar el agregado junto a los cursos sin recomputar summarize por su lado.
 * `pct` es superados/total del propio curso (en la fila de plan, sobre el
 * plan.totalECTS).
 */
export function buildCourseBars(subjects, credits, plan) {
  const rows = buildSubjectRows(subjects, credits);
  const summary = summarize(asList(subjects), asCredits(credits));

  const byCourse = new Map();
  for (const row of rows) {
    let bar = byCourse.get(row.curso);
    if (!bar) {
      bar = { curso: row.curso, totalECTS: 0, passedECTS: 0, pct: 0 };
      byCourse.set(row.curso, bar);
    }
    bar.totalECTS += row.ects;
    if (PASSED_STATUSES.includes(row.status)) bar.passedECTS += row.ects;
  }

  const bars = Array.from(byCourse.values()).sort((a, b) => courseRank(a.curso) - courseRank(b.curso));
  for (const bar of bars) {
    bar.pct = pct(bar.passedECTS, bar.totalECTS);
  }

  const planTotal = Number(plan?.totalECTS) || DEFAULT_TOTAL_ECTS;
  bars.push({
    curso: "plan",
    totalECTS: planTotal,
    passedECTS: summary.ectsPassed,
    pct: pct(summary.ectsPassed, planTotal),
  });
  return bars;
}

/**
 * Resumen de la cabecera: ECTS superados / en curso / pendientes y porcentaje
 * sobre el total del plan (240 por defecto), con el recuento de asignaturas.
 */
export function buildSummary(subjects, credits, plan) {
  const summary = summarize(asList(subjects), asCredits(credits));
  const totalECTS = Number(plan?.totalECTS) || DEFAULT_TOTAL_ECTS;
  return {
    ectsPassed: summary.ectsPassed,
    ectsEnrolled: summary.ectsEnrolled,
    ectsPending: summary.ectsPending,
    ectsTotal: summary.ectsTotal,
    counts: { passed: summary.passed, enrolled: summary.enrolled, pending: summary.pending },
    totalECTS,
    pct: pct(summary.ectsPassed, totalECTS),
  };
}

/**
 * Proyección de cierre (envuelve projectDegree) más el porcentaje de avance,
 * que es lo que pinta la UI del bloque de proyección.
 */
export function buildProjection(subjects, credits, plan) {
  const projection = projectDegree(asList(subjects), asCredits(credits), plan);
  return {
    passedECTS: projection.passedECTS,
    remainingECTS: projection.remainingECTS,
    termsRemaining: projection.termsRemaining,
    pct: pct(projection.passedECTS, projection.totalECTS),
  };
}

function entryEstado(entry) {
  return normalizeEstado(entry?.estado);
}

function endpointCode(endpoint) {
  if (!endpoint) return "";
  if (typeof endpoint === "string") return endpoint;
  return endpoint.codigo || endpoint.code || "";
}

function entryKey(entry) {
  // Dedupe por id cuando existe (CONVALIDACIONES lo trae) y de ultima por el
  // par origen/destino normalizado a mano: no se puede normalizar con
  // mapEquivalences antes de decidir, porque ese filtro descarta entradas.
  if (entry.id) return `id:${String(entry.id)}`;
  const from = endpointCode(entry.uned || entry.from || entry.cursadaCodigo);
  const to = endpointCode(entry.ugr || entry.to || entry.reconocidaCodigo);
  return to ? `pair:${from}|${to}` : "";
}

/**
 * Filas de la tabla de equivalencias UNED / Grado Superior → UGR.
 *
 * Acepta dos formas del segundo parámetro:
 * - mapa `{ [id]: { estado } }` (clave legacy `ugr-convalidaciones`);
 * - array legacy de CONVALIDACIONES, opcionalmente con `estado` ya colgado
 *   por la UI, que además aporta las propias entradas de equivalencia.
 *
 * Cada fila lleva `recognizedPassed` (la asignatura UGR reconocida está
 * superada según credits) y `orphan` (el código UGR no existe en el catálogo
 * activo), más `reason` cuando es huérfana.
 */
export function buildEquivalenceRows(equivalences, convalidaciones, subjects, credits) {
  const catalog = asList(subjects);
  const creditMap = asCredits(credits);

  const estadoMap = new Map();
  const legacy = asList(convalidaciones);
  if (convalidaciones && typeof convalidaciones === "object" && !Array.isArray(convalidaciones)) {
    for (const [id, value] of Object.entries(convalidaciones)) {
      const estado = normalizeEstado(value);
      if (id && estado) estadoMap.set(String(id), estado);
    }
  }
  for (const entry of legacy) {
    const estado = entryEstado(entry);
    if (entry?.id && estado) estadoMap.set(String(entry.id), estado);
  }

  const seen = new Set();
  const entries = [];
  const push = (entry) => {
    if (!entry || typeof entry !== "object") return;
    const key = entryKey(entry);
    if (key) {
      if (seen.has(key)) return;
      seen.add(key);
    }
    entries.push(entry);
  };
  for (const entry of asList(equivalences)) push(entry);
  for (const entry of legacy) push(entry);

  const rows = [];
  for (const entry of entries) {
    // mapEquivalences por entrada: reutiliza la normalización canónica
    // (uned/ugr vs cursada/reconocida) en vez de reimplementarla aquí.
    const { mappings, orphans } = mapEquivalences([entry], catalog);
    const normalized = mappings[0] || orphans[0];
    if (!normalized) continue;
    if (!normalized.from.code && !normalized.to.code) continue;
    const orphan = mappings.length === 0;
    const id = entry.id ? String(entry.id) : "";
    rows.push({
      id,
      from: normalized.from,
      to: normalized.to,
      ects: normalized.ects,
      source: normalized.source,
      estado: entryEstado(entry) ?? (id ? estadoMap.get(id) ?? null : null),
      recognizedPassed: isPassed(creditMap, normalized.to.code),
      orphan,
      reason: orphan ? normalized.reason : "",
    });
  }
  return rows;
}

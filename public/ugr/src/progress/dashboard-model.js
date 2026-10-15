import { compararAsignaturas, rangoDeCurso } from "../app/domain/plan.js";
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
 * View-model puro del dashboard de progreso.
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

/** Créditos de cada curso del plan: 240 en cuatro cursos. */
const ECTS_PER_COURSE = 60;

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
      caracter: subject?.caracter || "",
      mencion: subject?.mencion || "",
      status: effectiveStatus(map, code),
      // Sin estado propio la asignatura no está «pendiente»: está sin marcar.
      // Lo que está pendiente son los créditos.
      marked: isValidStatus(map[code]),
    });
  }
  // Mismo orden que la lista de datos: curso, cuatrimestre, tipo y nombre.
  return rows.sort(compararAsignaturas);
}

/**
 * Bloques de créditos del grado, en el orden en que los reparte la UGR: 60 de
 * formación básica, 90 obligatorias, 48 de materias de mención, 30 optativas
 * —las libres, que son las del núcleo común— y 12 del trabajo fin de grado.
 *
 * Los totales salen del catálogo (que trae carácter y créditos de cada
 * asignatura, incluidas las del plan sin horario) y suman los 240 de la
 * titulación: las materias de mención son las de **una** mención, no las de las
 * cinco, porque cada alumno cursa una.
 */
const BLOQUES_DE_CREDITOS = [
  { clave: "basica", etiqueta: "Formación básica", caracteres: ["Básica"] },
  { clave: "obligatoria", etiqueta: "Obligatorias", caracteres: ["Obligatoria"] },
  { clave: "mencion", etiqueta: "Materias de mención", caracteres: ["Obligatoria de Rama"], porMencion: true },
  // Las 30 optativas del plan se pueden cubrir con optativas de la mención o
  // con las libres (Derecho, Ética, Prácticas de Empresa), así que el bloque
  // cuenta todas y el total es el del plan, no la suma del catálogo.
  { clave: "optativa", etiqueta: "Optativas", caracteres: ["Optativa"], totalPlan: 30 },
  { clave: "tfg", etiqueta: "Trabajo fin de grado", caracteres: ["Trabajo Fin de Grado"] },
];

/**
 * Créditos superados y totales de cada bloque del grado.
 *
 * @param {Array} subjects asignaturas del catálogo (y del plan).
 * @param {Object} credits mapa `codigo → estado`.
 * @returns {Array<{clave: string, etiqueta: string, detalle: string, total: number,
 *   passed: number, count: number}>}
 */
export function buildCreditBreakdown(subjects, credits, mencionElegida = "") {
  const map = asCredits(credits);
  const lista = asList(subjects);
  const esComun = (s) => !s?.mencion || s.mencion === "Común";

  const superados = (dentro) =>
    dentro
      .filter((s) => PASSED_STATUSES.includes(effectiveStatus(map, subjectCode(s))))
      .reduce((sum, s) => sum + subjectEcts(s), 0);

  // De las cinco menciones se enseña la que más se lleva: el desglose una a una
  // está en el panel de menciones.
  const porMencion = new Map();
  for (const subject of lista) {
    if ((subject?.caracter || "") !== "Obligatoria de Rama" || esComun(subject)) continue;
    const clave = subject.mencion;
    const acumulado = porMencion.get(clave) || { total: 0, passed: 0, count: 0 };
    acumulado.total += subjectEcts(subject);
    acumulado.count += 1;
    porMencion.set(clave, acumulado);
  }
  for (const [clave, acumulado] of porMencion) {
    const dentro = lista.filter((s) => s.mencion === clave && (s?.caracter || "") === "Obligatoria de Rama");
    acumulado.passed = superados(dentro);
  }
  // Si no hay mención elegida se enseña la que más se lleva, pero el bloque dice
  // cuál es: la mención se pide y se asigna una.
  const ordenadas = [...porMencion.entries()].sort(
    (a, b) => b[1].passed - a[1].passed || a[0].localeCompare(b[0]),
  );
  const elegida = porMencion.has(mencionElegida) ? [mencionElegida, porMencion.get(mencionElegida)] : null;
  const mejorMencion = elegida || ordenadas[0];

  return BLOQUES_DE_CREDITOS.map((bloque) => {
    if (bloque.porMencion) {
      const [codigo, acumulado] = mejorMencion || ["", { total: 0, passed: 0, count: 0 }];
      return { ...bloque, detalle: codigo, total: acumulado.total, passed: acumulado.passed, count: acumulado.count };
    }
    const dentro = lista.filter((s) => bloque.caracteres.includes(s?.caracter || ""));
    const total = bloque.totalPlan || dentro.reduce((sum, s) => sum + subjectEcts(s), 0);
    return { ...bloque, detalle: "", total, passed: superados(dentro), count: dentro.length };
  });
}

/**
 * Estado de cada mención: los ECTS de su módulo superados y las materias que
 * faltan. La UGR lo dice así: el plan pide **48 ECTS de materias de mención**
 * (que se pueden cubrir con asignaturas de cualquier mención) y, para obtener
 * una mención concreta, hay que cursar **todas** las materias de su módulo de
 * especialidad. Por eso se informa de las que faltan, no solo del total.
 *
 * @param {Array} subjects asignaturas del catálogo.
 * @param {Object} credits mapa `codigo → estado`.
 * @param {Array} [menciones] menciones del catálogo (código y nombre largo).
 * @returns {Array<{codigo: string, nombre: string, total: number, passed: number,
 *   faltan: Array, completa: boolean}>}
 */
export function buildMenciones(subjects, credits, menciones = [], mencionElegida = "") {
  const map = asCredits(credits);
  const lista = asList(subjects);
  return asList(menciones)
    .map((mencion) => {
      const modulo = lista.filter(
        (s) => (s?.mencion || "") === mencion.codigo && (s?.caracter || "") === "Obligatoria de Rama",
      );
      const faltan = modulo
        .filter((s) => !PASSED_STATUSES.includes(effectiveStatus(map, subjectCode(s))))
        .map((s) => ({
          code: subjectCode(s),
          name: subjectName(s) || subjectCode(s),
          ects: subjectEcts(s),
        }));
      const total = modulo.reduce((sum, s) => sum + subjectEcts(s), 0);
      const passed = total - faltan.reduce((sum, s) => sum + s.ects, 0);
      return {
        codigo: mencion.codigo,
        nombre: mencion.nombre || "",
        total,
        passed,
        faltan,
        completa: modulo.length > 0 && faltan.length === 0,
        elegida: mencion.codigo === mencionElegida,
      };
    })
    .filter((mencion) => mencion.total > 0);
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
      // El plan son 60 ECTS por curso: el catálogo trae además las optativas de
      // todas las menciones, así que sumarlas daría un máximo que nadie cursa.
      bar = { curso: row.curso, totalECTS: ECTS_PER_COURSE, passedECTS: 0, pct: 0 };
      byCourse.set(row.curso, bar);
    }
    if (PASSED_STATUSES.includes(row.status)) bar.passedECTS += row.ects;
  }

  const bars = Array.from(byCourse.values()).sort((a, b) => rangoDeCurso(a) - rangoDeCurso(b));
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
    // Lo pendiente es lo que falta para el título (240), no la suma de todas las
    // asignaturas del catálogo: el catálogo trae las optativas de las cinco
    // menciones y nadie cursa las cinco.
    ectsPending: Math.max(0, totalECTS - summary.ectsPassed - summary.ectsEnrolled),
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

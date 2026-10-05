import { STATUS, PASSED_STATUSES, isValidStatus } from "./status.js";

// Normalización de campos: el catálogo legacy (data.js) usa codigo/creditos/
// curso/cuatrimestre y el esquema canónico (datasets) code/ects/course/term.
// Estas funciones evitan acoplar el progreso a un nombre de campo concreto.
export function subjectCode(subject) {
  return subject?.codigo || subject?.code || "";
}

export function subjectEcts(subject) {
  const value = subject?.creditos ?? subject?.ects;
  return Number(value) || 0;
}

export function subjectCourse(subject) {
  const value = subject?.curso ?? subject?.course;
  if (value === "Opt" || value === "opt") return "Opt";
  return Number(value) || 0;
}

export function subjectTerm(subject) {
  const value = subject?.cuatrimestre ?? subject?.term;
  return Number(value) || 0;
}

function emptyBucket() {
  return { passed: 0, enrolled: 0, pending: 0, ectsPassed: 0, ectsEnrolled: 0, ectsPending: 0 };
}

function addSubject(bucket, subject, status) {
  const ects = subjectEcts(subject);
  if (status === STATUS.EN_CURSO) {
    bucket.enrolled += 1;
    bucket.ectsEnrolled += ects;
  } else if (status === STATUS.PENDIENTE) {
    bucket.pending += 1;
    bucket.ectsPending += ects;
  } else if (PASSED_STATUSES.includes(status)) {
    bucket.passed += 1;
    bucket.ectsPassed += ects;
  }
}

/**
 * Resumen de progreso: ECTS superados (sup+pass), en curso (enroll) y
 * pendientes (pending + asignaturas sin marcar), con desglose por curso y
 * por cuatrimestre. `credits` es el mapa canónico { [code]: status }.
 */
export function summarize(subjects, credits = {}) {
  const list = Array.isArray(subjects) ? subjects : [];
  const total = emptyBucket();
  const byCourse = {};
  const byTerm = {};

  for (const subject of list) {
    const code = subjectCode(subject);
    if (!code) continue;
    // Sin estado explícito la asignatura cuenta como pendiente.
    const status = credits[code];
    const effective = isValidStatus(status) ? status : STATUS.PENDIENTE;
    const course = subjectCourse(subject);
    const term = subjectTerm(subject);

    addSubject(total, subject, effective);

    const courseKey = String(course);
    if (!byCourse[courseKey]) byCourse[courseKey] = emptyBucket();
    addSubject(byCourse[courseKey], subject, effective);

    const termKey = `${course}/${term}`;
    if (!byTerm[termKey]) byTerm[termKey] = { course, term, ...emptyBucket() };
    addSubject(byTerm[termKey], subject, effective);
  }

  return {
    ...total,
    ectsTotal: total.ectsPassed + total.ectsEnrolled + total.ectsPending,
    byCourse,
    byTerm,
  };
}

export const ECTS_PER_TERM = 30;
export const DEFAULT_TOTAL_ECTS = 240;

/**
 * Proyección de cierre del grado: cuatrimestres restantes asumiendo una carga
 * constante de ECTS_PER_TERM sobre plan.totalECTS. Los créditos en curso no
 * cuentan como superados hasta que pasan a sup/pass.
 */
export function projectDegree(subjects, credits = {}, plan = {}) {
  const totalECTS = Number(plan?.totalECTS) || DEFAULT_TOTAL_ECTS;
  const { ectsPassed } = summarize(subjects, credits);
  const remainingECTS = Math.max(0, totalECTS - ectsPassed);
  return {
    totalECTS,
    passedECTS: ectsPassed,
    remainingECTS,
    ectsPerTerm: ECTS_PER_TERM,
    termsRemaining: Math.ceil(remainingECTS / ECTS_PER_TERM),
  };
}

function normalizeEndpoint(endpoint, fallbackCode, fallbackName) {
  if (!endpoint) return { code: fallbackCode || "", name: fallbackName || "" };
  const code = endpoint.codigo || endpoint.code || fallbackCode || "";
  const name = endpoint.nombre || endpoint.name || fallbackName || "";
  return { code, name };
}

/**
 * Normaliza el mapa de equivalencias (UNED / Grado Superior → UGR) a la forma
 * canónica { from, to, ects, source } y detecta huérfanas: entradas cuyo
 * código UGR de destino no existe en el catálogo.
 */
export function mapEquivalences(equivalences, subjects = []) {
  const list = Array.isArray(equivalences) ? equivalences : [];
  const known = new Set(subjects.map(subjectCode).filter(Boolean));
  const mappings = [];
  const orphans = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const from = normalizeEndpoint(entry.uned || entry.from, entry.cursadaCodigo, entry.cursada);
    const to = normalizeEndpoint(entry.ugr || entry.to, entry.reconocidaCodigo, entry.reconocida);
    const ects = Number(entry.creditos ?? entry.ects) || 0;
    const source = String(entry.origen || "").includes("GS") ? "gs" : "uned";
    const mapping = { from, to, ects, source };
    if (to.code && known.has(to.code)) {
      mappings.push(mapping);
    } else {
      orphans.push({ ...mapping, reason: `código UGR no encontrado en el catálogo: ${to.code || "(vacío)"}` });
    }
  }

  return { mappings, orphans };
}

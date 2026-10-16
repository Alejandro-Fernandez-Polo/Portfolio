import { STATUS, PASSED_STATUSES, isValidStatus } from "./status.js";
import { destinosAprobados } from "./convalidaciones.js";

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
 * Resumen de progreso: ECTS superados (sup+pass y las convalidaciones aprobadas),
 * en curso (enroll) y pendientes (pending + asignaturas sin marcar), con desglose
 * por curso y por cuatrimestre. `credits` es el mapa canónico { [code]: status }.
 *
 * Las **convalidaciones aprobadas** cuentan como superadas sin que nadie las
 * marque: es la asignatura de destino la que pasa a «convalidada». Un estado
 * marcado a mano manda salvo que sea de los superados (entonces se respeta, que
 * también lo está).
 */
export function summarize(subjects, credits = {}, convalidaciones = []) {
  const list = Array.isArray(subjects) ? subjects : [];
  // Con el catálogo delante: un destino se resuelve también por nombre, así que
  // una convalidación vieja cuyo código cambió sigue contando.
  const aprobados = destinosAprobados(convalidaciones, list);
  const total = emptyBucket();
  const byCourse = {};
  const byTerm = {};

  for (const subject of list) {
    const code = subjectCode(subject);
    if (!code) continue;
    const manual = isValidStatus(credits[code]) ? credits[code] : null;
    const convalidada = aprobados.has(code) ? STATUS.CONVALIDADA : null;
    // Sin estado explícito la asignatura cuenta como pendiente.
    const effective = manual && PASSED_STATUSES.includes(manual) ? manual : convalidada || manual || STATUS.PENDIENTE;
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

/** Total informativo de suspensos. No toca los ECTS: solo se cuenta. */
export function countFails(fails) {
  const map = fails && typeof fails === "object" ? fails : {};
  return Object.values(map).reduce((total, value) => total + (Number(value) || 0), 0);
}

/**
 * Normaliza el mapa de suspensos `{ [code]: n }`: enteros entre 0 y 99 y sin
 * ceros (el 0 significa «sin suspensos» y no se guarda).
 */
export function normalizeFails(fails) {
  const map = fails && typeof fails === "object" ? fails : {};
  const out = {};
  for (const [code, value] of Object.entries(map)) {
    const n = Math.max(0, Math.min(99, Math.floor(Number(value) || 0)));
    if (code && n) out[String(code)] = n;
  }
  return out;
}

export const ECTS_PER_TERM = 30;
export const DEFAULT_TOTAL_ECTS = 240;

/**
 * Proyección de cierre del grado: cuatrimestres restantes asumiendo una carga
 * constante de ECTS_PER_TERM sobre plan.totalECTS. Los créditos en curso no
 * cuentan como superados hasta que pasan a sup/pass (o los reconoce una
 * convalidación aprobada).
 */
export function projectDegree(subjects, credits = {}, plan = {}, convalidaciones = []) {
  const totalECTS = Number(plan?.totalECTS) || DEFAULT_TOTAL_ECTS;
  const { ectsPassed } = summarize(subjects, credits, convalidaciones);
  const remainingECTS = Math.max(0, totalECTS - ectsPassed);
  return {
    totalECTS,
    passedECTS: ectsPassed,
    remainingECTS,
    ectsPerTerm: ECTS_PER_TERM,
    termsRemaining: Math.ceil(remainingECTS / ECTS_PER_TERM),
  };
}

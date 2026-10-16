export { STATUS, PASSED_STATUSES, SELECTABLE_STATUSES, isValidStatus, ESTADO, isValidEstado, normalizeEstado } from "./status.js";
export { isPassed, solvableCodes } from "./filter.js";
export {
  normalizeConvalidacion,
  normalizeConvalidaciones,
  destinosAprobados,
  gruposDeConvalidaciones,
  convalidacionDeDestino,
  DESTINO_LIBRE,
  esDestinoLibre,
} from "./convalidaciones.js";
export {
  summarize,
  projectDegree,
  countFails,
  subjectCode,
  subjectEcts,
  subjectCourse,
  subjectTerm,
  ECTS_PER_TERM,
  DEFAULT_TOTAL_ECTS,
} from "./summary.js";
export {
  buildSubjectRows,
  buildCourseBars,
  buildCreditBreakdown,
  buildMenciones,
  buildSummary,
  buildProjection,
  buildConvalidaciones,
} from "./dashboard-model.js";

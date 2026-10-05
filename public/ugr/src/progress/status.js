// Estados canónicos del progreso por asignatura. El reducer valida contra
// STATUS antes de escribir en userState.progress, así que cualquier estado
// nuevo debe declararse aquí para ser aceptado por progress/setStatus.
export const STATUS = {
  SUPERADA: "sup", // aprobada por examen en la propia universidad
  CONVALIDADA: "pass", // superada por convalidación / equivalencia
  EN_CURSO: "enroll", // matriculada, aún sin superar
  PENDIENTE: "pending", // planificada pero no empezada
};

export const PASSED_STATUSES = [STATUS.SUPERADA, STATUS.CONVALIDADA];

export function isValidStatus(status) {
  return Object.values(STATUS).includes(status);
}

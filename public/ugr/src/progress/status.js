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

// Estados del flujo de convalidación (UNED / Grado Superior → UGR). Viven
// dentro de progress.equivalences[i].estado: el reducer los valida antes de
// escribir en el store y buildEquivalenceRows los lee de ahí. Son independientes
// de STATUS (que es por asignatura): una equivalencia se concede/denega aunque
// la asignatura UGR de destino aún no esté superada.
export const ESTADO = {
  PENDIENTE: "pendiente",
  SOLICITADA: "solicitada",
  CONCEDIDA: "concedida",
  DENEGADA: "denegada",
};

export function isValidEstado(estado) {
  return Object.values(ESTADO).includes(estado);
}

// Acepta el formato legacy ({ estado } o string suelto) y normaliza a
// minúsculas; devuelve null si no es un estado válido (basura de un JSON a
// mano o de otra versión). Lo comparten el reducer y buildEquivalenceRows para
// que la validación sea exactamente la misma en el store y en la vista.
export function normalizeEstado(raw) {
  const value = typeof raw === "string" ? raw : raw && typeof raw === "object" ? raw.estado : "";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isValidEstado(normalized) ? normalized : null;
}

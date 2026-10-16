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

/**
 * Los estados que **ofrece el desplegable** de la tabla. «Convalidada» no está:
 * se **calcula** desde las convalidaciones aprobadas, así que no se marca a mano
 * (y los datos viejos que ya la llevan siguen contando como superados).
 */
export const SELECTABLE_STATUSES = [STATUS.SUPERADA, STATUS.EN_CURSO, STATUS.PENDIENTE];

export function isValidStatus(status) {
  return Object.values(STATUS).includes(status);
}

/**
 * Estados del flujo de convalidación (lo cursado fuera → UGR). Viven dentro de
 * `progress.equivalences[i].estado`: el reducer los valida antes de escribir en
 * el store y la sección de convalidaciones de Progreso los lee de ahí, agrupados
 * en pendientes, rechazadas y aprobadas. Son independientes de STATUS (que es por
 * asignatura): una convalidación se aprueba o se rechaza aunque la asignatura UGR
 * de destino aún no esté superada.
 */
export const ESTADO = {
  PENDIENTE: "pendiente",
  APROBADA: "aprobada",
  RECHAZADA: "rechazada",
};

// El vocabulario viejo (solicitada / concedida / denegada) se traduce al nuevo
// **al leerlo**, así que los datos ya guardados no se pierden ni hace falta una
// migración aparte que los recorra.
const ESTADO_LEGACY = { solicitada: "pendiente", concedida: "aprobada", denegada: "rechazada" };

export function isValidEstado(estado) {
  return Object.values(ESTADO).includes(estado);
}

// Acepta el formato legacy ({ estado } o string suelto), traduce el vocabulario
// viejo y normaliza a minúsculas; devuelve null si no es un estado válido (basura
// de un JSON a mano o de otra versión). Lo comparten el reducer y la vista para
// que la validación sea exactamente la misma en el store y en la pantalla.
export function normalizeEstado(raw) {
  const value = typeof raw === "string" ? raw : raw && typeof raw === "object" ? raw.estado : "";
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  const traducido = ESTADO_LEGACY[normalized] || normalized;
  return isValidEstado(traducido) ? traducido : null;
}

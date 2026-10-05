import { PASSED_STATUSES, isValidStatus } from "./status.js";

/**
 * isPassed: true solo si el código tiene un estado válido en PASSED_STATUSES
 * (sup/pass). Estados inválidos o ausentes cuentan como no superados: el
 * solver no debe excluir nada que el usuario no haya marcado explícitamente.
 */
export function isPassed(credits, code) {
  const status = credits?.[code];
  return isValidStatus(status) && PASSED_STATUSES.includes(status);
}

/**
 * solvableCodes: parte el dominio del solver en asignaturas planificables y
 * excluidas por estar ya superadas. Con `excludePassed: false` conserva las
 * superadas (replanificación). Los estados inválidos nunca excluyen.
 */
export function solvableCodes(codes, credits, { excludePassed = true } = {}) {
  const list = Array.isArray(codes) ? codes : [];
  const map = credits && typeof credits === "object" ? credits : {};
  const subjects = [];
  const excluded = [];
  for (const code of list) {
    if (excludePassed && isPassed(map, code)) excluded.push(code);
    else subjects.push(code);
  }
  return { subjects, excluded };
}

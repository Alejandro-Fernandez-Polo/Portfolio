import { registerModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import { getState, dispatch, subscribe } from "../store/commands.js";
import {
  summarize,
  projectDegree as pureProjectDegree,
  destinosAprobados,
  normalizeEstado,
} from "../progress/index.js";
import { PASSED_STATUSES, isValidStatus } from "../progress/status.js";

const EMPTY_PROGRESS = { credits: {}, equivalences: [], plan: { totalECTS: 240 }, mencion: "", fails: {} };

// Espejo de selectors.getProgress: el módulo kernel no depende de la fachada
// legacy de selectores, pero debe tolerar userState antiguo sin progress o
// con progress parcial (ver merge en commands.initStore).
function getProgress() {
  const state = getState();
  if (!state) return { ...EMPTY_PROGRESS };
  const p = state.progress;
  if (!p || typeof p !== "object") return { ...EMPTY_PROGRESS };
  return {
    credits: p.credits && typeof p.credits === "object" ? p.credits : {},
    equivalences: Array.isArray(p.equivalences) ? p.equivalences : [],
    plan: { totalECTS: 240, ...(p.plan || {}) },
    mencion: typeof p.mencion === "string" ? p.mencion : "",
    fails: p.fails && typeof p.fails === "object" ? p.fails : {},
  };
}

function getSummary(subjects = []) {
  const progress = getProgress();
  return summarize(Array.isArray(subjects) ? subjects : [], progress.credits, progress.equivalences);
}

function getStatus(code) {
  const status = getProgress().credits[code];
  return isValidStatus(status) ? status : null;
}

function setStatus(code, status) {
  // El reducer ya valida, pero evitamos el dispatch (y su write en IDB) si
  // el comando va a ser descartado de todas formas. El estado vacío es válido:
  // significa «sin marcar» y borra la marca.
  if (!code || (status !== "" && !isValidStatus(status))) return false;
  dispatch({ type: "progress/setStatus", payload: { code, status } });
  return true;
}

/** Mención elegida (vacío = sin decidir). */
function setMencion(mencion) {
  if (typeof mencion !== "string") return false;
  dispatch({ type: "progress/setMencion", payload: { mencion } });
  return true;
}

function getPassedCodes() {
  const progress = getProgress();
  // includes() ya filtra estados inválidos: solo sup/pass pasan. Y las
  // convalidaciones aprobadas cuentan igual, sin marcarlas a mano.
  const codes = new Set(Object.keys(progress.credits).filter((code) => PASSED_STATUSES.includes(progress.credits[code])));
  for (const code of destinosAprobados(progress.equivalences)) codes.add(code);
  return [...codes];
}

function projectDegree(subjects = []) {
  const progress = getProgress();
  return pureProjectDegree(Array.isArray(subjects) ? subjects : [], progress.credits, progress.plan, progress.equivalences);
}

/** Las convalidaciones (una sola lista, con sus estados). */
function getConvalidaciones() {
  return getProgress().equivalences;
}

/** Reemplaza la lista entera: la sección de Progreso manda lo que tiene. */
function setConvalidaciones(items) {
  if (!Array.isArray(items)) return false;
  dispatch({ type: "progress/setConvalidaciones", payload: { items } });
  return true;
}

/** Cambia el estado de una convalidación (aprobada / rechazada / pendiente). */
function setEstadoConvalidacion(id, estado) {
  if (!id || !normalizeEstado(estado)) return false;
  dispatch({ type: "progress/setEstadoConvalidacion", payload: { id, estado } });
  return true;
}

/** Suspensos de una asignatura (0 = sin suspensos). Informativos. */
function setFails(code, count) {
  if (!code) return false;
  dispatch({ type: "progress/setFails", payload: { code, count } });
  return true;
}

/** Los suspensos por asignatura: `{ [code]: n }`. */
function getFails() {
  return getProgress().fails;
}

/**
 * start: reemite `progress:changed` en el bus cuando cambia la porción de
 * progreso del estado. `subscribe()` dispara en CUALQUIER cambio del store;
 * comparar la snapshot evita eventos espurios por cambios ajenos (y bucles
 * si un oyente llegara a escribir en el store).
 */
export function start(bus) {
  let lastSnapshot = null;
  subscribe((state) => {
    const p = state?.progress;
    const snapshot = p && typeof p === "object" ? JSON.stringify(p) : "";
    if (snapshot !== lastSnapshot) {
      lastSnapshot = snapshot;
      bus.emit("progress:changed", { rev: state?.rev ?? 0 }, "progress");
    }
  });
}

export function registerProgress() {
  return registerModule({
    id: "progress",
    version: "1.0.0",
    api: {
      getSummary,
      getStatus,
      setStatus,
      setMencion,
      getPassedCodes,
      projectDegree,
      getConvalidaciones,
      setConvalidaciones,
      setEstadoConvalidacion,
      setFails,
      getFails,
    },
    requires: ["store@^1"],
    publishes: ["progress:changed"],
    // "store:changed" es declarativo (el store lo publica en bootstrap); la
    // reemisión real se hace por subscribe() en start, más fiable que el bus.
    subscribes: ["store:changed"],
    start,
  });
}

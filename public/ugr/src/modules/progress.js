import { registerModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import { getState, dispatch, subscribe } from "../store/commands.js";
import {
  summarize,
  projectDegree as pureProjectDegree,
  mapEquivalences as pureMapEquivalences,
} from "../progress/index.js";
import { PASSED_STATUSES, isValidStatus } from "../progress/status.js";

const EMPTY_PROGRESS = { credits: {}, equivalences: [], plan: { totalECTS: 240 } };

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
  };
}

function getSummary(subjects = []) {
  return summarize(Array.isArray(subjects) ? subjects : [], getProgress().credits);
}

function getStatus(code) {
  const status = getProgress().credits[code];
  return isValidStatus(status) ? status : null;
}

function setStatus(code, status) {
  // El reducer ya valida, pero evitamos el dispatch (y su write en IDB) si
  // el comando va a ser descartado de todas formas.
  if (!code || !isValidStatus(status)) return false;
  dispatch({ type: "progress/setStatus", payload: { code, status } });
  return true;
}

function getPassedCodes() {
  const { credits } = getProgress();
  // includes() ya filtra estados inválidos: solo sup/pass pasan.
  return Object.keys(credits).filter((code) => PASSED_STATUSES.includes(credits[code]));
}

function projectDegree(subjects = []) {
  const progress = getProgress();
  return pureProjectDegree(Array.isArray(subjects) ? subjects : [], progress.credits, progress.plan);
}

function mapEquivalences(subjects = []) {
  return pureMapEquivalences(getProgress().equivalences, Array.isArray(subjects) ? subjects : []);
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
      getPassedCodes,
      projectDegree,
      mapEquivalences,
    },
    requires: ["store@^1"],
    publishes: ["progress:changed"],
    // "store:changed" es declarativo (el store lo publica en bootstrap); la
    // reemisión real se hace por subscribe() en start, más fiable que el bus.
    subscribes: ["store:changed"],
    start,
  });
}

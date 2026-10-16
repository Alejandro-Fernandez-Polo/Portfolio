import { getState } from "./commands.js";
import { summarize, projectDegree } from "../progress/index.js";

const EMPTY_PROGRESS = { credits: {}, equivalences: [], plan: { totalECTS: 240 }, mencion: "", fails: {} };

export function getSelectedCodes() {
  const state = getState();
  return state ? Object.keys(state.selection.selectedSubjects) : [];
}

export function getGroupChoices() {
  const state = getState();
  return state ? state.selection.groupChoices : {};
}

export function getProfile() {
  const state = getState();
  return state ? state.profile : { apellido: "", turnoPreferente: "indiferente" };
}

export function getCuatrimestreActivo() {
  const state = getState();
  return state ? state.selection.cuatrimestreActivo : 1;
}

export function getFilters() {
  const state = getState();
  return state ? state.filters : [];
}

export function getBlocks() {
  const state = getState();
  return state && Array.isArray(state.blocks) ? state.blocks : [];
}

export function getUI() {
  const state = getState();
  return state ? state.ui : { view: "horario", compareIds: [], favorites: [] };
}

export function getProgress() {
  const state = getState();
  if (!state) return { ...EMPTY_PROGRESS };
  const p = state.progress;
  if (!p || typeof p !== "object") return { ...EMPTY_PROGRESS };
  // Fallback campo a campo: un userState antiguo puede no tener progress
  // o traerlo parcial (ver merge en commands.initStore).
  return {
    credits: p.credits && typeof p.credits === "object" ? p.credits : {},
    equivalences: Array.isArray(p.equivalences) ? p.equivalences : [],
    plan: { totalECTS: 240, ...(p.plan || {}) },
    mencion: typeof p.mencion === "string" ? p.mencion : "",
    fails: p.fails && typeof p.fails === "object" ? p.fails : {},
  };
}

/** Las convalidaciones (una sola lista, con sus estados). */
export function getConvalidaciones() {
  return getProgress().equivalences;
}

/** Los suspensos por asignatura, informativos: `{ [code]: n }`. */
export function getFails() {
  return getProgress().fails;
}

export function getProgressSummary(subjects = []) {
  const state = getState();
  if (!state) return summarize([], {});
  const progress = getProgress();
  return summarize(subjects, progress.credits, progress.equivalences);
}

export function getProjection(subjects = [], plan) {
  const state = getState();
  if (!state) return projectDegree([], {}, plan);
  const progress = getProgress();
  return projectDegree(subjects, progress.credits, plan, progress.equivalences);
}

export function getRevisionInfo() {
  const state = getState();
  return state ? { rev: state.rev, updatedAt: state.updatedAt, deviceId: state.deviceId } : null;
}

export function getECTS() {
  const state = getState();
  if (!state) return 0;
  let total = 0;
  for (const code of Object.keys(state.selection.selectedSubjects)) {
    const subj = SUBJECTS?.find((s) => s.codigo === code);
    if (subj) total += subj.creditos || 0;
  }
  return total;
}
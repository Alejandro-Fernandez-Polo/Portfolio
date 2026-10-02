import { getState } from "./commands.js";

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

export function getUI() {
  const state = getState();
  return state ? state.ui : { view: "horario", compareIds: [], favorites: [], predefinedSource: "570" };
}

export function getPropuestas() {
  const state = getState();
  return state ? state.propuestas : { items: [], activeId: null, vista: "oficial" };
}

export function getProgress() {
  const state = getState();
  return state ? state.progress : { credits: {}, equivalences: [] };
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
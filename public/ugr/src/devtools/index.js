import { getState, getDeviceId, flush } from "../store/commands.js";
import { get, getAll, stats, isAvailable, getStoreMode } from "../store/db.js";
import { reducer, initialState } from "../store/reducer.js";
import { buildPlan, snapshotAllKeys, verify, cleanupLegacy } from "../migrate/legacyKeys.js";
import { validateBundle, buildMergePlan } from "../backup/bundle.js";

let bootStart = performance.now();
const bootTimings = {};

export function createDevtools() {
  return {
    dump,
    selfTest,
    bench,
    resetLegacy,
    legacy: { start: startLegacyApp },
    bootTiming: () => bootTimings,
  };
}

function dump() {
  const state = getState();
  return {
    rev: state?.rev || 0,
    schema: 1,
    degraded: window.__ugrDegraded || false,
    storeMode: getStoreMode(),
    deviceId: getDeviceId(),
    stores: stats ? stats() : null,
    userState: state ? { ...state, profile: { ...state.profile, apellido: "***" } } : null,
    bootTiming: bootTimings,
  };
}

function selfTest() {
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) passed++;
    else { failed++; console.error("[selfTest] FAIL:", msg); }
  }

  // Reducer tests
  assert(reducer(initialState, { type: "profile/setApellido", payload: { apellido: "Test" } }).profile.apellido === "Test", "reducer: setApellido");
  assert(reducer(initialState, { type: "profile/setTurno", payload: { turno: "mañana" } }).profile.turnoPreferente === "mañana", "reducer: setTurno");
  assert(reducer(initialState, { type: "selection/toggleSubject", payload: { code: "FFT" } }).selection.selectedSubjects.FFT === true, "reducer: toggleSubject on");
  const s1 = reducer(initialState, { type: "selection/toggleSubject", payload: { code: "FFT" } });
  assert(reducer(s1, { type: "selection/toggleSubject", payload: { code: "FFT" } }).selection.selectedSubjects.FFT === undefined, "reducer: toggleSubject off");
  // setGroups requires subject to be selected first
  const s2 = reducer(initialState, { type: "selection/toggleSubject", payload: { code: "FFT" } });
  const s3 = reducer(s2, { type: "selection/setGroups", payload: { code: "FFT", teoria: "A", practica: "A1" } });
  assert(s3.selection.groupChoices.FFT?.teoria === "A", "reducer: setGroups");
  assert(reducer(initialState, { type: "selection/setCuatrimestre", payload: { cuatrimestre: 2 } }).selection.cuatrimestreActivo === 2, "reducer: setCuatrimestre");
  assert(reducer(initialState, { type: "ui/setView", payload: { view: "asignaturas" } }).ui.view === "asignaturas", "reducer: setView");
  assert(reducer(initialState, { type: "ui/toggleFavorite", payload: { id: "test" } }).ui.favorites.includes("test"), "reducer: toggleFavorite add");
  assert(reducer(initialState, { type: "unknown/command" }) === initialState, "reducer: unknown command no-op");

  // Migration tests - buildPlan generates selection/setAll (bulk), not per-item toggleSubject
  // Fixture uses parsed objects (not strings) because buildPlan expects parsed data
  const legacyFixture = {
    "ugr-horario-state": { selectedSubjects: { FFT: true, ED: true }, groupChoices: { FFT: { teoria: "A", practica: "A1" } }, apellido: "Garcia", turnoPreferente: "mañana", cuatrimestreActivo: 1, propuestas: [], propuestaActivaId: null, vistaConvalidaciones: "oficial" },
    "ugr-horario-saved-configs-0": [{ id: 1, name: "Test", subjects: ["FFT"] }],
    "ugr-propuestas": [],
    "ugr-propuestas-guardadas": [],
    "ugr-convalidaciones": { FFT: "sup" },
    "ugr-predefined-source": "570",
    "ugr-fav-predefined": [-1],
  };
  const plan = buildPlan(legacyFixture);
  assert(plan.commands.some((c) => c.type === "profile/setApellido"), "migrate: builds profile cmd");
  assert(plan.commands.some((c) => c.type === "selection/setAll"), "migrate: builds selection cmd (bulk)");
  assert(plan.commands.some((c) => c.type === "selection/setGroups"), "migrate: builds setGroups cmd");
  assert(plan.commands.some((c) => c.type === "selection/setCuatrimestre"), "migrate: builds setCuatrimestre cmd");
  assert(plan.commands.some((c) => c.type === "configs/save"), "migrate: builds configs cmd");
  assert(plan.stats.configs === 1, "migrate: stats configs count");

  // Bundle tests - validateBundle only checks structure, not hash integrity
  // Hash integrity is verified in importBundle (async)
  const validBundle = { format: "ugr-backup", formatVersion: 1, payload: { userState: initialState }, integrity: { alg: "SHA-256", hash: "abc" } };
  const v1 = validateBundle(JSON.stringify(validBundle));
  assert(v1.ok, "bundle: valid passes");

  const corruptBundle = { ...validBundle, integrity: { alg: "SHA-256", hash: "wrong" } };
  const v2 = validateBundle(JSON.stringify(corruptBundle));
  // validateBundle does not verify hash - it only checks structure
  // so a bundle with wrong hash but valid structure passes validateBundle
  assert(v2.ok, "bundle: validateBundle only checks structure, not hash (hash checked in importBundle)");

  const futureBundle = { ...validBundle, formatVersion: 999 };
  const v3 = validateBundle(JSON.stringify(futureBundle));
  assert(!v3.ok && v3.errors.some((e) => e.includes("versión futura")), "bundle: future version fails");

  // Merge plan tests
  const cur = { userState: { ...initialState, rev: 1 }, configs: [{ id: 1, updatedAt: "2024-01-01" }] };
  const inc = { userState: { ...initialState, rev: 2 }, configs: [{ id: 1, updatedAt: "2024-01-02" }] };
  const mergePlan = buildMergePlan(cur, inc, "merge");
  assert(mergePlan.actions.some((a) => a.section === "userState" && a.action === "replace"), "merge: newer userState wins");
  assert(mergePlan.actions.some((a) => a.section === "configs" && a.action === "upsert"), "merge: newer config wins");

  console.log(`[selfTest] ${passed}/${passed + failed} OK`);
  return { passed, failed };
}

function bench() {
  const t0 = performance.now();
  return {
    boot: bootTimings,
    now: performance.now() - t0,
  };
}

function resetLegacy() {
  cleanupLegacy();
  console.log("[devtools] legacy cleaned up");
}

function startLegacyApp() {
  if (window.__ugrLegacy && window.__ugrLegacy.init) {
    window.__ugrLegacy.init();
  }
}

export function recordBootTiming(label) {
  bootTimings[label] = performance.now() - bootStart;
}
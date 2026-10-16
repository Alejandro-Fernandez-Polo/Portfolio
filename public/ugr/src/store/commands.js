import { open, put, get, transact, isAvailable } from "./db.js";
import { reducer, initialState } from "./reducer.js";
import { normalizeConvalidacion, normalizeConvalidaciones } from "../progress/convalidaciones.js";
import { normalizeFails } from "../progress/summary.js";

let currentState = null;
let persistTimer = null;
const subscribers = new Set();
let deviceId = "";

function genDeviceId() {
  return crypto.randomUUID();
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    if (!isAvailable()) return;
    try {
      await put("userState", { key: "current", ...currentState });
    } catch (err) {
      console.error("[store] persist failed:", err);
      setTimeout(schedulePersist, 1000);
    }
  }, 250);
}

function notify() {
  for (const h of subscribers) {
    try {
      h(currentState);
    } catch (err) {
      console.error("[store] subscriber error:", err);
    }
  }
}

/**
 * Normaliza la porción de progreso a plena forma (credits/equivalences/plan).
 * Dos motivos: un userState anterior no trae `progress` o lo trae
 * parcial/corrupto, y el estado base no debe compartir referencias con
 * `initialState.progress` (una mutación in-place lo corrompería para toda la
 * sesión). `...raw` conserva campos extra ya guardados, p. ej. updatedAt.
 */
function normalizeProgress(raw) {
  const sp = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const credits = sp.credits && typeof sp.credits === "object" && !Array.isArray(sp.credits) ? sp.credits : {};
  const plan = sp.plan && typeof sp.plan === "object" && !Array.isArray(sp.plan) ? sp.plan : {};
  const totalECTS = Number.isFinite(plan.totalECTS) && plan.totalECTS > 0
    ? plan.totalECTS
    : initialState.progress.plan.totalECTS;
  return {
    ...sp,
    credits: { ...credits },
    equivalences: normalizeConvalidaciones(sp.equivalences),
    plan: { ...plan, totalECTS },
    mencion: typeof sp.mencion === "string" ? sp.mencion : "",
    fails: normalizeFails(sp.fails),
  };
}

/**
 * Lo que el usuario ya tuviera en las **propuestas guardadas** pasa a la lista de
 * convalidaciones, para no perderlo al retirar el motor de propuestas: cada mapeo
 * (individual o bloque N↔N) se convierte en una convalidación **pendiente**. Los
 * nombres de propuesta, las instantáneas y el enlace de compartir se retiran: no
 * hay nada que migrar de eso.
 */
function convalidacionesDePropuestas(propuestas) {
  const out = [];
  for (const propuesta of Array.isArray(propuestas?.items) ? propuestas.items : []) {
    for (const mapeo of Array.isArray(propuesta?.mappings) ? propuesta.mappings : []) {
      const origenes = Array.isArray(mapeo?.cursadas)
        ? mapeo.cursadas.map((c) => ({ codigo: c?.codigo || "", nombre: c?.nombre || "" }))
        : [{ codigo: mapeo?.cursadaCodigo || "", nombre: mapeo?.cursada || "" }];
      const destinos = Array.isArray(mapeo?.reconocidas)
        ? mapeo.reconocidas.map((r) => ({ codigo: r?.codigo, nombre: r?.nombre }))
        : [{ codigo: mapeo?.reconocidaCodigo, nombre: mapeo?.reconocida }];
      const convalidacion = normalizeConvalidacion({
        id: mapeo?.id,
        origenes,
        destinos,
        creditos: mapeo?.creditos,
        calificacion: mapeo?.calificacion,
      });
      if (convalidacion) out.push(convalidacion);
    }
  }
  return out;
}

export async function initStore() {
  await open();
  if (isAvailable()) {
    const stored = await get("userState", "current");
    if (stored) {
      const progress = normalizeProgress(stored.progress);
      const heredadas = convalidacionesDePropuestas(stored.propuestas);
      if (heredadas.length && !progress.equivalences.length) progress.equivalences = heredadas;
      // El namespace de propuestas se retira: su contenido, si lo había, ya está
      // arriba como convalidaciones.
      const resto = { ...stored };
      delete resto.propuestas;
      currentState = { ...initialState, ...resto, progress };
    } else {
      currentState = { ...initialState, progress: normalizeProgress(), deviceId: genDeviceId() };
      await put("userState", { key: "current", ...currentState });
    }
    deviceId = currentState.deviceId || genDeviceId();
    if (!currentState.deviceId) {
      currentState.deviceId = deviceId;
      await put("userState", { key: "current", ...currentState });
    }
  } else {
    currentState = { ...initialState, progress: normalizeProgress(), deviceId: genDeviceId() };
  }
  return currentState;
}

export function getState() {
  return currentState ? Object.freeze({ ...currentState }) : null;
}

export function subscribe(handler) {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

export function dispatch(cmd) {
  if (!currentState) return;
  const ns = reducer(currentState, cmd);
  if (ns !== currentState) {
    currentState = ns;
    notify();
    schedulePersist();
  }
}

export async function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!isAvailable() || !currentState) return;
  try {
    await put("userState", { key: "current", ...currentState });
  } catch (err) {
    console.error("[store] flush failed:", err);
  }
}

export async function applyCommandsInTransaction(commands) {
  if (!isAvailable()) throw new Error("IDB_UNSUPPORTED");
  await transact(["userState"], async () => {
    for (const cmd of commands) {
      currentState = reducer(currentState, cmd);
    }
    await put("userState", { key: "current", ...currentState });
  });
  notify();
}

export function getDeviceId() {
  return deviceId;
}
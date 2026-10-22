import { open, put, get, transact, isAvailable } from "./db.js";
import { reducer, initialState } from "./reducer.js";
import { normalizeConvalidacion, normalizeConvalidaciones } from "../progress/convalidaciones.js";
import { normalizeFails } from "../progress/summary.js";
import {
  DEFAULT_SCOPE,
  SCOPE_PERSONAL,
  initialScope,
  isScope,
  normalizeScope,
  userStateKey,
} from "./scope.js";

let currentState = null;
let persistTimer = null;
const subscribers = new Set();
let deviceId = "";
// Mundo activo (ver `scope.js`). Es lo que decide de qué documento de
// `userState` se lee y a cuál se escribe.
let activeScope = DEFAULT_SCOPE;

/** Clave de `meta` donde se recuerda el mundo elegido entre recargas. */
const SCOPE_META_KEY = "activeScope";
/** Clave de `meta` del identificador de dispositivo, compartido por los dos mundos. */
const DEVICE_META_KEY = "deviceId";

/** El documento `userState` del mundo activo. */
function persistKey() {
  return userStateKey(activeScope);
}

function genDeviceId() {
  return crypto.randomUUID();
}

async function readMeta(key) {
  if (!isAvailable()) return null;
  try {
    const row = await get("meta", key);
    return row ? row.value : null;
  } catch {
    return null;
  }
}

async function writeMeta(key, value) {
  if (!isAvailable()) return;
  try {
    await put("meta", { key, value, updatedAt: new Date().toISOString() });
  } catch {
    // Sin `meta` no se recuerda la elección, pero la sesión sigue funcionando:
    // no hay nada que el usuario pueda hacer con este fallo.
  }
}

async function readStoredDocument(scope) {
  if (!isAvailable()) return null;
  try {
    return (await get("userState", userStateKey(scope))) || null;
  } catch {
    return null;
  }
}

/**
 * Identificador de dispositivo. Uno solo para los dos mundos: si cambiara,
 * cada respaldo parecería de otro navegador. Se prefiere el que ya trae el
 * documento, después el de `meta` y, en un navegador nuevo, el personal (que
 * es el que existía antes de los mundos) antes de generar otro.
 */
async function sharedDeviceId(stored) {
  if (stored && typeof stored.deviceId === "string" && stored.deviceId) return stored.deviceId;
  const fromMeta = await readMeta(DEVICE_META_KEY);
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  const personal = await readStoredDocument(SCOPE_PERSONAL);
  if (personal && typeof personal.deviceId === "string" && personal.deviceId) {
    return personal.deviceId;
  }
  return genDeviceId();
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    if (!isAvailable()) return;
    try {
      await put("userState", { key: persistKey(), ...currentState });
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

export async function initStore({ hasLegacyData = false } = {}) {
  await open();
  if (!isAvailable()) {
    // Sin almacén no hay dos mundos que separar: el estado vive en el espejo
    // de `localStorage` que ya tenía el usuario, así que se lee como personal.
    activeScope = SCOPE_PERSONAL;
    currentState = { ...initialState, progress: normalizeProgress(), deviceId: genDeviceId() };
    deviceId = currentState.deviceId;
    return currentState;
  }

  // La elección de mundo manda; si no hay ninguna todavía, un navegador con
  // datos personales —o con los del formato anterior, que son los mismos— se
  // queda en ellos y uno nuevo arranca en la muestra.
  const savedScope = await readMeta(SCOPE_META_KEY);
  activeScope = isScope(savedScope)
    ? savedScope
    : initialScope({ hasPersonalState: hasLegacyData || !!(await readStoredDocument(SCOPE_PERSONAL)) });
  await writeMeta(SCOPE_META_KEY, activeScope);
  await loadDocument(activeScope);
  return currentState;
}

/**
 * Trae al estado corriente el documento del mundo pedido, creándolo si es la
 * primera vez que se entra en él.
 *
 * @param {string} scope
 */
async function loadDocument(scope) {
  const stored = await readStoredDocument(scope);
  const id = await sharedDeviceId(stored);
  if (stored) {
    const progress = normalizeProgress(stored.progress);
    const heredadas = convalidacionesDePropuestas(stored.propuestas);
    if (heredadas.length && !progress.equivalences.length) progress.equivalences = heredadas;
    // El namespace de propuestas se retira: su contenido, si lo había, ya está
    // arriba como convalidaciones.
    const resto = { ...stored };
    delete resto.propuestas;
    currentState = { ...initialState, ...resto, progress, deviceId: id };
  } else {
    currentState = { ...initialState, progress: normalizeProgress(), deviceId: id };
  }
  deviceId = id;
  await writeMeta(DEVICE_META_KEY, id);
  if (!stored || stored.deviceId !== id) {
    await put("userState", { key: userStateKey(scope), ...currentState });
  }
}

/**
 * El mundo activo: `"sample"` (datos de ejemplo) o `"personal"`.
 *
 * @returns {"sample"|"personal"}
 */
export function getActiveScope() {
  return normalizeScope(activeScope);
}

/**
 * Cambia de mundo: se guarda lo del actual, se recuerda la elección y se trae
 * el documento del otro.
 *
 * **No avisa a los suscriptores** a propósito. Cambiar de mundo no es un
 * cambio de estado más: todas las vistas tienen que rehidratarse (selección,
 * progreso, configuraciones, valoraciones), y avisar a medias las dejaría
 * pintando media pantalla con cada mundo. Quien llama recarga la página y el
 * arranque las monta todas desde el documento nuevo.
 *
 * @param {string} scope
 * @returns {Promise<{ok: boolean, scope?: string, error?: string}>}
 */
export async function setActiveScope(scope) {
  const next = normalizeScope(scope);
  if (!currentState) return { ok: false, error: "not_ready" };
  if (!isAvailable()) return { ok: false, error: "store_unavailable" };
  if (next === activeScope) return { ok: true, scope: next };
  await flush();
  activeScope = next;
  await writeMeta(SCOPE_META_KEY, next);
  await loadDocument(next);
  return { ok: true, scope: next };
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
    await put("userState", { key: persistKey(), ...currentState });
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
    await put("userState", { key: persistKey(), ...currentState });
  });
  notify();
}

export function getDeviceId() {
  return deviceId;
}
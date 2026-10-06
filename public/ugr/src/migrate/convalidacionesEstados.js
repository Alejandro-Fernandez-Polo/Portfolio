import { get, put, isAvailable } from "../store/db.js";
import { dispatch } from "../store/commands.js";
import { normalizeEstado } from "../progress/status.js";

// Marcador propio en `meta`: la ingesta es independiente de migration:legacy-v1
// (que solo vuelca concedida/pendiente a credits). Así un usuario que ya migró
// con legacy-v1 recibe igualmente los estados completos en equivalences.
const MARKER_KEY = "migration:convalidaciones-estados-v1";

// Formato legacy { [id]: { estado } }: el id es el de la entrada en
// CONVALIDACIONES, no el código UGR. localStorage puede lanzar (modo privado)
// o traer un JSON roto; los estados son optativos y no deben tumbar el arranque.
function readLegacyEstados() {
  try {
    const raw = localStorage.getItem("ugr-convalidaciones");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// CONVALIDACIONES es un global de convalidaciones.js (script clásico cargado
// antes que el bootstrap): resuelve id → entrada, igual que migrateLegacy.
function getConvalidaciones() {
  return Array.isArray(globalThis.CONVALIDACIONES) ? globalThis.CONVALIDACIONES : [];
}

/**
 * Vuelca los estados de ugr-convalidaciones dentro de progress.equivalences
 * (upsert por id), para que el dashboard los lea del store y no de localStorage.
 *
 * Idempotente: el reducer no toca el store si nada cambia. En modo degradado
 * (sin IDB) el store es en memoria y no persiste, así que se re-ingesta en cada
 * arranque; con IDB se marca en `meta` y se hace una sola vez.
 */
export async function ingestConvalidacionesEstados() {
  const legacy = readLegacyEstados();
  const ids = Object.keys(legacy);
  if (!ids.length) return { ok: true, ingested: 0 };

  const convalidaciones = getConvalidaciones();
  if (!convalidaciones.length) return { ok: true, ingested: 0, skipped: "sin CONVALIDACIONES" };

  const byId = new Map();
  for (const entry of convalidaciones) {
    if (entry && entry.id) byId.set(String(entry.id), entry);
  }

  const upserts = [];
  for (const id of ids) {
    const estado = normalizeEstado(legacy[id]);
    const entry = byId.get(id);
    if (estado && entry) upserts.push({ ...entry, estado });
  }
  if (!upserts.length) return { ok: true, ingested: 0 };

  if (!isAvailable()) {
    dispatch({ type: "progress/setEquivalenceEstados", payload: { entries: upserts } });
    return { ok: true, ingested: upserts.length, degraded: true };
  }

  try {
    const marker = await get("meta", MARKER_KEY);
    if (marker) return { ok: true, ingested: 0, skipped: true };
    dispatch({ type: "progress/setEquivalenceEstados", payload: { entries: upserts } });
    await put("meta", { key: MARKER_KEY, appliedAt: new Date().toISOString(), version: 1 });
    return { ok: true, ingested: upserts.length };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

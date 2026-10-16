/**
 * Caché de soluciones del solver sobre IndexedDB (`solutions`).
 *
 * Vive en la capa de **almacenamiento**, no en la del solver: guardar en
 * IndexedDB es un detalle de infraestructura y el solver no debe conocerlo. La
 * dependencia apunta hacia dentro (`→ solver/version.js`) y este módulo se
 * **inyecta** desde el adaptador (`modules/solver.js`), que es quien conoce a
 * los dos lados.
 *
 * Es *best-effort*: si el almacén no está disponible o falla, el solver sigue
 * funcionando sin caché.
 */

import { get, put, isAvailable } from "./db.js";
import { SOLVER_VERSION } from "../solver/version.js";

const STORE = "solutions";

/**
 * Solución cacheada de un problema, o `null` si no hay o es de otra versión del
 * motor.
 *
 * @param {string} hash firma del problema.
 * @returns {Promise<{items: Array, stats: Object}|null>}
 */
export async function read(hash) {
  try {
    if (!isAvailable()) return null;
    const row = await get(STORE, hash);
    if (!row || row.solverVersion !== SOLVER_VERSION) return null;
    return { items: row.items, stats: row.stats };
  } catch {
    return null;
  }
}

/**
 * Guarda una solución. Nunca lanza: la caché no debe romper al solver.
 *
 * @param {string} hash firma del problema.
 * @param {{items: Array, stats: Object}} payload solución.
 */
export async function write(hash, payload) {
  try {
    if (!isAvailable()) return;
    await put(STORE, {
      problemHash: hash,
      solverVersion: SOLVER_VERSION,
      computedAt: new Date().toISOString(),
      ...payload,
    });
  } catch {
    /* best-effort */
  }
}

/** Forma que espera `solveTopK({ cache })`. */
export const cache = { get: read, put: write };

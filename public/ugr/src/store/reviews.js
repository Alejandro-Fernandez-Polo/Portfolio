/**
 * Persistencia de los profesores propios: las valoraciones que añade el
 * usuario (por formulario o importando un JSON).
 *
 * Viven en la tabla `ownReviews`, con una fila por valoración y clave
 * `scope|docentKey`: `docentKey` es el mismo `key` que usa un perfil del
 * catálogo (`asignatura|modalidad|nombre`) o el nombre cuando todavía no está
 * asociada a ninguna asignatura, y el mundo delante evita que la valoración de
 * la muestra pise la de los datos personales —o al revés—. La forma del dato la
 * fija el dominio (`src/app/domain/profesores-propios.js`).
 *
 * El mundo activo lo pone el store; las funciones aceptan uno explícito para
 * poder trabajar sobre el otro sin cambiar la elección (lo usa el respaldo).
 */

import { getAll, put, del, transact, isAvailable } from "./db.js";
import { getActiveScope } from "./commands.js";
import { filterByScope, normalizeScope, reviewId } from "./scope.js";

const STORE = "ownReviews";

/**
 * @param {string} [scope] mundo pedido; omitido, el activo.
 * @returns {"sample"|"personal"}
 */
function scopeFor(scope) {
  return scope === undefined ? getActiveScope() : normalizeScope(scope);
}

/**
 * @param {string} [scope] mundo pedido; omitido, el activo.
 * @returns {Promise<Array>} valoraciones de ese mundo; vacío sin IndexedDB o
 *   si la lectura falla (el llamante pinta sin ellas en vez de romper).
 */
export async function listReviews(scope) {
  if (!isAvailable()) return [];
  try {
    const rows = await getAll(STORE);
    return Array.isArray(rows) ? filterByScope(rows, scopeFor(scope)) : [];
  } catch {
    return [];
  }
}

/**
 * Alta o edición de una o varias valoraciones. Es un upsert por
 * `scope|docentKey`: editar reemplaza la fila y una importación no pisa lo que
 * no traiga.
 *
 * @param {Array} reviews valoraciones ya normalizadas.
 * @param {string} [scope] mundo pedido; omitido, el activo.
 * @returns {Promise<{ok: boolean, count?: number, error?: string}>}
 */
export async function saveReviews(reviews, scope) {
  if (!isAvailable()) return { ok: false, error: "store_unavailable" };
  const objetivo = scopeFor(scope);
  const list = (Array.isArray(reviews) ? reviews : [])
    .filter((r) => r && r.docentKey)
    .map((r) => ({
      ...r,
      id: reviewId(objetivo, r.docentKey),
      scope: objetivo,
      updatedAt: r.updatedAt || new Date().toISOString(),
    }));
  if (list.length === 0) return { ok: false, error: "empty" };
  try {
    await transact([STORE], async () => {
      for (const review of list) await put(STORE, review);
    });
    return { ok: true, count: list.length };
  } catch (err) {
    return { ok: false, error: err?.code || "store_error" };
  }
}

/**
 * Borra la valoración de una clave en un mundo. Es idempotente: borrar algo
 * que ya no está no es un error.
 *
 * @param {string} docentKey clave canónica de la valoración (sin el mundo).
 * @param {string} [scope] mundo pedido; omitido, el activo.
 */
export async function deleteReview(docentKey, scope) {
  if (!isAvailable()) return { ok: false, error: "store_unavailable" };
  if (!docentKey) return { ok: false, error: "missing_key" };
  try {
    await del(STORE, reviewId(scopeFor(scope), docentKey));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.code || "store_error" };
  }
}

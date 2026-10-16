/**
 * Persistencia de los profesores propios: las valoraciones que añade el
 * usuario (por formulario o importando un JSON).
 *
 * Viven en la tabla `reviews` del store, con una fila por valoración y clave
 * `docentKey` —el mismo `key` que usa un perfil del catálogo
 * (`asignatura|modalidad|nombre`) o el nombre cuando todavía no está asociada a
 * ninguna asignatura—. La tabla existe desde el esquema v1 y ya viaja en el
 * backup, así que aquí solo van las operaciones; la forma del dato la fija el
 * dominio (`src/app/domain/profesores-propios.js`).
 */

import { getAll, put, del, transact, isAvailable } from "./db.js";

const STORE = "reviews";

/**
 * @returns {Promise<Array>} valoraciones guardadas; vacío sin IndexedDB o si
 *   la lectura falla (el llamante pinta sin ellas en vez de romper).
 */
export async function listReviews() {
  if (!isAvailable()) return [];
  try {
    const rows = await getAll(STORE);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/**
 * Alta o edición de una o varias valoraciones. Es un upsert por `docentKey`:
 * editar reemplaza la fila y una importación no pisa lo que no traiga.
 *
 * @param {Array} reviews valoraciones ya normalizadas.
 * @returns {Promise<{ok: boolean, count?: number, error?: string}>}
 */
export async function saveReviews(reviews) {
  if (!isAvailable()) return { ok: false, error: "store_unavailable" };
  const list = (Array.isArray(reviews) ? reviews : []).filter((r) => r && r.docentKey);
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
 * Borra la valoración de una clave. Es idempotente: borrar algo que ya no está
 * no es un error.
 *
 * @param {string} docentKey clave de la valoración.
 */
export async function deleteReview(docentKey) {
  if (!isAvailable()) return { ok: false, error: "store_unavailable" };
  if (!docentKey) return { ok: false, error: "missing_key" };
  try {
    await del(STORE, docentKey);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.code || "store_error" };
  }
}

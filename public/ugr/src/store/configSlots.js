/**
 * Dónde viven las configuraciones guardadas **fuera** del store: las ranuras de
 * `localStorage` del formato antiguo.
 *
 * El número de ranuras y la forma de la clave son **un solo conocimiento**, y lo
 * necesitan tres sitios distintos: el adaptador de persistencia (que las
 * escribe), la migración del formato antiguo (que las lee al arrancar por
 * primera vez) y las herramientas de desarrollo (que siembran una de prueba).
 * Estaba copiado en los tres, con una de las copias diciendo en su comentario
 * que era «réplica» de otra.
 *
 * Si algún día hay que cambiar el número de ranuras o la clave, se cambia aquí.
 */

/** Ranuras de configuraciones guardadas (legacy: tres). */
export const CONFIG_STORAGE_SLOTS = 3;

/**
 * @param {number} slot índice de ranura.
 * @returns {string} clave de `localStorage`.
 */
export function configSlotKey(slot) {
  return `ugr-horario-saved-configs-${slot}`;
}

/** Las claves de todas las ranuras, en orden. */
export const CONFIG_SLOT_KEYS = Array.from(
  { length: CONFIG_STORAGE_SLOTS },
  (_, slot) => configSlotKey(slot),
);

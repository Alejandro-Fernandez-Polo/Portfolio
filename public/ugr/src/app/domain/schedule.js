/**
 * Reglas puras de horario (T02.1/T02.2).
 *
 * Extraídas del monolito `public/ugr/app.js` sin cambio de comportamiento para
 * que el IIFE clásico las consuma vía la composición (`deps.domain`) en lugar
 * de conservar su propia copia: aquí vive la única implementación.
 *
 * Sin DOM, sin globals, sin estado — solo entrada y salida, de modo que puedan
 * probarse con cualquier entorno (Vitest en node, navegador, etc.).
 */

/**
 * Convierte `"HH:MM"` a minutos desde medianoche.
 *
 * Comportamiento idéntico al legacy: split por `:` y `Number` por parte
 * (`"09:30"` → 570). `String(t)` solo blinda contra números no formateados.
 *
 * @param {string} t hora en formato `HH:MM`.
 * @returns {number} minutos totales desde las 00:00.
 */
export function timeToMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Indica si dos tramos horarios se solapan.
 *
 * Semántica estrictamente menor en ambos extremos: tramos adyacentes
 * (fin de uno == inicio del otro) NO se solapan; tramos idénticos SÍ.
 *
 * @param {string} s1 inicio del tramo 1 (`HH:MM`).
 * @param {string} e1 fin del tramo 1 (`HH:MM`).
 * @param {string} s2 inicio del tramo 2 (`HH:MM`).
 * @param {string} e2 fin del tramo 2 (`HH:MM`).
 * @returns {boolean} `true` si los tramos comparten algún minuto.
 */
export function timesOverlap(s1, e1, s2, e2) {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(s2) < timeToMinutes(e1);
}

/**
 * Escapado de texto para HTML.
 *
 * Vive aquí —y no en cada fichero que lo necesita— porque es **un solo
 * conocimiento**: cómo convertir texto en algo seguro de interpolar. Tenía tres
 * copias (el monolito, el panel de progreso y el asistente de importación) y una
 * de ellas se habría quedado atrás cualquier día.
 *
 * Es puro y sin DOM: se puede probar en node.
 */

/**
 * @param {*} value valor a interpolar (se convierte a texto).
 * @returns {string} el mismo texto con los cinco caracteres peligrosos escapados.
 */
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
}

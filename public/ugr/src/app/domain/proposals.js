/**
 * Reglas puras de propuestas de convalidación (T02.5).
 *
 * Extraída de `public/ugr/app.js` sin cambio de comportamiento: es la única
 * implementación y el IIFE clásico la consume vía `deps.domain`.
 * Sin DOM, sin globals, sin estado.
 */

/**
 * Créditos totales que aporta una propuesta de convalidación.
 *
 * Cada mapping aporta sus `creditos` explícitos; si no los trae, el valor por
 * defecto es 24 para bloques (`tipo === 'bloque'`) y 6 para el resto.
 * Una propuesta ausente o sin `mappings` aporta 0.
 *
 * @param {{mappings?: Array<{creditos?: number, tipo?: string}>}|null} p propuesta.
 * @returns {number} suma de créditos de todos sus mappings.
 */
export function calcPropuestaCreditos(p) {
  if (!p || !p.mappings) return 0;
  return p.mappings.reduce((s, m) => s + (m.creditos || (m.tipo === 'bloque' ? 24 : 6)), 0);
}

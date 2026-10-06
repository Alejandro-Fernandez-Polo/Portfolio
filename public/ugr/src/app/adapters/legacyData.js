/**
 * Única frontera de `src/app/**` con los datos clásicos de `/ugr`
 * (`SUBJECTS`, `DEFAULT_SUBJECTS`, `CONVALIDACIONES`, `PROPUESTAS`,
 * `DOCENTES`).
 *
 * Por qué existe: esos datos se declaran con `const`/`let` en el global lexical
 * de los scripts clásicos (`data.js`, `convalidaciones.js`, `propuestas.js`,
 * `docentes.js`) y NO son propiedades de `window`, así que un módulo ESM no
 * puede resolverlos por nombre. Además `PROPUESTAS` es `let` y `app.js` la
 * reasigna en `loadPropuestas`, por lo que una referencia tomada una sola vez
 * quedaría obsoleta: se admite como thunk y se invoca en cada lectura.
 *
 * El adaptador no importa esos scripts ni fija valores por su cuenta: recibe
 * referencias o thunks desde la composición y solo normaliza la lectura. Eso
 * hace testeable la lógica de los features inyectando arrays de prueba en
 * lugar de depender del global lexical.
 */

/**
 * Normaliza una entrada admisible: thunk (datos mutables o globales lexicales)
 * o referencia directa ya materializada.
 *
 * @param {*} value referencia o función sin argumentos
 * @returns {*} valor resuelto en el momento de la lectura
 */
function resolve(value) {
  return typeof value === "function" ? value() : value;
}

/**
 * Crea la frontera de datos clásicos.
 *
 * @param {Object} input Referencias o thunks por campo. Cada campo es opcional
 *   y, si falta, su getter devuelve `undefined` en lugar de lanzar.
 * @param {*} [input.subjects] `SUBJECTS` (array o thunk)
 * @param {*} [input.defaultSubjects] `DEFAULT_SUBJECTS` (array o thunk)
 * @param {*} [input.convalidaciones] `CONVALIDACIONES` (array o thunk)
 * @param {*} [input.propuestas] `PROPUESTAS` (array, `null` o thunk — Preferir
 *   thunk: es `let` y se reasigna)
 * @param {*} [input.docentes] `DOCENTES` (array o thunk)
 * @returns {import("../contracts.js").UgrLegacyData}
 */
export function createLegacyDataAdapter(input) {
  const data = input || {};

  return {
    getSubjects: () => resolve(data.subjects),
    getDefaultSubjects: () => resolve(data.defaultSubjects),
    getConvalidaciones: () => resolve(data.convalidaciones),
    getPropuestas: () => resolve(data.propuestas),
    getDocentes: () => resolve(data.docentes),
  };
}

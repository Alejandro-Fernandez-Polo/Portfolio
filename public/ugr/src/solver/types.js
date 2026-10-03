/**
 * Contratos de datos del motor de horarios (JSDoc, sin TypeScript).
 */

/**
 * @typedef {Object} Session
 * @property {string} dia   Día en español: "lunes"|"martes"|"miercoles"|"jueves"|"viernes"
 * @property {string} inicio Hora "H:MM" o "HH:MM"
 * @property {string} fin    Hora "H:MM" o "HH:MM"
 */

/**
 * @typedef {Object} Group
 * @property {string} letra
 * @property {"mañana"|"tarde"} turno
 * @property {Session[]} teoria
 * @property {{ subgrupos: string[], [subgrupo: string]: Session[] }} practicas
 */

/**
 * @typedef {Object} Subject
 * @property {string} codigo
 * @property {string} nombre
 * @property {number} curso
 * @property {1|2} cuatrimestre
 * @property {number} creditos
 * @property {Group[]} grupos
 */

/**
 * @typedef {Object} CatalogMeta
 * @property {string} university
 * @property {string} degree
 * @property {string} plan
 * @property {string} version
 * @property {string} hash
 */

/**
 * @typedef {Object} UgrCatalog
 * @property {CatalogMeta} meta
 * @property {Subject[]} subjects
 */

/**
 * @typedef {Object} FilterSpec
 * @property {string} type
 * @property {*} [value]
 * @property {number} [weight]
 * @property {boolean} [hard]
 */

/**
 * @typedef {Object} Problem
 * @property {string[]} subjects
 * @property {FilterSpec[]} filters
 * @property {string} catalogVersion
 */

/**
 * @typedef {Object} GroupChoice
 * @property {string} teoria
 * @property {string|null} practica
 */

/**
 * @typedef {Object} Solution
 * @property {string} id
 * @property {string} name
 * @property {Record<string, true>} selectedSubjects
 * @property {Record<string, GroupChoice>} groupChoices
 * @property {number} cost
 * @property {Object} costBreakdown
 */

export {};

/**
 * Reglas puras de propuestas de convalidación.
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

/**
 * Propuesta activa: la que manda el id, o la primera si el id ya no está (una
 * propuesta borrada) o no hay ninguna.
 *
 * @param {Array<Object>} propuestas lista de propuestas.
 * @param {string|null} activeId id elegido.
 * @returns {Object|null} la propuesta activa, o `null` si la lista está vacía.
 */
export function findActivePropuesta(propuestas, activeId) {
  if (!Array.isArray(propuestas) || propuestas.length === 0) return null;
  return propuestas.find((p) => p.id === activeId) || propuestas[0];
}

/**
 * Equivalencias de código UGR (`12` → `CA`, las de la tabla oficial). Un código
 * sin equivalencia se devuelve tal cual.
 *
 * @param {string} codigo código tal y como viene en un mapeo.
 * @param {Object} [equivalencias] mapa código → código real.
 * @returns {string} el código real.
 */
export function resolveUgrCodigo(codigo, equivalencias = {}) {
  if (!codigo) return codigo;
  const up = String(codigo).toUpperCase().trim();
  return equivalencias[up] || codigo;
}

/**
 * Dónde cae una asignatura UGR en el plan: curso y cuatrimestre, mirando primero
 * el catálogo y, si no está, la tabla oficial (que solo conoce el nombre).
 * `OPT` y sus alias son los créditos optativos.
 *
 * @param {string} codigo código UGR (admite equivalencias).
 * @param {Object} data datos del catálogo.
 * @param {Array<Object>} [data.subjects] catálogo activo.
 * @param {Array<Object>} [data.convalidaciones] tabla oficial.
 * @param {Object} [data.equivalencias] equivalencias de código.
 * @returns {{curso: (number|string), cuatrimestre: (number|string), nombre: string, codigoReal: string}|null}
 *   la ficha, o `null` si no hay código o no se encuentra.
 */
export function getUgrMeta(codigo, { subjects = [], convalidaciones = [], equivalencias = {} } = {}) {
  if (!codigo) return null;
  const up = String(codigo).toUpperCase().trim();
  if (up === "OPT" || up === "OPTATIVAS" || up === "CREDITOS_OPTATIVOS") {
    return { curso: "Opt", cuatrimestre: "-", nombre: "Créditos Optativos", codigoReal: "OPT" };
  }
  const real = resolveUgrCodigo(codigo, equivalencias);
  const enCatalogo = subjects.find((x) => x.codigo === real);
  if (enCatalogo) {
    return { curso: enCatalogo.curso, cuatrimestre: enCatalogo.cuatrimestre, nombre: enCatalogo.nombre, codigoReal: real };
  }
  const oficial = convalidaciones.find((x) => x.ugr && (x.ugr.codigo === codigo || x.ugr.codigo === real));
  if (oficial && oficial.ugr) {
    const enCatalogoPorOficial = subjects.find((x) => x.codigo === oficial.ugr.codigo);
    if (enCatalogoPorOficial) {
      return {
        curso: enCatalogoPorOficial.curso,
        cuatrimestre: enCatalogoPorOficial.cuatrimestre,
        nombre: enCatalogoPorOficial.nombre,
        codigoReal: enCatalogoPorOficial.codigo,
      };
    }
    return { curso: "-", cuatrimestre: "-", nombre: oficial.ugr.nombre, codigoReal: oficial.ugr.codigo };
  }
  return null;
}

/**
 * Curso y cuatrimestre legibles de una ficha (`1º · 1ºC`, `Optativa`). Vacío si
 * no hay ficha o el curso no se conoce.
 *
 * @param {{curso?: (number|string), cuatrimestre?: number}|null} meta ficha.
 * @returns {string} el texto.
 */
export function formatCursoCuatri(meta) {
  if (!meta || meta.curso === "-" || meta.curso == null) return "";
  if (meta.curso === "Opt") return "Optativa";
  return `${meta.curso}º · ${meta.cuatrimestre}ºC`;
}

/**
 * Ordena los mapeos por el curso de la asignatura reconocida (los bloques, por
 * su reconocida más temprana; las optativas van al final). Con `order` a `null`
 * devuelve la lista **tal cual**, en su orden original.
 *
 * @param {Array<Object>} mappings mapeos de una propuesta.
 * @param {("asc"|"desc"|null)} order sentido del orden.
 * @param {(codigo: string) => Object|null} getMeta ficha de un código UGR.
 * @returns {Array<Object>} lista ordenada (copia) u original.
 */
export function sortMappingsByCurso(mappings, order, getMeta) {
  if (!order) return mappings;
  const copy = [...mappings];
  const getCurso = (m) => {
    if (m.tipo === "bloque") {
      const cursos = m.reconocidas
        .map((r) => {
          const meta = getMeta(r.codigo);
          const v = meta ? meta.curso : 99;
          return v === "Opt" ? 5 : v;
        })
        .filter((c) => typeof c === "number");
      return cursos.length ? Math.min(...cursos) : 99;
    }
    const meta = getMeta(m.reconocidaCodigo);
    if (!meta) return 99;
    return meta.curso === "Opt" ? 5 : meta.curso;
  };
  const getCuatri = (m) => {
    if (m.tipo === "bloque") return 0;
    const meta = getMeta(m.reconocidaCodigo);
    return meta ? meta.cuatrimestre : 99;
  };
  copy.sort((a, b) => {
    const ca = getCurso(a);
    const cb = getCurso(b);
    if (ca !== cb) return order === "asc" ? ca - cb : cb - ca;
    const qa = getCuatri(a);
    const qb = getCuatri(b);
    if (qa !== qb) return order === "asc" ? qa - qb : qb - qa;
    const codeA = a.tipo === "bloque" ? a.reconocidas[0]?.codigo : a.reconocidaCodigo;
    const codeB = b.tipo === "bloque" ? b.reconocidas[0]?.codigo : b.reconocidaCodigo;
    return order === "asc" ? String(codeA).localeCompare(String(codeB)) : String(codeB).localeCompare(String(codeA));
  });
  return copy;
}

/**
 * Opciones del desplegable UGR: el catálogo activo, lo que solo conoce la tabla
 * oficial y, al final, los créditos optativos.
 *
 * @param {Array<Object>} subjects catálogo activo.
 * @param {Array<Object>} convalidaciones tabla oficial.
 * @returns {Array<{codigo: string, nombre: string}>} opciones ordenadas por código.
 */
export function buildUgrOptions(subjects = [], convalidaciones = []) {
  const seen = new Map();
  subjects.forEach((s) => {
    if (!seen.has(s.codigo)) seen.set(s.codigo, s.nombre);
  });
  convalidaciones.forEach((c) => {
    if (c.ugr && !seen.has(c.ugr.codigo)) seen.set(c.ugr.codigo, c.ugr.nombre);
  });
  if (!seen.has("OPT")) seen.set("OPT", "Créditos Optativos");
  return Array.from(seen.entries())
    .map(([codigo, nombre]) => ({ codigo, nombre }))
    .sort((a, b) => {
      if (a.codigo === "OPT") return 1;
      if (b.codigo === "OPT") return -1;
      return a.codigo.localeCompare(b.codigo);
    });
}

/**
 * Opciones del desplegable de cursadas (UNED y grados superiores): la tabla
 * oficial, las cursadas que ya usan las propuestas semilla y dos atajos de DAW
 * que no están en la tabla.
 *
 * @param {Array<Object>} convalidaciones tabla oficial.
 * @param {Array<Object>} propuestasIniciales propuestas semilla.
 * @returns {Array<{codigo: string, nombre: string}>} opciones, DAW primero.
 */
export function buildUnedOptions(convalidaciones = [], propuestasIniciales = []) {
  const seen = new Map();
  convalidaciones.forEach((c) => {
    if (c.uned && !seen.has(c.uned.codigo)) seen.set(c.uned.codigo, c.uned.nombre);
  });
  propuestasIniciales.forEach((p) =>
    (p.mappings || []).forEach((m) => {
      if (m.cursadaCodigo && m.cursada) seen.set(m.cursadaCodigo, m.cursada);
      if (m.cursadas) m.cursadas.forEach((cc) => seen.set(cc.codigo, cc.nombre));
    }),
  );
  if (!seen.has("901020+DAW")) {
    seen.set("901020+DAW", "Fundamentos de Programación (T.S. en Desarrollo de Aplicaciones Web) — DAW");
  }
  if (!seen.has("DAW")) seen.set("DAW", "DAW — T.S. en Desarrollo de Aplicaciones Web");
  const opciones = Array.from(seen.entries()).map(([codigo, nombre]) => ({ codigo, nombre }));
  opciones.sort((a, b) => {
    if (a.codigo === "DAW") return -1;
    if (b.codigo === "DAW") return 1;
    return a.codigo.localeCompare(b.codigo);
  });
  return opciones;
}

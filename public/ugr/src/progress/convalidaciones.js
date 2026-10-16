/**
 * Las **convalidaciones**: lo que has cursado fuera (los orígenes) y las
 * asignaturas de la UGR que te lo reconocen (los destinos), con su estado.
 *
 * Sustituyen al «motor de propuestas»: hay **una sola lista** —sin propuestas con
 * nombre ni instantáneas— y su estado es lo que enseña la sección de
 * convalidaciones de Progreso, agrupado en pendientes, rechazadas y aprobadas.
 *
 * La asignatura de destino **no se marca a mano**: si su convalidación está
 * aprobada cuenta como superada y se pinta con la etiqueta «convalidada»
 * (`destinosAprobados`); si la convalidación se borra o se rechaza, vuelve a
 * «sin estado».
 *
 * Forma canónica (`Convalidacion`):
 *
 *   { id, origenes: [{ codigo, nombre }], destinos: [{ codigo, nombre }],
 *     creditos, calificacion, estado }
 *
 * El destino lleva **código y nombre** a propósito: el código (la abreviatura del
 * catálogo: `CA`, `FS`…) es el enlace, y el nombre permite **recuperar** una
 * convalidación cuyo código haya cambiado —los datos viejos guardaban un código
 * numérico de una tabla que ya no existe— y es lo que se enseña en la lista.
 *
 * @typedef {Object} Convalidacion
 * @property {string} id
 * @property {Array<{codigo: string, nombre: string}>} origenes
 * @property {Array<{codigo: string, nombre: string}>} destinos
 * @property {number} creditos
 * @property {string} calificacion
 * @property {"pendiente"|"aprobada"|"rechazada"} estado
 */
import { ESTADO, normalizeEstado } from "./status.js";

const texto = (value) => String(value ?? "").trim();

/** Un origen normalizado, venga como objeto (`{codigo, nombre}`) o como texto. */
function normalizarOrigen(raw) {
  if (typeof raw === "string") return raw.trim() ? { codigo: "", nombre: raw.trim() } : null;
  if (!raw || typeof raw !== "object") return null;
  const codigo = texto(raw.codigo ?? raw.code);
  const nombre = texto(raw.nombre ?? raw.name);
  return codigo || nombre ? { codigo, nombre } : null;
}

/**
 * Un destino normalizado: `{ codigo, nombre }`, admite el string suelto (el
 * código) de los datos que ya estuvieran guardados con la forma vieja.
 */
function normalizarDestino(raw) {
  if (typeof raw === "string") return raw.trim() ? { codigo: raw.trim(), nombre: "" } : null;
  if (!raw || typeof raw !== "object") return null;
  const codigo = texto(raw.codigo ?? raw.code);
  const nombre = texto(raw.nombre ?? raw.name);
  return codigo || nombre ? { codigo, nombre } : null;
}

/** El `codigo`/`nombre` de una asignatura, sea del catálogo legacy o del canónico. */
export const codigoDeAsignatura = (subject) => texto(subject?.codigo ?? subject?.code);
export const nombreDeAsignatura = (subject) => texto(subject?.nombre ?? subject?.name);

/**
 * Los códigos de la **tabla antigua del autor**, que se guardaron en los datos y
 * siguen haciendo falta para recuperarlos: mapeaban un código numérico —o una
 * letra— a la abreviatura de la asignatura (`1A` → `ES`). Es dato de migración,
 * no una regla del modelo: los destinos nuevos ya se guardan con la abreviatura
 * del catálogo, y esto solo se usa cuando no casan ni el código ni el nombre.
 */
const CODIGOS_ANTIGUOS = {
  12: "CA",
  14: "FS",
  15: "FP",
  16: "LMD",
  17: "TOC",
  18: "MP",
  19: "IES",
  "1A": "ES",
  21: "PDOO",
  1: "ES",
  A: "ES",
};

/**
 * El destino **de créditos libres**: el hueco para los créditos que la titulación
 * reconoce sin que los dé una asignatura concreta. `LIBRES` es un **código
 * reservado**, no una asignatura: el catálogo no lo tiene, así que nunca casará
 * con nada y hay que tratarlo aparte.
 */
export const DESTINO_LIBRE = { codigo: "LIBRES", nombre: "Créditos libres" };

/**
 * ¿Es este destino el de créditos libres? Se reconoce por el código reservado o
 * por el nombre normalizado, para no perderlo si cambia el rótulo que se enseña.
 *
 * @param {{codigo?: string, nombre?: string}|string} destino
 * @returns {boolean}
 */
export function esDestinoLibre(destino) {
  const crudo = typeof destino === "string" ? { codigo: destino } : destino || {};
  if (texto(crudo.codigo ?? crudo.code) === DESTINO_LIBRE.codigo) return true;
  const nombre = texto(crudo.nombre ?? crudo.name);
  return (
    nombre !== "" &&
    normalizarNombreAsignatura(nombre) === normalizarNombreAsignatura(DESTINO_LIBRE.nombre)
  );
}

/**
 * Normaliza un nombre de asignatura para compararlo: sin acentos, en minúsculas,
 * sin el paréntesis de la especialidad y sin espacios de más. Es lo que permite
 * **recuperar** una convalidación vieja: su nombre sigue casando con el de la
 * asignatura del catálogo aunque su código ya no exista.
 */
export function normalizarNombreAsignatura(nombre) {
  return texto(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resuelve un destino contra el catálogo activo, en tres intentos: **por código**,
 * **por nombre** (sin acentos ni paréntesis) y, para los datos guardados con la
 * tabla antigua del autor, **traduciendo el código** a la abreviatura del catálogo
 * (`1A` → `ES`). Devuelve siempre el destino y, si casó, la asignatura.
 *
 * Los créditos libres se resuelven **antes** de cualquiera de los tres: no son una
 * asignatura y no deben pasar por la tabla antigua.
 *
 * @param {{codigo?: string, nombre?: string}} destino
 * @param {Array} subjects catálogo activo (opcional: sin él solo resuelve el código).
 * @returns {{codigo: string, nombre: string, subject: Object|null, libre?: boolean}}
 */
export function resolverDestino(destino, subjects = []) {
  if (esDestinoLibre(destino)) {
    return { codigo: DESTINO_LIBRE.codigo, nombre: DESTINO_LIBRE.nombre, subject: null, libre: true };
  }
  const lista = Array.isArray(subjects) ? subjects : [];
  const codigo = texto(destino?.codigo);
  const nombre = texto(destino?.nombre);
  const porCodigo = (code) => (code ? lista.find((s) => codigoDeAsignatura(s) === code) : undefined);
  const porNombre = nombre
    ? lista.find((s) => normalizarNombreAsignatura(nombreDeAsignatura(s)) === normalizarNombreAsignatura(nombre))
    : undefined;
  const subject = porCodigo(codigo) || porNombre || porCodigo(CODIGOS_ANTIGUOS[codigo]) || null;
  // Si el código viene de la tabla antigua, se devuelve **ya traducido** aunque no
  // encuentre la asignatura: sin catálogo delante (la aprobación calculada del
  // motor, por ejemplo) el destino sigue significando lo que significa.
  const traducido = subject ? codigoDeAsignatura(subject) : CODIGOS_ANTIGUOS[codigo] || codigo;
  return {
    codigo: traducido,
    nombre: subject ? nombreDeAsignatura(subject) : nombre,
    subject,
  };
}

/**
 * Normaliza una convalidación guardada (o recién escrita) a la forma canónica.
 * Devuelve `null` si no tiene ni origen ni destino: una convalidación sin las dos
 * puntas no es nada y no debe llegar al store.
 *
 * @param {Object} raw
 * @returns {Convalidacion|null}
 */
export function normalizeConvalidacion(raw) {
  if (!raw || typeof raw !== "object") return null;
  const origenes = (Array.isArray(raw.origenes) ? raw.origenes : raw.origen ? [raw.origen] : [])
    .map(normalizarOrigen)
    .filter(Boolean);
  const destinos = (Array.isArray(raw.destinos) ? raw.destinos : raw.destino ? [raw.destino] : [])
    .map(normalizarDestino)
    .filter(Boolean);
  if (!origenes.length || !destinos.length) return null;
  // Sin repetidos: por código cuando lo hay y, si no, por nombre.
  const vistos = new Set();
  const unicos = destinos.filter((d) => {
    const clave = d.codigo || normalizarNombreAsignatura(d.nombre);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  const id =
    texto(raw.id) || `${origenes.map((o) => o.codigo || o.nombre).join("+")}|${unicos.map((d) => d.codigo || d.nombre).join("+")}`;
  return {
    id,
    origenes,
    destinos: unicos,
    creditos: Number(raw.creditos ?? raw.ects) || 0,
    calificacion: texto(raw.calificacion),
    estado: normalizeEstado(raw.estado) || ESTADO.PENDIENTE,
  };
}

/** Normaliza la lista entera y quita repetidas (por `id`). */
export function normalizeConvalidaciones(raw) {
  const out = [];
  const vistos = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    const convalidacion = normalizeConvalidacion(item);
    if (!convalidacion || vistos.has(convalidacion.id)) continue;
    vistos.add(convalidacion.id);
    out.push(convalidacion);
  }
  return out;
}

/**
 * Los códigos UGR que **ya cuentan como superados** por una convalidación
 * aprobada. Es lo que hace que no haya que marcar nada a mano.
 *
 * Con el catálogo delante, un destino se resuelve también **por nombre**, así que
 * una convalidación antigua cuyo código cambió sigue contando.
 *
 * @param {Array} convalidaciones
 * @param {Array} [subjects] catálogo activo.
 * @returns {Set<string>}
 */
export function destinosAprobados(convalidaciones, subjects = []) {
  const out = new Set();
  for (const convalidacion of normalizeConvalidaciones(convalidaciones)) {
    if (convalidacion.estado !== ESTADO.APROBADA) continue;
    for (const destino of convalidacion.destinos) {
      // Los créditos libres no son una asignatura: no dan por superada ninguna,
      // así que se saltan antes de resolver.
      if (esDestinoLibre(destino)) continue;
      const resuelto = resolverDestino(destino, subjects);
      if (resuelto.codigo) out.add(resuelto.codigo);
    }
  }
  return out;
}

/**
 * La lista repartida en los tres grupos que enseña Progreso.
 *
 * @param {Array} convalidaciones
 * @returns {{pendientes: Array, rechazadas: Array, aprobadas: Array}}
 */
export function gruposDeConvalidaciones(convalidaciones) {
  const grupos = { pendientes: [], rechazadas: [], aprobadas: [] };
  for (const convalidacion of normalizeConvalidaciones(convalidaciones)) {
    if (convalidacion.estado === ESTADO.APROBADA) grupos.aprobadas.push(convalidacion);
    else if (convalidacion.estado === ESTADO.RECHAZADA) grupos.rechazadas.push(convalidacion);
    else grupos.pendientes.push(convalidacion);
  }
  return grupos;
}

/**
 * La convalidación que reclama una asignatura, si la hay (para su etiqueta).
 *
 * @param {string} codigo código UGR.
 * @param {Array} convalidaciones
 * @param {Array} [subjects] catálogo activo (para resolver por nombre).
 * @returns {Convalidacion|null}
 */
export function convalidacionDeDestino(codigo, convalidaciones, subjects = []) {
  const code = texto(codigo);
  if (!code) return null;
  return (
    normalizeConvalidaciones(convalidaciones).find((c) =>
      c.destinos.some((destino) => resolverDestino(destino, subjects).codigo === code),
    ) || null
  );
}

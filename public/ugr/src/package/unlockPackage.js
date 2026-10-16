/**
 * El paquete cifrado del autor: descargarlo, abrirlo con la contraseña y
 * comprobar que trae un catálogo utilizable.
 *
 * El paquete es lo único que viaja al repositorio con el volcado completo (los
 * perfiles de profesor con sus opiniones y comentarios). Sin contraseña no hay
 * nada que hacer con él: aquí se descarga, se descifra con el mismo módulo que
 * usa el backup (`src/backup/crypto.js`) y se valida antes de dejarlo pasar, y
 * la contraseña no se guarda en ningún sitio —ni en el estado ni en el
 * almacenamiento—: se pide cada vez que se quiere importar.
 *
 * El catálogo importado se guarda con un identificador **distinto** al de la
 * muestra (`…+volcado`): si compartieran identificador, importar el volcado
 * pisaría el catálogo público y no habría forma de volver a él.
 *
 * La descarga tiene **fecha límite** y el plazo agotado se trata como un fallo de
 * red: una dependencia que no contesta no puede dejar el panel esperando para
 * siempre, y el mensaje que ve el usuario no cambia por ello.
 */

import { decrypt } from "../backup/crypto.js";
import { validateCatalog } from "../solver/catalog.js";
import { validateCatalogJSON } from "../ingest/schema.js";
import { TIMEOUTS, withDeadline } from "../modules/http.js";

export const PACKAGE_URL = "/ugr/datasets/ugr/gi/package.enc.json";

/** Sufijo del identificador del catálogo importado. */
const SUFIJO_IMPORTADO = "+volcado";

/** Fuente que marca un catálogo como venido del paquete. */
const FUENTE_VOLCADO = "volcado";

/**
 * Identificador con el que se guarda el catálogo del paquete.
 *
 * @param {Object} meta `meta` del catálogo importado.
 * @returns {string} por ejemplo `UGR/GI/2026-1+volcado`, o `` si no hay meta.
 */
export function packageCatalogId(meta) {
  const { university, degree, version } = meta || {};
  if (!university || !degree || !version) return "";
  return `${university}/${degree}/${version}${SUFIJO_IMPORTADO}`;
}

/**
 * ¿Este catálogo viene del paquete? El catálogo público no lo lleva en sus
 * fuentes, así que sirve para no pisarlo con la comprobación de actualizaciones
 * del manifest.
 *
 * @param {Object} meta `meta` del catálogo.
 * @returns {boolean}
 */
export function esCatalogoImportado(meta) {
  return Array.isArray(meta?.sources) && meta.sources.includes(FUENTE_VOLCADO);
}

/**
 * Lee el contenido ya descifrado del paquete. La forma es `{ catalog }`.
 *
 * @param {string} texto JSON en claro.
 * @returns {{ok: true, catalog: Object} | {ok: false, reason: string}}
 */
export function parsePackagePayload(texto) {
  let payload;
  try {
    payload = JSON.parse(texto);
  } catch {
    return { ok: false, reason: "parse" };
  }
  const catalog = payload && payload.catalog;
  if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.subjects)) {
    return { ok: false, reason: "shape" };
  }
  return { ok: true, catalog };
}

/** Mensaje de error de cada motivo, para pintarlo tal cual. */
export const PACKAGE_ERRORS = {
  empty: "Escribe la contraseña del paquete.",
  missing: "Este despliegue no trae el paquete cifrado.",
  network: "No se pudo descargar el paquete.",
  parse: "El paquete no se entiende.",
  shape: "El paquete no trae un catálogo.",
  passphrase: "Contraseña incorrecta.",
  invalid: "El catálogo del paquete no es válido.",
  save: "No se pudo guardar el catálogo importado.",
  activate: "El catálogo se guardó, pero no se pudo activar.",
};

/**
 * Descarga el paquete y lo abre con la contraseña.
 *
 * @param {string} password contraseña del paquete.
 * @param {{fetchImpl?: Function, url?: string}} [options] para poder probarlo sin red.
 * @returns {Promise<{ok: true, catalog: Object, id: string} | {ok: false, reason: string, errors?: Array}>}
 */
export async function unlockPackage(password, options = {}) {
  if (!password) return { ok: false, reason: "empty" };

  const pedir = options.fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!pedir) return { ok: false, reason: "network" };

  const url = options.url || PACKAGE_URL;
  let intento;
  try {
    intento = await withDeadline(url, TIMEOUTS.package, async (signal) => {
      const respuesta = await pedir(url, { cache: "no-store", signal });
      if (!respuesta) return { reason: "network" };
      if (respuesta.status === 404) return { reason: "missing" };
      if (respuesta.ok === false) return { reason: "network" };
      try {
        return { criptograma: await respuesta.json() };
      } catch {
        return { reason: "parse" };
      }
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  if (intento.reason) return { ok: false, reason: intento.reason };
  const criptograma = intento.criptograma;

  let plano;
  try {
    plano = await decrypt(criptograma, password);
  } catch {
    return { ok: false, reason: "passphrase" };
  }

  const leido = parsePackagePayload(plano);
  if (!leido.ok) return leido;

  // Un catálogo sin asignaturas pasaría las dos validaciones y dejaría la app sin
  // horario que resolver, así que se corta aquí.
  if (!leido.catalog.subjects.length) {
    return {
      ok: false,
      reason: "invalid",
      errors: [{ path: "subjects", message: "el catálogo no trae asignaturas" }],
    };
  }

  // Dos puertas, las mismas que pasa un catálogo descargado: la forma del JSON y
  // la coherencia de las asignaturas.
  const forma = validateCatalogJSON(leido.catalog);
  if (!forma.ok) return { ok: false, reason: "invalid", errors: forma.errors };
  const semantica = validateCatalog(leido.catalog);
  if (!semantica.ok) return { ok: false, reason: "invalid", errors: semantica.errors };

  return {
    ok: true,
    catalog: leido.catalog,
    id: packageCatalogId(leido.catalog.meta),
  };
}

if (typeof window !== "undefined") {
  window.__ugrPackage = {
    PACKAGE_URL,
    PACKAGE_ERRORS,
    packageCatalogId,
    esCatalogoImportado,
    parsePackagePayload,
    unlockPackage,
  };
}

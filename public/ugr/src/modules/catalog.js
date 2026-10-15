import { registerModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import { open, get, put, del, getAll, isAvailable } from "../store/db.js";
import { createCatalogRemote } from "./catalog-remote.js";
import {
  fromLegacySubjects,
  getSubject,
  getGroup,
  getSubgroups,
  validateCatalog,
  catalogVersion,
  attachDocents,
  attachPlan,
  getDocent as getDocentByKey,
  getProfesor as getProfesorByTriple,
  difficultyScore,
} from "../solver/catalog.js";

export const LEGACY_CATALOG_ID = "UGR/GI/legacy-1";
export const ACTIVE_CATALOG_META_KEY = "activeCatalog";

/**
 * Bloques del plan de estudios que trae el volcado y que hay que arrastrar por el
 * almacén: si se guardara solo `subjects` y `docents`, un catálogo importado
 * perdería los perfiles de profesor, las menciones, el personal y las
 * asignaturas del plan sin horario. Se copian **solo si existen**, para no
 * inventar listas vacías en un catálogo antiguo.
 */
const PLAN_KEYS = ["profesores", "menciones", "tutoresTfg", "masteres", "extraSubjects"];

function planBlocksOf(source) {
  const out = {};
  for (const key of PLAN_KEYS) {
    if (source && Array.isArray(source[key])) out[key] = source[key];
  }
  return out;
}

/**
 * Registro del store `catalogs`.
 *
 * @typedef {Object} CatalogRecord
 * @property {string} key Identificador único `"${university}/${degree}/${version}"`
 * @property {object} meta Copia de `catalog.meta` (university, degree, plan, version, hash, sources?)
 * @property {Array} subjects Asignaturas del catálogo (forma `UgrCatalog.subjects`)
 * @property {Array} docents Docentes del catálogo (forma `UgrCatalog.docents`)
 * @property {string} createdAt Marca ISO de creación
 * @property {string} updatedAt Marca ISO de la última escritura (índice de ordenación)
 */

let catalog = null;
let activeKey = "";
let storeReady = false;

const remote = createCatalogRemote({
  getActiveKey: () => activeKey,
  getCatalog: () => catalog,
  isStoreReady: () => storeReady,
  saveCatalog,
  setActiveCatalogKey,
});

function getSubjects() {
  return catalog ? catalog.subjects : [];
}

function getGroupByCode(code, letra) {
  return getGroup(getSubject(catalog, code), letra);
}

function getVersion() {
  return catalog ? catalogVersion(catalog) : "";
}

function validate() {
  return catalog ? validateCatalog(catalog) : { ok: false, errors: ["catálogo no cargado"] };
}

function getCatalog() {
  return catalog;
}

function getDocent(key) {
  return getDocentByKey(catalog, key);
}

function getDocents() {
  return catalog && Array.isArray(catalog.docents) ? catalog.docents : [];
}

function getProfesores() {
  return catalog && Array.isArray(catalog.profesores) ? catalog.profesores : [];
}

function getProfesor(code, modalidad, name) {
  return getProfesorByTriple(catalog, code, modalidad, name);
}

function getDocentScores(codes) {
  const scores = {};
  if (!catalog || !Array.isArray(codes)) return scores;
  for (const code of codes) {
    const subject = getSubject(catalog, code);
    if (!subject) continue;
    for (const group of subject.grupos || []) {
      const asignacion = getDocentByKey(catalog, `${code}-${group.letra}`);
      // La dificultad es del perfil (asignatura + modalidad + nombre), no de la
      // asignación: si el volcado no trae perfil para esa terna, no hay
      // puntuación.
      const profesor = asignacion
        ? getProfesorByTriple(catalog, asignacion.subjectCode, asignacion.modalidad, asignacion.name)
        : null;
      const dificultad = profesor?.dificultad;
      if (!dificultad) continue;
      // «Desconocido» no puntúa: `difficultyScore` devuelve `null` y la
      // clave se omite en vez de guardar un `null` que el motor leería igual
      // pero que ensuciaría el mapa.
      const score = difficultyScore(dificultad);
      if (score != null) scores[`${code}-${group.letra}`] = score;
    }
  }
  return scores;
}

function nowIso() {
  return new Date().toISOString();
}

function buildLegacyCatalog(legacy, docentes, profesores) {
  const built = fromLegacySubjects(legacy);
  attachDocents(built, docentes);
  attachPlan(built, { profesores });
  return built;
}

function catalogRecordId(meta) {
  if (!meta || typeof meta !== "object") return "";
  const { university, degree, version } = meta;
  if (!university || !degree || !version) return "";
  return `${university}/${degree}/${version}`;
}

function recordToCatalog(record) {
  return {
    meta: { ...record.meta },
    subjects: record.subjects,
    docents: Array.isArray(record.docents) ? record.docents : [],
    ...planBlocksOf(record),
  };
}

function storeFailure(err) {
  return { ok: false, error: err?.code || "store_error" };
}

async function loadFromStore(legacy, docentes, profesores) {
  const rows = await getAll("catalogs");
  if (rows.length === 0) {
    if (!Array.isArray(legacy)) return false;
    const seeded = buildLegacyCatalog(legacy, docentes, profesores);
    const timestamp = nowIso();
    const record = {
      key: catalogRecordId(seeded.meta) || LEGACY_CATALOG_ID,
      meta: { ...seeded.meta },
      subjects: seeded.subjects,
      docents: seeded.docents,
      ...planBlocksOf(seeded),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await put("catalogs", record);
    rows.push(record);
  }
  let stored = null;
  try {
    stored = await get("meta", ACTIVE_CATALOG_META_KEY);
  } catch {
    stored = null;
  }
  const storedKey = typeof stored?.value === "string" ? stored.value : "";
  const record =
    rows.find((row) => row.key === storedKey) ||
    rows.find((row) => row.key === LEGACY_CATALOG_ID) ||
    rows[0];
  catalog = recordToCatalog(record);
  activeKey = record.key;
  if (storedKey !== activeKey) {
    await put("meta", { key: ACTIVE_CATALOG_META_KEY, value: activeKey, updatedAt: nowIso() });
  }
  return true;
}

async function start() {
  await open().catch(() => ({ ok: false }));
  storeReady = isAvailable();

  const legacy = typeof SUBJECTS !== "undefined" ? SUBJECTS : null;
  const docentes = typeof DOCENTES !== "undefined" ? DOCENTES : [];
  const profesores = typeof PROFESORES !== "undefined" ? PROFESORES : [];

  let loaded = false;
  if (storeReady) {
    try {
      loaded = await loadFromStore(legacy, docentes, profesores);
    } catch {
      storeReady = false;
    }
  }

  if (!loaded && Array.isArray(legacy)) {
    catalog = buildLegacyCatalog(legacy, docentes, profesores);
    activeKey = LEGACY_CATALOG_ID;
  }

  if (!catalog) {
    bus.emit("catalog:loaded", { ok: false }, "catalog");
    return;
  }

  bus.emit(
    "catalog:loaded",
    { ok: true, id: activeKey, version: getVersion(), count: catalog.subjects.length },
    "catalog",
  );

  if (typeof window !== "undefined") {
    remote.checkForUpdates().catch(() => {});
  }
}

function getActiveCatalogKey() {
  return activeKey;
}

async function listCatalogs() {
  if (!storeReady) return [];
  try {
    const rows = await getAll("catalogs");
    return rows
      .map((row) => ({
        id: row.key,
        university: row.meta?.university || "",
        degree: row.meta?.degree || "",
        plan: row.meta?.plan || "",
        version: row.meta?.version || "",
        subjectCount: Array.isArray(row.subjects) ? row.subjects.length : 0,
        updatedAt: row.updatedAt || "",
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  } catch {
    return [];
  }
}

async function getCatalogById(id) {
  if (!storeReady || !id) return null;
  try {
    const record = await get("catalogs", id);
    return record || null;
  } catch {
    return null;
  }
}

async function exportCatalog(id) {
  const record = await getCatalogById(id);
  if (!record) return null;
  return {
    meta: { ...record.meta },
    subjects: record.subjects,
    docents: Array.isArray(record.docents) ? record.docents : [],
    ...planBlocksOf(record),
  };
}

async function saveCatalog(catalogInput, options = {}) {
  if (!storeReady) return { ok: false, error: "store_unavailable" };
  const check = validateCatalog(catalogInput);
  if (!check.ok) return { ok: false, error: "invalid_catalog", errors: check.errors };
  const id = options.id || catalogRecordId(catalogInput.meta);
  if (!id) return { ok: false, error: "missing_meta" };
  try {
    const existing = await get("catalogs", id).catch(() => null);
    const timestamp = nowIso();
    const record = {
      key: id,
      meta: { ...catalogInput.meta },
      subjects: catalogInput.subjects,
      docents: Array.isArray(catalogInput.docents) ? catalogInput.docents : [],
      ...planBlocksOf(catalogInput),
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };
    await put("catalogs", record);
    return { ok: true, id };
  } catch (err) {
    return storeFailure(err);
  }
}

async function deleteCatalog(id) {
  if (!storeReady) return { ok: false, error: "store_unavailable" };
  if (!id) return { ok: false, error: "not_found" };
  if (id === activeKey) return { ok: false, error: "active_catalog" };
  try {
    const rows = await getAll("catalogs");
    if (!rows.some((row) => row.key === id)) return { ok: false, error: "not_found" };
    if (rows.length <= 1) return { ok: false, error: "last_catalog" };
    await del("catalogs", id);
    return { ok: true, id };
  } catch (err) {
    return storeFailure(err);
  }
}

async function setActiveCatalogKey(id) {
  if (!storeReady) return { ok: false, error: "store_unavailable" };
  if (!id) return { ok: false, error: "not_found" };
  try {
    const record = await get("catalogs", id);
    if (!record) return { ok: false, error: "not_found" };
    await put("meta", { key: ACTIVE_CATALOG_META_KEY, value: record.key, updatedAt: nowIso() });
    catalog = recordToCatalog(record);
    activeKey = record.key;
    bus.emit(
      "catalog:updated",
      { id: activeKey, version: getVersion(), count: getSubjects().length },
      "catalog",
    );
    return { ok: true, id: activeKey };
  } catch (err) {
    return storeFailure(err);
  }
}

export function registerCatalog() {
  return registerModule({
    id: "catalog",
    version: "1.0.0",
    api: {
      getSubjects,
      getGroup: getGroupByCode,
      getSubgroups,
      getVersion,
      validate,
      getCatalog,
      getDocent,
      getDocents,
      getProfesor,
      getProfesores,
      getDocentScores,
      difficultyScore,
      listCatalogs,
      getActiveCatalogKey,
      setActiveCatalogKey,
      saveCatalog,
      deleteCatalog,
      getCatalogById,
      exportCatalog,
      checkForUpdates: remote.checkForUpdates,
      getCatalogStatus: remote.getCatalogStatus,
    },
    requires: [],
    publishes: ["catalog:loaded", "catalog:updated"],
    subscribes: [],
    start,
  });
}

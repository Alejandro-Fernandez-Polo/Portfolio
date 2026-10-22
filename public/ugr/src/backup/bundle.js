import { get, getAll, isAvailable } from "../store/db.js";
import { getDeviceId, getActiveScope } from "../store/commands.js";
import { filterByScope, reviewId, userStateKey } from "../store/scope.js";
import { sha256hex, encrypt, decrypt } from "./crypto.js";

export const FORMAT_VERSION = 1;
export const FORMAT_NAME = "ugr-backup";

/**
 * Las configuraciones guardadas viven en las ranuras de `localStorage` (el
 * adaptador de persistencia residual), no en la tabla `configs`: el respaldo
 * las lee y las escribe por ahí para que «exportar todo» lleve de verdad todo
 * lo que el usuario tiene. La tabla se sigue consultando como reserva para
 * respaldos de instalaciones que sí la usaron.
 */
async function readConfigs(scope) {
  try {
    const { createPersistenceAdapter } = await import("../app/adapters/persistence.js");
    const adapter = createPersistenceAdapter({ getScope: () => scope });
    const rows = adapter.loadSavedConfigs();
    if (Array.isArray(rows) && rows.length) return rows;
  } catch {
    // Sin `localStorage` se cae a la tabla, que es lo único que puede haber.
  }
  return filterByScope(await getAll("configs"), scope);
}

/**
 * Aplica configuraciones importadas sobre las del mundo activo. Con la
 * estrategia de fusión, misma clave (`id`) se reemplaza y nueva se añade; con
 * «reemplazar», la lista del fichero sustituye a la del mundo activo.
 *
 * @param {Array} acciones acciones del plan con `section === "configs"`.
 */
async function writeConfigs(acciones) {
  const lista = Array.isArray(acciones) ? acciones : [];
  if (!lista.length) return;
  const { createPersistenceAdapter } = await import("../app/adapters/persistence.js");
  const adapter = createPersistenceAdapter({ getScope: getActiveScope });
  const sustitucion = lista.find((accion) => accion.action === "replace" && Array.isArray(accion.data));
  if (sustitucion) {
    adapter.saveAllConfigs(sustitucion.data.filter((row) => row && row.id !== undefined));
    return;
  }
  const porId = new Map(adapter.loadSavedConfigs().map((row) => [String(row.id), row]));
  for (const accion of lista) {
    const row = accion.data;
    if (row && row.id !== undefined) porId.set(String(row.id), row);
  }
  adapter.saveAllConfigs([...porId.values()]);
}

/**
 * El respaldo es del **mundo activo**: el documento `userState` que toca, sus
 * configuraciones y sus valoraciones. Un respaldo hecho probando la app con
 * datos de muestra no puede llevarse por delante los datos personales —ni al
 * exportar ni al importar—, y por eso las secciones se filtran por `scope`.
 */
export async function buildPayload(sections = ["userState", "configs", "progress", "reviews"]) {
  const payload = {};
  const scope = getActiveScope();
  let userState;
  if (sections.includes("userState")) {
    userState = await get("userState", userStateKey(scope));
    payload.userState = userState;
  }
  if (sections.includes("configs")) {
    payload.configs = await readConfigs(scope);
  }
  if (sections.includes("progress")) {
    // El progreso canónico vive en userState.progress (single-writer). La
    // tabla `progress` solo se consulta como fallback de backups
    // anteriores, cuando el progreso se guardaba en esa tabla suelta.
    if (!userState) userState = await get("userState", userStateKey(scope));
    const canonical = userState?.progress;
    payload.progress = canonical || (await get("progress", "main"));
  }
  if (sections.includes("reviews")) {
    payload.reviews = filterByScope(await getAll("ownReviews"), scope);
  }
  return payload;
}

export async function exportBundle({ sections, passphrase, pretty = false } = {}) {
  if (!isAvailable()) throw new Error("IDB_UNSUPPORTED");

  const payload = await buildPayload(sections);
  const json = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  const hash = await sha256hex(json);

  let body = payload;
  if (passphrase) {
    body = await encrypt(json, passphrase);
  }

  const bundle = {
    format: FORMAT_NAME,
    formatVersion: FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    schema: 1,
    integrity: { alg: "SHA-256", hash },
    payload: body,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ugr-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.ugrbackup`;
  a.click();
  URL.revokeObjectURL(url);

  return { bundle, stats: { configs: payload.configs?.length || 0, size: blob.size } };
}

export function validateBundle(text) {
  const errors = [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: ["formato inválido: no es JSON válido"] };
  }

  if (parsed.format !== FORMAT_NAME) errors.push("no es un backup UGR");
  if (parsed.formatVersion > FORMAT_VERSION) errors.push("backup de versión futura");
  if (!parsed.payload) errors.push("payload ausente");
  if (!parsed.integrity?.hash) errors.push("integridad ausente");

  return { ok: errors.length === 0, errors, parsed };
}

async function getPlaintextPayload(parsed, passphrase) {
  if (typeof parsed.payload === "object" && parsed.payload.v === 1) {
    if (!passphrase) throw new Error("BAD_PASSPHRASE");
    const json = await decrypt(parsed.payload, passphrase);
    return JSON.parse(json);
  }
  return parsed.payload;
}

export async function importBundle(file, { passphrase, strategy = "merge" } = {}) {
  const text = await file.text();
  const validation = validateBundle(text);
  if (!validation.ok) throw new Error(validation.errors.join("; "));

  const payload = await getPlaintextPayload(validation.parsed, passphrase);
  const current = await buildPayload();

  const plan = buildMergePlan(current, payload, strategy);

  return { plan, payload };
}

export function buildMergePlan(current, incoming, strategy) {
  const plan = { actions: [] };

  if (strategy === "replace") {
    plan.actions.push({ section: "userState", action: "replace", data: incoming.userState });
    plan.actions.push({ section: "configs", action: "replace", data: incoming.configs });
    if (incoming.progress) {
      plan.actions.push({ section: "progress", action: "replace", data: incoming.progress });
    }
    plan.actions.push({ section: "reviews", action: "replace", data: incoming.reviews });
    return plan;
  }

  if (incoming.userState) {
    const cur = current.userState || {};
    const inc = incoming.userState;
    if (!cur.rev || (inc.rev && inc.rev > cur.rev) || (inc.updatedAt && new Date(inc.updatedAt) > new Date(cur.updatedAt))) {
      plan.actions.push({ section: "userState", action: "replace", data: inc });
    }
  }

  if (incoming.configs && Array.isArray(incoming.configs)) {
    const curMap = new Map((current.configs || []).map((c) => [c.id, c]));
    for (const inc of incoming.configs) {
      const existing = curMap.get(inc.id);
      if (!existing || (inc.updatedAt && new Date(inc.updatedAt) > new Date(existing.updatedAt))) {
        plan.actions.push({ section: "configs", action: "upsert", data: inc });
      }
    }
  }

  if (incoming.progress) {
    // El progreso no lleva rev propio: se fusiona por updatedAt (lo escribe
    // el reducer en cada comando de progreso). Si el incoming es más reciente
    // gana entero; si no, se hace unión de credits con el incoming ganando
    // por código, igual que configs/reviews.
    const cur = current.progress || {};
    const inc = incoming.progress;
    const curTs = Date.parse(cur.updatedAt || "") || 0;
    const incTs = Date.parse(inc.updatedAt || "") || 0;
    if (incTs > curTs) {
      plan.actions.push({ section: "progress", action: "replace", data: inc });
    } else {
      const merged = {
        ...cur,
        ...inc,
        credits: { ...(cur.credits || {}), ...(inc.credits || {}) },
        equivalences: inc.equivalences || cur.equivalences || [],
        fails: { ...(cur.fails || {}), ...(inc.fails || {}) },
        plan: { ...(cur.plan || {}), ...(inc.plan || {}) },
        updatedAt: new Date().toISOString(),
      };
      if (JSON.stringify(merged) !== JSON.stringify(cur)) {
        plan.actions.push({ section: "progress", action: "replace", data: merged });
      }
    }
  }

  if (incoming.reviews && Array.isArray(incoming.reviews)) {
    const curMap = new Map((current.reviews || []).map((r) => [r.docentKey, r]));
    for (const inc of incoming.reviews) {
      const existing = curMap.get(inc.docentKey);
      if (!existing || (inc.updatedAt && new Date(inc.updatedAt) > new Date(existing.updatedAt))) {
        plan.actions.push({ section: "reviews", action: "upsert", data: inc });
      }
    }
  }

  return plan;
}

// Las acciones de progreso no escriben en la tabla `progress`: se vuelcan
// en userState vía comandos del store (single-writer), igual que hace la UI.
function progressActionToCommand(action) {
  if (action.action === "replace") {
    return { type: "progress/setAll", payload: action.data };
  }
  if (action.action === "upsert" && action.data?.code) {
    return { type: "progress/setStatus", payload: { code: action.data.code, status: action.data.status } };
  }
  return null;
}

export async function applyPlan(plan) {
  const { transact, put } = await import("../store/db.js");
  const { applyCommandsInTransaction } = await import("../store/commands.js");
  const scope = getActiveScope();
  const progressCommands = plan.actions
    .filter((a) => a.section === "progress")
    .map(progressActionToCommand)
    .filter(Boolean);
  // Las configuraciones no viven en IndexedDB: van por su adaptador.
  const configActions = plan.actions.filter((a) => a.section === "configs");
  const tableActions = plan.actions.filter(
    (a) => a.section !== "progress" && a.section !== "configs",
  );
  if (tableActions.length > 0) {
    await transact(["userState", "ownReviews"], async () => {
      for (const action of tableActions) {
        const data = action.data || {};
        if (action.section === "userState") {
          // La clave del documento es la del mundo activo, no la del fichero:
          // importar en el mundo personal un respaldo hecho en la muestra no
          // puede escribir en el documento de la muestra.
          await put("userState", { ...data, key: userStateKey(scope) });
        } else if (action.section === "reviews") {
          // La estrategia «reemplazar» manda la lista entera; la de fusión,
          // una valoración por acción. Las dos se escriben fila a fila para
          // estampar el mundo en la clave.
          const filas = Array.isArray(data) ? data : [data];
          for (const fila of filas) {
            if (!fila || !fila.docentKey) continue;
            await put("ownReviews", { ...fila, id: reviewId(scope, fila.docentKey), scope });
          }
        }
      }
    });
  }
  await writeConfigs(configActions);
  if (progressCommands.length > 0) {
    await applyCommandsInTransaction(progressCommands);
  }
}
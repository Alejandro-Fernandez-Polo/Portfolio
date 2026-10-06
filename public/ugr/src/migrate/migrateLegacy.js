import { open, get, put, transact, isAvailable } from "../store/db.js";
import { buildPlan, snapshotAllKeys, alreadyMigrated, markMigration, verify, restoreFromSnapshot, cleanupLegacy, DESTINIES } from "./legacyKeys.js";
import { dispatch, initStore, getState } from "../store/commands.js";

const dbFacade = { get, getAll: (store) => import("../store/db.js").then(({ getAll: g }) => g(store)), put, transact, isAvailable };

export async function run() {
  if (await alreadyMigrated(dbFacade)) return { skipped: true };

  if (!isAvailable()) {
    return { ok: false, error: "IDB_UNSUPPORTED", degraded: true };
  }

  const legacy = await snapshotAllKeys(dbFacade);

  try {
    // CONVALIDACIONES es un global de convalidaciones.js (script clásico
    // cargado antes que el bootstrap): es lo que permite resolver id → código
    // UGR al migrar ugr-convalidaciones.
    const plan = buildPlan(legacy, { convalidaciones: globalThis.CONVALIDACIONES });

    await transact(DESTINIES, async () => {
      for (const cmd of plan.commands) {
        await applyCommand(cmd);
      }
      await put("meta", { key: "migration:legacy-v1", appliedAt: new Date().toISOString(), from: { keys: Object.keys(legacy) } });
    });

    await verify(dbFacade, plan);

    await markMigration(dbFacade);

    // Sin doble escritura: desde C3 el store es la única persistencia en modo
    // normal y app.js ya no escribe `ugr-horario-state` (el espejo se retira
    // tras esta migración one-time, que sigue siendo la vía de entrada de los
    // usuarios existentes).
    return { ok: true, migrated: plan.stats };
  } catch (err) {
    await restoreFromSnapshot(dbFacade);
    return { ok: false, error: err.message };
  }
}

async function applyCommand(cmd) {
  switch (cmd.type) {
    case "profile/setApellido":
    case "profile/setTurno":
    case "selection/toggleSubject":
    case "selection/setGroups":
    case "selection/setCuatrimestre":
    case "selection/setAll":
    case "selection/clear":
    case "filters/add":
    case "filters/remove":
    case "filters/setWeight":
    case "filters/setAll":
    case "ui/setView":
    case "ui/setCompareIds":
    case "ui/toggleFavorite":
    case "propuestas/save":
    case "propuestas/delete":
    case "propuestas/setActive":
    case "propuestas/setVista":
    case "propuestas/setAll":
    case "progress/setCredit":
    case "progress/setMapping":
    case "progress/setAll":
    case "configs/save":
      dispatch(cmd);
      break;
    default:
      console.warn("[migrate] unknown command:", cmd.type);
  }
}

export function degradeToLegacy() {
  window.__ugrDegraded = true;
}

// Un único punto de entrada: `cleanupLegacy` ya recorre todas las LEGACY_KEYS
// (incluido `ugr-horario-state`), así que mantener aquí una lista duplicada
// solo abría la puerta a que se desincronizara. En modo normal esto retira el
// fallback legacy; la verdad vive en el store.
export function resetLegacy() {
  cleanupLegacy();
}
export const SOLVER_VERSION = "1.0.0";

async function loadDb() {
  return import("../store/db.js");
}

export async function get(hash) {
  try {
    const { get, isAvailable } = await loadDb();
    if (!isAvailable()) return null;
    const row = await get("solutions", hash);
    if (!row || row.solverVersion !== SOLVER_VERSION) return null;
    return { items: row.items, stats: row.stats };
  } catch {
    return null;
  }
}

export async function put(hash, payload) {
  try {
    const { put, isAvailable } = await loadDb();
    if (!isAvailable()) return;
    await put("solutions", {
      problemHash: hash,
      solverVersion: SOLVER_VERSION,
      computedAt: new Date().toISOString(),
      ...payload,
    });
  } catch {
    /* caché best-effort: nunca rompe el solver */
  }
}

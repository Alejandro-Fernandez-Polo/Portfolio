import { solve } from "./engine.js";
import { problemHash } from "./hash.js";
import { SOLVER_VERSION } from "./version.js";

export { SOLVER_VERSION };

export async function solveTopK(problem, catalog, opts = {}) {
  const {
    k = 200,
    weights,
    seed = 1,
    timeBudgetMs = 150,
    onProgress,
    apellido = "",
    useCache = true,
  } = opts;

  const hash = await problemHash(problem, catalog, weights);

  // La caché llega **inyectada** desde el adaptador (`modules/solver.js`): el
  // solver no debe conocer el almacenamiento (Regla de Dependencia). Sin caché,
  // simplemente no se cachea.
  const cache = opts.cache || null;
  if (useCache && cache) {
    const cached = await cache.get(hash);
    if (cached) {
      if (onProgress) onProgress(cached.stats || {});
      return { items: cached.items, stats: cached.stats || {}, fromCache: true, problemHash: hash };
    }
  }

  const runOpts = { k, weights, seed, timeBudgetMs, apellido, onProgress };
  // El **ejecutor** llega inyectado desde el adaptador (hilo aparte o en línea).
  // Por defecto se resuelve en el hilo principal, que es lo que puede hacer el
  // solver sin conocer el navegador.
  const run = opts.run || ((p, cat, o) => solve(p, cat, o));
  let result;
  try {
    result = await run(problem, catalog, runOpts, onProgress);
  } catch {
    result = solve(problem, catalog, runOpts);
  }

  if (useCache && cache && result) {
    await cache.put(hash, { items: result.items, stats: result.stats, k });
  }

  return { ...result, fromCache: false, problemHash: hash };
}

export function explain(solution) {
  if (!solution) return null;
  return solution.costBreakdown || null;
}

// Tope de la comprobación de viabilidad: si no termina, no se puede afirmar que
// no haya ninguna combinación (recorrer el árbol entero cuesta como generar).
export const FEASIBILITY_BUDGET_MS = 800;

/**
 * ¿Existe al menos una combinación con estos filtros?
 *
 * `feasible === true` → hay por lo menos una; `false` → se agotó la búsqueda sin
 * ninguna (con `forceExact`, así que «no hay» es de verdad); `null` → no se pudo
 * demostrar dentro del tope de tiempo.
 *
 * No pasa por la caché a propósito: guardar un resultado parcial (k=1) bajo la
 * clave del problema haría que la generación real lo devolviera como si fuera
 * suyo.
 *
 * @param {Object} problem problema del solver.
 * @param {Object} catalog catálogo activo.
 * @param {{timeBudgetMs?: number, apellido?: string}} [opts]
 * @returns {Promise<{feasible: boolean|null, stats: Object}>}
 */
export async function checkFeasible(problem, catalog, opts = {}) {
  const { timeBudgetMs = FEASIBILITY_BUDGET_MS, apellido = "", run } = opts;
  const runOpts = { k: 1, firstSolutionOnly: true, forceExact: true, timeBudgetMs, apellido };
  // Mismo criterio que la generación: el **ejecutor** llega inyectado y, sin él,
  // se resuelve en el hilo principal.
  const execute = run || ((p, cat, o) => solve(p, cat, o));
  let result;
  try {
    result = await execute(problem, catalog, runOpts, null);
  } catch {
    result = solve(problem, catalog, runOpts);
  }
  const stats = result?.stats || {};
  const found = (stats.found ?? 0) > 0 || (result?.items?.length ?? 0) > 0;
  const unknown = !found && stats.truncated === true;
  return { feasible: found ? true : unknown ? null : false, stats };
}

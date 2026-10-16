import { registerModule, getModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import { solveTopK as clientSolveTopK, explain, checkFeasible, SOLVER_VERSION } from "../solver/client.js";
import { cancel as cancelRunner, run as runSolver } from "./solverRunner.js";
import { captureException, count } from "../monitoring/index.js";
import { cache as solutionsCache } from "../store/solutionsCache.js";

function currentCatalog() {
  const api = getModule("catalog");
  return api ? api.getCatalog() : null;
}

function withActiveCatalogVersion(problem) {
  const api = getModule("catalog");
  if (!api || typeof api.getVersion !== "function") return problem;
  const version = api.getVersion();
  return version ? { ...problem, catalogVersion: version } : problem;
}

function withEvents(options = {}) {
  const { onProgress, ...rest } = options;
  return {
    ...rest,
    onProgress: (stats) => {
      bus.emit("solver:progress", stats, "solver");
      if (onProgress) onProgress(stats);
    },
  };
}

async function solve(problem, options = {}) {
  try {
    const catalog = currentCatalog();
    if (!catalog) throw new Error("catalog no disponible");
    // El adaptador es quien conoce el almacenamiento y el navegador: aquí se
    // atan la caché y el ejecutor (hilo aparte o en línea).
    const options_ = {
      ...withEvents(options),
      cache: options.cache || solutionsCache,
      run: options.run || runSolver,
    };
    const result = await clientSolveTopK(withActiveCatalogVersion(problem), catalog, options_);
    count("ugr.generar_horario");
    bus.emit(
      "solver:solution",
      { count: result.items.length, fromCache: result.fromCache, stats: result.stats },
      "solver",
    );
    return result;
  } catch (error) {
    captureException(error);
    count("ugr.solver_error");
    throw error;
  }
}

/**
 * Comprobación de viabilidad. Igual que `solve`, inyecta aquí el catálogo
 * activo: el cliente puro (`solver/client.js`) no lo conoce, y sin él todos los
 * códigos saldrían como «missing» y cualquier problema parecería viable.
 */
async function check(problem, options = {}) {
  const catalog = currentCatalog();
  if (!catalog) throw new Error("catalog no disponible");
  return checkFeasible(withActiveCatalogVersion(problem), catalog, options);
}

export function registerSolver() {
  return registerModule({
    id: "solver",
    version: SOLVER_VERSION,
    api: { solve, solveTopK: solve, explain, cancel: cancelRunner, checkFeasible: check },
    requires: ["catalog@^1", "store@^1"],
    publishes: ["solver:progress", "solver:solution", "solver:cancelled"],
    subscribes: [],
  });
}

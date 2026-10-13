import { registerModule, getModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import { solveTopK as clientSolveTopK, cancel, explain, SOLVER_VERSION } from "../solver/client.js";
import { captureException, count } from "../monitoring/index.js";

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
    const result = await clientSolveTopK(withActiveCatalogVersion(problem), catalog, withEvents(options));
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

export function registerSolver() {
  return registerModule({
    id: "solver",
    version: SOLVER_VERSION,
    api: { solve, solveTopK: solve, explain, cancel },
    requires: ["catalog@^1", "store@^1"],
    publishes: ["solver:progress", "solver:solution", "solver:cancelled"],
    subscribes: [],
  });
}

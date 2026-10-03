import { registerModule, getModule } from "../kernel/registry.js";
import { bus } from "../kernel/bus.js";
import { solveTopK as clientSolveTopK, cancel, explain, SOLVER_VERSION } from "../solver/client.js";

function currentCatalog() {
  const api = getModule("catalog");
  return api ? api.getCatalog() : null;
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
  const catalog = currentCatalog();
  if (!catalog) throw new Error("catalog no disponible");
  const result = await clientSolveTopK(problem, catalog, withEvents(options));
  bus.emit(
    "solver:solution",
    { count: result.items.length, fromCache: result.fromCache, stats: result.stats },
    "solver",
  );
  return result;
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

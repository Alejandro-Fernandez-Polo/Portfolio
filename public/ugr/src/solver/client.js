import { solve } from "./engine.js";
import { problemHash } from "./hash.js";
import { SOLVER_VERSION } from "./cache.js";

export { SOLVER_VERSION };

let activeWorker = null;

export function cancel() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
}

function canUseWorker() {
  return typeof Worker !== "undefined";
}

function runWorker(problem, catalog, opts, onProgress) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    } catch (err) {
      reject(err);
      return;
    }
    activeWorker = worker;
    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === "solver:progress") {
        if (onProgress) onProgress(msg.stats);
      } else if (msg.type === "solver:solution") {
        worker.terminate();
        resolve(msg.result);
      } else if (msg.type === "solver:error") {
        worker.terminate();
        reject(new Error(msg.error));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({
      type: "solve",
      problem,
      catalog,
      opts: {
        k: opts.k,
        weights: opts.weights,
        seed: opts.seed,
        timeBudgetMs: opts.timeBudgetMs,
        apellido: opts.apellido,
      },
    });
  });
}

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

  const cache = opts.cache || (await import("./cache.js").catch(() => null));
  if (useCache && cache) {
    const cached = await cache.get(hash);
    if (cached) {
      if (onProgress) onProgress(cached.stats || {});
      return { items: cached.items, stats: cached.stats || {}, fromCache: true, problemHash: hash };
    }
  }

  const runOpts = { k, weights, seed, timeBudgetMs, apellido, onProgress };
  let result;
  if (canUseWorker()) {
    try {
      result = await runWorker(problem, catalog, runOpts, onProgress);
    } catch {
      result = solve(problem, catalog, runOpts);
    }
  } else {
    result = solve(problem, catalog, runOpts);
  }

  activeWorker = null;

  if (useCache && cache && result) {
    await cache.put(hash, { items: result.items, stats: result.stats, k });
  }

  return { ...result, fromCache: false, problemHash: hash };
}

export function explain(solution) {
  if (!solution) return null;
  return solution.costBreakdown || null;
}

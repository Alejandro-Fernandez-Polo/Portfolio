/**
 * Ejecutor del solver: el hilo aparte (Web Worker) cuando el navegador lo
 * ofrece, y el motor en el hilo principal cuando no.
 *
 * Vive en la capa de **adaptadores** porque `Worker` es una API del navegador:
 * el solver no debe conocerla (Regla de Dependencia). `modules/solver.js` lo
 * inyecta en el cliente, igual que hace con la caché.
 *
 * El **cancelar** es suyo: es quien tiene el hilo, así que es quien puede
 * terminarlo.
 */

import { solve } from "../solver/engine.js";

let activeWorker = null;

/** ¿Hay soporte de Worker en este entorno? (en pruebas y en SSR, no). */
export function canUseWorker() {
  return typeof Worker !== "undefined";
}

/** Mata el hilo en curso, si lo hay. Seguro sin nada en marcha. */
export function cancel() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
}

/**
 * Ejecuta el problema: en un hilo aparte si se puede, y si no en línea.
 *
 * @param {Object} problem problema del solver.
 * @param {Object} catalog catálogo activo.
 * @param {Object} opts opciones del motor (k, pesos, presupuesto…).
 * @param {(stats: Object) => void} [onProgress] progreso.
 * @returns {Promise<Object>} resultado del motor.
 */
export function run(problem, catalog, opts, onProgress) {
  if (!canUseWorker()) return solve(problem, catalog, opts);
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL("../solver/worker.js", import.meta.url), { type: "module" });
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
        firstSolutionOnly: opts.firstSolutionOnly,
        forceExact: opts.forceExact,
      },
    });
  });
}

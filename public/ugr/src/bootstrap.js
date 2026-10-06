import { open, isAvailable, getStoreMode } from "./store/db.js";
import { initStore, flush, getState, dispatch, subscribe } from "./store/commands.js";
import { run as migrateLegacy } from "./migrate/migrateLegacy.js";
import { ingestConvalidacionesEstados } from "./migrate/convalidacionesEstados.js";
import { registerModule, startAll, stopAll, getModule } from "./kernel/registry.js";
import { bus } from "./kernel/bus.js";
import { createDevtools } from "./devtools/index.js";
import { recordBootTiming } from "./devtools/index.js";
import { registerCatalog } from "./modules/catalog.js";
import { registerSolver } from "./modules/solver.js";
import { registerProgress } from "./modules/progress.js";
import { setupImportWizard } from "./ui/import-wizard.js";
import { setupProgressDashboard } from "./ui/progress-dashboard.js";

async function bootstrap() {
  recordBootTiming("bootstrap_start");

  const storeResult = await open();
  recordBootTiming("store_open");

  if (!storeResult.ok) {
    console.warn("[bootstrap] IndexedDB unavailable, running in degraded mode");
    showDegradedBanner();
  }

  const state = await initStore();
  recordBootTiming("store_hydrate");

  const migrateResult = await migrateLegacy();
  recordBootTiming("migrate_legacy");

  if (migrateResult.ok && !migrateResult.skipped) {
    console.log("[bootstrap] Legacy migration completed:", migrateResult.migrated);
  } else if (migrateResult.skipped) {
    console.log("[bootstrap] Legacy migration already done");
  } else if (migrateResult.degraded) {
    console.warn("[bootstrap] Migration skipped due to IDB unavailability");
  } else {
    console.error("[bootstrap] Migration failed:", migrateResult.error);
  }

  // Los estados de convalidación viven en el store (progress.equivalences), no
  // en localStorage: la ingesta los vuelca una vez y el dashboard ya lee de ahí.
  const ingestResult = await ingestConvalidacionesEstados();
  if (ingestResult.ok && ingestResult.ingested > 0) {
    console.log("[bootstrap] Convalidaciones legacy ingestadas al store:", ingestResult.ingested);
  } else if (!ingestResult.ok) {
    console.warn("[bootstrap] Ingesta de convalidaciones falló:", ingestResult.error);
  }

  registerModule({
    id: "store",
    version: "1.0.0",
    api: { getState, dispatch, subscribe, flush },
    requires: [],
    publishes: ["store:changed"],
    subscribes: [],
  });

  registerModule({
    id: "backup",
    version: "1.0.0",
    api: {},
    requires: ["store@^1"],
    publishes: ["backup:imported", "backup:failed"],
    subscribes: [],
  });

  const catalogModuleApi = registerCatalog();
  const solverApi = registerSolver();
  const progressApi = registerProgress();

  await startAll(bus);
  recordBootTiming("kernel_started");

  bus.emit("app:booted", { schema: 1, degraded: !storeResult.ok });
  recordBootTiming("app_booted");

  window.__ugrCatalog = catalogModuleApi;

  bus.on("catalog:updated", (envelope) => {
    document.dispatchEvent(
      new CustomEvent("ugr:catalogUpdated", { detail: envelope.payload, bubbles: false }),
    );
  });

  window.__ugrSolver = {
    solve: solverApi.solve,
    solveTopK: solverApi.solveTopK,
    cancel: solverApi.cancel,
    explain: solverApi.explain,
    getCatalog: () => {
      const catalogApi = getModule("catalog");
      return catalogApi ? catalogApi.getCatalog() : null;
    },
    listModules: () => getModule("solver") !== null,
  };

  // Puente para app.js (IIFE clásico, sin imports): excluye del dominio del
  // solver las asignaturas ya superadas. Si falta (modo degradado), app.js
  // simplemente no excluye nada.
  window.__ugrProgress = progressApi;

  // Puente para app.js: acceso al store (blocks, etc.). app.js es un IIFE
  // clásico sin imports, así que necesita acceder al store vía window.
  window.__ugrStore = {
    dispatch,
    subscribe,
    getState,
  };

  if (typeof window !== "undefined" && !window.__ugrDegraded) {
    window.__ugr = createDevtools();
  } else {
    window.__ugr = {
      dump: () => ({ degraded: true }),
      selfTest: () => ({ passed: 0, failed: 0 }),
      bench: () => ({}),
      resetLegacy: () => {},
      legacy: { start: startLegacyApp },
      bootTiming: () => ({}),
    };
  }

  await startLegacyApp();
  recordBootTiming("legacy_started");

  setupImportWizard();
  // Tras startLegacyApp: el catálogo kernel ya está cargado y la vista
  // #progress-dashboard ya está en el DOM, así el primer render del dashboard
  // sale con datos reales.
  setupProgressDashboard();

  window.addEventListener("beforeunload", () => flush());
  window.addEventListener("pagehide", () => flush());
}

function showDegradedBanner() {
  const banner = document.createElement("div");
  banner.id = "ugr-degraded-banner";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;background:#ffc107;color:#000;padding:8px;text-align:center;z-index:9999;font-family:system-ui;";
  banner.innerHTML = "⚠ Modo degradado: IndexedDB no disponible. Los cambios no se guardarán. Usa Exportar para respaldar tus datos.";
  document.body.prepend(banner);
  window.__ugrDegraded = true;
}

async function startLegacyApp() {
  if (window.__ugrLegacy && typeof window.__ugrLegacy.init === "function") {
    await window.__ugrLegacy.init();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
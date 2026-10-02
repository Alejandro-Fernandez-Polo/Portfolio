import { open, isAvailable, getStoreMode } from "./store/db.js";
import { initStore, flush, getState, dispatch, subscribe } from "./store/commands.js";
import { run as migrateLegacy } from "./migrate/migrateLegacy.js";
import { registerModule, startAll, stopAll } from "./kernel/registry.js";
import { bus } from "./kernel/bus.js";
import { createDevtools } from "./devtools/index.js";
import { recordBootTiming } from "./devtools/index.js";

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

  await startAll(bus);
  recordBootTiming("kernel_started");

  bus.emit("app:booted", { schema: 1, degraded: !storeResult.ok });
  recordBootTiming("app_booted");

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

  startLegacyApp();
  recordBootTiming("legacy_started");

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

function startLegacyApp() {
  if (window.__ugrLegacy && typeof window.__ugrLegacy.init === "function") {
    window.__ugrLegacy.init();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
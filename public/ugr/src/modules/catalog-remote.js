import { get, put } from "../store/db.js";
import { validateCatalogJSON } from "../ingest/schema.js";
import { validateCatalog } from "../solver/catalog.js";

export const MANIFEST_URL = "/ugr/datasets/manifest.json";
const DATASET_URL_PREFIX = "/ugr/datasets/";

const META_KEYS = {
  etag: "manifest.etag",
  updatedAt: "manifest.updatedAt",
  lastHash: "manifest.lastHash",
  lastCheckAt: "manifest.lastCheckAt",
  datasetEtag: "manifest.datasetEtag",
  datasetUrl: "manifest.datasetUrl",
};

function nowIso() {
  return new Date().toISOString();
}

function readHeader(res, name) {
  const headers = res && res.headers;
  if (!headers || typeof headers.get !== "function") return "";
  try {
    return headers.get(name) || "";
  } catch {
    return "";
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

async function contentHash(subjects, docents) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return "";
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(canonicalize({ subjects, docents })));
    const digest = await subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

export function createCatalogRemote(ctx) {
  const memory = {
    etag: "",
    updatedAt: "",
    lastHash: "",
    lastCheckAt: "",
    datasetEtag: "",
    datasetUrl: "",
  };
  let inFlight = null;

  async function loadState() {
    if (ctx.isStoreReady()) {
      for (const name of Object.keys(META_KEYS)) {
        try {
          const row = await get("meta", META_KEYS[name]);
          memory[name] = typeof row?.value === "string" ? row.value : "";
        } catch {}
      }
    }
    return { ...memory };
  }

  async function writeState(patch) {
    Object.assign(memory, patch);
    if (!ctx.isStoreReady()) return;
    for (const [name, value] of Object.entries(patch)) {
      try {
        await put("meta", { key: META_KEYS[name], value: value || "", updatedAt: nowIso() });
      } catch {}
    }
  }

  async function runCheck() {
    const state = await loadState();
    const now = nowIso();
    const activeMeta = (ctx.getCatalog() && ctx.getCatalog().meta) || {};
    const from = ctx.getActiveKey();

    let res;
    try {
      const headers = state.etag ? { "If-None-Match": state.etag } : {};
      res = await fetch(MANIFEST_URL, { cache: "no-store", headers });
    } catch {
      return { ok: false, reason: "network" };
    }
    if (!res) return { ok: false, reason: "network" };
    if (res.status === 304) {
      await writeState({ lastCheckAt: now });
      return { ok: true, reason: "not_modified", upToDate: true, from, lastCheckAt: now };
    }
    if (res.ok === false) {
      return { ok: false, reason: res.status ? "http" : "network", status: res.status || 0 };
    }

    let manifest;
    try {
      manifest = await res.json();
    } catch {
      return { ok: false, reason: "parse" };
    }

    const entry = manifest && Array.isArray(manifest.catalogs) ? manifest.catalogs[0] : null;
    if (!entry || typeof entry !== "object") return { ok: false, reason: "parse" };
    const { university, degree, version, url, hash } = entry;
    if (!university || !degree || !version || !hash || typeof url !== "string" || !url) {
      return { ok: false, reason: "parse" };
    }
    if (url.indexOf(DATASET_URL_PREFIX) !== 0) return { ok: false, reason: "url" };

    const etag = readHeader(res, "ETag");
    const updatedAt = typeof entry.updatedAt === "string" ? entry.updatedAt : "";

    if (hash === activeMeta.hash && version === activeMeta.version) {
      await writeState({ etag, updatedAt, lastHash: hash, lastCheckAt: now });
      return { ok: true, reason: "up_to_date", id: from, from, hash, version, lastCheckAt: now };
    }

    if (!ctx.isStoreReady()) return { ok: false, reason: "store" };

    let dres;
    try {
      const headers =
        state.datasetEtag && state.datasetUrl === url ? { "If-None-Match": state.datasetEtag } : {};
      dres = await fetch(url, { cache: "no-store", headers });
    } catch {
      return { ok: false, reason: "network" };
    }
    if (!dres) return { ok: false, reason: "network" };
    if (dres.status === 304) return { ok: false, reason: "not_modified", status: 304 };
    if (dres.ok === false) {
      return { ok: false, reason: dres.status ? "http" : "network", status: dres.status || 0 };
    }

    let dataset;
    try {
      dataset = await dres.json();
    } catch {
      return { ok: false, reason: "parse" };
    }

    const schemaCheck = validateCatalogJSON(dataset);
    if (!schemaCheck.ok) return { ok: false, reason: "invalid", errors: schemaCheck.errors };

    const semanticCheck = validateCatalog(dataset);
    if (!semanticCheck.ok) return { ok: false, reason: "invalid", errors: semanticCheck.errors };

    const metaHash = dataset.meta && dataset.meta.hash;
    if (metaHash !== hash) {
      return {
        ok: false,
        reason: "invalid",
        errors: [{ path: "meta.hash", message: `hash distinto al del manifest: ${hash}` }],
      };
    }

    const digest = await contentHash(dataset.subjects, dataset.docents);
    if (digest && hash !== `sha256-${digest}`) {
      return {
        ok: false,
        reason: "invalid",
        errors: [{ path: "meta.hash", message: "el contenido no coincide con su hash" }],
      };
    }

    const id = `${university}/${degree}/${version}`;
    const saved = await ctx.saveCatalog(dataset, { id });
    if (!saved || !saved.ok) {
      return { ok: false, reason: "save", error: (saved && saved.error) || "unknown", errors: saved && saved.errors };
    }
    const activated = await ctx.setActiveCatalogKey(saved.id);
    if (!activated || !activated.ok) {
      return { ok: false, reason: "activate", error: (activated && activated.error) || "unknown" };
    }

    const datasetEtag = readHeader(dres, "ETag");
    await writeState({ etag, updatedAt, lastHash: hash, lastCheckAt: now, datasetEtag, datasetUrl: url });

    return {
      ok: true,
      reason: "updated",
      id: saved.id,
      from,
      to: saved.id,
      hash,
      version,
      lastCheckAt: now,
    };
  }

  function checkForUpdates() {
    if (!inFlight) {
      inFlight = runCheck()
        .catch((err) => ({ ok: false, reason: "error", error: String((err && err.message) || err) }))
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  }

  async function getCatalogStatus() {
    const state = await loadState();
    const activeMeta = (ctx.getCatalog() && ctx.getCatalog().meta) || {};
    return {
      activeCatalogKey: ctx.getActiveKey(),
      lastCheckAt: state.lastCheckAt,
      lastHash: state.lastHash,
      upToDate: Boolean(state.lastHash) && state.lastHash === (activeMeta.hash || ""),
    };
  }

  return { checkForUpdates, getCatalogStatus };
}

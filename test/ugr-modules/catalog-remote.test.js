import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { createHash } from "node:crypto";
import { registerCatalog } from "../../public/ugr/src/modules/catalog.js";
import { MANIFEST_URL } from "../../public/ugr/src/modules/catalog-remote.js";
import { startAll } from "../../public/ugr/src/kernel/registry.js";
import { bus } from "../../public/ugr/src/kernel/bus.js";
import { fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";
import { EC_SUBJECTS } from "../ugr-solver/fixtures.js";
import * as dbFacade from "../../public/ugr/src/store/db.js";

vi.mock("../../public/ugr/src/store/db.js", () => {
  const tables = new Map();
  let available = true;

  function tableOf(store) {
    if (!tables.has(store)) tables.set(store, new Map());
    return tables.get(store);
  }

  function assertAvailable() {
    if (!available) {
      const err = new Error("IDB_UNSUPPORTED");
      err.name = "InvalidStateError";
      throw err;
    }
  }

  return {
    __reset() {
      tables.clear();
      available = true;
    },
    __setAvailable(value) {
      available = value;
    },
    async open() {
      return available ? { ok: true } : { ok: false, reason: "IDB_UNSUPPORTED" };
    },
    isAvailable() {
      return available;
    },
    getStoreMode() {
      return available ? "ready" : "unavailable";
    },
    async get(store, key) {
      assertAvailable();
      const row = tableOf(store).get(key);
      return row === undefined ? undefined : structuredClone(row);
    },
    async put(store, value) {
      assertAvailable();
      if (value.key === undefined) throw new Error(`missing key for store ${store}`);
      tableOf(store).set(value.key, structuredClone(value));
      return value.key;
    },
    async del(store, key) {
      assertAvailable();
      tableOf(store).delete(key);
    },
    async getAll(store) {
      assertAvailable();
      return [...tableOf(store).values()].map((row) => structuredClone(row));
    },
    async byIndex(store, index, key) {
      assertAvailable();
      return [...tableOf(store).values()]
        .filter((row) => row[index] === key)
        .map((row) => structuredClone(row));
    },
    async transact(stores, fn) {
      assertAvailable();
      return fn();
    },
    close() {},
    async stats() {
      return null;
    },
  };
});

const LEGACY_ID = "UGR/GI/legacy-1";
const DATASET_URL = "/ugr/datasets/ugr/gi/2026-1.json";
const FIXTURE_ID = "UGR/GI/2026-1";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function hashOf(subjects, docents) {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalize({ subjects, docents })))
    .digest("hex");
  return `sha256-${digest}`;
}

const normalized = fromLegacySubjects(EC_SUBJECTS.slice(0, 3));
const FIXTURE = {
  meta: {
    university: "UGR",
    degree: "GI",
    plan: "2022",
    version: "2026-1",
    hash: hashOf(normalized.subjects, normalized.docents),
    sources: ["legacy"],
  },
  subjects: normalized.subjects,
  docents: [],
};

function manifestOf(dataset, overrides = {}) {
  return {
    schemaVersion: 1,
    catalogs: [
      {
        university: dataset.meta.university,
        degree: dataset.meta.degree,
        plan: dataset.meta.plan,
        version: dataset.meta.version,
        url: DATASET_URL,
        hash: dataset.meta.hash,
        updatedAt: "2026-10-04T12:00:00.000Z",
        sources: dataset.meta.sources,
        ...overrides,
      },
    ],
  };
}

function jsonResponse(data, { status = 200, etag = "" } = {}) {
  const headers = new Headers();
  if (etag) headers.set("ETag", etag);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function notModified() {
  return {
    ok: false,
    status: 304,
    headers: new Headers(),
    json: async () => {
      throw new Error("304 sin cuerpo");
    },
  };
}

function stubFetch(handler) {
  const mock = vi.fn(async (url, init) => handler(String(url), init || {}));
  vi.stubGlobal("fetch", mock);
  return mock;
}

function onlyManifest(routes) {
  return (url, init) => {
    if (url === MANIFEST_URL && routes.manifest) return routes.manifest(url, init);
    if (url === DATASET_URL && routes.dataset) return routes.dataset(url, init);
    throw new Error(`fetch fuera de las rutas permitidas: ${url}`);
  };
}

let api;

async function boot(available = true) {
  dbFacade.__reset();
  dbFacade.__setAvailable(available);
  await startAll(bus);
}

function collectEvents() {
  const events = [];
  const off = bus.on("catalog:updated", (env) => events.push(env.payload));
  return { events, off };
}

describe("módulo catalog actualización remota", () => {
  beforeAll(() => {
    globalThis.SUBJECTS = EC_SUBJECTS;
    api = registerCatalog();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hash+version del activo coinciden → up_to_date sin fetch del dataset", async () => {
    await boot(true);
    expect(await api.saveCatalog(FIXTURE)).toEqual({ ok: true, id: FIXTURE_ID });
    expect(await api.setActiveCatalogKey(FIXTURE_ID)).toEqual({ ok: true, id: FIXTURE_ID });

    const fetchMock = stubFetch(
      onlyManifest({
        manifest: () => jsonResponse(manifestOf(FIXTURE), { etag: '"manifest-1"' }),
      }),
    );
    const { events, off } = collectEvents();

    const res = await api.checkForUpdates();
    off();

    expect(res).toMatchObject({
      ok: true,
      reason: "up_to_date",
      id: FIXTURE_ID,
      hash: FIXTURE.meta.hash,
      version: "2026-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(MANIFEST_URL);
    expect(events).toHaveLength(0);
    expect(api.getActiveCatalogKey()).toBe(FIXTURE_ID);
    expect(api.getSubjects()).toHaveLength(FIXTURE.subjects.length);

    expect((await dbFacade.get("meta", "manifest.lastHash")).value).toBe(FIXTURE.meta.hash);
    expect((await dbFacade.get("meta", "manifest.etag")).value).toBe('"manifest-1"');
    expect((await dbFacade.get("meta", "manifest.updatedAt")).value).toBe("2026-10-04T12:00:00.000Z");

    const status = await api.getCatalogStatus();
    expect(status).toMatchObject({
      activeCatalogKey: FIXTURE_ID,
      lastHash: FIXTURE.meta.hash,
      upToDate: true,
    });
    expect(status.lastCheckAt).toBeTruthy();
  });

  it("nueva versión → fetch del dataset, guardado, activación y catalog:updated", async () => {
    await boot(true);

    const fetchMock = stubFetch(
      onlyManifest({
        manifest: () => jsonResponse(manifestOf(FIXTURE), { etag: '"manifest-1"' }),
        dataset: () => jsonResponse(FIXTURE, { etag: '"dataset-1"' }),
      }),
    );
    const { events, off } = collectEvents();

    const res = await api.checkForUpdates();
    off();

    expect(res).toMatchObject({
      ok: true,
      reason: "updated",
      id: FIXTURE_ID,
      from: LEGACY_ID,
      to: FIXTURE_ID,
      version: "2026-1",
    });
    expect(api.getActiveCatalogKey()).toBe(FIXTURE_ID);
    expect(api.getSubjects()).toHaveLength(FIXTURE.subjects.length);
    expect(api.getCatalog().meta).toMatchObject(FIXTURE.meta);
    expect(api.getCatalog().meta.hash).toBe(FIXTURE.meta.hash);
    expect(api.validate().ok).toBe(true);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: FIXTURE_ID, count: FIXTURE.subjects.length });

    const list = await api.listCatalogs();
    expect(list.map((c) => c.id).sort()).toEqual([LEGACY_ID, FIXTURE_ID].sort());

    expect((await dbFacade.get("meta", "manifest.lastHash")).value).toBe(FIXTURE.meta.hash);
    expect((await dbFacade.get("meta", "manifest.datasetEtag")).value).toBe('"dataset-1"');
    expect((await dbFacade.get("meta", "manifest.datasetUrl")).value).toBe(DATASET_URL);

    const second = await api.checkForUpdates();
    expect(second).toMatchObject({ ok: true, reason: "up_to_date", id: FIXTURE_ID });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(DATASET_URL);
    const manifestAgain = fetchMock.mock.calls[2];
    expect(manifestAgain[0]).toBe(MANIFEST_URL);
    expect(manifestAgain[1].headers["If-None-Match"]).toBe('"manifest-1"');
  });

  it("dataset inválido según validateCatalogJSON → invalid y no se guarda nada", async () => {
    await boot(true);
    const broken = { ...FIXTURE, subjects: [{ nombre: "asignatura incompleta" }] };

    const fetchMock = stubFetch(
      onlyManifest({
        manifest: () => jsonResponse(manifestOf(FIXTURE), { etag: '"manifest-1"' }),
        dataset: () => jsonResponse(broken),
      }),
    );
    const { events, off } = collectEvents();

    const res = await api.checkForUpdates();
    off();

    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid");
    expect(Array.isArray(res.errors)).toBe(true);
    expect(res.errors.length).toBeGreaterThan(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await api.getCatalogById(FIXTURE_ID)).toBeNull();
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(api.getSubjects()).toHaveLength(EC_SUBJECTS.length);
    expect(await api.listCatalogs()).toHaveLength(1);
    expect(events).toHaveLength(0);
    expect(await dbFacade.get("meta", "manifest.lastHash")).toBeUndefined();
    expect(await dbFacade.get("meta", "manifest.etag")).toBeUndefined();
    expect(await dbFacade.get("meta", "manifest.lastCheckAt")).toBeUndefined();
  });

  it("fallo de red → network y el catálogo activo no cambia", async () => {
    await boot(true);
    const fetchMock = stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    const res = await api.checkForUpdates();

    expect(res).toEqual({ ok: false, reason: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(MANIFEST_URL);
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(api.getSubjects()).toHaveLength(EC_SUBJECTS.length);
    expect(await api.getCatalogById(FIXTURE_ID)).toBeNull();
    expect(await dbFacade.get("meta", "manifest.etag")).toBeUndefined();

    const status = await api.getCatalogStatus();
    expect(status).toEqual({ activeCatalogKey: LEGACY_ID, lastCheckAt: "", lastHash: "", upToDate: false });
  });

  it("304 en el manifest → sin fetch del dataset y sin cambios", async () => {
    await boot(true);
    await dbFacade.put("meta", {
      key: "manifest.etag",
      value: '"manifest-1"',
      updatedAt: "2026-10-04T12:00:00.000Z",
    });

    const fetchMock = stubFetch(onlyManifest({ manifest: () => notModified() }));
    const { events, off } = collectEvents();

    const res = await api.checkForUpdates();
    off();

    expect(res).toMatchObject({ ok: true, reason: "not_modified", upToDate: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(MANIFEST_URL);
    expect(fetchMock.mock.calls[0][1].headers["If-None-Match"]).toBe('"manifest-1"');
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(events).toHaveLength(0);

    const status = await api.getCatalogStatus();
    expect(status.lastCheckAt).toBeTruthy();
    expect(status.upToDate).toBe(false);
  });

  it("manifest mal formado → parse sin tocar el catálogo", async () => {
    await boot(true);
    const fetchMock = stubFetch(
      onlyManifest({ manifest: () => jsonResponse({ schemaVersion: 1, catalogs: [] }) }),
    );

    const res = await api.checkForUpdates();

    expect(res).toEqual({ ok: false, reason: "parse" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(await api.listCatalogs()).toHaveLength(1);
  });

  it("url del dataset fuera de /ugr/datasets/ → reason url sin ese fetch", async () => {
    await boot(true);
    const evil = manifestOf(FIXTURE, { url: "https://ejemplo.com/catalogo.json" });

    const fetchMock = stubFetch(onlyManifest({ manifest: () => jsonResponse(evil) }));

    const res = await api.checkForUpdates();

    expect(res).toEqual({ ok: false, reason: "url" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(MANIFEST_URL);
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
  });

  it("hash del manifest distinto al del dataset → invalid sin guardar", async () => {
    await boot(true);
    const tampered = {
      ...FIXTURE,
      meta: { ...FIXTURE.meta, hash: `sha256-${"0".repeat(64)}` },
    };

    stubFetch(
      onlyManifest({
        manifest: () => jsonResponse(manifestOf(FIXTURE)),
        dataset: () => jsonResponse(tampered),
      }),
    );

    const res = await api.checkForUpdates();

    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid");
    expect(res.errors.length).toBeGreaterThan(0);
    expect(await api.getCatalogById(FIXTURE_ID)).toBeNull();
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
  });

  it("contenido alterado respecto al hash declarado → invalid sin guardar", async () => {
    await boot(true);
    const tampered = structuredClone(FIXTURE);
    tampered.subjects[0].nombre = "Nombre alterado";

    stubFetch(
      onlyManifest({
        manifest: () => jsonResponse(manifestOf(FIXTURE)),
        dataset: () => jsonResponse(tampered),
      }),
    );

    const res = await api.checkForUpdates();

    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid");
    expect(res.errors.length).toBeGreaterThan(0);
    expect(await api.getCatalogById(FIXTURE_ID)).toBeNull();
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
  });

  it("store no disponible → reason store sin fetch del dataset", async () => {
    await boot(false);
    const fetchMock = stubFetch(
      onlyManifest({
        manifest: () => jsonResponse(manifestOf(FIXTURE), { etag: '"manifest-1"' }),
        dataset: () => jsonResponse(FIXTURE),
      }),
    );

    const res = await api.checkForUpdates();

    expect(res).toEqual({ ok: false, reason: "store" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(api.getSubjects()).toHaveLength(EC_SUBJECTS.length);
    expect(api.validate().ok).toBe(true);
  });

  it("getCatalogStatus antes de ningún check → vacío y upToDate false", async () => {
    await boot(true);

    expect(await api.getCatalogStatus()).toEqual({
      activeCatalogKey: LEGACY_ID,
      lastCheckAt: "",
      lastHash: "",
      upToDate: false,
    });
  });

  it("el arranque dispara checkForUpdates en segundo plano", async () => {
    globalThis.window = {};
    try {
      const fetchMock = stubFetch(onlyManifest({ manifest: () => notModified() }));

      await boot(true);

      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(fetchMock.mock.calls[0][0]).toBe(MANIFEST_URL);
      expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
      await vi.waitFor(async () => {
        const status = await api.getCatalogStatus();
        expect(status.lastCheckAt).toBeTruthy();
      });
    } finally {
      delete globalThis.window;
      vi.unstubAllGlobals();
    }
  });
});

import { describe, it, expect, beforeAll, vi } from "vitest";
import { registerCatalog } from "../../public/ugr/src/modules/catalog.js";
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

function customCatalog(count, meta) {
  return fromLegacySubjects(EC_SUBJECTS.slice(0, count), meta);
}

const UPM_META = { university: "UPM", degree: "GI", plan: "2024", version: "v1" };

let api;

async function boot(available = true) {
  dbFacade.__reset();
  dbFacade.__setAvailable(available);
  await startAll(bus);
}

describe("módulo catalog multi-catálogo", () => {
  beforeAll(() => {
    globalThis.SUBJECTS = EC_SUBJECTS;
    api = registerCatalog();
  });

  it("siembra el catálogo legacy en el primer arranque y lo activa", async () => {
    const loaded = [];
    const off = bus.on("catalog:loaded", (env) => loaded.push(env.payload));
    await boot(true);
    off();

    const list = await api.listCatalogs();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: LEGACY_ID,
      university: "UGR",
      degree: "GI",
      version: "legacy-1",
      subjectCount: EC_SUBJECTS.length,
    });

    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(api.getSubjects()).toHaveLength(EC_SUBJECTS.length);
    expect(api.getVersion()).toContain("legacy-1");
    expect(api.validate().ok).toBe(true);
    expect(api.getCatalog().meta).toMatchObject({
      university: "UGR",
      degree: "GI",
      plan: "2022",
      version: "legacy-1",
    });

    const metaRow = await dbFacade.get("meta", "activeCatalog");
    expect(metaRow.value).toBe(LEGACY_ID);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({ ok: true, id: LEGACY_ID, count: EC_SUBJECTS.length });
  });

  it("saveCatalog valida, deriva el id desde meta y persiste", async () => {
    await boot(true);

    const invalid = {
      meta: { university: "UPM", degree: "GI", plan: "2024", version: "bad", hash: "" },
      subjects: [EC_SUBJECTS[0], EC_SUBJECTS[0]],
      docents: [],
    };
    const bad = await api.saveCatalog(invalid);
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("invalid_catalog");
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(await api.getCatalogById("UPM/GI/bad")).toBeNull();

    const noMeta = customCatalog(1, { university: "", degree: "", version: "" });
    expect(await api.saveCatalog(noMeta)).toEqual({ ok: false, error: "missing_meta" });

    const custom = customCatalog(2, UPM_META);
    expect(await api.saveCatalog(custom)).toEqual({ ok: true, id: "UPM/GI/v1" });

    const list = await api.listCatalogs();
    expect(list.map((c) => c.id)).toContain("UPM/GI/v1");

    const record = await api.getCatalogById("UPM/GI/v1");
    expect(record.key).toBe("UPM/GI/v1");
    expect(record.subjects).toHaveLength(2);
    expect(record.createdAt).toBeTruthy();
    expect(record.updatedAt).toBeTruthy();

    const exported = await api.exportCatalog("UPM/GI/v1");
    expect(exported.meta).toMatchObject({ university: "UPM", degree: "GI", version: "v1" });
    expect(exported.subjects).toHaveLength(2);
    expect(exported).not.toHaveProperty("key");
    expect(exported).not.toHaveProperty("createdAt");
    expect(exported).not.toHaveProperty("updatedAt");

    expect(await api.saveCatalog(custom, { id: "custom/id" })).toEqual({ ok: true, id: "custom/id" });
    expect((await api.listCatalogs()).map((c) => c.id)).toContain("custom/id");
  });

  it("listCatalogs ordena por updatedAt descendente", async () => {
    await boot(true);

    await dbFacade.put("catalogs", {
      key: "ZZZ/1/old",
      meta: { university: "ZZZ", degree: "1", plan: "1", version: "old", hash: "" },
      subjects: [],
      docents: [],
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
    });
    await dbFacade.put("catalogs", {
      key: "ZZZ/1/new",
      meta: { university: "ZZZ", degree: "1", plan: "1", version: "new", hash: "" },
      subjects: [EC_SUBJECTS[0]],
      docents: [],
      createdAt: "2999-01-01T00:00:00.000Z",
      updatedAt: "2999-01-01T00:00:00.000Z",
    });

    const list = await api.listCatalogs();
    expect(list.map((c) => c.id)).toEqual(["ZZZ/1/new", LEGACY_ID, "ZZZ/1/old"]);
    expect(list[0]).toMatchObject({ university: "ZZZ", plan: "1", version: "new", subjectCount: 1 });
    expect(list[2]).toMatchObject({ university: "ZZZ", version: "old", subjectCount: 0 });
  });

  it("setActiveCatalogKey cambia getSubjects()/getVersion() y emite catalog:updated", async () => {
    await boot(true);
    const legacyVersion = api.getVersion();

    const saved = await api.saveCatalog(customCatalog(2, UPM_META));
    expect(saved).toEqual({ ok: true, id: "UPM/GI/v1" });

    const events = [];
    const off = bus.on("catalog:updated", (env) => events.push(env.payload));
    const res = await api.setActiveCatalogKey(saved.id);
    off();

    expect(res).toEqual({ ok: true, id: "UPM/GI/v1" });
    expect(api.getActiveCatalogKey()).toBe("UPM/GI/v1");
    expect(api.getSubjects()).toHaveLength(2);
    expect(api.getVersion()).not.toBe(legacyVersion);
    expect(api.getCatalog().meta.university).toBe("UPM");
    expect(api.validate().ok).toBe(true);

    const subject = EC_SUBJECTS[0];
    expect(api.getGroup(subject.codigo, subject.grupos[0].letra)).toBeTruthy();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: "UPM/GI/v1", count: 2 });

    const metaRow = await dbFacade.get("meta", "activeCatalog");
    expect(metaRow.value).toBe("UPM/GI/v1");

    expect(await api.setActiveCatalogKey("nope")).toEqual({ ok: false, error: "not_found" });

    expect(await api.setActiveCatalogKey(LEGACY_ID)).toEqual({ ok: true, id: LEGACY_ID });
    expect(api.getSubjects()).toHaveLength(EC_SUBJECTS.length);
    expect(api.getVersion()).toBe(legacyVersion);
  });

  it("deleteCatalog no permite borrar el activo ni el último restante", async () => {
    await boot(true);

    expect(await api.deleteCatalog(LEGACY_ID)).toEqual({ ok: false, error: "active_catalog" });
    expect(await api.deleteCatalog("nope")).toEqual({ ok: false, error: "not_found" });

    const custom = customCatalog(2, UPM_META);
    await api.saveCatalog(custom);
    expect(await api.deleteCatalog("UPM/GI/v1")).toEqual({ ok: true, id: "UPM/GI/v1" });
    expect((await api.listCatalogs()).map((c) => c.id)).toEqual([LEGACY_ID]);

    await api.saveCatalog(custom);
    await dbFacade.del("catalogs", LEGACY_ID);
    expect(await api.deleteCatalog("UPM/GI/v1")).toEqual({ ok: false, error: "last_catalog" });
    expect(await api.listCatalogs()).toHaveLength(1);
  });

  it("modo degradado: no lanza y devuelve vacíos o errores claros", async () => {
    await boot(false);

    expect(dbFacade.isAvailable()).toBe(false);
    expect(api.getSubjects()).toHaveLength(EC_SUBJECTS.length);
    expect(api.getActiveCatalogKey()).toBe(LEGACY_ID);
    expect(api.validate().ok).toBe(true);

    expect(await api.listCatalogs()).toEqual([]);
    expect(await api.getCatalogById(LEGACY_ID)).toBeNull();
    expect(await api.exportCatalog(LEGACY_ID)).toBeNull();

    const custom = customCatalog(1, UPM_META);
    expect(await api.saveCatalog(custom)).toEqual({ ok: false, error: "store_unavailable" });
    expect(await api.setActiveCatalogKey(LEGACY_ID)).toEqual({ ok: false, error: "store_unavailable" });
    expect(await api.deleteCatalog("UPM/GI/v1")).toEqual({ ok: false, error: "store_unavailable" });
  });
});

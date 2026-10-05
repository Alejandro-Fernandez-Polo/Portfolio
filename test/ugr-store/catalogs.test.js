import { describe, it, expect } from "vitest";
import Dexie from "../../public/ugr/src/vendor/dexie.mjs";
import {
  SCHEMA_VERSION,
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_VERSIONS,
} from "../../public/ugr/src/store/schema.js";
import { SCHEMA_MIGRATIONS } from "../../public/ugr/src/store/migrations.js";

const V1_KEYS = Object.keys(SCHEMA_V1);

function buildDb() {
  const db = new Dexie("schema-check");
  for (const { version, stores } of SCHEMA_VERSIONS) {
    db.version(version).stores(stores);
  }
  for (const m of SCHEMA_MIGRATIONS) {
    if (m.version <= SCHEMA_VERSION && m.up) {
      db.version(m.version).upgrade(async (tx) => {
        await m.up(tx);
        await tx.table("meta").put({ key: `migration:${m.name}` });
      });
    }
  }
  return db;
}

describe("esquema v2 multi-catálogo", () => {
  it("declara SCHEMA_VERSION = 2 y el store catalogs con índice de orden", () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(SCHEMA_V2.catalogs).toBe("key, updatedAt");
  });

  it("SCHEMA_V2 conserva todos los stores v1 intactos", () => {
    for (const key of V1_KEYS) {
      expect(SCHEMA_V2[key]).toBe(SCHEMA_V1[key]);
    }
    expect(Object.keys(SCHEMA_V2)).toHaveLength(V1_KEYS.length + 1);
  });

  it("SCHEMA_VERSIONS declara v1 y v2 sin superar la versión actual", () => {
    expect(SCHEMA_VERSIONS.map((s) => s.version)).toEqual([1, 2]);
    expect(SCHEMA_VERSIONS[0].stores).toEqual(SCHEMA_V1);
    expect(SCHEMA_VERSIONS[1].stores).toEqual(SCHEMA_V2);
    expect(SCHEMA_VERSIONS.every((s) => s.version <= SCHEMA_VERSION)).toBe(true);
  });

  it("incluye la migración catalogs-store en la versión 2", () => {
    const migration = SCHEMA_MIGRATIONS.find((m) => m.version === 2);
    expect(migration).toBeTruthy();
    expect(migration.name).toBe("catalogs-store");
    expect(typeof migration.up).toBe("function");
    expect(SCHEMA_MIGRATIONS.every((m) => m.version <= SCHEMA_VERSION)).toBe(true);
  });
});

describe("mecánica de declaración Dexie (sin open)", () => {
  it("queda en verno 2 con las versiones 1 y 2 ordenadas", () => {
    const db = buildDb();
    expect(db.verno).toBe(2);
    expect(db._versions.map((v) => v._cfg.version)).toEqual([1, 2]);
  });

  it("la versión 1 conserva sus stores (el upgrade 1→2 no borra nada)", () => {
    const db = buildDb();
    const v1 = db._versions[0]._cfg.dbschema;
    expect(Object.keys(v1).sort()).toEqual([...V1_KEYS].sort());
    expect(v1).not.toHaveProperty("catalogs");
  });

  it("la versión 2 añade catalogs sin perder los stores v1", () => {
    const db = buildDb();
    const v2 = db._versions[1]._cfg.dbschema;
    expect(Object.keys(v2).sort()).toEqual([...V1_KEYS, "catalogs"].sort());
    expect(v2.catalogs.primKey.keyPath).toBe("key");
    expect(v2.catalogs.idxByName).toHaveProperty("updatedAt");
  });

  it("registra los upgrade() de ambas versiones", () => {
    const db = buildDb();
    expect(typeof db._versions[0]._cfg.contentUpgrade).toBe("function");
    expect(typeof db._versions[1]._cfg.contentUpgrade).toBe("function");
  });

  it("la forma ingenua (v2 sin declarar v1 con sus stores) vaciaría v1: por eso existe SCHEMA_VERSIONS", () => {
    const db = new Dexie("naive-check");
    db.version(2).stores(SCHEMA_V2);
    db.version(1).upgrade(async () => {});

    expect(Object.keys(db._versions[0]._cfg.dbschema)).toEqual([]);
    expect(Object.keys(db._versions[1]._cfg.dbschema)).toContain("catalogs");
  });
});

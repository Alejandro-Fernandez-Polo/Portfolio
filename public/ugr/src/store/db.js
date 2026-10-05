import Dexie from "../vendor/dexie.mjs";
import { DB_NAME, SCHEMA_VERSION, SCHEMA_VERSIONS } from "./schema.js";
import { SCHEMA_MIGRATIONS } from "./migrations.js";

let db = null;
let storeMode = "pending";

class StoreError extends Error {
  constructor(code, op, store, key, cause) {
    super(cause?.message || code);
    this.name = "StoreError";
    this.code = code;
    this.op = op;
    this.store = store;
    this.key = key;
    this.cause = cause;
  }
}

function translateError(op, store, key, err) {
  const name = err?.name || "";
  if (name === "QuotaExceededError") return new StoreError("QUOTA_EXCEEDED", op, store, key, err);
  if (name === "ConstraintError") return new StoreError("CONSTRAINT_ERROR", op, store, key, err);
  if (name === "DatabaseClosedError" || name === "InvalidStateError") return new StoreError("DB_CLOSED", op, store, key, err);
  if (name === "NotFoundError") return new StoreError("NOT_FOUND", op, store, key, err);
  return new StoreError("UNKNOWN", op, store, key, err);
}

export async function open() {
  if (storeMode === "ready") return { ok: true };
  if (storeMode === "unavailable") return { ok: false, reason: "IDB_UNSUPPORTED" };

  try {
    db = new Dexie(DB_NAME);
    for (const { version, stores } of SCHEMA_VERSIONS) {
      db.version(version).stores(stores);
    }

    for (const m of SCHEMA_MIGRATIONS) {
      if (m.version <= SCHEMA_VERSION && m.up) {
        db.version(m.version).upgrade(async (tx) => {
          await m.up(tx);
          await tx.table("meta").put({ key: `migration:${m.name}`, appliedAt: new Date().toISOString(), version: m.version });
        });
      }
    }

    await db.open();
    storeMode = "ready";
    return { ok: true };
  } catch (err) {
    storeMode = "unavailable";
    return { ok: false, reason: "IDB_UNSUPPORTED" };
  }
}

export async function get(store, key) {
  if (storeMode !== "ready") throw new StoreError("IDB_UNSUPPORTED", "get", store, key);
  try {
    return await db[store].get(key);
  } catch (err) {
    throw translateError("get", store, key, err);
  }
}

export async function put(store, value) {
  if (storeMode !== "ready") throw new StoreError("IDB_UNSUPPORTED", "put", store, undefined);
  try {
    return await db[store].put(value);
  } catch (err) {
    throw translateError("put", store, undefined, err);
  }
}

export async function del(store, key) {
  if (storeMode !== "ready") throw new StoreError("IDB_UNSUPPORTED", "del", store, key);
  try {
    await db[store].delete(key);
  } catch (err) {
    throw translateError("del", store, key, err);
  }
}

export async function getAll(store, opts) {
  if (storeMode !== "ready") throw new StoreError("IDB_UNSUPPORTED", "getAll", store);
  try {
    let collection = db[store];
    if (opts?.index && opts?.range) {
      collection = collection.where(opts.index).between(opts.range[0], opts.range[1], true, true);
    } else if (opts?.index && opts?.key) {
      collection = collection.where(opts.index).equals(opts.key);
    }
    return await collection.toArray();
  } catch (err) {
    throw translateError("getAll", store, undefined, err);
  }
}

export async function byIndex(store, index, key) {
  if (storeMode !== "ready") throw new StoreError("IDB_UNSUPPORTED", "byIndex", store);
  try {
    return await db[store].where(index).equals(key).toArray();
  } catch (err) {
    throw translateError("byIndex", store, undefined, err);
  }
}

export async function transact(stores, fn) {
  if (storeMode !== "ready") throw new StoreError("IDB_UNSUPPORTED", "transact", stores.join(","));
  try {
    return await db.transaction("rw", ...stores, async () => {
      return await fn();
    });
  } catch (err) {
    throw translateError("transact", stores.join(","), undefined, err);
  }
}

export function close() {
  if (db) {
    db.close();
    db = null;
    storeMode = "pending";
  }
}

export function isAvailable() {
  return storeMode === "ready";
}

export async function stats() {
  if (storeMode !== "ready") return null;
  const counts = {};
  for (const table of db.tables) {
    counts[table.name] = await table.count();
  }
  return counts;
}

export function getStoreMode() {
  return storeMode;
}
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { canonicalJSON, problemHash, sha256Hex } from "../../public/ugr/src/solver/hash.js";
import { solveTopK, cancel, SOLVER_VERSION } from "../../public/ugr/src/solver/client.js";
import { fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";
import { EC_SUBJECTS, EC_CODES } from "./fixtures.js";

const catalog = fromLegacySubjects(EC_SUBJECTS);
const problem = { subjects: EC_CODES, filters: [], catalogVersion: "fixtures-ec" };

const noopCache = { get: async () => null, put: async () => {} };

describe("canonicalJSON", () => {
  it("is stable regardless of key order", () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
  });

  it("preserves array order", () => {
    expect(canonicalJSON([1, 2])).not.toBe(canonicalJSON([2, 1]));
  });
});

describe("problemHash", () => {
  it("produces a stable sha-256 hex", async () => {
    const h = await problemHash(problem, catalog);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await problemHash(problem, catalog)).toBe(h);
  });

  it("changes when filters change", async () => {
    const a = await problemHash(problem, catalog);
    const b = await problemHash(
      { ...problem, filters: [{ type: "freeDays", value: ["viernes"] }] },
      catalog,
    );
    expect(a).not.toBe(b);
  });

  it("changes when weights change", async () => {
    const a = await problemHash(problem, catalog);
    const b = await problemHash(problem, catalog, { professor: 1000 });
    expect(a).not.toBe(b);
  });

  it("changes when docentScores change", async () => {
    const a = await problemHash(problem, catalog);
    const b = await problemHash({ ...problem, docentScores: { "FFT-A": 6 } }, catalog);
    expect(a).not.toBe(b);
  });

  it("sha256Hex matches the known digest of empty-ish input", async () => {
    const digest = await sha256Hex("abc");
    expect(digest).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("solveTopK", () => {
  let originalWorker;
  beforeEach(() => {
    originalWorker = globalThis.Worker;
    globalThis.Worker = undefined;
  });
  afterEach(() => {
    globalThis.Worker = originalWorker;
    cancel();
  });

  it("runs the inline fallback and returns schedules", async () => {
    const result = await solveTopK(problem, catalog, { k: 5, cache: noopCache });
    expect(result.fromCache).toBe(false);
    expect(result.items.length).toBe(5);
    expect(result.problemHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses the cache on a hit", async () => {
    const hash = await problemHash(problem, catalog);
    const cache = {
      get: async (h) =>
        h === hash
          ? { items: [{ cost: 1, groupChoices: {}, selectedSubjects: {} }], stats: { found: 1 } }
          : null,
      put: async () => {},
    };
    const result = await solveTopK(problem, catalog, { k: 5, cache });
    expect(result.fromCache).toBe(true);
    expect(result.items).toHaveLength(1);
  });

  it("writes to the cache on a miss", async () => {
    const writes = [];
    const cache = { get: async () => null, put: async (h, payload) => writes.push({ h, payload }) };
    await solveTopK(problem, catalog, { k: 3, cache });
    expect(writes).toHaveLength(1);
    expect(writes[0].payload.k).toBe(3);
  });

  it("exposes the solver version", () => {
    expect(SOLVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("cancel() is safe with no active run", () => {
    expect(() => cancel()).not.toThrow();
  });
});

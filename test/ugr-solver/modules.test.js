import { describe, it, expect, beforeAll } from "vitest";
import { registerCatalog } from "../../public/ugr/src/modules/catalog.js";
import { registerSolver } from "../../public/ugr/src/modules/solver.js";
import { registerModule, startAll, getModule } from "../../public/ugr/src/kernel/registry.js";
import { bus } from "../../public/ugr/src/kernel/bus.js";
import { EC_SUBJECTS, EC_CODES } from "./fixtures.js";

const noopCache = { get: async () => null, put: async () => {} };
let catalogApi;
let solverApi;

describe("kernel modules", () => {
  beforeAll(async () => {
    globalThis.SUBJECTS = EC_SUBJECTS;
    registerModule({ id: "store", version: "1.0.0", api: { ok: true } });
    catalogApi = registerCatalog();
    solverApi = registerSolver();
    await startAll(bus);
  });

  it("registers catalog and solver", () => {
    expect(getModule("catalog")).toBeTruthy();
    expect(getModule("solver")).toBeTruthy();
  });

  it("loads the catalog from the legacy global", () => {
    expect(catalogApi.getSubjects()).toHaveLength(6);
    expect(catalogApi.getVersion()).toContain("6");
    expect(catalogApi.validate().ok).toBe(true);
  });

  it("solves through the module API", async () => {
    const result = await solverApi.solveTopK(
      { subjects: EC_CODES, filters: [], catalogVersion: "fixtures-ec" },
      { k: 5, cache: noopCache },
    );
    expect(result.items).toHaveLength(5);
    expect(result.items[0].groupChoices).toBeTruthy();
  });

  it("explains a solution cost", async () => {
    const result = await solverApi.solveTopK(
      { subjects: EC_CODES, filters: [], catalogVersion: "fixtures-ec" },
      { k: 1, cache: noopCache },
    );
    const breakdown = solverApi.explain(result.items[0]);
    expect(breakdown).toHaveProperty("deadHours");
  });
});

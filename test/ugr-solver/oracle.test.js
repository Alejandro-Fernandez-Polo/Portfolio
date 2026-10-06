import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";
import { solve } from "../../public/ugr/src/solver/engine.js";
import { EC_SUBJECTS, EC_CODES, EC_EXPECTED_COUNT } from "./fixtures.js";

// Fixture extraído de predefined_ec.js (borrado en la limpieza legacy).
// Contiene las 133 groupChoices del corpus EC para el test diferencial.
const ORACLE_PATH = fileURLToPath(new URL("./oracle-ec.json", import.meta.url));

function loadOracle() {
  return JSON.parse(readFileSync(ORACLE_PATH, "utf8"));
}

function signature(groupChoices) {
  return Object.entries(groupChoices)
    .map(([code, g]) => `${code}:${g.teoria}:${g.practica}`)
    .sort()
    .join("|");
}

describe("differential test vs precomputed corpus", () => {
  it("the oracle fixture is the 133 corpus", () => {
    const oracle = loadOracle();
    expect(oracle).toHaveLength(EC_EXPECTED_COUNT);
  });

  it("engine reproduces the exact set of groupChoices", () => {
    const oracle = loadOracle();
    const expected = new Set(oracle.map((c) => signature(c.groupChoices)));

    const catalog = fromLegacySubjects(EC_SUBJECTS);
    const { items, stats } = solve(
      { subjects: EC_CODES, filters: [], catalogVersion: "oracle-ec" },
      catalog,
      { k: Number.MAX_SAFE_INTEGER, seed: 1 },
    );
    expect(stats.found).toBe(EC_EXPECTED_COUNT);

    const got = new Set(items.map((it) => signature(it.groupChoices)));
    expect(got).toEqual(expected);
  });
});

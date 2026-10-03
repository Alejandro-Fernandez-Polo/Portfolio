import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";
import { solve } from "../../public/ugr/src/solver/engine.js";
import { EC_SUBJECTS, EC_CODES, EC_EXPECTED_COUNT } from "./fixtures.js";

const ORACLE_PATH = fileURLToPath(
  new URL("../../public/ugr/predefined/predefined_ec.js", import.meta.url),
);

function loadOracle() {
  const source = readFileSync(ORACLE_PATH, "utf8");
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.__EC__ = PREDEFINED_SCHEDULES_EC;`, sandbox);
  return sandbox.__EC__;
}

function signature(groupChoices) {
  return Object.entries(groupChoices)
    .map(([code, g]) => `${code}:${g.teoria}:${g.practica}`)
    .sort()
    .join("|");
}

describe("differential test vs precomputed corpus", () => {
  it("the oracle file exists and is the 133 corpus", () => {
    expect(existsSync(ORACLE_PATH)).toBe(true);
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

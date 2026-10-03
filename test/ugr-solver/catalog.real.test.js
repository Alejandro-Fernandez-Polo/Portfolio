import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { fromLegacySubjects, validateCatalog, catalogVersion } from "../../public/ugr/src/solver/catalog.js";

const DATA_PATH = fileURLToPath(new URL("../../public/ugr/data.js", import.meta.url));

function loadLegacySubjects() {
  const source = readFileSync(DATA_PATH, "utf8");
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.__SUBJECTS__ = SUBJECTS;`, sandbox);
  return sandbox.__SUBJECTS__;
}

describe("catalog against real data.js", () => {
  it("normalizes all 42 subjects without validation errors", () => {
    const legacy = loadLegacySubjects();
    expect(legacy).toHaveLength(42);
    const catalog = fromLegacySubjects(legacy);
    const result = validateCatalog(catalog);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("every subject has a course and a term", () => {
    const catalog = fromLegacySubjects(loadLegacySubjects());
    for (const subject of catalog.subjects) {
      expect(subject.curso).toBeGreaterThanOrEqual(1);
      expect(subject.curso).toBeLessThanOrEqual(4);
      expect([1, 2]).toContain(subject.cuatrimestre);
    }
  });

  it("exposes a stable version string", () => {
    const catalog = fromLegacySubjects(loadLegacySubjects());
    expect(catalogVersion(catalog)).toMatch(/legacy-1::42$/);
  });
});

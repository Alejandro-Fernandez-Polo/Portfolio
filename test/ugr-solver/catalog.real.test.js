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
  it("normalizes every subject of data.js without validation errors", () => {
    const legacy = loadLegacySubjects();
    // El número sale del fichero: `data.js` lo reconstruye el repaso del horario
    // y crece cuando el horario publica asignaturas que antes no estaban.
    expect(legacy.length).toBeGreaterThan(40);
    expect(new Set(legacy.map((s) => s.codigo)).size).toBe(legacy.length);
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
    const legacy = loadLegacySubjects();
    const catalog = fromLegacySubjects(legacy);
    expect(catalogVersion(catalog)).toMatch(new RegExp(`legacy-1::${legacy.length}$`));
  });
});

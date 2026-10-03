import { fromLegacySubjects } from "./catalog.js";
import { solve } from "./engine.js";
import { EC_SUBJECTS, EC_CODES } from "./fixtures.js";

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes"];

function syntheticCatalog(nSubjects, nGroups) {
  const subjects = [];
  for (let i = 0; i < nSubjects; i++) {
    const dia = DAYS[i % DAYS.length];
    const subgrupos = [];
    const practicas = { subgrupos };
    for (let g = 0; g < nGroups; g++) {
      const h = 8 + g;
      subgrupos.push(`A${g + 1}`);
      practicas[`A${g + 1}`] = [{ dia, inicio: `${h}:00`, fin: `${h + 1}:00` }];
    }
    subjects.push({
      codigo: `B${i}`,
      nombre: `Bench ${i}`,
      curso: 1,
      cuatrimestre: 1,
      creditos: 6,
      grupos: [{ letra: "A", turno: "mañana", teoria: [], practicas }],
    });
  }
  return subjects;
}

function summary(result) {
  return {
    ms: Math.round(result.stats.elapsedMs * 100) / 100,
    found: result.stats.found,
    nodes: result.stats.nodes,
    approximate: result.stats.approximate,
    truncated: result.stats.truncated,
    nps: result.stats.elapsedMs > 0 ? Math.round(result.stats.nodes / (result.stats.elapsedMs / 1000)) : 0,
  };
}

export function runBench() {
  const ecCatalog = fromLegacySubjects(EC_SUBJECTS);
  const ec = solve({ subjects: EC_CODES, filters: [], catalogVersion: "bench-ec" }, ecCatalog, {
    k: 200,
    seed: 1,
  });

  const nSubjects = 7;
  const codes = Array.from({ length: nSubjects }, (_, i) => `B${i}`);
  const bigCatalog = fromLegacySubjects(syntheticCatalog(nSubjects, 9));
  const worst = solve({ subjects: codes, filters: [], catalogVersion: "bench-worst" }, bigCatalog, {
    k: 200,
    seed: 1,
    timeBudgetMs: 1500,
  });

  return {
    ec: { ...summary(ec), expected: 133 },
    worst: summary(worst),
  };
}

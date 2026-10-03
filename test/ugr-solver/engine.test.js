import { describe, it, expect } from "vitest";
import { fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";
import { solve, buildDomains } from "../../public/ugr/src/solver/engine.js";
import { createGrid, maskForSession, collides, apply } from "../../public/ugr/src/solver/grid.js";
import { EC_SUBJECTS, EC_CODES, ecBruteForce } from "./fixtures.js";

const catalog = fromLegacySubjects(EC_SUBJECTS);
const problem = { subjects: EC_CODES, filters: [], catalogVersion: "fixtures-ec" };

function signature(groupChoices) {
  return Object.entries(groupChoices)
    .map(([code, g]) => `${code}:${g.teoria}:${g.practica}`)
    .sort()
    .join("|");
}

function entriesFor(groupChoices, subjects = EC_SUBJECTS) {
  const entries = [];
  for (const [code, choice] of Object.entries(groupChoices)) {
    const subject = subjects.find((s) => s.codigo === code);
    const group = subject.grupos.find((g) => g.letra === choice.teoria);
    group.teoria.forEach((s) => entries.push({ codigo: code, ...s }));
    if (choice.practica) {
      group.practicas[choice.practica].forEach((s) => entries.push({ codigo: code, ...s }));
    }
  }
  return entries;
}

function hasConflict(entries) {
  const grid = createGrid();
  // agrupar por asignatura: colisión solo entre asignaturas distintas
  for (const e of entries) {
    const mask = maskForSession(e);
    if (!mask) continue;
    apply(grid, mask);
  }
  // comprobación pairwise explícita (misma semántica que app.js)
  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.codigo === b.codigo) continue;
      if (a.dia !== b.dia) continue;
      if (toMin(a.inicio) < toMin(b.fin) && toMin(b.inicio) < toMin(a.fin)) return true;
    }
  }
  return false;
}

describe("engine vs brute force (EC)", () => {
  it("builds 3 values per subject", () => {
    const { domains } = buildDomains(problem, catalog);
    expect(domains).toHaveLength(6);
    for (const d of domains) expect(d.values).toHaveLength(3);
  });

  it("finds exactly 133 conflict-free schedules", () => {
    const { items, stats } = solve(problem, catalog, { k: Number.MAX_SAFE_INTEGER });
    expect(stats.found).toBe(133);
    expect(items).toHaveLength(133);
  });

  it("matches the independent brute-force oracle set", () => {
    const oracle = ecBruteForce();
    expect(oracle).toHaveLength(133);
    const expected = new Set(
      oracle.map((assignment) =>
        signature(
          Object.fromEntries(
            Object.entries(assignment).map(([code, sub]) => [
              code,
              { teoria: EC_SUBJECTS.find((s) => s.codigo === code).grupos[0].letra, practica: sub },
            ]),
          ),
        ),
      ),
    );
    const { items } = solve(problem, catalog, { k: Number.MAX_SAFE_INTEGER });
    const got = new Set(items.map((it) => signature(it.groupChoices)));
    expect(got).toEqual(expected);
  });

  it("never emits a schedule with collisions", () => {
    const { items } = solve(problem, catalog, { k: Number.MAX_SAFE_INTEGER });
    for (const item of items) {
      expect(hasConflict(entriesFor(item.groupChoices))).toBe(false);
    }
  });
});

describe("determinism", () => {
  it("same seed yields identical items", () => {
    const a = solve(problem, catalog, { k: 50, seed: 123 });
    const b = solve(problem, catalog, { k: 50, seed: 123 });
    expect(a.items).toEqual(b.items);
  });

  it("different seeds keep the same cost profile", () => {
    const a = solve(problem, catalog, { k: 133, seed: 1 });
    const b = solve(problem, catalog, { k: 133, seed: 999 });
    expect(a.items.map((i) => i.cost)).toEqual(b.items.map((i) => i.cost));
  });
});

describe("top-K and branch & bound", () => {
  it("returns the K cheapest schedules", () => {
    const all = solve(problem, catalog, { k: Number.MAX_SAFE_INTEGER });
    const sorted = all.items.map((i) => i.cost).sort((x, y) => x - y);
    const top = solve(problem, catalog, { k: 5 });
    expect(top.items).toHaveLength(5);
    expect(top.items.map((i) => i.cost)).toEqual(sorted.slice(0, 5));
  });

  it("reports cost breakdown consistent with cost", () => {
    const { items } = solve(problem, catalog, { k: 1 });
    const b = items[0].costBreakdown;
    expect(items[0].cost).toBeGreaterThanOrEqual(0);
    expect(Object.keys(b)).toEqual(
      expect.arrayContaining(["deadHours", "days", "afternoons", "earlyStart", "loadVariance", "filterCost"]),
    );
  });
});

describe("hard filters and unsat", () => {
  it("respects freeDays", () => {
    const { items } = solve(
      { ...problem, filters: [{ type: "freeDays", value: ["viernes"] }] },
      catalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    for (const item of items) {
      const entries = entriesFor(item.groupChoices);
      expect(entries.some((e) => e.dia === "viernes")).toBe(false);
    }
  });

  it("throws on invalid filters", () => {
    expect(() => solve({ ...problem, filters: [{ type: "nope" }] }, catalog)).toThrow(RangeError);
  });

  it("returns no items when a hard filter empties a subject domain", () => {
    const { items, stats } = solve(
      {
        ...problem,
        filters: [
          { type: "freeDays", value: ["lunes", "martes", "miercoles", "jueves", "viernes"] },
        ],
      },
      catalog,
      { k: 10 },
    );
    expect(items).toHaveLength(0);
    expect(stats.found).toBe(0);
  });
});

describe("hard day caps and value filters", () => {
  const TWO_SUBJECTS = [
    {
      codigo: "X",
      nombre: "X",
      curso: 1,
      cuatrimestre: 1,
      creditos: 6,
      grupos: [
        { letra: "A", turno: "mañana", teoria: [{ dia: "lunes", inicio: "9:00", fin: "10:00" }], practicas: { subgrupos: ["A1"], A1: [{ dia: "martes", inicio: "9:00", fin: "10:00" }] } },
        { letra: "B", turno: "tarde", teoria: [{ dia: "lunes", inicio: "16:00", fin: "17:00" }], practicas: { subgrupos: ["B1"], B1: [{ dia: "jueves", inicio: "16:00", fin: "17:00" }] } },
      ],
    },
    {
      codigo: "Y",
      nombre: "Y",
      curso: 1,
      cuatrimestre: 1,
      creditos: 6,
      grupos: [
        { letra: "A", turno: "mañana", teoria: [{ dia: "lunes", inicio: "10:00", fin: "11:00" }], practicas: { subgrupos: ["A1"], A1: [{ dia: "martes", inicio: "10:00", fin: "11:00" }] } },
        { letra: "B", turno: "tarde", teoria: [{ dia: "lunes", inicio: "17:00", fin: "18:00" }], practicas: { subgrupos: ["B1"], B1: [{ dia: "jueves", inicio: "17:00", fin: "18:00" }] } },
      ],
    },
  ];
  const twoGroupCatalog = fromLegacySubjects(TWO_SUBJECTS);

  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const distinctDays = (entries) => new Set(entries.map((e) => e.dia)).size;
  const afternoonDays = (entries) => new Set(entries.filter((e) => toMin(e.inicio) >= 840).map((e) => e.dia)).size;

  it("enforces maxDays as a hard cap", () => {
    const { items } = solve(
      { subjects: ["X", "Y"], filters: [{ type: "maxDays", value: 2 }], catalogVersion: "caps" },
      twoGroupCatalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(distinctDays(entriesFor(item.groupChoices, TWO_SUBJECTS))).toBeLessThanOrEqual(2);
    }
  });

  it("returns nothing when the maxDays cap is impossible", () => {
    const { items } = solve(
      { subjects: ["X", "Y"], filters: [{ type: "maxDays", value: 1 }], catalogVersion: "caps" },
      twoGroupCatalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    expect(items).toHaveLength(0);
  });

  it("enforces maxAfternoonDays as a hard cap", () => {
    const { items } = solve(
      { subjects: ["X", "Y"], filters: [{ type: "maxAfternoonDays", value: 0 }], catalogVersion: "caps" },
      twoGroupCatalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const entries = entriesFor(item.groupChoices, TWO_SUBJECTS).filter((e) => ["X", "Y"].includes(e.codigo));
      expect(afternoonDays(entries)).toBeLessThanOrEqual(0);
    }
  });

  it("blocks theory groups via blockGroups", () => {
    const { items } = solve(
      { subjects: ["X", "Y"], filters: [{ type: "blockGroups", value: ["X-B", "Y-B"] }], catalogVersion: "caps" },
      twoGroupCatalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.groupChoices.X.teoria).toBe("A");
      expect(item.groupChoices.Y.teoria).toBe("A");
    }
  });

  it("empties the schedule when every group is blocked", () => {
    const { items } = solve(
      { subjects: ["X"], filters: [{ type: "blockGroups", value: ["X-A", "X-B"] }], catalogVersion: "caps" },
      twoGroupCatalog,
      { k: 10 },
    );
    expect(items).toHaveLength(0);
  });

  it("enforces earliestStart by pruning values that start too early", () => {
    const { items } = solve(
      { ...problem, filters: [{ type: "earliestStart", value: "9:00" }] },
      catalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    for (const item of items) {
      const minStart = Math.min(...entriesFor(item.groupChoices).map((e) => toMin(e.inicio)));
      expect(minStart).toBeGreaterThanOrEqual(9 * 60);
    }
  });

  it("enforces latestEnd by pruning values that end too late", () => {
    const { items } = solve(
      { ...problem, filters: [{ type: "latestEnd", value: "20:00" }] },
      catalog,
      { k: Number.MAX_SAFE_INTEGER },
    );
    for (const item of items) {
      const maxEnd = Math.max(...entriesFor(item.groupChoices).map((e) => toMin(e.fin)));
      expect(maxEnd).toBeLessThanOrEqual(20 * 60);
    }
  });
});

describe("professor optimization", () => {
  const PROF_SUBJECTS = [
    {
      codigo: "X",
      nombre: "X",
      curso: 1,
      cuatrimestre: 1,
      creditos: 6,
      grupos: [
        { letra: "A", turno: "mañana", teoria: [{ dia: "lunes", inicio: "9:00", fin: "10:00" }], practicas: { subgrupos: [] } },
        { letra: "B", turno: "mañana", teoria: [{ dia: "lunes", inicio: "11:00", fin: "12:00" }], practicas: { subgrupos: [] } },
      ],
    },
  ];
  const profCatalog = fromLegacySubjects(PROF_SUBJECTS);
  const professorHeavy = { professor: 1000, deadHours: 0, days: 0, afternoons: 0, mornings: 0, earlyStart: 0, loadVariance: 0, filters: 0 };

  it("picks the best professor when its weight dominates", () => {
    const { items } = solve(
      { subjects: ["X"], filters: [], catalogVersion: "prof", docentScores: { "X-A": 1, "X-B": 6 } },
      profCatalog,
      { k: 10, weights: professorHeavy },
    );
    expect(items[0].groupChoices.X.teoria).toBe("B");
    expect(items[0].costBreakdown.professorPenalty).toBe(0);
  });

  it("treats subjects without docent data as neutral", () => {
    const { items } = solve(
      { subjects: ["X"], filters: [], catalogVersion: "prof", docentScores: {} },
      profCatalog,
      { k: 10, weights: professorHeavy },
    );
    for (const item of items) expect(item.costBreakdown.professorPenalty).toBe(0);
  });

  it("lexicographic: primary objective dominates a lexicographically smaller gain", () => {
    // profesor primario (1000x): elige B aunque el secundario prefiriese A
    const { items } = solve(
      { subjects: ["X"], filters: [], catalogVersion: "prof", docentScores: { "X-A": 6, "X-B": 1 } },
      profCatalog,
      { k: 10, weights: { ...professorHeavy, professor: 1000 } },
    );
    expect(items[0].groupChoices.X.teoria).toBe("A");
  });
});

describe("failsafe beam search", () => {
  function syntheticCatalog(nSubjects, nGroups) {
    const subjects = [];
    for (let i = 0; i < nSubjects; i++) {
      const subgrupos = [];
      const practicas = { subgrupos };
      for (let g = 0; g < nGroups; g++) {
        const h = 8 + g;
        subgrupos.push(`A${g + 1}`);
        practicas[`A${g + 1}`] = [{ dia: "lunes", inicio: `${h}:00`, fin: `${h + 1}:00` }];
      }
      subjects.push({
        codigo: `S${i}`,
        nombre: `Subject ${i}`,
        curso: 1,
        cuatrimestre: 1,
        creditos: 6,
        grupos: [{ letra: "A", turno: "mañana", teoria: [], practicas }],
      });
    }
    return fromLegacySubjects(subjects);
  }

  it("activates approximate mode above the domain threshold", () => {
    const big = syntheticCatalog(8, 9);
    const { items, stats } = solve(
      { subjects: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `S${i}`), filters: [] },
      big,
      { k: 50 },
    );
    expect(stats.approximate).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(50);
  });
});

describe("time budget and cancellation", () => {
  it("can be cancelled via shouldStop", () => {
    let calls = 0;
    const { stats } = solve(problem, catalog, {
      k: Number.MAX_SAFE_INTEGER,
      shouldStop: () => {
        calls++;
        return calls > 1;
      },
    });
    expect(stats.truncated).toBe(true);
  });

  it("honors a tiny time budget", () => {
    const { stats } = solve(problem, catalog, { k: 200, timeBudgetMs: 0.0001 });
    expect(stats.truncated).toBe(true);
  });
});

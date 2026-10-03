import { describe, it, expect } from "vitest";
import {
  FILTER_REGISTRY,
  validateFilters,
  splitHardSoft,
  hardLimits,
  subgrupoForApellido,
  applyApellidoRule,
  pruneDomains,
} from "../../public/ugr/src/solver/filters.js";

describe("validateFilters", () => {
  it("accepts known filters", () => {
    const result = validateFilters([
      { type: "freeDays", value: ["viernes"] },
      { type: "maxDays", value: 4 },
      { type: "maxMorningDays", value: 3 },
      { type: "maxAfternoonDays", value: 2 },
      { type: "earliestStart", value: "9:00" },
      { type: "latestEnd", value: "20:00" },
      { type: "blockGroups", value: ["SO-C", "FFT-A"] },
      { type: "preferTurno", value: "mañana" },
      { type: "maxGaps", value: 1 },
      { type: "sameDayTheoryPractice", value: true },
    ]);
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it("rejects unknown filters without crashing", () => {
    const result = validateFilters([{ type: "nope", value: 1 }]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("desconocido");
  });

  it("rejects malformed values", () => {
    expect(validateFilters([{ type: "freeDays", value: ["sabado"] }]).ok).toBe(false);
    expect(validateFilters([{ type: "maxDays", value: -1 }]).ok).toBe(false);
    expect(validateFilters([{ type: "maxMorningDays", value: 9 }]).ok).toBe(false);
    expect(validateFilters([{ type: "maxAfternoonDays", value: 1.5 }]).ok).toBe(false);
    expect(validateFilters([{ type: "earliestStart", value: "25:99" }]).ok).toBe(false);
    expect(validateFilters([{ type: "latestEnd", value: "nope" }]).ok).toBe(false);
    expect(validateFilters([{ type: "blockGroups", value: []}]).ok).toBe(false);
    expect(validateFilters([{ type: "blockGroups", value: ["mal"]}]).ok).toBe(false);
    expect(validateFilters([{ type: "preferTurno", value: "noche" }]).ok).toBe(false);
  });
});

describe("splitHardSoft", () => {
  it("classifies max* and time/group filters as hard", () => {
    const { hard, soft } = splitHardSoft([
      { type: "freeDays", value: ["viernes"] },
      { type: "maxDays", value: 4 },
      { type: "maxMorningDays", value: 3 },
      { type: "maxAfternoonDays", value: 2 },
      { type: "earliestStart", value: "9:00" },
      { type: "latestEnd", value: "20:00" },
      { type: "blockGroups", value: ["SO-C"] },
      { type: "maxGaps", value: 1 },
    ]);
    expect(hard.map((f) => f.type)).toEqual([
      "freeDays",
      "maxDays",
      "maxMorningDays",
      "maxAfternoonDays",
      "earliestStart",
      "latestEnd",
      "blockGroups",
    ]);
    expect(soft.map((f) => f.type)).toEqual(["maxGaps"]);
  });

  it("honors explicit hard/soft override", () => {
    const { hard, soft } = splitHardSoft([
      { type: "maxGaps", value: 1, hard: true },
      { type: "freeDays", value: ["viernes"], hard: false },
    ]);
    expect(hard.map((f) => f.type)).toEqual(["maxGaps"]);
    expect(soft.map((f) => f.type)).toEqual(["freeDays"]);
  });

  it("declares kind in the registry", () => {
    expect(FILTER_REGISTRY.freeDays.kind).toBe("hard");
    expect(FILTER_REGISTRY.maxDays.kind).toBe("hard");
    expect(FILTER_REGISTRY.maxGaps.kind).toBe("soft");
  });

  it("extracts day limits", () => {
    const limits = hardLimits([
      { type: "maxDays", value: 4 },
      { type: "maxAfternoonDays", value: 2 },
      { type: "preferTurno", value: "mañana" },
    ]);
    expect(limits.maxDays).toBe(4);
    expect(limits.maxAfternoonDays).toBe(2);
    expect(limits.maxMorningDays).toBe(Infinity);
  });
});

describe("subgrupoForApellido", () => {
  it("maps ranges", () => {
    expect(subgrupoForApellido("Alonso")).toBe(1);
    expect(subgrupoForApellido("García")).toBe(2);
    expect(subgrupoForApellido("Pérez")).toBe(3);
    expect(subgrupoForApellido("Zamora")).toBe(4);
  });

  it("returns null for empty or non-letters", () => {
    expect(subgrupoForApellido("")).toBeNull();
    expect(subgrupoForApellido("3M")).toBeNull();
    expect(subgrupoForApellido(undefined)).toBeNull();
  });
});

function mkValue(letra, sub) {
  return { teoria: letra, practica: sub, entries: [], masks: [] };
}

describe("apellido + freeDays pruning", () => {
  const values = [
    mkValue("A", "A1"),
    mkValue("A", "A2"),
    mkValue("A", "A3"),
    mkValue("B", "B1"),
    mkValue("B", "B2"),
    mkValue("B", "B3"),
  ];

  it("restricts each theory group to the apellido subgroup when it exists", () => {
    const pruned = applyApellidoRule(values, "García");
    expect(pruned.map((v) => v.practica)).toEqual(["A2", "B2"]);
  });

  it("keeps all subgroups when the target does not exist", () => {
    const pruned = applyApellidoRule([mkValue("A", "A1"), mkValue("A", "A3")], "García");
    expect(pruned.map((v) => v.practica)).toEqual(["A1", "A3"]);
  });

  it("removes values with a session on a hard free day", () => {
    const domains = [
      {
        code: "X",
        values: [
          { teoria: "A", practica: "A1", entries: [{ dia: "viernes" }], masks: [] },
          { teoria: "A", practica: "A2", entries: [{ dia: "lunes" }], masks: [] },
        ],
      },
    ];
    pruneDomains(domains, [{ type: "freeDays", value: ["viernes"] }], {});
    expect(domains[0].values.map((v) => v.practica)).toEqual(["A2"]);
  });
});

function mkVal(teoria, practica, entries) {
  return { teoria, practica, entries, masks: [] };
}

describe("time and group pruning", () => {
  it("earliestStart removes values with a session before the limit", () => {
    const domains = [
      {
        code: "X",
        values: [
          mkVal("A", "A1", [{ dia: "lunes", inicio: "8:30", fin: "9:30" }]),
          mkVal("A", "A2", [{ dia: "lunes", inicio: "9:30", fin: "10:30" }]),
        ],
      },
    ];
    pruneDomains(domains, [{ type: "earliestStart", value: "9:00" }], {});
    expect(domains[0].values.map((v) => v.practica)).toEqual(["A2"]);
  });

  it("latestEnd removes values with a session after the limit", () => {
    const domains = [
      {
        code: "X",
        values: [
          mkVal("A", "A1", [{ dia: "lunes", inicio: "19:30", fin: "20:30" }]),
          mkVal("A", "A2", [{ dia: "lunes", inicio: "18:30", fin: "19:30" }]),
        ],
      },
    ];
    pruneDomains(domains, [{ type: "latestEnd", value: "20:00" }], {});
    expect(domains[0].values.map((v) => v.practica)).toEqual(["A2"]);
  });

  it("blockGroups removes the matching theory group across subjects", () => {
    const domains = [
      {
        code: "SO",
        values: [
          mkVal("A", "A1", []),
          mkVal("B", "B1", []),
          mkVal("C", "C1", []),
        ],
      },
      { code: "FFT", values: [mkVal("A", "A1", []), mkVal("C", "C2", [])] },
    ];
    pruneDomains(domains, [{ type: "blockGroups", value: ["SO-C", "FFT-A"] }], {});
    expect(domains[0].values.map((v) => v.teoria)).toEqual(["A", "B"]);
    expect(domains[1].values.map((v) => v.teoria)).toEqual(["C"]);
  });

  it("combines blockGroups with the apellido rule", () => {
    const values = [
      mkVal("A", "A1", []),
      mkVal("A", "A2", []),
      mkVal("A", "A3", []),
      mkVal("B", "B1", []),
      mkVal("B", "B2", []),
      mkVal("B", "B3", []),
    ];
    const domains = [{ code: "X", values }];
    pruneDomains(domains, [{ type: "blockGroups", value: ["X-A"] }], { apellido: "García" });
    expect(domains[0].values.map((v) => v.practica)).toEqual(["B2"]);
  });
});

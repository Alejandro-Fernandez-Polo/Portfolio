import { describe, it, expect } from "vitest";
import {
  CostAccumulator,
  computeFullCost,
  builtinSoftCost,
  DEFAULT_WEIGHTS,
  AFTERNOON_START_MIN,
} from "../../public/ugr/src/solver/cost.js";

const s = (dia, inicio, fin) => ({ dia, inicio, fin });
const ONE = { deadHours: 1, days: 1, afternoons: 1, mornings: 1, earlyStart: 1, loadVariance: 1, filters: 1 };

function lcg(seed) {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 0x100000000;
  };
}

function randomEntries(rng, n) {
  const days = ["lunes", "martes", "miercoles", "jueves", "viernes"];
  const out = [];
  for (let i = 0; i < n; i++) {
    const day = days[Math.floor(rng() * days.length)];
    const start = 8 * 60 + Math.floor(rng() * 10) * 60;
    const end = start + (1 + Math.floor(rng() * 2)) * 60;
    out.push(s(day, `${Math.floor(start / 60)}:${String(start % 60).padStart(2, "0")}`, `${Math.floor(end / 60)}:${String(end % 60).padStart(2, "0")}`));
  }
  return out;
}

describe("computeFullCost primitives", () => {
  it("counts distinct days", () => {
    const entries = [s("lunes", "9:00", "10:00"), s("lunes", "11:00", "12:00"), s("martes", "9:00", "10:00")];
    const acc = new CostAccumulator([], ONE);
    entries.forEach((e) => acc.add(e));
    expect(acc.breakdown().days).toBe(2);
  });

  it("computes same-shift dead hours within a day (in hours)", () => {
    const entries = [s("lunes", "9:00", "10:00"), s("lunes", "12:00", "13:00")];
    const acc = new CostAccumulator([], ONE);
    entries.forEach((e) => acc.add(e));
    expect(acc.breakdown().deadHours).toBe(2);
  });

  it("does not count the midday gap between shifts", () => {
    // 9:00-10:00 (mañana) y 16:00-17:00 (tarde): sin horas muertas
    const acc = new CostAccumulator([], ONE);
    acc.add(s("lunes", "9:00", "10:00"));
    acc.add(s("lunes", "16:00", "17:00"));
    expect(acc.breakdown().deadHours).toBe(0);
  });

  it("counts morning and afternoon days separately", () => {
    const acc = new CostAccumulator([], ONE);
    acc.add(s("lunes", "9:00", "10:00"));
    acc.add(s("lunes", "17:00", "18:00"));
    acc.add(s("martes", "9:00", "10:00"));
    const b = acc.breakdown();
    expect(b.days).toBe(2);
    expect(b.morningDays).toBe(2);
    expect(b.afternoonDays).toBe(1);
  });

  it("counts afternoon sessions", () => {
    const entries = [s("lunes", "9:00", "10:00"), s("lunes", "17:00", "18:00")];
    const acc = new CostAccumulator([], ONE);
    entries.forEach((e) => acc.add(e));
    expect(acc.breakdown().afternoons).toBe(1);
    expect(AFTERNOON_START_MIN).toBe(840);
  });

  it("penalizes early starts", () => {
    const early = new CostAccumulator([], ONE).add(s("lunes", "8:00", "9:00"));
    expect(early.breakdown().earlyStart).toBe(1);
    const late = new CostAccumulator([], ONE).add(s("lunes", "11:00", "12:00"));
    expect(late.breakdown().earlyStart).toBe(0);
  });

  it("computes load variance across active days (in hours)", () => {
    const acc = new CostAccumulator([], ONE);
    acc.add(s("lunes", "9:00", "10:00"));
    acc.add(s("lunes", "10:00", "11:00"));
    acc.add(s("martes", "9:00", "10:00"));
    // hours per active day: [2, 1] → mean 1.5 → var ((0.5^2)+(0.5^2))/2 = 0.25
    expect(acc.breakdown().loadVariance).toBe(0.25);
  });
});

describe("soft filter cost", () => {
  it("penalizes sessions against preferTurno", () => {
    const entries = [s("lunes", "9:00", "10:00"), s("lunes", "17:00", "18:00")];
    expect(builtinSoftCost(entries, [{ type: "preferTurno", value: "mañana" }])).toBe(1);
    expect(builtinSoftCost(entries, [{ type: "preferTurno", value: "tarde" }])).toBe(1);
  });

  it("applies weights", () => {
    const entries = [s("lunes", "17:00", "18:00")];
    expect(builtinSoftCost(entries, [{ type: "preferTurno", value: "mañana", weight: 3 }])).toBe(3);
  });

  it("ignores unknown filters", () => {
    expect(builtinSoftCost([s("lunes", "9:00", "10:00")], [{ type: "nope" }])).toBe(0);
  });

  it("penalizes days with gaps above maxGapMin", () => {
    const entries = [s("lunes", "9:00", "10:00"), s("lunes", "12:00", "13:00")];
    expect(builtinSoftCost(entries, [{ type: "maxGaps", value: 0, maxGapMin: 60 }])).toBe(1);
    expect(builtinSoftCost(entries, [{ type: "maxGaps", value: 1, maxGapMin: 60 }])).toBe(0);
  });
});

describe("incremental accumulator equals full recompute", () => {
  it("matches after random additions in random order", () => {
    const rng = lcg(42);
    const entries = randomEntries(rng, 24);
    const filters = [{ type: "preferTurno", value: "mañana", weight: 0.7 }];
    const acc = new CostAccumulator(filters, DEFAULT_WEIGHTS);
    for (const e of entries) acc.add(e);
    expect(acc.value()).toBeCloseTo(computeFullCost(entries, filters), 10);
  });

  it("matches after random removals", () => {
    const rng = lcg(7);
    const entries = randomEntries(rng, 30);
    const filters = [{ type: "maxDays", value: 4 }];
    const acc = new CostAccumulator(filters, DEFAULT_WEIGHTS);
    entries.forEach((e) => acc.add(e));
    const remaining = entries.slice();
    for (let i = 0; i < 12; i++) {
      const idx = Math.floor(rng() * remaining.length);
      const [removed] = remaining.splice(idx, 1);
      acc.remove(removed);
    }
    expect(acc.value()).toBeCloseTo(computeFullCost(remaining, filters), 10);
  });

  it("breakdown terms sum to value when weights are 1", () => {
    const entries = randomEntries(lcg(99), 15);
    const acc = new CostAccumulator([], ONE);
    entries.forEach((e) => acc.add(e));
    const b = acc.breakdown();
    const sum = b.deadHours + b.days + b.afternoons + b.mornings + b.earlyStart + b.loadVariance + b.filterCost;
    expect(acc.value()).toBeCloseTo(sum, 10);
  });
});

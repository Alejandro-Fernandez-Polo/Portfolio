import { timeToMinutes } from "./catalog.js";

export const AFTERNOON_START_MIN = 14 * 60;
export const EARLIEST_REF_MIN = 9 * 60;

export const DEFAULT_WEIGHTS = {
  deadHours: 1.0,
  days: 0.8,
  afternoons: 0.6,
  mornings: 0,
  earlyStart: 0.4,
  loadVariance: 0.5,
  filters: 1.0,
  professor: 0.5,
};

function entryRange(entry) {
  const start = timeToMinutes(entry.inicio);
  const end = timeToMinutes(entry.fin);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return { dia: entry.dia, start, end };
}

function splitByShift(sessions) {
  const morning = [];
  const afternoon = [];
  for (const s of sessions) {
    if (s.start < AFTERNOON_START_MIN) morning.push(s);
    else afternoon.push(s);
  }
  return { morning, afternoon };
}

function shiftDeadHours(sessions) {
  if (sessions.length < 2) return 0;
  let firstStart = Infinity;
  let lastEnd = -Infinity;
  let sum = 0;
  for (const s of sessions) {
    if (s.start < firstStart) firstStart = s.start;
    if (s.end > lastEnd) lastEnd = s.end;
    sum += s.end - s.start;
  }
  return (lastEnd - firstStart - sum) / 60;
}

function deadHoursPerDay(entries) {
  const byDay = new Map();
  for (const e of entries) {
    const r = entryRange(e);
    if (!r) continue;
    if (!byDay.has(r.dia)) byDay.set(r.dia, []);
    byDay.get(r.dia).push(r);
  }
  const out = [];
  for (const sessions of byDay.values()) {
    const { morning, afternoon } = splitByShift(sessions);
    out.push(shiftDeadHours(morning) + shiftDeadHours(afternoon));
  }
  return out;
}

export function builtinSoftCost(entries, filters = []) {
  let total = 0;
  for (const f of filters) {
    if (!f || !f.type) continue;
    const w = f.weight ?? 1;
    switch (f.type) {
      case "preferTurno": {
        const wantAfternoon = f.value === "tarde";
        const wrong = entries.filter(
          (e) => (timeToMinutes(e.inicio) >= AFTERNOON_START_MIN) !== wantAfternoon,
        ).length;
        total += w * wrong;
        break;
      }
      case "maxGaps": {
        const maxGap = Number(f.maxGapMin) || 0;
        const n = Number(f.value) || 0;
        const over = deadHoursPerDay(entries).filter((g) => g * 60 > maxGap).length;
        total += w * Math.max(0, over - n);
        break;
      }
      default:
        break;
    }
  }
  return total;
}

export class CostAccumulator {
  constructor(filters = [], weights = DEFAULT_WEIGHTS, filterCostFn = null) {
    this.filters = filters;
    this.weights = weights;
    this.filterCostFn = filterCostFn;
    this.entries = [];
    this.byDay = new Map();
    this.afternoons = 0;
    this.mornings = 0;
    this.morningDays = 0;
    this.afternoonDays = 0;
  }

  add(entry) {
    const r = entryRange(entry);
    if (!r) return this;
    this.entries.push(entry);
    let bucket = this.byDay.get(r.dia);
    if (!bucket) {
      bucket = { sessions: [], morning: false, afternoon: false };
      this.byDay.set(r.dia, bucket);
    }
    bucket.sessions.push(r);
    const isMorning = r.start < AFTERNOON_START_MIN;
    if (isMorning) {
      this.mornings++;
      if (!bucket.morning) {
        bucket.morning = true;
        this.morningDays++;
      }
    } else {
      this.afternoons++;
      if (!bucket.afternoon) {
        bucket.afternoon = true;
        this.afternoonDays++;
      }
    }
    return this;
  }

  remove(entry) {
    const idx = this.entries.indexOf(entry);
    if (idx >= 0) this.entries.splice(idx, 1);
    const r = entryRange(entry);
    if (!r) return this;
    const bucket = this.byDay.get(r.dia);
    if (bucket) {
      const i = bucket.sessions.findIndex((s) => s.start === r.start && s.end === r.end);
      if (i >= 0) bucket.sessions.splice(i, 1);
      const morning = bucket.sessions.some((s) => s.start < AFTERNOON_START_MIN);
      const afternoon = bucket.sessions.some((s) => s.start >= AFTERNOON_START_MIN);
      if (bucket.morning && !morning) this.morningDays = Math.max(0, this.morningDays - 1);
      if (bucket.afternoon && !afternoon) this.afternoonDays = Math.max(0, this.afternoonDays - 1);
      bucket.morning = morning;
      bucket.afternoon = afternoon;
      if (bucket.sessions.length === 0) this.byDay.delete(r.dia);
    }
    if (r.start >= AFTERNOON_START_MIN) this.afternoons = Math.max(0, this.afternoons - 1);
    else this.mornings = Math.max(0, this.mornings - 1);
    return this;
  }

  breakdown() {
    let deadHours = 0;
    let totalHours = 0;
    let earliest = Infinity;
    const dayHours = [];
    for (const bucket of this.byDay.values()) {
      const sessions = bucket.sessions;
      if (sessions.length === 0) continue;
      const { morning, afternoon } = splitByShift(sessions);
      deadHours += shiftDeadHours(morning) + shiftDeadHours(afternoon);

      let firstStart = Infinity;
      let lastEnd = -Infinity;
      let sum = 0;
      for (const s of sessions) {
        if (s.start < firstStart) firstStart = s.start;
        if (s.end > lastEnd) lastEnd = s.end;
        sum += s.end - s.start;
      }
      if (firstStart < earliest) earliest = firstStart;
      const hours = sum / 60;
      dayHours.push(hours);
      totalHours += hours;
    }
    const days = dayHours.length;
    const earlyStart = earliest === Infinity ? 0 : Math.max(0, EARLIEST_REF_MIN - earliest) / 60;
    const mean = days ? totalHours / days : 0;
    const loadVariance = days
      ? dayHours.reduce((acc, x) => acc + (x - mean) ** 2, 0) / days
      : 0;
    const filterCost = this.filterCostFn
      ? this.filterCostFn(this.entries, this.filters)
      : builtinSoftCost(this.entries, this.filters);
    return {
      deadHours,
      days,
      morningDays: this.morningDays,
      afternoonDays: this.afternoonDays,
      mornings: this.mornings,
      afternoons: this.afternoons,
      earlyStart,
      loadVariance,
      filterCost,
    };
  }

  value() {
    const b = this.breakdown();
    const w = this.weights;
    return (
      (w.deadHours || 0) * b.deadHours +
      (w.days || 0) * b.days +
      (w.afternoons || 0) * b.afternoons +
      (w.mornings || 0) * b.mornings +
      (w.earlyStart || 0) * b.earlyStart +
      (w.loadVariance || 0) * b.loadVariance +
      (w.filters || 0) * b.filterCost
    );
  }

  lowerBound(weights = this.weights) {
    const days = this.byDay.size;
    let earliest = Infinity;
    for (const bucket of this.byDay.values()) {
      for (const s of bucket.sessions) if (s.start < earliest) earliest = s.start;
    }
    const earlyStart = earliest === Infinity ? 0 : Math.max(0, EARLIEST_REF_MIN - earliest) / 60;
    return (
      (weights.days || 0) * days +
      (weights.afternoons || 0) * this.afternoons +
      (weights.mornings || 0) * this.mornings +
      (weights.earlyStart || 0) * earlyStart
    );
  }

  clone() {
    const acc = new CostAccumulator(this.filters, this.weights, this.filterCostFn);
    for (const e of this.entries) acc.add(e);
    return acc;
  }
}

export function computeFullCost(entries, filters = [], weights = DEFAULT_WEIGHTS, filterCostFn = null) {
  const acc = new CostAccumulator(filters, weights, filterCostFn);
  for (const e of entries) acc.add(e);
  return acc.value();
}

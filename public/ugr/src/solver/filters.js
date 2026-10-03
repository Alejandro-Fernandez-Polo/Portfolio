import { timeToMinutes, VALID_DAYS } from "./catalog.js";

export function subgrupoForApellido(apellido) {
  if (!apellido) return null;
  const first = String(apellido).toUpperCase().charAt(0);
  if (first >= "A" && first <= "F") return 1;
  if (first >= "G" && first <= "M") return 2;
  if (first >= "N" && first <= "S") return 3;
  if (first >= "T" && first <= "Z") return 4;
  return null;
}

const isDay = (d) => VALID_DAYS.includes(d);
const isTime = (t) => typeof t === "string" && !Number.isNaN(timeToMinutes(t));
const isPositiveInt = (n) => Number.isInteger(n) && n >= 0;
const isIntInRange = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const isGroupKey = (s) => typeof s === "string" && /^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(s);

export const FILTER_REGISTRY = {
  freeDays: {
    kind: "hard",
    validate(value) {
      if (!Array.isArray(value) || value.length === 0) return "freeDays espera un array de días";
      const bad = value.filter((d) => !isDay(d));
      return bad.length ? `días inválidos: ${bad.join(",")}` : null;
    },
  },
  maxDays: {
    kind: "hard",
    validate(value) {
      return isIntInRange(value, 5) ? null : "maxDays espera un entero entre 0 y 5";
    },
  },
  maxMorningDays: {
    kind: "hard",
    validate(value) {
      return isIntInRange(value, 5) ? null : "maxMorningDays espera un entero entre 0 y 5";
    },
  },
  maxAfternoonDays: {
    kind: "hard",
    validate(value) {
      return isIntInRange(value, 5) ? null : "maxAfternoonDays espera un entero entre 0 y 5";
    },
  },
  earliestStart: {
    kind: "hard",
    validate(value) {
      return isTime(value) ? null : "earliestStart espera una hora HH:MM";
    },
  },
  latestEnd: {
    kind: "hard",
    validate(value) {
      return isTime(value) ? null : "latestEnd espera una hora HH:MM";
    },
  },
  blockGroups: {
    kind: "hard",
    validate(value) {
      if (!Array.isArray(value) || value.length === 0) return "blockGroups espera un array de grupos";
      const bad = value.filter((k) => !isGroupKey(k));
      return bad.length ? `grupos inválidos: ${bad.join(",")}` : null;
    },
  },
  preferTurno: {
    kind: "soft",
    validate(value) {
      return ["mañana", "tarde", "indiferente"].includes(value)
        ? null
        : 'preferTurno espera "mañana"|"tarde"|"indiferente"';
    },
  },
  maxGaps: {
    kind: "soft",
    validate(value) {
      return isPositiveInt(value) ? null : "maxGaps espera un entero ≥ 0";
    },
  },
  sameDayTheoryPractice: {
    kind: "soft",
    validate(value) {
      return typeof value === "boolean"
        ? null
        : "sameDayTheoryPractice espera un booleano";
    },
  },
};

export function validateFilters(filters = []) {
  const errors = [];
  if (!Array.isArray(filters)) return { ok: false, errors: ["filters debe ser un array"] };
  for (const f of filters) {
    if (!f || typeof f !== "object" || !f.type) {
      errors.push("filtro sin type");
      continue;
    }
    const def = FILTER_REGISTRY[f.type];
    if (!def) {
      errors.push(`filtro desconocido: ${f.type}`);
      continue;
    }
    const problem = def.validate(f.value);
    if (problem) errors.push(`${f.type}: ${problem}`);
  }
  return { ok: errors.length === 0, errors };
}

export function splitHardSoft(filters = []) {
  const hard = [];
  const soft = [];
  for (const f of filters) {
    const def = FILTER_REGISTRY[f.type];
    const isHard = f.hard === true || (f.hard !== false && def?.kind === "hard");
    if (isHard) hard.push(f);
    else soft.push(f);
  }
  return { hard, soft };
}

export function hardLimits(hardFilters = []) {
  const limits = { maxDays: Infinity, maxMorningDays: Infinity, maxAfternoonDays: Infinity };
  for (const f of hardFilters) {
    if (f.type === "maxDays") limits.maxDays = Number(f.value);
    else if (f.type === "maxMorningDays") limits.maxMorningDays = Number(f.value);
    else if (f.type === "maxAfternoonDays") limits.maxAfternoonDays = Number(f.value);
  }
  return limits;
}

function valueHasDay(value, days) {
  return value.entries.some((e) => days.includes(e.dia));
}

function valueStartsBefore(value, limit) {
  return value.entries.some((e) => timeToMinutes(e.inicio) < limit);
}

function valueEndsAfter(value, limit) {
  return value.entries.some((e) => timeToMinutes(e.fin) > limit);
}

export function applyApellidoRule(values, apellido) {
  const digit = subgrupoForApellido(apellido);
  if (!digit) return values;
  const byLetter = new Map();
  for (const v of values) {
    if (!byLetter.has(v.teoria)) byLetter.set(v.teoria, []);
    byLetter.get(v.teoria).push(v);
  }
  const out = [];
  for (const [letter, group] of byLetter) {
    const target = `${letter}${digit}`;
    const hasTarget = group.some((v) => v.practica === target);
    if (hasTarget) out.push(...group.filter((v) => v.practica === target));
    else out.push(...group);
  }
  return out;
}

export function pruneDomains(domains, hardFilters = [], ctx = {}) {
  const { apellido = "" } = ctx;
  for (const domain of domains) {
    let values = domain.values;
    values = applyApellidoRule(values, apellido);
    for (const f of hardFilters) {
      if (f.type === "freeDays") {
        const days = Array.isArray(f.value) ? f.value : [f.value];
        values = values.filter((v) => !valueHasDay(v, days));
      } else if (f.type === "earliestStart") {
        const limit = timeToMinutes(f.value);
        if (!Number.isNaN(limit)) values = values.filter((v) => !valueStartsBefore(v, limit));
      } else if (f.type === "latestEnd") {
        const limit = timeToMinutes(f.value);
        if (!Number.isNaN(limit)) values = values.filter((v) => !valueEndsAfter(v, limit));
      } else if (f.type === "blockGroups") {
        const blocked = new Set(Array.isArray(f.value) ? f.value : [f.value]);
        values = values.filter((v) => !blocked.has(`${domain.code}-${v.teoria}`));
      }
    }
    domain.values = values;
  }
  return domains;
}

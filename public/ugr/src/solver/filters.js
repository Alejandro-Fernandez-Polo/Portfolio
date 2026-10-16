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

// Corte de turno por hora: la misma frontera que usa la preferencia blanda
// (`cost.js`). Un grupo mixto —con sesiones en las dos franjas— no pasa ni
// «solo por la mañana» ni «solo por la tarde».
const AFTERNOON_START_MIN = 14 * 60;

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
    // «Solo por la mañana/tarde» no es una preferencia: descarta los grupos del
    // otro turno, así que el mismo filtro pasa a ser duro según su valor. Con
    // «preferente» se queda blando (lo de siempre).
    hardWhen(value) {
      return value === "solo-mañana" || value === "solo-tarde";
    },
    validate(value) {
      return ["mañana", "tarde", "indiferente", "solo-mañana", "solo-tarde"].includes(value)
        ? null
        : 'preferTurno espera "indiferente"|"mañana"|"tarde"|"solo-mañana"|"solo-tarde"';
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
  // Mismo grupo por curso: la letra de teoría (y, con el segundo, el subgrupo de
  // prácticas) es una sola elección por año del plan. No se resuelve filtrando
  // cada asignatura por su cuenta —eso no impide que acaben en letras
  // distintas—: el motor las ata durante la búsqueda.
  sameTheoryPerCourse: {
    kind: "hard",
    validate(value) {
      return typeof value === "boolean"
        ? null
        : "sameTheoryPerCourse espera un booleano";
    },
  },
  samePracticePerCourse: {
    kind: "hard",
    validate(value) {
      return typeof value === "boolean"
        ? null
        : "samePracticePerCourse espera un booleano";
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
    const hardByValue = typeof def?.hardWhen === "function" && def.hardWhen(f.value) === true;
    const isHard = f.hard === true || (f.hard !== false && (def?.kind === "hard" || hardByValue));
    if (isHard) hard.push(f);
    else soft.push(f);
  }
  return { hard, soft };
}

/**
 * Restricciones que atan entre sí a las asignaturas de un mismo curso. No se
 * aplican por dominio (pruneDomains) sino durante la búsqueda: la decisión
 * compartida la fija la primera asignatura del curso y el resto la respeta.
 *
 * `samePractice` implica `sameTheory`: no tiene sentido compartir subgrupo de
 * prácticas sin compartir también la letra de teoría.
 *
 * @param {Array} hardFilters filtros duros (`splitHardSoft`).
 * @returns {{sameTheory: boolean, samePractice: boolean}}
 */
export function courseConstraints(hardFilters = []) {
  const on = (type) => hardFilters.some((f) => f.type === type && f.value === true);
  const samePractice = on("samePracticePerCourse");
  return { sameTheory: samePractice || on("sameTheoryPerCourse"), samePractice };
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

function valueAllMorning(value) {
  return value.entries.every((e) => timeToMinutes(e.inicio) < AFTERNOON_START_MIN);
}

function valueAllAfternoon(value) {
  return value.entries.every((e) => timeToMinutes(e.inicio) >= AFTERNOON_START_MIN);
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
      } else if (f.type === "preferTurno") {
        // Solo llega aquí el valor duro («solo-mañana»/«solo-tarde»): los
        // «preferente» van por la lista blanda y no recortan dominios.
        if (f.value === "solo-mañana") values = values.filter(valueAllMorning);
        else if (f.value === "solo-tarde") values = values.filter(valueAllAfternoon);
      }
    }
    domain.values = values;
  }
  return domains;
}

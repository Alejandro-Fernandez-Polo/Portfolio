import { VALID_DAYS, validateCatalogJSON } from "./schema.js";

export { CATALOG_TEMPLATE_HEADERS, TEMPLATE_MAPPING, buildTemplateCSV } from "./template.js";

/*
 * Ensambla un UgrCatalog genérico (cualquier titulación) desde filas ya
 * convertidas en registros ({ columna: valor }) y un mapping declarado
 * campo → nombre de columna.
 *
 * Mapping obligatorio: codigo, grupo, dia, inicio, fin.
 * Mapping opcional (ver FIELD_DEFAULTS): nombre, curso, cuatrimestre,
 * creditos, turno, tipo, subgrupo.
 *
 * Reglas decididas:
 * - Columna ausente o celda vacía en un campo opcional → default.
 * - Celda presente pero inválida → error de fila (no se usa el default).
 * - Campos de asignatura (nombre/curso/cuatrimestre/creditos) deben ser
 *   idénticos en todas las filas del mismo código; celdas vacías se ignoran.
 * - turno: columna Turno si existe (normalizada: mañana/tarde/...); si no,
 *   se deriva de la hora de inicio (<14:00 → mañana, >=14:00 → tarde).
 * - tipo vacío → "practica" (sesiones de práctica del grupo, subgrupo =
 *   letra del grupo); tipo desconocido → error de fila.
 * - Sesiones exactamente repetidas se deduplican.
 * - Modo estricto: si hay algún error no se devuelve `catalog`.
 * - Nunca lanza excepción: siempre devuelve { catalog?, errors }.
 *
 * Rutas de error: nombre del campo en errores de fila ("dia"), camino
 * canónico en inconsistencias entre filas ("subjects[0].curso") y
 * "mapping.<campo>" en el mapeo; `row` es el índice 0-based de la fila
 * recibida, o null si no aplica a una fila.
 */

export const REQUIRED_MAPPING_FIELDS = ["codigo", "grupo", "dia", "inicio", "fin"];

export const FIELD_DEFAULTS = {
  nombre: "",
  curso: 1,
  cuatrimestre: 1,
  creditos: 0,
  turno: null,
  tipo: "practica",
  subgrupo: null,
};

const DEFAULT_META = {
  university: "custom",
  degree: "custom",
  plan: "custom",
  version: "user-import",
  hash: "",
};

const TIME_RE = /^\d{1,2}:\d{2}$/;
const TEORIA_ALIASES = ["teoria", "teorica", "t", "clase"];
const PRACTICA_ALIASES = ["practica", "practicas", "p", "lab", "laboratorio"];

function problem(row, path, message) {
  return { row, path, message };
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function stripAccents(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function timeToMinutes(value) {
  const parts = value.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return NaN;
  return h * 60 + m;
}

function isValidTime(value) {
  if (typeof value !== "string" || !TIME_RE.test(value)) return false;
  const minutes = timeToMinutes(value);
  if (Number.isNaN(minutes)) return false;
  const [h, m] = value.split(":").map(Number);
  return h <= 23 && m <= 59;
}

export function deriveTurno(inicio) {
  return timeToMinutes(inicio) < 14 * 60 ? "mañana" : "tarde";
}

function normalizeDay(value) {
  const flat = stripAccents(normalizeText(value).toLowerCase());
  return VALID_DAYS.includes(flat) ? flat : null;
}

function normalizeTurno(value) {
  const raw = normalizeText(value);
  if (raw === "") return null;
  if (stripAccents(raw.toLowerCase()) === "manana") return "mañana";
  return raw.toLowerCase().replace(/\s+/g, " ");
}

function normalizeTipo(value) {
  const flat = stripAccents(normalizeText(value).toLowerCase());
  if (flat === "") return { ok: true, value: "" };
  if (TEORIA_ALIASES.includes(flat)) return { ok: true, value: "teoria" };
  if (PRACTICA_ALIASES.includes(flat)) return { ok: true, value: "practica" };
  return { ok: false, value: flat };
}

function parseCourseCell(value) {
  const raw = normalizeText(value);
  if (raw === "") return { ok: true, empty: true, value: FIELD_DEFAULTS.curso };
  const n = Number(raw.replace(",", "."));
  if (!Number.isInteger(n) || n < 1) return { ok: false, empty: false, value: NaN };
  return { ok: true, empty: false, value: n };
}

function parseTermCell(value) {
  const raw = normalizeText(value);
  if (raw === "") return { ok: true, empty: true, value: FIELD_DEFAULTS.cuatrimestre };
  const n = Number(raw.replace(",", "."));
  if (n !== 1 && n !== 2) return { ok: false, empty: false, value: NaN };
  return { ok: true, empty: false, value: n };
}

function parseCreditsCell(value) {
  const raw = normalizeText(value);
  if (raw === "") return { ok: true, empty: true, value: FIELD_DEFAULTS.creditos };
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { ok: false, empty: false, value: NaN };
  return { ok: true, empty: false, value: n };
}

function cell(row, column) {
  if (!column) return "";
  return normalizeText(row[column]);
}

function reconcileCheck(subject, field, value, index, rowErrors) {
  if (value === null) return;
  if (!subject.explicit[field]) return;
  if (subject[field] !== value) {
    rowErrors.push(
      problem(index, `subjects[${subject.order}].${field}`, `valor inconsistente con la fila ${subject.rows[field]}`),
    );
  }
}

function adopt(subject, field, value, index) {
  if (value === null) return;
  if (subject.explicit[field]) return;
  subject[field] = value;
  subject.explicit[field] = true;
  subject.rows[field] = index;
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function buildMeta(input, subjects) {
  const meta = { ...DEFAULT_META };
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const key of ["university", "degree", "plan", "version", "hash"]) {
      const value = input[key];
      if (typeof value === "string" && value.trim()) meta[key] = value.trim();
    }
    if (input.sources !== undefined) meta.sources = input.sources;
  }
  if (!meta.hash) meta.hash = fnv1a(JSON.stringify({ subjects }));
  return meta;
}

function checkMapping(map, rows) {
  const missing = REQUIRED_MAPPING_FIELDS.filter((field) => !map[field]);
  if (missing.length) {
    return missing.map((field) => problem(null, `mapping.${field}`, "columna obligatoria sin mapear"));
  }
  const present = new Set();
  for (const row of rows) {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      for (const key of Object.keys(row)) present.add(key);
    }
  }
  const absent = REQUIRED_MAPPING_FIELDS.filter((field) => !present.has(map[field]));
  return absent.map((field) =>
    problem(null, `mapping.${field}`, `columna «${map[field]}» no encontrada en las filas`),
  );
}

function processRow(row, index, map, subjects) {
  const rowErrors = [];
  const codigo = cell(row, map.codigo);
  if (!codigo) rowErrors.push(problem(index, "codigo", "código de asignatura vacío"));

  const letra = cell(row, map.grupo);
  if (!letra) rowErrors.push(problem(index, "grupo", "grupo vacío"));

  const rawDia = cell(row, map.dia);
  const dia = normalizeDay(rawDia);
  if (!dia) rowErrors.push(problem(index, "dia", `día inválido «${rawDia}» (esperado lunes..viernes)`));

  const inicio = cell(row, map.inicio);
  const fin = cell(row, map.fin);
  if (!isValidTime(inicio)) rowErrors.push(problem(index, "inicio", `hora de inicio inválida «${inicio}»`));
  if (!isValidTime(fin)) rowErrors.push(problem(index, "fin", `hora de fin inválida «${fin}»`));
  if (isValidTime(inicio) && isValidTime(fin) && timeToMinutes(fin) <= timeToMinutes(inicio)) {
    rowErrors.push(problem(index, "fin", "el fin debe ser posterior al inicio"));
  }

  const nombre = cell(row, map.nombre);
  const curso = parseCourseCell(cell(row, map.curso));
  if (!curso.ok) rowErrors.push(problem(index, "curso", "curso inválido (entero ≥ 1)"));
  const cuatrimestre = parseTermCell(cell(row, map.cuatrimestre));
  if (!cuatrimestre.ok) rowErrors.push(problem(index, "cuatrimestre", "cuatrimestre inválido (1 o 2)"));
  const creditos = parseCreditsCell(cell(row, map.creditos));
  if (!creditos.ok) rowErrors.push(problem(index, "creditos", "créditos inválidos (número ≥ 0)"));

  const rawTipo = cell(row, map.tipo);
  const tipo = normalizeTipo(rawTipo);
  if (!tipo.ok) rowErrors.push(problem(index, "tipo", `tipo de sesión inválido «${rawTipo}»`));

  const turnoExplicit = normalizeTurno(cell(row, map.turno));
  const subgrupo = cell(row, map.subgrupo);

  const existingSubject = subjects.get(codigo);
  if (existingSubject) {
    reconcileCheck(existingSubject, "nombre", nombre === "" ? null : nombre, index, rowErrors);
    reconcileCheck(existingSubject, "curso", curso.empty ? null : curso.value, index, rowErrors);
    reconcileCheck(existingSubject, "cuatrimestre", cuatrimestre.empty ? null : cuatrimestre.value, index, rowErrors);
    reconcileCheck(existingSubject, "creditos", creditos.empty ? null : creditos.value, index, rowErrors);
    const existingGroup = existingSubject.groups.get(letra);
    if (
      existingGroup &&
      turnoExplicit !== null &&
      existingGroup.turno !== null &&
      existingGroup.turno !== turnoExplicit
    ) {
      rowErrors.push(problem(index, "turno", `turno inconsistente con la fila ${existingGroup.turnoRow}`));
    }
  }

  if (rowErrors.length) return rowErrors;

  let subject = existingSubject;
  if (!subject) {
    subject = {
      order: subjects.size,
      codigo,
      nombre: nombre || codigo,
      curso: curso.value,
      cuatrimestre: cuatrimestre.value,
      creditos: creditos.value,
      explicit: {
        nombre: nombre !== "",
        curso: !curso.empty,
        cuatrimestre: !cuatrimestre.empty,
        creditos: !creditos.empty,
      },
      rows: { nombre: index, curso: index, cuatrimestre: index, creditos: index },
      groups: new Map(),
    };
    subjects.set(codigo, subject);
  } else {
    adopt(subject, "nombre", nombre === "" ? null : nombre, index);
    adopt(subject, "curso", curso.empty ? null : curso.value, index);
    adopt(subject, "cuatrimestre", cuatrimestre.empty ? null : cuatrimestre.value, index);
    adopt(subject, "creditos", creditos.empty ? null : creditos.value, index);
  }

  let group = subject.groups.get(letra);
  if (!group) {
    group = {
      letra,
      turno: turnoExplicit,
      turnoRow: turnoExplicit !== null ? index : null,
      firstInicio: inicio,
      teoria: [],
      practicas: new Map(),
      sessions: new Set(),
    };
    subject.groups.set(letra, group);
  } else if (group.turno === null && turnoExplicit !== null) {
    group.turno = turnoExplicit;
    group.turnoRow = index;
  }

  const tipoFinal = tipo.value === "" ? FIELD_DEFAULTS.tipo : tipo.value;
  const session = { dia, inicio, fin };
  if (tipoFinal === "teoria") {
    const key = `T|${dia}|${inicio}|${fin}`;
    if (!group.sessions.has(key)) {
      group.sessions.add(key);
      group.teoria.push(session);
    }
  } else {
    const sg = subgrupo !== "" ? subgrupo : letra;
    let sessions = group.practicas.get(sg);
    if (!sessions) {
      sessions = [];
      group.practicas.set(sg, sessions);
    }
    const key = `P|${sg}|${dia}|${inicio}|${fin}`;
    if (!group.sessions.has(key)) {
      group.sessions.add(key);
      sessions.push(session);
    }
  }
  return [];
}

function assemble(subjects, metaInput) {
  const outSubjects = [];
  for (const subject of subjects.values()) {
    const grupos = [];
    for (const group of subject.groups.values()) {
      const practicas = { subgrupos: [] };
      for (const [sg, sessions] of group.practicas) {
        practicas.subgrupos.push(sg);
        practicas[sg] = sessions;
      }
      grupos.push({
        letra: group.letra,
        turno: group.turno !== null ? group.turno : deriveTurno(group.firstInicio),
        teoria: group.teoria,
        practicas,
      });
    }
    outSubjects.push({
      codigo: subject.codigo,
      nombre: subject.nombre,
      curso: subject.curso,
      cuatrimestre: subject.cuatrimestre,
      creditos: subject.creditos,
      grupos,
    });
  }
  return {
    meta: buildMeta(metaInput, outSubjects),
    subjects: outSubjects,
    docents: [],
  };
}

export function buildCatalog(options) {
  const opts = options && typeof options === "object" && !Array.isArray(options) ? options : {};
  const { rows, mapping, meta } = opts;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { errors: [problem(null, "rows", "no hay filas para importar")] };
  }
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    return { errors: [problem(null, "mapping", "falta el mapeo de columnas")] };
  }
  const map = {};
  for (const key of Object.keys(mapping)) {
    const value = mapping[key];
    if (typeof value === "string" && value.trim()) map[key] = value.trim();
  }
  const mappingErrors = checkMapping(map, rows);
  if (mappingErrors.length) return { errors: mappingErrors };

  const errors = [];
  const subjects = new Map();
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(problem(index, "row", "fila no válida"));
      return;
    }
    errors.push(...processRow(row, index, map, subjects));
  });
  if (errors.length) return { errors };

  const catalog = assemble(subjects, meta);
  const check = validateCatalogJSON(catalog);
  if (!check.ok) {
    return { errors: check.errors.map((e) => problem(null, e.path, e.message)) };
  }
  return { catalog, errors: [] };
}

export function rowsToRecords(headers, rows) {
  if (!Array.isArray(headers) || !Array.isArray(rows)) return [];
  const names = headers.map((header) => normalizeText(header));
  return rows.map((row) => {
    const record = {};
    if (Array.isArray(row)) {
      names.forEach((name, i) => {
        record[name] = row[i] === undefined ? "" : row[i];
      });
    }
    return record;
  });
}

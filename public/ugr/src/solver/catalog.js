export const VALID_DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes"];

export const DEFAULT_META = {
  university: "UGR",
  degree: "GI",
  plan: "2022",
  version: "legacy-1",
  hash: "",
};

const TIME_RE = /^\d{1,2}:\d{2}$/;

export function timeToMinutes(t) {
  if (typeof t !== "string") return NaN;
  const parts = t.split(":");
  if (parts.length !== 2) return NaN;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

export function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function isValidTime(t) {
  return typeof t === "string" && TIME_RE.test(t) && !Number.isNaN(timeToMinutes(t));
}

function copySession(session) {
  return { dia: session.dia, inicio: session.inicio, fin: session.fin };
}

function copySessions(sessions) {
  return Array.isArray(sessions) ? sessions.map(copySession) : [];
}

function copyPracticas(practicas) {
  const out = { subgrupos: [] };
  if (!practicas || typeof practicas !== "object") return out;
  const subgrupos = Array.isArray(practicas.subgrupos) ? practicas.subgrupos : [];
  out.subgrupos = subgrupos.slice();
  for (const key of Object.keys(practicas)) {
    if (key === "subgrupos") continue;
    if (Array.isArray(practicas[key])) out[key] = copySessions(practicas[key]);
  }
  return out;
}

function copyGroup(group) {
  return {
    letra: group.letra,
    turno: group.turno,
    teoria: copySessions(group.teoria),
    practicas: copyPracticas(group.practicas),
  };
}

export function normalizeSubject(subject) {
  return {
    codigo: subject.codigo,
    nombre: subject.nombre,
    curso: subject.curso,
    cuatrimestre: subject.cuatrimestre,
    creditos: subject.creditos,
    grupos: Array.isArray(subject.grupos) ? subject.grupos.map(copyGroup) : [],
  };
}

export function fromLegacySubjects(legacySubjects, meta = {}) {
  if (!Array.isArray(legacySubjects)) {
    throw new TypeError("fromLegacySubjects expects an array");
  }
  return {
    meta: { ...DEFAULT_META, ...meta },
    subjects: legacySubjects.map(normalizeSubject),
    docents: [],
  };
}

export function catalogVersion(catalog) {
  if (!catalog) return "";
  const { version = "", hash = "" } = catalog.meta || {};
  return `${version}:${hash}:${catalog.subjects?.length ?? 0}`;
}

export function getSubject(catalog, codigo) {
  if (!catalog?.subjects) return null;
  return catalog.subjects.find((s) => s.codigo === codigo) || null;
}

export function getGroup(subject, letra) {
  if (!subject?.grupos) return null;
  return subject.grupos.find((g) => g.letra === letra) || null;
}

export function getSubgroups(group) {
  if (!group?.practicas?.subgrupos) return [];
  return group.practicas.subgrupos;
}

/**
 * Peso de cada dificultad conocida para el término de profesor del coste.
 * `gris` («Desconocido») NO está aquí a propósito: antes caía al `?? 3` y
 * pesaba lo mismo que «Difícil», que es justo lo contrario de lo que significa
 * no saber nada de un profesor (decisión de producto del 2026-10-15).
 */
export const DIFFICULTY_SCORES = {
  cyan: 6,
  verde: 5,
  amarillo: 4,
  naranja: 3,
  rojo: 2,
  negro: 1,
};

/**
 * Peso de una dificultad. Devuelve `null` cuando no hay puntuación —`gris`,
 * cadena desconocida o valor ausente—, y `null` es «sin puntuación» en todo el
 * camino: `engine.js` lo interpreta como penalización 0 (el grupo no se ve
 * empujado ni premiado) y `metrics.js` lo ignora en lugar de contarlo. El
 * llamante decide qué hacer con el hueco; nunca se inventa un 3 por defecto.
 *
 * @param {string|null|undefined} dificultad clave de dificultad.
 * @returns {number|null} entero 1–6 o `null` si no hay puntuación.
 */
export function difficultyScore(dificultad) {
  return DIFFICULTY_SCORES[dificultad] ?? null;
}

function docentKey(docent) {
  if (docent?.key) return docent.key;
  if (docent?.subjectCode && docent?.groupLetter) return `${docent.subjectCode}-${docent.groupLetter}`;
  return "";
}

/**
 * Opiniones de un docente en la forma canónica `profile.opinions[]` (desde
 * I-11: varias por profesor, cadenas sueltas, sin metadatos). Se sigue
 * aceptando el `profile.opinion` singular que usaban los datos anteriores para
 * no romper un catálogo exportado antes del cambio; se normaliza a un array de
 * uno. Las cadenas vacías no son opiniones y se descartan.
 *
 * @param {Object} profile perfil crudo del docente.
 * @returns {string[]} opiniones no vacías.
 */
function normalizeOpinions(profile) {
  if (Array.isArray(profile.opinions)) {
    return profile.opinions.filter((o) => typeof o === "string" && o.trim() !== "");
  }
  if (typeof profile.opinion === "string" && profile.opinion.trim() !== "") {
    return [profile.opinion];
  }
  return [];
}

export function normalizeDocent(docent) {
  if (!docent || typeof docent !== "object") return null;
  const key = docentKey(docent);
  if (!key) return null;
  const profile = docent.profile || {};
  const dash = key.lastIndexOf("-");
  return {
    key,
    name: docent.name || "",
    subjectCode: docent.subjectCode || (dash > 0 ? key.slice(0, dash) : key),
    groupLetter: docent.groupLetter || (dash >= 0 ? key.slice(dash + 1) : ""),
    profile: {
      dificultad: profile.dificultad || null,
      razon: profile.razon || "",
      opinions: normalizeOpinions(profile),
    },
  };
}

export function attachDocents(catalog, docents) {
  if (!catalog || typeof catalog !== "object") return catalog;
  const list = Array.isArray(docents) ? docents.map(normalizeDocent).filter(Boolean) : [];
  catalog.docents = list;
  return catalog;
}

export function getDocent(catalog, key) {
  if (!catalog?.docents || !key) return null;
  return catalog.docents.find((d) => d.key === key) || null;
}

function validateSession(session, path, errors) {
  if (!session || typeof session !== "object") {
    errors.push(`${path}: sesión inválida`);
    return;
  }
  if (!VALID_DAYS.includes(session.dia)) {
    errors.push(`${path}: día inválido "${session.dia}"`);
  }
  if (!isValidTime(session.inicio)) {
    errors.push(`${path}: inicio inválido "${session.inicio}"`);
  }
  if (!isValidTime(session.fin)) {
    errors.push(`${path}: fin inválido "${session.fin}"`);
  }
  if (isValidTime(session.inicio) && isValidTime(session.fin)) {
    if (timeToMinutes(session.fin) <= timeToMinutes(session.inicio)) {
      errors.push(`${path}: fin <= inicio ("${session.inicio}"-"${session.fin}")`);
    }
  }
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || !Array.isArray(catalog.subjects)) {
    return { ok: false, errors: ["catálogo sin subjects"] };
  }
  const seen = new Set();
  for (const subject of catalog.subjects) {
    const code = subject?.codigo;
    if (!code) {
      errors.push("asignatura sin código");
      continue;
    }
    if (seen.has(code)) errors.push(`código duplicado: ${code}`);
    seen.add(code);
    if (typeof subject.curso !== "number") errors.push(`${code}: curso inválido`);
    if (subject.cuatrimestre !== 1 && subject.cuatrimestre !== 2) {
      errors.push(`${code}: cuatrimestre inválido`);
    }
    const groupLetters = new Set();
    for (const group of subject.grupos || []) {
      const gpath = `${code}/${group.letra}`;
      if (groupLetters.has(group.letra)) errors.push(`${gpath}: grupo duplicado`);
      groupLetters.add(group.letra);
      (group.teoria || []).forEach((s, i) => validateSession(s, `${gpath}/teoria[${i}]`, errors));
      const subgrupos = group.practicas?.subgrupos || [];
      for (const sg of subgrupos) {
        if (!Array.isArray(group.practicas?.[sg])) {
          errors.push(`${gpath}: subgrupo "${sg}" sin sesiones`);
        }
      }
      for (const key of Object.keys(group.practicas || {})) {
        if (key === "subgrupos") continue;
        if (!subgrupos.includes(key)) {
          errors.push(`${gpath}: sesiones de "${key}" sin declarar en subgrupos`);
        }
        (group.practicas[key] || []).forEach((s, i) =>
          validateSession(s, `${gpath}/${key}[${i}]`, errors),
        );
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

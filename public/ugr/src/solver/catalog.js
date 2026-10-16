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

/**
 * Asignatura en la forma canónica. Los campos del plan (`caracter`, `mencion`,
 * `dificultad` y `descripcion`) son **opcionales**: los trae el volcado de la
 * hoja, no el plan antiguo, y una asignatura sin ellos sigue siendo válida (la
 * app simplemente no pinta lo que no hay). La dificultad y la descripción van
 * por modalidad porque la hoja las guarda así —y son coherentes dentro de cada
 * (asignatura, modalidad): comprobado sobre las 185 parejas del volcado.
 *
 * @param {Object} subject asignatura cruda.
 * @returns {Object} asignatura normalizada.
 */
export function normalizeSubject(subject) {
  const out = {
    codigo: subject.codigo,
    nombre: subject.nombre,
    curso: subject.curso,
    cuatrimestre: subject.cuatrimestre,
    creditos: subject.creditos,
    grupos: Array.isArray(subject.grupos) ? subject.grupos.map(copyGroup) : [],
  };
  if (typeof subject.caracter === "string" && subject.caracter) out.caracter = subject.caracter;
  if (typeof subject.mencion === "string" && subject.mencion) out.mencion = subject.mencion;
  const dificultad = normalizeByModality(subject.dificultad, (v) => v);
  if (dificultad) out.dificultad = dificultad;
  const descripcion = normalizeByModality(subject.descripcion, (v) => v);
  if (descripcion) out.descripcion = descripcion;
  return out;
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
 * no saber nada de un profesor.
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
 * Techo de la escala: la puntuación máxima que puede sumar una entrada. Lo usan
 * las vistas que enseñan la puntuación de profesor como «suma / máximo»
 * (p. ej. `12/18`), y se **deriva** de la escala para que no pueda desviarse si
 * algún día cambia un peso.
 */
export const MAX_DIFFICULTY_SCORE = Math.max(...Object.values(DIFFICULTY_SCORES));

/**
 * Etiquetas con las que la app **enseña** la dificultad. Son distintas de las de
 * la hoja (`DIFFICULTY_BY_LABEL`, que es la que se parsea al importar): el
 * «Extremo» de la pantalla es «Extremo (3% aprobados)» en la hoja, y el color
 * `gris` se llama «Se desconoce» allí y «Desconocido» aquí. Ambas voces viven en
 * el mismo sitio para que se vea que son dos y no una mal copiada.
 */
export const DIFFICULTY_UI_LABELS = {
  cyan: "Muy fácil",
  verde: "Fácil",
  amarillo: "Normal",
  naranja: "Difícil",
  rojo: "Muy difícil",
  negro: "Extremo",
  gris: "Desconocido",
};

/** Etiqueta de pantalla de una dificultad; «Desconocido» si no se reconoce. */
export function difficultyLabel(dificultad) {
  return DIFFICULTY_UI_LABELS[dificultad] || DIFFICULTY_UI_LABELS.gris;
}

/**
 * Referencia al token CSS donde **vive el color** de esa dificultad. El JS no
 * conoce el valor (la hoja de estilos es su dueña): así el mismo dato no puede
 * desviarse entre el CSS y el código. Una dificultad no reconocida cae al gris,
 * igual que `difficultyLabel`.
 */
export function difficultyToken(dificultad) {
  return `var(--diff-${DIFFICULTY_UI_LABELS[dificultad] ? dificultad : "gris"})`;
}

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

/**
 * Etiquetas de dificultad de la hoja de la ETSIIT (`docentes_excel.json`)
 * frente a las claves de color que usa la app. La correspondencia es 1:1 y
 * cubre la escala entera, así que no hay que inventar valores; «Se desconoce»
 * entra como `gris`, que ya significa «sin puntuación» en todo el camino
 * (`difficultyScore` devuelve `null` para él). El único valor que no existe en
 * la hoja es `negro`, y su etiqueta es la única que lleva paréntesis.
 */
export const DIFFICULTY_BY_LABEL = {
  "Muy fácil": "cyan",
  "Fácil": "verde",
  Normal: "amarillo",
  "Difícil": "naranja",
  "Muy difícil": "rojo",
  "Extremo (3% aprobados)": "negro",
  "Se desconoce": "gris",
};

/**
 * Traduce una etiqueta del volcado a la clave de color de la app.
 *
 * @param {string} label etiqueta tal cual viene en la hoja.
 * @returns {string|null} clave de color, o `null` si no se reconoce.
 */
export function difficultyFromLabel(label) {
  if (typeof label !== "string") return null;
  return DIFFICULTY_BY_LABEL[label.trim()] ?? null;
}

/**
 * Las dos modalidades del volcado (lo que la hoja llama `tipo` en sus filas de
 * docentes). El nombre se fija aquí y no en cada módulo porque la asignación,
 * el perfil del profesor y el problema del solver tienen que coincidir letra a
 * letra.
 */
export const MODALIDADES = ["Teoría", "Prácticas"];

const MODALITY_KEYS = { "Teoría": "teoria", "Prácticas": "practicas" };

/**
 * Normaliza un mapa por modalidad (la dificultad o la descripción de una
 * asignatura, que el volcado guarda por fila pero son iguales en todas las de
 * la misma modalidad). Devuelve `null` si no hay nada que guardar, para no
 * llenar de objetos vacíos las asignaturas que no traen esta información.
 *
 * @param {Object} value mapa con claves «Teoría»/«Prácticas».
 * @param {(v: any) => any} map valor de cada modalidad.
 * @returns {{teoria?: any, practicas?: any}|null}
 */
function normalizeByModality(value, map) {
  if (!value || typeof value !== "object") return null;
  const out = {};
  for (const modalidad of MODALIDADES) {
    const raw = value[modalidad];
    const mapped = raw === undefined || raw === null ? null : map(raw);
    if (mapped !== null && mapped !== "") out[MODALITY_KEYS[modalidad]] = mapped;
  }
  return Object.keys(out).length ? out : null;
}

function docentKey(docent) {
  if (docent?.key) return docent.key;
  if (docent?.subjectCode && docent?.groupLetter) return `${docent.subjectCode}-${docent.groupLetter}`;
  return "";
}

/**
 * Opiniones de un profesor en la forma canónica `opinions[]`:
 * varias por profesor, cadenas sueltas, sin metadatos). Se sigue aceptando el
 * `opinion` singular —que es como lo trae el volcado de la hoja, una por fila—
 * y se normaliza a un array de uno. Las cadenas vacías no son opiniones y se
 * descartan.
 *
 * @param {Object} profesor perfil crudo del profesor.
 * @returns {string[]} opiniones no vacías.
 */
function normalizeOpinions(profesor) {
  if (Array.isArray(profesor.opinions)) {
    return profesor.opinions.filter((o) => typeof o === "string" && o.trim() !== "");
  }
  if (typeof profesor.opinion === "string" && profesor.opinion.trim() !== "") {
    return [profesor.opinion];
  }
  return [];
}

/**
 * Comentarios de la hoja sobre una fila (asignatura, modalidad, profesor).
 *
 * **El `autor` se descarta aquí**, y este es el único sitio del camino donde
 * puede entrar: la hoja lo trae en cada comentario, el maestro privado no lo
 * guarda y ni el catálogo ni el dataset ni el paquete pueden llevarlo. Se
 * conservan `fecha`, `texto`, `campo` (qué campo de la fila comenta), `celda` y
 * `anclaje` tal cual, porque son datos del autor y la regla es no perder nada
 * salvo el autor.
 *
 * @param {Array} list comentarios crudos.
 * @returns {Array<{fecha: string, texto: string, campo: string, celda: string,
 *   anclaje: string}>} comentarios sin autor; vacío si no hay texto.
 */
function normalizeComentarios(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const texto = typeof raw.texto === "string" ? raw.texto.trim() : "";
    if (!texto) continue;
    out.push({
      fecha: typeof raw.fecha === "string" ? raw.fecha : "",
      texto,
      campo: typeof raw.campo === "string" ? raw.campo : "",
      celda: typeof raw.celda === "string" ? raw.celda : "",
      anclaje: typeof raw.anclaje === "string" ? raw.anclaje : "",
    });
  }
  return out;
}

/**
 * Clave de un profesor. El volcado identifica cada valoración por la terna
 * (asignatura, modalidad, nombre) —424 filas válidas de 426— así que la clave
 * es esa; el nombre solo no basta porque 130 de los 247 profesores aparecen en
 * más de una fila con dificultad y opinión distintas según la modalidad.
 *
 * @param {string} subjectCode código de la asignatura.
 * @param {string} modalidad «Teoría» o «Prácticas».
 * @param {string} name nombre del profesor.
 * @returns {string} clave estable.
 */
export function profesorKey(subjectCode, modalidad, name) {
  return `${subjectCode}|${modalidad}|${name}`;
}

/**
 * Profesor en la forma canónica: el perfil de una persona **en una asignatura y
 * una modalidad**. `dificultad` y `opinions` son suyos y no se recalculan
 * nunca; la asignación a un grupo vive aparte (la hace el usuario).
 *
 * @param {Object} profesor profesor crudo.
 * @returns {Object|null} profesor normalizado, o `null` si le falta la terna.
 */
export function normalizeProfesor(profesor) {
  if (!profesor || typeof profesor !== "object") return null;
  const subjectCode = typeof profesor.subjectCode === "string" ? profesor.subjectCode : "";
  const modalidad = MODALIDADES.includes(profesor.modalidad) ? profesor.modalidad : "";
  const name = typeof profesor.name === "string" ? profesor.name : "";
  if (!subjectCode || !modalidad || !name) return null;
  return {
    key: profesorKey(subjectCode, modalidad, name),
    name,
    subjectCode,
    modalidad,
    // Etiqueta cruda de la hoja (`asignatura`), tal cual: el código normalizado
    // ya está en `subjectCode`, pero la etiqueta es lo único que distingue las
    // dos asignaturas que la hoja llama `RI` —Recuperación de Información
    // (obligatoria de rama) y Robótica Industrial (optativa, escrita como
    // «RI (optativa)»)—. El sufijo no es sistemático, así que no se deduce nada
    // de él: se guarda el texto.
    asignatura: typeof profesor.asignatura === "string" ? profesor.asignatura : subjectCode,
    dificultad: profesor.dificultad || null,
    razon: typeof profesor.razon === "string" ? profesor.razon : "",
    opinions: normalizeOpinions(profesor),
    cruzada: profesor.cruzada === true,
    comentarios: normalizeComentarios(profesor.comentarios),
  };
}

/**
 * Asignación de un grupo (o subgrupo) a un profesor. Es lo único que el usuario
 * edita a mano y, desde el volcado, **no lleva perfil**: solo el enlace. El
 * destino es la letra del grupo para la teoría (`A`) o el subgrupo de prácticas
 * (`A1`), y va en `groupLetter` porque la app ya construye sus claves como
 * `CODIGO-destino`.
 *
 * @param {Object} docent asignación cruda.
 * @returns {Object|null} asignación normalizada.
 */
export function normalizeDocent(docent) {
  if (!docent || typeof docent !== "object") return null;
  const key = docentKey(docent);
  if (!key) return null;
  const dash = key.lastIndexOf("-");
  return {
    key,
    name: typeof docent.name === "string" ? docent.name : "",
    subjectCode: docent.subjectCode || (dash > 0 ? key.slice(0, dash) : key),
    groupLetter: docent.groupLetter || (dash >= 0 ? key.slice(dash + 1) : ""),
    modalidad: MODALIDADES.includes(docent.modalidad) ? docent.modalidad : "Teoría",
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

/**
 * Mención (especialidad) del plan, con su descripción.
 *
 * @param {Object} mencion mención cruda.
 * @returns {Object|null}
 */
export function normalizeMencion(mencion) {
  if (!mencion || typeof mencion !== "object") return null;
  const codigo = typeof mencion.codigo === "string" ? mencion.codigo : "";
  if (!codigo) return null;
  return {
    codigo,
    nombre: typeof mencion.nombre === "string" ? mencion.nombre : "",
    descripcion: typeof mencion.descripcion === "string" ? mencion.descripcion : "",
  };
}

/**
 * Entrada de una lista de personal sin asignatura (tutores de TFG, másteres):
 * nombre, dificultad y opinión, sin modalidad ni comentarios porque la hoja no
 * los trae.
 *
 * @param {Object} entry entrada cruda.
 * @returns {Object|null}
 */
export function normalizeStaff(entry) {
  if (!entry || typeof entry !== "object") return null;
  const nombre = typeof entry.nombre === "string" ? entry.nombre : "";
  if (!nombre) return null;
  return {
    nombre,
    dificultad: entry.dificultad || null,
    opinions: normalizeOpinions({ opinion: entry.opinion, opinions: entry.opinions }),
  };
}

/**
 * Asignatura del plan que la app **no** planifica (sin horario ni créditos en
 * la hoja): se guarda para poder responder «qué me falta de la mención» sin
 * perder la parte del plan que el catálogo no cubre. `caracter` distingue las
 * dos asignaturas que la hoja llama `RI` (Recuperación de Información y
 * Robótica Industrial comparten código y son de menciones distintas).
 *
 * @param {Object} subject asignatura cruda del índice.
 * @returns {Object|null}
 */
export function normalizeExtraSubject(subject) {
  if (!subject || typeof subject !== "object") return null;
  const codigo = typeof subject.codigo === "string" ? subject.codigo : "";
  if (!codigo) return null;
  const curso = Number(subject.curso);
  const cuatrimestre = Number(subject.cuatrimestre);
  const creditos = Number(subject.creditos);
  return {
    codigo,
    nombre: typeof subject.nombre === "string" ? subject.nombre : "",
    curso: Number.isFinite(curso) ? curso : 0,
    cuatrimestre: cuatrimestre === 2 ? 2 : 1,
    // Los créditos hacen falta para cuadrar los 240 del grado: las asignaturas
    // del plan cuentan igual que las del catálogo.
    creditos: Number.isFinite(creditos) ? creditos : 0,
    caracter: typeof subject.caracter === "string" ? subject.caracter : "",
    mencion: typeof subject.mencion === "string" ? subject.mencion : "",
  };
}

/**
 * Engancha al catálogo las piezas que trae el volcado (perfiles de profesor,
 * menciones, personal sin asignatura y plan no planificado). Solo escribe las
 * claves presentes: una muestra sin volcado no queda con listas vacías
 * inventadas, y el esquema y el hash del dataset ven exactamente lo que hay.
 *
 * @param {Object} catalog catálogo.
 * @param {Object} [plan] piezas opcionales.
 * @returns {Object} el mismo catálogo.
 */
export function attachPlan(catalog, plan = {}) {
  if (!catalog || typeof catalog !== "object") return catalog;
  const lists = {
    profesores: normalizeProfesor,
    menciones: normalizeMencion,
    tutoresTfg: normalizeStaff,
    masteres: normalizeStaff,
    extraSubjects: normalizeExtraSubject,
  };
  for (const [key, normalize] of Object.entries(lists)) {
    if (!Array.isArray(plan[key])) continue;
    catalog[key] = plan[key].map(normalize).filter(Boolean);
  }
  return catalog;
}

/**
 * Profesor de una asignatura y modalidad por nombre.
 *
 * @param {Object} catalog catálogo.
 * @param {string} subjectCode código.
 * @param {string} modalidad «Teoría» o «Prácticas».
 * @param {string} name nombre del profesor.
 * @returns {Object|null}
 */
export function getProfesor(catalog, subjectCode, modalidad, name) {
  if (!catalog?.profesores || !name) return null;
  const key = profesorKey(subjectCode, modalidad, name);
  return catalog.profesores.find((p) => p.key === key) || null;
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

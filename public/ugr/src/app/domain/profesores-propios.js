/**
 * Profesores propios: las valoraciones que añade el usuario (por formulario o
 * importando un JSON) por encima del catálogo activo.
 *
 * Un catálogo trae perfiles de (asignatura, modalidad, nombre); una valoración
 * propia usa la misma terna cuando está asociada a una asignatura y **solo el
 * nombre** cuando todavía no lo está, para poder asignarla después. Aquí están
 * las reglas puras —normalizar, parsear, fusionar y componer el prompt—; el
 * llamante decide dónde se guardan (`src/store/reviews.js`) y cómo se pintan.
 *
 * La fusión es «la tuya manda»: para la misma terna, tu valoración sustituye a
 * la del catálogo, así que se ve en la insignia del horario y puntúa en el
 * generador.
 */

import {
  DIFFICULTY_BY_LABEL,
  DIFFICULTY_SCORES,
  MODALIDADES,
  difficultyFromLabel,
  profesorKey,
} from "../../solver/catalog.js";

/**
 * Escala de dificultad para el desplegable y el prompt, derivada del mapa de
 * etiquetas de la hoja para no repetir la lista. Conserva el orden de la escala
 * (de más fácil a más difícil) y `gris` entra como «no puntúa».
 */
export const DIFICULTAD_OPCIONES = Object.entries(DIFFICULTY_BY_LABEL).map(([label, key]) => ({
  key,
  label,
}));

function isKnownDifficulty(key) {
  return key === "gris" || Object.prototype.hasOwnProperty.call(DIFFICULTY_SCORES, key);
}

/**
 * Traduce lo que escriba el usuario a una clave de color. Se acepta tanto la
 * clave (`naranja`) como la etiqueta de la hoja (`Difícil`), porque un JSON
 * generado por una IA puede traer cualquiera de las dos.
 *
 * @param {*} value valor crudo.
 * @returns {string|null|undefined} clave de color; `null` para «sin
 *   valoración» y `undefined` si el valor no se reconoce (se rechaza).
 */
function normalizeDificultad(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (isKnownDifficulty(raw)) return raw;
  return difficultyFromLabel(raw) ?? undefined;
}

function normalizeOpinions(input) {
  if (Array.isArray(input.opinions)) {
    return input.opinions
      .filter((o) => typeof o === "string")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  // Se acepta el `opinion` singular —la forma de la hoja— como una opinión más.
  if (typeof input.opinion === "string" && input.opinion.trim() !== "") {
    return [input.opinion.trim()];
  }
  return [];
}

/**
 * Una valoración propia en su forma canónica, o `null` si no se puede usar.
 * `docentKey` hace de clave primaria en la tabla `reviews`.
 *
 * @param {Object} input valoración cruda (formulario o JSON).
 * @returns {Object|null} valoración normalizada.
 */
export function normalizeOwnReview(input) {
  if (!input || typeof input !== "object") return null;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return null;
  const dificultad = normalizeDificultad(input.dificultad);
  if (dificultad === undefined) return null;
  const subjectCode = typeof input.subjectCode === "string" ? input.subjectCode.trim() : "";
  // Sin asignatura no hay modalidad; con asignatura, la teoría es el defecto
  // razonable cuando el JSON no la trae.
  const modalidad = subjectCode
    ? MODALIDADES.includes(input.modalidad)
      ? input.modalidad
      : "Teoría"
    : "";
  return {
    docentKey: subjectCode ? profesorKey(subjectCode, modalidad, name) : name,
    name,
    subjectCode,
    modalidad,
    dificultad,
    razon: typeof input.razon === "string" ? input.razon : "",
    opinions: normalizeOpinions(input),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
  };
}

/**
 * Lee el JSON de una importación. Acepta un array o un objeto con
 * `profesores`/`reviews`; descarta lo que no valga y devuelve el motivo.
 *
 * @param {string} text contenido del fichero.
 * @returns {{reviews: Array, errors: string[]}}
 */
export function parseOwnReviewsJSON(text) {
  const out = { reviews: [], errors: [] };
  let data;
  try {
    data = JSON.parse(String(text === null || text === undefined ? "" : text));
  } catch {
    out.errors.push("El texto no es JSON válido.");
    return out;
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.profesores)
      ? data.profesores
      : Array.isArray(data?.reviews)
        ? data.reviews
        : null;
  if (!list) {
    out.errors.push("Se esperaba una lista de profesores (o un objeto con «profesores»).");
    return out;
  }
  list.forEach((item, index) => {
    const review = normalizeOwnReview(item);
    if (review) out.reviews.push(review);
    else out.errors.push(`Entrada ${index + 1}: falta el nombre o la dificultad no se reconoce.`);
  });
  return out;
}

/**
 * Valoración propia con la forma de un perfil del catálogo, para que el motor,
 * las insignias y las fichas la traten igual. `propio` marca su origen.
 *
 * @param {Object} review valoración normalizada.
 * @returns {Object} perfil.
 */
export function ownReviewToProfesor(review) {
  return {
    key: review.docentKey,
    name: review.name,
    subjectCode: review.subjectCode,
    modalidad: review.modalidad,
    dificultad: review.dificultad || null,
    razon: review.razon || "",
    opinions: Array.isArray(review.opinions) ? [...review.opinions] : [],
    cruzada: false,
    comentarios: [],
    propio: true,
  };
}

/**
 * Fusiona el catálogo con las valoraciones propias: para la misma clave manda
 * la tuya, y las que todavía no tienen asignatura se añaden aparte (su clave es
 * el nombre).
 *
 * @param {Array} catalogo perfiles del catálogo activo.
 * @param {Array} propios valoraciones normalizadas.
 * @returns {{profesores: Array, keys: Set<string>}} perfiles fusionados y las
 *   claves propias (para marcarlas y saber qué se puede editar o borrar).
 */
export function mergeProfesores(catalogo, propios) {
  const byKey = new Map();
  for (const profesor of Array.isArray(catalogo) ? catalogo : []) {
    if (profesor && profesor.key) byKey.set(profesor.key, profesor);
  }
  const keys = new Set();
  for (const review of Array.isArray(propios) ? propios : []) {
    if (!review || !review.docentKey) continue;
    keys.add(review.docentKey);
    byKey.set(review.docentKey, ownReviewToProfesor(review));
  }
  return { profesores: [...byKey.values()], keys };
}

/**
 * JSON exportable y reimportable de las valoraciones propias: los campos del
 * esquema canónico, sin la clave interna ni la fecha de edición.
 *
 * @param {Array} reviews valoraciones.
 * @returns {string} JSON con sangrado.
 */
export function ownReviewsToJSON(reviews) {
  const list = (Array.isArray(reviews) ? reviews : []).map((r) => ({
    name: r.name,
    subjectCode: r.subjectCode || "",
    modalidad: r.modalidad || "",
    dificultad: r.dificultad || "",
    opinions: Array.isArray(r.opinions) ? r.opinions : [],
  }));
  return JSON.stringify(list, null, 2);
}

/**
 * Prompt para pedirle a una IA valoraciones en el formato que la app importa.
 * Lleva la estructura de asignaturas del catálogo activo —código, nombre y los
 * grupos de cada modalidad— para que asocie cada profesor a su asignatura sin
 * inventarse códigos.
 *
 * @param {Array} subjects asignaturas del catálogo activo.
 * @returns {string} texto listo para copiar.
 */
export function buildProfesorPrompt(subjects) {
  const escala = DIFICULTAD_OPCIONES.map((o) => `${o.key} (${o.label})`).join(", ");
  const lines = [
    "Actúa como un estudiante del Grado en Ingeniería Informática de la ETSIIT (Universidad de Granada).",
    "Devuelve SOLO un JSON válido, sin texto alrededor: un array con una entrada por profesor valorado.",
    "",
    "Formato de cada entrada:",
    "{",
    '  "name": "Nombre Apellido Apellido",',
    '  "subjectCode": "SO",',
    '  "modalidad": "Teoría",',
    '  "dificultad": "naranja",',
    '  "opinions": ["Una frase por opinión."]',
    "}",
    "",
    "Reglas:",
    '- "subjectCode": un código de la lista de abajo; "" si no lo sabes.',
    '- "modalidad": "Teoría" o "Prácticas".',
    `- "dificultad": una de ${escala}.`,
    '- "opinions": una lista de frases (puede ir vacía).',
    "- No inventes asignaturas ni códigos que no estén en la lista.",
    "",
    "Asignaturas disponibles (código — nombre — teoría / prácticas):",
  ];
  for (const subject of Array.isArray(subjects) ? subjects : []) {
    const grupos = Array.isArray(subject?.grupos) ? subject.grupos : [];
    const teoria = grupos
      .map((g) => g.letra)
      .filter(Boolean)
      .join(", ");
    const practicas = grupos
      .flatMap((g) => (Array.isArray(g?.practicas?.subgrupos) ? g.practicas.subgrupos : []))
      .join(", ");
    lines.push(
      `${subject.codigo} — ${subject.nombre} — ${teoria || "sin grupos"}${practicas ? ` / ${practicas}` : ""}`,
    );
  }
  return lines.join("\n");
}

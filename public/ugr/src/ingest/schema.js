export const VALID_DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes"];

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function joinPath(path, key) {
  return path ? `${path}.${key}` : key;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateNode(schema, value, path, errors) {
  if (!schema || typeof schema !== "object") return;
  const actual = typeOf(value);

  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.includes(actual)) {
      errors.push({ path, message: `se esperaba ${allowed.join(" o ")}, llegó ${actual}` });
      return;
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((option) => option === value)) {
    errors.push({ path, message: `valor no permitido: ${JSON.stringify(value)}` });
    return;
  }

  if (actual === "object") {
    for (const key of schema.required || []) {
      if (!hasOwn(value, key)) {
        errors.push({ path: joinPath(path, key), message: "campo obligatorio" });
      }
    }
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        if (hasOwn(value, key)) {
          validateNode(schema.properties[key], value[key], joinPath(path, key), errors);
        }
      }
    }
    if (schema.additionalProperties === false) {
      const known = schema.properties || {};
      for (const key of Object.keys(value)) {
        if (!hasOwn(known, key)) {
          errors.push({ path: joinPath(path, key), message: "propiedad no permitida" });
        }
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      const known = schema.properties || {};
      for (const key of Object.keys(value)) {
        if (!hasOwn(known, key)) {
          validateNode(schema.additionalProperties, value[key], joinPath(path, key), errors);
        }
      }
    }
  }

  if (actual === "array" && schema.items) {
    value.forEach((item, index) => {
      validateNode(schema.items, item, `${path}[${index}]`, errors);
    });
  }
}

export function validate(schema, value) {
  const errors = [];
  validateNode(schema, value, "", errors);
  return { ok: errors.length === 0, errors };
}

const SESSION_SCHEMA = {
  type: "object",
  required: ["dia", "inicio", "fin"],
  properties: {
    dia: { type: "string", enum: VALID_DAYS },
    inicio: { type: "string" },
    fin: { type: "string" },
  },
  additionalProperties: false,
};

const MENCION_SCHEMA = {
  type: "object",
  required: ["codigo", "nombre", "descripcion"],
  properties: {
    codigo: { type: "string" },
    nombre: { type: "string" },
    descripcion: { type: "string" },
  },
  additionalProperties: false,
};

const MODALIDAD_SCHEMA = { type: "string", enum: ["Teoría", "Prácticas"] };

const DIFFICULTY_SCHEMA = { type: ["string", "null"] };

/**
 * Comentario de la hoja sobre una fila. **No admite `autor`**: el modelo no lo
 * guarda (se incluye todo el volcado menos el autor), así
 * que un comentario con autor se rechaza en la puerta en vez de colarse.
 */
const COMMENT_SCHEMA = {
  type: "object",
  required: ["fecha", "texto", "campo", "celda", "anclaje"],
  properties: {
    fecha: { type: "string" },
    texto: { type: "string" },
    campo: { type: "string" },
    celda: { type: "string" },
    anclaje: { type: "string" },
  },
  additionalProperties: false,
};

const PROFESOR_SCHEMA = {
  type: "object",
  required: ["key", "name", "subjectCode", "modalidad", "asignatura", "dificultad", "opinions"],
  properties: {
    key: { type: "string" },
    name: { type: "string" },
    subjectCode: { type: "string" },
    modalidad: MODALIDAD_SCHEMA,
    asignatura: { type: "string" },
    dificultad: DIFFICULTY_SCHEMA,
    razon: { type: "string" },
    opinions: { type: "array", items: { type: "string" } },
    // La hoja marca así las filas cuyo profesor acumula más de una opinión
    // (definición del autor); se guarda tal cual, sin deducir nada de ella.
    cruzada: { type: "boolean" },
    comentarios: { type: "array", items: COMMENT_SCHEMA },
  },
  additionalProperties: false,
};

/** Lista de personal sin asignatura: tutores de TFG y másteres. */
const STAFF_SCHEMA = {
  type: "object",
  required: ["nombre", "dificultad", "opinions"],
  properties: {
    nombre: { type: "string" },
    dificultad: DIFFICULTY_SCHEMA,
    opinions: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
};

/** Asignatura del plan sin horario en la app (para las menciones). */
const EXTRA_SUBJECT_SCHEMA = {
  type: "object",
  required: ["codigo", "nombre", "curso", "cuatrimestre", "caracter", "mencion"],
  properties: {
    codigo: { type: "string" },
    nombre: { type: "string" },
    curso: { type: "number" },
    cuatrimestre: { type: "number", enum: [1, 2] },
    caracter: { type: "string" },
    mencion: { type: "string" },
  },
  additionalProperties: false,
};

const SUBJECT_SCHEMA = {
  type: "object",
  required: ["codigo", "nombre", "curso", "cuatrimestre", "creditos", "grupos"],
  properties: {
    codigo: { type: "string" },
    nombre: { type: "string" },
    curso: { type: "number" },
    cuatrimestre: { type: "number", enum: [1, 2] },
    creditos: { type: "number" },
    // Campos del plan de estudios. Son opcionales porque los trae el volcado y el
    // plan antiguo no los tiene: una muestra sin ellos sigue siendo válida y la
    // app no pinta lo que no hay.
    caracter: { type: "string" },
    mencion: { type: "string" },
    dificultad: {
      type: "object",
      properties: { teoria: DIFFICULTY_SCHEMA, practicas: DIFFICULTY_SCHEMA },
      additionalProperties: false,
    },
    descripcion: {
      type: "object",
      properties: { teoria: { type: "string" }, practicas: { type: "string" } },
      additionalProperties: false,
    },
    grupos: {
      type: "array",
      items: {
        type: "object",
        required: ["letra", "turno", "teoria", "practicas"],
        properties: {
          letra: { type: "string" },
          turno: { type: "string" },
          teoria: { type: "array", items: SESSION_SCHEMA },
          practicas: {
            type: "object",
            required: ["subgrupos"],
            properties: {
              subgrupos: { type: "array", items: { type: "string" } },
            },
            additionalProperties: { type: "array", items: SESSION_SCHEMA },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const CATALOG_SCHEMA = {
  type: "object",
  required: ["meta", "subjects"],
  properties: {
    meta: {
      type: "object",
      required: ["university", "degree", "plan", "version", "hash"],
      properties: {
        university: { type: "string" },
        degree: { type: "string" },
        plan: { type: "string" },
        version: { type: "string" },
        hash: { type: "string" },
        sources: { type: "array", items: { type: "string" } },
        // Marca de la muestra pública: `true` cuando los docentes de este
        // catálogo son la muestra que sirve la app sin contraseña; el catálogo
        // real del autor lo lleva a `false` y viaja cifrado en el paquete.
        sampleDocents: { type: "boolean" },
        updatedAt: { type: "string" },
      },
      additionalProperties: false,
    },
    subjects: { type: "array", items: SUBJECT_SCHEMA },
    // La asignación grupo → profesor: qué profesor da la teoría de una
    // letra o las prácticas de un subgrupo. **No lleva perfil**: el perfil vive
    // en `profesores`, que es dato del volcado y del usuario. Se sigue
    // aceptando el `profile` de antes para no rechazar un catálogo exportado
    // anterior al cambio, pero ya no se produce ni se usa.
    docents: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "name", "subjectCode", "groupLetter"],
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          subjectCode: { type: "string" },
          groupLetter: { type: "string" },
          modalidad: MODALIDAD_SCHEMA,
          profile: { type: "object" },
        },
        additionalProperties: false,
      },
    },
    // Perfiles del volcado, uno por (asignatura, modalidad, profesor).
    profesores: { type: "array", items: PROFESOR_SCHEMA },
    menciones: { type: "array", items: MENCION_SCHEMA },
    tutoresTfg: { type: "array", items: STAFF_SCHEMA },
    masteres: { type: "array", items: STAFF_SCHEMA },
    extraSubjects: { type: "array", items: EXTRA_SUBJECT_SCHEMA },
  },
  additionalProperties: false,
};

export function validateCatalogJSON(value) {
  return validate(CATALOG_SCHEMA, value);
}

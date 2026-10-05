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

const SUBJECT_SCHEMA = {
  type: "object",
  required: ["codigo", "nombre", "curso", "cuatrimestre", "creditos", "grupos"],
  properties: {
    codigo: { type: "string" },
    nombre: { type: "string" },
    curso: { type: "number" },
    cuatrimestre: { type: "number", enum: [1, 2] },
    creditos: { type: "number" },
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
      },
      additionalProperties: false,
    },
    subjects: { type: "array", items: SUBJECT_SCHEMA },
    docents: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "name", "subjectCode", "groupLetter", "profile"],
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          subjectCode: { type: "string" },
          groupLetter: { type: "string" },
          profile: {
            type: "object",
            properties: {
              dificultad: { type: ["string", "null"] },
              razon: { type: "string" },
              opinion: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export function validateCatalogJSON(value) {
  return validate(CATALOG_SCHEMA, value);
}

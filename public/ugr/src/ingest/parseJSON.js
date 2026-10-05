import { validateCatalogJSON } from "./schema.js";

export function parseJSON(input) {
  if (typeof input !== "string") {
    return { errors: [{ path: "", message: "entrada no válida: se esperaba texto" }] };
  }
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { errors: [{ path: "", message: `JSON inválido: ${error.message}` }] };
  }
  const result = validateCatalogJSON(value);
  if (!result.ok) return { errors: result.errors };
  return { catalog: value, errors: [] };
}

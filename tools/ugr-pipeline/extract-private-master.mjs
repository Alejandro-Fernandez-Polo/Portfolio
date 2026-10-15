/**
 * Extracción del maestro privado de `/ugr` (I-11, un solo uso y repetible).
 *
 * Saca a `privado/` los docentes reales que hoy viven commiteados en
 * `public/ugr/docentes.js` (y, con ellos, el catálogo completo), para que el
 * repositorio pueda quedarse solo con docentes de ejemplo y con el paquete
 * cifrado. `privado/` está ignorada por git: el texto plano **no** debe volver
 * al árbol versionado.
 *
 * La conversión de forma la hace `normalizeDocent` (la canónica del solver):
 * `profile.opinion` singular → `profile.opinions[]` y `razon` tal cual. No se
 * descarta nada: si un docente no normaliza, el script falla en vez de perder
 * datos en silencio.
 *
 * Uso: `node tools/ugr-pipeline/extract-private-master.mjs`
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  attachDocents,
  fromLegacySubjects,
  normalizeDocent,
} from "../../public/ugr/src/solver/catalog.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PRIVATE_DIR = path.join(ROOT, "privado");
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const DOCENTES_PATH = path.join(ROOT, "public/ugr/docentes.js");

/**
 * Lee un global declarado con `const` en un script clásico (`data.js`,
 * `docentes.js`): no son propiedades de `window`, así que se evalúan en un
 * contexto de `vm` y se recoge el valor por su nombre.
 *
 * @param {string} filePath ruta absoluta del script clásico.
 * @param {string} name nombre del global a recoger.
 * @returns {Array} el array declarado, o falla si no lo es.
 */
function loadLegacyGlobal(filePath, name) {
  const source = readFileSync(filePath, "utf8");
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.__VALUE__ = ${name};`, sandbox, {
    filename: filePath,
  });
  const value = sandbox.__VALUE__;
  if (!Array.isArray(value)) {
    throw new Error(`${name} de ${filePath} no es un array`);
  }
  return value;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const subjects = loadLegacyGlobal(DATA_PATH, "SUBJECTS");
const rawDocents = loadLegacyGlobal(DOCENTES_PATH, "DOCENTES");

const docents = rawDocents.map(normalizeDocent).filter(Boolean);
if (docents.length !== rawDocents.length) {
  throw new Error(
    `se perdieron docentes al normalizar: ${rawDocents.length} → ${docents.length}`,
  );
}

const catalog = attachDocents(fromLegacySubjects(subjects), docents);
catalog.meta = {
  university: "UGR",
  degree: "GI",
  plan: "2022",
  version: "2026-1",
  sources: ["legacy"],
  // El maestro es el catálogo real, no el de ejemplo del repo.
  sampleDocents: false,
};

writeJson(path.join(PRIVATE_DIR, "docentes.json"), docents);
writeJson(path.join(PRIVATE_DIR, "catalogo.json"), catalog);

const opinions = docents.reduce((n, d) => n + d.profile.opinions.length, 0);
process.stdout.write(
  [
    `subjects: ${catalog.subjects.length}`,
    `docents: ${docents.length}`,
    `opiniones: ${opinions}`,
    `escrito: ${path.relative(ROOT, path.join(PRIVATE_DIR, "docentes.json"))}`,
    `escrito: ${path.relative(ROOT, path.join(PRIVATE_DIR, "catalogo.json"))}`,
    "",
  ].join("\n"),
);

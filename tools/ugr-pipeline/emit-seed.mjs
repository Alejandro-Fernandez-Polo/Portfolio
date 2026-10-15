/**
 * Siembra los datos de EJEMPLO de `/ugr` (I-11).
 *
 * Genera, desde una sola fuente de verdad (`tools/ugr-pipeline/sample-docents.json`),
 * las dos copias que la app consulta:
 *   - `public/ugr/docentes.js` — el global `DOCENTES` que leen los scripts
 *     clásicos, el monolito y el kernel (un navegador recién estrenado monta el
 *     catálogo desde aquí, no desde el dataset).
 *   - `public/ugr/datasets/ugr/gi/2026-1.json` — el dataset público que se
 *     descarga al importar/actualizar el catálogo remoto, más `manifest.json` y
 *     `_hashes.json`.
 *
 * Los docentes reales **no** pasan por aquí: viven en `privado/` (ignorado por
 * git) y viajan cifrados en el paquete que genera `build-package.mjs`. Por eso
 * el dataset se marca con `meta.sampleDocents: true`.
 *
 * El hash del dataset cubre `{ subjects, docents }` y lo verifica el cliente al
 * descargarlo, así que este script es el único sitio donde se regeneran los
 * tres ficheros a la vez.
 *
 * Uso: `node tools/ugr-pipeline/emit-seed.mjs`
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { attachDocents, fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const SAMPLE_DOCENTS_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");
const DOCENTES_PATH = path.join(ROOT, "public/ugr/docentes.js");
const DATASETS_DIR = path.join(ROOT, "public/ugr/datasets");
const CATALOG_ID = "ugr/gi/2026-1";
const DATASET_RELATIVE_URL = `/ugr/datasets/${CATALOG_ID}.json`;

const DOCENTES_HEADER = `/* UGR Horario - Docentes de EJEMPLO por grupo (capa de datos)
 *
 * Estos docentes son inventados: están para que la app funcione sin datos de
 * nadie. Los reales del autor viajan cifrados en
 * datasets/ugr/gi/package.enc.json y se superponen en memoria al escribir la
 * contraseña (I-11). Fichero generado: no lo edites a mano, cambia
 * tools/ugr-pipeline/sample-docents.json y ejecuta emit-seed.mjs.
 */`;

function loadLegacyGlobal(filePath, name) {
  const source = readFileSync(filePath, "utf8");
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.__VALUE__ = ${name};`, sandbox, {
    filename: filePath,
  });
  const value = sandbox.__VALUE__;
  if (!Array.isArray(value)) {
    throw new Error(`${name} from ${filePath} is not an array`);
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function hashOf(subjects, docents) {
  const digest = createHash("sha256")
    .update(canonicalJson({ subjects, docents }))
    .digest("hex");
  return `sha256-${digest}`;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const legacySubjects = loadLegacyGlobal(DATA_PATH, "SUBJECTS");
const sampleDocents = JSON.parse(readFileSync(SAMPLE_DOCENTS_PATH, "utf8"));

const catalog = attachDocents(fromLegacySubjects(legacySubjects), sampleDocents);

// El fixture es la entrada, así que tiene que estar ya en la forma canónica:
// si normalizar cambia algo, fixture y modelo se han desincronizado y el error
// evita que ese desajuste llegue al dataset.
if (canonicalJson(catalog.docents) !== canonicalJson(sampleDocents)) {
  throw new Error("los docentes de ejemplo no están en la forma canónica");
}

const hash = hashOf(catalog.subjects, catalog.docents);
const sources = ["legacy", "ejemplo"];

const dataset = {
  meta: {
    university: "UGR",
    degree: "GI",
    plan: "2022",
    version: "2026-1",
    hash,
    sources,
    sampleDocents: true,
  },
  subjects: catalog.subjects,
  docents: catalog.docents,
};

const manifestPath = path.join(DATASETS_DIR, "manifest.json");
const hashesPath = path.join(DATASETS_DIR, "_hashes.json");

const manifest = {
  schemaVersion: 1,
  catalogs: [
    {
      university: dataset.meta.university,
      degree: dataset.meta.degree,
      plan: dataset.meta.plan,
      version: dataset.meta.version,
      url: DATASET_RELATIVE_URL,
      hash,
      updatedAt: new Date().toISOString(),
      sources,
      sampleDocents: true,
    },
  ],
};

const hashes = { [CATALOG_ID]: hash };

const datasetPath = path.join(DATASETS_DIR, `${CATALOG_ID}.json`);

writeJson(datasetPath, dataset);
writeJson(manifestPath, manifest);
writeJson(hashesPath, hashes);
writeFileSync(DOCENTES_PATH, `${DOCENTES_HEADER}\nconst DOCENTES = ${JSON.stringify(catalog.docents, null, 2)};\n`, "utf8");

const summary = [
  `subjects: ${dataset.subjects.length}`,
  `docents: ${dataset.docents.length}`,
  `hash: ${hash}`,
  `wrote: ${path.relative(ROOT, DOCENTES_PATH)}`,
  `wrote: ${path.relative(ROOT, datasetPath)}`,
  `wrote: ${path.relative(ROOT, manifestPath)}`,
  `wrote: ${path.relative(ROOT, hashesPath)}`,
  "",
].join("\n");
process.stdout.write(summary);

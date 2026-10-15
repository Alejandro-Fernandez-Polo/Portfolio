/**
 * Siembra los datos de EJEMPLO de `/ugr`.
 *
 * Genera, desde una sola fuente de verdad (`tools/ugr-pipeline/sample-docents.json`),
 * las dos copias que la app consulta:
 *   - `public/ugr/docentes.js` — el global `DOCENTES` con las **asignaciones**
 *     (qué profesor da la teoría de una letra o las prácticas de un subgrupo),
 *     que es lo que leen los scripts clásicos, el monolito y el kernel (un
 *     navegador recién estrenado monta el catálogo desde aquí, no desde el
 *     dataset).
 *   - `public/ugr/datasets/ugr/gi/2026-1.json` — el dataset público que se
 *     descarga al importar/actualizar el catálogo remoto, más `manifest.json` y
 *     `_hashes.json`. Lleva las asignaciones **y** los perfiles de profesor.
 *
 * La muestra lleva además el **plan** (carácter y mención de cada asignatura,
 * el nombre largo de las menciones y las asignaturas del plan que la app no
 * planifica): es currículo público de la hoja, así que la lista de datos y su
 * filtro por mención funcionan sin contraseña. Lo que sí viaja cifrado son las
 * valoraciones: los perfiles de profesor y, con ellos, opiniones y comentarios.
 *
 * Qué es «muestra» (decisión del autor): los 46 docentes
 * que había en `privado/` —los suyos, por letra— traducidos a la forma nueva.
 * Hacen de red sin contraseña; el volcado completo de la hoja viaja cifrado en
 * el paquete que genera `build-package.mjs`. Por eso el dataset se marca con
 * `meta.sampleDocents: true`: significa «los docentes de este catálogo son la
 * muestra pública», no «son inventados».
 *
 * El hash del dataset cubre `{subjects, docents, profesores}` y lo verifica el
 * cliente al descargarlo, así que este script es el único sitio donde se
 * regeneran los tres ficheros a la vez.
 *
 * Uso: `node tools/ugr-pipeline/emit-seed.mjs`
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { attachDocents, attachPlan, fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const SAMPLE_DOCENTS_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");
const DOCENTES_PATH = path.join(ROOT, "public/ugr/docentes.js");
const DATASETS_DIR = path.join(ROOT, "public/ugr/datasets");
const CATALOG_ID = "ugr/gi/2026-1";
const DATASET_RELATIVE_URL = `/ugr/datasets/${CATALOG_ID}.json`;

const DOCENTES_HEADER = `/* UGR Horario - Docentes de EJEMPLO (capa de datos)
 *
 * Declara los dos globales de la capa de docentes: "DOCENTES" son las
 * asignaciones (qué profesor da la teoría de una letra de grupo —groupLetter
 * "A"— o las prácticas de un subgrupo —"A1"-) y "PROFESORES" son los perfiles
 * del volcado, uno por (asignatura, modalidad, nombre). El volcado
 * completo de la hoja viaja cifrado en datasets/ugr/gi/package.enc.json y se
 * superpone al escribir la contraseña. Fichero generado: no lo edites a
 * mano, cambia tools/ugr-pipeline/sample-docents.json y ejecuta emit-seed.mjs.
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

function hashOf(subjects, docents, profesores, menciones, extraSubjects) {
  const digest = createHash("sha256")
    .update(canonicalJson({ subjects, docents, profesores, menciones, extraSubjects }))
    .digest("hex");
  return `sha256-${digest}`;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const legacySubjects = loadLegacyGlobal(DATA_PATH, "SUBJECTS");
const fixture = JSON.parse(readFileSync(SAMPLE_DOCENTS_PATH, "utf8"));

const catalog = fromLegacySubjects(legacySubjects);

// El plan va aparte en el fixture (no es del catálogo de horarios) y aquí se
// pega a cada asignatura. Se comprueba en los dos sentidos: toda asignatura con
// plan lo recibe, y no hay plan para una asignatura que el catálogo no tiene.
const plan = new Map(
  (Array.isArray(fixture.plan) ? fixture.plan : []).map((p) => [p.codigo, p]),
);
catalog.subjects = catalog.subjects.map((subject) => {
  const delPlan = plan.get(subject.codigo);
  return delPlan ? { ...subject, caracter: delPlan.caracter, mencion: delPlan.mencion } : subject;
});
const sinPlanAplicado = [...plan.keys()].filter(
  (codigo) => !catalog.subjects.some((s) => s.codigo === codigo && s.caracter),
);
if (sinPlanAplicado.length) {
  throw new Error(`asignaturas con plan que no están en el catálogo: ${sinPlanAplicado.join(", ")}`);
}

attachDocents(catalog, fixture.docents);
attachPlan(catalog, {
  profesores: fixture.profesores,
  menciones: fixture.menciones,
  extraSubjects: fixture.extraSubjects,
});

// El fixture es la entrada, así que tiene que estar ya en la forma canónica:
// si normalizar cambia algo, fixture y modelo se han desincronizado y el error
// evita que ese desajuste llegue al dataset.
if (canonicalJson(catalog.docents) !== canonicalJson(fixture.docents)) {
  throw new Error("las asignaciones de ejemplo no están en la forma canónica");
}
if (canonicalJson(catalog.profesores) !== canonicalJson(fixture.profesores)) {
  throw new Error("los profesores de ejemplo no están en la forma canónica");
}

const hash = hashOf(
  catalog.subjects,
  catalog.docents,
  catalog.profesores,
  catalog.menciones,
  catalog.extraSubjects,
);
const sources = ["legacy", "muestra"];

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
  profesores: catalog.profesores,
  menciones: catalog.menciones,
  extraSubjects: catalog.extraSubjects,
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
writeFileSync(
  DOCENTES_PATH,
  `${DOCENTES_HEADER}\nconst DOCENTES = ${JSON.stringify(catalog.docents, null, 2)};\n\nconst PROFESORES = ${JSON.stringify(catalog.profesores, null, 2)};\n`,
  "utf8",
);

const summary = [
  `subjects: ${dataset.subjects.length}`,
  `docents: ${dataset.docents.length}`,
  `profesores: ${dataset.profesores.length}`,
  `menciones: ${dataset.menciones.length}, plan sin horario: ${dataset.extraSubjects.length}`,
  `hash: ${hash}`,
  `wrote: ${path.relative(ROOT, DOCENTES_PATH)}`,
  `wrote: ${path.relative(ROOT, datasetPath)}`,
  `wrote: ${path.relative(ROOT, manifestPath)}`,
  `wrote: ${path.relative(ROOT, hashesPath)}`,
  "",
].join("\n");
process.stdout.write(summary);

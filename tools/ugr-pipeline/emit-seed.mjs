/**
 * Siembra la muestra pública de `/ugr`.
 *
 * Genera, desde tres fuentes —`sample-docents.json` (los perfiles de profesor y
 * el plan), `guias-docentes.json` (qué profesor lleva cada grupo) y
 * `horarios-subgrupos.json` (a qué etiqueta del horario corresponde cada número
 * de grupo de prácticas)—, las dos copias que la app consulta:
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
 * Las **asignaciones** no se escriben aquí: salen de las guías docentes de la
 * ETSIIT (`guias-docentes.json`), que es donde la escuela publica qué profesor
 * da la teoría de cada letra y las prácticas de cada subgrupo, cruzadas con los
 * subgrupos de los horarios (`horarios-subgrupos.json`), que dicen a qué
 * etiqueta corresponde cada número. Son currículo público y sin opiniones, así
 * que la muestra las lleva tal cual y sin contraseña el horario ya enseña los
 * profesores reales de cada grupo.
 *
 * Qué es «muestra» (decisión del autor): los perfiles de profesor del fixture
 * —con sus dificultades— son la red de la app sin contraseña; el volcado
 * completo de la hoja viaja cifrado en el paquete que genera
 * `build-package.mjs`. Por eso el dataset se marca con
 * `meta.sampleDocents: true`: significa «los docentes de este catálogo son la
 * muestra pública», no «son inventados».
 *
 * El hash del dataset cubre `{subjects, docents, profesores, menciones,
 * extraSubjects}` y lo verifica el cliente al descargarlo, así que este script es
 * el único sitio donde se regeneran los cuatro ficheros a la vez.
 *
 * Uso: `node tools/ugr-pipeline/emit-seed.mjs`
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { attachDocents, attachPlan, fromLegacySubjects } from "../../public/ugr/src/solver/catalog.js";
import { buildAsignaciones } from "./guias.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const SAMPLE_DOCENTS_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");
const GUIAS_PATH = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const SUBGRUPOS_PATH = path.join(ROOT, "tools/ugr-pipeline/horarios-subgrupos.json");
const DOCENTES_PATH = path.join(ROOT, "public/ugr/docentes.js");
const DATASETS_DIR = path.join(ROOT, "public/ugr/datasets");
const CATALOG_ID = "ugr/gi/2026-1";
const DATASET_RELATIVE_URL = `/ugr/datasets/${CATALOG_ID}.json`;

const DOCENTES_HEADER = `/* UGR Horario - Docentes (capa de datos)
 *
 * Declara los dos globales de la capa de docentes: "DOCENTES" son las
 * asignaciones (qué profesor da la teoría de una letra de grupo —groupLetter
 * "A"— o las prácticas de un subgrupo —"A1"-) y "PROFESORES" son los perfiles,
 * uno por (asignatura, modalidad, nombre).
 *
 * Las asignaciones son las que publica la ETSIIT en sus guías docentes: las
 * deriva tools/ugr-pipeline/guias.js de guias-docentes.json. Los perfiles son la
 * muestra del autor (sample-docents.json); el volcado completo de la hoja viaja
 * cifrado en datasets/ugr/gi/package.enc.json y se superpone al escribir la
 * contraseña. Fichero generado: no lo edites a mano; cambia los fixtures y
 * ejecuta tools/ugr-pipeline/emit-seed.mjs.
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
const guiasFixture = JSON.parse(readFileSync(GUIAS_PATH, "utf8"));
const subgruposFixture = JSON.parse(readFileSync(SUBGRUPOS_PATH, "utf8"));

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

// ─── Asignaciones: las que publican las guías docentes de la ETSIIT ─────────
// Sin guía no hay asignación: si una asignatura del catálogo no cruza con
// ninguna guía, lo que ha cambiado es el nombre de una o de otra y hay que
// verlo, no sembrar un horario sin profesores.
const guias = Array.isArray(guiasFixture.guias) ? guiasFixture.guias : [];
const subgrupos = subgruposFixture.asignaturas || {};
const {
  asignaciones: docents,
  sinGuia,
  conflictos,
  sinEtiqueta,
} = buildAsignaciones({ guias, subjects: legacySubjects, subgrupos });
if (sinGuia.length) {
  throw new Error(`asignaturas del catálogo sin guía docente: ${sinGuia.join(", ")}`);
}

attachDocents(catalog, docents);
attachPlan(catalog, {
  profesores: fixture.profesores,
  menciones: fixture.menciones,
  extraSubjects: fixture.extraSubjects,
});

// El fixture es la entrada, así que tiene que estar ya en la forma canónica: si
// normalizar cambia algo, fixture y modelo se han desincronizado y el error
// evita que ese desajuste llegue al dataset. Las asignaciones no vienen del
// fixture sino de las guías, así que lo que se comprueba es que `attachDocents`
// las dejara tal cual.
if (canonicalJson(catalog.docents) !== canonicalJson(docents)) {
  throw new Error("las asignaciones de las guías no están en la forma canónica");
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
  `docents: ${dataset.docents.length} (guías: ${guias.length}, conflictos: ${conflictos.length}, sin destino en el horario: ${sinEtiqueta.length})`,
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

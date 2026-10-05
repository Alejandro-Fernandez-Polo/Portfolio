import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  attachDocents,
  fromLegacySubjects,
} from "../../public/ugr/src/solver/catalog.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const DOCENTES_PATH = path.join(ROOT, "public/ugr/docentes.js");
const DATASETS_DIR = path.join(ROOT, "public/ugr/datasets");
const CATALOG_ID = "ugr/gi/2026-1";
const DATASET_RELATIVE_URL = `/ugr/datasets/${CATALOG_ID}.json`;

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
const legacyDocents = loadLegacyGlobal(DOCENTES_PATH, "DOCENTES");

const catalog = attachDocents(fromLegacySubjects(legacySubjects), legacyDocents);

if (JSON.stringify(catalog.docents) !== JSON.stringify(legacyDocents)) {
  throw new Error("normalized docents differ from legacy DOCENTES");
}

const hash = hashOf(catalog.subjects, catalog.docents);

const dataset = {
  meta: {
    university: "UGR",
    degree: "GI",
    plan: "2022",
    version: "2026-1",
    hash,
    sources: ["legacy"],
  },
  subjects: catalog.subjects,
  docents: catalog.docents,
};

const datasetPath = path.join(DATASETS_DIR, `${CATALOG_ID}.json`);
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
      sources: dataset.meta.sources,
    },
  ],
};

const hashes = { [CATALOG_ID]: hash };

writeJson(datasetPath, dataset);
writeJson(manifestPath, manifest);
writeJson(hashesPath, hashes);

const summary = [
  `subjects: ${dataset.subjects.length}`,
  `docents: ${dataset.docents.length}`,
  `hash: ${hash}`,
  `wrote: ${path.relative(ROOT, datasetPath)}`,
  `wrote: ${path.relative(ROOT, manifestPath)}`,
  `wrote: ${path.relative(ROOT, hashesPath)}`,
  "",
].join("\n");
process.stdout.write(summary);

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect } from "vitest";

import {
  normalizeDocent,
  validateCatalog,
} from "../../public/ugr/src/solver/catalog.js";
import { validateCatalogJSON } from "../../public/ugr/src/ingest/schema.js";

// Invariantes de los datos de EJEMPLO que siembra `tools/ugr-pipeline/emit-seed.mjs`
// (I-11). La app consulta dos copias de los docentes —el global `DOCENTES` de
// `docentes.js` y el `docents` del dataset— así que lo que se fija aquí es que
// sigan diciendo lo mismo que el fixture, que el hash del dataset cuadre con el
// que verifica el cliente al descargarlo, y que el dataset sea válido y esté
// marcado como de ejemplo. El texto plano real vive fuera del repo
// (`privado/`): lo vigila `no-leak.test.js`.

const ROOT = path.resolve(import.meta.dirname, "../..");
const FIXTURE_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");
const DOCENTES_PATH = path.join(ROOT, "public/ugr/docentes.js");
const DATASET_PATH = path.join(ROOT, "public/ugr/datasets/ugr/gi/2026-1.json");
const MANIFEST_PATH = path.join(ROOT, "public/ugr/datasets/manifest.json");
const HASHES_PATH = path.join(ROOT, "public/ugr/datasets/_hashes.json");
const CATALOG_ID = "ugr/gi/2026-1";

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const dataset = JSON.parse(readFileSync(DATASET_PATH, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const hashes = JSON.parse(readFileSync(HASHES_PATH, "utf8"));

const sandbox = {};
vm.runInNewContext(`${readFileSync(DOCENTES_PATH, "utf8")}\nthis.__D__ = DOCENTES;`, sandbox, {
  filename: DOCENTES_PATH,
});
const legacyDocentes = sandbox.__D__;

/**
 * Mismo algoritmo que el cliente (`catalog-remote.js` `contentHash`) y que el
 * emisor: JSON canónico (claves ordenadas) de `{subjects, docents}`. Se fija
 * aquí a propósito: si alguien cambia una de las dos partes sin la otra, el
 * cliente rechazaría el dataset por hash.
 */
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function hashOf(subjects, docents) {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalize({ subjects, docents })))
    .digest("hex");
  return `sha256-${digest}`;
}

describe("datos de ejemplo sembrados", () => {
  it("las tres copias de los docentes dicen lo mismo", () => {
    expect(legacyDocentes).toEqual(fixture);
    expect(dataset.docents).toEqual(fixture);
  });

  it("el fixture está en la forma canónica (normalizar no cambia nada)", () => {
    expect(fixture.map(normalizeDocent)).toEqual(fixture);
  });

  it("el hash del dataset cuadra con el contenido, el manifest y los hashes", () => {
    const expected = hashOf(dataset.subjects, dataset.docents);
    expect(dataset.meta.hash).toBe(expected);
    expect(manifest.catalogs[0].hash).toBe(expected);
    expect(hashes[CATALOG_ID]).toBe(expected);
  });

  it("el dataset es válido y va marcado como de ejemplo", () => {
    expect(validateCatalogJSON(dataset)).toEqual({ ok: true, errors: [] });
    expect(validateCatalog(dataset).ok).toBe(true);
    expect(dataset.meta.sampleDocents).toBe(true);
    expect(manifest.catalogs[0].sampleDocents).toBe(true);
  });

  it("los docentes de ejemplo no traen el `opinion` singular heredado", () => {
    expect(fixture.some((d) => "opinion" in d.profile)).toBe(false);
    expect(legacyDocentes.some((d) => "opinion" in d.profile)).toBe(false);
  });
});

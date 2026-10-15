import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect } from "vitest";

import {
  normalizeDocent,
  normalizeProfesor,
  validateCatalog,
} from "../../public/ugr/src/solver/catalog.js";
import { validateCatalogJSON } from "../../public/ugr/src/ingest/schema.js";

// Invariantes de los datos de EJEMPLO que siembra `tools/ugr-pipeline/emit-seed.mjs`
// en su forma nueva. La app consulta dos copias de cada lista —el global
// `DOCENTES`/`PROFESORES` de `docentes.js` y el `docents`/`profesores` del
// dataset— así que lo que se fija aquí es que sigan diciendo lo mismo que el
// fixture, que el hash del dataset cuadre con el que verifica el cliente al
// descargarlo, y que las asignaciones apunten a grupos que existen.
//
// La muestra son los docentes por letra del autor traducidos a la forma del
// volcado; el texto completo de la hoja vive cifrado en el paquete.

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
vm.runInNewContext(
  `${readFileSync(DOCENTES_PATH, "utf8")}\nthis.__D__ = DOCENTES; this.__P__ = PROFESORES;`,
  sandbox,
  { filename: DOCENTES_PATH },
);
const legacyDocentes = sandbox.__D__;
const legacyProfesores = sandbox.__P__;

/**
 * Mismo algoritmo que el cliente (`catalog-remote.js` `contentHash`) y que el
 * emisor: JSON canónico (claves ordenadas) de `{subjects, docents, profesores,
 * menciones, extraSubjects}`. Se fija aquí a propósito: si alguien cambia una de
 * las partes sin las otras, el cliente rechazaría el dataset por hash.
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

function hashOf(subjects, docents, profesores, menciones, extraSubjects) {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalize({ subjects, docents, profesores, menciones, extraSubjects })))
    .digest("hex");
  return `sha256-${digest}`;
}

describe("datos de ejemplo sembrados", () => {
  it("asignaciones y perfiles dicen lo mismo en el fixture y en las dos copias", () => {
    expect(legacyDocentes).toEqual(fixture.docents);
    expect(dataset.docents).toEqual(fixture.docents);
    expect(legacyProfesores).toEqual(fixture.profesores);
    expect(dataset.profesores).toEqual(fixture.profesores);
  });

  it("el fixture está en la forma canónica (normalizar no cambia nada)", () => {
    expect(fixture.docents.map(normalizeDocent)).toEqual(fixture.docents);
    expect(fixture.profesores.map(normalizeProfesor)).toEqual(fixture.profesores);
  });

  it("el hash del dataset cuadra con el contenido, el manifest y los hashes", () => {
    const expected = hashOf(
      dataset.subjects,
      dataset.docents,
      dataset.profesores,
      dataset.menciones,
      dataset.extraSubjects,
    );
    expect(dataset.meta.hash).toBe(expected);
    expect(manifest.catalogs[0].hash).toBe(expected);
    expect(hashes[CATALOG_ID]).toBe(expected);
  });

  it("el dataset es válido y va marcado como muestra", () => {
    expect(validateCatalogJSON(dataset)).toEqual({ ok: true, errors: [] });
    expect(validateCatalog(dataset).ok).toBe(true);
    expect(dataset.meta.sampleDocents).toBe(true);
    expect(manifest.catalogs[0].sampleDocents).toBe(true);
  });

  it("cada asignación apunta a un grupo o subgrupo que existe en el catálogo", () => {
    const byCode = new Map(dataset.subjects.map((s) => [s.codigo, s]));
    const huerfanas = [];
    for (const asignacion of dataset.docents) {
      const subject = byCode.get(asignacion.subjectCode);
      if (!subject) {
        huerfanas.push(`${asignacion.key}: asignatura fuera del catálogo`);
        continue;
      }
      const grupo = subject.grupos.find((g) => g.letra === asignacion.groupLetter);
      if (grupo) continue;
      // Los subgrupos de prácticas viven dentro del grupo cuya letra los nombra.
      const letra = asignacion.groupLetter.replace(/\d+$/, "");
      const contenedor = subject.grupos.find((g) => g.letra === letra);
      if (!contenedor || !contenedor.practicas.subgrupos.includes(asignacion.groupLetter)) {
        huerfanas.push(`${asignacion.key}: destino inexistente`);
      }
    }
    expect(huerfanas).toEqual([]);
  });

  it("cada perfil de la muestra tiene su terna y ninguna asignación queda sin perfil", () => {
    const perfiles = new Set(dataset.profesores.map((p) => p.key));
    const sinPerfil = dataset.docents
      .map((d) => `${d.subjectCode}|${d.modalidad}|${d.name}`)
      .filter((key) => !perfiles.has(key));
    expect(sinPerfil).toEqual([]);
    expect(dataset.profesores.every((p) => p.key === `${p.subjectCode}|${p.modalidad}|${p.name}`)).toBe(true);
  });

  it("la muestra lleva el plan: cada asignatura con su carácter y su mención", () => {
    expect(fixture.plan).toHaveLength(dataset.subjects.length);
    for (const subject of dataset.subjects) {
      const delPlan = fixture.plan.find((p) => p.codigo === subject.codigo);
      expect(delPlan).toBeTruthy();
      expect(subject.caracter).toBe(delPlan.caracter);
      expect(subject.mencion).toBe(delPlan.mencion);
    }
    expect(dataset.menciones.length).toBeGreaterThan(0);
    expect(dataset.extraSubjects.length).toBeGreaterThan(0);
    // Las del plan sin horario no pueden repetir una del catálogo: la lista de
    // datos las distingue por eso.
    const delCatalogo = new Set(dataset.subjects.map((s) => s.codigo));
    expect(dataset.extraSubjects.filter((s) => delCatalogo.has(s.codigo))).toEqual([]);
  });

  it("los perfiles de la muestra no traen comentarios: el volcado es lo que los trae", () => {
    expect(dataset.profesores.every((p) => p.comentarios.length === 0)).toBe(true);
    expect(fixture.profesores.every((p) => "opinions" in p && !("opinion" in p))).toBe(true);
  });
});

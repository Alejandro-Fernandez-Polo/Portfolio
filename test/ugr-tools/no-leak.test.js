import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import { esOpinionFicticia } from "../../tools/ugr-pipeline/sample-opinions.js";

// Guarda contra fugas del maestro privado: el repositorio puede llevar los
// **nombres** de los profesores de la muestra —los publica la ETSIIT y la app
// los enseña sin contraseña— y el **paquete cifrado**, pero no el texto que
// opina nadie sobre ellos: ni opiniones ni comentarios del volcado en claro.
//
// Las opiniones que la muestra enseña son **inventadas** (`sample-opinions.js`),
// así que no hay nada publicado a propósito que dispensar: si una opinión real
// aparece en `public/`, es una fuga.
//
// Cómo funciona: si existe `privado/` (el maestro del autor), recoge esos textos
// y comprueba que no aparezcan en ningún fichero de `public/`. Se limita a los
// ficheros **rastreados por git**: un fichero local que no está en el
// repositorio es del autor y no se publica (si algún día lo commitea, el test
// pasa a vigilarlo solo). Sin `privado/` —un clon limpio— no hay nada que
// comparar y la suite lo omite en vez de fingir que vigila.

const ROOT = path.resolve(import.meta.dirname, "../..");
const MASTER_PATH = path.join(ROOT, "privado/catalogo.json");
const FIXTURE_PATH = path.join(ROOT, "tools/ugr-pipeline/sample-docents.json");
const DATASET_PATH = path.join(ROOT, "public/ugr/datasets/ugr/gi/2026-1.json");
const GUIAS_PATH = path.join(ROOT, "tools/ugr-pipeline/guias-docentes.json");
const PACKAGE_PATH = path.join(ROOT, "public/ugr/datasets/ugr/gi/package.enc.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const MIN_LENGTH = 12;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Rutas (relativas al repo) que git conoce: las únicas que llegan al repo. */
function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  return new Set(out.split("\0").filter(Boolean).map((p) => path.join(ROOT, p)));
}

function longTexts(list) {
  return list.filter((s) => typeof s === "string" && s.length > MIN_LENGTH);
}

/** Todo el texto de terceros del maestro: opiniones, comentarios y personal. */
function masterSecrets(master) {
  const staff = [...(master.tutoresTfg || []), ...(master.masteres || [])];
  return longTexts([
    ...(master.profesores || []).flatMap((p) => p.opinions || []),
    ...(master.profesores || []).flatMap((p) => (p.comentarios || []).map((c) => c.texto)),
    ...staff.flatMap((s) => s.opinions || []),
  ]);
}

/**
 * Las opiniones que la muestra publica son inventadas: ninguna es texto de la
 * hoja. Este caso no necesita `privado/` —compara contra el repertorio del
 * repositorio y el marcador del catálogo—, así que también corre en un clon
 * limpio.
 */
describe("las opiniones de la muestra son inventadas", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  const dataset = JSON.parse(readFileSync(DATASET_PATH, "utf8"));

  it("el fixture lo declara y todas sus opiniones salen del repertorio", () => {
    expect(fixture.opinionesFicticias).toBe(true);
    const ajenas = (fixture.profesores || [])
      .flatMap((perfil) => perfil.opinions || [])
      .filter((texto) => !esOpinionFicticia(texto));
    expect(ajenas).toEqual([]);
    expect((fixture.profesores || []).some((perfil) => (perfil.opinions || []).length > 0)).toBe(true);
  });

  it("el catálogo que se sirve lleva la marca y el mismo repertorio", () => {
    expect(dataset.meta.sampleOpinions).toBe(true);
    const ajenas = (dataset.profesores || [])
      .flatMap((perfil) => perfil.opinions || [])
      .filter((texto) => !esOpinionFicticia(texto));
    expect(ajenas).toEqual([]);
  });

  it("los nombres siguen siendo los reales que publican las guías", () => {
    const guias = JSON.parse(readFileSync(GUIAS_PATH, "utf8")).guias || [];
    const nombres = new Set();
    for (const guia of guias) {
      for (const entrada of [...(guia.teorico || []), ...(guia.practico || [])]) {
        if (entrada && entrada.nombre) nombres.add(entrada.nombre.trim());
      }
    }
    const deLasGuias = dataset.docents
      .map((asignacion) => asignacion.name)
      .filter((nombre) => nombres.has(nombre));
    expect(nombres.size).toBeGreaterThan(0);
    expect(deLasGuias.length).toBeGreaterThan(0);
  });
});

const hasMaster = existsSync(MASTER_PATH);

describe.skipIf(!hasMaster)("fuga del maestro privado", () => {
  it("ninguna opinión ni comentario del volcado aparece en los ficheros versionados de public/", () => {
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    const secrets = masterSecrets(master);
    expect(secrets.length).toBeGreaterThan(0);

    const tracked = trackedFiles();
    const leaks = [];
    for (const file of walk(PUBLIC_DIR)) {
      if (!tracked.has(file)) continue;
      const text = readFileSync(file, "utf8");
      for (const secret of secrets) {
        if (text.includes(secret)) {
          leaks.push(`${path.relative(ROOT, file)} ← "${secret.slice(0, 40)}…"`);
        }
      }
    }

    expect(leaks).toEqual([]);
  });

  it("el paquete cifrado, si existe, no lleva nada en claro (ni lo que la muestra ya publica)", () => {
    if (!existsSync(PACKAGE_PATH)) return;
    const cipher = readFileSync(PACKAGE_PATH, "utf8");
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    for (const secret of masterSecrets(master)) {
      expect(cipher).not.toContain(secret);
    }
  });

  it("el maestro no conserva el autor de ningún comentario", () => {
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    const conAutor = (master.profesores || []).filter((p) =>
      (p.comentarios || []).some((c) => "autor" in c),
    );
    expect(conAutor).toEqual([]);
  });
});

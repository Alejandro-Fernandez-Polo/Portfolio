import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

// Guarda contra fugas del maestro privado: el repositorio puede llevar
// las **asignaciones** de la muestra (los docentes por letra del autor, que son
// públicos a propósito) y el **paquete cifrado**, pero no el
// contenido del volcado en claro.
//
// Qué vigila exactamente: las opiniones y los comentarios del maestro —texto de
// terceros que vive en la hoja—, no los nombres. Los nombres de los 46
// profesores de la muestra están en `public/` a propósito; las **opiniones** del
// volcado, no.
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
 * Lo que la muestra publica **a propósito**: 8 de sus opiniones son texto que
 * también está en la hoja (decisión del autor: se publican y la
 * guarda protege solo lo exclusivo del volcado). Una de ellas es el mismo texto
 * con un punto de más, así que la dispensa se comprueba con `includes` —igual
 * que se detecta la fuga— y no por igualdad literal.
 *
 * Se leen del propio fixture en vez de fijarlas a mano, así que la dispensa es
 * visible y revisable: si la muestra creciera con más texto de la hoja, habría
 * que verlo en el fixture.
 */
function sampleTexts() {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  return longTexts([
    ...(fixture.profesores || []).flatMap((p) => p.opinions || []),
    ...(fixture.profesores || []).flatMap((p) => (p.razon ? [p.razon] : [])),
  ]);
}

const hasMaster = existsSync(MASTER_PATH);

describe.skipIf(!hasMaster)("fuga del maestro privado", () => {
  it("ninguna opinión ni comentario exclusivo del volcado aparece en los ficheros versionados de public/", () => {
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    const muestra = sampleTexts();
    // Publicado a propósito = la muestra contiene ese texto (idéntico o con
    // retoques), que es la misma relación con la que se detecta la fuga.
    const secrets = masterSecrets(master).filter((s) => !muestra.some((t) => t.includes(s)));
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

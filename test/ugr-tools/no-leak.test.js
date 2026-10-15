import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

// Guarda contra fugas del maestro privado (I-11): el repositorio solo puede
// llevar docentes de ejemplo y el paquete cifrado, nunca tu texto plano.
//
// Cómo funciona: si existe `privado/` (tu maestro), recoge los nombres,
// opiniones y razones y comprueba que no aparezcan en ningún fichero de
// `public/`. Se limita a los ficheros **rastreados por git**: un fichero local
// que no está en el repositorio es tuyo y no se publica (si algún día lo
// commiteas, el test pasa a vigilarlo solo). Sin `privado/` —un clon limpio—
// no hay nada que comparar y la suite lo omite en vez de fingir que vigila.

const ROOT = path.resolve(import.meta.dirname, "../..");
const MASTER_PATH = path.join(ROOT, "privado/docentes.json");
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

const hasMaster = existsSync(MASTER_PATH);

describe.skipIf(!hasMaster)("fuga del maestro privado (I-11)", () => {
  it("ningún dato real de `privado/` aparece en los ficheros versionados de public/", () => {
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    const secrets = [
      ...master.map((d) => d.name),
      ...master.flatMap((d) => d.profile.opinions || []),
      ...master.map((d) => d.profile.razon).filter(Boolean),
    ].filter((s) => typeof s === "string" && s.length > MIN_LENGTH);

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

  it("los docentes reales no están en el fixture de ejemplo ni en el dataset", () => {
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    const fixture = JSON.parse(
      readFileSync(path.join(ROOT, "tools/ugr-pipeline/sample-docents.json"), "utf8"),
    );
    const realNames = new Set(master.map((d) => d.name));
    expect(fixture.filter((d) => realNames.has(d.name))).toEqual([]);
  });

  it("el paquete cifrado, si existe, no lleva texto en claro", () => {
    const packagePath = path.join(ROOT, "public/ugr/datasets/ugr/gi/package.enc.json");
    if (!existsSync(packagePath)) return;
    const cipher = readFileSync(packagePath, "utf8");
    const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
    for (const d of master) {
      expect(cipher).not.toContain(d.name);
      for (const opinion of d.profile.opinions || []) {
        if (opinion.length > MIN_LENGTH) expect(cipher).not.toContain(opinion);
      }
    }
  });
});

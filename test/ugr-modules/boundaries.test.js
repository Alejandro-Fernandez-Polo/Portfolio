import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

// La **Regla de Dependencia**, ejecutable: las capas internas no pueden nombrar
// a las externas. Aquí lo interno es el solver y el dominio/progreso (reglas
// puras) y lo externo el almacén (IndexedDB), las vistas y los adaptadores.
//
// Este test es la red que impide que vuelva la violación que arregló la fase 5
// (`solver/cache.js` importaba `store/db.js`): si alguien la reintroduce, falla
// aquí con el fichero y la línea.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "public/ugr/src");

/** Todos los `.js` de un directorio, recursivo. */
function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "vendor" || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFiles(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

/** Líneas que casan con el patrón, con fichero y número. */
function matches(pattern, files) {
  const hits = [];
  for (const file of files) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (pattern.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1} ${line.trim()}`);
    });
  }
  return hits;
}

// Capas internas y lo que no deben nombrar (externo o de otra capa).
const CAPAS_INTERNAS = [
  { nombre: "solver", dir: join(SRC, "solver") },
  { nombre: "app/domain", dir: join(SRC, "app/domain") },
  { nombre: "progress", dir: join(SRC, "progress") },
];
const IMPORTS_PROHIBIDOS = /from\s+["'][^"']*\/(store|modules|ui|ingest|backup|migrate|monitoring|devtools)\//;
const FRAMEWORK = /\b(document\.[a-zA-Z]|window\.[a-zA-Z]|localStorage|indexedDB|Worker)\b/;

describe("Regla de Dependencia: las capas internas no nombran a las externas", () => {
  for (const capa of CAPAS_INTERNAS) {
    it(`${capa.nombre} no importa el almacén, las vistas ni los adaptadores`, () => {
      expect(matches(IMPORTS_PROHIBIDOS, jsFiles(capa.dir))).toEqual([]);
    });

    it(`${capa.nombre} no nombra el DOM ni el almacenamiento del navegador`, () => {
      expect(matches(FRAMEWORK, jsFiles(capa.dir))).toEqual([]);
    });
  }

  it("solo el adaptador de almacenamiento conoce Dexie", () => {
    const importanDexie = matches(/from\s+["'][^"']*vendor\/dexie/, jsFiles(SRC));
    expect(importanDexie.map((h) => h.split(":")[0])).toEqual(["public/ugr/src/store/db.js"]);
  });

  it("la caché del solver vive en el almacén y se inyecta desde el adaptador", () => {
    // El módulo de la caché pertenece a la capa de almacenamiento…
    const cache = readFileSync(join(SRC, "store/solutionsCache.js"), "utf8");
    expect(cache).toMatch(/from\s+["']\.\/db\.js["']/);
    // …y el adaptador es quien la ata al solver.
    const puente = readFileSync(join(SRC, "modules/solver.js"), "utf8");
    expect(puente).toMatch(/solutionsCache/);
    expect(puente).toMatch(/cache:\s*options\.cache \|\| solutionsCache/);
  });

  it("el ejecutor del solver (el único que conoce Worker) vive en los adaptadores", () => {
    // V3: el hilo aparte es una API del navegador, así que su ejecutor no puede
    // estar dentro del solver; el adaptador lo inyecta en el cliente.
    const runner = readFileSync(join(SRC, "modules/solverRunner.js"), "utf8");
    expect(runner).toMatch(/new Worker\(/);
    const puente = readFileSync(join(SRC, "modules/solver.js"), "utf8");
    expect(puente).toMatch(/run:\s*options\.run \|\| runSolver/);
    // Y el script del worker es un artefacto de ejecución, no un módulo que el
    // solver importe: nadie de `solver/` lo trae por `import`.
    expect(matches(/from\s+["'][^"']*worker\.js["']/, jsFiles(join(SRC, "solver")))).toEqual([]);
  });
});

/**
 * Descarga los horarios de la ETSIIT y guarda, en `horarios-subgrupos.json`, los
 * subgrupos de prácticas de cada asignatura en orden.
 *
 * Es la mitad del dato de las asignaciones: la guía docente dice qué profesor
 * lleva cada **número** de grupo de prácticas y este fichero dice a qué
 * **etiqueta** del horario corresponde cada número (el primero de la lista es el
 * `1`). Los dos documentos son del mismo curso y coinciden en cuántos grupos
 * tiene cada asignatura.
 *
 * Uso: `node tools/ugr-pipeline/scrape-horarios.mjs`
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

import { paginasDeTexto, subgruposPorAsignatura } from "./horarios.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATA_PATH = path.join(ROOT, "public/ugr/data.js");
const OUT_PATH = path.join(ROOT, "tools/ugr-pipeline/horarios-subgrupos.json");
const PDF_URL =
  "https://etsiit.ugr.es/sites/centros/etsiit/public/inline-files/Horarios%20GII%20%2826-27%29.pdf";
const CURSO = "2026/2027";
const USER_AGENT = "ugr-horario/1.0 (proyecto personal de horarios; una pasada por curso)";

/** Códigos de las asignaturas del catálogo con horario (`SUBJECTS` de `data.js`). */
function codigosDelCatalogo() {
  const sandbox = {};
  vm.runInNewContext(
    `${readFileSync(DATA_PATH, "utf8")}\nthis.__S__ = SUBJECTS;`,
    sandbox,
    { filename: DATA_PATH },
  );
  return sandbox.__S__.map((s) => s.codigo);
}

async function main() {
  const res = await fetch(PDF_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} al pedir el PDF de horarios`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const asignaturas = subgruposPorAsignatura(paginasDeTexto(buffer), codigosDelCatalogo());
  if (!Object.keys(asignaturas).length) {
    throw new Error("el PDF no ha dado ningún subgrupo: ¿ha cambiado el formato?");
  }

  writeFileSync(
    OUT_PATH,
    `${JSON.stringify({ generadoDesde: PDF_URL, curso: CURSO, asignaturas }, null, 1)}\n`,
    "utf8",
  );

  const total = Object.values(asignaturas).reduce((n, lista) => n + lista.length, 0);
  process.stdout.write(
    [
      `asignaturas con subgrupos: ${Object.keys(asignaturas).length}`,
      `subgrupos: ${total}`,
      `curso: ${CURSO}`,
      `escrito: ${path.relative(ROOT, OUT_PATH)}`,
      "",
    ].join("\n"),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  });
}
